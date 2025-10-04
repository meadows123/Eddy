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

export const sendBookingConfirmation = async (booking, venue, customer, qrCodeImage = null) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    // Validate customer email
    const customerEmail = customer.email || customer.customerEmail || customer.full_name;
    if (!customerEmail || !customerEmail.includes('@')) {
      throw new Error('Invalid customer email address');
    }

    // Use exact parameter names that match the EmailJS template
    const templateParams = {
      // EmailJS required fields - these MUST match your template exactly
      customerEmail: customerEmail, // This matches the template's "To" field
      to_name: customer.full_name || customer.customerName || customer.name || 'Valued Customer',
      
      // Customer Information
      customerName: customer.full_name || customer.customerName || customer.name || 'Valued Customer',
      to_email: customerEmail, // Keep this for backward compatibility
      customerPhone: customer.phone || customer.customerPhone || customer.phone_number || 'N/A',
      
      // Booking Information - Use actual booking data
      bookingReference: booking.booking_reference || `VIP-${booking.id}`,
      partySize: booking.guest_count || booking.guests || booking.number_of_guests || '2',
      bookingDate: new Date(booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      bookingTime: booking.booking_time || booking.start_time || '7:00 PM',
      bookingDuration: booking.duration || booking.booking_duration || '4',
      
      // Table Information - Use actual table data
      tableNumber: booking.table_number || booking.venue_tables?.table_number || booking.table?.table_number || 'TBD',
      tableType: booking.table_type || booking.venue_tables?.table_type || booking.table?.table_type || 'VIP Table',
      tableCapacity: booking.venue_tables?.capacity || booking.table?.capacity || booking.guest_count || booking.guests || booking.number_of_guests || '2',
      tableLocation: booking.table_location || venue.table_location || 'Prime Location',
      tableFeatures: booking.table_features || booking.venue_tables?.features || booking.table?.features || 'Premium seating with excellent view',
      
      // Venue Information - Use actual venue data
      venueName: venue.name || 'Premium Venue',
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
      unsubscribeUrl: `${window.location.origin}/settings`,
      
      // QR Code for venue entry
      qrCodeImage: qrCodeImage || null,
      hasQrCode: !!qrCodeImage
    };

    // Optimize email delivery to reduce spam filtering
    const optimizedParams = optimizeEmailDelivery(templateParams);

    // Send to customer using EmailJS template with QR code parameters
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        ...optimizedParams,
        qrCodeImage: qrCodeImage?.base64 || qrCodeImage,
        qrCodeUrl: qrCodeImage?.externalUrl || qrCodeImage?.base64 || qrCodeImage
      }
    );

    
    return result;
  } catch (error) {
    // Provide more specific error messages
    if (error.text === 'The recipients address is empty') {
      // EmailJS template issue: The "To" field in your EmailJS template is missing or incorrectly configured.
    }
    
    throw error;
  }
};

export const sendVenueOwnerNotification = async (booking, venue, customer, venueOwnerData = null) => {
  try {
    // Create venue owner data with fallbacks
    const ownerData = {
      name: venueOwnerData?.owner_name || venueOwnerData?.name || 'Venue Manager',
      email: venueOwnerData?.owner_email || venueOwnerData?.email || venue.contact_email || 'info@oneeddy.com'
    };
    
    // Debug logging
    console.log('🔍 Venue owner notification data:', {
      venueOwnerData,
      ownerData,
      venueContactEmail: venue.contact_email,
      finalEmail: ownerData.email,
      emailIsValid: ownerData.email && ownerData.email.includes('@')
    });
    
    // Use Supabase Edge Function for venue owner notifications
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: ownerData.email,
        subject: `New Booking - ${venue.name}`,
        template: 'venue-owner-notification',
        data: {
          venueName: venue.name || 'Venue',
          venueAddress: venue.address || 'Lagos, Nigeria',
          venuePhone: venue.contact_phone || '+234 XXX XXX XXXX',
          venueEmail: venue.contact_email || 'info@oneeddy.com',
          venueOwnerName: ownerData.name,
          venueOwnerEmail: ownerData.email,
          customerName: customer.full_name || customer.name || 'Guest',
          customerEmail: customer.email || 'guest@example.com',
          customerPhone: customer.phone || 'N/A',
          bookingId: booking.id,
          bookingDate: booking.booking_date,
          bookingTime: `${booking.start_time} - ${booking.end_time}`,
          numberOfGuests: booking.number_of_guests || 1,
          tableNumber: booking.table_number || 'N/A',
          totalAmount: booking.total_amount || 'N/A',
          bookingStatus: booking.status || 'confirmed'
        }
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
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
        from_name: 'Eddys Members',
        reply_to: 'info@oneeddy.com'
      }
    );

    return result;
  } catch (error) {
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

    return { success: true, messageId: result.text };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Test function to verify EmailJS setup
export const testEmailService = async () => {
  // Check configuration first
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
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
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testData
    );
    
    return { success: true, result };
  } catch (error) {
    
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
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testData
    );
    
    return { success: true, result };
  } catch (error) {
    
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
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
};

