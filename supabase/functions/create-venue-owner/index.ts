import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { loadStripe } from 'https://esm.sh/@supabase/stripe@2.39.3'
import { Stripe } from 'https://esm.sh/@supabase/stripe@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize Supabase client with service_role key
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// ✅ GOOD - Using environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ✅ GOOD - Deno environment variables in Edge Functions  
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({ error: "Invalid content type" }), { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  try {
    console.log('Received request:', req.method)
    console.log('Request data:', body)

    const { to, subject, template, data } = body

    const client = new SmtpClient()

    console.log('Connecting to SMTP server...')
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    })
    console.log('Connected to SMTP server')

    let html = ''
    switch (template) {
      case 'venue-approved':
        html = `
          <h1>Your Venue Has Been Approved!</h1>
          <p>Dear ${data.ownerName},</p>
          <p>Great news! Your venue "${data.venueName}" has been approved and is now live on our platform.</p>
          <p>You can now:</p>
          <ul>
            <li>Access your venue dashboard</li>
            <li>Manage your tables and bookings</li>
            <li>Update your venue information</li>
          </ul>
          <p>Login to your account to get started: <a href="${Deno.env.get('APP_URL')}/venue-owner/login">Login Here</a></p>
          <p>Best regards,<br>The Eddy Team</p>
        `
        break

      case 'venue-rejected':
        html = `
          <h1>Venue Registration Update</h1>
          <p>Dear ${data.ownerName},</p>
          <p>We have reviewed your venue "${data.venueName}" and unfortunately, we cannot approve it at this time.</p>
          <p>Reason for rejection:</p>
          <p><em>${data.reason}</em></p>
          <p>You can update your venue information and submit it again for review.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The Eddy Team</p>
        `
        break

      case 'welcome':
        html = `
          <h1>Welcome to VIPClub!</h1>
          <p>Hi${data?.email ? `, ${data.email}` : ''}!</p>
          <p>Thank you for signing up. We're excited to have you join our community.</p>
          <p>Start exploring and booking your favorite venues today!</p>
          <p>Best regards,<br>The Eddy Team</p>
        `
        break

      case 'booking-confirmation':
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
              <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Your VIPClub experience awaits</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${data.customerName},</p>
              
              <p style="color: #333; line-height: 1.6;">Thank you for choosing VIPClub! Your booking has been confirmed and we're excited to welcome you.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B1538; margin-top: 0;">Booking Details</h2>
                <p><strong>Venue:</strong> ${data.venueName}</p>
                <p><strong>Booking Date:</strong> ${data.bookingDate}</p>
                <p><strong>Booking ID:</strong> #${data.bookingId}</p>
                ${data.ticketInfo ? `<p><strong>Ticket:</strong> ${data.ticketInfo}</p>` : ''}
                ${data.tableInfo ? `<p><strong>Table:</strong> ${data.tableInfo}</p>` : ''}
                <p><strong>Total Amount:</strong> ₦${data.totalAmount}</p>
              </div>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2e7d32; margin-top: 0;">What's Next?</h3>
                <ul style="color: #333; margin: 0; padding-left: 20px;">
                  <li>Arrive at the venue on your booking date</li>
                  <li>Show this email or your booking ID at the entrance</li>
                  <li>Present a valid ID for verification</li>
                  <li>Enjoy your VIP experience!</li>
                </ul>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
                <p style="margin: 0; color: #856404;"><strong>Important:</strong> Please save this email as your booking confirmation. You may be asked to present it at the venue.</p>
              </div>
              
              <p style="color: #333; line-height: 1.6;">If you have any questions or need to make changes to your booking, please contact our support team.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('APP_URL')}/profile" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">View My Bookings</a>
              </div>
              
              <p style="color: #333;">Thank you for choosing VIPClub!</p>
              <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
              <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `
        break

      case 'admin-venue-submitted':
        html = `
          <h1>New Venue Submission</h1>
          <p>A new venue <strong>"${data.venueName}"</strong> has been submitted and is pending approval.</p>
          <p>Submitted by: ${data.ownerName} (${data.ownerEmail})</p>
          <p>Please review and approve or reject the venue in the admin dashboard.</p>
          <p>Best regards,<br>The Eddy Team</p>
        `
        break

      case 'venue-owner-invitation':
        // Use Supabase's built-in inviteUserByEmail function to trigger "Confirm signup" template
        try {
          const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(data.email, {
            redirectTo: `${Deno.env.get('APP_URL')}/venue-owner/register`,
            data: {
              venue_name: data.venueName,
              contact_name: data.contactName,
              venue_type: data.venueType || 'Restaurant',
              approval_date: new Date().toISOString(),
              message: `Your venue application for ${data.venueName} has been approved! Please complete your registration to access your venue dashboard.`
            }
          });

          if (inviteError) {
            throw new Error(`Failed to send invitation: ${inviteError.message}`);
          }

          console.log('Supabase invitation email sent successfully:', inviteData);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Invitation email sent via Supabase Confirm signup template',
              data: inviteData 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        } catch (inviteError) {
          console.error('Error sending Supabase invitation:', inviteError);
          throw new Error(`Failed to send Supabase invitation: ${inviteError.message}`);
        }

      case 'admin-venue-owner-registration':
        html = `
          <h1>New Venue Owner Registration</h1>
          <p><strong>Name:</strong> ${data.ownerName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
          <p><strong>Type:</strong> ${data.venueType || 'Not specified'}</p>
          <p><strong>Address:</strong> ${data.venueAddress || ''}, ${data.venueCity || ''}</p>
          ${data.adminUrl ? `<p><a href="${data.adminUrl}">Review in Admin</a></p>` : ''}
        `
        break

      default:
        throw new Error('Invalid template')
    }

    console.log('Sending email...')
    await client.send({
      from: Deno.env.get('SMTP_FROM') || '',
      to: to,
      subject: subject,
      content: html,
      html: html,
    })
    console.log('Email sent successfully')

    await client.close()

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 

/**
 * Sends an admin notification email after a new venue is submitted.
 * @param {Object} newVenue - The new venue object (must have a 'name' property)
 * @param {Object} userProfile - The user profile object (must have 'first_name' and 'last_name')
 * @param {Object} user - The user object (must have 'email')
 */
export async function notifyAdminOfVenueSubmission(newVenue, userProfile, user) {
  const EDGE_FUNCTION_URL = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co')}/send-email`;
  const ADMIN_EMAIL = "sales@oneeddy.com"; // Change to your admin email

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ADMIN_EMAIL,
        subject: "New Venue Submission Pending Approval",
        template: "admin-venue-submitted",
        data: {
          venueName: newVenue.name,
          ownerName: `${userProfile.first_name} ${userProfile.last_name}`,
          ownerEmail: user.email
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send admin notification email.");
    }
    // Optionally, show a toast or log success
    console.log("Admin notification email sent!");
  } catch (err) {
    // Optionally, show a toast or log error
    console.error("Error sending admin notification:", err.message);
  }
} 