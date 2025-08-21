// EmailJS integration for Eddys Members
import emailjs from '@emailjs/browser';
import { generateEmailData } from './emailTemplates';
import { supabase } from '@/lib/supabase.js';

// Force Edge Function usage in mobile app to avoid EmailJS origin restrictions
const USE_EDGE = (import.meta.env.VITE_USE_EDGE_EMAIL ?? 'true').toString().toLowerCase() !== 'false';

const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE,
  ownerTemplateId: import.meta.env.VITE_EMAILJS_VENUE_OWNER_REQUEST_TEMPLATE,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

if (EMAILJS_CONFIG.publicKey) {
  emailjs.init(EMAILJS_CONFIG.publicKey);
}

export const sendBookingConfirmation = async (booking, venue, customer) => {
  // Debug logging for mobile app
  console.log('🔍 DEBUG - Mobile email service called with:');
  console.log('   Booking:', booking);
  console.log('   Venue:', venue);
  console.log('   Customer:', customer);
  
  const customerEmail = customer?.email || booking?.customerEmail;
  console.log('   Customer Email:', customerEmail);
  
  // Check environment variables
  console.log('🔍 DEBUG - Environment variables:');
  console.log('   USE_EDGE:', USE_EDGE);
  console.log('   VITE_USE_EDGE_EMAIL:', import.meta.env.VITE_USE_EDGE_EMAIL);
  console.log('   EmailJS Service ID:', EMAILJS_CONFIG.serviceId ? 'SET' : 'MISSING');
  console.log('   EmailJS Template ID:', EMAILJS_CONFIG.templateId ? 'SET' : 'MISSING');
  console.log('   EmailJS Public Key:', EMAILJS_CONFIG.publicKey ? 'SET' : 'MISSING');
  
  if (!customerEmail) {
    console.error('❌ Missing customer email for booking confirmation');
    return false;
  }

  // Try Edge Function first (if enabled)
  if (USE_EDGE) {
    try {
      const payload = {
        to: customerEmail,
        subject: 'Your booking is confirmed',
        template: 'booking-confirmation',
        data: {
          customerName: customer?.fullName || booking?.customerName || 'Guest',
          venueName: venue?.name || booking?.venueName || 'Your Venue',
          bookingDate: booking?.bookingDate || booking?.booking_date,
          bookingId: booking?.bookingId || booking?.id,
          totalAmount: booking?.totalAmount || booking?.total_amount,
          ticketInfo: booking?.ticketInfo,
          tableInfo: booking?.tableInfo,
        }
      };
      const { error } = await supabase.functions.invoke('send-email', { body: payload });
      if (!error) return true;
      console.warn('Edge Function send-email failed, falling back to EmailJS...', error);
    } catch (err) {
      console.warn('Edge Function exception, falling back to EmailJS...', err);
    }
  }

  // EmailJS fallback
  try {
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS not fully configured');
    }
    const templateParams = {
      // Customer Details
      customerName: customer.full_name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      
      // Booking Details
      bookingReference: booking.id,
      bookingDate: new Date(booking.booking_date).toLocaleDateString(),
      bookingTime: booking.booking_time,
      guestCount: booking.guest_count,
      duration: booking.duration || '2 hours',  // Add default if not specified
      
      // Table Details
      tableNumber: booking.table_number,
      tableType: booking.table?.type || 'Standard Table',
      tableLocation: booking.table?.location || 'Main Area',
      
      // Venue Details
      venueName: venue.name,
      venueDescription: venue.description,
      venueAddress: venue.address,
      venueCity: venue.city,
      venueCountry: venue.country,
      venuePhone: venue.contact_phone,
      venueEmail: venue.contact_email,
      dressCode: venue.dress_code || 'Smart Casual',
      
      // Special Requests
      specialRequests: booking.special_requests || 'None specified',
      
      // ... rest of the existing parameters ...
    };
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);
    return true;
  } catch (fallbackErr) {
    console.error('❌ Booking confirmation send failed (EmailJS fallback):', fallbackErr);
    return false;
  }
};

