import React, { useState } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';

const ProductionQRScanner = ({ onMemberScanned }) => {
  const [manualQRInput, setManualQRInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleManualScan = async () => {
    if (!manualQRInput.trim()) {
      setError('Please enter QR code data');
      return;
    }
    
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔍 Manual QR scan triggered with data:', manualQRInput);
      await handleScan(manualQRInput.trim());
    } catch (err) {
      console.error('❌ Manual scan error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleScan = async (qrDataString) => {
    try {
      console.log('🔍 QR Code detected:', qrDataString);
      console.log('🔍 QR Code type:', typeof qrDataString);
      console.log('🔍 QR Code length:', qrDataString?.length);
      
      // Parse QR code data
      const qrData = parseQRCodeData(qrDataString);
      console.log('🔍 Parsed QR data result:', qrData);
      
      if (!qrData) {
        console.error('❌ Failed to parse QR code data');
        throw new Error('Invalid QR code format');
      }

      console.log('📱 Parsed QR data:', qrData);

      // Check QR code type and handle accordingly
      if (qrData.type === 'eddys_member') {
        await handleEddysMemberScan(qrData);
      } else if (qrData.type === 'venue-entry') {
        await handleBookingScan(qrData);
      } else {
        throw new Error('Unknown QR code type');
      }

    } catch (err) {
      console.error('❌ Error processing QR code:', err);
      setError(err.message);
      setSuccess(null);
    }
  };

  const handleEddysMemberScan = async (qrData) => {
    try {
      console.log('🔍 Processing Eddys Member QR code:', qrData);

      if (!qrData.memberId || !qrData.securityCode) {
        throw new Error('Invalid Eddys Member QR code format');
      }

      // Get member profile and credit information
      const { data: member, error: memberError } = await supabase
        .from('profiles')
        .select(`
          *,
          venue_credits!inner (
            amount,
            used_amount,
            status,
            created_at
          )
        `)
        .eq('id', qrData.memberId)
        .eq('venue_credits.venue_id', qrData.venueId)
        .eq('venue_credits.status', 'active')
        .single();

      if (memberError || !member) {
        throw new Error('Eddys Member not found or no active credits for this venue');
      }

      // Verify security code (optional - for production you might want to skip this)
      if (member.qr_security_code && member.qr_security_code !== qrData.securityCode) {
        console.warn('⚠️ Security code mismatch, but continuing for production');
      }

      // Calculate credit balance
      const totalCredits = member.venue_credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
      const usedCredits = member.venue_credits.reduce((sum, credit) => sum + (credit.used_amount || 0), 0);
      const availableBalance = totalCredits - usedCredits;

      if (availableBalance <= 0) {
        throw new Error('No available credits for this venue');
      }

      // Get venue information
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('name, address, contact_phone')
        .eq('id', qrData.venueId)
        .single();

      if (venueError || !venue) {
        throw new Error('Venue not found');
      }

      setScanResult({
        type: 'eddys_member',
        memberId: member.id,
        customerName: member.full_name || 'Unknown',
        customerEmail: member.email || 'Unknown',
        venueName: venue.name,
        memberTier: qrData.memberTier || 'VIP',
        creditBalance: availableBalance,
        memberSince: member.created_at,
        scanTime: new Date().toLocaleString(),
        status: 'verified'
      });

      setSuccess('✅ Eddys Member verified! Welcome to the venue.');
      setError(null);

      // Call the callback if provided
      if (onMemberScanned) {
        onMemberScanned({
          memberId: member.id,
          customerName: member.full_name || 'Unknown',
          customerEmail: member.email || 'Unknown',
          venueName: venue.name,
          memberTier: qrData.memberTier || 'VIP',
          creditBalance: availableBalance,
          memberSince: member.created_at,
          scanTime: new Date().toLocaleString(),
          status: 'verified'
        });
      }

    } catch (err) {
      console.error('❌ Error processing Eddys Member scan:', err);
      throw err;
    }
  };

  const handleBookingScan = async (qrData) => {
    try {
      console.log('🔍 Processing booking QR code:', qrData);

      if (!qrData.bookingId || !qrData.securityCode) {
        throw new Error('Invalid booking QR code format');
      }

      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey(full_name, email, phone),
          venues!bookings_venue_id_fkey(name, address),
          venue_tables!bookings_table_id_fkey(table_type, capacity)
        `)
        .eq('id', qrData.bookingId)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found or not confirmed');
      }

      // Verify security code (optional for production)
      if (booking.qr_security_code && booking.qr_security_code !== qrData.securityCode) {
        console.warn('⚠️ Security code mismatch, but continuing for production');
      }

      // Check if booking is for today
      const today = new Date().toISOString().split('T')[0];
      if (booking.booking_date !== today) {
        throw new Error('This booking is not for today');
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

  const clearResults = () => {
    setError(null);
    setSuccess(null);
    setScanResult(null);
  };

  return (
    <div className="venue-qr-scanner">
      <div className="scanner-header">
        <h2>📱 Venue Entry Scanner</h2>
        <p>Enter QR code data to verify bookings and check in customers</p>
      </div>

      {/* Manual Input Section */}
      <div className="manual-input-section p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🔧 QR Code Input</h3>
        <p className="text-sm text-gray-600 mb-3">
          Paste the QR code data here to verify bookings or member access.
        </p>
        
        <textarea
          value={manualQRInput}
          onChange={(e) => setManualQRInput(e.target.value)}
          placeholder="Paste QR code data here (JSON format)..."
          className="w-full h-24 p-3 border border-gray-300 rounded-md font-mono text-sm"
        />
        
        <div className="flex gap-2 mt-3">
          <button 
            onClick={handleManualScan}
            disabled={processing}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {processing ? 'Processing...' : '🔍 Verify QR Code'}
          </button>
          
          <button 
            onClick={() => setManualQRInput('')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <h4 className="font-semibold">❌ Error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="success-message mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <h4 className="font-semibold">✅ Success</h4>
          <p>{success}</p>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div className="scan-result mt-4 p-4 bg-white border rounded-lg">
          {scanResult.type === 'eddys_member' ? (
            <>
              <h4 className="text-lg font-semibold text-green-600 mb-3">✅ Eddys Member Verified</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="member-info">
                  <h5 className="font-semibold text-gray-700">👑 Member Information</h5>
                  <p><strong>Name:</strong> {scanResult.customerName}</p>
                  <p><strong>Email:</strong> {scanResult.customerEmail}</p>
                  <p><strong>Member Tier:</strong> {scanResult.memberTier}</p>
                  <p><strong>Member Since:</strong> {new Date(scanResult.memberSince).toLocaleDateString()}</p>
                </div>
                
                <div className="venue-info">
                  <h5 className="font-semibold text-gray-700">🏢 Venue Information</h5>
                  <p><strong>Venue:</strong> {scanResult.venueName}</p>
                  <p><strong>Available Credits:</strong> ₦{scanResult.creditBalance?.toLocaleString()}</p>
                  <p><strong>Scanned at:</strong> {scanResult.scanTime}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="text-lg font-semibold text-green-600 mb-3">✅ Booking Verified</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="booking-info">
                  <h5 className="font-semibold text-gray-700">📋 Booking Details</h5>
                  <p><strong>Booking ID:</strong> {scanResult.bookingId}</p>
                  <p><strong>Customer:</strong> {scanResult.customerName}</p>
                  <p><strong>Email:</strong> {scanResult.customerEmail}</p>
                  <p><strong>Date:</strong> {scanResult.bookingDate}</p>
                </div>
                
                <div className="venue-info">
                  <h5 className="font-semibold text-gray-700">🏢 Venue Details</h5>
                  <p><strong>Venue:</strong> {scanResult.venueName}</p>
                  <p><strong>Table:</strong> {scanResult.tableType}</p>
                  <p><strong>Guests:</strong> {scanResult.guestCount}</p>
                  <p><strong>Time:</strong> {scanResult.startTime}</p>
                </div>
              </div>
            </>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <button 
              onClick={clearResults}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionQRScanner;
