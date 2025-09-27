import QRCode from 'qrcode';

/**
 * Generate a QR code for Eddys Member walk-in verification
 * @param {Object} memberData - Member data with credits and status
 * @returns {Promise<string>} - Base64 QR code image
 */
export const generateEddysMemberQR = async (memberData) => {
  try {
    console.log('🔍 Eddys Member QR Generator - Received member data:', {
      userId: memberData.userId,
      venueId: memberData.venueId,
      memberTier: memberData.memberTier,
      creditBalance: memberData.creditBalance,
      memberSince: memberData.memberSince
    });
    
    // Import supabase client
    const { supabase } = await import('./supabase.js');
    
    // Generate a unique security code
    const securityCode = generateSecurityCode();
    
    // Create QR code data for walk-in member
    const qrData = {
      type: 'eddys_member',
      memberId: memberData.userId,
      venueId: memberData.venueId,
      securityCode: securityCode,
      memberTier: memberData.memberTier || 'VIP',
      memberSince: memberData.memberSince,
      timestamp: new Date().toISOString()
    };

    console.log('🔍 Eddys Member QR Generator - Generated QR data:', qrData);

    // Store security code in database (only for real members, not test ones)
    if (memberData.userId && !memberData.userId.startsWith('test-')) {
      // Try to update with all fields first
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          qr_security_code: securityCode,
          last_qr_generated: new Date().toISOString()
        })
        .eq('id', memberData.userId);

      if (updateError) {
        console.log('⚠️ Full update failed, trying with just qr_security_code:', updateError.message);
        
        // If that fails, try with just the qr_security_code field
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ 
            qr_security_code: securityCode
          })
          .eq('id', memberData.userId);

        if (fallbackError) {
          console.error('❌ Error storing member QR security code:', fallbackError);
          // Continue anyway - QR code will still work
        } else {
          console.log('✅ Member QR security code stored in database (fallback)');
        }
      } else {
        console.log('✅ Member QR security code stored in database');
      }
    } else {
      console.log('🧪 Test member - skipping database update');
    }

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200, // Reduced size for better email display
      margin: 1,
      color: {
        dark: '#800020', // Brand burgundy
        light: '#FFFFFF'
      }
    });

    // For Gmail compatibility, we'll use a placeholder approach
    // Gmail blocks base64 images, so we'll provide a fallback URL
    const qrCodeForEmail = {
      base64: qrCodeImage,
      fallbackUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}&color=800020&bgcolor=FFFFFF&margin=1`,
      altText: 'Eddys Member QR Code - Please scan with your device'
    };

    console.log('🔍 QR Code Image details:', {
      length: qrCodeImage?.length || 0,
      start: qrCodeImage?.substring(0, 100) || 'N/A',
      isBase64: qrCodeImage?.startsWith('data:image/') || false
    });

    console.log('✅ Eddys Member QR code generated for member:', memberData.userId);
    console.log('🔍 QR Code for email:', {
      hasBase64: !!qrCodeForEmail.base64,
      hasFallbackUrl: !!qrCodeForEmail.fallbackUrl,
      fallbackUrl: qrCodeForEmail.fallbackUrl
    });
    return qrCodeForEmail;

  } catch (error) {
    console.error('❌ Error generating Eddys Member QR code:', error);
    throw error;
  }
};

/**
 * Generate a secure QR code for venue entry
 * @param {Object} bookingData - The booking data
 * @returns {Promise<string>} - Base64 QR code image
 */
export const generateVenueEntryQR = async (bookingData) => {
  try {
    console.log('🔍 QR Code Generator - Received booking data:', {
      id: bookingData.id,
      venue_id: bookingData.venue_id,
      booking_date: bookingData.booking_date,
      start_time: bookingData.start_time,
      number_of_guests: bookingData.number_of_guests,
      status: bookingData.status,
      table: bookingData.table,
      venue_tables: bookingData.venue_tables,
      table_number: bookingData.table_number
    });
    
    // Import supabase client
    const { supabase } = await import('./supabase.js');
    
    // Generate a unique security code
    const securityCode = generateSecurityCode();
    
    // Handle different table data structures
    let tableNumber = 'N/A';
    if (bookingData.table?.table_number) {
      tableNumber = bookingData.table.table_number;
    } else if (bookingData.venue_tables?.table_number) {
      tableNumber = bookingData.venue_tables.table_number;
    } else if (bookingData.table_number) {
      tableNumber = bookingData.table_number;
    }

    const qrData = {
      type: 'venue-entry',
      bookingId: bookingData.id,
      venueId: bookingData.venue_id,
      securityCode: securityCode,
      bookingDate: bookingData.booking_date,
      startTime: bookingData.start_time,
      tableNumber: tableNumber,
      guestCount: bookingData.number_of_guests || 2,
      status: bookingData.status || 'confirmed',
      timestamp: new Date().toISOString()
    };

    console.log('🔍 QR Code Generator - Generated QR data:', qrData);

    // Store security code in database (only for real bookings, not test ones)
    if (bookingData.id && !bookingData.id.startsWith('test-')) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ qr_security_code: securityCode })
        .eq('id', bookingData.id);

      if (updateError) {
        console.error('❌ Error storing QR security code:', updateError);
        // Continue anyway - QR code will still work
      } else {
        console.log('✅ QR security code stored in database');
      }
    } else {
      console.log('🧪 Test booking - skipping database update');
    }

    // Generate QR code as base64 image
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 1,
      color: {
        dark: '#800020', // Brand burgundy
        light: '#FFFFFF'
      }
    });

    console.log('✅ QR code generated for booking:', bookingData.id);
    console.log('🔍 QR Code Image details:', {
      length: qrCodeImage?.length || 0,
      start: qrCodeImage?.substring(0, 100) || 'N/A',
      isBase64: qrCodeImage?.startsWith('data:image/') || false
    });

    // For Gmail compatibility, return both base64 and external URL
    const qrCodeForEmail = {
      base64: qrCodeImage,
      fallbackUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}&color=800020&bgcolor=FFFFFF&margin=1`,
      altText: 'Venue Entry QR Code - Please scan with your device'
    };
    
    return qrCodeForEmail;
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    throw error;
  }
};

/**
 * Generate a security code for QR code validation
 * @returns {string} - 8-character security code
 */
const generateSecurityCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Parse QR code data
 * @param {string} qrDataString - The QR code data string
 * @returns {Object|null} - Parsed QR data or null if invalid
 */
export const parseQRCodeData = (qrDataString) => {
  try {
    const qrData = JSON.parse(qrDataString);
    
    // Validate required fields
    if (!qrData.type || qrData.type !== 'venue-entry') {
      throw new Error('Invalid QR code type');
    }
    
    if (!qrData.bookingId || !qrData.securityCode) {
      throw new Error('Missing required QR code data');
    }
    
    return qrData;
  } catch (error) {
    console.error('❌ Error parsing QR code data:', error);
    return null;
  }
};
