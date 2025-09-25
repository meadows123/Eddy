import QRCode from 'qrcode';

/**
 * Generate a secure QR code for venue entry
 * @param {Object} bookingData - The booking data
 * @returns {Promise<string>} - Base64 QR code image
 */
export const generateVenueEntryQR = async (bookingData) => {
  try {
    // Import supabase client
    const { supabase } = await import('./supabase.js');
    
    // Generate a unique security code
    const securityCode = generateSecurityCode();
    
    const qrData = {
      type: 'venue-entry',
      bookingId: bookingData.id,
      venueId: bookingData.venue_id,
      securityCode: securityCode,
      bookingDate: bookingData.booking_date,
      startTime: bookingData.start_time,
      tableNumber: bookingData.table?.table_number || 'N/A',
      guestCount: bookingData.number_of_guests || 2,
      status: bookingData.status || 'confirmed',
      timestamp: new Date().toISOString()
    };

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
      width: 300,
      margin: 2,
      color: {
        dark: '#800020', // Brand burgundy
        light: '#FFFFFF'
      }
    });

    console.log('✅ QR code generated for booking:', bookingData.id);
    return qrCodeImage;
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
