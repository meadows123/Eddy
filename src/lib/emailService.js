// EmailJS integration for Eddys Members
import emailjs from '@emailjs/browser';
import { 
  bookingConfirmationTemplate, 
  venueOwnerNotificationTemplate, 
  cancellationTemplate,
  generateEmailData 
} from './emailTemplates';
import { supabase } from '@/lib/supabase.js';

// EmailJS configuration from environment variables
const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

// Initialize EmailJS
if (EMAILJS_CONFIG.publicKey) {
  emailjs.init(EMAILJS_CONFIG.publicKey);
} else {
  console.warn('⚠️ EmailJS not configured: Missing VITE_EMAILJS_PUBLIC_KEY in environment variables');
}

// Function to optimize email delivery and reduce spam filtering
const optimizeEmailDelivery = (params) => {
  return {
    ...params,
    subject: params.subject || 'Eddys Members Booking Confirmation',
    from_name: 'Eddys Members',
    reply_to: 'info@oneeddy.com'
  };
};

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

    // Validate customer email
    const customerEmail = customer.email || customer.customerEmail || customer.full_name;
    if (!customerEmail || !customerEmail.includes('@')) {
      console.error('❌ Invalid or missing customer email:', customerEmail);
      throw new Error('Invalid customer email address');
    }

    // Use exact parameter names that match the EmailJS template
    const templateParams = {
      // EmailJS required fields - these MUST match your template exactly
      customerEmail: customerEmail,
      customerName: customer.full_name || customer.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: booking.total_amount || booking.totalAmount || 0,
      venueDescription: venue.description || venue.about || 'Experience luxury dining and entertainment in Lagos\' most exclusive venue.',
      venueAddress: venue.address || venue.location || 'Lagos, Nigeria',
      venuePhone: venue.contact_phone || venue.phone || venue.contact_number || '+234 XXX XXX XXXX',
      venueDressCode: venue.dress_code || venue.dresscode || 'Smart Casual',
      venueParking: venue.parking || venue.parking_info || 'Valet parking available',
      venueCuisine: venue.cuisine || venue.cuisine_type || 'International cuisine',
      venueHours: venue.hours || venue.opening_hours || venue.business_hours || '6:00 PM - 2:00 AM',
      
      // Special Information - Use actual booking notes
      specialRequests: booking.special_requests || booking.notes || booking.additional_notes || 'None specified',
      
      // Action URLs (you can update these later)
      viewBookingUrl: `${window.location.origin}/profile`,
      modifyBookingUrl: `${window.location.origin}/profile`,
      cancelBookingUrl: `${window.location.origin}/profile`,
      websiteUrl: window.location.origin,
      supportUrl: 'mailto:info@oneeddy.com',
      unsubscribeUrl: `${window.location.origin}/settings`
    };

    // Optimize email delivery to reduce spam filtering
    const optimizedParams = optimizeEmailDelivery(templateParams);

    console.log('🔄 Sending booking confirmation with optimized parameters:', {
      to_email: optimizedParams.customerEmail,
      customerName: optimizedParams.customerName,
      bookingReference: optimizedParams.bookingReference,
      venueName: optimizedParams.venueName,
      subject: optimizedParams.subject
    });
    
    // Send to customer using optimized template parameters
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      optimizedParams
    );

    console.log('✅ Booking confirmation email sent successfully:', result);
    
    // Log delivery optimization tips
    console.log('📧 Email Delivery Tips:');
    console.log('   - Check spam/junk folder if email not received');
    console.log('   - Mark as "Not Spam" to improve future delivery');
    console.log('   - Add support@vipclub.com to contacts');
    
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    
    // Provide more specific error messages
    if (error.text === 'The recipients address is empty') {
      console.error('❌ EmailJS template issue: The "To" field in your EmailJS template is missing or incorrectly configured.');
      console.error('   Please ensure your EmailJS template has {{customerEmail}} in the "To" field.');
    }
    
    throw error;
  }
};

