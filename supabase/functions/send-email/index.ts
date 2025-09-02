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

// Remove unused Stripe dependencies to allow deployment in environments without Stripe module
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
// SendGrid API key (optional). If present, we will use SendGrid HTTP API instead of SMTP
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';

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
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Confirmation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1); }
        .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="10" cy="60" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="90" cy="40" r="0.5" fill="%23FFD700" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat; opacity: 0.3; }
        .logo { position: relative; z-index: 2; }
        .logo-image { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3); border: 3px solid #FFD700; }
        .brand-name { color: #FFF5E6; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .tagline { color: #FFF5E6; font-size: 14px; opacity: 0.9; margin-top: 8px; font-weight: 300; letter-spacing: 1px; }
        .content { padding: 50px 40px; background-color: #ffffff; }
        .title { color: #800020; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .subtitle { color: #555; font-size: 16px; margin-bottom: 30px; text-align: center; line-height: 1.7; }
        .booking-section { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 15px; padding: 35px; margin: 35px 0; position: relative; }
        .booking-section::before { content: '🎉'; position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .booking-title { color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .booking-reference { background: #800020; color: #FFF5E6; padding: 15px 25px; border-radius: 25px; text-align: center; margin-bottom: 25px; font-weight: bold; font-size: 18px; letter-spacing: 1px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #FFD700; }
        .detail-label { color: #800020; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .detail-value { color: #666; font-size: 14px; word-break: break-word; }
        .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 25px; margin: 30px 0; border-radius: 8px; }
        .venue-title { color: #800020; font-weight: bold; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; }
        .venue-description { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; }
        .venue-detail-item { color: #666; }
        .venue-detail-label { color: #800020; font-weight: bold; margin-right: 5px; }
        .table-info { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
        .table-number { color: #800020; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .table-details { color: #666; font-size: 14px; line-height: 1.6; }
        .special-requests { background: rgba(128, 0, 32, 0.05); border: 1px solid rgba(128, 0, 32, 0.2); border-radius: 10px; padding: 20px; margin: 25px 0; }
        .special-requests-title { color: #800020; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
        .special-requests-text { color: #666; font-size: 14px; line-height: 1.6; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .action-button { display: inline-block; text-decoration: none; padding: 16px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; letter-spacing: 1px; transition: all 0.3s ease; margin: 0 10px 10px 10px; box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3); border: 2px solid #FFD700; }
        .primary-button { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
        .primary-button:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(128, 0, 32, 0.4); background: linear-gradient(135deg, #A71D2A 0%, #800020 100%); }
        .secondary-button { background: linear-gradient(135deg, #FFD700 0%, #FFF5E6 100%); color: #800020; }
        .secondary-button:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(255, 215, 0, 0.4); background: linear-gradient(135deg, #FFF5E6 0%, #FFD700 100%); }
        .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
        .feature-item { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid rgba(128, 0, 32, 0.1); }
        .feature-icon { font-size: 24px; margin-bottom: 10px; }
        .feature-title { color: #800020; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
        .feature-text { color: #666; font-size: 12px; }
        .important-notice { background: rgba(255, 215, 0, 0.1); border: 1px solid #FFD700; border-radius: 10px; padding: 20px; margin: 25px 0; text-align: center; }
        .important-notice-text { color: #800020; font-size: 14px; font-weight: bold; }
        .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 40px 30px; text-align: center; }
        .footer-content { margin-bottom: 20px; }
        .footer-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .footer-text { font-size: 14px; opacity: 0.9; line-height: 1.6; }
        .footer-bottom { border-top: 1px solid rgba(255, 245, 230, 0.2); padding-top: 20px; font-size: 12px; opacity: 0.8; color: #FFF5E6; }
        .footer-link { color: #FFD700; text-decoration: none; }
        @media (max-width: 600px) { .email-container { margin: 0; box-shadow: none; } .header { padding: 30px 20px; } .logo-image { width: 90px; height: 90px; } .brand-name { font-size: 24px; } .content { padding: 30px 20px; } .title { font-size: 24px; } .booking-section { padding: 25px 20px; margin: 25px 0; } .details-grid { grid-template-columns: 1fr; gap: 15px; } .action-button { display: block; margin: 10px 0; padding: 14px 25px; font-size: 15px; } .venue-details { grid-template-columns: 1fr; gap: 10px; } .features-grid { grid-template-columns: 1fr; gap: 15px; } .footer { padding: 30px 20px; } }
    </style>
    </head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">EDDYS MEMBERS</h1>
                <p class="tagline">Your Gateway to Exclusive Experiences</p>
            </div>
        </div>
        <div class="content">
            <h2 class="title">Booking Confirmed! 🎉</h2>
            <p class="subtitle">Congratulations ${data.customerName || 'Guest'}! Your VIP table reservation has been successfully confirmed.</p>
            <div class="booking-section">
                <h3 class="booking-title">Your Reservation Details</h3>
                <div class="booking-reference">Booking Reference: ${data.bookingReference}</div>
                
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Guest Name</div>
                        <div class="detail-value">${data.customerName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact Email</div>
                        <div class="detail-value">${data.customerEmail}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone Number</div>
                        <div class="detail-value">${data.customerPhone}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Party Size</div>
                        <div class="detail-value">${data.guestCount} guests</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${data.bookingDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${data.bookingTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${data.duration}</div>
                    </div>
                </div>

                <div class="table-info">
                    <div class="table-number">Table ${data.tableNumber}</div>
                    <div class="table-details">
                        <p>${data.tableType}</p>
                        <p>${data.tableLocation}</p>
                    </div>
                </div>

                <div class="venue-section">
                    <h4 class="venue-title">Venue Information</h4>
                    <p class="venue-description">${data.venueDescription}</p>
                    <div class="venue-details">
                        <div class="venue-detail-item">
                            <span class="venue-detail-label">Address:</span> ${data.venueAddress}, ${data.venueCity}, ${data.venueCountry}
                        </div>
                        <div class="venue-detail-item">
                            <span class="venue-detail-label">Phone:</span> ${data.venuePhone}
                        </div>
                        <div class="venue-detail-item">
                            <span class="venue-detail-label">Email:</span> ${data.venueEmail}
                        </div>
                        <div class="venue-detail-item">
                            <span class="venue-detail-label">Dress Code:</span> ${data.dressCode}
                        </div>
                    </div>
                </div>

                <div class="special-requests">
                    <div class="special-requests-title">Special Requests</div>
                    <div class="special-requests-text">${data.specialRequests}</div>
                </div>
            </div>
            <div class="action-buttons">
                <a href="${data.viewBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button primary-button">📅 VIEW BOOKING DETAILS</a>
                <a href="${data.modifyBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button secondary-button">✏️ MODIFY RESERVATION</a>
                <a href="${data.cancelBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button secondary-button">❌ CANCEL BOOKING</a>
              </div>
            <div class="features-grid">
                <div class="feature-item"><div class="feature-icon">🍾</div><div class="feature-title">Premium Service</div><div class="feature-text">Dedicated VIP host</div></div>
                <div class="feature-item"><div class="feature-icon">🎵</div><div class="feature-title">Perfect Ambiance</div><div class="feature-text">Curated music & lighting</div></div>
                <div class="feature-item"><div class="feature-icon">🍸</div><div class="feature-title">Signature Cocktails</div><div class="feature-text">Exclusive drink menu</div></div>
                <div class="feature-item"><div class="feature-icon">⭐</div><div class="feature-title">VIP Treatment</div><div class="feature-text">Priority seating & service</div></div>
              </div>
            <div class="important-notice"><p class="important-notice-text">⏰ Please arrive 15 minutes before your reservation time. Late arrivals may result in table reassignment.</p></div>
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">Need to make changes to your booking? Contact us at <a href="mailto:sales@oneeddy.com" style="color: #800020; text-decoration: none; font-weight: bold;">sales@oneeddy.com</a> or call <a href="tel:${data.venuePhone || ''}" style="color: #800020; text-decoration: none; font-weight: bold;">${data.venuePhone || ''}</a></p>
              </div>
        <div class="footer">
            <div class="footer-content">
                <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
                <p class="footer-text">Experience Lagos' finest venues with premium service, exclusive access, and unforgettable moments. Your VIP journey starts here.</p>
              </div>
            <div class="footer-bottom">
                <p style="color: #FFF5E6;">© 2025 Eddys Members. All rights reserved.</p>
                <p style="margin-top: 10px; color: #FFF5E6;"><a href="${data.websiteUrl || (Deno.env.get('APP_URL') || '')}" class="footer-link">Visit Website</a> | <a href="${data.supportUrl || (Deno.env.get('APP_URL') || '') + '/contact'}" class="footer-link">Support</a> | <a href="${data.unsubscribeUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="footer-link">Unsubscribe</a></p>
            </div>
            </div>
          </div>
</body>
</html>`
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

      case 'venue-owner-notification':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VIPClub – New Booking Notification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(128,0,32,0.08); }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 28px 24px; text-align: center; }
    .brand { color: #FFF5E6; font-size: 22px; font-weight: 700; letter-spacing: 1.2px; }
    .content { padding: 28px 24px; }
    .section { background:#f8f8f8; border:1px solid #eee; border-radius:10px; padding:14px 16px; margin-top:14px; }
    .section h3 { margin:0 0 8px 0; color:#800020; font-size:16px; }
    .row { margin: 4px 0; font-size: 14px; }
    .label { color:#800020; font-weight:700; display:inline-block; min-width:120px; }
    .cta { text-align:center; margin:20px 0 6px; }
    .btn { display:inline-block; text-decoration:none; padding:12px 22px; border-radius:28px; font-weight:700; font-size:14px; letter-spacing:.3px; border:2px solid #FFD700; box-shadow:0 6px 18px rgba(128,0,32,.18); }
    .btn-primary { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 18px; text-align: center; font-size:12px; }
  </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="brand">EDDYS MEMBERS</div>
      </div>
      <div class="content">
        <h2 style="color:#800020; text-align:center; margin-bottom:12px;">New Booking Received</h2>
        <p style="text-align:center; color:#555; margin-bottom:16px;">A new booking has been placed for <strong>${(data.venueName||'Your Venue')}</strong>.</p>

        <div class="section">
          <h3>Booking Details</h3>
          <div class="row"><span class="label">Booking ID:</span> ${(data.bookingId||'')}</div>
          <div class="row"><span class="label">Date:</span> ${(data.bookingDate||'')}</div>
          <div class="row"><span class="label">Time:</span> ${(data.bookingTime||'')}</div>
          <div class="row"><span class="label">Party Size:</span> ${(data.partySize||'')}</div>
          <div class="row"><span class="label">Table:</span> ${(data.tableNumber||data.tableName||'')}</div>
          <div class="row"><span class="label">Amount:</span> ${(data.totalAmount||'')}</div>
        </div>

        <div class="section">
          <h3>Customer</h3>
          <div class="row"><span class="label">Name:</span> ${(data.customerName||'')}</div>
          <div class="row"><span class="label">Email:</span> ${(data.customerEmail||'')}</div>
          <div class="row"><span class="label">Phone:</span> ${(data.customerPhone||'')}</div>
        </div>

        <div class="cta">
          ${ (() => { const url = (data.ownerUrl || (Deno.env.get('APP_URL')||'') + '/venue-owner/dashboard'); return `<a class=\"btn btn-primary\" href=\"${url}\">Open Venue Owner Dashboard</a>`; })() }
        </div>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Eddys Members</div>
    </div>
  </body>
</html>`
        break

      case 'venue-owner-booking-notification':
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
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; position: relative; }
    .header::before { content: ''; position: absolute; inset: 0; opacity: .2; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat; }
    .logo { position: relative; z-index: 1; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .subtitle { color: #555; font-size: 16px; text-align: center; margin-bottom: 24px; }
    .booking-card { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; position: relative; }
    .booking-card::before { content: '🎉'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .booking-id { background: #800020; color: #FFF5E6; padding: 12px 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 16px; letter-spacing: 1px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; word-break: break-word; }
    .customer-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .customer-title { color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .customer-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .customer-item { color: #666; }
    .customer-label { color: #800020; font-weight: 700; margin-right: 8px; }
    .table-info { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .table-number { color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .table-details { color: #666; font-size: 14px; }
    .special-requests { background: rgba(128, 0, 32, 0.05); border: 1px solid rgba(128, 0, 32, 0.2); border-radius: 8px; padding: 16px; margin: 20px 0; }
    .special-requests-title { color: #800020; font-weight: 700; font-size: 14px; margin-bottom: 8px; }
    .special-requests-text { color: #666; font-size: 14px; line-height: 1.6; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; letter-spacing: .5px; border: 2px solid #FFD700; box-shadow: 0 6px 18px rgba(128,0,32,.18); }
    .btn-primary { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(128,0,32,.25); }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 24px; text-align: center; }
    .footer-content { margin-bottom: 16px; }
    .footer-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .footer-text { font-size: 14px; opacity: 0.9; line-height: 1.6; }
    .footer-bottom { border-top: 1px solid rgba(255, 245, 230, 0.2); padding-top: 16px; font-size: 12px; opacity: 0.8; }
    @media (max-width: 600px) { 
      .email-container { margin: 0; box-shadow: none; } 
      .header { padding: 24px 20px; } 
      .logo-image { width: 60px; height: 60px; } 
      .brand { font-size: 20px; } 
      .content { padding: 24px 20px; } 
      .title { font-size: 20px; } 
      .booking-card { padding: 20px 16px; margin: 16px 0; } 
      .details-grid { grid-template-columns: 1fr; gap: 12px; } 
      .customer-details { grid-template-columns: 1fr; gap: 8px; } 
      .btn { display: block; margin: 12px 0; padding: 12px 24px; font-size: 13px; } 
      .footer { padding: 20px 16px; } 
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
        <div class="brand">EDDYS MEMBERS</div>
      </div>
    </div>
    <div class="content">
      <h2 class="title">New Booking Confirmed! 🎉</h2>
      <p class="subtitle">A new booking has been placed for <strong>${data.venueName || 'Your Venue'}</strong></p>
      
      <div class="booking-card">
        <div class="booking-id">Booking ID: ${data.bookingId || 'N/A'}</div>
        
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

        <div class="table-info">
          <div class="table-number">${data.tableInfo || 'Table not specified'}</div>
          <div class="table-details">Please prepare this table for your guests</div>
        </div>
      </div>

      <div class="customer-section">
        <h4 class="customer-title">Customer Information</h4>
        <div class="customer-details">
          <div class="customer-item">
            <span class="customer-label">Name:</span> ${data.customerName || 'N/A'}
          </div>
          <div class="customer-item">
            <span class="customer-label">Email:</span> ${data.customerEmail || 'N/A'}
          </div>
          <div class="customer-item">
            <span class="customer-label">Phone:</span> ${data.customerPhone || 'N/A'}
          </div>
          <div class="customer-item">
            <span class="customer-label">Venue:</span> ${data.venueName || 'N/A'}
          </div>
        </div>
      </div>

      ${data.specialRequests && data.specialRequests !== 'None specified' ? `
      <div class="special-requests">
        <div class="special-requests-title">Special Requests</div>
        <div class="special-requests-text">${data.specialRequests}</div>
      </div>
      ` : ''}

      <div class="cta">
        <a href="${data.ownerUrl || (Deno.env.get('APP_URL') || '') + '/venue-owner/dashboard'}" class="btn btn-primary">
          📊 Open Venue Dashboard
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 24px;">
        Please prepare the table and ensure excellent service for your guests.<br>
        Contact the customer directly if you need any clarification.
      </p>
    </div>
    <div class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Thank You for Partnering with Eddys Members</h3>
        <p class="footer-text">Your venue is part of Lagos' most exclusive dining and entertainment network.</p>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} Eddys Members. All rights reserved.</p>
        <p style="margin-top: 8px;">
          <a href="${Deno.env.get('APP_URL') || ''}" style="color: #FFD700; text-decoration: none;">Visit Website</a> | 
          <a href="mailto:info@oneeddy.com" style="color: #FFD700; text-decoration: none;">Support</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
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
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VIPClub – New Venue Owner Registration</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(128,0,32,0.08); }
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 36px 28px; text-align: center; position: relative; }
    .header::before { content: ''; position: absolute; inset: 0; opacity: .25;
      background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"%23FFD700\" opacity=\"0.12\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"%23FFD700\" opacity=\"0.12\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>') repeat; }
    .logo { position: relative; z-index: 1; }
    .logo-image { width: 110px; height: 110px; border-radius: 50%; border: 3px solid #FFD700; box-shadow: 0 8px 20px rgba(255,215,0,.28); margin-bottom: 12px; }
    .brand { color: #FFF5E6; font-size: 26px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 40px 32px; }
    .title { color: #800020; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 18px; }
    .subtitle { color: #555; font-size: 14px; text-align: center; margin-bottom: 26px; }
    .card { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 14px; padding: 24px; margin: 18px 0; }
    .section-title { color: #800020; font-weight: 700; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .label { color: #800020; font-weight: 700; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
    .value { color: #666; font-size: 13px; word-break: break-word; }
    .cta { text-align: center; margin: 24px 0 6px; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 26px; border-radius: 28px; font-weight: 700; font-size: 14px; letter-spacing: .5px; border: 2px solid #FFD700; box-shadow: 0 8px 22px rgba(128,0,32,.26); }
    .btn-primary { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .btn-secondary { background: #FFF5E6; color: #800020; border: 2px solid #800020; margin-left: 10px; }
    .notice { background: rgba(255,215,0,.12); border: 1px solid #FFD700; border-radius: 10px; padding: 14px; text-align: center; color: #800020; font-size: 13px; font-weight: 700; margin-top: 18px; }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 30px 26px; text-align: center; }
    .foot-note { border-top: 1px solid rgba(255,245,230,.22); margin-top: 14px; padding-top: 12px; font-size: 12px; opacity: .85; }
    @media (max-width: 600px) { .content { padding: 28px 20px; } .grid { grid-template-columns: 1fr; } .cta { display: flex; flex-direction: column; gap: 10px; } .btn { margin: 0; } }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <img class="logo-image" src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="VIPClub" />
        <div class="brand">EDDYS MEMBERS</div>
      </div>
    </div>
    <div class="content">
      <div class="title">New Venue Owner Registration</div>
      <div class="subtitle">A new venue owner has just completed registration. Review their details below.</div>

      <div class="card">
        <div class="section-title">Venue Owner</div>
        <div class="grid">
          <div class="item"><div class="label">Name</div><div class="value">${data.ownerName || ''}</div></div>
          <div class="item"><div class="label">Email</div><div class="value">${data.email || ''}</div></div>
          <div class="item"><div class="label">Phone</div><div class="value">${data.phone || 'Not provided'}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Venue</div>
        <div class="grid">
          <div class="item"><div class="label">Name</div><div class="value">${data.venueName || ''}</div></div>
          <div class="item"><div class="label">Type</div><div class="value">${data.venueType || 'Not specified'}</div></div>
          <div class="item"><div class="label">Address</div><div class="value">${(data.venueAddress || '')}${data.venueCity ? ', ' + data.venueCity : ''}</div></div>
        </div>
      </div>

      <div class="cta">
        <!-- Single working button for web access -->
        <a class="btn btn-primary" href="${data.adminUrl || (Deno.env.get('APP_URL') || 'https://oneeddy.com') + '/admin/venue-approvals'}">
           Review Venue Owner
        </a>
      </div>
      
      <div class="notice">Please review and approve or reject this venue owner account.</div>
    </div>
    <div class="footer">
      <div>Thank you for keeping the VIPClub community high-quality.</div>
      <div class="foot-note">© 2025 Eddys Members. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`
        break

      case 'signup-confirmation':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to VIPClub - Confirm Your Account</title>
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
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(128, 0, 32, 0.4); }
        .web-fallback { background-color: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .fallback-link { color: #800020; text-decoration: underline; font-weight: bold; }
        .app-links { text-align: center; margin: 40px 0; }
        .app-store-badge { display: inline-block; margin: 0 10px; }
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
            <h2 class="welcome-title">Welcome to Eddys Members!</h2>
            <p class="welcome-text">
                Hi ${data.email}! Thank you for joining VIPClub - your premier destination for exclusive venue bookings in Lagos, Nigeria.
            </p>
            
            <!-- Primary CTA - Web-based for universal access -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('APP_URL') || 'https://oneeddy.com'}/signup/confirm?email=${encodeURIComponent(data.email)}" class="cta-button">
                    Confirm Your Account
                </a>
            </div>
            
            <!-- Web Fallback Info -->
            <div class="web-fallback">
                <h3 style="color: #800020; margin-bottom: 15px;">💻 Access on Any Device</h3>
                <p style="margin-bottom: 20px; color: #555;">
                    This confirmation link works on all devices - desktop, laptop, tablet, and mobile.
                </p>
            </div>
            
            <!-- App Download Section -->
            <div class="app-links">
                <h3 style="color: #800020; margin-bottom: 20px;">Get the VIPClub Mobile App</h3>
                <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                    For the best mobile experience, download our app
                </p>
                <a href="https://apps.apple.com/app/idYOUR_IOS_APP_STORE_ID" class="app-store-badge">
                    <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on the App Store" style="height: 50px;">
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.vipclub.app" class="app-store-badge">
                    <img src="https://play.google.com/intl/en_us/badges/static/images/badge_web_generic.png" alt="Get it on Google Play" style="height: 50px;">
                </a>
            </div>
        </div>
    </div>
</body>
</html>`
        break;

      case 'venue-owner-signup':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to VIPClub - Venue Owner Registration</title>
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
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(128, 0, 32, 0.4); }
        .web-fallback { background-color: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .fallback-link { color: #800020; text-decoration: underline; font-weight: bold; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <img src="https://vipclub.com/logo.png" alt="VIPClub Logo" class="logo-image">
                <h1 class="brand-name">VIPClub</h1>
                <p class="tagline">Exclusive Venue Bookings</p>
            </div>
        </div>
        
        <div class="content">
            <h2 class="welcome-title">Welcome to VIPClub!</h2>
            <p class="welcome-text">
                Hi ${data.ownerName || data.email}! Thank you for registering your venue "${data.venueName}" with VIPClub.
            </p>
            
            <!-- Primary CTA - Web-based for universal access -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('APP_URL') || 'https://vipclub.com'}/venue-owner/register?email=${encodeURIComponent(data.email)}" class="cta-button">
                    Complete Registration
                </a>
            </div>
            
            <!-- Web Fallback Info -->
            <div class="web-fallback">
                <h3 style="color: #800020; margin-bottom: 15px;">💻 Access on Any Device</h3>
                <p style="margin-bottom: 20px; color: #555;">
                    This registration link works on all devices - desktop, laptop, tablet, and mobile.
                </p>
                <p style="color: #666; font-size: 14px;">
                    Our team will review your venue within 48 hours. You'll receive an email notification once approved.
                </p>
            </div>
            
            <!-- App Download Section -->
            <div class="app-links">
                <h3 style="color: #800020; margin-bottom: 20px;">Get the VIPClub Mobile App</h3>
                <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                    For the best mobile experience, download our app
                </p>
                <a href="https://apps.apple.com/app/idYOUR_IOS_APP_STORE_ID" class="app-store-badge">
                    <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on the App Store" style="height: 50px;">
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.vipclub.app" class="app-store-badge">
                    <img src="https://play.google.com/intl/en_us/badges/static/images/badge_web_generic.png" alt="Get it on Google Play" style="height: 50px;">
                </a>
            </div>
        </div>
    </div>
</body>
</html>`
        break;

      default:
        throw new Error('Invalid template')
    }

    // Prefer SendGrid HTTP API if configured
    if (SENDGRID_API_KEY) {
      console.log('Sending email via SendGrid API...')
      const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            { to: [{ email: to }] }
          ],
          from: {
            email: Deno.env.get('SMTP_FROM') || 'info@oneeddy.com',
            name: 'VIPClub'
          },
          subject,
          content: [
            { type: 'text/html', value: html }
          ]
        })
      })

      if (!sgResponse.ok) {
        const errorText = await sgResponse.text()
        throw new Error(`SendGrid API error (${sgResponse.status}): ${errorText}`)
      }

      console.log('Email sent successfully via SendGrid API')
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Fallback to SMTP (implicit TLS expected if using port 465)
    const client = new SmtpClient()
    console.log('Connecting to SMTP server...')
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    })
    console.log('Connected to SMTP server')

    console.log('Sending email via SMTP...')
    await client.send({
      from: Deno.env.get('SMTP_FROM') || '',
      to: to,
      subject: subject,
      content: html,
      html: html,
    })
    console.log('Email sent successfully via SMTP')

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