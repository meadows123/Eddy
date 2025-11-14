import { initializePaystackPayment } from './api';

/**
 * Initiates a split payment through Paystack
 * Takes a commission before splitting the amount
 */
export const initiateSplitPaystackPayment = async ({
  email,
  fullName,
  phone,
  amount,
  requestId,
  bookingId,
  bookingData = {},
  userId
}) => {
  console.log('🇳🇬 Initiating split Paystack payment:', {
    amount,
    email,
    fullName,
    requestId,
    bookingId
  });

  try {
    // Calculate 10% commission for platform
    const commissionPercentage = 0.10;
    const platformCommission = Math.round(amount * commissionPercentage);
    const amountAfterCommission = amount - platformCommission;

    console.log('💰 Split payment calculation:', {
      totalAmount: amount,
      platformCommission,
      amountAfterCommission
    });

    // Prepare metadata for Paystack
    const metadata = {
      requestId,
      bookingId,
      paymentType: 'split',
      callbackType: 'split', // Indicates this should go to split payment callback
      platformCommission,
      amountAfterCommission,
      customerName: fullName,
      customerPhone: phone,
      timestamp: new Date().toISOString()
    };

    console.log('📦 Split payment metadata:', metadata);

    // Call Paystack initialization
    const response = await initializePaystackPayment({
      email,
      amount: Math.round(amount * 100), // Convert to kobo (Paystack requires amount in kobo)
      metadata,
      firstName: fullName.split(' ')[0],
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      phone,
      userId
    });

    console.log('✅ Split payment initialized:', {
      hasAuthUrl: !!response.data?.authorization_url,
      reference: response.data?.reference
    });

    // Store payment details in session for later verification
    const paymentData = {
      reference: response.data?.reference,
      email,
      amount,
      requestId,
      bookingId,
      fullName,
      phone,
      timestamp: Date.now()
    };

    sessionStorage.setItem('paystack_split_payment', JSON.stringify(paymentData));
    console.log('💾 Split payment data stored in session');

    // Return in the format expected by the caller
    return {
      status: response.status,
      message: response.message,
      reference: response.data?.reference,
      authorizationUrl: response.data?.authorization_url,
      accessCode: response.data?.access_code
    };
  } catch (error) {
    console.error('❌ Split payment initialization error:', error);
    throw error;
  }
};

/**
 * Verifies a split payment after redirect from Paystack
 */
export const verifySplitPaystackPayment = async (reference) => {
  console.log('🔍 Verifying split Paystack payment:', reference);

  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/paystack-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ reference })
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Split payment verified:', {
      status: data.data?.status,
      amount: data.data?.amount,
      reference: data.data?.reference
    });

    return data;
  } catch (error) {
    console.error('❌ Split payment verification error:', error);
    throw error;
  }
};

/**
 * Get payment data from session storage
 */
export const getSplitPaymentFromSession = () => {
  try {
    const data = sessionStorage.getItem('paystack_split_payment');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading split payment from session:', error);
    return null;
  }
};

/**
 * Clear payment data from session storage
 */
export const clearSplitPaymentFromSession = () => {
  sessionStorage.removeItem('paystack_split_payment');
  console.log('Split payment session cleared');
};

/**
 * Format amount for Paystack (convert to kobo - smallest unit)
 */
export const formatPaystackAmount = (amountInNaira) => {
  return Math.round(amountInNaira * 100);
};

