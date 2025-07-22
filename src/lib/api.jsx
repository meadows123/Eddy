import { supabase } from './supabase.js'
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Heart, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '../components/ui/button.jsx';

// Get user profile by ID
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        city: profileData.city,
        country: profileData.country
      })
      .eq('id', userId)
      .single();

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Get user preferences
export const getUserPreferences = async (userId) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
};

// Update user preferences
export const updateUserPreferences = async (userId, updates) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
};

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
  console.log("🔔 [ADMIN EMAIL] Starting venue submission notification...");
  
  const ADMIN_EMAIL = "sales@oneeddy.com";
  
  const EMAILJS_CONFIG = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  };

  try {
    console.log('📧 EmailJS config check:', {
      serviceId: EMAILJS_CONFIG.serviceId ? 'SET' : 'MISSING',
      templateId: EMAILJS_CONFIG.templateId ? 'SET' : 'MISSING', 
      publicKey: EMAILJS_CONFIG.publicKey ? 'SET' : 'MISSING'
    });

    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    // Import and initialize EmailJS
    const emailjs = (await import('@emailjs/browser')).default;
    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
      console.log('✅ EmailJS initialized successfully');
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      throw new Error('Failed to initialize EmailJS');
    }
    
    // Map data to match EmailJS template variables exactly
    const templateData = {
      // Owner information
      ownerName: venueOwner.full_name,
      ownerEmail: venueOwner.email,
      ownerPhone: venueOwner.phone || 'Not provided',
      
      // Venue information
      venueName: newVenue.name,
      venueDescription: newVenue.description || 'No description provided',
      venueType: newVenue.type || 'Not specified',
      venueCapacity: newVenue.capacity || 'Not specified',
      venueAddress: `${newVenue.address || 'Not provided'}, ${newVenue.city || 'Not provided'}, ${newVenue.country || 'Not provided'}`,
      venuePhone: newVenue.contact_phone || 'Not provided',
      priceRange: newVenue.price_range || 'Not specified',
      openingHours: newVenue.opening_hours || 'Not provided',
      
      // Application metadata
      applicationDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      viewUrl: 'https://your-production-domain.com/admin/venue-approvals', // Update this to your actual production URL
      
      // Email routing (for EmailJS)
      to_email: ADMIN_EMAIL,
      to_name: 'Eddys Members Admin',
      from_name: 'Eddys Members System',
      reply_to: venueOwner.email
    };
    
    console.log('🔥 [VENUE EMAIL] Sending with template data:', {
      ownerName: templateData.ownerName,
      venueName: templateData.venueName,
      ownerEmail: templateData.ownerEmail,
      viewUrl: templateData.viewUrl,
      timestamp: new Date().toISOString()
    });
    
    // Send email via EmailJS with timeout
    const emailPromise = emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateData
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
          name: 'Eddys Members Admin',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 2: Standard to/from fields
      {
        name: 'Standard to/from fields',
        data: {
          to: 'sales@oneeddy.com',
          from: 'Eddys Members Test',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 3: User-based fields
      {
        name: 'User-based fields',
        data: {
          user_email: 'sales@oneeddy.com',
          user_name: 'Eddys Members Admin',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 4: Our current approach
      {
        name: 'Current approach',
        data: {
          to_name: 'Eddys Members Admin',
          to_email: 'sales@oneeddy.com',
          from_name: 'Eddys Members Test',
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