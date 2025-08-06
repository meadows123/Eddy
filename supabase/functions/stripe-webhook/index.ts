import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(paymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(failedPayment)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Webhook processing failed', { status: 500 })
  }
})

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const requestId = paymentIntent.metadata?.requestId
  
  if (!requestId) {
    console.error('No requestId in payment intent metadata')
    return
  }

  // Update the split payment request
  const { error } = await supabase
    .from('split_payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_id: paymentIntent.id
    })
    .eq('id', requestId)

  if (error) {
    console.error('Error updating split payment request:', error)
    return
  }

  // Get the payment request details
  const { data: requestData } = await supabase
    .from('split_payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestData) {
    // Create notification for requester
    await supabase
      .from('payment_notifications')
      .insert([{
        user_id: requestData.requester_id,
        split_payment_id: requestId,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Your split payment request of ₦${requestData.amount.toLocaleString()} has been paid.`
      }])

    // Check if all payments for this booking are complete
    await checkAllPaymentsComplete(requestData.booking_id)
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const requestId = paymentIntent.metadata?.requestId
  
  if (!requestId) {
    console.error('No requestId in payment intent metadata')
    return
  }

  // Update the split payment request status
  const { error } = await supabase
    .from('split_payment_requests')
    .update({
      status: 'failed',
      stripe_payment_id: paymentIntent.id
    })
    .eq('id', requestId)

  if (error) {
    console.error('Error updating split payment request:', error)
  }
}

async function checkAllPaymentsComplete(bookingId: string) {
  const { data: requests } = await supabase
    .from('split_payment_requests')
    .select('status')
    .eq('booking_id', bookingId)
    
  const allPaid = requests?.every(req => req.status === 'paid')
  
  if (allPaid) {
    // Update booking status to confirmed
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
  }
} 