// Debug function for booking confirmation email issues
export const debugBookingEmail = async (booking, venue, customer) => {
  // Check EmailJS configuration
  
  // Validate customer email
  const customerEmail = customer.email || customer.customerEmail || customer.full_name;
  
  if (!customerEmail || !customerEmail.includes('@')) {
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
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    return { success: true, result };
  } catch (error) {
    if (error.text === 'The recipients address is empty') {
      // EmailJS template is missing the "To" field configuration
    }
    
    return { success: false, error: error.text || error.message };
  }
};

// Simple console test function for immediate debugging
export const testEmailJSNow = async (testEmail = 'test@example.com') => {
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
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
    totalAmount: '5000',
    // Table Information - Test data
    tableNumber: 'VIP-05',
    tableType: 'Premium Table',
    tableCapacity: '4',
    tableLocation: 'Main Floor',
    tableFeatures: 'Window view with premium seating'
  };
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    return true;
  } catch (error) {
    if (error.text === 'The recipients address is empty') {
      // EmailJS template needs {{customerEmail}} in the "To" field
    }
    
    return false;
  }
};

// Test function specifically for table information in emails
export const testTableInfoInEmails = async (testEmail = 'test@example.com') => {
  console.log('🧪 Testing table information in booking confirmation emails...');
  
  // Check configuration
  if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
    console.error('❌ EmailJS not fully configured. Check your .env file.');
    return false;
  }
  
  // Test data with table information
  const testParams = {
    customerEmail: testEmail,
    to_name: 'Table Test User',
    customerName: 'Table Test User',
    bookingReference: 'TABLE-TEST-123',
    venueName: 'Table Test Venue',
    bookingDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    bookingTime: '19:00',
    partySize: '4',
    totalAmount: '15000',
    // Table Information - Test all possible formats
    tableNumber: 'VIP-05',
    table_number: 'VIP-05', // Alternative format
    tableType: 'Premium Table',
    table_type: 'Premium Table', // Alternative format
    tableCapacity: '4',
    table_capacity: '4', // Alternative format
    tableLocation: 'Main Floor',
    table_location: 'Main Floor', // Alternative format
    tableFeatures: 'Window view with premium seating',
    table_features: 'Window view with premium seating' // Alternative format
  };
  
  console.log('📧 Testing table info with params:', {
    tableNumber: testParams.tableNumber,
    tableType: testParams.tableType,
    tableCapacity: testParams.tableCapacity,
    tableLocation: testParams.tableLocation,
    tableFeatures: testParams.tableFeatures
  });
  
  try {
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      testParams
    );
    
    console.log('✅ Table info test email sent successfully!', result);
    console.log('📋 Expected in email:');
    console.log('   - Table: VIP-05');
    console.log('   - Type: Premium Table');
    console.log('   - Capacity: 4 guests');
    console.log('   - Location: Main Floor');
    console.log('   - Features: Window view with premium seating');
    return true;
  } catch (error) {
    console.error('❌ Table info test email failed:', error);
    return false;
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.quickEmailTest = quickEmailTest;
  window.testEmailService = testEmailService;
  window.testEmailJSNow = testEmailJSNow;
  window.testTableInfoInEmails = testTableInfoInEmails;
} 

