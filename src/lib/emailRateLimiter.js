// Email rate limiter to prevent spam
class EmailRateLimiter {
  constructor() {
    this.sentEmails = new Map(); // bookingId -> { count, lastSent, firstSent }
    this.globalCooldown = 30000; // 30 seconds global cooldown
    this.maxEmailsPerBooking = 1; // Only 1 email per booking
    this.maxEmailsPerHour = 10; // Max 10 emails per hour globally
    this.hourlyCount = 0;
    this.hourlyReset = Date.now() + 3600000; // Reset every hour
  }

  canSendEmail(bookingId, customerEmail) {
    const now = Date.now();
    
    // Reset hourly counter if needed
    if (now > this.hourlyReset) {
      this.hourlyCount = 0;
      this.hourlyReset = now + 3600000;
    }
    
    // Check global hourly limit
    if (this.hourlyCount >= this.maxEmailsPerHour) {
      console.log('🚫 Global hourly email limit reached');
      return { canSend: false, reason: 'Global hourly limit reached' };
    }
    
    // Check if we've already sent an email for this booking
    const bookingData = this.sentEmails.get(bookingId);
    if (bookingData) {
      // Check if we've exceeded the limit for this booking
      if (bookingData.count >= this.maxEmailsPerBooking) {
        console.log('🚫 Email already sent for this booking:', bookingId);
        return { canSend: false, reason: 'Email already sent for this booking' };
      }
      
      // Check cooldown period
      if (now - bookingData.lastSent < this.globalCooldown) {
        console.log('🚫 Email cooldown period not reached for booking:', bookingId);
        return { canSend: false, reason: 'Cooldown period not reached' };
      }
    }
    
    return { canSend: true };
  }

  recordEmailSent(bookingId, customerEmail) {
    const now = Date.now();
    
    // Update hourly counter
    this.hourlyCount++;
    
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
    
    console.log('📧 Email recorded for booking:', {
      bookingId,
      count: bookingData.count,
      hourlyCount: this.hourlyCount,
      customerEmail
    });
  }

  getStats() {
    return {
      hourlyCount: this.hourlyCount,
      hourlyReset: new Date(this.hourlyReset).toLocaleString(),
      totalBookings: this.sentEmails.size,
      maxEmailsPerBooking: this.maxEmailsPerBooking,
      maxEmailsPerHour: this.maxEmailsPerHour
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
  }
}

// Create a singleton instance
const emailRateLimiter = new EmailRateLimiter();

// Cleanup old entries every hour
setInterval(() => {
  emailRateLimiter.cleanup();
}, 3600000);

export default emailRateLimiter;
