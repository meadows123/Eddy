import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import jsQR from 'jsqr';

const CameraQRScanner = ({ onMemberScanned }) => {
  // ... (previous code remains the same until handleBookingScan)

  const handleBookingScan = async (qrData) => {
    try {
      console.log('🔍 Processing booking QR code:', qrData);

      if (!qrData.bookingId || !qrData.securityCode) {
        throw new Error('Invalid booking QR code format');
      }

      // Get booking details
      console.log('🔍 Looking up booking:', qrData.bookingId);
      
      // First check if booking exists at all
      console.log('🔍 Initial booking check:', qrData.bookingId);
      let { data: bookingCheck, error: checkError } = await supabase
        .from('bookings')
        .select('id, status, qr_security_code, booking_date, created_at')
        .eq('id', qrData.bookingId)
        .single();
      
      console.log('📋 Initial booking check result:', { 
        bookingCheck, 
        checkError,
        errorMessage: checkError?.message,
        errorDetails: checkError?.details,
        bookingId: qrData.bookingId,
        bookingDate: qrData.bookingDate,
        securityCode: qrData.securityCode
      });
        
      if (checkError) {
        console.error('❌ Booking lookup failed:', {
          error: checkError,
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint,
          code: checkError.code
        });
        throw new Error(`Booking lookup failed: ${checkError.message}`);
      }
      
      if (!bookingCheck) {
        console.error('❌ No booking found:', { bookingId: qrData.bookingId });
        throw new Error(`No booking found with ID: ${qrData.bookingId}`);
      }
      
      if (bookingCheck.status !== 'confirmed') {
        console.error('❌ Booking not confirmed:', { 
          status: bookingCheck.status,
          bookingId: qrData.bookingId,
          date: bookingCheck.booking_date
        });
        throw new Error(`Booking is not confirmed (status: ${bookingCheck.status})`);
      }
      
      console.log('✅ Booking found:', {
        id: bookingCheck.id,
        status: bookingCheck.status,
        date: bookingCheck.booking_date,
        securityCode: bookingCheck.qr_security_code,
        qrSecurityCode: qrData.securityCode
      });
      
      // Get full booking details
      console.log('🔍 Looking up full booking details:', qrData.bookingId);
      let { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_date,
          start_time,
          end_time,
          number_of_guests,
          qr_security_code,
          profiles!bookings_user_id_fkey (
            full_name,
            email,
            phone
          ),
          venues!bookings_venue_id_fkey (
            name,
            address
          ),
          venue_tables!bookings_table_id_fkey (
            table_type,
            capacity
          )
        `)
        .eq('id', qrData.bookingId)
        .eq('status', 'confirmed')  // Add status check here too
        .single();

      if (bookingError || !booking) {
        console.error('❌ Full booking lookup failed:', { 
          error: bookingError,
          message: bookingError?.message,
          details: bookingError?.details,
          hint: bookingError?.hint,
          code: bookingError?.code,
          bookingId: qrData.bookingId,
          initialBooking: bookingCheck
        });

        // Play error sound (simple blop)
        try {
          const errorSound = new Audio("data:audio/wav;base64,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");
          errorSound.play();
        } catch (e) {
          console.log('Audio feedback not supported');
        }

        // Since we already found the booking in the first check, use that data
        if (bookingCheck) {
          console.log('✅ Using initial booking data:', bookingCheck);
          const fallbackBooking = {
            ...bookingCheck,
            profiles: { full_name: 'Unknown', email: 'Unknown', phone: 'Unknown' },
            venues: { name: 'Unknown', address: 'Unknown' },
            venue_tables: { table_type: 'Unknown', capacity: 0 }
          };
          booking = fallbackBooking;
        } else {
          throw new Error(`Booking not found or not confirmed. ID: ${qrData.bookingId}`);
        }
      }
      
      // Check if booking is for today
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const bookingDate = qrData.bookingDate || booking.booking_date;

      // Log all date-related information
      console.log('📅 Date comparison:', {
        now: now.toISOString(),
        today,
        bookingDate,
        qrDate: qrData.bookingDate,
        dbDate: booking.booking_date,
        matches: bookingDate === today,
        startTime: booking.start_time,
        endTime: booking.end_time,
        currentTime: now.toTimeString().split(' ')[0]
      });

      // Normalize dates for comparison (strip any timezone info)
      const normalizedBookingDate = new Date(bookingDate).toISOString().split('T')[0];
      const normalizedToday = new Date(today).toISOString().split('T')[0];

      console.log('📅 Normalized dates:', {
        normalizedBookingDate,
        normalizedToday,
        matches: normalizedBookingDate === normalizedToday
      });

      if (normalizedBookingDate !== normalizedToday) {
        throw new Error(`This booking is for ${normalizedBookingDate}, not today (${normalizedToday})`);
      }

      // Verify security code
      if (booking.qr_security_code) {
        // For bookings with security codes, verify they match
        if (booking.qr_security_code !== qrData.securityCode) {
          console.error('❌ Security code mismatch:', {
            expected: booking.qr_security_code,
            received: qrData.securityCode
          });
          throw new Error('Invalid security code');
        }
      } else {
        // For legacy bookings without security codes, log but allow
        console.log('⚠️ Legacy booking without security code:', booking.id);
      }

      // Update scan count
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          scan_count: (booking.scan_count || 0) + 1,
          last_scanned_at: new Date().toISOString()
        })
        .eq('id', qrData.bookingId);

      if (updateError) {
        console.warn('⚠️ Failed to update scan count:', updateError);
      }

      setScanResult({
        type: 'venue-entry',
        bookingId: booking.id,
        customerName: booking.profiles?.full_name || 'Unknown',
        customerEmail: booking.profiles?.email || 'Unknown',
        venueName: booking.venues?.name || 'Unknown',
        tableType: booking.venue_tables?.table_type || 'N/A',
        guestCount: booking.number_of_guests,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        scanTime: new Date().toLocaleString(),
        status: 'verified'
      });

      setSuccess('✅ Booking verified! Customer can be seated.');
      setError(null);

    } catch (err) {
      console.error('❌ Error processing booking scan:', err);
      throw err;
    }
  };

  // ... (rest of the component remains the same)
};

export default CameraQRScanner;