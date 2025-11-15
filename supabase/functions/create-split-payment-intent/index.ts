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
    const body = await req.json()
    const amount = Number(body?.amount)
    const paymentMethodId = body?.paymentMethodId
    const bookingId = body?.bookingId
    const currency = body?.currency?.toLowerCase() || 'ngn'
    const email = body?.email

    console.log('📝 create-split-payment-intent request v2:', {
      amount,
      currency,
      bookingId,
      hasPaymentMethod: !!paymentMethodId
    })

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid amount provided to create-split-payment-intent')
    }

    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      throw new Error('Payment method ID is required')
    }

    // Log the Stripe key mode for debugging (without exposing the actual key)
    // Check both test and live keys (prefer test key if available and non-empty)
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
      amount: Math.round(amount * 100), // convert to smallest currency unit
      currency: currency,
      payment_method_types: ['card'],
      metadata: {
        bookingId,
        splitPayment: 'true',
        originatingPaymentMethod: paymentMethodId,
        bookingType: body?.bookingType || 'unknown'
      }
    }

    if (email) {
      paymentIntentParams.receipt_email = email
    }

    console.log('💳 Creating split payment PaymentIntent:', {
      amount: paymentIntentParams.amount,
      currency: paymentIntentParams.currency
    })

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    console.log('✅ Split payment PaymentIntent created:', paymentIntent.id)

    // Return JSON response
    return new Response(
      JSON.stringify({ 
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
    console.error('create-split-payment-intent error:', error);
    // Return error as JSON
    return new Response(
      JSON.stringify({ error: error.message }),
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
