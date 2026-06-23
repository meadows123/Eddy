<<<<<<< HEAD
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
=======
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};
// Initialize Supabase client with service_role key
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
// Remove unused Stripe dependencies to allow deployment in environments without Stripe module
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
// SendGrid API key (optional). If present, we will use SendGrid HTTP API instead of SMTP
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
// FROM_EMAIL for SendGrid
const FROM_EMAIL = Deno.env.get('SMTP_FROM') || 'info@oneeddy.com';
// Rate limiting for QR scan emails
// Store: Map<email+bookingId, { timestamp, count }>
const qrScanEmailCache = new Map();
const QR_SCAN_RATE_LIMIT_MS = 300000; // 5 minutes (increased from 1 minute)
const MAX_QR_SCAN_EMAILS_PER_BOOKING = 1; // Only 1 email per booking EVER
const PERMANENT_BLOCK_TIME = 86400000; // 24 hours - after max emails reached
// Cleanup old entries every 30 minutes (but keep blocked entries longer)
setInterval(()=>{
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, data] of qrScanEmailCache.entries()){
    // Only clean up entries that:
    // 1. Haven't reached max emails AND haven't been accessed in 5 minutes
    // 2. OR entries older than 24 hours
    if (data.count < MAX_QR_SCAN_EMAILS_PER_BOOKING && now - data.timestamp > QR_SCAN_RATE_LIMIT_MS) {
      qrScanEmailCache.delete(key);
      cleanedCount++;
    } else if (now - data.timestamp > PERMANENT_BLOCK_TIME) {
      qrScanEmailCache.delete(key);
      cleanedCount++;
    }
  }
