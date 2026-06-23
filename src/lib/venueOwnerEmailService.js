// Venue Owner Email Service - Separate from regular user emails
import { supabase } from './supabase.js';

// Venue Owner Email Templates
const venueOwnerTemplates = {
  // Email sent when venue owner application is approved
  applicationApproved: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Venue Application Approved!</h1>
        <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Complete your registration to access your venue dashboard</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${data.contactName},</p>
        
        <p style="color: #333; line-height: 1.6;">Congratulations! Your venue application for <strong>${data.venueName}</strong> has been approved by our team.</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #2e7d32; margin-top: 0;">Next Steps</h2>
          <p style="color: #333; margin-bottom: 15px;">To complete your venue registration and access your dashboard:</p>
          <ol style="color: #333; margin: 0; padding-left: 20px;">
            <li>Click the "Complete Registration" button below</li>
            <li>Create your account password</li>
            <li>Set up your venue profile</li>
            <li>Start managing your bookings!</li>
          </ol>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B1538; margin-top: 0;">Venue Details</h3>
          <p><strong>Venue Name:</strong> ${data.venueName}</p>
          <p><strong>Venue Type:</strong> ${data.venueType}</p>
          <p><strong>Address:</strong> ${data.venueAddress}</p>
          <p><strong>City:</strong> ${data.venueCity}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.registrationUrl}" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Complete Registration</a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
          <p style="margin: 0; color: #856404;"><strong>Important:</strong> This link is valid for 24 hours. If you don't complete your registration within this time, you'll need to contact support.</p>
        </div>
        
        <p style="color: #333;">If you have any questions, please contact our support team.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `,

  // Email sent when venue owner completes registration
  registrationComplete: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to VIPClub!</h1>
        <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Your venue dashboard is ready</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${data.ownerName},</p>
        
        <p style="color: #333; line-height: 1.6;">Welcome to VIPClub! Your venue <strong>${data.venueName}</strong> is now live on our platform and ready to receive bookings.</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #2e7d32; margin-top: 0;">Your Dashboard Features</h2>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>Manage table layouts and availability</li>
            <li>View and respond to booking requests</li>
            <li>Update venue information and photos</li>
            <li>Track revenue and analytics</li>
            <li>Communicate with customers</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Access Dashboard</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B1538; margin-top: 0;">Login Credentials</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Password:</strong> The password you created during registration</p>
          <p><a href="${data.loginUrl}" style="color: #8B1538;">Login to your account</a></p>
        </div>
        
        <p style="color: #333;">If you need help getting started, check out our venue owner guide or contact support.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `,

  // Password reset email for venue owners
  passwordReset: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
        <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Venue Owner Account</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${data.ownerName},</p>
        
        <p style="color: #333; line-height: 1.6;">We received a request to reset the password for your venue owner account.</p>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
          <p style="margin: 0; color: #856404;"><strong>Important:</strong> If you didn't request this password reset, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Reset Password</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B1538; margin-top: 0;">Account Details</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
        </div>
        
        <p style="color: #333;">This link will expire in 1 hour for security reasons.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `,

  // Email confirmation for venue owners
  emailConfirmation: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Confirm Your Email</h1>
        <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Venue Owner Account</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${data.ownerName},</p>
        
        <p style="color: #333; line-height: 1.6;">Please confirm your email address to complete your venue owner account setup.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.confirmationUrl}" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Confirm Email</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B1538; margin-top: 0;">Account Details</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
        </div>
        
        <p style="color: #333;">After confirming your email, you'll be able to access your venue dashboard.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub Team</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `,

  // Admin notification when venue owner registers
  adminNotification: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B1538, #D4AF37); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">New Venue Owner Registration</h1>
        <p style="color: #F5F5DC; margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">A new venue owner has completed their registration:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B1538; margin-top: 0;">Venue Owner Details</h3>
          <p><strong>Name:</strong> ${data.ownerName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
          <p><strong>Venue Type:</strong> ${data.venueType}</p>
          <p><strong>Address:</strong> ${data.venueAddress}</p>
          <p><strong>City:</strong> ${data.venueCity}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.adminUrl}" style="background: linear-gradient(135deg, #8B1538, #D4AF37); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">View in Admin Dashboard</a>
        </div>
        
        <p style="color: #333;">Please review the venue owner's information and approve or reject their account as needed.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The VIPClub System</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `
};

