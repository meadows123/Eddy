import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { stripe } from '../_shared/stripe.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, paymentMethodId, bookingId, splitRequests } = await req.json()

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'ngn',
      payment_method: paymentMethodId,
      metadata: {
        bookingId,
        splitPayment: 'true'
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