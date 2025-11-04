import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Environment
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const APP_URL = Deno.env.get('APP_URL') || 'https://oneeddy.com'
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('SMTP_FROM') || 'info@oneeddy.com'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.headers.get('content-type') !== 'application/json') {
    return new Response(JSON.stringify({ error: 'Invalid content type' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }

  try {
    const body = await req.json()
    const { email, venueName, contactName, venueType, redirectUrl } = body || {}

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 1) Create Supabase Auth invite
    let inviteErrorMessage = ''
    try {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl || `${APP_URL}/venue-owner/register`,
        data: {
          venue_name: venueName || '',
          contact_name: contactName || '',
          venue_type: venueType || 'Restaurant',
          approval_date: new Date().toISOString(),
          invitation_type: 'venue_owner_approval'
        }
      })
      if (inviteError) inviteErrorMessage = inviteError.message
    } catch (e) {
      inviteErrorMessage = (e as Error).message
    }

    // 2) Send branded invitation via SendGrid
    if (!SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ error: 'SENDGRID_API_KEY is not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>VIPClub – Venue Owner Invitation</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333">
  <div style="max-width:600px;margin:0 auto;background:#fff;box-shadow:0 10px 30px rgba(128,0,32,0.08)">
    <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);padding:36px 28px;text-align:center;position:relative">
      <img src="https://res.cloudinary.com/dq1l3wltu/image/upload/v1753338476/Eddy_Logo-07_vagzzy.jpg" alt="VIPClub" style="width:110px;height:110px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 8px 20px rgba(255,215,0,.28);margin-bottom:12px">
      <div style="color:#FFF5E6;font-size:26px;font-weight:700;letter-spacing:1.5px">EDDYS MEMBERS</div>
    </div>

    <div style="padding:40px 32px">
      <h2 style="color:#800020;text-align:center;margin:0 0 14px 0">Invitation to Join VIPClub</h2>
      <p style="text-align:center;color:#555;margin:0 0 24px 0">Hi ${contactName || 'there'}, we’re excited to invite you to onboard your venue ${venueName ? `<strong>${venueName}</strong>` : ''} on VIPClub.</p>

      <div style="background:linear-gradient(135deg,#FFF5E6 0%,#ffffff 100%);border:2px solid #FFD700;border-radius:14px;padding:24px;margin:18px 0">
        <div style="color:#800020;font-weight:700;font-size:14px;margin-bottom:12px;text-transform:uppercase">Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
            <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Venue</div>
            <div style="color:#666;font-size:13px">${venueName || '—'}</div>
          </div>
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #FFD700">
            <div style="color:#800020;font-weight:700;font-size:11px;margin-bottom:4px;text-transform:uppercase">Type</div>
            <div style="color:#666;font-size:13px">${venueType || 'Restaurant'}</div>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin:24px 0 6px">
        <a href="${redirectUrl || `${APP_URL}/venue-owner/register`}" style="display:inline-block;text-decoration:none;padding:14px 26px;border-radius:28px;font-weight:700;font-size:14px;letter-spacing:.5px;border:2px solid #FFD700;box-shadow:0 8px 22px rgba(128,0,32,.26);background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);color:#FFF5E6">Complete Registration</a>
      </div>
      <div style="background:rgba(255,215,0,.12);border:1px solid #FFD700;border-radius:10px;padding:14px;text-align:center;color:#800020;font-size:13px;font-weight:700;margin-top:18px">This invitation was generated for venue owner onboarding.</div>
    </div>

    <div style="background:linear-gradient(135deg,#800020 0%,#A71D2A 100%);color:#FFF5E6;padding:30px 26px;text-align:center">
      <div>We look forward to partnering with you.</div>
      <div style="border-top:1px solid rgba(255,245,230,.22);margin-top:14px;padding-top:12px;font-size:12px;opacity:.85">© 2025 Eddys Members. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'VIPClub' },
        subject: 'You are invited to join VIPClub as a Venue Owner',
        content: [{ type: 'text/html', value: html }]
      })
    })

    if (!sgRes.ok) {
      const text = await sgRes.text()
      return new Response(JSON.stringify({ error: `SendGrid error (${sgRes.status}): ${text}`, inviteError: inviteErrorMessage || undefined }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Invitation prepared and email sent to ${email}`,
      inviteError: inviteErrorMessage || undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 