// Venue Owner Email Functions
export const sendVenueOwnerApplicationApproved = async (venueOwnerData) => {
  try {
    console.log('🔄 Sending venue owner application approved email to:', venueOwnerData.email);
    
    // Try Edge Function first
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: venueOwnerData.email,
        subject: `🎉 Your Venue Application Has Been Approved - ${venueOwnerData.venue_name}`,
        template: 'venue-owner-application-approved',
        data: {
          email: venueOwnerData.email,
          contactName: venueOwnerData.contact_name || venueOwnerData.owner_name,
          ownerName: venueOwnerData.contact_name || venueOwnerData.owner_name, // Add both for template compatibility
          venueName: venueOwnerData.venue_name,
          venueType: venueOwnerData.venue_type || 'Restaurant', // Keep fallback but prefer actual type
          venueAddress: venueOwnerData.venue_address,
          venueCity: venueOwnerData.venue_city,
          registrationUrl: `${window.location.origin}/venue-owner/register?approved=true&email=${encodeURIComponent(venueOwnerData.email)}`
        }
      }
    });

    if (error) {
      console.warn('⚠️ Edge Function failed, trying EmailJS fallback...', error);
      throw error; // This will trigger the fallback
    }

    console.log('✅ Venue owner application approved email sent successfully via Edge Function:', data);
    return data;
  } catch (error) {
    console.log('🔄 Falling back to EmailJS for approval email...');
    
    // Fallback to EmailJS
    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VENUE_OWNER_APPROVAL_TEMPLATE;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error('EmailJS configuration missing');
      }
      
      // Initialize EmailJS
      const { default: emailjs } = await import('@emailjs/browser');
      emailjs.init(PUBLIC_KEY);
      
      const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        email: venueOwnerData.email,
        to_name: venueOwnerData.contact_name || venueOwnerData.owner_name,
        from_name: 'VIPClub',
        venue_name: venueOwnerData.venue_name,
        venue_type: venueOwnerData.venue_type || 'Restaurant',
        venue_address: venueOwnerData.venue_address,
        venue_city: venueOwnerData.venue_city,
        owner_name: venueOwnerData.contact_name || venueOwnerData.owner_name,
        application_date: new Date().toLocaleDateString(),
        registration_url: `${window.location.origin}/venue-owner/register?approved=true&email=${encodeURIComponent(venueOwnerData.email)}`
      });
      
      console.log('✅ Approval email sent via EmailJS fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('❌ Both Edge Function and EmailJS fallback failed:', fallbackError);
      throw fallbackError;
    }
  }
};

export const sendVenueOwnerRegistrationComplete = async (venueOwnerData) => {
  try {
    console.log('🔄 Sending venue owner registration complete email to:', venueOwnerData.email);
    
    // Try Edge Function first
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'venue-owner-signup-complete',
        data: {
          email: venueOwnerData.email,
          ownerName: venueOwnerData.owner_name,
          venueName: venueOwnerData.venue_name,
          venueType: venueOwnerData.venue_type || 'Restaurant',
          venueAddress: venueOwnerData.venue_address,
          venueCity: venueOwnerData.venue_city,
          dashboardUrl: `${window.location.origin}/venue-owner/dashboard`,
          loginUrl: `${window.location.origin}/venue-owner/login`
        }
      }
    });

    if (error) {
      console.warn('⚠️ Edge Function failed, trying EmailJS fallback...', error);
      throw error; // This will trigger the fallback
    }

    console.log('✅ Venue owner registration complete email sent successfully via Edge Function:', data);
    return data;
  } catch (error) {
    console.log('🔄 Falling back to EmailJS for registration complete email...');
    
    // Fallback to EmailJS
    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VENUE_OWNER_WELCOME_TEMPLATE;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error('EmailJS configuration missing');
      }
      
      // Initialize EmailJS
      const { default: emailjs } = await import('@emailjs/browser');
      emailjs.init(PUBLIC_KEY);
      
      const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        email: venueOwnerData.email,
        to_name: venueOwnerData.owner_name,
        from_name: 'VIPClub',
        venue_name: venueOwnerData.venue_name,
        venue_type: venueOwnerData.venue_type || 'Restaurant',
        venue_address: venueOwnerData.venue_address,
        venue_city: venueOwnerData.venue_city,
        owner_name: venueOwnerData.owner_name,
        dashboard_url: `${window.location.origin}/venue-owner/dashboard`,
        login_url: `${window.location.origin}/venue-owner/login`
      });
      
      console.log('✅ Registration complete email sent via EmailJS fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('❌ Both Edge Function and EmailJS fallback failed:', fallbackError);
      throw fallbackError;
    }
  }
};

export const sendVenueOwnerPasswordReset = async (venueOwnerData) => {
  try {
    console.log('🔄 Sending venue owner password reset email to:', venueOwnerData.email);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'venue-owner-password-reset',
        data: {
          email: venueOwnerData.email,
          ownerName: venueOwnerData.owner_name,
          venueName: venueOwnerData.venue_name,
          resetUrl: `${window.location.origin}/venue-owner/reset-password?email=${encodeURIComponent(venueOwnerData.email)}`
        }
      }
    });

    if (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }

    console.log('✅ Venue owner password reset email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in sendVenueOwnerPasswordReset:', error);
    throw error;
  }
};

