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

    const emailData = generateEmailData(booking, venue, customer);
    const customerTemplate = bookingConfirmationTemplate(emailData);
    
    // Send to customer
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_email: customer.email,
        to_name: customer.name,
        subject: `Booking Confirmation - ${venue.name}`,
        html_content: customerTemplate,
        from_name: 'VIP Club',
        reply_to: 'support@vipclub.com'
      }
    );

    console.log('✅ Booking confirmation email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
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
  const testData = {
    to_email: 'test@example.com',
    to_name: 'Test User',
    subject: 'VIP Club Email Service Test',
    html_content: '<h1>Test Email</h1><p>EmailJS is working correctly!</p>',
  };

  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testData
    );
    
    console.log('✅ Email service test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Email service test failed:', error);
    return { success: false, error: error.message };
  }
}; 