export const sendVenueOwnerSignupEmail = async (venueOwnerData) => {
  try {
    
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
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Test function to debug Edge Function email sending
export const testEdgeFunctionEmail = async (template = 'venue-owner-invitation', testData = {}) => {
  try {
    
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
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testEdgeFunctionEmail = testEdgeFunctionEmail;
}

// Simple test function for localhost debugging
export const testLocalhostEmail = async (testEmail = 'test@example.com') => {
  // Check configuration
  const config = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  };
  
  if (!config.serviceId || !config.templateId || !config.publicKey) {
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
    
    const result = await emailjs.send(
      config.serviceId,
      config.templateId,
      testParams
    );
    
    return { success: true, result };
  } catch (error) {
    
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
    
    const testFormData = {
      name: testData.name || 'Test User',
      email: testData.email || 'test@example.com',
      subject: testData.subject || 'Test Contact Form Submission',
      message: testData.message || 'This is a test message from the contact form to verify the email functionality is working correctly.'
    };

    const result = await sendContactFormEmail(testFormData);
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// QR scan notification email function
export const sendQRScanNotification = async (notificationData) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.publicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    // Validate notification data
    if (!notificationData.customerEmail || !notificationData.venueName || !notificationData.bookingId) {
      throw new Error('Missing required notification data');
    }

    // Create notification message
    const notificationMessage = `
QR CODE SCAN NOTIFICATION

Booking ID: ${notificationData.bookingId}
Venue: ${notificationData.venueName}
Customer Email: ${notificationData.customerEmail}
Scan Time: ${notificationData.scanTime}
Booking Date: ${notificationData.bookingDate}
Start Time: ${notificationData.startTime}
Guest Count: ${notificationData.guestCount}
Table Number: ${notificationData.tableNumber}

Customer has successfully scanned their QR code and is ready to be seated.

---
This notification was sent automatically by the Eddys Members QR scanning system.
    `.trim();

    // Use the main template but with notification data
    const templateParams = {
      customerEmail: 'info@oneeddy.com', // Send notification to admin
      to_name: 'Eddys Members Admin',
      from_name: 'QR Scanner System',
      message: notificationMessage,
      subject: `QR Code Scanned - ${notificationData.venueName}`,
      
      // Add minimal booking-like data to satisfy template requirements
      customerName: 'QR Scanner System',
      bookingReference: notificationData.bookingId,
      venueName: notificationData.venueName,
      bookingDate: notificationData.bookingDate,
      bookingTime: notificationData.startTime,
      partySize: notificationData.guestCount,
      totalAmount: '0'
    };

    // Send email using EmailJS
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    return { success: true, result };
  } catch (error) {
    console.error('Error sending QR scan notification:', error);
    throw error;
  }
};

// Split payment venue owner notification email function
export const sendSplitPaymentVenueOwnerNotification = async (bookingData, venueData, customerData) => {
  try {
    // Use Supabase Edge Function to send the split payment venue notification
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'split-payment-venue-notification',
        data: {
          adminEmail: 'info@oneeddy.com',
          venueName: venueData.name,
          venueContactEmail: venueData.contact_email,
          bookingId: bookingData.id,
          bookingDate: bookingData.booking_date,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          guestCount: bookingData.number_of_guests,
          customerName: customerData.full_name,
          customerEmail: customerData.email,
          totalAmount: bookingData.total_amount,
          splitPaymentCount: bookingData.split_payment_count || 0,
          venueAddress: venueData.address
        }
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending split payment venue owner notification:', error);
    throw error;
  }
};

// Split payment completion emails function
export const sendSplitPaymentCompletionEmails = async (bookingData, venueData, customerData, splitPayments) => {
  try {
    // Send completion email to main booker
    const { data: mainBookerData, error: mainBookerError } = await supabase.functions.invoke('send-email', {
      body: {
        template: 'split-payment-completion',
        data: {
          email: customerData.email,
          customerName: customerData.full_name,
          bookingId: bookingData.id,
          bookingDate: bookingData.booking_date,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          venueName: venueData.name,
          venueAddress: venueData.address,
          totalAmount: bookingData.total_amount,
          splitPaymentCount: splitPayments.length,
          completionDate: new Date().toLocaleDateString()
        }
      }
    });

    if (mainBookerError) {
      throw mainBookerError;
    }

    // Send completion emails to all split payment participants
    const participantEmails = splitPayments.map(async (payment) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template: 'split-payment-participant-completion',
          data: {
            email: payment.recipient_email,
            recipientName: payment.recipient_name,
            mainBookerName: customerData.full_name,
            bookingId: bookingData.id,
            bookingDate: bookingData.booking_date,
            startTime: bookingData.start_time,
            endTime: bookingData.end_time,
            venueName: venueData.name,
            venueAddress: venueData.address,
            amountPaid: payment.amount,
            completionDate: new Date().toLocaleDateString()
          }
        }
      });

      if (error) {
        console.error(`Failed to send completion email to ${payment.recipient_email}:`, error);
      }

      return data;
    });

    await Promise.all(participantEmails);

    return { mainBookerData, participantEmails };
  } catch (error) {
    console.error('Error sending split payment completion emails:', error);
    throw error;
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

    return { success: true, result };
  } catch (error) {
    
    throw error;
  }
};