export const sendVenueOwnerEmailConfirmation = async (venueOwnerData) => {
  try {
    console.log('🔄 Sending venue owner email confirmation to:', venueOwnerData.email);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'venue-owner-email-confirmation',
        data: {
          email: venueOwnerData.email,
          ownerName: venueOwnerData.owner_name,
          venueName: venueOwnerData.venue_name,
          confirmationUrl: `${window.location.origin}/venue-owner/confirm-email?email=${encodeURIComponent(venueOwnerData.email)}`
        }
      }
    });

    if (error) {
      console.error('❌ Failed to send email confirmation:', error);
      throw error;
    }

    console.log('✅ Venue owner email confirmation sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in sendVenueOwnerEmailConfirmation:', error);
    throw error;
  }
};

export const notifyAdminOfVenueOwnerRegistration = async (venueOwnerData) => {
  try {
    console.log('🔄 Notifying admin of venue owner registration');
    
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Try Edge Function first using fetch (same pattern as other email calls)
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: 'info@oneeddy.com',
        template: 'admin-venue-owner-registration',
        subject: 'New Venue Owner Registration - Action Required',
        data: {
          adminEmail: 'info@oneeddy.com',
          ownerName: venueOwnerData.owner_name || venueOwnerData.full_name,
          email: venueOwnerData.email,
          phone: venueOwnerData.phone || 'Not provided',
          venueName: venueOwnerData.venue_name,
          venueType: venueOwnerData.venue_type || 'Not specified',
          venueAddress: venueOwnerData.venue_address || 'Not provided',
          venueCity: venueOwnerData.venue_city || 'Not provided',
          viewUrl: 'https://www.oneeddy.com/admin/venue-approvals'
        }
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => ({}));
      console.warn('⚠️ Edge Function failed, trying EmailJS fallback...', {
        status: emailResponse.status,
        error: errorData
      });
      throw new Error(`Edge Function failed: ${emailResponse.status}`);
    }

    const responseData = await emailResponse.json().catch(() => ({}));
    console.log('✅ Admin notification sent successfully via Edge Function');
    return responseData;
  } catch (error) {
    console.log('🔄 Falling back to EmailJS for admin notification...');
    
    // Fallback to EmailJS - but don't throw if it fails, just log
    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VENUE_OWNER_REQUEST_TEMPLATE;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('⚠️ EmailJS configuration missing - admin notification email will not be sent');
        // Don't throw - just return silently so registration can continue
        return { success: false, reason: 'EmailJS configuration missing' };
      }
      
      // Initialize EmailJS
      const { default: emailjs } = await import('@emailjs/browser');
      emailjs.init(PUBLIC_KEY);
      
      const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        email: 'info@oneeddy.com', // Admin email
        to_name: 'Admin',
        from_name: 'VIPClub System',
        subject: 'New Venue Owner Registration',
        ownerName: venueOwnerData.owner_name || venueOwnerData.full_name,
        ownerEmail: venueOwnerData.email,
        ownerPhone: venueOwnerData.phone || 'Not provided',
        venueName: venueOwnerData.venue_name,
        venueType: venueOwnerData.venue_type || 'Restaurant',
        venueAddress: venueOwnerData.venue_address || 'Not provided',
        venueCity: venueOwnerData.venue_city || 'Not provided',
        viewUrl: 'https://www.oneeddy.com/admin/venue-approvals',
        applicationDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
      
      console.log('✅ Admin notification sent via EmailJS fallback');
      return result;
    } catch (fallbackError) {
      // Don't throw - just log and return silently so registration can continue
      console.warn('⚠️ EmailJS fallback also failed - admin notification email will not be sent:', fallbackError.message);
      return { success: false, reason: 'Both methods failed' };
    }
  }
};