<<<<<<< HEAD
  console.log('🧹 Cleaned up QR scan email cache:', {
    removed: cleanedCount,
    remaining: qrScanEmailCache.size
  });
}, 1800000); // 30 minutes
function canSendQRScanEmail(to, bookingId) {
  // Create a unique key for this email/booking combination
  const cacheKey = bookingId ? `${to}-${bookingId}` : to;
  const cachedData = qrScanEmailCache.get(cacheKey);
  if (cachedData) {
    const timeSince = Date.now() - cachedData.timestamp;
    // Check if max emails reached (PERMANENT BLOCK for this booking)
    if (cachedData.count >= MAX_QR_SCAN_EMAILS_PER_BOOKING) {
      console.log('🚫 PERMANENT BLOCK: Max emails reached for this booking', {
        to,
        bookingId,
        emailsSent: cachedData.count,
        firstSent: new Date(cachedData.timestamp).toISOString(),
        timeSince: `${Math.round(timeSince / 1000)}s ago`
      });
      return {
        allowed: false,
        reason: `Maximum emails already sent for this booking. Email was already sent ${Math.round(timeSince / 60000)} minutes ago.`
      };
    }
    // Check time-based rate limit
    if (timeSince < QR_SCAN_RATE_LIMIT_MS) {
      console.log('🚫 Time-based rate limit: Email sent too recently', {
        to,
        bookingId,
        timeSince: `${Math.round(timeSince / 1000)}s ago`,
        cooldownRemaining: `${Math.round((QR_SCAN_RATE_LIMIT_MS - timeSince) / 1000)}s`,
        emailsSent: cachedData.count
      });
      return {
        allowed: false,
        reason: `Email sent ${Math.round(timeSince / 1000)}s ago. Please wait ${Math.round((QR_SCAN_RATE_LIMIT_MS - timeSince) / 1000)}s before sending another.`
      };
    }
  }
  console.log('✅ Email allowed:', {
    to,
    bookingId,
    previousCount: cachedData?.count || 0
  });
  return {
    allowed: true
  };
}
function recordQRScanEmail(to, bookingId) {
  const cacheKey = bookingId ? `${to}-${bookingId}` : to;
  const cachedData = qrScanEmailCache.get(cacheKey);
  const newData = {
    timestamp: Date.now(),
    count: (cachedData?.count || 0) + 1
  };
  qrScanEmailCache.set(cacheKey, newData);
  console.log('📝 Recorded QR scan email:', {
    to,
    bookingId,
    totalEmails: newData.count,
    maxAllowed: MAX_QR_SCAN_EMAILS_PER_BOOKING,
    cacheSize: qrScanEmailCache.size,
    willBlock: newData.count >= MAX_QR_SCAN_EMAILS_PER_BOOKING
  });
  if (newData.count >= MAX_QR_SCAN_EMAILS_PER_BOOKING) {
    console.log('⚠️ BOOKING BLOCKED: Maximum emails sent for this booking', {
      to,
      bookingId,
      totalSent: newData.count
    });
  }
}
serve(async (req)=>{
=======
)

serve(async (req) => {
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS request');
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }
  if (req.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({
      error: "Invalid content type"
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({
      error: "Invalid JSON"
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  try {
<<<<<<< HEAD
    // Check if SendGrid API key is set
    if (!SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY is not set');
      return new Response(JSON.stringify({
        error: 'Email service configuration error',
        details: 'SendGrid API key is not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if FROM_EMAIL is set
    if (!FROM_EMAIL) {
      console.error('❌ FROM_EMAIL is not set');
      return new Response(JSON.stringify({
        error: 'Email service configuration error',
        details: 'Sender email is not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🔍 Received request:', {
      method: req.method,
      contentType: req.headers.get('content-type'),
      body
    });
    console.log('📧 DEBUG: Raw body data:', JSON.stringify(body, null, 2));
    const { to, subject, template, data } = body;
    console.log('📧 DEBUG: Extracted fields:', {
      to: to,
      subject: subject,
      template: template,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : 'no data'
    });
    // Validate required fields
    if (!to || !subject || !template) {
      console.error('❌ Missing required fields:', {
        to,
        subject,
        template
      });
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: 'Email recipient, subject, and template are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('📧 Processing email request:', {
      to,
      subject,
      template,
      dataKeys: Object.keys(data || {}),
      hasQrCodeImage: !!data?.qrCodeImage,
      qrCodeImageLength: data?.qrCodeImage?.length || 0,
      qrCodeImageStart: data?.qrCodeImage?.substring(0, 100) || 'N/A',
      hasApiKey: !!SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL
    });
    // Validate required parameters
    if (!to) {
      throw new Error('Missing required parameter: to (recipient email)');
    }
    if (!subject) {
      throw new Error('Missing required parameter: subject');
    }
    if (!template) {
      throw new Error('Missing required parameter: template');
    }
    // ⚡ CRITICAL: Early rate limiting check for QR scan notifications
    // This MUST happen BEFORE any processing to prevent duplicate emails
    if (template === 'qr-scan-notification') {
      const bookingId = data?.bookingId || undefined;
      console.log('🔍 [RATE LIMIT CHECK] Checking QR scan email:', {
        to,
        bookingId,
        timestamp: new Date().toISOString()
      });
      const rateLimitCheck = canSendQRScanEmail(to, bookingId);
      if (!rateLimitCheck.allowed) {
        console.log('🚫 [BLOCKED] QR scan email rejected by rate limiter:', {
          to,
          bookingId,
          reason: rateLimitCheck.reason,
          timestamp: new Date().toISOString()
        });
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
          rateLimited: true,
          blocked: true
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      console.log('✅ [ALLOWED] QR scan email passed rate limit check');
    }
    let html = '';
    switch(template){
=======
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

    // Skip booking-confirmation emails for split payment bookings UNLESS all payments are complete
    // Split payments have their own email flow (individual "Split Payment Confirmed" emails)
    // But when ALL payments are complete, send booking confirmation with QR codes
    if (template === 'booking-confirmation' && data.bookingId) {
      try {
        const { data: splitRequests, error: splitCheckError } = await supabaseClient
          .from('split_payment_requests')
          .select('id, status')
          .eq('booking_id', data.bookingId);
        
        // If error checking, log but continue (don't block email sending)
        if (splitCheckError) {
          console.log('⚠️ Error checking for split payments, continuing with email:', splitCheckError);
        } else if (splitRequests && splitRequests.length > 0) {
          // Check if all split payments are complete
          const allPaid = splitRequests.every(req => req.status === 'paid');
          
          if (allPaid) {
            console.log('✅ All split payments complete - sending booking confirmation email with QR codes');
            // Continue with email sending - don't skip
          } else {
            console.log('⏭️ Skipping booking-confirmation email - split payment booking not yet complete');
            console.log(`📊 Payment status: ${splitRequests.filter(req => req.status === 'paid').length}/${splitRequests.length} paid`);
            console.log('✅ Split payments have their own email flow (individual confirmation emails)');
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Email skipped - split payment booking not yet complete (has individual confirmation emails)' 
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            );
          }
        }
      } catch (error) {
        // If any error occurs, log but continue (don't block email sending)
        console.log('⚠️ Exception checking for split payments, continuing with email:', error);
      }
    }

    // Ensure venueName always has a fallback to prevent "undefined" in emails
    if (data && (template === 'booking-confirmation' || template === 'split-payment-confirmation' || template === 'split-payment-request')) {
      if (!data.venueName || data.venueName === 'undefined' || String(data.venueName).trim() === '') {
        data.venueName = 'Your Venue';
        console.log('⚠️ venueName was missing/undefined, setting fallback to "Your Venue"');
      }
    }

    // Fix subject line to prevent "undefined" from appearing
    if (subject && typeof subject === 'string' && subject.includes('undefined')) {
      console.log('⚠️ Subject contains "undefined", fixing it...');
      // Replace "undefined" with "Your Venue" in subject
      subject = subject.replace(/undefined/g, 'Your Venue');
    }

    // Log template being processed for debugging
    console.log(`📧 Processing email template: ${template}`, {
      to: to,
      template: template,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    });

    let html = ''
    switch (template) {
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
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
          <p>Login to your account to get started: <a href="https://www.oneeddy.com/venue-owner/login">Login Here</a></p>
          <p>Best regards,<br>The Eddy Team</p>
        `;
        break;
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
        `;
        break;
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
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(128, 0, 32, 0.4); }
        .venue-details { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .venue-details h3 { color: #2e7d32; margin-top: 0; }
        .venue-details p { color: #333; margin-bottom: 10px; }
        .next-steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-steps h3 { color: #8B1538; margin-top: 0; }
        .next-steps ol { color: #333; margin: 0; padding-left: 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none; }
    </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
                <a href="${data.registrationUrl || `${Deno.env.get('APP_URL')}/venue-owner/login?approved=true&email=${encodeURIComponent(data.email)}`}" class="cta-button">
                    Access Your Dashboard
                </a>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
                <p style="margin: 0; color: #856404;"><strong>Important:</strong> This link will take you directly to your venue dashboard. If you haven't set up your password yet, you'll be prompted to do so on first login.</p>
            </div>
            
            <p style="color: #333;">If you have any questions, please contact our support team.</p>
            <p style="color: #666; font-size: 14px;">Best regards,<br>The Eddys Members Team</p>
        </div>
        
        <div class="footer">
            <p style="color: #666; font-size: 12px; margin: 0;">&copy; 2025 Eddys Members. All rights reserved. Built in memory of Eddy.</p>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'welcome':
        html = `
          <h1>Welcome to Eddy!</h1>
          <p>Hi${data?.email ? `, ${data.email}` : ''}!</p>
          <p>Thank you for signing up. We're excited to have you join our community.</p>
          <p>Start exploring and booking your favorite venues today!</p>
          <p>Best regards,<br>The Eddy Team</p>
        `;
        break;
      case 'referral-invitation':
        html = `
<<<<<<< HEAD
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Join Eddy - Special Invitation</title></head>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333">
            <div style="max-width:600px;margin:0 auto;background:#fff;box-shadow:0 10px 30px rgba(128,0,32,0.08)">
              <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
                <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">SPECIAL INVITATION</div>
              </div>
=======
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF5E6;">
            <div style="background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #800020; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Booking Confirmed!</h1>
              <p style="color: #800020; margin: 10px 0 0 0; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Your Eddy experience awaits</p>
            </div>
            
            <div style="background: #FFF5E6; padding: 30px; border: 2px solid #800020; border-top: none;">
              <p style="font-size: 18px; color: #800020; margin-bottom: 20px; font-weight: bold;">Dear ${data.customerName},</p>
              
              <p style="color: #800020; line-height: 1.6; font-size: 16px;">Thank you for choosing Eddy! Your booking has been confirmed and we're excited to welcome you.</p>
              
              <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #800020; margin-top: 0; font-size: 20px; font-weight: bold;">Booking Details</h2>
                <p style="color: #800020; margin: 8px 0;"><strong style="color: #800020;">Venue:</strong> ${data.venueName || 'Your Venue'}</p>
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
                <a href="${(() => {
                  // Always use production URL with bookings tab - App Links will open app if installed, otherwise opens in browser
                  // Include bookingId if available to view specific booking
                  const bookingId = data.bookingId || '';
                  let url = 'https://www.oneeddy.com/profile?tab=bookings';
                  if (bookingId) {
                    url += '&bookingId=' + bookingId;
                  }
                  // Add timestamp to force navigation even if already on profile page
                  url += '&t=' + Date.now();
                  return url;
                })()}" style="background: #FFD700; color: #800020; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; border: 2px solid #800020;">View My Booking</a>
                <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
                  💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
                </p>
              </div>
              
              <p style="color: #800020; font-size: 16px; font-weight: bold;">Thank you for choosing Eddy!</p>
              <p style="color: #800020; font-size: 14px;">Best regards,<br>The Eddy Team</p>
            </div>
            
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #800020; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: none;">
              <p style="color: #800020; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `
        break
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5

              <div style="padding:40px 32px">
                <h2 style="color:#800020;text-align:center;margin:0 0 14px 0">You're Invited to Join Eddy!</h2>
                <p style="text-align:center;color:#555;margin:0 0 24px 0">Hi there! ${data.senderName} thinks you'd love being part of Eddy.</p>

                <div style="background:linear-gradient(135deg,#FFF5E6 0%,#ffffff 100%);border:2px solid #FFD700;border-radius:14px;padding:24px;margin:18px 0">
                  <div style="color:#800020;font-weight:700;font-size:14px;margin-bottom:12px;text-transform:uppercase">Personal Message</div>
                  <div style="color:#666;font-style:italic;font-size:16px;line-height:1.5">
                    "${data.personalMessage || 'Join me on Eddy and discover the best venues in town!'}"
                  </div>
                </div>

                <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin:24px 0">
                  <h3 style="color:#800020;font-size:18px;margin:0 0 12px 0">Your Special Referral Code</h3>
                  <div style="background:#800020;color:#FFD700;font-size:24px;font-weight:bold;text-align:center;padding:12px;border-radius:6px;letter-spacing:2px">
                    ${data.referralCode}
                  </div>
                  <p style="color:#666;font-size:14px;text-align:center;margin:12px 0 0 0">
                    Use this code when signing up to receive special benefits!
                  </p>
                </div>

                <div style="text-align:center;margin-top:32px">
                  <a href="${data.signupUrl}" style="display:inline-block;background:#800020;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:16px">
                    Join Eddy Now
                  </a>
                </div>

                <div style="margin-top:32px;text-align:center;color:#666;font-size:14px">
                  <p>As an Eddy member, you'll enjoy:</p>
                  <ul style="list-style:none;padding:0;margin:12px 0;text-align:left">
                    <li style="margin:8px 0;padding-left:24px;position:relative">
                      <span style="position:absolute;left:0;color:#800020">✓</span>
                      Exclusive access to premium venues
                    </li>
                    <li style="margin:8px 0;padding-left:24px;position:relative">
                      <span style="position:absolute;left:0;color:#800020">✓</span>
                      Special member discounts
                    </li>
                    <li style="margin:8px 0;padding-left:24px;position:relative">
                      <span style="position:absolute;left:0;color:#800020">✓</span>
                      Priority bookings and VIP treatment
                    </li>
                  </ul>
                </div>
              </div>

              <div style="background:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eee">
                <p style="color:#666;font-size:12px;margin:0">
                  This invitation was sent to you by ${data.senderName} via Eddy.
                  <br>If you don't want to receive these emails, you can ignore this message.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      case 'credit-purchase-confirmation':
        console.log('📧 [EMAIL TEMPLATE] Credit purchase confirmation data received:', {
          hasQrCodeUrl: !!data?.qrCodeUrl,
          qrCodeUrl: data?.qrCodeUrl,
          hasQrCodeImage: !!data?.qrCodeImage,
          qrCodeImage: typeof data?.qrCodeImage,
          fullDataKeys: Object.keys(data || {}),
          customerName: data?.customerName,
          amount: data?.amount,
          venueName: data?.venueName
        });
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <title>Credit Purchase Confirmation</title>
            <style>
              .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
                border: 2px solid #FFD700;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                position: relative !important;
                z-index: 1 !important;
                overflow: visible !important;
              }
              .qr-image {
                max-width: 100%;
                height: auto;
                border: 0;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
              }
            </style>
            <!--[if mso]>
            <style type="text/css">
              .qr-section { 
                background-color: #FFF5E6 !important; 
                padding: 20px !important;
                margin: 20px 0 !important;
              }
              .qr-image { 
                display: block !important; 
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                mso-line-height-rule: exactly;
              }
              .qr-container table { 
                width: 100% !important; 
                table-layout: fixed !important;
              }
              .qr-container td {
                width: 200px !important;
                height: 200px !important;
                text-align: center !important;
                vertical-align: middle !important;
                mso-line-height-rule: exactly;
              }
            </style>
            <![endif]-->
            <!--[if !mso]><!-->
            <style type="text/css">
              .qr-section { background-color: #FFF5E6; }
              @media screen and (max-width: 600px) {
                .qr-image { width: 150px !important; height: 150px !important; }
              }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
            </style>
            <!--<![endif]-->
          </head>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333">
            <div style="max-width:600px;margin:0 auto;background:#fff;box-shadow:0 10px 30px rgba(128,0,32,0.08)">
              <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
                <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">CREDIT PURCHASE CONFIRMATION</div>
              </div>

              <div style="padding:40px 32px">
                <h2 style="color:#800020;text-align:center;margin:0 0 14px 0">Credit Purchase Successful!</h2>
                <p style="text-align:center;color:#555;margin:0 0 24px 0">Hi ${data.customerName || 'there'}, your credit purchase has been confirmed.</p>

                <div style="background:linear-gradient(135deg,#FFF5E6 0%,#ffffff 100%);border:2px solid #FFD700;border-radius:14px;padding:24px;margin:18px 0">
                  <div style="color:#800020;font-weight:700;font-size:14px;margin-bottom:12px;text-transform:uppercase">Purchase Details</div>
                  <div style="display:grid;grid-template-columns:1fr;gap:14px">
                    <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
                      <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Amount</div>
                      <div style="color:#666;font-size:16px;font-weight:bold">₦${data.amount.toLocaleString()}</div>
                    </div>
                    <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
                      <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Venue</div>
                      <div style="color:#666;font-size:16px">${data.venueName}</div>
                    </div>
                    <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
                      <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Transaction Date</div>
                      <div style="color:#666;font-size:13px">${new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                <!-- QR Code Section -->
                <div class="qr-section" style="background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important; border: 2px solid #FFD700 !important; border-radius: 15px !important; padding: 30px !important; margin: 30px 0 !important; text-align: center !important; position: relative !important; z-index: 999 !important; overflow: visible !important; display: block !important;">
                  <h3 style="color: #800020; margin-bottom: 20px; font-size: 18px; font-weight: bold;">Your VIP Member QR Code</h3>
                  <p style="color: #666; margin-bottom: 20px; font-size: 14px;">Present this QR code at the venue for walk-in access and credit redemption</p>
                  ${data.qrCodeUrl || data.qrCodeImage ? '<!-- QR Code Access Button --><div style="width: 100%; text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px;"><h4 style="color: #800020; margin: 0 0 15px 0; font-size: 16px;">Your QR Code is Ready</h4><p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">Click the button below to view and save your QR code</p><a href="' + (data.qrCodeUrl || data.qrCodeImage) + '" target="_blank" style="display: inline-block; background: #800020; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">📱 View QR Code</a><p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">Click the button above to access your QR code</p></div>' : '<p style="color: red;">QR Code not available</p>'}
                  <p style="color: #800020; margin-top: 15px; font-size: 12px; font-weight: bold;">VIP Member • ${data.memberTier || 'Premium'}</p>
                </div>

                <div style="text-align:center;margin-top:32px">
                  <a href="${data.dashboardUrl}" style="display:inline-block;background:#800020;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">View Your Credits</a>
                </div>

                <p style="text-align:center;color:#666;margin-top:32px;font-size:13px">
                  Thank you for choosing Eddy. Your credits are now available in your account.
                </p>
              </div>

              <div style="background:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eee">
                <p style="color:#666;font-size:12px;margin:0">
                  If you have any questions, please contact our support team.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      case 'eddys-member-qr':
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <title>Your VIP Member QR Code</title>
            <style>
              .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
                border: 2px solid #FFD700;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                position: relative !important;
                z-index: 1 !important;
                overflow: visible !important;
              }
              .qr-image {
                max-width: 100%;
                height: auto;
                border: 0;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
              }
              .vip-badge {
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                color: #800020;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 12px;
                display: inline-block;
                margin: 10px 0;
              }
            </style>
            <!--[if mso]>
            <style type="text/css">
              .qr-section { 
                background-color: #FFF5E6 !important; 
                padding: 20px !important;
                margin: 20px 0 !important;
              }
              .qr-image { 
                display: block !important; 
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                mso-line-height-rule: exactly;
              }
              .qr-container table { 
                width: 100% !important; 
                table-layout: fixed !important;
              }
              .qr-container td {
                width: 200px !important;
                height: 200px !important;
                text-align: center !important;
                vertical-align: middle !important;
                mso-line-height-rule: exactly;
              }
            </style>
            <![endif]-->
            <!--[if !mso]><!-->
            <style type="text/css">
              @media screen and (max-width: 600px) {
                .qr-image { width: 150px !important; height: 150px !important; }
              }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
              }
            </style>
            <!--<![endif]-->
          </head>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333">
            <div style="max-width:600px;margin:0 auto;background:#fff;box-shadow:0 10px 30px rgba(128,0,32,0.08)">
              <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
                <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">YOUR VIP MEMBER QR CODE</div>
              </div>

              <div style="padding:40px 32px">
                <h2 style="color:#800020;text-align:center;margin:0 0 14px 0">Welcome to Eddy VIP!</h2>
                <p style="text-align:center;color:#555;margin:0 0 24px 0">Hi ${data.customerName || 'VIP Member'}, your exclusive member QR code is ready.</p>

                <!-- VIP Member Badge -->
                <div style="text-align:center;margin-bottom:20px">
                  <span class="vip-badge">${data.memberTier || 'VIP'} MEMBER</span>
                </div>

                <!-- QR Code Section -->
                <div class="qr-section" style="background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important; border: 2px solid #FFD700 !important; border-radius: 15px !important; padding: 30px !important; margin: 30px 0 !important; text-align: center !important; position: relative !important; z-index: 999 !important; overflow: visible !important; display: block !important;">
                  <h3 style="color: #800020; margin-bottom: 20px; font-size: 18px; font-weight: bold;">Your Personal QR Code</h3>
                  <p style="color: #666; margin-bottom: 20px; font-size: 14px;">Present this QR code at any Eddy venue for instant verification and exclusive access</p>
                  ${data.qrCodeUrl || data.qrCodeImage ? '<!-- QR Code Access Button --><div style="width: 100%; text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px;"><h4 style="color: #800020; margin: 0 0 15px 0; font-size: 16px;">Your QR Code is Ready</h4><p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">Click the button below to view and save your QR code</p><a href="' + (data.qrCodeUrl || data.qrCodeImage) + '" target="_blank" style="display: inline-block; background: #800020; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">📱 View QR Code</a><p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">Click the button above to access your QR code</p></div>' : '<p style="color: red;">QR Code not available</p>'}
                  <p style="color: #800020; margin-top: 15px; font-size: 12px; font-weight: bold;">Secure • Private • Exclusive</p>
                </div>

                <!-- Benefits Section -->
                <div style="background:#f8f9fa;padding:24px;border-radius:12px;margin:24px 0">
                  <h4 style="color:#800020;margin:0 0 16px 0;text-align:center">VIP Member Benefits</h4>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
                    <div style="color:#666">✓ Walk-in access</div>
                    <div style="color:#666">✓ Credit redemption</div>
                    <div style="color:#666">✓ Priority seating</div>
                    <div style="color:#666">✓ Exclusive perks</div>
                  </div>
                </div>

                <div style="text-align:center;margin-top:32px">
                  <a href="${data.dashboardUrl}" style="display:inline-block;background:#800020;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Manage Your Account</a>
                </div>

                <p style="text-align:center;color:#666;margin-top:32px;font-size:13px">
                  Keep this QR code safe. It's your key to exclusive access at Eddy venues.
                </p>
              </div>

              <div style="background:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eee">
                <p style="color:#666;font-size:12px;margin:0">
                  Questions? Contact VIP support at info@oneeddy.com
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      case 'booking-confirmation':
        console.log('📱 Processing booking-confirmation template');
        console.log('📱 QR Code data:', {
          hasQrCodeImage: !!data?.qrCodeImage,
          qrCodeImageLength: data?.qrCodeImage?.length || 0,
          qrCodeImageStart: data?.qrCodeImage?.substring(0, 50) || 'N/A'
        });
        console.log('📱 Full data object keys:', Object.keys(data || {}));
        console.log('📱 QR Code image preview:', data?.qrCodeImage?.substring(0, 200) || 'N/A');
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Confirmation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="10" cy="60" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="90" cy="40" r="0.5" fill="%23FFD700" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.3;
        }
        .logo {
            position: relative;
            z-index: 2;
        }
        .logo-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin-bottom: 15px;
            box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
            border: 3px solid #FFD700;
        }
        .brand-name {
            color: #FFF5E6;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .tagline {
            color: #FFF5E6;
            font-size: 14px;
            opacity: 0.9;
            margin-top: 8px;
            font-weight: 300;
            letter-spacing: 1px;
        }
        .content {
            padding: 50px 40px;
            background-color: #ffffff;
        }
        .title {
            color: #800020;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .subtitle {
            color: #555;
            font-size: 16px;
            margin-bottom: 30px;
            text-align: center;
            line-height: 1.7;
        }
        .booking-section {
            background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 35px;
            margin: 35px 0;
            position: relative;
        }
        .booking-section::before {
            content: '🎉';
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFD700;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        .booking-title {
            color: #800020;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .booking-reference {
            background: #800020;
            color: #FFF5E6;
            padding: 15px 25px;
            border-radius: 25px;
            text-align: center;
            margin-bottom: 25px;
            font-weight: bold;
            font-size: 18px;
            letter-spacing: 1px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        .detail-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #FFD700;
        }
        .detail-label {
            color: #800020;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .detail-value {
            color: #666;
            font-size: 14px;
            word-break: break-word;
        }
        .venue-section {
            background: #f8f9fa;
            border-left: 4px solid #FFD700;
            padding: 25px;
            margin: 30px 0;
            border-radius: 8px;
        }
        .venue-title {
            color: #800020;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .venue-description {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .venue-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 13px;
        }
        .venue-detail-item {
            color: #666;
        }
        .venue-detail-label {
            color: #800020;
            font-weight: bold;
            margin-right: 5px;
        }
        .table-info {
            background: rgba(255, 215, 0, 0.1);
            border: 2px solid #FFD700;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .table-number {
            color: #800020;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .table-details {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }
        .special-requests {
            background: rgba(128, 0, 32, 0.05);
            border: 1px solid rgba(128, 0, 32, 0.2);
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        .special-requests-title {
            color: #800020;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .special-requests-text {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .action-button {
            display: inline-block;
            text-decoration: none;
            padding: 16px 30px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            margin: 0 10px 10px 10px;
            box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3);
            border: 2px solid #FFD700;
        }
        .primary-button {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
        }
        .primary-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(128, 0, 32, 0.4);
            background: linear-gradient(135deg, #A71D2A 0%, #800020 100%);
        }
        .secondary-button {
            background: linear-gradient(135deg, #FFD700 0%, #FFF5E6 100%);
            color: #800020;
        }
        .secondary-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 215, 0, 0.4);
            background: linear-gradient(135deg, #FFF5E6 0%, #FFD700 100%);
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        .feature-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid rgba(128, 0, 32, 0.1);
        }
        .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .feature-title {
            color: #800020;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .feature-text {
            color: #666;
            font-size: 12px;
        }
        .important-notice {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid #FFD700;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        .important-notice-text {
            color: #800020;
            font-size: 14px;
            font-weight: bold;
        }
        .qr-section {
            background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }
        .qr-title {
            color: #800020;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .qr-code {
            background: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(128, 0, 32, 0.1);
            border: 2px solid #FFD700;
        }
        .qr-image {
            width: 200px;
            height: 200px;
            display: block;
        }
        .qr-instructions {
            max-width: 400px;
        }
        .qr-text {
            color: #333;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .qr-security-note {
            background: rgba(128, 0, 32, 0.1);
            border: 1px solid #800020;
            border-radius: 8px;
            padding: 12px;
            color: #800020;
            font-size: 12px;
            font-weight: bold;
        }
        .footer {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
            padding: 40px 30px;
            text-align: center;
        }
        .footer-content {
            margin-bottom: 20px;
        }
        .footer-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .footer-text {
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.6;
        }
        .footer-bottom {
            border-top: 1px solid rgba(255, 245, 230, 0.2);
            padding-top: 20px;
            font-size: 12px;
            opacity: 0.8;
            color: #FFF5E6;
        }
        .footer-link {
            color: #FFD700;
            text-decoration: none;
        }
        /* Mobile Responsive */
        @media (max-width: 600px) {
            .email-container { margin: 0; box-shadow: none; }
            .header { padding: 30px 20px; }
            .logo-image { width: 90px; height: 90px; }
            .brand-name { font-size: 24px; }
            .content { padding: 30px 20px; }
            .title { font-size: 24px; }
            .booking-section { padding: 25px 20px; margin: 25px 0; }
            .details-grid { grid-template-columns: 1fr; gap: 15px; }
            .action-button { display: block; margin: 10px 0; padding: 14px 25px; font-size: 15px; }
            .venue-details { grid-template-columns: 1fr; gap: 10px; }
            .features-grid { grid-template-columns: 1fr; gap: 15px; }
            .footer { padding: 30px 20px; }
        }
    </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
    <div class="email-container">
        <!-- Header Section -->
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">EDDYS MEMBERS</h1>
                <p class="tagline">Your Gateway to Exclusive Experiences</p>
            </div>
        </div>
        <!-- Main Content -->
        <div class="content">
            <h2 class="title">Booking Confirmed! </h2>
            <p class="subtitle">
                Congratulations ${data.customerName || 'Valued Customer'}! Your VIP table reservation has been successfully confirmed. 
                Get ready for an unforgettable experience at one of Lagos' most exclusive venues.
            </p>
            <!-- Booking Confirmation Section -->
            <div class="booking-section">
                <h3 class="booking-title">Your Reservation Details</h3>
                <div class="booking-reference">
                    Booking Reference: ${data.bookingReference || 'N/A'}
                </div>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Guest Name</div>
                        <div class="detail-value">${data.customerName || 'Not provided'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact Email</div>
                        <div class="detail-value">${data.customerEmail || 'Not provided'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone Number</div>
                        <div class="detail-value">${data.customerPhone || 'Not provided'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Party Size</div>
                        <div class="detail-value">${data.partySize || '1'} guests</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date & Time</div>
                        <div class="detail-value">${data.bookingDate || 'Not specified'} at ${data.bookingTime || 'Not specified'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${data.bookingDuration || '2'} hours</div>
                    </div>
                </div>
            </div>
            <!-- Table Information -->
            <div class="table-info">
                <div class="table-number">
                    Table ${data.tableNumber || data.table_number || 'TBD'}
                </div>
                <div class="table-details">
                    <strong>${data.tableType || data.table_type || 'VIP Table'}</strong> • Seats up to ${data.tableCapacity || data.table_capacity || '4'} guests<br>
                    ${data.tableLocation || data.table_location || 'Prime location'} • ${data.tableFeatures || data.table_features || 'Premium features'}
                </div>
            </div>
            <!-- Venue Details -->
            <div class="venue-section">
                <h4 class="venue-title">
                    ️ Venue Information
                </h4>
                <div class="venue-description">
                    <strong>${data.venueName || 'Venue Name'}</strong><br>
                    ${data.venueDescription || 'An exclusive venue offering premium dining and entertainment experiences.'}
                </div>
                <div class="venue-details">
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Address:</span>${data.venueAddress || 'Address not provided'}
                    </div>
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Phone:</span>${data.venuePhone || 'Contact not provided'}
                    </div>
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Dress Code:</span>${data.venueDressCode || 'Smart casual'}
                    </div>
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Parking:</span>${data.venueParking || 'Valet available'}
                    </div>
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Cuisine:</span>${data.venueCuisine || 'International'}
                    </div>
                    <div class="venue-detail-item">
                        <span class="venue-detail-label">Hours:</span>${data.venueHours || '6:00 PM - 2:00 AM'}
                    </div>
                </div>
            </div>
            <!-- Special Requests -->
            <div class="special-requests">
                <div class="special-requests-title"> Special Requests & Notes</div>
                <div class="special-requests-text">${data.specialRequests || 'No special requests'}</div>
            </div>
            <!-- Action Buttons -->
            <div class="action-buttons">
                <a href="${data.viewBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button primary-button">
                    📅 VIEW BOOKING DETAILS
                </a>
                <a href="${data.modifyBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button secondary-button">
                    ✏️ MODIFY RESERVATION
                </a>
                <a href="${data.cancelBookingUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="action-button secondary-button">
                    ❌ CANCEL BOOKING
                </a>
            </div>
            <!-- Features Grid -->
            <div class="features-grid">
                <div class="feature-item">
                    <div class="feature-icon">🍾</div>
                    <div class="feature-title">Premium Service</div>
                    <div class="feature-text">Dedicated VIP host</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🎵</div>
                    <div class="feature-title">Perfect Ambiance</div>
                    <div class="feature-text">Curated music & lighting</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🍸</div>
                    <div class="feature-title">Signature Cocktails</div>
                    <div class="feature-text">Exclusive drink menu</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">⭐</div>
                    <div class="feature-title">VIP Treatment</div>
                    <div class="feature-text">Priority seating & service</div>
                </div>
            </div>
            <!-- Important Notice -->
            <div class="important-notice">
                <p class="important-notice-text">
                    ⏰ Please arrive 15 minutes before your reservation time. Late arrivals may result in table reassignment.
                </p>
            </div>
            
            <!-- QR Code Section -->
            <div class="qr-section">
                <h4 class="qr-title">
                    📱 Your Entry QR Code
                </h4>
                <div class="qr-container">
                    <div class="qr-code">
                        ${data.qrCodeImage ? '<img src="' + data.qrCodeImage + '" alt="Venue Entry QR Code" class="qr-image">' : '<p style="color: red;">QR Code not available</p>'}
                    </div>
                    <div class="qr-instructions">
                        <p class="qr-text">
                            <strong>Present this QR code at the venue for entry verification.</strong><br>
                            The venue staff will scan this code to confirm your booking.
                        </p>
                        <div class="qr-security-note">
                            🔒 <strong>Security:</strong> This QR code is unique to your booking and will be validated upon entry.
                        </div>
                    </div>
                </div>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                Need to make changes to your booking? Contact us at 
                <a href="mailto:info@oneeddy.com" style="color: #800020; text-decoration: none; font-weight: bold;">info@oneeddy.com</a>
                or call <a href="tel:${data.venuePhone || ''}" style="color: #800020; text-decoration: none; font-weight: bold;">${data.venuePhone || ''}</a>
            </p>
        </div>
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
                <p class="footer-text">
                    Experience Lagos' finest venues with premium service, exclusive access, 
                    and unforgettable moments. Your VIP journey starts here.
                </p>
            </div>
            <div class="footer-bottom">
                <p style="color: #FFF5E6;">© 2025 Eddys Members. All rights reserved.</p>
                <p style="margin-top: 10px; color: #FFF5E6;">
                    <a href="${data.websiteUrl || Deno.env.get('APP_URL') || ''}" class="footer-link">Visit Website</a> | 
                    <a href="${data.supportUrl || (Deno.env.get('APP_URL') || '') + '/contact'}" class="footer-link">Support</a> | 
                    <a href="${data.unsubscribeUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="footer-link">Unsubscribe</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'admin-venue-submitted':
        html = `
          <h1>New Venue Submission</h1>
          <p>A new venue <strong>"${data.venueName}"</strong> has been submitted and is pending approval.</p>
          <p>Submitted by: ${data.ownerName} (${data.ownerEmail})</p>
          <p>Please review and approve or reject the venue in the admin dashboard.</p>
          <p>Best regards,<br>The Eddy Team</p>
        `;
        break;
      case 'venue-owner-notification':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddy – New Booking Notification</title>
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
        <p style="text-align:center; color:#555; margin-bottom:16px;">A new booking has been placed for <strong>${data.venueName || 'Your Venue'}</strong>.</p>

<<<<<<< HEAD
        <div class="section">
          <h3>Booking Details</h3>
          <div class="row"><span class="label">Booking ID:</span> ${data.bookingId || ''}</div>
          <div class="row"><span class="label">Date:</span> ${data.bookingDate || ''}</div>
          <div class="row"><span class="label">Time:</span> ${data.bookingTime || ''}</div>
          <div class="row"><span class="label">Party Size:</span> ${data.partySize || ''}</div>
          <div class="row"><span class="label">Table:</span> ${data.tableNumber || data.tableName || ''}</div>
          <div class="row"><span class="label">Amount:</span> ${data.totalAmount || ''}</div>
        </div>

        <div class="section">
          <h3>Customer</h3>
          <div class="row"><span class="label">Name:</span> ${data.customerName || ''}</div>
          <div class="row"><span class="label">Email:</span> ${data.customerEmail || ''}</div>
          <div class="row"><span class="label">Phone:</span> ${data.customerPhone || ''}</div>
        </div>

        <div class="cta">
          ${(()=>{
          const url = data.ownerUrl || (Deno.env.get('APP_URL') || '') + '/venue-owner/dashboard';
          return `<a class=\"btn btn-primary\" href=\"${url}\">Open Venue Owner Dashboard</a>`;
        })()}
        </div>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Eddys Members</div>
    </div>
  </body>
</html>`;
        break;
      case 'split-payment-initiation':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Split Payment Initiated</title>
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
    .payment-card { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; position: relative; }
    .payment-card::before { content: '💳'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .payment-id { background: #800020; color: #FFF5E6; padding: 12px 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 16px; letter-spacing: 1px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; word-break: break-word; }
    .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .venue-title { color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .venue-item { color: #666; }
    .venue-label { color: #800020; font-weight: 700; margin-right: 8px; }
    .requests-section { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .requests-title { color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .requests-details { color: #666; font-size: 14px; }
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
      .payment-card { padding: 20px 16px; margin: 16px 0; } 
      .details-grid { grid-template-columns: 1fr; gap: 12px; } 
      .venue-details { grid-template-columns: 1fr; gap: 8px; } 
      .btn { display: block; margin: 12px 0; padding: 12px 24px; font-size: 13px; } 
      .footer { padding: 20px 16px; } 
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
      <h2 class="title">Split Payment Initiated! 🎉</h2>
      <p class="subtitle">Your split payment has been set up successfully for <strong>${data.venueName || 'Your Venue'}</strong></p>
      
      <div class="payment-card">
        <div class="payment-id">Booking ID: ${data.bookingId || 'N/A'}</div>
        
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

        <div class="requests-section">
          <div class="requests-title">Split Payment Requests Sent</div>
          <div class="requests-details">
            ${data.requestsCount || 0} payment requests have been sent to your friends.<br>
            You'll be notified as each payment is completed.
          </div>
        </div>
      </div>

      <div class="venue-section">
        <h4 class="venue-title">Venue Information</h4>
        <div class="venue-details">
          <div class="venue-item">
            <span class="venue-label">Venue:</span> ${data.venueName || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Address:</span> ${data.venueAddress || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Party Size:</span> ${data.guestCount || 'N/A'} guests
          </div>
          <div class="venue-item">
            <span class="venue-label">Contact:</span> ${data.venuePhone || 'N/A'}
          </div>
        </div>
      </div>

      <div class="cta">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn btn-primary">
          📊 View Booking Details
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 24px;">
        Your booking is confirmed! You'll receive updates as your friends complete their payments.<br>
        Contact us if you have any questions.
      </p>
    </div>
    <div class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
        <p class="footer-text">Experience Lagos' finest venues with premium service and exclusive access.</p>
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
</html>`;
        break;
      case 'split-payment-request':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Split Payment Request</title>
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
    .request-card { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; position: relative; }
    .request-card::before { content: '💸'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .request-id { background: #800020; color: #FFF5E6; padding: 12px 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 16px; letter-spacing: 1px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; word-break: break-word; }
    .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .venue-title { color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .venue-item { color: #666; }
    .venue-label { color: #800020; font-weight: 700; margin-right: 8px; }
    .request-section { background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .request-title { color: #800020; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .request-details { color: #666; font-size: 14px; }
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
      .request-card { padding: 20px 16px; margin: 16px 0; } 
      .details-grid { grid-template-columns: 1fr; gap: 12px; } 
      .venue-details { grid-template-columns: 1fr; gap: 8px; } 
      .btn { display: block; margin: 12px 0; padding: 12px 24px; font-size: 13px; } 
      .footer { padding: 20px 16px; } 
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
      <h2 class="title">Split Payment Request! 💸</h2>
      <p class="subtitle"><strong>${data.initiatorName || 'Your friend'}</strong> has invited you to split the cost for <strong>${data.venueName || 'a venue booking'}</strong></p>
      
      <div class="request-card">
        <div class="request-id">Booking ID: ${data.bookingId || 'N/A'}</div>
        
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Your Share</div>
            <div class="detail-value">₦${(data.amount || 0).toLocaleString()}</div>
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

        <div class="request-section">
          <div class="request-title">Payment Request</div>
          <div class="request-details">
            <strong>${data.initiatorName || 'Your friend'}</strong> has requested you to pay <strong>₦${(data.amount || 0).toLocaleString()}</strong><br>
            for this booking. Click the button below to complete your payment.
          </div>
        </div>
      </div>

      <div class="venue-section">
        <h4 class="venue-title">Venue Information</h4>
        <div class="venue-details">
          <div class="venue-item">
            <span class="venue-label">Venue:</span> ${data.venueName || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Address:</span> ${data.venueAddress || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Party Size:</span> ${data.guestCount || 'N/A'} guests
          </div>
          <div class="venue-item">
            <span class="venue-label">Contact:</span> ${data.venuePhone || 'N/A'}
          </div>
        </div>
      </div>

      <div class="cta">
        <a href="${data.paymentUrl || (Deno.env.get('APP_URL') || '') + '/split-payment/' + (data.requestId || '')}" class="btn btn-primary">
          💳 Pay Your Share
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 24px;">
        This is a split payment request from <strong>${data.initiatorName || 'your friend'}</strong>.<br>
        The booking will be confirmed once all payments are completed.
      </p>
    </div>
    <div class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
        <p class="footer-text">Experience Lagos' finest venues with premium service and exclusive access.</p>
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
</html>`;
        break;
      case 'split-payment-complete':
        console.log('📱 Processing split-payment-complete template');
        console.log('📱 QR Code data for split-payment-complete:', {
          hasQrCodeImage: !!data?.qrCodeImage,
          qrCodeImageLength: data?.qrCodeImage?.length || 0,
          qrCodeImageStart: data?.qrCodeImage?.substring(0, 50) || 'N/A'
        });
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eddys Members – Booking Confirmed!</title>
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
    .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .venue-title { color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .venue-item { color: #666; }
    .venue-label { color: #800020; font-weight: 700; margin-right: 8px; }
    .complete-section { background: rgba(0, 128, 0, 0.1); border: 2px solid #00AA00; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .complete-title { color: #00AA00; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .complete-details { color: #666; font-size: 14px; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; letter-spacing: .5px; border: 2px solid #FFD700; box-shadow: 0 6px 18px rgba(128,0,32,.18); }
    .btn-primary { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(128,0,32,.25); }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 24px; text-align: center; }
    .footer-content { margin-bottom: 16px; }
    .footer-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .footer-text { font-size: 14px; opacity: 0.9; line-height: 1.6; }
    .footer-bottom { border-top: 1px solid rgba(255, 245, 230, 0.2); padding-top: 16px; font-size: 12px; opacity: 0.8; }
    .qr-section {
      background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
      border: 2px solid #FFD700;
      border-radius: 15px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      position: relative !important;
      z-index: 1 !important;
      overflow: visible !important;
    }
    .qr-title {
      color: #800020;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .qr-code {
      background: #ffffff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(128, 0, 32, 0.1);
      border: 2px solid #FFD700;
    }
    .qr-image {
      width: 200px;
      height: 200px;
      display: block;
      max-width: 100%;
      height: auto;
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    .qr-instructions {
      max-width: 400px;
    }
    .qr-text {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .qr-security-note {
      background: rgba(128, 0, 32, 0.1);
      border: 1px solid #800020;
      border-radius: 8px;
      padding: 12px;
      color: #800020;
      font-size: 12px;
      font-weight: bold;
    }
    @media (max-width: 600px) { 
      .email-container { margin: 0; box-shadow: none; } 
      .header { padding: 24px 20px; } 
      .logo-image { width: 60px; height: 60px; } 
      .brand { font-size: 20px; } 
      .content { padding: 24px 20px; } 
      .title { font-size: 20px; } 
      .booking-card { padding: 20px 16px; margin: 16px 0; } 
      .details-grid { grid-template-columns: 1fr; gap: 12px; } 
      .venue-details { grid-template-columns: 1fr; gap: 8px; } 
      .btn { display: block; margin: 12px 0; padding: 12px 24px; font-size: 13px; } 
      .footer { padding: 20px 16px; } 
      .qr-section { padding: 20px; margin: 20px 0; }
      .qr-image { width: 150px; height: 150px; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
      <h2 class="title">Booking Confirmed! 🎉</h2>
      <p class="subtitle">All split payments have been completed for <strong>${data.venueName || 'Your Venue'}</strong></p>
      
      <div class="booking-card">
        <div class="booking-id">Booking ID: ${data.bookingId || 'N/A'}</div>
        
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

        <div class="complete-section">
          <div class="complete-title">Booking Status: Fully Confirmed</div>
          <div class="complete-details">
            All split payments have been completed successfully!<br>
            Your booking is now fully confirmed and ready to enjoy.
          </div>
        </div>
      </div>

      <div class="venue-section">
        <h4 class="venue-title">Venue Information</h4>
        <div class="venue-details">
          <div class="venue-item">
            <span class="venue-label">Venue:</span> ${data.venueName || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Address:</span> ${data.venueAddress || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Party Size:</span> ${data.guestCount || 'N/A'} guests
          </div>
          <div class="venue-item">
            <span class="venue-label">Contact:</span> ${data.venuePhone || 'N/A'}
          </div>
        </div>
      </div>

      <!-- QR Code Section -->
      <div class="qr-section" style="background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important; border: 2px solid #FFD700 !important; border-radius: 15px !important; padding: 30px !important; margin: 30px 0 !important; text-align: center !important; position: relative !important; z-index: 999 !important; overflow: visible !important; display: block !important;">
        <h4 class="qr-title">
          📱 Your Entry QR Code
        </h4>
        <div class="qr-container">
          <div class="qr-code">
            ${data.qrCodeImage ? '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="200" style="margin: 0 auto !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; position: relative !important; z-index: 1000 !important; table-layout: fixed;"><tr><td width="200" height="200" style="text-align: center !important; vertical-align: middle !important; position: relative !important; z-index: 1001 !important; width: 200px !important; height: 200px !important;"><img src="' + data.qrCodeImage + '" alt="Venue Entry QR Code" class="qr-image" width="180" height="180" style="display: block !important; width: 180px !important; height: 180px !important; max-width: 180px !important; max-height: 180px !important; border: 0 !important; outline: none !important; text-decoration: none !important; -ms-interpolation-mode: bicubic; position: relative !important; z-index: 1002 !important; visibility: visible !important; opacity: 1 !important; margin: 0 auto !important;"></td></tr></table>' : '<p style="color: red;">QR Code not available</p>'}
          </div>
          <div class="qr-instructions">
            <p class="qr-text">
              <strong>Present this QR code at the venue for entry verification.</strong><br>
              The venue staff will scan this code to confirm your booking.
            </p>
            <div class="qr-security-note">
              🔒 <strong>Security:</strong> This QR code is unique to your booking and will be validated upon entry.
            </div>
          </div>
        </div>
      </div>

      <div class="cta">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn btn-primary">
          📊 View Booking Details
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 24px;">
        Your booking is fully confirmed! Enjoy your experience at ${data.venueName || 'the venue'}.<br>
        Contact us if you have any questions.
      </p>
    </div>
    <div class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
        <p class="footer-text">Experience Lagos' finest venues with premium service and exclusive access.</p>
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
</html>`;
        break;
      case 'split-payment-confirmation':
        console.log('📧 Processing split-payment-confirmation template', {
          to,
          subject,
          dataKeys: Object.keys(data || {}),
          preview: {
            bookingId: data?.bookingId,
            bookingDate: data?.bookingDate,
            bookingTime: data?.bookingTime,
            guestCount: data?.guestCount,
            venueName: data?.venueName,
            venueAddress: data?.venueAddress,
            venuePhone: data?.venuePhone
          }
        });
        console.log('📱 QR Code data for split-payment-confirmation:', {
          hasQrCodeImage: !!data?.qrCodeImage,
          qrCodeImageLength: data?.qrCodeImage?.length || 0,
          qrCodeImageStart: data?.qrCodeImage?.substring(0, 50) || 'N/A',
          fullDataKeys: Object.keys(data || {}),
          qrCodeImageType: typeof data?.qrCodeImage,
          qrCodeImageIsString: typeof data?.qrCodeImage === 'string'
        });
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
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; position: relative; }
    .header::before { content: ''; position: absolute; inset: 0; opacity: .2; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat; }
    .logo { position: relative; z-index: 1; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .subtitle { color: #555; font-size: 16px; text-align: center; margin-bottom: 24px; }
    .payment-card { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; position: relative; }
    .payment-card::before { content: '✅'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .payment-id { background: #800020; color: #FFF5E6; padding: 12px 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 16px; letter-spacing: 1px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #666; font-size: 14px; word-break: break-word; }
    .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .venue-title { color: #800020; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .venue-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .venue-item { color: #666; }
    .venue-label { color: #800020; font-weight: 700; margin-right: 8px; }
    .status-section { background: rgba(255, 165, 0, 0.1); border: 2px solid #FF8C00; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .status-title { color: #FF8C00; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .status-details { color: #666; font-size: 14px; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 28px; font-weight: 700; font-size: 14px; letter-spacing: .5px; border: 2px solid #FFD700; box-shadow: 0 6px 18px rgba(128,0,32,.18); }
    .btn-primary { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(128,0,32,.25); }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 24px; text-align: center; }
    .footer-content { margin-bottom: 16px; }
    .footer-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .footer-text { font-size: 14px; opacity: 0.9; line-height: 1.6; }
    .footer-bottom { border-top: 1px solid rgba(255, 245, 230, 0.2); padding-top: 16px; font-size: 12px; opacity: 0.8; }
    .qr-section {
      background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
      border: 2px solid #FFD700;
      border-radius: 15px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      position: relative !important;
      z-index: 1 !important;
      overflow: visible !important;
    }
    .qr-title {
      color: #800020;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .qr-code {
      background: #ffffff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(128, 0, 32, 0.1);
      border: 2px solid #FFD700;
    }
    .qr-image {
      width: 200px;
      height: 200px;
      display: block;
      max-width: 100%;
      height: auto;
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    .qr-instructions {
      max-width: 400px;
    }
    .qr-text {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .qr-security-note {
      background: rgba(128, 0, 32, 0.1);
      border: 1px solid #800020;
      border-radius: 8px;
      padding: 12px;
      color: #800020;
      font-size: 12px;
      font-weight: bold;
    }
    @media (max-width: 600px) { 
      .email-container { margin: 0; box-shadow: none; } 
      .header { padding: 24px 20px; } 
      .logo-image { width: 60px; height: 60px; } 
      .brand { font-size: 20px; } 
      .content { padding: 24px 20px; } 
      .title { font-size: 20px; } 
      .payment-card { padding: 20px 16px; margin: 16px 0; } 
      .details-grid { grid-template-columns: 1fr; gap: 12px; } 
      .venue-details { grid-template-columns: 1fr; gap: 8px; } 
      .btn { display: block; margin: 12px 0; padding: 12px 24px; font-size: 13px; } 
      .footer { padding: 20px 16px; } 
      .qr-section { padding: 20px; margin: 20px 0; }
      .qr-image { width: 150px; height: 150px; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
      <h2 class="title">Payment Confirmed! ✅</h2>
      <p class="subtitle">Your payment has been processed for <strong>${data.venueName || 'Your Venue'}</strong></p>
      
      <div class="payment-card">
        <div class="payment-id">Booking ID: ${data.bookingId || 'N/A'}</div>
        
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

        <div class="status-section">
          <div class="status-title">Payment Status: Confirmed</div>
          <div class="status-details">
            Your payment has been successfully processed.<br>
            <strong>Booking Reference: ${data.bookingId || 'N/A'}</strong><br>
            The booking will be fully confirmed once all split payments are completed.
          </div>
        </div>
      </div>

      <div class="venue-section">
        <h4 class="venue-title">Venue Information</h4>
        <div class="venue-details">
          <div class="venue-item">
            <span class="venue-label">Venue:</span> ${data.venueName || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Address:</span> ${data.venueAddress || 'N/A'}
          </div>
          <div class="venue-item">
            <span class="venue-label">Party Size:</span> ${data.guestCount || 'N/A'} guests
          </div>
          <div class="venue-item">
            <span class="venue-label">Contact:</span> ${data.venuePhone || 'N/A'}
          </div>
        </div>
      </div>

      <!-- QR Code Section -->
      <div class="qr-section" style="background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important; border: 2px solid #FFD700 !important; border-radius: 15px !important; padding: 30px !important; margin: 30px 0 !important; text-align: center !important; position: relative !important; z-index: 999 !important; overflow: visible !important; display: block !important;">
        <h4 class="qr-title">
          📱 Your Entry QR Code
        </h4>
        <div class="qr-container">
          <div class="qr-code">
            ${data.qrCodeImage ? '<img src="' + data.qrCodeImage + '" alt="Venue Entry QR Code" class="qr-image">' : '<p style="color: red;">QR Code not available - Data: ' + JSON.stringify({
          hasQrCodeImage: !!data?.qrCodeImage,
          qrCodeImageLength: data?.qrCodeImage?.length || 0
        }) + '</p>'}
          </div>
          <div class="qr-instructions">
            <p class="qr-text">
              <strong>Present this QR code at the venue for entry verification.</strong><br>
              The venue staff will scan this code to confirm your booking.
            </p>
            <div class="qr-security-note">
              🔒 <strong>Security:</strong> This QR code is unique to your booking and will be validated upon entry.
            </div>
          </div>
        </div>
      </div>

      <div class="cta">
        <a href="${data.dashboardUrl || (Deno.env.get('APP_URL') || '') + '/profile'}" class="btn btn-primary">
          📊 View Booking Details
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 24px;">
        Your payment has been processed successfully!<br>
        <strong>Booking Reference: ${data.bookingId || 'N/A'}</strong><br>
        The booking will be fully confirmed once all split payments are completed.<br>
        Contact us if you have any questions.
      </p>
    </div>
    <div class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Thank You for Choosing Eddys Members</h3>
        <p class="footer-text">Experience Lagos' finest venues with premium service and exclusive access.</p>
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
</html>`;
        break;
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
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
          <div class="table-number">Table ${data.tableNumber || data.table_number || 'TBD'}</div>
          <div class="table-details">
            <strong>${data.tableType || data.table_type || 'VIP Table'}</strong> • Seats up to ${data.tableCapacity || data.table_capacity || '4'} guests<br>
            Please prepare this table for your guests
          </div>
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
</html>`;
        break;
=======
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
                <a href="${(() => {
                  // Always use production URL - App Links will open app if installed, otherwise opens in browser
                  const url = data.viewUrl || data.adminUrl || 'https://www.oneeddy.com/admin/venue-approvals';
                  // Ensure we use www.oneeddy.com for App Links
                  return url.replace('oneeddy.com', 'www.oneeddy.com').replace('http://', 'https://');
                })()}" style="background: #FFD700; color: #800020; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; border: 2px solid #800020;">🏢 VIEW FULL DETAILS</a>
                <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
                  💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
                </p>
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
                <img src="https://www.oneeddy.com/logo.png" alt="Eddys Members Logo" class="logo-image">
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
                <a href="${data.registrationUrl || `https://www.oneeddy.com/venue-owner/login?approved=true&email=${encodeURIComponent(data.email)}`}" class="cta-button">
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

>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
      case 'venue-owner-invitation':
        // Use Supabase's built-in inviteUserByEmail function to trigger "Confirm signup" template
        try {
          const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(data.email, {
            redirectTo: `https://www.oneeddy.com/venue-owner/register`,
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
          return new Response(JSON.stringify({
            success: true,
            message: 'Invitation email sent via Supabase Confirm signup template',
            data: inviteData
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 200
          });
        } catch (inviteError) {
          console.error('Error sending Supabase invitation:', inviteError);
          throw new Error(`Failed to send Supabase invitation: ${inviteError.message}`);
        }
<<<<<<< HEAD
      case 'admin-venue-owner-registration':
=======
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
        <a href="https://www.oneeddy.com/profile?tab=wallet" style="display:inline-block;background:#FFD700;color:#800020;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;border:2px solid #800020">View Your Credits</a>
        <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
          💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
        </p>
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
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
<<<<<<< HEAD
  <title>Eddy – New Venue Owner Registration</title>
=======
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
      <!-- QR code removed from split payment initiation email - QR codes are only sent when all payments are complete -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${(() => {
          // Always use production URL with bookings tab - force navigation with timestamp
          const bookingId = data.bookingId || '';
          let url = 'https://www.oneeddy.com/profile?tab=bookings';
          if (bookingId) {
            url += '&bookingId=' + bookingId;
          }
          // Add timestamp to force navigation even if already on profile page
          url += '&t=' + Date.now();
          return url;
        })()}" class="btn">📊 View Booking Details</a>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'split-payment-request':
        console.log('📧 Processing split-payment-request template', {
          recipientEmail: to,
          recipientName: data?.recipientName,
          initiatorName: data?.initiatorName,
          venueName: data?.venueName,
          amount: data?.amount,
          requestId: data?.requestId
        });
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
    .brand { color: #800020; background: #FFFFFF; padding: 8px 16px; border-radius: 4px; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; display: inline-block; }
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
      <!-- QR code removed from split payment request email - QR codes are only sent when all payments are complete -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${(() => {
          // Always use production URL - force navigation with timestamp
          // App Links will automatically open the app if installed, otherwise opens in browser
          const bookingId = data.bookingId || '';
          const requestId = data.requestId || '';
          let url;
          if (data.paymentUrl && !data.paymentUrl.includes('localhost')) {
            // Use provided paymentUrl if it's a production URL
            url = data.paymentUrl.replace('oneeddy.com', 'www.oneeddy.com');
          } else if (bookingId && requestId) {
            // Construct URL from bookingId and requestId
            url = 'https://www.oneeddy.com/split-payment/' + bookingId + '/' + requestId;
          } else {
            // Fallback to profile
            url = 'https://www.oneeddy.com/profile?tab=bookings';
          }
          // Add timestamp to force navigation even if already on the page
          url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
          return url;
        })()}" class="btn">💳 Pay Your Share</a>
        <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
          💡 <strong>Tip:</strong> Open this link on your phone to pay directly in the Eddy app!
        </p>
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
        <a href="${(() => {
          // Always use production URL with bookings tab - force navigation with timestamp
          const bookingId = data.bookingId || '';
          let url = 'https://www.oneeddy.com/profile?tab=bookings';
          if (bookingId) {
            url += '&bookingId=' + bookingId;
          }
          // Add timestamp to force navigation even if already on profile page
          url += '&t=' + Date.now();
          return url;
        })()}" class="btn">📊 View Booking Details</a>
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
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(128,0,32,0.08); }
<<<<<<< HEAD
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
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
=======
    .header { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); padding: 32px 24px; text-align: center; }
    .logo-image { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 6px 16px rgba(255,215,0,.25); margin-bottom: 10px; }
    .brand { color: #FFF5E6; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; }
    .title { color: #800020; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; }
    .payment-card { background: #FFFAF0; border: 2px solid #FFD700; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .detail-item { background: #FFF8E7; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .detail-value { color: #333333; font-size: 16px; font-weight: 700; }
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
        <div style="background: #F0F9FF; border: 2px solid #0066CC; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="color: #0066CC; font-size: 18px; font-weight: 700; margin-bottom: 12px;">✓ Payment Status: Confirmed</div>
          <div style="color: #333333; font-size: 14px; line-height: 1.6;">Your payment has been successfully processed. The booking will be fully confirmed once all split payments are completed.</div>
        </div>
      </div>
    ${data.qrCodeImage ? `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: #FFFAF0; border: 2px solid #FFD700; border-radius: 12px; padding: 18px 20px;">
        <div style="color: #800020; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Your Booking QR Code</div>
        <img src="${data.qrCodeImage}" alt="Booking QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 12px; border: 2px solid #800020;">
        <p style="color: #333333; font-size: 13px; margin-top: 12px; font-weight: bold;">Present this QR code at the venue when you arrive.</p>
      </div>
    </div>
    ` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${(() => {
          // Always use production URL with bookings tab - force navigation with timestamp
          const bookingId = data.bookingId || '';
          let url = 'https://www.oneeddy.com/profile?tab=bookings';
          if (bookingId) {
            url += '&bookingId=' + bookingId;
          }
          // Add timestamp to force navigation even if already on profile page
          url += '&t=' + Date.now();
          return url;
        })()}" class="btn">📊 View Booking Details</a>
        <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
          💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
        break

      case 'venue-owner-booking-notification': {
        const placeholderEmail = 'info@oneeddy.com';
        let ownerEmail = data.ownerEmail?.trim() || '';
        const venueId = data.venueId || data.venue_id;

        if (!ownerEmail || ownerEmail.toLowerCase() === placeholderEmail) {
          if (venueId) {
            // Try to get venue owner email from venues table first
            const { data: venueRow, error: venueFetchError } = await supabaseClient
              .from('venues')
              .select('contact_email, contact_name, owner_id')
              .eq('id', venueId)
              .maybeSingle();

            if (!venueFetchError && venueRow) {
              // Try to get venue owner using the owner_id
              if (venueRow.owner_id) {
                const { data: ownerDataList, error: ownerError } = await supabaseClient
                  .from('venue_owners')
                  .select('owner_email, owner_name, email')
                  .eq('user_id', venueRow.owner_id);

                if (!ownerError && ownerDataList && ownerDataList.length > 0) {
                  const ownerData = ownerDataList[0];
                  ownerEmail = ownerData.owner_email || ownerData.email || venueRow.contact_email;
                  data.venueOwnerName = data.venueOwnerName || ownerData.owner_name;
                  data.venueEmail = data.venueEmail || venueRow.contact_email || ownerEmail;
                } else {
                  // Fallback to venue contact email
                  ownerEmail = venueRow.contact_email;
                  data.venueEmail = data.venueEmail || venueRow.contact_email;
                }
              } else {
                // No owner_id, use venue contact email
                ownerEmail = venueRow.contact_email;
                data.venueEmail = data.venueEmail || venueRow.contact_email;
              }
            }
          }
        }

        // If still no owner email or it's the placeholder, skip sending but don't error
        if (!ownerEmail || ownerEmail.toLowerCase() === placeholderEmail) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Skipped venue owner notification - no venue owner email available',
              skipped: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Fetch table information if tableInfo is missing or shows "Table not specified" and we have bookingId
        if ((!data.tableInfo || data.tableInfo === 'Table not specified' || data.tableInfo === 'N/A') && data.bookingId) {
          try {
            const { data: bookingData, error: bookingError } = await supabaseClient
              .from('bookings')
              .select('table_id')
              .eq('id', data.bookingId)
              .maybeSingle();
            
            if (!bookingError && bookingData?.table_id) {
              const { data: tableData, error: tableError } = await supabaseClient
                .from('venue_tables')
                .select('table_number')
                .eq('id', bookingData.table_id)
                .single();
              
              if (!tableError && tableData?.table_number) {
                data.tableInfo = `Table ${tableData.table_number}`;
              }
            }
          } catch (err) {
            console.error('Error fetching table information in Edge Function:', err);
            // Keep existing tableInfo or default
          }
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
        <a href="${(() => {
          // Always use production URL - App Links will open app if installed, otherwise opens in browser
          // Include bookingId if available to view specific booking
          const bookingId = data.bookingId || '';
          if (bookingId) {
            return 'https://www.oneeddy.com/venue-owner/dashboard?bookingId=' + bookingId;
          }
          return 'https://www.oneeddy.com/venue-owner/dashboard';
        })()}" class="btn">📊 View Booking in Dashboard</a>
        <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
          💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
        </p>
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
                <a href="${(() => {
                  // Always use production URL with bookings tab - force navigation with timestamp
                  const bookingId = data.bookingId || '';
                  let url = 'https://www.oneeddy.com/profile?tab=bookings';
                  if (bookingId) {
                    url += '&bookingId=' + bookingId;
                  }
                  // Add timestamp to force navigation even if already on profile page
                  url += '&t=' + Date.now();
                  return url;
                })()}" class="action-button">View My Bookings</a>
                <a href="https://www.oneeddy.com/venues" class="action-button">Book Another Venue</a>
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
                <a href="${(() => {
                  // Always use production URL - App Links will open app if installed, otherwise opens in browser
                  const url = data.viewUrl || (Deno.env.get('APP_URL') || 'https://www.oneeddy.com') + '/admin/venue-approvals';
                  // Ensure we use www.oneeddy.com for App Links
                  return url.replace('oneeddy.com', 'www.oneeddy.com').replace('http://', 'https://');
                })()}" class="cta-button">VIEW FULL DETAILS</a>
                <p style="color: #800020; font-size: 12px; margin-top: 12px; text-align: center;">
                  💡 <strong>Tip:</strong> Open this link on your phone to view in the Eddy app!
                </p>
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
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <img class="logo-image" src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddy" />
        <div class="brand">EDDYS MEMBERS</div>
      </div>
    </div>
    <div class="content">
      <div class="title">New Venue Owner Registration</div>
      <div class="subtitle">A new venue owner has just completed registration. Review their details below.</div>

<<<<<<< HEAD
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
          <div class="item"><div class="label">Address</div><div class="value">${data.venueAddress || ''}${data.venueCity ? ', ' + data.venueCity : ''}</div></div>
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
      <div>Thank you for keeping the Eddy community high-quality.</div>
      <div class="foot-note">© 2025 Eddys Members. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
        break;
      case 'signup-confirmation':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Eddy - Confirm Your Account</title>
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
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
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
            <h2 class="welcome-title">Welcome to Eddy!</h2>
            <p class="welcome-text">
                Hi ${data.email}! Thank you for joining Eddy - your premier destination for exclusive venue bookings in Lagos, Nigeria.
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
                <h3 style="color: #800020; margin-bottom: 20px;">Get the Eddy Mobile App</h3>
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
</html>`;
        break;
      case 'venue-owner-signup':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Eddy - Venue Owner Registration</title>
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
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <img src="https://vipclub.com/logo.png" alt="Eddy Logo" class="logo-image">
                <h1 class="brand-name">Eddy</h1>
                <p class="tagline">Exclusive Venue Bookings</p>
            </div>
        </div>
        
        <div class="content">
            <h2 class="welcome-title">Welcome to Eddy!</h2>
            <p class="welcome-text">
                Hi ${data.ownerName || data.email}! Thank you for registering your venue "${data.venueName}" with Eddy.
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
                <h3 style="color: #800020; margin-bottom: 20px;">Get the Eddy Mobile App</h3>
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
</html>`;
        break;
      case 'venue-owner-application':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Venue Owner Application</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
            padding: 40px 30px 30px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="10" cy="60" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="90" cy="40" r="0.5" fill="%23FFD700" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.3;
        }
        .logo {
            position: relative;
            z-index: 2;
        }
        .logo-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin-bottom: 15px;
            box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
            border: 3px solid #FFD700;
        }
        .brand-name {
            color: #FFF5E6;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .tagline {
            color: #FFF5E6;
            font-size: 14px;
            opacity: 0.9;
            margin-top: 8px;
            font-weight: 300;
            letter-spacing: 1px;
        }
        .content {
            padding: 40px 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            color: #800020;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #FFD700;
            padding-bottom: 8px;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
        }
        .detail-label {
            font-weight: 600;
            color: #800020;
            min-width: 120px;
            margin-right: 15px;
        }
        .detail-value {
            color: #333;
            flex: 1;
        }
        .venue-card {
            background-color: #f8f9fa;
            border: 2px solid #FFD700;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .venue-name {
            font-size: 18px;
            font-weight: bold;
            color: #800020;
            margin-bottom: 10px;
        }
        .venue-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        .venue-detail {
            font-size: 14px;
        }
        .venue-detail strong {
            color: #800020;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(139, 38, 53, 0.2);
            border: 2px solid #FFD700;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(139, 38, 53, 0.3);
        }
        .footer {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
            padding: 40px 30px;
            text-align: center;
        }
        .footer h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .footer p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
            line-height: 1.5;
        }
        .footer-links {
            margin-top: 20px;
        }
        .footer-links a {
            color: #FFD700;
            text-decoration: none;
            margin: 0 10px;
            font-weight: 500;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        .urgency-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .urgency-note strong {
            color: #800020;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .venue-details {
                grid-template-columns: 1fr;
            }
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
            }
            .detail-label {
                min-width: auto;
                margin-bottom: 5px;
            }
        }
    </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">EDDYS MEMBERS</h1>
                <p class="tagline">Admin Dashboard</p>
            </div>
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
                <p style="margin: 10px 0; color: #666;">${data.venueDescription || 'No description provided'}</p>
                <div class="venue-details">
                    <div class="venue-detail"><strong>Type:</strong> ${data.venueType || 'Not specified'}</div>
                    <div class="venue-detail"><strong>Capacity:</strong> ${data.venueCapacity || 'Not specified'} guests</div>
                    <div class="venue-detail"><strong>Location:</strong> ${data.venueAddress || 'Not provided'}</div>
                    <div class="venue-detail"><strong>Price Range:</strong> ${data.priceRange || 'Not specified'}</div>
                    <div class="venue-detail"><strong>Hours:</strong> ${data.openingHours || 'Not provided'}</div>
                    <div class="venue-detail"><strong>Contact:</strong> ${data.venuePhone || 'Not provided'}</div>
                </div>
            </div>
            <div style="text-align: center;">
                <a href="${data.viewUrl || (Deno.env.get('APP_URL') || 'https://oneeddy.com') + '/admin/venue-approvals'}" class="cta-button">
                     VIEW FULL DETAILS
                </a>
            </div>
            <div class="urgency-note">
                <strong>⏰ Please review and respond to this application within 48 hours</strong>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">
                Questions about this application? Contact the Eddys Members development team at <strong>info@oneeddy.com</strong>
            </p>
        </div>
        <div class="footer">
            <h3>Eddys Members Admin System</h3>
            <p>Manage venue partnerships and maintain the highest standards for Lagos' most exclusive venue booking platform. Every approval shapes the Eddys Members experience.</p>
            <div class="footer-links">
                <a href="${Deno.env.get('APP_URL') || 'https://oneeddy.com'}/admin">Admin Dashboard</a> |
                <a href="mailto:info@oneeddy.com">Support</a> |
                <a href="${Deno.env.get('APP_URL') || 'https://oneeddy.com'}/docs">Documentation</a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                © 2025 Eddys Members Nigeria. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'booking-cancellation-customer':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Cancelled</title>
    <style>
        /* Use the same styles as booking-confirmation */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23FFD700" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="10" cy="60" r="0.5" fill="%23FFD700" opacity="0.15"/><circle cx="90" cy="40" r="0.5" fill="%23FFD700" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.3;
        }
        .logo {
            position: relative;
            z-index: 2;
        }
        .logo-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin-bottom: 15px;
            box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
            border: 3px solid #FFD700;
        }
        .brand-name {
            color: #FFF5E6;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .tagline {
            color: #FFF5E6;
            font-size: 14px;
            opacity: 0.9;
            margin-top: 8px;
            font-weight: 300;
            letter-spacing: 1px;
        }
        .content {
            padding: 50px 40px;
            background-color: #ffffff;
        }
        .title {
            color: #800020;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .subtitle {
            color: #555;
            font-size: 16px;
            margin-bottom: 30px;
            text-align: center;
            line-height: 1.7;
        }
        .cancellation-section {
            background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 35px;
            margin: 35px 0;
            position: relative;
        }
        .cancellation-section::before {
            content: '❌';
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFD700;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        .refund-notice {
            background: rgba(34, 197, 94, 0.1);
            border: 2px solid #22c55e;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .refund-amount {
            color: #22c55e;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .refund-details {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }
        /* Include other styles from booking-confirmation */
    </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
    <div class="email-container">
        <!-- Header Section -->
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">EDDYS MEMBERS</h1>
                <p class="tagline">Your Gateway to Exclusive Experiences</p>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <h2 class="title">Booking Cancelled</h2>
            <p class="subtitle">
                Hi ${data.customerName || 'Valued Customer'}, your booking at ${data.venueName || 'the venue'} has been successfully cancelled.
            </p>
            
            <!-- Cancellation Details Section -->
            <div class="cancellation-section">
                <h3 class="booking-title">Cancelled Booking Details</h3>
                <div class="booking-reference">
                    Booking Reference: ${data.bookingId || 'N/A'}
                </div>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Venue</div>
                        <div class="detail-value">${data.venueName || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${data.bookingDate ? new Date(data.bookingDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'N/A'}</div>
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
            <!-- Refund Information -->
            <div class="refund-notice">
                <div class="refund-amount">₦${(data.refundAmount || 0).toLocaleString()} Refund Processed</div>
                <div class="refund-details">
                    Your refund has been processed and will appear in your account within 5-10 business days.
                    The refund will be credited to the same payment method used for the original booking.
                </div>
            </div>
            ` : `
            <div class="important-notice">
                <div class="important-notice-text">
                    No payment was processed for this booking, so no refund is needed.
                </div>
            </div>
            `}
            
            <!-- Action Buttons -->
            <div class="action-buttons">
                <a href="${data.dashboardUrl || 'https://oneeddy.com/profile'}" class="action-button primary-button">
                    View My Bookings
                </a>
                <a href="https://oneeddy.com/venues" class="action-button secondary-button">
                    Book Another Venue
                </a>
            </div>
        </div>
        
        <!-- Footer Section -->
        <div class="footer">
            <div class="footer-content">
                <div class="footer-title">Need Help?</div>
                <div class="footer-text">
                    If you have any questions about your cancellation or refund, our support team is here to help.
                    Contact us at <a href="mailto:support@oneeddy.com" class="footer-link">support@oneeddy.com</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 Eddys Members. All rights reserved.</p>
                <p>Lagos, Nigeria | <a href="https://oneeddy.com" class="footer-link">oneeddy.com</a></p>
            </div>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'booking-cancellation-venue':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eddys Members - Booking Cancellation Notice</title>
    <style>
        /* Same styles as above */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 10px 30px rgba(128, 0, 32, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .logo-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin-bottom: 15px;
            box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
            border: 3px solid #FFD700;
        }
        .brand-name {
            color: #FFF5E6;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .content {
            padding: 50px 40px;
            background-color: #ffffff;
        }
        .title {
            color: #800020;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .subtitle {
            color: #555;
            font-size: 16px;
            margin-bottom: 30px;
            text-align: center;
            line-height: 1.7;
        }
        .cancellation-section {
            background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 35px;
            margin: 35px 0;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        .detail-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #FFD700;
        }
        .detail-label {
            color: #800020;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .detail-value {
            color: #666;
            font-size: 14px;
        }
        .footer {
            background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
            color: #FFF5E6;
            padding: 40px 30px;
            text-align: center;
        }
    </style>
  <!--[if mso]>
  <style type="text/css">
    .qr-section { 
      background-color: #FFF5E6 !important; 
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    .qr-image { 
      display: block !important; 
      width: 180px !important;
      height: 180px !important;
      max-width: 180px !important;
      max-height: 180px !important;
    }
    .qr-container table { 
      width: 100% !important; 
      table-layout: fixed !important;
    }
    .qr-container td {
      width: 200px !important;
      height: 200px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    .qr-section { background-color: #FFF5E6; }
    @media screen and (max-width: 600px) {
      .qr-image { width: 150px !important; height: 150px !important; }
    }
              /* Gmail-specific overrides */
              #kins_root .qr-section,
              #kins-kins-popup .qr-section,
              div[id*="kins"] .qr-section {
                background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%) !important;
                border: 2px solid #FFD700 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                margin: 30px 0 !important;
                text-align: center !important;
                position: relative !important;
                z-index: 999 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              #kins_root .qr-image,
              #kins-kins-popup .qr-image,
              div[id*="kins"] .qr-image,
              img[alt*="QR"] {
                display: block !important;
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                position: relative !important;
                z-index: 1000 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              /* Force Gmail to show QR code images */
              img[src*="data:image/png;base64"],
              img[alt="QR Code"] {
                display: block !important;
                width: 160px !important;
                height: 160px !important;
                max-width: 160px !important;
                max-height: 160px !important;
                border: 0 !important;
                margin: 0 auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
              }
              /* Gmail fallback container */
              div[style*="display: inline-block"] {
                display: inline-block !important;
                width: 180px !important;
                height: 180px !important;
                background: white !important;
                border: 2px solid #FFD700 !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 0 auto !important;
              }
              /* Force Gmail to respect image dimensions */
              img {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
              }
  </style>
  <!--<![endif]-->
</head>
<body>
    <div class="email-container">
        <!-- Header Section -->
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
                <h1 class="brand-name">EDDYS MEMBERS</h1>
                <p class="tagline">Your Gateway to Exclusive Experiences</p>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <h2 class="title">Booking Cancellation Notice</h2>
            <p class="subtitle">
                A booking at ${data.venueName || 'your venue'} has been cancelled by the customer.
            </p>
            
            <!-- Cancellation Details -->
            <div class="cancellation-section">
                <h3 class="booking-title">Cancelled Booking Details</h3>
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
                    <div class="refund-amount">₦${(data.refundAmount || 0).toLocaleString()} Refunded</div>
                    <div class="refund-details">
                        The customer's payment has been automatically refunded through Stripe.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <div class="footer-title">Eddys Members</div>
                <div class="footer-text">
                    Managing premium venue bookings across Lagos
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'qr-scan-notification':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Scanned - Eddys Members</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #5B0202 0%, #8B1538 100%); padding: 30px; text-align: center; border-top: 6px solid #5B0202; }
        .logo { color: #FFD700; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
        .content { padding: 40px 30px; }
        .title { color: #5B0202; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 30px; }
        .welcome-box { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 2px solid #28a745; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; }
        .welcome-title { font-size: 22px; font-weight: bold; color: #155724; margin-bottom: 15px; }
        .welcome-text { font-size: 18px; color: #155724; }
        .table-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px; }
        .table-label { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 10px; }
        .table-number { color: #5B0202; font-size: 28px; font-weight: bold; }
        .scan-time { font-size: 14px; color: #666; margin-top: 10px; }
        .security-note { border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; }
        .security-text { font-size: 12px; color: #6c757d; margin-bottom: 8px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">✅ QR CODE SCANNED</div>
        </div>
        
        <div class="content">
            <h1 class="title">✅ QR Code Scanned</h1>
            
            <div class="welcome-box">
                <div class="welcome-title">🎉 Welcome to ${data.venueName}!</div>
                <div class="welcome-text">Your table is ready. Please enjoy your experience!</div>
            </div>
            
            <div class="table-box">
                <div class="table-label">🪑 Your Table:</div>
                <div class="table-number">${data.tableNumber}</div>
                <div class="scan-time">Scanned at ${data.scanTime}</div>
            </div>
            
            <div class="security-note">
                <p class="security-text"><strong>Security Notification:</strong> This is an automated security notification to confirm your entry.</p>
                <p class="security-text">If you did not scan your QR code, please contact <a href="mailto:security@oneeddy.com" style="color: #5B0202;">security@oneeddy.com</a></p>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2025 Eddys Members. All rights reserved.</p>
            <p>Managing premium venue bookings across Lagos</p>
        </div>
    </div>
</body>
</html>`;
        break;
      case 'split-payment-venue-notification':
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Split Payment Booking - Eddys Members</title>
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
    .title { color: #800020; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
    .subtitle { color: #555; font-size: 16px; margin-bottom: 30px; text-align: center; line-height: 1.7; }
    .booking-section { background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 15px; padding: 35px; margin: 35px 0; position: relative; }
    .booking-section::before { content: '💰'; position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #FFD700; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .booking-title { color: #800020; font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .detail-label { color: #800020; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .detail-value { color: #666; font-size: 14px; word-break: break-word; }
    .venue-section { background: #f8f9fa; border-left: 4px solid #FFD700; padding: 25px; margin: 30px 0; border-radius: 8px; }
    .venue-title { color: #800020; font-weight: bold; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; }
    .venue-description { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .important-notice { background: rgba(255, 215, 0, 0.1); border: 1px solid #FFD700; border-radius: 10px; padding: 20px; margin: 25px 0; text-align: center; }
    .important-notice-text { color: #800020; font-size: 14px; font-weight: bold; }
    .action-buttons { text-align: center; margin: 30px 0; }
    .action-button { display: inline-block; text-decoration: none; padding: 16px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; letter-spacing: 1px; transition: all 0.3s ease; margin: 0 10px 10px 10px; box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3); border: 2px solid #FFD700; }
    .primary-button { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; }
    .primary-button:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(128, 0, 32, 0.4); background: linear-gradient(135deg, #A71D2A 0%, #800020 100%); }
    .footer { background: linear-gradient(135deg, #800020 0%, #A71D2A 100%); color: #FFF5E6; padding: 40px 30px; text-align: center; }
    .footer-content { margin-bottom: 20px; }
    .footer-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
    .footer-text { font-size: 14px; opacity: 0.9; line-height: 1.6; }
    .footer-bottom { border-top: 1px solid rgba(255, 245, 230, 0.2); padding-top: 20px; font-size: 12px; opacity: 0.8; color: #FFF5E6; }
    .footer-link { color: #FFD700; text-decoration: none; }
    @media (max-width: 600px) {
      .email-container { margin: 0; box-shadow: none; }
      .header { padding: 30px 20px; }
      .logo-image { width: 90px; height: 90px; }
      .brand-name { font-size: 24px; }
      .content { padding: 30px 20px; }
      .title { font-size: 24px; }
      .booking-section { padding: 25px 20px; margin: 25px 0; }
      .details-grid { grid-template-columns: 1fr; gap: 15px; }
      .action-button { display: block; margin: 10px 0; padding: 14px 25px; font-size: 15px; }
      .footer { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header Section -->
    <div class="header">
      <div class="logo">
        <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="Eddys Members Logo" class="logo-image">
        <h1 class="brand-name">EDDYS MEMBERS</h1>
        <p class="tagline">Your Gateway to Exclusive Experiences</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2 class="title">New Split Payment Booking!</h2>
      <p class="subtitle">
        A customer has initiated a split payment booking for your venue.
      </p>

      <!-- Booking Details Section -->
      <div class="booking-section">
        <h3 class="booking-title">📋 Booking Details</h3>
        
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Venue</div>
            <div class="detail-value">${data.venueName || 'Venue'}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Initiator</div>
            <div class="detail-value">${data.customerName || data.initiatorName || 'Customer'}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Booking Date</div>
            <div class="detail-value">${data.bookingDate || 'Date not specified'}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">${data.startTime || ''} ${data.endTime ? ' - ' + data.endTime : ''}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${data.totalAmount ? data.totalAmount.toLocaleString() : '0'}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Number of Splits</div>
            <div class="detail-value">${data.splitPaymentCount || data.numberOfSplits || '1'}</div>
          </div>
        </div>
      </div>

      <!-- Important Notice -->
      <div class="important-notice">
        <div class="important-notice-text">
          💡 This is a split payment booking. The customer will collect payments from other participants before the booking is confirmed.
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <a href="${data.dashboardUrl || '#'}" class="action-button primary-button">
          📊 View Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-title">Eddys Members</div>
        <div class="footer-text">
          Your partner in creating exceptional venue experiences
        </div>
      </div>
      <div class="footer-bottom">
        <p>
          © 2024 Eddys Members. All rights reserved.<br>
          <a href="mailto:info@oneeddy.com" class="footer-link">info@oneeddy.com</a> | 
          <a href="${Deno.env.get('APP_URL') || '#'}" class="footer-link">Visit Website</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
        break;
      default:
        throw new Error('Invalid template');
    }
    // Prefer SendGrid HTTP API if configured
    if (SENDGRID_API_KEY) {
      console.log('Sending email via SendGrid API...');
      const emailBody = {
        personalizations: [
          {
            to: [
              {
                email: to
              }
            ]
          }
        ],
        from: {
          email: Deno.env.get('SMTP_FROM') || 'info@oneeddy.com',
          name: 'Eddy'
        },
        subject,
        content: [
          {
            type: 'text/html',
            value: html
          }
        ]
      };
      console.log('📧 SendGrid request:', {
        to,
        from: emailBody.from.email,
        subject,
        hasHtml: !!html
      });
      try {
        const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailBody)
        });
        if (!sgResponse.ok) {
          const errorText = await sgResponse.text();
          console.error('❌ SendGrid API error:', {
            status: sgResponse.status,
            statusText: sgResponse.statusText,
            error: errorText
          });
          return new Response(JSON.stringify({
            error: 'Failed to send email',
            details: `SendGrid API error: ${sgResponse.status} ${sgResponse.statusText}`,
            apiError: errorText
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 500
          });
        }
        console.log('✅ Email sent successfully via SendGrid API');
        // Record QR scan email for rate limiting
        if (template === 'qr-scan-notification') {
          recordQRScanEmail(to, data.bookingId);
        }
        return new Response(JSON.stringify({
          success: true
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      } catch (error) {
        console.error('❌ SendGrid API error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to send email',
          details: error.message
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 500
        });
      }
    }
    // Fallback to SMTP (implicit TLS expected if using port 465)
    const client = new SmtpClient();
    console.log('Connecting to SMTP server...');
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || ''
    });
    console.log('Connected to SMTP server');
    console.log('Sending email via SMTP...');
    await client.send({
      from: Deno.env.get('SMTP_FROM') || '',
      to: to,
      subject: subject,
      content: html,
      html: html
    });
    console.log('Email sent successfully via SMTP');
    await client.close();
    // Record QR scan email for rate limiting
    if (template === 'qr-scan-notification') {
      recordQRScanEmail(to, data.bookingId);
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
=======
    console.log('📧 Email template processed', { 
      template: body.template, 
      to: to, 
      subject: subject,
      htmlLength: html?.length || 0,
      hasRecipient: !!to
    });
    
    if (!to) {
      console.error('❌ No recipient email address found!');
      throw new Error('No recipient email address provided');
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
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
/**
 * Sends an admin notification email after a new venue is submitted.
 * @param {Object} newVenue - The new venue object (must have a 'name' property)
 * @param {Object} userProfile - The user profile object (must have 'first_name' and 'last_name')
 * @param {Object} user - The user object (must have 'email')
 */ export async function notifyAdminOfVenueSubmission(newVenue, userProfile, user) {
  const EDGE_FUNCTION_URL = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co')}/send-email`;
  const ADMIN_EMAIL = "info@oneeddy.com"; // Change to your admin email
<<<<<<< HEAD
=======

>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