export const sendVenueOwnerNotification = async (booking, venue, customer, venueOwner) => {
  const ADMIN_EMAIL = venueOwner?.email;
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes('@')) {
    console.warn('Skipping venue owner notification: missing/invalid owner email');
    return false;
  }

  // Try Edge Function first (if enabled)
  if (USE_EDGE) {
    try {
      const payload = {
        to: ADMIN_EMAIL,
        subject: 'New Booking Received',
        template: 'venue-owner-notification',
        data: {
          ownerName: venueOwner?.name || 'Admin',
          customerName: customer?.full_name || customer?.fullName || booking?.customerName || 'Guest',
          customerEmail: customer?.email || booking?.customerEmail,
          customerPhone: customer?.phone || booking?.customerPhone || 'Not provided',
          venueName: venue?.name || booking?.venueName,
          venueType: venue?.type || 'Not specified',
          venueAddress: venue?.address || '',
          venueCity: venue?.city || '',
          bookingId: booking?.bookingId || booking?.id,
          bookingDate: booking?.bookingDate || booking?.booking_date,
          bookingTime: booking?.booking_time || booking?.bookingTime,
          partySize: booking?.guest_count || booking?.guests || booking?.guestCount,
          tableNumber: booking?.table_number || booking?.tableNumber || booking?.table?.name,
          totalAmount: booking?.totalAmount || booking?.total_amount,
          adminUrl: `${window.location.origin}/admin/venue-approvals`
        }
      };
      const { error } = await supabase.functions.invoke('send-email', { body: payload });
      if (!error) return true;
      console.warn('Edge Function admin notify failed, falling back to EmailJS...', error);
    } catch (err) {
      console.warn('Edge Function exception (admin notify), falling back to EmailJS...', err);
    }
  }

  // EmailJS fallback for admin notification
  try {
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.ownerTemplateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS admin template not configured');
    }
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.ownerTemplateId, {
      to_email: ADMIN_EMAIL,
      email: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      reply_to: 'info@oneeddy.com',
      to_name: 'Admin',
      from_name: 'VIPClub System',
      subject: 'New Booking Received',
      ownerName: venueOwner?.name || 'Admin',
      ownerEmail: customer?.email || booking?.customerEmail,
      ownerPhone: customer?.phone || booking?.customerPhone || 'Not provided',
      venueName: venue?.name || booking?.venueName,
      venueType: venue?.type || 'Not specified',
      venueAddress: venue?.address || '',
      venueCity: venue?.city || '',
      applicationDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    });
    return true;
  } catch (fallbackErr) {
    console.error('❌ Admin notification send failed (EmailJS fallback):', fallbackErr);
    return false;
  }
};

export const sendCancellationEmail = async (booking, venue, customer) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const emailData = generateEmailData(booking, venue, customer);
    const cancellationHtml = cancellationTemplate(emailData);
    
    // Send to customer
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_email: customer.email,
        to_name: customer.name,
        subject: `Booking Cancelled - ${venue.name}`,
        html_content: cancellationHtml,
        from_name: 'Eddys Members',
        reply_to: 'info@oneeddy.com'
      }
    );

    console.log('✅ Cancellation email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
    throw error;
  }
};

// Fallback email service (for basic HTML emails if needed)
export const sendBasicEmail = async (to, subject, htmlContent) => {
  try {
    const templateParams = {
      to_email: to,
      subject: subject,
      html_content: htmlContent,
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      'template_basic', // Basic HTML template
      templateParams
    );

    console.log('✅ Basic email sent successfully:', result);
    return { success: true, messageId: result.text };
  } catch (error) {
    console.error('❌ Failed to send basic email:', error);
    return { success: false, error: error.message };
  }
};

