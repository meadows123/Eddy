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
  // Add CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    // Better JSON parsing with error handling
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('Raw request body:', bodyText)
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Empty request body')
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 400,
      })
    }
    
    const { bookingId, reason = 'customer_cancellation' } = requestBody
    
    if (!bookingId) {
      throw new Error('bookingId is required')
    }
    
    console.log('Processing refund for booking:', bookingId)
    
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    
    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError)
      throw new Error('Booking not found')
    }
    
    console.log('Found booking:', {
      id: booking.id,
      status: booking.status,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      stripe_payment_id: booking.stripe_payment_id
    })
    
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
        console.log('Processing Stripe refund for payment:', booking.stripe_payment_id)
        
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
    } else {
      console.log('No Stripe payment ID found, skipping refund processing')
    }
    
    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        refund_status: refundResult ? 'refunded' : 'no_payment',
        refund_id: refundResult?.id || null,
        refund_amount: refundResult ? refundResult.amount / 100 : null, // Convert from cents
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', bookingId)
    
    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Failed to update booking: ${updateError.message}`)
    }
    
    console.log('Booking updated successfully')
    
    // Send cancellation emails
    try {
      console.log('Sending cancellation emails...')
      
      // Get user and venue data for emails
      const { data: userData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', booking.user_id)
        .single()
      
      const { data: venueData } = await supabase
        .from('venues')
        .select('name, contact_email, address, city, contact_phone')
        .eq('id', booking.venue_id)
        .single()
      
      // Send customer cancellation email
      if (userData?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: userData.email,
            subject: `Booking Cancelled - ${venueData?.name || 'Your Venue'}`,
            template: 'booking-cancellation-customer',
            data: {
              customerName: `${userData.first_name} ${userData.last_name}`.trim() || 'Valued Customer',
              venueName: venueData?.name || 'Venue',
              venueAddress: venueData?.address || 'Lagos',
              venueCity: venueData?.city || 'Lagos',
              bookingId: booking.id,
              bookingDate: booking.booking_date,
              bookingTime: booking.start_time,
              guestCount: booking.number_of_guests,
              totalAmount: booking.total_amount,
              refundAmount: refundResult ? (refundResult.amount / 100) : 0,
              isRefunded: !!refundResult,
              hoursUntilBooking: Math.round(hoursUntilBooking)
            }
          }
        })
        console.log('Customer cancellation email sent')
      }
      
      // Send venue owner notification email
      console.log('Venue data for email:', {
        contact_email: venueData?.contact_email,
        name: venueData?.name,
        hasContactEmail: !!venueData?.contact_email
      })

      if (venueData?.contact_email) {
        console.log('Sending venue owner email to:', venueData.contact_email)
        
        const venueEmailResult = await supabase.functions.invoke('send-email', {
          body: {
            to: venueData.contact_email,
            subject: `Booking Cancellation - ${venueData?.name || 'Your Venue'}`,
            template: 'booking-cancellation-venue',
            data: {
              venueName: venueData?.name || 'Your Venue',
              customerName: `${userData?.first_name} ${userData?.last_name}`.trim() || 'Customer',
              bookingId: booking.id,
              bookingDate: booking.booking_date,
              bookingTime: booking.start_time,
              guestCount: booking.number_of_guests,
              totalAmount: booking.total_amount,
              refundAmount: refundResult ? (refundResult.amount / 100) : 0,
              isRefunded: !!refundResult,
              hoursUntilBooking: Math.round(hoursUntilBooking)
            }
          }
        })
        
        console.log('Venue owner email result:', venueEmailResult)
        console.log('Venue owner cancellation email sent successfully')
      } else {
        console.log('No venue contact_email found, trying to find venue owner email...')
        
        // Fallback: Try to find venue owner's email from the venues table owner_id
        const { data: ownerData } = await supabase
          .from('venues')
          .select(`
            owner_id,
            profiles!venues_owner_id_fkey (
              email,
              first_name,
              last_name
            )
          `)
          .eq('id', booking.venue_id)
          .single()
        
        console.log('Owner data found:', ownerData)
        
        if (ownerData?.profiles?.email) {
          console.log('Sending venue owner email to owner:', ownerData.profiles.email)
          
          await supabase.functions.invoke('send-email', {
            body: {
              to: ownerData.profiles.email,
              subject: `Booking Cancellation - ${venueData?.name || 'Your Venue'}`,
              template: 'booking-cancellation-venue',
              data: {
                venueName: venueData?.name || 'Your Venue',
                customerName: `${userData?.first_name} ${userData?.last_name}`.trim() || 'Customer',
                bookingId: booking.id,
                bookingDate: booking.booking_date,
                bookingTime: booking.start_time,
                guestCount: booking.number_of_guests,
                totalAmount: booking.total_amount,
                refundAmount: refundResult ? (refundResult.amount / 100) : 0,
                isRefunded: !!refundResult,
                hoursUntilBooking: Math.round(hoursUntilBooking)
              }
            }
          })
          console.log('Venue owner email sent to owner profile')
        } else {
          console.log('No venue owner email found - venue may not have contact info set')
        }
      }
      
    } catch (emailError) {
      console.error('Failed to send cancellation emails:', emailError)
      // Don't fail the whole process if email fails
    }
    
    return new Response(JSON.stringify({
      success: true,
      refunded: !!refundResult,
      refund_id: refundResult?.id,
      amount_refunded: refundResult?.amount || 0,
      hours_until_booking: hoursUntilBooking
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 200,
    })
    
  } catch (error) {
    console.error('Refund processing error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process refund'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 400,
    })
  }
})
