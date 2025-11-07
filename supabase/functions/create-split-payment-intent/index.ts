import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'stripe'

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
    const splitRequests = body?.splitRequests

    console.log('📥 create-split-payment-intent payload:', {
      amount,
      paymentMethodId,
      bookingId,
      splitRequestsCount: Array.isArray(splitRequests) ? splitRequests.length : 'n/a'
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
    const keySource = (testKey && testKey.length > 0) ? 'STRIPE_TEST_SECRET_KEY' : (liveKey && liveKey.length > 0 ? 'STRIPE_SECRET_KEY' : 'NONE')
    console.log(`Stripe mode: ${isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN'} (using ${keySource})`)
    console.log(`Key prefix: ${stripeKey.length > 0 ? stripeKey.substring(0, 7) : 'NONE'}`)

    if (!stripeKey) {
      throw new Error('Stripe secret key is not configured')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to kobo
      currency: 'ngn',
      payment_method_types: ['card'],
      metadata: {
        bookingId,
        splitPayment: 'true',
        originatingPaymentMethod: paymentMethodId,
        bookingType: body?.bookingType || 'unknown'
      }
    })

    // Return JSON response
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
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