// Test function to verify EmailJS setup
export const testEmailService = async () => {
  // Check configuration first
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
    console.error('❌ EmailJS configuration incomplete:');
    console.error('   Service ID:', EMAILJS_CONFIG.serviceId ? '✅ Set' : '❌ Missing');
    console.error('   Template ID:', EMAILJS_CONFIG.templateId ? '✅ Set' : '❌ Missing');
    console.error('   Public Key:', EMAILJS_CONFIG.publicKey ? '✅ Set' : '❌ Missing');
    
    return { 
      success: false, 
      error: 'EmailJS configuration incomplete. Check your .env file.' 
    };
  }

  // Use minimal, standard template parameters
  const testData = {
    to_name: 'Test User',
    to_email: 'test@example.com',
    from_name: 'Eddys Members',
    message: 'This is a test email to verify EmailJS configuration.',
    subject: 'Eddys Members Email Service Test'
  };

  try {
    console.log('🔄 Testing EmailJS with config:', {
      serviceId: EMAILJS_CONFIG.serviceId,
      templateId: EMAILJS_CONFIG.templateId,
      publicKey: EMAILJS_CONFIG.publicKey ? '***' : 'missing'
    });

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testData
    );
    
    console.log('✅ Email service test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Email service test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    
    let errorMessage = 'Email service test failed';
    if (error.status === 422) {
      errorMessage = 'Template parameters mismatch. Please check your EmailJS template configuration.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid request. Check your Service ID and Template ID.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Check your Public Key.';
    }
    
    return { success: false, error: errorMessage };
  }
}; 

// Simple test to verify template configuration
export const testBasicEmail = async (userEmail = 'test@example.com') => {
  // Check configuration first
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
    return { 
      success: false, 
      error: 'EmailJS configuration incomplete. Check your .env file.' 
    };
  }

  // Minimal test data
  const testData = {
    customerEmail: userEmail, // Updated to match template's To field
    to_name: 'Test User',
    from_name: 'Eddys Members',
    message: 'This is a simple test email.',
    subject: 'Eddys Members Test'
  };

  try {
    console.log('🔄 Testing basic email with data:', testData);

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testData
    );
    
    console.log('✅ Basic email test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Basic email test failed:', error);
    
    if (error.text === 'The recipients address is empty') {
      return { 
        success: false, 
        error: 'EmailJS template missing "To" field. Add {{to_email}} to your template\'s "To" field.' 
      };
    }
    
    return { success: false, error: error.text || error.message };
  }
}; 

// Quick test function for browser console debugging
export const quickEmailTest = async (testEmail = 'test@example.com') => {
  console.log('🔄 Starting quick email test...');
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_email: testEmail,
        to_name: 'Test User',
        from_name: 'Eddys Members',
        subject: 'Eddys Members Test Email',
        message: 'This is a test email from Eddys Members',
        venue_name: 'Test Venue',
        booking_id: '12345',
        booking_date: new Date().toLocaleDateString(),
        booking_time: '19:00',
        guests: '2',
        total_amount: '5000'
      }
    );
    
    console.log('✅ Quick email test successful!', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Quick email test failed:', error);
    return { success: false, error };
  }
};

// Debug function for booking confirmation email issues
export const debugBookingEmail = async (booking, venue, customer) => {
  console.log('🔍 Debugging booking email issue...');
  console.log('📧 Customer data:', customer);
  console.log('🏢 Venue data:', venue);
  console.log('📅 Booking data:', booking);
  
  // Check EmailJS configuration
  console.log('⚙️ EmailJS config:', {
    serviceId: EMAILJS_CONFIG.serviceId ? '✅ Set' : '❌ Missing',
    templateId: EMAILJS_CONFIG.templateId ? '✅ Set' : '❌ Missing',
    publicKey: EMAILJS_CONFIG.publicKey ? '✅ Set' : '❌ Missing'
  });
  
  // Validate customer email
  const customerEmail = customer.email || customer.customerEmail || customer.full_name;
  console.log('📧 Customer email found:', customerEmail);
  
  if (!customerEmail || !customerEmail.includes('@')) {
    console.error('❌ Invalid customer email:', customerEmail);
    return { success: false, error: 'Invalid customer email' };
  }
  
  // Test with minimal data
  const testParams = {
    customerEmail: customerEmail, // This matches the template's "To" field
    to_name: customer.full_name || customer.customerName || 'Test User',
    customerName: customer.full_name || customer.customerName || 'Test User',
    to_email: customerEmail, // Keep for backward compatibility
    bookingReference: 'TEST-123',
    venueName: venue.name || 'Test Venue'
  };
  
  console.log('🧪 Testing with minimal params:', testParams);
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    console.log('✅ Debug test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    
    if (error.text === 'The recipients address is empty') {
      console.error('🔧 SOLUTION: Your EmailJS template is missing the "To" field configuration.');
      console.error('   Please go to your EmailJS dashboard and:');
      console.error('   1. Open your email template');
      console.error('   2. In the "To" field, add: {{customerEmail}}');
      console.error('   3. Save the template');
      console.error('   4. Try again');
    }
    
    return { success: false, error: error.text || error.message };
  }
};

