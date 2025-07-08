import { supabase } from './supabase'
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Heart, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '../components/ui/button.jsx';

// User Profile API
export const userApi = {
  // Get user profile
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get user preferences
  getPreferences: async (userId) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Update user preferences
  updatePreferences: async (userId, updates) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Saved Venues API
export const savedVenuesApi = {
  // Get user's saved venues
  getSavedVenues: async (userId) => {
    const { data, error } = await supabase
      .from('saved_venues')
      .select(`
        *,
        venues (*)
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    return data
  },

  // Save a venue
  saveVenue: async (userId, venueId) => {
    const { data, error } = await supabase
      .from('saved_venues')
      .insert([{ user_id: userId, venue_id: venueId }])
      .select()
    
    if (error) throw error
    return data
  },

  // Remove a saved venue
  removeSavedVenue: async (userId, venueId) => {
    const { error } = await supabase
      .from('saved_venues')
      .delete()
      .eq('user_id', userId)
      .eq('venue_id', venueId)
    
    if (error) throw error
  }
}

// Bookings API
export const bookingsApi = {
  // Get user's bookings
  getUserBookings: async (userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        venues (*)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create a new booking
  createBooking: async (bookingData) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
    
    if (error) throw error
    return data
  },

  // Update booking status
  updateBookingStatus: async (bookingId, status) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
    
    if (error) throw error
    return data
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
    
    if (error) throw error
    return data
  },

  // Get bookings for a specific venue
  getVenueBookings: async (venueId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, table:venue_tables(*, venue:venues(*))')
      .eq('venue_id', venueId)
    
    if (error) throw error
    return data
  }
}

// Stripe Elements setup (frontend only)
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Get authentication header for API calls
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
};

// Get Supabase function URL
const getSupabaseFunctionUrl = (functionName) => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!projectUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable not set');
  }
  
  // Extract project reference from URL
  const projectRef = projectUrl.split('//')[1].split('.')[0];
  return `https://${projectRef}.functions.supabase.co/${functionName}`;
};

// Call your Supabase Edge Function to create a SetupIntent
export async function createStripeSetupIntent(email) {
  const headers = await getAuthHeaders();
  const url = getSupabaseFunctionUrl('create-stripe-setup-intent');
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create SetupIntent');
  }
  
  const data = await res.json();
  return data.clientSecret;
}

// Call your Supabase Edge Function to list payment methods
export async function listStripePaymentMethods(email) {
  const headers = await getAuthHeaders();
  const url = getSupabaseFunctionUrl('stripe-payment-methods');
  
  const res = await fetch(`${url}?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers,
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch payment methods');
  }
  
  const data = await res.json();
  return data.paymentMethods;
}

// Call your Supabase Edge Function to remove a payment method
export async function removeStripePaymentMethod(id) {
  const headers = await getAuthHeaders();
  const url = getSupabaseFunctionUrl('stripe-payment-methods');
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to remove payment method');
  }
  
  return true;
}

export async function notifyAdminOfVenueSubmission(newVenue, venueOwner, user) {
  const ADMIN_EMAIL = "sales@oneeddy.com";
  const CACHE_BUSTER = Date.now(); // Force cache refresh

  try {
    console.log('🔄 [CACHE REFRESH] Sending admin notification via EmailJS for venue:', newVenue.name, 'Time:', CACHE_BUSTER);
    console.log('👤 Venue owner:', venueOwner);
    console.log('📧 Admin email:', ADMIN_EMAIL);
    
    // Import EmailJS dynamically
    let emailjs;
    try {
      emailjs = (await import('@emailjs/browser')).default;
      console.log('✅ EmailJS imported successfully');
    } catch (importError) {
      console.error('❌ Failed to import EmailJS:', importError);
      throw new Error('Failed to import EmailJS library');
    }
    
    // EmailJS configuration
    const EMAILJS_CONFIG = {
      serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    };

    console.log('📋 EmailJS Config check:', {
      serviceId: EMAILJS_CONFIG.serviceId ? 'SET' : 'MISSING',
      templateId: EMAILJS_CONFIG.templateId ? 'SET' : 'MISSING',
      publicKey: EMAILJS_CONFIG.publicKey ? 'SET' : 'MISSING'
    });

    // Check configuration
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete. Check your .env file.');
    }

    // Initialize EmailJS
    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
      console.log('✅ EmailJS initialized successfully');
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      throw new Error('Failed to initialize EmailJS');
    }
    
    // ENHANCED: Create comprehensive venue notification email with all registration details
    const venueNotificationEmail = `
🏢 NEW VENUE SUBMISSION PENDING APPROVAL

A new venue "${newVenue.name}" has been submitted and requires your approval.

═══════════════════════════════════════
VENUE DETAILS
═══════════════════════════════════════
Name: ${newVenue.name}
Type: ${newVenue.type || 'Not specified'}
Description: ${newVenue.description || 'Not provided'}

📍 LOCATION
Address: ${newVenue.address || 'Not provided'}
City: ${newVenue.city || 'Not provided'}
Country: ${newVenue.country || 'Not provided'}

📞 CONTACT INFORMATION
Venue Phone: ${newVenue.contact_phone || 'Not provided'}
Venue Email: ${newVenue.contact_email || 'Not provided'}

🏪 OPERATIONAL DETAILS
Capacity: ${newVenue.capacity ? `${newVenue.capacity} guests` : 'Not specified'}
Price Range: ${newVenue.price_range || 'Not specified'}
Opening Hours: ${newVenue.opening_hours || 'Not provided'}

═══════════════════════════════════════
VENUE OWNER DETAILS
═══════════════════════════════════════
Name: ${venueOwner.full_name}
Email: ${venueOwner.email}
Phone: ${venueOwner.phone || 'Not provided'}

═══════════════════════════════════════
ACTION REQUIRED
═══════════════════════════════════════
Please review and approve or reject this venue submission.

👉 REVIEW VENUE: https://oneeddy.com/venue-approvals

The venue owner will be automatically notified of your decision.

═══════════════════════════════════════
VENUE STATUS: ${newVenue.status?.toUpperCase() || 'PENDING'}
═══════════════════════════════════════

---
This is an automated notification from VIP Club.
If you have questions, contact the development team.
Timestamp: ${new Date().toISOString()}
    `;
    
    // Create admin notification email content using the working field names
    const adminEmailData = {
      email: ADMIN_EMAIL,
      name: 'VIP Club Admin',
      subject: `🏢 New Venue Submission: ${newVenue.name}`,
      message: venueNotificationEmail
    };
    
    console.log('🔥 [LATEST] Sending venue notification email with data:', {
      email: adminEmailData.email,
      name: adminEmailData.name,
      subject: adminEmailData.subject,
      messageLength: venueNotificationEmail.length,
      timestamp: new Date().toISOString()
    });
    
    // Send email via EmailJS with timeout
    const emailPromise = emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      adminEmailData
    );
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('EmailJS request timed out after 30 seconds')), 30000);
    });
    
    const result = await Promise.race([emailPromise, timeoutPromise]);

    console.log("✅ Admin notification sent successfully via EmailJS:", result);
    return { success: true, result };
    
  } catch (error) {
    console.error("❌ Error sending admin notification via EmailJS:", error);
    console.error("❌ Full error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Simple test function for EmailJS connectivity
export async function testEmailJSConnection() {
  try {
    console.log('🧪 Testing EmailJS connectivity...');
    
    // Import EmailJS
    const emailjs = (await import('@emailjs/browser')).default;
    
    // Check config
    const config = {
      serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    };
    
    console.log('📋 Config check:', {
      serviceId: config.serviceId ? 'SET' : 'MISSING',
      templateId: config.templateId ? 'SET' : 'MISSING',
      publicKey: config.publicKey ? 'SET' : 'MISSING'
    });
    
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }
    
    // Initialize
    emailjs.init(config.publicKey);
    
    // Try multiple common field name variations
    const commonFieldVariations = [
      // Variation 1: Most common EmailJS fields
      {
        name: 'Common EmailJS fields',
        data: {
          email: 'sales@oneeddy.com',
          name: 'VIP Club Admin',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 2: Standard to/from fields
      {
        name: 'Standard to/from fields',
        data: {
          to: 'sales@oneeddy.com',
          from: 'VIP Club Test',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 3: User-based fields
      {
        name: 'User-based fields',
        data: {
          user_email: 'sales@oneeddy.com',
          user_name: 'VIP Club Admin',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 4: Our current approach
      {
        name: 'Current approach',
        data: {
          to_name: 'VIP Club Admin',
          to_email: 'sales@oneeddy.com',
          from_name: 'VIP Club Test',
          reply_to: 'noreply@oneeddy.com',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.',
          html_message: '<p>This is a <strong>test message</strong> to verify EmailJS connectivity.</p>'
        }
      }
    ];
    
    // Try each variation
    for (const variation of commonFieldVariations) {
      try {
        console.log(`📤 Trying ${variation.name}:`, variation.data);
        
        const result = await emailjs.send(config.serviceId, config.templateId, variation.data);
        console.log(`✅ SUCCESS with ${variation.name}:`, result);
        
        return { 
          success: true, 
          result, 
          workingFields: variation.name,
          workingData: variation.data 
        };
        
      } catch (error) {
        console.log(`❌ Failed with ${variation.name}:`, error.message);
        // Continue to next variation
      }
    }
    
    // If all variations failed
    throw new Error('All common field variations failed. Check your EmailJS template configuration.');
    
  } catch (error) {
    console.error('❌ EmailJS connection test failed:', error);
    return { success: false, error: error.message };
  }
}

function VenueOwnersTest() {
  useEffect(() => {
    async function fetchVenueOwners() {
      const { data, error } = await supabase.from("venue_owners").select("*");
      console.log(data, error);
    }
    fetchVenueOwners();
  }, []);

  return <div>Check the console for venue owners data.</div>;
}

export default VenueOwnersTest; 