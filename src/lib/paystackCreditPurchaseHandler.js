import { initializePaystackPayment } from './api';

/**
 * Initiates a credit purchase payment through Paystack
 * Takes a commission before crediting the venue
 */
export const initiateCreditPurchasePayment = async ({
  email,
  fullName,
  phone,
  amount,
  venueId,
  venueName,
  userId
}) => {
  console.log('🇳🇬 Initiating credit purchase Paystack payment:', {
    amount,
    email,
    fullName,
    venueId,
    venueName
  });

  try {
    // Calculate 10% commission for platform
    const commissionPercentage = 0.10;
    const platformCommission = Math.round(amount * commissionPercentage);
    const amountAfterCommission = amount - platformCommission;

    console.log('💰 Credit purchase calculation:', {
      totalAmount: amount,
      platformCommission,
      amountAfterCommission
    });

    // Prepare metadata for Paystack
    const metadata = {
      venueId,
      venueName,
      paymentType: 'credit_purchase',
      callbackType: 'credit', // Indicates this should go to credit purchase callback
      platformCommission,
      amountAfterCommission,
      customerName: fullName,
      customerPhone: phone,
      timestamp: new Date().toISOString()
    };

    console.log('📦 Credit purchase metadata:', metadata);

    // Call Paystack initialization
    const result = await initializePaystackPayment({
      email,
      amount: Math.round(amount * 100), // Convert to kobo (Paystack requires amount in kobo)
      metadata,
      fullName,
      phone,
      userId
    });

    console.log('✅ Credit purchase payment initialized:', {
      hasAuthUrl: !!result.authorizationUrl,
      reference: result.reference
    });

    // Store payment details in session for later verification
    const paymentData = {
      reference: result.reference,
      email,
      amount,
      venueId,
      venueName,
      fullName,
      phone,
      timestamp: Date.now()
    };

    sessionStorage.setItem('paystack_credit_purchase', JSON.stringify(paymentData));
    console.log('💾 Credit purchase payment data stored in session');

    return result;
  } catch (error) {
    console.error('❌ Credit purchase payment initialization error:', error);
    throw error;
  }
};

/**
 * Verifies a credit purchase payment after redirect from Paystack
 */
export const verifyCreditPurchasePayment = async (reference) => {
  console.log('🔍 Verifying credit purchase payment:', reference);

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
    console.log('✅ Credit purchase payment verified:', {
      status: data.data?.status,
      amount: data.data?.amount,
      reference: data.data?.reference
    });

    return data;
  } catch (error) {
    console.error('❌ Credit purchase payment verification error:', error);
    throw error;
  }
};

/**
 * Complete credit purchase after payment verification
 */
export const completeCreditPurchase = async ({
  bookingData,
  paymentData,
  supabaseClient
}) => {
  console.log('💳 Completing credit purchase with:', bookingData);

  try {
    // Create venue credit record with only essential fields
    const creditDataToInsert = {
      user_id: bookingData.userId,
      venue_id: bookingData.venueId,
      amount: paymentData.amountAfterCommission, // Amount after commission
      used_amount: 0,
      status: 'active'
    };

    console.log('📝 Creating venue credit record:', creditDataToInsert);

    const { data: creditRecord, error: creditError } = await supabaseClient
      .from('venue_credits')
      .insert([creditDataToInsert])
      .select()
      .single();

    if (creditError) {
      console.error('❌ Error creating venue credit:', creditError);
      throw new Error(`Failed to create venue credit: ${creditError.message}`);
    }

    console.log('✅ Venue credit created:', creditRecord);
    return creditRecord;
  } catch (error) {
    console.error('❌ Credit purchase completion error:', error);
    throw error;
  }
};

/**
 * Get payment data from session storage
 */
export const getCreditPurchaseFromSession = () => {
  try {
    const data = sessionStorage.getItem('paystack_credit_purchase');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading credit purchase from session:', error);
    return null;
  }
};

/**
 * Clear payment data from session storage
 */
export const clearCreditPurchaseFromSession = () => {
  sessionStorage.removeItem('paystack_credit_purchase');
  console.log('Credit purchase session cleared');
};

/**
 * Format amount for Paystack (convert to kobo - smallest unit)
 */
export const formatPaystackAmount = (amountInNaira) => {
  return Math.round(amountInNaira * 100);
};

