import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import { BrowserMultiFormatReader } from '@zxing/library';

const VenueQRScanner = ({ onMemberScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualQRInput, setManualQRInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Initialize camera when component mounts
  useEffect(() => {
    if (scannerActive) {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scannerActive]);

  const initializeCamera = async () => {
    try {
      // Get available video devices
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      
      // Use the first available camera (or back camera if available)
      let selectedDeviceId = videoInputDevices[0]?.deviceId;
      
      // Prefer back camera on mobile devices
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      console.log('📷 Available cameras:', videoInputDevices.map(d => d.label));
      console.log('📷 Selected camera:', selectedDeviceId);

      // Start continuous scanning
      await codeReader.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            console.log('🔍 QR Code detected:', result.getText());
            handleScan(result.getText());
          }
          if (err && !(err instanceof Error)) {
            console.log('🔍 No QR code detected yet...');
          }
        }
      );

      setIsScanning(true);
      setError(null);
      console.log('✅ QR Scanner started successfully');
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    try {
      // Stop the QR code reader
      codeReader.current.reset();
      
      // Stop the video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsScanning(false);
      console.log('✅ QR Scanner stopped');
    } catch (err) {
      console.error('❌ Error stopping camera:', err);
    }
  };

  const startScanning = () => {
    setScannerActive(true);
    setError(null);
    setSuccess(null);
    setScanResult(null);
  };

  const stopScanning = () => {
    setScannerActive(false);
    stopCamera();
  };

  const handleManualScan = () => {
    if (!manualQRInput.trim()) {
      setError('Please enter QR code data');
      return;
    }
    
    console.log('🔍 Manual QR scan triggered with data:', manualQRInput);
    handleScan(manualQRInput.trim());
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

      // Verify security code
      if (member.qr_security_code !== qrData.securityCode) {
        throw new Error('Invalid QR code - security code mismatch');
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

      // Update member's last visit
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_visit: new Date().toISOString(),
          last_venue_visited: qrData.venueId
        })
        .eq('id', qrData.memberId);

      if (updateError) {
        console.warn('⚠️ Failed to update member visit record:', updateError);
        // Continue anyway - not critical
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

      // Stop scanning after successful scan
      setTimeout(() => {
        stopScanning();
      }, 3000);

    } catch (err) {
      console.error('❌ Error processing Eddys Member QR code:', err);
      throw err;
    }
  };

  const handleBookingScan = async (qrData) => {
    try {
      console.log('🔍 Processing booking QR code:', qrData);

      // Validate booking exists and is confirmed
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey (full_name, email, phone),
          venues!bookings_venue_id_fkey (name, address)
        `)
        .eq('id', qrData.bookingId)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found or not confirmed');
      }

      // Check if booking is for today
      const today = new Date().toISOString().split('T')[0];
      if (booking.booking_date !== today) {
        throw new Error('This booking is not for today');
      }

      // Check if QR code security code matches
      if (booking.qr_security_code !== qrData.securityCode) {
        throw new Error('Invalid QR code - security code mismatch');
      }

      // Check if already scanned
      if (booking.qr_code_scan_count > 0) {
        throw new Error('This QR code has already been scanned');
      }

      // Update booking with scan information
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          qr_code_scan_count: 1,
          last_scan_at: new Date().toISOString(),
          last_scan_by: 'venue_owner', // You might want to get actual venue owner ID
          status: 'checked_in'
        })
        .eq('id', qrData.bookingId);

      if (updateError) {
        throw new Error('Failed to update booking status');
      }

      // Send SMS notification to customer
      await sendQRSMSNotification(booking, qrData);

      setScanResult({
        bookingId: booking.id,
        customerName: booking.profiles?.full_name || 'Unknown',
        customerEmail: booking.profiles?.email || 'Unknown',
        venueName: booking.venues?.name || 'Unknown',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        partySize: booking.number_of_guests,
        tableNumber: booking.table_number || 'N/A',
        tableType: booking.venue_tables?.[0]?.table_type || 'VIP Table',
        totalAmount: booking.total_amount,
        paymentMethod: booking.payment_method || 'Eddys Credits',
        scanTime: new Date().toLocaleString()
      });

      setSuccess('✅ Entry verified successfully! Customer has been checked in.');
      setError(null);

      // Stop scanning after successful scan
      setTimeout(() => {
        stopScanning();
      }, 3000);

    } catch (err) {
      console.error('❌ Error processing QR code:', err);
      setError(err.message);
      setSuccess(null);
    }
  };

  const sendQRSMSNotification = async (booking, qrData) => {
    try {
      // This will be implemented when we add Twilio
      console.log('📱 SMS notification would be sent to:', booking.profiles?.phone);
      console.log('📱 Message: Your QR code has been scanned at the venue. Welcome!');
      
      // For now, we'll just log it
      // TODO: Implement actual SMS sending with Twilio
    } catch (error) {
      console.error('❌ Error sending SMS notification:', error);
    }
  };


  return (
    <div className="venue-qr-scanner">
      <div className="scanner-header">
        <h2>📱 Venue Entry Scanner</h2>
        <p>Scan customer QR codes to verify bookings and check them in</p>
      </div>

      {!scannerActive ? (
        <div className="scanner-start">
          <button 
            onClick={startScanning}
            className="start-scan-btn"
          >
            🎯 Start Scanning
          </button>
        </div>
      ) : (
        <div className="scanner-active">
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-feed"
            />
            <div className="scan-overlay">
              <div className="scan-frame"></div>
              <p className="scan-instructions">
                Position QR code within the frame<br/>
                <small>Scanner will automatically detect QR codes</small>
              </p>
            </div>
          </div>
          
          <div className="scanner-controls">
            <button 
              onClick={stopScanning}
              className="stop-scan-btn"
            >
              ⏹️ Stop Scanning
            </button>
            <button 
              onClick={() => setShowManualInput(!showManualInput)}
              className="test-scan-btn"
              style={{ marginLeft: '10px', backgroundColor: '#FFD700', color: '#800020' }}
            >
              🔧 Manual Input
            </button>
          </div>

          {showManualInput && (
            <div className="manual-input-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '10px' }}>Manual QR Code Input (Debug)</h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                If the camera scanner isn't working, you can manually enter the QR code data here for testing.
              </p>
              <textarea
                value={manualQRInput}
                onChange={(e) => setManualQRInput(e.target.value)}
                placeholder="Paste QR code data here (JSON format)..."
                style={{ 
                  width: '100%', 
                  height: '100px', 
                  padding: '10px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              />
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={handleManualScan}
                  className="test-scan-btn"
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                  🔍 Test This QR Data
                </button>
                <button 
                  onClick={() => setManualQRInput('')}
                  style={{ marginLeft: '10px', backgroundColor: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <h4>❌ Error</h4>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="success-message">
          <h4>{success}</h4>
        </div>
      )}

      {scanResult && (
        <div className="scan-result">
          {scanResult.type === 'eddys_member' ? (
            <>
              <h4>✅ Eddys Member Verified</h4>
              <div className="result-details">
                <div className="member-info">
                  <h5>👑 Member Information</h5>
                  <p><strong>Name:</strong> {scanResult.customerName}</p>
                  <p><strong>Email:</strong> {scanResult.customerEmail}</p>
                  <p><strong>Member Tier:</strong> {scanResult.memberTier}</p>
                  <p><strong>Member Since:</strong> {new Date(scanResult.memberSince).toLocaleDateString()}</p>
                </div>
                
                <div className="venue-info">
                  <h5>🏢 Venue Information</h5>
                  <p><strong>Venue:</strong> {scanResult.venueName}</p>
                  <p><strong>Available Credits:</strong> ₦{scanResult.creditBalance?.toLocaleString()}</p>
                </div>
                
                <div className="scan-info">
                  <h5>🔍 Scan Information</h5>
                  <p><strong>Scanned at:</strong> {scanResult.scanTime}</p>
                  <p><strong>Status:</strong> ✅ Verified & Ready to Order</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4>✅ Booking Verified</h4>
              <div className="result-details">
                <div className="booking-info">
                  <h5>📋 Booking Details</h5>
                  <p><strong>Booking ID:</strong> {scanResult.bookingId}</p>
                  <p><strong>Customer:</strong> {scanResult.customerName}</p>
                  <p><strong>Email:</strong> {scanResult.customerEmail}</p>
                  <p><strong>Date:</strong> {scanResult.bookingDate}</p>
                  <p><strong>Time:</strong> {scanResult.startTime}</p>
                  <p><strong>Party Size:</strong> {scanResult.partySize} guests</p>
                </div>
                
                <div className="venue-info">
                  <h5>🏢 Venue Information</h5>
                  <p><strong>Venue:</strong> {scanResult.venueName}</p>
                  <p><strong>Table:</strong> {scanResult.tableType} #{scanResult.tableNumber}</p>
                  <p><strong>Payment Method:</strong> {scanResult.paymentMethod}</p>
                </div>
                
                <div className="scan-info">
                  <h5>🔍 Scan Information</h5>
                  <p><strong>Scanned at:</strong> {scanResult.scanTime}</p>
                  <p><strong>Status:</strong> ✅ Checked In</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .venue-qr-scanner {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .scanner-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .scanner-header h2 {
          color: #800020;
          margin-bottom: 10px;
        }

        .scanner-start {
          text-align: center;
        }

        .start-scan-btn {
          background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
          color: white;
          border: none;
          padding: 15px 30px;
          font-size: 18px;
          border-radius: 25px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(128, 0, 32, 0.3);
          transition: transform 0.2s;
        }

        .start-scan-btn:hover {
          transform: translateY(-2px);
        }

        .camera-container {
          position: relative;
          margin-bottom: 20px;
        }

        .camera-feed {
          width: 100%;
          max-width: 500px;
          height: 300px;
          object-fit: cover;
          border-radius: 10px;
          cursor: pointer;
        }

        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .scan-frame {
          width: 200px;
          height: 200px;
          border: 3px solid #FFD700;
          border-radius: 10px;
          background: transparent;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { border-color: #FFD700; }
          50% { border-color: #800020; }
          100% { border-color: #FFD700; }
        }

        .scan-instructions {
          color: white;
          background: rgba(0,0,0,0.7);
          padding: 10px 20px;
          border-radius: 20px;
          margin-top: 20px;
          font-weight: bold;
        }

        .scanner-controls {
          text-align: center;
        }

        .stop-scan-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 20px;
          cursor: pointer;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #f5c6cb;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #c3e6cb;
        }

        .scan-result {
          background: #e7f3ff;
          color: #004085;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #b8daff;
        }

        .result-details p {
          margin: 8px 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default VenueQRScanner;