// Simple console test function for immediate debugging
export const testEmailJSNow = async (testEmail = 'test@example.com') => {
  console.log('🧪 Testing EmailJS configuration...');
  
  // Check configuration
  console.log('📋 EmailJS Config:', {
    serviceId: EMAILJS_CONFIG.serviceId ? '✅ Set' : '❌ Missing',
    templateId: EMAILJS_CONFIG.templateId ? '✅ Set' : '❌ Missing',
    publicKey: EMAILJS_CONFIG.publicKey ? '✅ Set' : '❌ Missing'
  });
  
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
    console.error('❌ EmailJS not fully configured. Check your .env file.');
    return false;
  }
  
  // Test with the exact parameter name your template expects
  const testParams = {
    customerEmail: testEmail, // This should match your template's "To" field
    to_name: 'Test User',
    customerName: 'Test User',
    bookingReference: 'TEST-123',
    venueName: 'Test Venue',
    bookingDate: new Date().toLocaleDateString(),
    bookingTime: '19:00',
    partySize: '2',
    totalAmount: '5000'
  };
  
  console.log('📧 Sending test with params:', testParams);
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    console.log('✅ Test email sent successfully!', result);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    
    if (error.text === 'The recipients address is empty') {
      console.error('🔧 SOLUTION: Your EmailJS template needs {{customerEmail}} in the "To" field');
      console.error('   Go to EmailJS Dashboard → Templates → Edit your template');
      console.error('   In the "To" field, make sure it says: {{customerEmail}}');
    }
    
    return false;
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.quickEmailTest = quickEmailTest;
  window.testEmailService = testEmailService;
  window.testEmailJSNow = testEmailJSNow;
} 

export const sendVenueOwnerSignupEmail = async (venueOwnerData) => {
  try {
    console.log('🔄 Sending venue owner signup email to:', venueOwnerData.email);
    
    // Use Supabase Edge Function to send the signup email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'venue-owner-signup',
        data: {
          email: venueOwnerData.email,
          ownerName: venueOwnerData.owner_name || venueOwnerData.contact_name,
          venueName: venueOwnerData.venue_name,
          venueType: venueOwnerData.venue_type || 'Restaurant',
          venueAddress: venueOwnerData.venue_address,
          venueCity: venueOwnerData.venue_city,
          dashboardUrl: `${window.location.origin}/venue-owner/dashboard`
        }
      }
    });

    if (error) {
      console.error('❌ Failed to send venue owner signup email:', error);
      throw error;
    }

    console.log('✅ Venue owner signup email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in sendVenueOwnerSignupEmail:', error);
    throw error;
  }
};

// Test function to debug Edge Function email sending
export const testEdgeFunctionEmail = async (template = 'venue-owner-invitation', testData = {}) => {
  try {
    console.log('🔄 Testing Edge Function email with template:', template);
    console.log('📧 Test data:', testData);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: template,
        data: {
          email: testData.email || 'test@example.com',
          venueName: testData.venueName || 'Test Venue',
          contactName: testData.contactName || 'Test Owner',
          venueType: testData.venueType || 'Restaurant',
          ownerName: testData.ownerName || 'Test Owner',
          venueAddress: testData.venueAddress || 'Test Address',
          venueCity: testData.venueCity || 'Lagos'
        }
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      return { success: false, error: error.message };
    }

    console.log('✅ Edge Function email test successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error testing Edge Function email:', error);
    return { success: false, error: error.message };
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testEdgeFunctionEmail = testEdgeFunctionEmail;
}

