import { supabase } from './supabase.js'

// Helper function for error handling
const handleError = (error, operation) => {
  console.error(`Error in ${operation}:`, error)
  throw error
}

// User Profile API
export const userApi = {
  async getProfile(userId) {
    try {
      console.log('Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  async updateProfile(userId, updates) {
    try {
      console.log('Updating profile for user:', userId, 'with updates:', updates)
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}

// Saved Venues API
export const savedVenuesApi = {
  // Get user's saved venues
  getSavedVenues: async (userId) => {
    try {
      console.log('Fetching saved venues for user:', userId)
      const { data, error } = await supabase
        .from('saved_venues')
        .select(`
          *,
          venues (*)
        `)
        .eq('user_id', userId)
      
      if (error) handleError(error, 'getSavedVenues')
      console.log('Saved venues:', data)
      return data
    } catch (error) {
      handleError(error, 'getSavedVenues')
    }
  },

  // Save a venue
  saveVenue: async (userId, venueId) => {
    try {
      console.log('Saving venue:', venueId, 'for user:', userId)
      const { data, error } = await supabase
        .from('saved_venues')
        .insert([{ user_id: userId, venue_id: venueId }])
        .select()
      
      if (error) handleError(error, 'saveVenue')
      console.log('Saved venue:', data)
      return data
    } catch (error) {
      handleError(error, 'saveVenue')
    }
  },

  // Remove a saved venue
  removeSavedVenue: async (userId, venueId) => {
    try {
      console.log('Removing venue:', venueId, 'for user:', userId)
      const { error } = await supabase
        .from('saved_venues')
        .delete()
        .eq('user_id', userId)
        .eq('venue_id', venueId)
      
      if (error) handleError(error, 'removeSavedVenue')
      console.log('Venue removed successfully')
    } catch (error) {
      handleError(error, 'removeSavedVenue')
    }
  }
}

// Bookings API
export const bookingsApi = {
  // Get user's bookings
  getUserBookings: async (userId) => {
    try {
      console.log('Fetching bookings for user:', userId)
      const { data, error } = await supabase
        .from('user_bookings')
        .select(`
          *,
          venues (*)
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: false })
      
      if (error) handleError(error, 'getUserBookings')
      console.log('User bookings:', data)
      return data
    } catch (error) {
      handleError(error, 'getUserBookings')
    }
  },

  // Create a new booking
  createBooking: async (bookingData) => {
    try {
      console.log('Creating booking:', bookingData)
      const { data, error } = await supabase
        .from('user_bookings')
        .insert([bookingData])
        .select()
      
      if (error) handleError(error, 'createBooking')
      console.log('Created booking:', data)
      return data
    } catch (error) {
      handleError(error, 'createBooking')
    }
  },

  // Update booking status
  updateBookingStatus: async (bookingId, status) => {
    try {
      console.log('Updating booking:', bookingId, 'to status:', status)
      const { data, error } = await supabase
        .from('user_bookings')
        .update({ status })
        .eq('id', bookingId)
        .select()
      
      if (error) handleError(error, 'updateBookingStatus')
      console.log('Updated booking:', data)
      return data
    } catch (error) {
      handleError(error, 'updateBookingStatus')
    }
  }
} 