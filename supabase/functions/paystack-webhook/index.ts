import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from "https://deno.land/std@0.208.0/crypto/mod.ts"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const webhookSecret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') ?? ''

// Verify Paystack webhook signature
async function verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
  if (!webhookSecret) {
    console.error('❌ PAYSTACK_WEBHOOK_SECRET not configured')
    return false
  }

  const hash = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(body)
  )

  const computed = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === signature
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const body = await req.text()

    if (!signature) {
      console.error('❌ No Paystack signature found')
      return new Response('No signature', { status: 400 })
    }

    // Verify signature
    const isValid = await verifyWebhookSignature(body, signature)
    if (!isValid) {
      console.error('❌ Invalid Paystack webhook signature')
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(body)
    console.log('📨 Paystack webhook event:', event.event)

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break

      case 'charge.failed':
        await handleChargeFailed(event.data)
        break

      default:
        console.log(`⚠️ Unhandled Paystack event: ${event.event}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('❌ Error processing Paystack webhook:', error)
    return new Response('Webhook processing failed', { status: 500 })
  }
})

async function handleChargeSuccess(data: any) {
  try {
    const { reference, metadata, amount } = data

    console.log('✅ Processing Paystack charge.success:', reference)

    // Extract booking info from metadata
    const bookingId = metadata?.bookingId
    const bookingType = metadata?.bookingType
    const requestId = metadata?.requestId // For split payments

    if (!bookingId) {
      console.error('❌ No bookingId in Paystack metadata')
      return
    }

    // Handle split payment requests
    if (requestId) {
      console.log('📦 Processing split payment request:', requestId)

      const { error: updateError } = await supabase
        .from('split_payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paystack_reference: reference
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('❌ Error updating split payment request:', updateError)
        return
      }

      // Check if all payments for this booking are complete
      await checkAllSplitPaymentsComplete(bookingId)
    } else {
      // Handle regular booking payment
      console.log('💳 Processing booking payment:', bookingId)

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          paystack_reference: reference,
          paid_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('❌ Error updating booking:', updateError)
        return
      }

      // Send confirmation emails for regular booking
      await sendBookingConfirmationEmails(bookingId)
    }
  } catch (error) {
    console.error('❌ Error handling Paystack charge success:', error)
  }
}

async function handleChargeFailed(data: any) {
  try {
    const { reference, metadata } = data

    console.log('❌ Processing Paystack charge.failed:', reference)

    const bookingId = metadata?.bookingId
    const requestId = metadata?.requestId

    if (requestId) {
      // Update split payment request as failed
      await supabase
        .from('split_payment_requests')
        .update({
          status: 'failed',
          paystack_reference: reference
        })
        .eq('id', requestId)
    } else if (bookingId) {
      // Update booking as failed
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          paystack_reference: reference
        })
        .eq('id', bookingId)
    }
  } catch (error) {
    console.error('❌ Error handling Paystack charge failed:', error)
  }
}

async function checkAllSplitPaymentsComplete(bookingId: string) {
  try {
    console.log('🔍 Checking if all split payments are complete for booking:', bookingId)

    const { data: requests } = await supabase
      .from('split_payment_requests')
      .select('status')
      .eq('booking_id', bookingId)

    const allPaid = requests?.every(req => req.status === 'paid')

    if (allPaid && requests && requests.length > 0) {
      console.log('✅ All split payments complete, marking booking as confirmed')

      // Update booking status to confirmed
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', bookingId)

      // Send completion emails
      await sendBookingConfirmationEmails(bookingId)
    }
  } catch (error) {
    console.error('❌ Error checking split payments:', error)
  }
}

async function sendBookingConfirmationEmails(bookingId: string) {
  try {
    console.log('📧 Sending booking confirmation emails for:', bookingId)

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Error fetching booking details:', bookingError)
      return
    }

    console.log('✅ Booking fetched:', { bookingId, venue_id: booking.venue_id, user_id: booking.user_id })

    // Get venue details
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', booking.venue_id)
      .single()

    if (venueError || !venue) {
      console.error('❌ Error fetching venue details:', venueError)
      return
    }

    // Get customer profile
    const { data: customer, error: customerError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', booking.user_id)
      .single()

    if (customerError || !customer) {
      console.error('❌ Error fetching customer details:', customerError)
      return
    }

    console.log('✅ All booking data fetched successfully')

    // Format dates and times
    const bookingDateFormatted = booking.booking_date
      ? new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A'

    const startTimeFormatted = booking.start_time
      ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'N/A'

    const endTimeFormatted = booking.end_time
      ? new Date(`2000-01-01T${booking.end_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : '23:00'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Send customer confirmation email
    console.log('📧 Sending customer confirmation email to:', customer.email)
    try {
      const customerResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to: customer.email,
          subject: `Booking Confirmed! - ${venue.name || 'Your Venue'}`,
          template: 'booking-confirmation',
          data: {
            email: customer.email,
            customerName: customer.full_name || customer.name || 'Guest',
            bookingId: booking.id,
            bookingDate: bookingDateFormatted,
            bookingTime: startTimeFormatted,
            endTime: endTimeFormatted,
            guestCount: booking.number_of_guests || 1,
            totalAmount: booking.total_amount,
            venueName: venue.name,
            venueAddress: venue.address,
            venuePhone: venue.contact_phone,
            specialRequests: booking.special_requests || 'None specified'
          }
        }),
      })

      if (customerResponse.ok) {
        console.log('✅ Customer confirmation email sent successfully')
      } else {
        const error = await customerResponse.json()
        console.error('❌ Error sending customer confirmation email:', error)
      }
    } catch (error) {
      console.error('❌ Error in customer email request:', error)
    }

    // Send venue owner notification email
    console.log('📧 Sending venue owner notification email')
    const venueOwnerEmail = venue.contact_email || 'info@oneeddy.com'
    console.log('📧 Venue owner email:', venueOwnerEmail)
    try {
      const venueResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to: venueOwnerEmail,
          subject: `New Booking - ${venue.name}`,
          template: 'venue-owner-booking-notification',
          data: {
            ownerEmail: venueOwnerEmail,
            venueId: venue.id,
            venueName: venue.name || 'Venue',
            bookingId: booking.id,
            bookingDate: bookingDateFormatted,
            bookingTime: startTimeFormatted,
            endTime: endTimeFormatted,
            guestCount: booking.number_of_guests || 1,
            totalAmount: booking.total_amount,
            customerName: customer.full_name || customer.name || 'Guest',
            customerEmail: customer.email || 'guest@example.com',
            customerPhone: customer.phone || 'N/A',
            specialRequests: booking.special_requests || 'None specified',
            ownerUrl: `https://www.oneeddy.com/venue-owner/dashboard`,
            venueOwnerName: 'Venue Manager'
          }
        }),
      })

      if (venueResponse.ok) {
        console.log('✅ Venue owner notification email sent successfully')
      } else {
        const error = await venueResponse.json()
        console.error('❌ Error sending venue owner notification email:', error)
      }
    } catch (error) {
      console.error('❌ Error in venue owner email request:', error)
    }

    console.log('✅ All confirmation emails sent successfully')
  } catch (error) {
    console.error('❌ Error sending confirmation emails:', error)
  }
}

