import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

    let { to, subject, template, data } = body

    // Validate required fields
    if (!to || !subject || !template) {
      throw new Error(`Missing required fields. Required: to, subject, template. Received: ${JSON.stringify({ to: !!to, subject: !!subject, template: !!template })}`);
    }

    // Validate SendGrid API configuration
    const sendgridApiKey = Deno.env.get('SMTP_PASSWORD') || Deno.env.get('SENDGRID_API_KEY') || '';
    const smtpFrom = Deno.env.get('SMTP_FROM') || '';

    if (!sendgridApiKey || !smtpFrom) {
      throw new Error(`SendGrid configuration incomplete. Missing: ${!sendgridApiKey ? 'SMTP_PASSWORD or SENDGRID_API_KEY ' : ''}${!smtpFrom ? 'SMTP_FROM' : ''}`);
    }

    // Ensure data is an object
    if (!data || typeof data !== 'object') {
      data = {};
    }

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
          <p>Login to your account to get started: <a href="https://oneeddy.com/venue-owner/login">Login Here</a></p>
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF5E6;">
            <div style="background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #FFF5E6; margin: 0; font-size: 28px; font-weight: bold;">Booking Confirmed!</h1>
              <p style="color: #FFF5E6; margin: 10px 0 0 0; font-size: 16px;">Your VIPClub experience awaits</p>
            </div>
            
            <div style="background: #FFF5E6; padding: 30px; border: 2px solid #800020; border-top: none;">
              <p style="font-size: 18px; color: #800020; margin-bottom: 20px; font-weight: bold;">Dear ${data.customerName},</p>
              
              <p style="color: #800020; line-height: 1.6; font-size: 16px;">Thank you for choosing VIPClub! Your booking has been confirmed and we're excited to welcome you.</p>
              
              <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #800020; margin-top: 0; font-size: 20px; font-weight: bold;">Booking Details</h2>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Venue:</strong> ${data.venueName}</p>
                ${data.venueAddress ? `<p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Address:</strong> ${data.venueAddress}</p>` : ''}
                ${data.venuePhone ? `<p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Contact:</strong> ${data.venuePhone}</p>` : ''}
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Booking Date:</strong> ${data.bookingDate}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Booking ID:</strong> #${data.bookingId}</p>
                ${data.ticketInfo ? `<p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Ticket:</strong> ${data.ticketInfo}</p>` : ''}
                ${data.tableInfo ? `<p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Table:</strong> ${data.tableInfo}</p>` : ''}
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Total Amount:</strong> ₦${data.totalAmount}</p>
              </div>

              ${data.qrCodeImage ? `
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: rgba(255,215,0,0.1); border: 2px solid #FFD700; padding: 16px; border-radius: 12px;">
                  <p style="color: #800020; font-size: 16px; font-weight: bold; margin-bottom: 12px;">Your Entry QR Code</p>
                  <img src="${data.qrCodeImage}" alt="Booking QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto;" />
                  <p style="color: #800020; font-size: 13px; margin-top: 12px;">Present this QR code at the venue entrance for swift access.</p>
                </div>
              </div>
              ` : ''}
              
              <div style="background: rgba(255, 215, 0, 0.15); border: 2px solid #FFD700; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #800020; margin-top: 0; font-size: 18px; font-weight: bold;">What's Next?</h3>
                <ul style="color: #800020; margin: 0; padding-left: 20px; font-size: 15px;">
                  <li>Arrive at the venue on your booking date</li>
                  <li>Show this email or your booking ID at the entrance</li>
                  <li>Present a valid ID for verification</li>
                  <li>Enjoy your VIP experience!</li>
                </ul>
              </div>
              
              <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD700;">
                <p style="margin: 0; color: #800020; font-size: 15px; font-weight: bold;"><strong>Important:</strong> Please save this email as your booking confirmation. You may be asked to present it at the venue.</p>
              </div>
              
              <p style="color: #800020; line-height: 1.6; font-size: 16px;">If you have any questions or need to make changes to your booking, please contact our support team.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://oneeddy.com/profile" style="background: #FFD700; color: #800020; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; border: 2px solid #800020;">View My Bookings</a>
              </div>
              
              <p style="color: #800020; font-size: 16px; font-weight: bold;">Thank you for choosing VIPClub!</p>
              <p style="color: #800020; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
            </div>
            
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #800020; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: none;">
              <p style="color: #800020; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
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

      case 'admin-venue-owner-registration':
        to = data.adminEmail || 'info@oneeddy.com'
        subject = 'New Venue Owner Registration - Action Required'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF5E6;">
            <div style="background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #FFF5E6; margin: 0; font-size: 28px; font-weight: bold;">New Venue Owner Registration</h1>
              <p style="color: #FFF5E6; margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
            </div>
            
            <div style="background: #FFF5E6; padding: 30px; border: 2px solid #800020; border-top: none;">
              <p style="font-size: 18px; color: #800020; margin-bottom: 20px; font-weight: bold;">A new venue owner has completed their registration:</p>
              
              <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #800020; margin-top: 0; font-size: 20px; font-weight: bold;">Venue Owner Details</h3>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Name:</strong> ${data.ownerName}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Email:</strong> ${data.email}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Phone:</strong> ${data.phone || 'Not provided'}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Venue:</strong> ${data.venueName}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Venue Type:</strong> ${data.venueType || 'Not specified'}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Address:</strong> ${data.venueAddress}</p>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">City:</strong> ${data.venueCity}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.adminUrl || 'https://oneeddy.com/admin/venue-approvals'}" style="background: #FFD700; color: #800020; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; border: 2px solid #800020;">Review Registration</a>
              </div>
              
              <p style="color: #800020; line-height: 1.6; font-size: 16px;">Please review this registration in the admin dashboard and approve or reject the venue owner.</p>
              
              <p style="color: #800020; font-size: 14px;">Best regards,<br>The Eddy Team</p>
            </div>
            
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #800020; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: none;">
              <p style="color: #800020; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `
        break

      case 'venue-owner-application-approved':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Venue Application Approved - Eddys Members</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1); }
        .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 40px 30px; text-align: center; position: relative; }
        .logo { position: relative; z-index: 2; }
        .logo-image { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3); border: 3px solid #FFD700; }
        .brand-name { color: #FFF5E6; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .tagline { color: #FFF5E6; font-size: 14px; opacity: 0.9; margin-top: 8px; font-weight: 300; letter-spacing: 1px; }
        .content { padding: 50px 40px; background-color: #ffffff; }
        .welcome-title { color: #800020; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .welcome-text { color: #555; font-size: 16px; line-height: 1.8; margin-bottom: 30px; text-align: center; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3); transition: all 0.3s ease; }
        .venue-details { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .venue-details h3 { color: #2e7d32; margin-top: 0; }
        .next-steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-steps h3 { color: #8B1538; margin-top: 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <img src="https://oneeddy.com/logo.png" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">Eddys Members</h1>
                <p class="tagline">Exclusive Venue Bookings</p>
            </div>
        </div>
        
        <div class="content">
            <h2 class="welcome-title">🎉 Venue Application Approved!</h2>
            <p class="welcome-text">
                Dear ${data.contactName || data.ownerName},<br><br>
                Congratulations! Your venue application for <strong>${data.venueName}</strong> has been approved by our team.
            </p>
            
            <div class="venue-details">
                <h3>🏢 Venue Details</h3>
                <p><strong>Venue Name:</strong> ${data.venueName}</p>
                <p><strong>Venue Type:</strong> ${data.venueType || 'Restaurant'}</p>
                <p><strong>Address:</strong> ${data.venueAddress}</p>
                <p><strong>City:</strong> ${data.venueCity}</p>
            </div>
            
            <div class="next-steps">
                <h3>🚀 Next Steps</h3>
                <p>To access your venue dashboard and start managing your bookings:</p>
                <ol>
                    <li>Click the "Access Your Dashboard" button below</li>
                    <li>Log in with your email and password</li>
                    <li>Complete your venue profile setup</li>
                    <li>Start managing your bookings and reservations!</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.registrationUrl || `https://oneeddy.com/venue-owner/login?approved=true&email=${encodeURIComponent(data.email)}`}" class="cta-button">
                    Access Your Dashboard
                </a>
            </div>
            
            <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD700;">
                <p style="margin: 0; color: #800020; font-weight: bold;"><strong>Important:</strong> This link will take you directly to your venue dashboard. If you haven't set up your password yet, you'll be prompted to do so on first login.</p>
            </div>
            
            <p style="color: #800020; font-size: 16px;">If you have any questions, please contact our support team.</p>
            <p style="color: #800020; font-size: 14px;">Best regards,<br>The Eddys Members Team</p>
        </div>
        
        <div class="footer">
            <p style="color: #800020; font-size: 12px; margin: 0;">&copy; 2025 Eddys Members. All rights reserved. Built in memory of Eddy.</p>
        </div>
    </div>
</body>
</html>`
        break

      case 'venue-owner-invitation':
        // Use Supabase's built-in inviteUserByEmail function to trigger "Confirm signup" template
        try {
          const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(data.email, {
            redirectTo: `https://oneeddy.com/venue-owner/register`,
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
        break

      case 'referral-invitation':
        html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Join Eddy - Special Invitation</title></head>
<body style="margin:0;padding:0;background:#FFF5E6;font-family:Arial,sans-serif;color:#800020">
  <div style="max-width:600px;margin:0 auto;background:#FFF5E6;box-shadow:0 10px 30px rgba(128,0,32,0.08);border:2px solid #800020">
    <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
      <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">SPECIAL INVITATION</div>
    </div>
    <div style="padding:40px 32px;background:#FFF5E6">
      <h2 style="color:#800020;text-align:center;margin:0 0 14px 0;font-weight:bold">You're Invited to Join Eddy!</h2>
      <p style="text-align:center;color:#800020;margin:0 0 24px 0;font-size:16px;font-weight:bold">Hi there! ${data.senderName} thinks you'd love being part of Eddy.</p>
      <div style="background:rgba(255,215,0,0.1);border:2px solid #FFD700;border-radius:14px;padding:24px;margin:18px 0">
        <div style="color:#800020;font-weight:700;font-size:14px;margin-bottom:12px;text-transform:uppercase">Personal Message</div>
        <div style="color:#800020;font-style:italic;font-size:16px;line-height:1.5;font-weight:bold">"${data.personalMessage || 'Join me on Eddy and discover the best venues in town!'}"</div>
      </div>
      <div style="background:rgba(255,215,0,0.15);border:2px solid #FFD700;padding:20px;border-radius:10px;margin:24px 0">
        <h3 style="color:#800020;font-size:18px;margin:0 0 12px 0;font-weight:bold">Your Special Referral Code</h3>
        <div style="background:#800020;color:#FFD700;font-size:24px;font-weight:bold;text-align:center;padding:12px;border-radius:6px;letter-spacing:2px;border:2px solid #FFD700">${data.referralCode}</div>
        <p style="color:#800020;font-size:14px;text-align:center;margin:12px 0 0 0;font-weight:bold">Use this code when signing up to receive special benefits!</p>
      </div>
      <div style="text-align:center;margin-top:32px">
        <a href="${data.signupUrl}" style="display:inline-block;background:#FFD700;color:#800020;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:16px;border:2px solid #800020">Join Eddy Now</a>
      </div>
    </div>
    <div style="background:rgba(255,215,0,0.1);border:2px solid #800020;padding:24px;text-align:center;border-top:2px solid #800020">
      <p style="color:#800020;font-size:12px;margin:0">This invitation was sent to you by ${data.senderName} via Eddy.<br>If you don't want to receive these emails, you can ignore this message.</p>
    </div>
  </div>
</body>
</html>`
        break

      case 'credit-purchase-confirmation':
        html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Credit Purchase Confirmation</title></head>
<body style="margin:0;padding:0;background:#FFF5E6;font-family:Arial,sans-serif;color:#800020">
  <div style="max-width:600px;margin:0 auto;background:#FFF5E6;box-shadow:0 10px 30px rgba(128,0,32,0.08);border:2px solid #800020">
    <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
      <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">CREDIT PURCHASE CONFIRMATION</div>
    </div>
    <div style="padding:40px 32px;background:#FFF5E6">
      <h2 style="color:#800020;text-align:center;margin:0 0 14px 0;font-weight:bold">Credit Purchase Successful!</h2>
      <p style="text-align:center;color:#800020;margin:0 0 24px 0;font-size:16px;font-weight:bold">Hi ${data.customerName || 'there'}, your credit purchase has been confirmed.</p>
      <div style="background:rgba(255,215,0,0.1);border:2px solid #FFD700;border-radius:14px;padding:24px;margin:18px 0">
        <div style="color:#800020;font-weight:700;font-size:14px;margin-bottom:12px;text-transform:uppercase">Purchase Details</div>
        <div style="display:grid;grid-template-columns:1fr;gap:14px">
          <div style="background:rgba(255,215,0,0.15);border:1px solid #FFD700;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
            <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Amount</div>
            <div style="color:#800020;font-size:16px;font-weight:bold">₦${data.amount.toLocaleString()}</div>
          </div>
          <div style="background:rgba(255,215,0,0.15);border:1px solid #FFD700;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
            <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Venue</div>
            <div style="color:#800020;font-size:16px;font-weight:bold">${data.venueName}</div>
          </div>
          <div style="background:rgba(255,215,0,0.15);border:1px solid #FFD700;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
            <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Transaction Date</div>
            <div style="color:#800020;font-size:13px;font-weight:bold">${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      ${data.qrCodeImage ? `
      <div style="text-align:center;margin-top:28px">
        <div style="display:inline-block;background:rgba(255,215,0,0.1);border:2px solid #FFD700;padding:18px 20px;border-radius:14px;">
          <div style="color:#800020;font-size:16px;font-weight:700;margin-bottom:12px">Your Member QR Code</div>
          <img src="${data.qrCodeImage}" alt="Member QR Code" style="width:200px;height:200px;display:block;margin:0 auto;border-radius:12px;border:2px solid #800020;">
          <p style="color:#800020;font-size:13px;margin-top:12px;font-weight:bold">Present this QR code at the venue to access your member benefits.</p>
        </div>
      </div>
      ` : ''}
      <div style="text-align:center;margin-top:32px">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#FFD700;color:#800020;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;border:2px solid #800020">View Your Credits</a>
      </div>
      <p style="text-align:center;color:#800020;margin-top:32px;font-size:13px;font-weight:bold">Thank you for choosing Eddy. Your credits are now available in your account.</p>
    </div>
    <div style="background:rgba(255,215,0,0.1);border:2px solid #800020;padding:24px;text-align:center;border-top:2px solid #800020">
      <p style="color:#800020;font-size:12px;margin:0">If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>`
        break

      case 'split-payment-initiation':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Split Payment Initiated</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #FFF5E6; color: #800020; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #FFF5E6; box-shadow: 0 10px 30px rgba(128,0,32,0.08); border: 2px solid #800020; }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; position: relative; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; background: #FFF5E6; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .payment-card { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: rgba(255, 215, 0, 0.15); border: 1px solid #FFD700; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #800020; font-size: 14px; font-weight: bold; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; background: #FFD700; color: #800020; border: 2px solid #800020; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
      <div class="brand">EDDYS MEMBERS</div>
    </div>
    <div class="content">
      <h2 class="title">Split Payment Initiated! 🎉</h2>
      <div class="payment-card">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Your Payment</div>
            <div class="detail-value">₦${Number(data.initiatorAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${Number(data.totalAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${data.bookingDate || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.bookingTime || 'N/A'}</div>
          </div>
        </div>
        <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Split Payment Requests Sent</div>
          <div style="color: #800020; font-size: 14px; font-weight: bold;">${data.requestsCount || 0} payment requests have been sent to your friends.</div>
        </div>
      </div>
    ${data.qrCodeImage ? `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 18px 20px;">
        <div style="color: #800020; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Your Booking QR Code</div>
        <img src="${data.qrCodeImage}" alt="Booking QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 12px; border: 2px solid #800020;">
        <p style="color: #800020; font-size: 13px; margin-top: 12px; font-weight: bold;">Show this QR code at the venue to access your booking.</p>
      </div>
    </div>
    ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn">📊 View Booking Details</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'split-payment-request':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Split Payment Request</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #FFF5E6; color: #800020; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #FFF5E6; box-shadow: 0 10px 30px rgba(128,0,32,0.08); border: 2px solid #800020; }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; background: #FFF5E6; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .request-card { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: rgba(255, 215, 0, 0.15); border: 1px solid #FFD700; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #800020; font-size: 14px; font-weight: bold; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; background: #FFD700; color: #800020; border: 2px solid #800020; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
      <div class="brand">EDDYS MEMBERS</div>
    </div>
    <div class="content">
      <h2 class="title">Split Payment Request! 💸</h2>
      <div class="request-card">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Your Share</div>
            <div class="detail-value">₦${Number(data.amount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${Number(data.totalAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${data.bookingDate || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.bookingTime || 'N/A'}</div>
          </div>
        </div>
        <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Payment Request</div>
          <div style="color: #800020; font-size: 14px; font-weight: bold;"><strong>${data.initiatorName || 'Your friend'}</strong> has requested you to pay <strong>₦${Number(data.amount || 0).toLocaleString()}</strong> for this booking.</div>
        </div>
      </div>
      ${data.qrCodeImage ? `
      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 18px 20px;">
          <div style="color: #800020; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Booking QR Code</div>
          <img src="${data.qrCodeImage}" alt="Booking QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 12px; border: 2px solid #800020;">
          <p style="color: #800020; font-size: 13px; margin-top: 12px; font-weight: bold;">You can present this QR code at the venue once your payment is confirmed.</p>
        </div>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.paymentUrl || (Deno.env.get('APP_URL') || '') + '/split-payment/' + (data.requestId || '')}" class="btn">💳 Pay Your Share</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'split-payment-complete':
        console.log('📱 Processing split-payment-complete template');
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Booking Confirmed!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #FFF5E6; color: #800020; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #FFF5E6; box-shadow: 0 10px 30px rgba(128,0,32,0.08); border: 2px solid #800020; }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; background: #FFF5E6; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .booking-card { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: rgba(255, 215, 0, 0.15); border: 1px solid #FFD700; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #800020; font-size: 14px; font-weight: bold; }
    .qr-section { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; }
    .qr-image { width: 200px; height: 200px; display: block; margin: 0 auto; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; background: #FFD700; color: #800020; border: 2px solid #800020; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
      <div class="brand">EDDYS MEMBERS</div>
    </div>
    <div class="content">
      <h2 class="title">Booking Confirmed! 🎉</h2>
      <div class="booking-card">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Your Payment</div>
            <div class="detail-value">₦${(data.initiatorAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${(data.totalAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${data.bookingDate || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.bookingTime || 'N/A'}</div>
          </div>
        </div>
        <div style="background: rgba(0, 128, 0, 0.1); border: 2px solid #00AA00; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #00AA00; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Booking Status: Fully Confirmed</div>
          <div style="color: #800020; font-size: 14px; font-weight: bold;">All split payments have been completed successfully!</div>
        </div>
      </div>
      ${data.qrCodeImage ? `
      <div class="qr-section">
        <h4 style="color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 20px;">📱 Your Entry QR Code</h4>
        <img src="${data.qrCodeImage}" alt="Venue Entry QR Code" class="qr-image">
        <p style="color: #800020; font-size: 14px; margin-top: 15px; font-weight: bold;"><strong>Present this QR code at the venue for entry verification.</strong></p>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn">📊 View Booking Details</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'split-payment-confirmation':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Split Payment Confirmed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(128,0,32,0.08); }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .payment-card { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
      <div class="brand">EDDYS MEMBERS</div>
    </div>
    <div class="content">
      <h2 class="title">Payment Confirmed! ✅</h2>
      <div class="payment-card">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Your Payment</div>
            <div class="detail-value">₦${(data.paymentAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${(data.totalAmount || 0).toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${data.bookingDate || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.bookingTime || 'N/A'}</div>
          </div>
        </div>
        <div style="background: rgba(255, 165, 0, 0.1); border: 2px solid #FF8C00; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #FF8C00; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Payment Status: Confirmed</div>
          <div style="color: #800020; font-size: 14px; font-weight: bold;">Your payment has been successfully processed. The booking will be fully confirmed once all split payments are completed.</div>
        </div>
      </div>
    ${data.qrCodeImage ? `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 18px 20px;">
        <div style="color: #800020; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Your Booking QR Code</div>
        <img src="${data.qrCodeImage}" alt="Booking QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 12px; border: 2px solid #800020;">
        <p style="color: #800020; font-size: 13px; margin-top: 12px; font-weight: bold;">Present this QR code at the venue when you arrive.</p>
      </div>
    </div>
    ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn">📊 View Booking Details</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'venue-owner-booking-notification': {
        const placeholderEmail = 'info@oneeddy.com';
        let ownerEmail = data.ownerEmail;
        const venueId = data.venueId || data.venue_id;

        if (!ownerEmail || ownerEmail.toLowerCase() === placeholderEmail) {
          if (venueId) {
            const { data: venueRow, error: venueFetchError } = await supabaseClient
              .from('venues')
              .select(`
                contact_email,
                contact_name,
                venue_owners!inner(owner_email, owner_name, email)
              `)
              .eq('id', venueId)
              .maybeSingle();

            if (!venueFetchError && venueRow) {
              const ownerRecord = Array.isArray(venueRow.venue_owners) ? venueRow.venue_owners[0] : venueRow.venue_owners;
              ownerEmail = ownerRecord?.owner_email || ownerRecord?.email || venueRow.contact_email;
              data.venueOwnerName = data.venueOwnerName || ownerRecord?.owner_name || venueRow.contact_name;
              data.venueEmail = data.venueEmail || venueRow.contact_email || ownerEmail;
            }
          }
        }

        if (!ownerEmail || ownerEmail.toLowerCase() === placeholderEmail) {
          throw new Error('No venue owner email available for notification');
        }

        to = ownerEmail;
        subject = data.subject || `New Booking - ${data.venueName || 'Venue'}`;

        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – New Booking Notification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(128,0,32,0.08); }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .booking-card { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; }
    .customer-section { background: rgba(255, 215, 0, 0.15); border: 2px solid #FFD700; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; background: #FFD700; color: #800020; border: 2px solid #800020; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
      <div class="brand">EDDYS MEMBERS</div>
    </div>
    <div class="content">
      <h2 class="title">New Booking Confirmed! 🎉</h2>
      <div class="booking-card">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${data.bookingDate || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.bookingTime || 'N/A'} - ${data.endTime || '23:00'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Party Size</div>
            <div class="detail-value">${data.guestCount || 'N/A'} guests</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${(data.totalAmount || 0).toLocaleString()}</div>
          </div>
        </div>
        <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px;">${data.tableInfo || 'Table not specified'}</div>
          <div style="color: #800020; font-size: 14px; font-weight: bold;">Please prepare this table for your guests</div>
        </div>
      </div>
      <div class="customer-section">
        <h4 style="color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px;">Customer Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
          <div style="color: #800020;"><span style="color: #800020; font-weight: 700;">Name:</span> ${data.customerName || 'N/A'}</div>
          <div style="color: #800020;"><span style="color: #800020; font-weight: 700;">Email:</span> ${data.customerEmail || 'N/A'}</div>
          <div style="color: #800020;"><span style="color: #800020; font-weight: 700;">Phone:</span> ${data.customerPhone || 'N/A'}</div>
          <div style="color: #800020;"><span style="color: #800020; font-weight: 700;">Venue:</span> ${data.venueName || 'N/A'}</div>
        </div>
      </div>
      ${data.specialRequests && data.specialRequests !== 'None specified' ? `
      <div style="background: rgba(128, 0, 32, 0.05); border: 1px solid rgba(128, 0, 32, 0.2); border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="color: #800020; font-weight: 700; font-size: 14px; margin-bottom: 8px;">Special Requests</div>
        <div style="color: #800020; font-size: 14px; line-height: 1.6; font-weight: bold;">${data.specialRequests}</div>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.ownerUrl || (Deno.env.get('APP_URL') || '') + '/venue-owner/dashboard'}" class="btn">📊 Open Venue Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break
      }

      case 'booking-cancellation-customer':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Cancelled</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background-color: #FFF5E6; color: #800020; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #FFF5E6; box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1); border: 2px solid #800020; }
        .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 40px 30px; text-align: center; }
        .logo-image { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3); border: 3px solid #FFD700; }
        .brand-name { color: #FFF5E6; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; }
        .content { padding: 50px 40px; background-color: #FFF5E6; }
        .title { color: #800020; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .cancellation-section { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 15px; padding: 35px; margin: 35px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .detail-item { background: rgba(255, 215, 0, 0.15); border: 1px solid #FFD700; padding: 15px; border-radius: 8px; border-left: 4px solid #FFD700; }
        .detail-label { color: #800020; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .detail-value { color: #800020; font-size: 14px; font-weight: bold; }
        .refund-notice { background: rgba(34, 197, 94, 0.1); border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
        .refund-amount { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .action-button { display: inline-block; text-decoration: none; padding: 16px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; background: #FFD700; color: #800020; border: 2px solid #800020; margin: 10px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
            <h1 class="brand-name">EDDYS MEMBERS</h1>
        </div>
        <div class="content">
            <h2 class="title">Booking Cancelled</h2>
            <div class="cancellation-section">
                <h3 style="color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center;">Cancelled Booking Details</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Venue</div>
                        <div class="detail-value">${data.venueName || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${data.bookingDate ? new Date(data.bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${data.bookingTime || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Guests</div>
                        <div class="detail-value">${data.guestCount || 0} guests</div>
                    </div>
                </div>
            </div>
            ${data.isRefunded ? `
            <div class="refund-notice">
                <div class="refund-amount">₦${(data.refundAmount || 0).toLocaleString()} Refund Processed</div>
                <div style="color: #800020; font-size: 14px; font-weight: bold;">Your refund has been processed and will appear in your account within 5-10 business days.</div>
            </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl || 'https://oneeddy.com/profile'}" class="action-button">View My Bookings</a>
                <a href="https://oneeddy.com/venues" class="action-button">Book Another Venue</a>
            </div>
        </div>
    </div>
</body>
</html>`
        break

      case 'booking-cancellation-venue':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Cancellation Notice</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1); }
        .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 40px 30px; text-align: center; }
        .logo-image { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3); border: 3px solid #FFD700; }
        .brand-name { color: #FFF5E6; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; }
        .content { padding: 50px 40px; background-color: #ffffff; }
        .title { color: #800020; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .cancellation-section { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 15px; padding: 35px; margin: 35px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #FFD700; }
        .detail-label { color: #800020; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .detail-value { color: #666; font-size: 14px; }
        .refund-notice { background: rgba(34, 197, 94, 0.1); border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
            <h1 class="brand-name">EDDYS MEMBERS</h1>
        </div>
        <div class="content">
            <h2 class="title">Booking Cancellation Notice</h2>
            <div class="cancellation-section">
                <h3 style="color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center;">Cancelled Booking Details</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Customer</div>
                        <div class="detail-value">${data.customerName || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Booking ID</div>
                        <div class="detail-value">${data.bookingId || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${data.bookingDate ? new Date(data.bookingDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${data.bookingTime || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Guests</div>
                        <div class="detail-value">${data.guestCount || 0} guests</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Amount</div>
                        <div class="detail-value">₦${(data.totalAmount || 0).toLocaleString()}</div>
                    </div>
                </div>
                ${data.isRefunded ? `
                <div class="refund-notice">
                    <div style="color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 10px;">₦${(data.refundAmount || 0).toLocaleString()} Refunded</div>
                    <div style="color: #800020; font-size: 14px; font-weight: bold;">The customer's payment has been automatically refunded through Stripe.</div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
</body>
</html>`
        break

      case 'venue-owner-application':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Venue Owner Application</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #800020; margin: 0; padding: 0; background-color: #FFF5E6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFF5E6; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1); border: 2px solid #800020; }
        .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 40px 30px; text-align: center; }
        .logo-image { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3); border: 3px solid #FFD700; }
        .brand-name { color: #FFF5E6; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; }
        .content { padding: 40px 30px; background-color: #FFF5E6; }
        .section { margin-bottom: 30px; }
        .section-title { color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #FFD700; padding-bottom: 8px; }
        .detail-row { display: flex; margin-bottom: 12px; align-items: center; }
        .detail-label { font-weight: 600; color: #800020; min-width: 120px; margin-right: 15px; }
        .detail-value { color: #800020; flex: 1; font-weight: bold; }
        .venue-card { background-color: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .venue-name { font-size: 18px; font-weight: bold; color: #800020; margin-bottom: 10px; }
        .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
        .cta-button { display: inline-block; background: #FFD700; color: #800020; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; border: 2px solid #800020; }
        .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 40px 30px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
            <h1 class="brand-name">EDDYS MEMBERS</h1>
            <p style="color: #FFF5E6; font-size: 14px; margin-top: 8px;">Admin Dashboard</p>
        </div>
        <div class="content">
            <div class="section">
                <h2 class="section-title">🏢 New Venue Owner Application</h2>
                <p>A new venue owner has submitted an application to join Eddys Members' exclusive network. Please review the details below and take appropriate action.</p>
            </div>
            <div class="section">
                <h3 class="section-title">Application Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Owner Name:</span>
                    <span class="detail-value">${data.ownerName || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email Address:</span>
                    <span class="detail-value">${data.ownerEmail || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone Number:</span>
                    <span class="detail-value">${data.ownerPhone || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Application Date:</span>
                    <span class="detail-value">${data.applicationDate || new Date().toLocaleDateString()}</span>
                </div>
            </div>
            <div class="venue-card">
                <div class="venue-name">🏛️ ${data.venueName || 'Venue Name'}</div>
                <p style="margin: 10px 0; color: #800020; font-weight: bold;">${data.venueDescription || 'No description provided'}</p>
                <div class="venue-details">
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Type:</strong> ${data.venueType || 'Not specified'}</div>
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Capacity:</strong> ${data.venueCapacity || 'Not specified'} guests</div>
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Location:</strong> ${data.venueAddress || 'Not provided'}</div>
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Price Range:</strong> ${data.priceRange || 'Not specified'}</div>
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Hours:</strong> ${data.openingHours || 'Not provided'}</div>
                    <div style="font-size: 14px; color: #800020; font-weight: bold;"><strong>Contact:</strong> ${data.venuePhone || 'Not provided'}</div>
                </div>
            </div>
            <div style="text-align: center;">
                <a href="${data.viewUrl || (Deno.env.get('APP_URL') || 'https://oneeddy.com') + '/admin/venue-approvals'}" class="cta-button">VIEW FULL DETAILS</a>
            </div>
            <div style="background-color: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; border-radius: 6px; padding: 15px; margin: 20px 0; color: #800020;">
                <strong style="font-weight: bold;">⏰ Please review and respond to this application within 48 hours</strong>
            </div>
        </div>
        <div class="footer">
            <h3 style="margin: 0 0 15px 0; font-size: 18px;">Eddys Members Admin System</h3>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Manage venue partnerships and maintain the highest standards for Lagos' most exclusive venue booking platform.</p>
        </div>
    </div>
</body>
</html>`
        break

      default:
        throw new Error('Invalid template')
    }

    console.log('Sending email via SendGrid API...', { from: smtpFrom, to: to, subject: subject });
    
    // Use SendGrid HTTP API instead of SMTP
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
      subject: subject,
        }],
        from: { email: smtpFrom },
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('SendGrid API error:', errorText);
      throw new Error(`SendGrid API error: ${sendgridResponse.status} ${errorText}`);
    }

    console.log('Email sent successfully to:', to);

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
  const ADMIN_EMAIL = "info@oneeddy.com"; // Change to your admin email

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