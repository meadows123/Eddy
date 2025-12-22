/**
 * Paystack Payment Handler
 * Manages the complete Paystack payment flow including:
 * - Initiating payments
 * - Handling callbacks
 * - Verifying payments
 * - Creating bookings
 */

import { supabase } from './supabase';
import { getPaystackCallbackUrl } from './urlUtils';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Initiates a Paystack payment for a booking
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.fullName - Customer full name
 * @param {string} paymentData.phone - Customer phone number
 * @param {number} paymentData.amount - Amount to pay (in local currency, will be converted to kobo)
 * @param {Object} paymentData.bookingData - Booking information
 * @param {string} paymentData.bookingData.bookingId - Booking ID
 * @param {string} paymentData.bookingData.venueId - Venue ID
 * @param {string} paymentData.bookingData.venueName - Venue name
 * @param {string} paymentData.bookingData.bookingDate - Booking date
 * @param {string} paymentData.bookingData.startTime - Start time
 * @param {string} paymentData.bookingData.endTime - End time
 * @param {number} paymentData.bookingData.guestCount - Number of guests
 * @param {string} paymentData.userId - User ID
 * @returns {Promise<Object>} Paystack authorization data
 */
export const initiatePaystackPayment = async ({
  email,
  fullName,
  phone,
  amount,
  bookingData,
  userId
}) => {
  try {
    console.log('🇳🇬 Initiating Paystack payment:', {
      email,
      fullName,
      phone,
      amount,
      bookingId: bookingData?.bookingId
    });

    // Validate inputs
    if (!email || !fullName || !phone || !amount || !bookingData) {
      throw new Error('Missing required payment information');
    }

    // Convert amount to kobo (Paystack uses smallest currency unit)
    // For NGN: 1 NGN = 100 kobo
    const amountInKobo = Math.round(amount * 100);

    if (amountInKobo <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    console.log('💰 Amount in Kobo:', amountInKobo);

    // Prepare metadata
    const metadata = {
      bookingId: bookingData.bookingId,
      venueId: bookingData.venueId,
      venueName: bookingData.venueName,
      bookingDate: bookingData.bookingDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      guestCount: bookingData.guestCount,
      userId: userId,
      customerName: fullName,
      customerPhone: phone,
      callbackType: 'single', // Indicates this should go to single payment callback
      timestamp: new Date().toISOString()
    };

    console.log('📦 Paystack metadata being sent:', metadata);
    console.log('   bookingId:', bookingData.bookingId);
    console.log('   venueId:', bookingData.venueId);

    console.log('📞 Calling Supabase Edge Function: paystack-initialize...');

    // Get callback URL (mobile-friendly if on mobile app)
    const callbackUrl = getPaystackCallbackUrl('/paystack-callback');
    console.log('🔗 Callback URL:', callbackUrl);

    // Import the Supabase function caller
    const { initializePaystackPayment: callInitialize } = await import('./api.jsx');

    // Call Supabase Edge Function
    const data = await callInitialize({
      email,
      amount: amountInKobo, // Send in kobo
      firstName: fullName.split(' ')[0],
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      phone,
      metadata,
      callbackUrl // Pass mobile-friendly callback URL
    });

    console.log('✅ Paystack payment initialized:', {
      reference: data.data?.reference,
      authUrl: data.data?.authorization_url ? '✅' : '❌'
    });

    // Store reference in sessionStorage for callback verification
    if (data.data?.reference) {
      sessionStorage.setItem('paystackReference', data.data.reference);
      sessionStorage.setItem('bookingId', bookingData.bookingId);
      sessionStorage.setItem('paymentAmount', amountInKobo);
      sessionStorage.setItem('paymentEmail', email);
    }

    return {
      status: data.status,
      message: data.message,
      reference: data.data?.reference,
      authorizationUrl: data.data?.authorization_url,
      accessCode: data.data?.access_code
    };
  } catch (error) {
    console.error('❌ Paystack payment initiation error:', error);
    throw error;
  }
};

/**
 * Verifies a Paystack payment using the reference
 * @param {string} reference - Paystack payment reference
 * @returns {Promise<Object>} Payment verification result
 */
export const verifyPaystackPayment = async (reference) => {
  try {
    console.log('🔍 Verifying Paystack payment:', reference);

    if (!reference) {
      throw new Error('No payment reference provided');
    }

    // Import the Supabase function caller
    const { verifyPaystackPayment: callVerify } = await import('./api.jsx');

    // Call Supabase Edge Function to verify payment
    const data = await callVerify(reference);

    console.log('✅ Payment verified:', {
      status: data.data?.status,
      amount: data.data?.amount,
      reference: data.data?.reference
    });

    return {
      status: data.data?.status, // 'success', 'failed', or 'pending'
      amount: data.data?.amount,
      reference: data.data?.reference,
      message: data.message,
      authorizedAmount: data.data?.authorization?.bin,
      customer: data.data?.customer
    };
  } catch (error) {
    console.error('❌ Paystack payment verification error:', error);
    throw error;
  }
};

/**
 * Completes a booking after successful payment
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.bookingId - Booking ID
 * @param {string} bookingData.userId - User ID
 * @param {string} reference - Paystack payment reference
 * @returns {Promise<Object>} Updated booking
 */
export const completeBookingAfterPayment = async ({
  bookingId,
  userId,
  reference
}) => {
  try {
    console.log('📝 Completing booking after payment:', {
      bookingId,
      reference
    });

    // First verify the booking exists
    const { data: existingBooking, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      throw new Error(`Failed to verify booking: ${checkError.message}`);
    }
    
    if (!existingBooking) {
      throw new Error(`Booking not found or access denied. Booking ID: ${bookingId}`);
    }

    // Update booking in Supabase (without .single() to avoid errors)
    const { data: bookingDataArray, error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'completed',
        payment_reference: reference,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('user_id', userId)
      .select();

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }
    
    // Get the first (and should be only) booking from the array
    const data = bookingDataArray && bookingDataArray.length > 0 ? bookingDataArray[0] : null;
    
    if (!data) {
      throw new Error('Booking update succeeded but no data returned');
    }

    console.log('✅ Booking completed:', bookingId);

    return data;
  } catch (error) {
    console.error('❌ Error completing booking:', error);
    throw error;
  }
};

/**
 * Gets the callback URL for Paystack redirects
 * @deprecated Use getPaystackCallbackUrl from urlUtils instead
 * @returns {string} Callback URL
 */
export const getPaystackCallbackUrlLegacy = () => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/paystack-callback`;
};

/**
 * Processes a Paystack webhook event
 * This is typically called from your backend
 * @param {Object} event - Paystack webhook event
 * @returns {Promise<void>}
 */
export const handlePaystackWebhook = async (event) => {
  try {
    console.log('🔔 Processing Paystack webhook:', event.event);

    switch (event.event) {
      case 'charge.success':
        console.log('✅ Payment successful:', event.data);
        // Handle successful payment
        // - Update booking status
        // - Send confirmation email
        // - Create transactions record
        break;

      case 'charge.failed':
        console.log('❌ Payment failed:', event.data);
        // Handle failed payment
        // - Update booking status
        // - Send failure notification
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event.event);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    throw error;
  }
};

/**
 * Gets stored payment information from session
 * @returns {Object} Session payment data
 */
export const getPaymentFromSession = () => {
  return {
    reference: sessionStorage.getItem('paystackReference'),
    bookingId: sessionStorage.getItem('bookingId'),
    amount: sessionStorage.getItem('paymentAmount'),
    email: sessionStorage.getItem('paymentEmail')
  };
};

/**
 * Clears payment information from session
 */
export const clearPaymentFromSession = () => {
  sessionStorage.removeItem('paystackReference');
  sessionStorage.removeItem('bookingId');
  sessionStorage.removeItem('paymentAmount');
  sessionStorage.removeItem('paymentEmail');
};

/**
 * Formats amount for display
 * @param {number} amountInKobo - Amount in kobo
 * @returns {string} Formatted amount (e.g., "₦5,000.00")
 */
export const formatPaystackAmount = (amountInKobo) => {
  const amountInNGN = amountInKobo / 100;
  return `₦${amountInNGN.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export default {
  initiatePaystackPayment,
  verifyPaystackPayment,
  completeBookingAfterPayment,
  getPaystackCallbackUrl,
  handlePaystackWebhook,
  getPaymentFromSession,
  clearPaymentFromSession,
  formatPaystackAmount
};