// Simple test function for localhost debugging
export const testLocalhostEmail = async (testEmail = 'test@example.com') => {
  console.log('🧪 Testing EmailJS on localhost...');
  
  // Check configuration
  const config = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  };
  
  console.log('📋 EmailJS Config:', {
    serviceId: config.serviceId ? '✅ Set' : '❌ Missing',
    templateId: config.templateId ? '✅ Set' : '❌ Missing',
    publicKey: config.publicKey ? '✅ Set' : '❌ Missing'
  });
  
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.error('❌ EmailJS configuration incomplete');
    return { success: false, error: 'EmailJS configuration incomplete' };
  }
  
  try {
    // Initialize EmailJS
    emailjs.init(config.publicKey);
    
    // Test with minimal data
    const testParams = {
      to_email: testEmail,
      to_name: 'Test User',
      from_name: 'Eddys Members Test',
      subject: 'Localhost Email Test',
      message: 'This is a test email from localhost to verify EmailJS is working.',
      venue_name: 'Test Venue',
      owner_name: 'Test Owner',
      application_date: new Date().toLocaleDateString()
    };
    
    console.log('📧 Sending test email with params:', testParams);
    
    const result = await emailjs.send(
      config.serviceId,
      config.templateId,
      testParams
    );
    
    console.log('✅ Localhost email test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Localhost email test failed:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    
    return { success: false, error: error.text || error.message };
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testLocalhostEmail = testLocalhostEmail;
}

// Test function for contact form emails
export const testContactFormEmail = async (testData = {}) => {
  try {
    console.log('🧪 Testing contact form email...');
    
    const testFormData = {
      name: testData.name || 'Test User',
      email: testData.email || 'test@example.com',
      subject: testData.subject || 'Test Contact Form Submission',
      message: testData.message || 'This is a test message from the contact form to verify the email functionality is working correctly.'
    };

    console.log('📧 Test form data:', testFormData);
    
    const result = await sendContactFormEmail(testFormData);
    
    console.log('✅ Contact form email test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Contact form email test failed:', error);
    return { success: false, error: error.message };
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testContactFormEmail = testContactFormEmail;
}

// Contact form email function
export const sendContactFormEmail = async (formData) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.publicKey) {
      console.warn('⚠️ EmailJS not fully configured. Check your .env file for:');
      console.warn('   - VITE_EMAILJS_SERVICE_ID');
      console.warn('   - VITE_EMAILJS_PUBLIC_KEY');
      throw new Error('EmailJS configuration incomplete');
    }

    // Validate form data
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      throw new Error('All form fields are required');
    }

    // Validate email format
    if (!formData.email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    console.log('🔄 Sending contact form email:', {
      from: formData.email,
      subject: formData.subject,
      to: 'info@oneeddy.com'
    });

    // Create a simple text-based message that works with any template
    const simpleMessage = `
NEW CONTACT FORM SUBMISSION

Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}
Date: ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

MESSAGE:
${formData.message}

---
This message was sent from the Eddys Members contact form.
Website: ${window.location.origin}
    `.trim();

    // Use the main template but with minimal, simple data
    const templateParams = {
      customerEmail: 'info@oneeddy.com',
      to_name: 'Eddys Members Support Team',
      from_name: 'Contact Form',
      message: simpleMessage,
      subject: `Contact Form: ${formData.subject}`,
      reply_to: formData.email,
      
      // Add minimal booking-like data to satisfy template requirements
      customerName: formData.name,
      bookingReference: 'CONTACT-FORM',
      venueName: 'Eddys Members Website',
      bookingDate: new Date().toLocaleDateString(),
      bookingTime: new Date().toLocaleTimeString(),
      partySize: '1',
      totalAmount: '0'
    };

    // Send email using EmailJS
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Contact form email sent successfully:', result);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    
    throw error;
  }
};