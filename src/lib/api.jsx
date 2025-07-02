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

export async function notifyAdminOfVenueSubmission(newVenue, userProfile, user) {
  const url = getSupabaseFunctionUrl('send-email');
  const ADMIN_EMAIL = "sales@oneeddy.com"; // Change to your admin email

  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: ADMIN_EMAIL,
        subject: "New Venue Submission Pending Approval",
        template: "admin-venue-submitted",
        data: {
          venueName: newVenue.name,
          ownerName: `${userProfile.first_name} ${userProfile.last_name}`,
          ownerEmail: user.email
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send admin notification email.");
    }
    console.log("Admin notification email sent!");
  } catch (err) {
    console.error("Error sending admin notification:", err.message);
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