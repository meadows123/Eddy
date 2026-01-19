import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body;
    try {
      body = await req.json()
    } catch (e) {
      console.error('❌ JSON parse error:', e)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: e.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('📝 Full request body received:', JSON.stringify(body, null, 2))

    const amount = Number(body?.amount)
    const currency = body?.currency?.toLowerCase() || 'gbp'
    const bookingId = body?.bookingId
    const email = body?.email
    const description = body?.description || 'Venue Booking'
    const paymentMethodId = body?.paymentMethodId // Optional - not required for PaymentIntent creation

    console.log('📝 create-stripe-payment-intent request:', {
      amount,
      currency,
      bookingId,
      email,
      hasPaymentMethodId: !!paymentMethodId,
      description
    })

    // Validate inputs
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid amount provided')
    }

    if (!bookingId) {
      throw new Error('Booking ID is required')
    }

    if (!email) {
      throw new Error('Email is required')
    }

    // Note: paymentMethodId is NOT required for creating a PaymentIntent
    // It will be attached when confirming the payment in the frontend

    // Get Stripe secret key - check both test and live keys
    const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY')?.trim() ?? ''
    const liveKey = Deno.env.get('STRIPE_SECRET_KEY')?.trim() ?? ''
    const stripeKey = (testKey && testKey.length > 0) ? testKey : liveKey
    const isTestMode = stripeKey.startsWith('sk_test_')
    const isLiveMode = stripeKey.startsWith('sk_live_')

    console.log('🔑 Stripe mode:', isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN')

    if (!stripeKey) {
      throw new Error('Stripe secret key is not configured')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create payment intent with proper currency handling
    const paymentIntentParams = {
      amount: Math.round(amount * 100), // convert to smallest currency unit (cents)
      currency: currency,
      description: description,
      receipt_email: email,
      metadata: {
        bookingId: bookingId,
        type: 'single_booking'
      }
    }

    console.log('💳 Creating Stripe PaymentIntent:', {
      amount: paymentIntentParams.amount,
      currency: paymentIntentParams.currency,
      bookingId: bookingId
    })

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    console.log('✅ PaymentIntent created:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: !!paymentIntent.client_secret
    })

    // Return client secret to frontend
    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ create-stripe-payment-intent error:', error)
    // Return error as JSON
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})

