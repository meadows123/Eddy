import { supabase } from './supabase';

/**
 * Get the connected Stripe account ID for a venue owner
 * @param {string} userId - The venue owner's user ID
 * @returns {Promise<string|null>} - The connected account ID or null if not connected
 */
export const getConnectedAccountId = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to getConnectedAccountId');
      return null;
    }

    const { data, error } = await supabase
      .from('venue_owners')
      .select('stripe_connected_account_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching connected account ID:', error);
      return null;
    }

    const connectedAccountId = data?.stripe_connected_account_id;
    
    if (connectedAccountId) {
      console.log('✅ Found connected account:', connectedAccountId);
      return connectedAccountId;
    }

    console.log('ℹ️ No connected account found for user:', userId);
    return null;
  } catch (error) {
    console.error('❌ Unexpected error in getConnectedAccountId:', error);
    return null;
  }
};

/**
 * Get the connected account ID for a venue
 * @param {string} venueId - The venue's ID
 * @returns {Promise<string|null>} - The connected account ID or null if not connected
 */
export const getConnectedAccountIdForVenue = async (venueId) => {
  try {
    if (!venueId) {
      console.warn('⚠️ No venueId provided to getConnectedAccountIdForVenue');
      return null;
    }

    // Get venue's owner_id first
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('owner_id')
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.error('❌ Error fetching venue owner_id:', venueError);
      return null;
    }

    if (!venueData?.owner_id) {
      console.warn('⚠️ Venue has no owner_id:', venueId);
      return null;
    }

    // Get connected account ID for the owner
    const { data: ownerData, error: ownerError } = await supabase
      .from('venue_owners')
      .select('stripe_connected_account_id')
      .eq('user_id', venueData.owner_id)
      .single();

    if (ownerError) {
      console.error('❌ Error fetching owner connected account ID:', ownerError);
      return null;
    }

    const connectedAccountId = ownerData?.stripe_connected_account_id;
    
    if (connectedAccountId) {
      console.log('✅ Found connected account for venue:', connectedAccountId);
      return connectedAccountId;
    }

    console.log('ℹ️ No connected account found for venue owner:', venueData.owner_id);
    return null;
  } catch (error) {
    console.error('❌ Unexpected error in getConnectedAccountIdForVenue:', error);
    return null;
  }
};

/**
 * Check if a venue owner has a connected Stripe account
 * @param {string} userId - The venue owner's user ID
 * @returns {Promise<boolean>} - True if connected, false otherwise
 */
export const isVenueOwnerConnected = async (userId) => {
  const connectedAccountId = await getConnectedAccountId(userId);
  return !!connectedAccountId;
};

/**
 * Format a connected account ID for display
 * @param {string} connectedAccountId - The Stripe account ID
 * @returns {string} - Formatted account ID (e.g., "acct_...i9eTZ")
 */
export const formatConnectedAccountId = (connectedAccountId) => {
  if (!connectedAccountId) return 'Not connected';
  if (connectedAccountId.length <= 10) return connectedAccountId;
  
  // Show first 4 and last 5 characters
  return `${connectedAccountId.substring(0, 4)}...${connectedAccountId.substring(-5)}`;
};

/**
 * Get connection status for a venue owner
 * @param {string} userId - The venue owner's user ID
 * @returns {Promise<object>} - Object with connection status info
 */
export const getConnectionStatus = async (userId) => {
  try {
    const connectedAccountId = await getConnectedAccountId(userId);
    
    return {
      isConnected: !!connectedAccountId,
      connectedAccountId: connectedAccountId,
      displayId: formatConnectedAccountId(connectedAccountId),
      status: connectedAccountId ? 'connected' : 'not_connected'
    };
  } catch (error) {
    console.error('❌ Error getting connection status:', error);
    return {
      isConnected: false,
      connectedAccountId: null,
      displayId: 'Error',
      status: 'error'
    };
  }
};

/**
 * Build payment intent payload based on connection status
 * Useful for updating the payment functions to use connected accounts
 * @param {string} venueId - The venue's ID
 * @param {object} basePayload - Base payment intent payload
 * @returns {Promise<object>} - Updated payload with connected account info
 */
export const buildPaymentIntentPayload = async (venueId, basePayload) => {
  try {
    const connectedAccountId = await getConnectedAccountIdForVenue(venueId);
    
    if (connectedAccountId) {
      // Add connected account parameters
      return {
        ...basePayload,
        on_behalf_of: connectedAccountId,
        transfer_data: {
          destination: connectedAccountId
        },
        // Mark that this is a connected account payment
        metadata: {
          ...basePayload.metadata,
          connected_account_id: connectedAccountId,
          payment_type: 'connected_account'
        }
      };
    }

    // Return original payload for platform account
    return {
      ...basePayload,
      metadata: {
        ...basePayload.metadata,
        payment_type: 'platform_account'
      }
    };
  } catch (error) {
    console.error('❌ Error building payment intent payload:', error);
    // Return original payload on error
    return basePayload;
  }
};

/**
 * Example usage in payment function:
 * 
 * import { getConnectedAccountIdForVenue, buildPaymentIntentPayload } from './stripeConnectedAccounts';
 * 
 * // In your payment creation function:
 * const basePayload = {
 *   amount: 100000,
 *   currency: 'ngn',
 *   payment_method: paymentMethodId,
 *   confirmation_method: 'manual'
 * };
 * 
 * const finalPayload = await buildPaymentIntentPayload(venueId, basePayload);
 * 
 * // Then use finalPayload in stripe.paymentIntents.create(finalPayload)
 */

export default {
  getConnectedAccountId,
  getConnectedAccountIdForVenue,
  isVenueOwnerConnected,
  formatConnectedAccountId,
  getConnectionStatus,
  buildPaymentIntentPayload
};

