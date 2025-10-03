// Venue Owner Utility Functions
import { supabase } from './supabase.js';

// Check for broken venue owner links
export const checkBrokenVenueOwnerLinks = async () => {
  try {
    
    const { data, error } = await supabase
      .from('broken_venue_owner_links')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Fix broken venue owner links
export const fixBrokenVenueOwnerLinks = async () => {
  try {
    console.log('🔧 Fixing broken venue owner links...');
    
    const { data, error } = await supabase.rpc('fix_broken_venue_owner_links');
    
    if (error) {
      console.error('❌ Error fixing broken links:', error);
      throw error;
    }
    
    console.log('✅ Fix results:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to fix broken links:', error);
    throw error;
  }
};

// Get venue owner status by email
export const getVenueOwnerStatus = async (email) => {
  try {
    console.log('🔍 Getting venue owner status for:', email);
    
    // Check venue owner record
    const { data: venueOwner, error: venueOwnerError } = await supabase
      .from('venue_owners')
      .select('*')
      .eq('owner_email', email)
      .single();
    
    // Note: Cannot directly query auth.users from client-side
    // Auth user information is available through the auth API after login
    console.log('👤 Auth user check: Use Supabase Auth API instead of direct query');
    
    // Check venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('contact_email', email)
      .single();
    
    const status = {
      venueOwner: venueOwnerError ? null : venueOwner,
      authUser: null, // Cannot access auth.users directly
      venue: venueError ? null : venue,
      issues: []
    };
    
    // Identify issues
    status.issues.push('Auth user status: Use Supabase Auth API to check');
    
    if (!status.venueOwner) {
      status.issues.push('No venue owner record found');
    } else if (status.venueOwner.user_id === null) {
      status.issues.push('Venue owner not linked to user account');
    }
    
    if (!status.venue) {
      status.issues.push('No venue record found');
    } else if (status.venue.owner_id === null && status.venueOwner?.user_id) {
      status.issues.push('Venue not linked to owner');
    }
    
    console.log('📊 Venue owner status:', status);
    return status;
  } catch (error) {
    console.error('❌ Failed to get venue owner status:', error);
    throw error;
  }
};

// Manual link venue owner to user
export const linkVenueOwnerToUser = async (email, userId) => {
  try {
    console.log('🔗 Manually linking venue owner:', email, 'to user:', userId);
    
    const { error } = await supabase
      .from('venue_owners')
      .update({ 
        user_id: userId,
        status: 'active'
      })
      .eq('owner_email', email)
      .eq('status', 'pending_owner_signup');
    
    if (error) {
      console.error('❌ Failed to link venue owner:', error);
      throw error;
    }
    
    console.log('✅ Venue owner linked successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to link venue owner:', error);
    throw error;
  }
};

// Manual link venue to owner
export const linkVenueToOwner = async (email, userId) => {
  try {
    console.log('🏢 Manually linking venue:', email, 'to user:', userId);
    
    const { error } = await supabase
      .from('venues')
      .update({ 
        owner_id: userId
      })
      .eq('contact_email', email);
    
    if (error) {
      console.error('❌ Failed to link venue:', error);
      throw error;
    }
    
    console.log('✅ Venue linked successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to link venue:', error);
    throw error;
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.checkBrokenVenueOwnerLinks = checkBrokenVenueOwnerLinks;
  window.fixBrokenVenueOwnerLinks = fixBrokenVenueOwnerLinks;
  window.getVenueOwnerStatus = getVenueOwnerStatus;
  window.linkVenueOwnerToUser = linkVenueOwnerToUser;
  window.linkVenueToOwner = linkVenueToOwner;
} 