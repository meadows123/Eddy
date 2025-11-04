// Email rate limiter to prevent spam
class EmailRateLimiter {
  constructor() {
    // Use sessionStorage for persistence across page reloads
    this.storageKey = 'emailRateLimiter';
    this.loadFromStorage();
    
    this.globalCooldown = 60000; // 60 seconds global cooldown (increased)
    this.maxEmailsPerBooking = 1; // Only 1 email per booking
    this.maxEmailsPerHour = 5; // Max 5 emails per hour globally (reduced)
    this.maxEmailsPerDay = 20; // Max 20 emails per day globally
    this.dailyCount = 0;
    this.dailyReset = Date.now() + 86400000; // Reset every 24 hours
  }
  
  loadFromStorage() {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.sentEmails = new Map(data.sentEmails || []);
        this.hourlyCount = data.hourlyCount || 0;
        this.hourlyReset = data.hourlyReset || Date.now() + 3600000;
        this.dailyCount = data.dailyCount || 0;
        this.dailyReset = data.dailyReset || Date.now() + 86400000;
      } else {
        this.sentEmails = new Map();
        this.hourlyCount = 0;
        this.hourlyReset = Date.now() + 3600000;
        this.dailyCount = 0;
        this.dailyReset = Date.now() + 86400000;
      }
    } catch (error) {
      console.error('Error loading rate limiter from storage:', error);
      this.sentEmails = new Map();
      this.hourlyCount = 0;
      this.hourlyReset = Date.now() + 3600000;
      this.dailyCount = 0;
      this.dailyReset = Date.now() + 86400000;
    }
  }
  
  saveToStorage() {
    try {
      const data = {
        sentEmails: Array.from(this.sentEmails.entries()),
        hourlyCount: this.hourlyCount,
        hourlyReset: this.hourlyReset,
        dailyCount: this.dailyCount,
        dailyReset: this.dailyReset
      };
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving rate limiter to storage:', error);
    }
  }

  canSendEmail(bookingId, customerEmail) {
    const now = Date.now();
    
    console.log('🔍 Rate limiter check:', {
      bookingId,
      customerEmail,
      now: new Date(now).toLocaleString(),
      hourlyCount: this.hourlyCount,
      dailyCount: this.dailyCount,
      sentEmailsSize: this.sentEmails.size
    });
    
    // Reset counters if needed
    if (now > this.hourlyReset) {
      console.log('🔄 Resetting hourly counter');
      this.hourlyCount = 0;
      this.hourlyReset = now + 3600000;
    }
    
    if (now > this.dailyReset) {
      console.log('🔄 Resetting daily counter');
      this.dailyCount = 0;
      this.dailyReset = now + 86400000;
    }
    
    // Check global daily limit
    if (this.dailyCount >= this.maxEmailsPerDay) {
      console.log('🚫 Global daily email limit reached:', this.dailyCount, '/', this.maxEmailsPerDay);
      return { canSend: false, reason: 'Global daily limit reached' };
    }
    
    // Check global hourly limit
    if (this.hourlyCount >= this.maxEmailsPerHour) {
      console.log('🚫 Global hourly email limit reached:', this.hourlyCount, '/', this.maxEmailsPerHour);
      return { canSend: false, reason: 'Global hourly limit reached' };
    }
    
    // Check if we've already sent an email for this booking
    const bookingData = this.sentEmails.get(bookingId);
    if (bookingData) {
      console.log('📋 Booking data found:', {
        bookingId,
        count: bookingData.count,
        lastSent: new Date(bookingData.lastSent).toLocaleString(),
        timeSinceLastSent: now - bookingData.lastSent
      });
      
      // Check if we've exceeded the limit for this booking
      if (bookingData.count >= this.maxEmailsPerBooking) {
        console.log('🚫 Email already sent for this booking:', bookingId, 'count:', bookingData.count);
        return { canSend: false, reason: 'Email already sent for this booking' };
      }
      
      // Check cooldown period
      if (now - bookingData.lastSent < this.globalCooldown) {
        console.log('🚫 Email cooldown period not reached for booking:', bookingId, 'cooldown remaining:', this.globalCooldown - (now - bookingData.lastSent), 'ms');
        return { canSend: false, reason: 'Cooldown period not reached' };
      }
    } else {
      console.log('📋 No previous booking data found for:', bookingId);
    }
    
    console.log('✅ Email allowed to send');
    return { canSend: true };
  }

  recordEmailSent(bookingId, customerEmail) {
    const now = Date.now();
    
    // Update counters
    this.hourlyCount++;
    this.dailyCount++;
    
    // Update booking data
    const bookingData = this.sentEmails.get(bookingId) || {
      count: 0,
      lastSent: 0,
      firstSent: now,
      customerEmail
    };
    
    bookingData.count++;
    bookingData.lastSent = now;
    this.sentEmails.set(bookingId, bookingData);
    
    // Save to storage
    this.saveToStorage();
    
    console.log('📧 Email recorded for booking:', {
      bookingId,
      count: bookingData.count,
      hourlyCount: this.hourlyCount,
      dailyCount: this.dailyCount,
      customerEmail,
      totalBookings: this.sentEmails.size
    });
  }

  getStats() {
    return {
      hourlyCount: this.hourlyCount,
      dailyCount: this.dailyCount,
      hourlyReset: new Date(this.hourlyReset).toLocaleString(),
      dailyReset: new Date(this.dailyReset).toLocaleString(),
      totalBookings: this.sentEmails.size,
      maxEmailsPerBooking: this.maxEmailsPerBooking,
      maxEmailsPerHour: this.maxEmailsPerHour,
      maxEmailsPerDay: this.maxEmailsPerDay,
      globalCooldown: this.globalCooldown
    };
  }

  // Clean up old entries (older than 24 hours)
  cleanup() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    for (const [bookingId, data] of this.sentEmails.entries()) {
      if (now - data.firstSent > dayInMs) {
        this.sentEmails.delete(bookingId);
      }
    }
    this.saveToStorage();
  }
  
  // Clear all data (for testing)
  clearAll() {
    this.sentEmails.clear();
    this.hourlyCount = 0;
    this.dailyCount = 0;
    this.hourlyReset = Date.now() + 3600000;
    this.dailyReset = Date.now() + 86400000;
    this.saveToStorage();
    console.log('🧹 Rate limiter data cleared');
  }
}

// Create a singleton instance
const emailRateLimiter = new EmailRateLimiter();

// Cleanup old entries every hour
setInterval(() => {
  emailRateLimiter.cleanup();
}, 3600000);

export default emailRateLimiter;