export const sendVenueOwnerNotification = async (booking, venue, customer, venueOwner) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const venueOwnerEmail = venueOwner?.email || venue.contact_email || venue.owner_email || 'info@oneeddy.com';
    
    // Get table information if available
    let tableInfo = 'Table not specified';
    if (booking.table_id) {
      try {
        const { data: tableData } = await supabase
          .from('venue_tables')
          .select('table_number, capacity')
          .eq('id', booking.table_id)
          .single();
        
        if (tableData) {
          tableInfo = `Table ${tableData.table_number} (Capacity: ${tableData.capacity})`;
        }
      } catch (tableError) {
        console.warn('Could not fetch table info:', tableError);
      }
    }
    
    // Format date and time nicely
    const bookingDate = booking.booking_date || booking.bookingDate || new Date().toISOString().split('T')[0];
    const bookingTime = booking.start_time || booking.booking_time || '19:00';
    const endTime = booking.end_time || '23:00';
    
    // Create a focused message for venue owners
    const venueOwnerMessage = `
NEW BOOKING CONFIRMED

Booking ID: ${booking.id || booking.bookingId || 'N/A'}
Customer: ${customer.full_name || customer.customerName || 'Guest'}
Guests: ${booking.number_of_guests || booking.guest_count || 2}
Table: ${tableInfo}
Date: ${bookingDate}
Time: ${bookingTime} - ${endTime}
Total Amount: ₦${(booking.total_amount || booking.totalAmount || 0).toLocaleString()}

Customer Contact:
Email: ${customer.email || customer.customerEmail || 'N/A'}
Phone: ${customer.phone || customer.customerPhone || 'N/A'}

Please prepare the table and ensure excellent service for your guests.

---
Eddys Members Booking System
    `.trim();
    
    const templateParams = {
      customerEmail: venueOwnerEmail, // Use customerEmail for the "To" field
      customerName: venueOwner?.full_name || 'Venue Manager',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: bookingDate,
      bookingTime: bookingTime,
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: booking.total_amount || booking.totalAmount || 0,
      message: venueOwnerMessage,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com',
      // Additional fields for template compatibility
      customerName: customer.full_name || customer.customerName || 'Guest',
      customerEmail: customer.email || customer.customerEmail || 'N/A',
      customerPhone: customer.phone || customer.customerPhone || 'N/A',
      tableInfo: tableInfo
    };

    console.log('📧 Sending venue owner notification with message:', venueOwnerMessage);
    console.log('📧 Template parameters being sent:', templateParams);

    // Send to venue owner
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Venue owner notification sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send venue owner notification:', error);
    throw error;
  }
};

// New function that matches what CheckoutPage is calling
export const sendBookingConfirmationEmail = async (bookingData) => {
  try {
    console.log('🔄 sendBookingConfirmationEmail called with:', bookingData);
    
    // Extract data from bookingData
    const booking = {
      id: bookingData.id || bookingData.bookingId,
      booking_date: bookingData.booking_date || bookingData.bookingDate || bookingData.bookingDate,
      start_time: bookingData.start_time || bookingData.booking_time || '19:00:00',
      number_of_guests: bookingData.number_of_guests || bookingData.guest_count || 2,
      total_amount: bookingData.total_amount || bookingData.totalAmount || 0,
      status: bookingData.status || 'confirmed'
    };

    const venue = {
      name: bookingData.venueName || bookingData.venue?.name || 'Venue',
      address: bookingData.venueAddress || bookingData.venue?.address || 'Lagos, Nigeria',
      contact_phone: bookingData.venuePhone || bookingData.venue?.contact_phone || '+234 XXX XXX XXXX',
      contact_email: bookingData.venueEmail || bookingData.venue?.contact_email || 'info@oneeddy.com',
      description: bookingData.venueDescription || bookingData.venue?.description || 'Experience luxury dining and entertainment in Lagos\' most exclusive venue.',
      dress_code: bookingData.venueDressCode || bookingData.venue?.dress_code || 'Smart Casual'
    };

    const customer = {
      full_name: bookingData.customerName || 'Guest',
      email: bookingData.customerEmail || 'guest@example.com',
      phone: bookingData.customerPhone || 'N/A'
    };

    // Send customer confirmation email
    const customerResult = await sendBookingConfirmation(booking, venue, customer);
    
    // Send venue owner notification
    const venueOwner = {
      email: bookingData.venueOwnerEmail,
      full_name: bookingData.venueOwnerName || 'Venue Manager'
    };
    const venueOwnerResult = await sendVenueOwnerNotification(booking, venue, customer, venueOwner);
    
    console.log('✅ Both customer and venue owner emails sent successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send booking confirmation emails:', error);
    return false;
  }
};

