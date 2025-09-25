import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import { BrowserMultiFormatReader } from '@zxing/library';

const VenueQRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
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

  const handleScan = async (qrDataString) => {
    try {
      console.log('🔍 QR Code detected:', qrDataString);
      
      // Parse QR code data
      const qrData = parseQRCodeData(qrDataString);
      if (!qrData) {
        throw new Error('Invalid QR code format');
      }

      console.log('📱 Parsed QR data:', qrData);

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

  // Manual scan button for testing
  const handleManualScan = () => {
    const testQRData = JSON.stringify({
      type: 'venue-entry',
      bookingId: 'test-booking-123',
      venueId: 'test-venue-456',
      securityCode: 'TEST1234',
      bookingDate: '2025-01-21',
      startTime: '19:00:00',
      tableNumber: '5',
      guestCount: 2,
      status: 'confirmed',
      timestamp: new Date().toISOString()
    });
    
    handleScan(testQRData);
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
              onClick={handleManualScan}
              className="test-scan-btn"
              style={{ marginLeft: '10px', backgroundColor: '#FFD700', color: '#800020' }}
            >
              🧪 Test Scan
            </button>
          </div>
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
          <h4>✅ Entry Verified</h4>
          <div className="result-details">
            <p><strong>Customer:</strong> {scanResult.customerName}</p>
            <p><strong>Email:</strong> {scanResult.customerEmail}</p>
            <p><strong>Venue:</strong> {scanResult.venueName}</p>
            <p><strong>Date:</strong> {scanResult.bookingDate}</p>
            <p><strong>Time:</strong> {scanResult.startTime}</p>
            <p><strong>Party Size:</strong> {scanResult.partySize}</p>
            <p><strong>Table:</strong> {scanResult.tableNumber}</p>
            <p><strong>Scanned at:</strong> {scanResult.scanTime}</p>
          </div>
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
