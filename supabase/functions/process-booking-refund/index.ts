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

serve(async (req) => {
  try {
    const { bookingId, reason = 'customer_cancellation' } = await req.json()
    
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    
    if (bookingError || !booking) {
      throw new Error('Booking not found')
    }
    
    // Check if booking is eligible for refund (24-hour policy)
    const now = new Date()
    const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`)
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    console.log('Refund eligibility check:', {
      bookingId,
      bookingDateTime: bookingDateTime.toISOString(),
      hoursUntilBooking,
      isEligible: hoursUntilBooking >= 24
    })
    
    if (hoursUntilBooking < 24) {
      throw new Error('Refund not available - less than 24 hours until booking')
    }
    
    // Process refund if there's a Stripe payment
    let refundResult = null
    if (booking.stripe_payment_id) {
      try {
        refundResult = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_id,
          reason: 'requested_by_customer',
          metadata: {
            booking_id: bookingId,
            reason: reason
          }
        })
        
        console.log('Stripe refund processed:', refundResult.id)
      } catch (stripeError) {
        console.error('Stripe refund failed:', stripeError)
        throw new Error(`Refund failed: ${stripeError.message}`)
      }
    }
    
    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        refund_status: refundResult ? 'refunded' : 'no_payment',
        refund_id: refundResult?.id || null,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', bookingId)
    
    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`)
    }
    
    return new Response(JSON.stringify({
      success: true,
      refunded: !!refundResult,
      refund_id: refundResult?.id,
      amount_refunded: refundResult?.amount || 0,
      hours_until_booking: hoursUntilBooking
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error) {
    console.error('Refund processing error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
