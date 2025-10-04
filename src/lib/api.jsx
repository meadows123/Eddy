import { supabase } from './supabase.js'
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Heart, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  
  const ADMIN_EMAIL = "sales@oneeddy.com";
  
  const EMAILJS_CONFIG = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  };

  try {

    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    // Import and initialize EmailJS
    const emailjs = (await import('@emailjs/browser')).default;
    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
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
      viewUrl: 'https://oneeddy.com/admin/venue-approvals', // Updated to correct production URL
      
      // Email routing (for EmailJS)
      to_email: ADMIN_EMAIL,
      to_name: 'Eddys Members Admin',
      from_name: 'Eddys Members System',
      reply_to: venueOwner.email
    };
    
    
    // Log the complete template data for debugging
    
    // Send email via EmailJS (preferred method)
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

    return { success: true, result };
    
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
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
    
    // Import EmailJS
    const emailjs = (await import('@emailjs/browser')).default;
    
    // Check config
    const config = {
      serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    };
    
    
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
          email: 'info@oneeddy.com',
          name: 'Eddys Members Admin',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 2: Standard to/from fields
      {
        name: 'Standard to/from fields',
        data: {
          to: 'info@oneeddy.com',
          from: 'Eddys Members Test',
          subject: 'EmailJS Connection Test',
          message: 'This is a test message to verify EmailJS connectivity.'
        }
      },
      // Variation 3: User-based fields
      {
        name: 'User-based fields',
        data: {
          user_email: 'info@oneeddy.com',
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
          to_email: 'info@oneeddy.com',
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
        
        const result = await emailjs.send(config.serviceId, config.templateId, variation.data);
        
        return { 
          success: true, 
          result, 
          workingFields: variation.name,
          workingData: variation.data 
        };
        
      } catch (error) {
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

// Add this function to your existing api.jsx file

// Check available time slots for a specific date and venue
export const getAvailableTimeSlots = async (venueId, date, tableId = null) => {
  try {
    // Get all existing bookings for this venue and date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, table_id, status')
      .eq('venue_id', venueId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending']); // Count both confirmed and pending bookings

    if (error) throw error;

    // Generate all possible time slots (e.g., every 30 minutes from opening to closing)
    const allTimeSlots = generateTimeSlots('18:00', '02:00'); // Adjust based on your venue hours
    
    // Filter out unavailable time slots
    const availableSlots = allTimeSlots.filter(slot => {
      // Create slot time as minutes since midnight for easier comparison
      const [hours, minutes] = slot.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;
      
      // Check if this specific time slot conflicts with existing bookings
      const isAvailable = !existingBookings.some(booking => {
        // Convert booking times to minutes since midnight
        const [startHours, startMins] = booking.start_time.split(':').map(Number);
        const [endHours, endMins] = booking.end_time.split(':').map(Number);
        
        let bookingStartMinutes = startHours * 60 + startMins;
        let bookingEndMinutes = endHours * 60 + endMins;
        
        // Handle bookings that cross midnight
        if (bookingEndMinutes < bookingStartMinutes) {
          bookingEndMinutes += 24 * 60; // Add 24 hours (1440 minutes)
        }
        
        // Check if the slot time falls within the existing booking time range
        // A slot is unavailable if it falls within an existing booking period
        let slotMinutesToCheck = slotMinutes;
        
        // If booking crosses midnight and slot is in the early morning (00:00-06:00),
        // we need to add 24 hours to the slot time for comparison
        if (bookingEndMinutes > 24 * 60 && slotMinutes < 6 * 60) {
          slotMinutesToCheck += 24 * 60;
        }
        
        return slotMinutesToCheck >= bookingStartMinutes && slotMinutesToCheck < bookingEndMinutes;
      });
      
      return isAvailable;
    });

    return { data: availableSlots, error: null };
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return { data: null, error };
  }
};

// Add this function to check real-time table availability
export const checkTableAvailability = async (venueId, tableId, date) => {
  try {
    // Get all existing bookings for this specific table and date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, status')
      .eq('venue_id', venueId)
      .eq('table_id', tableId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending', 'paid']); // Count confirmed, pending, and paid bookings

    if (error) throw error;

    // Debug logging
    console.log('🔍 Checking availability for:', { venueId, tableId, date });
    console.log('📅 Existing bookings:', existingBookings);
    console.log('📊 Booking statuses found:', existingBookings.map(b => ({ time: b.start_time, status: b.status })));

    // Generate all possible time slots
    const allTimeSlots = generateTimeSlots('18:00', '02:00'); // Adjust based on your venue hours
    console.log('⏰ Generated time slots:', allTimeSlots);
    
    // Check which times are available
    const availability = allTimeSlots.map(time => {
      // Create slot time as minutes since midnight for easier comparison
      const [hours, minutes] = time.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;
      
      // Check if this specific time slot conflicts with existing bookings
      const conflictingBooking = existingBookings.find(booking => {
        // Convert booking times to minutes since midnight
        const [startHours, startMins] = booking.start_time.split(':').map(Number);
        const [endHours, endMins] = booking.end_time.split(':').map(Number);
        
        let bookingStartMinutes = startHours * 60 + startMins;
        let bookingEndMinutes = endHours * 60 + endMins;
        
        // Handle bookings that cross midnight
        if (bookingEndMinutes < bookingStartMinutes) {
          bookingEndMinutes += 24 * 60; // Add 24 hours (1440 minutes)
        }
        
        // Check if the slot time falls within the existing booking time range
        // A slot is unavailable if it falls within an existing booking period
        let slotMinutesToCheck = slotMinutes;
        
        // If booking crosses midnight and slot is in the early morning (00:00-06:00),
        // we need to add 24 hours to the slot time for comparison
        if (bookingEndMinutes > 24 * 60 && slotMinutes < 6 * 60) {
          slotMinutesToCheck += 24 * 60;
        }
        
        const slotFallsWithinBooking = slotMinutesToCheck >= bookingStartMinutes && slotMinutesToCheck < bookingEndMinutes;
        
        return slotFallsWithinBooking;
      });
      
      const isAvailable = !conflictingBooking;
      
      const result = {
        time,
        available: isAvailable,
        reason: isAvailable ? null : `Table already booked from ${conflictingBooking?.start_time} to ${conflictingBooking?.end_time} (Status: ${conflictingBooking?.status})`
      };
      
      if (!isAvailable) {
        console.log(`❌ Time slot ${time} is unavailable due to booking:`, {
          slotTime: time,
          conflictingBooking: `${conflictingBooking?.start_time} to ${conflictingBooking?.end_time}`,
          bookingStatus: conflictingBooking?.status
        });
      }
      
      return result;
    });

    console.log('✅ Final availability result:', availability);
    return { data: availability, error: null };
  } catch (error) {
    console.error('Error checking table availability:', error);
    return { data: null, error };
  }
};

// Helper function to generate time slots
const generateTimeSlots = (startTime, endTime) => {
  const slots = [];
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  // Handle overnight hours (e.g., 18:00 to 02:00)
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const current = new Date(start);
  while (current < end) {
    // Format time as HH:MM:SS to match database format
    const timeString = current.toTimeString().slice(0, 8);
    slots.push(timeString);
    current.setMinutes(current.getMinutes() + 30); // 30-minute intervals
  }
  
  return slots;
};

// Get available tables for a venue
export const getAvailableTables = async (venueId) => {
  try {
    const { data, error } = await supabase
      .from('venue_tables')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'available');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return { data: null, error };
  }
};
