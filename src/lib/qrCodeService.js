import QRCode from 'qrcode';

/**
 * Generate a QR code for Eddys Member walk-in verification
 * @param {Object} memberData - Member data with credits and status
 * @returns {Promise<string>} - Base64 QR code image
 */
export const generateEddysMemberQR = async (memberData) => {
  try {
    
    // Import supabase client
    const { supabase } = await import('./supabase.js');
    
    // Generate a unique security code
    const securityCode = generateSecurityCode();
    
    // For development, just use the direct data
    const qrData = {
      type: 'eddys_member',
      memberId: memberData.userId,
      venueId: memberData.venueId,
      securityCode: securityCode,
      memberTier: memberData.memberTier || 'VIP',
      memberSince: memberData.memberSince,
      timestamp: new Date().toISOString()
    };


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
        
        // If that fails, try with just the qr_security_code field
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ 
            qr_security_code: securityCode
          })
          .eq('id', memberData.userId);

        if (fallbackError) {
          // Continue anyway - QR code will still work
        } else {
        }
      } else {
      }
    } else {
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

    
    // For email compatibility, return both base64 and external URL
    return {
      base64: qrCodeImage,
      externalUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}&color=800020&bgcolor=FFFFFF&margin=1`
    };

  } catch (error) {
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
    
    // Import supabase client
    const { supabase } = await import('./supabase.js');
    
    // Use existing security code or generate a new one
    const securityCode = bookingData.qr_security_code || generateSecurityCode();
    
    // Handle different table data structures
    let tableNumber = 'N/A';
    if (bookingData.table?.table_number) {
      tableNumber = bookingData.table.table_number;
    } else if (bookingData.venue_tables?.table_number) {
      tableNumber = bookingData.venue_tables.table_number;
    } else if (bookingData.table_number) {
      tableNumber = bookingData.table_number;
    } else if (bookingData.table_id) {
      // Fetch table details from database if we only have table_id
      try {
        const { data: tableData, error: tableError } = await supabase
          .from('venue_tables')
          .select('table_number')
          .eq('id', bookingData.table_id)
          .single();
        
        if (!tableError && tableData) {
          tableNumber = tableData.table_number;
        }
      } catch (error) {
      }
    }

    // For development, just use the direct data
    const qrData = {
      type: 'venue-entry',
      bookingId: bookingData.id,
      venueId: bookingData.venue_id,
      securityCode: securityCode,
      bookingDate: bookingData.booking_date,
      startTime: bookingData.start_time,
      endTime: bookingData.end_time,
      tableNumber: tableNumber,
      guestCount: bookingData.number_of_guests || 2,
      status: 'confirmed',  // Always confirmed for QR codes
      timestamp: new Date().toISOString()
    };


    // Store security code in database (only for real bookings, not test ones)
    if (bookingData.id && !bookingData.id.startsWith('test-')) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ qr_security_code: securityCode })
        .eq('id', bookingData.id);

      if (updateError) {
        // Continue anyway - QR code will still work
      } else {
      }
    } else {
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

    
    // For email compatibility, return both base64 and external URL
    return {
      base64: qrCodeImage,
      externalUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}&color=800020&bgcolor=FFFFFF&margin=1`
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a security code for QR code validation
 * @returns {string} - 8-character security code
 */
export const generateSecurityCode = () => {
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
    
    // Try to parse as JSON
    const qrData = JSON.parse(qrDataString);

    // Check if this is a new format with app link and fallback
    if (qrData.url && qrData.url.startsWith('vipclub://scan')) {
      // Return the fallback data for web app processing
      return qrData.fallback;
    }

    // If it's not the new format, treat it as legacy data
    // Validate required fields based on QR code type
    if (!qrData.type) {
      throw new Error('Missing QR code type');
    }
    
    if (qrData.type === 'venue-entry') {
      if (!qrData.bookingId || !qrData.securityCode) {
        throw new Error('Missing required venue-entry QR code data');
      }
    } else if (qrData.type === 'eddys_member') {
      if (!qrData.memberId || !qrData.venueId || !qrData.securityCode) {
        throw new Error('Missing required eddys_member QR code data');
      }
    } else {
      throw new Error('Invalid QR code type: ' + qrData.type);
    }
    
    return qrData;
  } catch (error) {
    // Try to parse as URL
    try {
      if (qrDataString.startsWith('oneeddy://scan')) {
        // Parse URL parameters
        const url = new URL(qrDataString);
        const params = new URLSearchParams(url.search);
        
        // Extract data from URL parameters
        const type = params.get('type');
        if (type === 'venue-entry') {
          return {
            type: 'venue-entry',
            bookingId: params.get('bookingId'),
            venueId: params.get('venueId'),
            securityCode: params.get('securityCode')
          };
        } else if (type === 'eddys_member') {
          return {
            type: 'eddys_member',
            memberId: params.get('memberId'),
            venueId: params.get('venueId'),
            securityCode: params.get('securityCode')
          };
        }
      }
    } catch (urlError) {
    }
    
    return null;
  }
};