// Add this function to handle approval emails with fallback
export const sendApprovalEmailWithFallback = async (venueOwnerData) => {
  try {
    console.log('🔄 Attempting to send approval email via Edge Function...');
    
    // Try Edge Function first
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'venue-owner-invitation',
        data: {
          email: venueOwnerData.email,
          contactName: venueOwnerData.contact_name || venueOwnerData.owner_name,
          venueName: venueOwnerData.venue_name,
          venueType: venueOwnerData.venue_type || 'Restaurant', // Keep fallback but prefer actual type
          venueAddress: venueOwnerData.venue_address,
          venueCity: venueOwnerData.venue_city
        }
      }
    });

    if (error) {
      console.warn('⚠️ Edge Function failed, trying EmailJS fallback...', error);
      throw error; // This will trigger the fallback
    }

    console.log('✅ Approval email sent via Edge Function:', data);
    return data;
  } catch (error) {
    console.log('🔄 Falling back to EmailJS for approval email...');
    
    // Fallback to EmailJS
    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VENUE_OWNER_APPROVAL_TEMPLATE;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error('EmailJS configuration missing');
      }
      
      // Initialize EmailJS
      const { default: emailjs } = await import('@emailjs/browser');
      emailjs.init(PUBLIC_KEY);
      
      const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        email: venueOwnerData.email,
        to_name: venueOwnerData.contact_name || venueOwnerData.owner_name,
        from_name: 'VIPClub',
        venue_name: venueOwnerData.venue_name,
        venue_type: venueOwnerData.venue_type || 'Restaurant', // Keep fallback but prefer actual type
        venue_address: venueOwnerData.venue_address,
        venue_city: venueOwnerData.venue_city,
        owner_name: venueOwnerData.contact_name || venueOwnerData.owner_name,
        application_date: new Date().toLocaleDateString()
      });
      
      console.log('✅ Approval email sent via EmailJS fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('❌ Both Edge Function and EmailJS fallback failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Test function for venue owner emails
export const testVenueOwnerEmails = async (testEmail = 'test@example.com') => {
  
  const testData = {
    email: testEmail,
    ownerName: 'Test Owner',
    contactName: 'Test Contact',
    phone: '+234 123 456 7890',
    venueName: 'Test Venue',
    venueType: 'Restaurant',
    venueAddress: '123 Test Street',
    venueCity: 'Lagos'
  };

  try {
    // Test application approved email
    await sendVenueOwnerApplicationApproved(testData);
    
    // Test registration complete email
    await sendVenueOwnerRegistrationComplete(testData);
    
    // Test password reset email
    await sendVenueOwnerPasswordReset(testData);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testVenueOwnerEmails = testVenueOwnerEmails;
} 

// Simple test function to debug email service configuration
export const testEmailConfiguration = async () => {
  
  // Check environment variables
  const envVars = {
    emailjsServiceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    emailjsPublicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    venueOwnerApprovalTemplate: import.meta.env.VITE_EMAILJS_VENUE_OWNER_APPROVAL_TEMPLATE,
    venueOwnerWelcomeTemplate: import.meta.env.VITE_EMAILJS_VENUE_OWNER_WELCOME_TEMPLATE,
    venueOwnerRequestTemplate: import.meta.env.VITE_EMAILJS_VENUE_OWNER_REQUEST_TEMPLATE
  };
  
  console.log('📋 Environment Variables:', {
    serviceId: envVars.emailjsServiceId ? '✅ Set' : '❌ Missing',
    publicKey: envVars.emailjsPublicKey ? '✅ Set' : '❌ Missing',
    approvalTemplate: envVars.venueOwnerApprovalTemplate ? '✅ Set' : '❌ Missing',
    welcomeTemplate: envVars.venueOwnerWelcomeTemplate ? '✅ Set' : '❌ Missing',
    requestTemplate: envVars.venueOwnerRequestTemplate ? '✅ Set' : '❌ Missing'
  });
  
  // Test Edge Function
  try {
    console.log('🔄 Testing Edge Function...');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'test',
        data: {
          email: 'test@example.com',
          message: 'Test email from Edge Function'
        }
      }
    });
    
    if (error) {
      console.error('❌ Edge Function test failed:', error);
    } else {
      console.log('✅ Edge Function test successful:', data);
    }
  } catch (edgeError) {
    console.error('❌ Edge Function not available:', edgeError);
  }
  
  // Test EmailJS
  try {
    console.log('🔄 Testing EmailJS...');
    const { default: emailjs } = await import('@emailjs/browser');
    
    if (envVars.emailjsPublicKey) {
      emailjs.init(envVars.emailjsPublicKey);
      console.log('✅ EmailJS initialized');
    } else {
      console.error('❌ EmailJS public key missing');
    }
  } catch (emailjsError) {
    console.error('❌ EmailJS test failed:', emailjsError);
  }
  
  return {
    edgeFunction: 'tested',
    emailjs: envVars.emailjsPublicKey ? 'available' : 'missing_key',
    templates: {
      approval: envVars.venueOwnerApprovalTemplate ? 'set' : 'missing',
      welcome: envVars.venueOwnerWelcomeTemplate ? 'set' : 'missing',
      request: envVars.venueOwnerRequestTemplate ? 'set' : 'missing'
    }
  };
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testEmailConfiguration = testEmailConfiguration;
} 