// Split Payment Email Functions

// 1. Email to initiator when they complete their split payment
export const sendSplitPaymentInitiatorConfirmation = async (splitRequest, booking, venue, initiator) => {
  try {
    console.log('🔄 Sending split payment initiator confirmation email');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const initiatorEmail = initiator.email || initiator.customerEmail;
    if (!initiatorEmail || !initiatorEmail.includes('@')) {
      throw new Error('Invalid initiator email address');
    }

    const templateParams = {
      customerEmail: initiatorEmail,
      customerName: initiator.full_name || initiator.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: booking.total_amount || booking.totalAmount || 0,
      splitAmount: splitRequest.amount || 0,
      paymentStatus: 'Your payment completed',
      message: `Your split payment of ₦${(splitRequest.amount || 0).toLocaleString()} has been processed successfully. You will be notified when all other payments are completed.`,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Split payment initiator confirmation email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send split payment initiator confirmation:', error);
    throw error;
  }
};

// 2. Email to recipient when they complete their split payment
export const sendSplitPaymentRecipientConfirmation = async (splitRequest, booking, venue, recipient, initiator) => {
  try {
    console.log('🔄 Sending split payment recipient confirmation email');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const recipientEmail = recipient.email || recipient.customerEmail;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    const templateParams = {
      customerEmail: recipientEmail,
      customerName: recipient.full_name || recipient.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: booking.total_amount || booking.totalAmount || 0,
      splitAmount: splitRequest.amount || 0,
      initiatorName: initiator.full_name || initiator.customerName || 'Your friend',
      paymentStatus: 'Payment completed',
      message: `Your split payment of ₦${(splitRequest.amount || 0).toLocaleString()} for ${initiator.full_name || initiator.customerName || 'your friend'}'s booking has been processed successfully.`,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Split payment recipient confirmation email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send split payment recipient confirmation:', error);
    throw error;
  }
};

// 3. Email to initiator when all split payments are completed
export const sendSplitPaymentCompleteNotification = async (booking, venue, initiator, allPayments) => {
  try {
    console.log('🔄 Sending split payment complete notification email');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const initiatorEmail = initiator.email || initiator.customerEmail;
    if (!initiatorEmail || !initiatorEmail.includes('@')) {
      throw new Error('Invalid initiator email address');
    }

    const totalPaid = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const participantsCount = allPayments.length;

    const templateParams = {
      customerEmail: initiatorEmail,
      customerName: initiator.full_name || initiator.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: totalPaid,
      participantsCount: participantsCount,
      paymentStatus: 'All payments completed - Booking confirmed!',
      message: `🎉 All split payments have been completed! Your booking is now confirmed. Total collected: ₦${totalPaid.toLocaleString()} from ${participantsCount} participants.`,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Split payment complete notification email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send split payment complete notification:', error);
    throw error;
  }
};

// 4. Email to venue owner when all split payments are completed
export const sendSplitPaymentVenueOwnerNotification = async (booking, venue, initiator, allPayments) => {
  try {
    console.log('🔄 Sending split payment venue owner notification email');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const venueOwnerEmail = venue.contact_email || venue.owner_email || 'info@oneeddy.com';
    const totalPaid = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const participantsCount = allPayments.length;

    const templateParams = {
      to_email: venueOwnerEmail,
      to_name: 'Venue Manager',
      subject: `Split Payment Booking Confirmed - ${venue.name || 'Venue'}`,
      customerName: initiator.full_name || initiator.customerName || 'Guest',
      customerEmail: initiator.email || initiator.customerEmail || 'N/A',
      customerPhone: initiator.phone || initiator.customerPhone || 'N/A',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: totalPaid,
      participantsCount: participantsCount,
      paymentType: 'Split Payment',
      message: `A new split payment booking has been confirmed. Total amount: ₦${totalPaid.toLocaleString()} collected from ${participantsCount} participants.`,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Split payment venue owner notification email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send split payment venue owner notification:', error);
    throw error;
  }
};

// 5. Email to initiator when split payment requests are created
export const sendSplitPaymentRequestsCreated = async (booking, venue, initiator, splitRequests) => {
  try {
    console.log('🔄 Sending split payment requests created email');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const initiatorEmail = initiator.email || initiator.customerEmail;
    if (!initiatorEmail || !initiatorEmail.includes('@')) {
      throw new Error('Invalid initiator email address');
    }

    const totalRequested = splitRequests.reduce((sum, request) => sum + (request.amount || 0), 0);
    const requestsCount = splitRequests.length;

    const templateParams = {
      customerEmail: initiatorEmail,
      customerName: initiator.full_name || initiator.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      bookingTime: booking.start_time || booking.booking_time || '19:00',
      guestCount: booking.number_of_guests || booking.guest_count || 2,
      totalAmount: totalRequested,
      requestsCount: requestsCount,
      paymentStatus: 'Split payment requests sent',
      message: `Split payment requests have been sent to ${requestsCount} participants. Total requested: ₦${totalRequested.toLocaleString()}. You will be notified as payments are completed.`,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Split payment requests created email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send split payment requests created email:', error);
    throw error;
  }
};

export const sendCancellationEmail = async (booking, venue, customer) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    const customerEmail = customer.email || customer.customerEmail;
    if (!customerEmail || !customerEmail.includes('@')) {
      throw new Error('Invalid customer email address');
    }

    const templateParams = {
      customerEmail: customerEmail,
      customerName: customer.full_name || customer.customerName || 'Guest',
      bookingReference: booking.id || booking.bookingId || 'N/A',
      venueName: venue.name || venue.venueName || 'Venue',
      bookingDate: booking.booking_date || booking.bookingDate || new Date().toISOString(),
      refundAmount: booking.total_amount || booking.totalAmount || 0,
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Cancellation email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
    throw error;
  }
};

// Debug function to test email configuration
export const debugBookingEmail = async () => {
  try {
    console.log('🔍 EmailJS Configuration Debug:');
    console.log('Service ID:', EMAILJS_CONFIG.serviceId);
    console.log('Template ID:', EMAILJS_CONFIG.templateId);
    console.log('Public Key:', EMAILJS_CONFIG.publicKey ? 'Set' : 'Missing');
    
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      console.error('❌ EmailJS configuration incomplete');
      return false;
    }
    
    console.log('✅ EmailJS configuration appears complete');
    
    // Test with a simple email
    const testParams = {
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      bookingReference: 'TEST-123',
      venueName: 'Test Venue',
      bookingDate: new Date().toISOString(),
      bookingTime: '19:00',
      guestCount: 2,
      totalAmount: 5000
    };
    
    console.log('🧪 Testing email with params:', testParams);
    
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    console.log('✅ Email test successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Error debugging email configuration:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    return false;
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

// Test function specifically for venue owner emails
export const testVenueOwnerEmail = async (testEmail = 'zak.meadows15@gmail.com') => {
  console.log('🧪 Testing venue owner email specifically...');
  
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
    
    // Test with the exact same parameters as venue owner notification
    const testParams = {
      customerEmail: testEmail, // This should be the "To" field
      customerName: 'Test Venue Manager',
      bookingReference: 'TEST-12345',
      venueName: 'Test Venue',
      bookingDate: '2024-01-15',
      bookingTime: '19:00',
      guestCount: 2,
      totalAmount: 25000,
      message: 'TEST VENUE OWNER NOTIFICATION\n\nThis is a test email to verify venue owner notifications are working.\n\nBooking ID: TEST-12345\nCustomer: Test Customer\nGuests: 2\nTable: Table 5 (Capacity: 4)\nDate: 2024-01-15\nTime: 19:00 - 23:00\nTotal Amount: ₦25,000\n\nCustomer Contact:\nEmail: test@example.com\nPhone: +234 123 456 789\n\nPlease prepare the table and ensure excellent service for your guests.\n\n---\nEddys Members Booking System',
      from_name: 'Eddys Members',
      reply_to: 'info@oneeddy.com',
      // Additional fields for template compatibility
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+234 123 456 789',
      tableInfo: 'Table 5 (Capacity: 4)'
    };
    
    console.log('📧 Sending test venue owner email with params:', testParams);
    
    const result = await emailjs.send(
      config.serviceId,
      config.templateId,
      testParams
    );
    
    console.log('✅ Test venue owner email sent successfully:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Test venue owner email failed:', error);
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
  window.testVenueOwnerEmail = testVenueOwnerEmail;
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