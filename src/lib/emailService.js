// EmailJS integration for VIP Club
import emailjs from '@emailjs/browser';
import { 
  bookingConfirmationTemplate, 
  venueOwnerNotificationTemplate, 
  cancellationTemplate,
  generateEmailData 
} from './emailTemplates';

// EmailJS configuration from environment variables
const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

// Initialize EmailJS
if (EMAILJS_CONFIG.publicKey) {
  emailjs.init(EMAILJS_CONFIG.publicKey);
} else {
  console.warn('⚠️ EmailJS not configured: Missing VITE_EMAILJS_PUBLIC_KEY in environment variables');
}

export const sendBookingConfirmation = async (booking, venue, customer) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      console.warn('⚠️ EmailJS not fully configured. Check your .env file for:');
      console.warn('   - VITE_EMAILJS_SERVICE_ID');
      console.warn('   - VITE_EMAILJS_TEMPLATE_ID'); 
      console.warn('   - VITE_EMAILJS_PUBLIC_KEY');
      throw new Error('EmailJS configuration incomplete');
    }

    // Use minimal template parameters that work with most EmailJS templates
    const templateParams = {
      to_email: customer.email || customer.full_name,
      to_name: customer.full_name || customer.name || 'Valued Customer',
      from_name: 'VIP Club',
      reply_to: 'support@vipclub.com',
      message: `
Dear ${customer.full_name || customer.name || 'Valued Customer'},

Your booking at ${venue.name} has been confirmed!

Booking Details:
- Booking ID: ${booking.id}
- Venue: ${venue.name}
- Date: ${new Date(booking.booking_date).toLocaleDateString()}
- Time: ${booking.booking_time}
- Guests: ${booking.guest_count || booking.guests}
- Total: ₦${booking.total_amount}

Thank you for choosing VIP Club!

Best regards,
The VIP Club Team
      `.trim()
    };

    // Ensure email is valid
    if (!templateParams.to_email || !templateParams.to_email.includes('@')) {
      console.warn('⚠️ Invalid email address:', templateParams.to_email);
      throw new Error('Invalid customer email address');
    }

    console.log('🔄 Sending booking confirmation email with minimal params:', {
      to_email: templateParams.to_email,
      to_name: templateParams.to_name,
      from_name: templateParams.from_name
    });
    
    // Send to customer using minimal parameters
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Booking confirmation email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    throw error;
  }
};

export const sendVenueOwnerNotification = async (booking, venue, customer) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const emailData = generateEmailData(booking, venue, customer);
    const ownerTemplate = venueOwnerNotificationTemplate(emailData);
    
    // Send to venue owner
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_email: venue.contact_email,
        to_name: 'Venue Manager',
        subject: `New Booking - ${venue.name}`,
        html_content: ownerTemplate,
        from_name: 'VIP Club',
        reply_to: 'support@vipclub.com'
      }
    );

    console.log('✅ Venue owner notification sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send venue owner notification:', error);
    throw error;
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
        from_name: 'VIP Club',
        reply_to: 'support@vipclub.com'
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
    from_name: 'VIP Club',
    message: 'This is a test email to verify EmailJS configuration.',
    subject: 'VIP Club Email Service Test'
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
    to_email: userEmail,
    to_name: 'Test User',
    from_name: 'VIP Club',
    message: 'This is a simple test email.',
    subject: 'VIP Club Test'
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
        from_name: 'VIP Club',
        subject: 'VIP Club Test Email',
        message: 'This is a test email from VIP Club',
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

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.quickEmailTest = quickEmailTest;
  window.testEmailService = testEmailService;
} 