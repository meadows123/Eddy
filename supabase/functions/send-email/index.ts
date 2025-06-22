import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received request:', req.method)
    const { to, subject, template, data } = await req.json()
    console.log('Request data:', { to, subject, template, data })

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

      case 'admin-venue-submitted':
        html = `
          <h1>New Venue Submission</h1>
          <p>A new venue <strong>"${data.venueName}"</strong> has been submitted and is pending approval.</p>
          <p>Submitted by: ${data.ownerName} (${data.ownerEmail})</p>
          <p>Please review and approve or reject the venue in the admin dashboard.</p>
          <p>Best regards,<br>The Eddy Team</p>
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
  const EDGE_FUNCTION_URL = "https://agydpkzfucicraedllgl.supabase.co/functions/v1/send-email"; // Replace with your actual project ID
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