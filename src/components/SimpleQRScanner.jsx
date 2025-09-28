import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import { BrowserMultiFormatReader } from '@zxing/library';

const SimpleQRScanner = ({ onMemberScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualQRInput, setManualQRInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReader = useRef(null);

  // Initialize code reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Check camera support on component mount
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopCamera();
    };
  }, []);

  // Initialize camera when scanner becomes active
  useEffect(() => {
    if (scannerActive && cameraSupported) {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scannerActive, cameraSupported]);

  const checkCameraSupport = async () => {
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        return;
      }

      // Check if we can enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setCameraSupported(false);
        return;
      }

      // Camera is available, but we'll request permission when user clicks start
      setCameraSupported(true);
    } catch (err) {
      console.log('Camera support check failed:', err);
      setCameraSupported(false);
    }
  };

  const initializeCamera = async () => {
    try {
      console.log('📷 Initializing camera...');
      setError(null);
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Get available video devices
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      console.log('📷 Available cameras:', videoInputDevices.map(d => d.label));
      
      if (videoInputDevices.length === 0) {
        throw new Error('No cameras found');
      }
      
      // Use the first available camera (or back camera if available)
      let selectedDeviceId = videoInputDevices[0]?.deviceId;
      
      // Prefer back camera on mobile devices
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
        console.log('📷 Using back camera:', backCamera.label);
      } else {
        console.log('📷 Using default camera:', videoInputDevices[0].label);
      }

      console.log('📷 Selected camera ID:', selectedDeviceId);

      // Configure video element for mobile
      if (videoRef.current) {
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
      }

      // Start continuous scanning with proper error handling
      console.log('📷 Starting QR code detection...');
      
      try {
        await codeReader.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          {
            // Mobile-optimized constraints
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'environment', // Use back camera on mobile
              frameRate: { ideal: 30, max: 60 }
            }
          },
          (result, err) => {
            if (result) {
              console.log('🔍 QR Code detected by camera:', result.getText());
              console.log('🔍 QR Code format:', result.getBarcodeFormat());
              handleScan(result.getText());
            }
            if (err && !(err instanceof Error)) {
              // This is normal - just means no QR code detected yet
              // Only log every 100th attempt to avoid spam
              if (Math.random() < 0.01) {
                console.log('🔍 Scanning... (no QR code detected yet)');
              }
            }
          }
        );
      } catch (decodeError) {
        console.error('❌ Decode error:', decodeError);
        throw new Error('Failed to start QR code detection');
      }

      setIsScanning(true);
      setError(null);
      console.log('✅ QR Scanner started successfully');
      
      // Show instruction to user
      setSuccess('Camera activated! Point at QR code to scan.');

    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      
      if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
        setError('Camera access denied. Please allow camera permissions and try again.');
        setCameraPermissionDenied(true);
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      
      setScannerActive(false);
    }
  };


  const stopCamera = () => {
    try {
      // Stop the QR code reader
      if (codeReader.current) {
        codeReader.current.reset();
      }


      // Stop the video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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
  };

  const stopScanning = () => {
    setScannerActive(false);
    stopCamera();
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

  const handleManualScan = async () => {
    if (!manualQRInput.trim()) {
      setError('Please enter QR code data');
      return;
    }
    
    try {
      console.log('🔍 Manual QR scan triggered with data:', manualQRInput);
      await handleScan(manualQRInput.trim());
    } catch (err) {
      console.error('❌ Manual scan error:', err);
      setError(err.message);
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
        <p>Scan customer QR codes to verify bookings and check them in</p>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📋 How to use:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Click "Start Camera Scanning" below</li>
            <li>2. Allow camera permissions when prompted</li>
            <li>3. Point camera at customer's QR code</li>
            <li>4. QR code will be automatically detected and verified</li>
          </ol>
        </div>
      </div>

      {!scannerActive ? (
        <div className="scanner-start">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">📱 QR Code Scanner</h3>
            <p className="text-gray-600 mb-6">
              Scan customer QR codes to verify bookings and check in members
            </p>
            
            {cameraSupported ? (
              <div>
                <button 
                  onClick={startScanning}
                  className="start-scan-btn bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold"
                >
                  📷 Start Camera Scanning
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Camera will be activated when you click start
                </p>
              </div>
            ) : (
              <div>
                <p className="text-red-600 mb-4">
                  ❌ Camera not available on this device
                </p>
                <button 
                  onClick={() => setShowManualInput(true)}
                  className="manual-input-btn bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg text-lg font-semibold"
                >
                  🔧 Use Manual Input
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="scanner-active">
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto',
                borderRadius: '8px',
                objectFit: 'cover'
              }}
            />
            <div className="scan-overlay">
              <div className="scan-frame"></div>
              <p className="scan-instructions">
                Point camera at QR code
              </p>
            </div>
          </div>
          
          <div className="scanner-controls">
            <button 
              onClick={stopScanning}
              className="stop-scan-btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              ⏹️ Stop Scanning
            </button>
            <button 
              onClick={() => setShowManualInput(!showManualInput)}
              className="test-scan-btn bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded ml-2"
            >
              🔧 Manual Input
            </button>
          </div>
        </div>
      )}

      {/* Manual Input Section */}
      {showManualInput && (
        <div className="manual-input-section mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🔧 Manual QR Input</h3>
          <p className="text-sm text-gray-600 mb-3">
            Paste the QR code data here to verify bookings or member access.
          </p>
          
          <textarea
            value={manualQRInput}
            onChange={(e) => setManualQRInput(e.target.value)}
            placeholder='Paste QR code data here (JSON format)...
Example: {"type":"eddys_member","memberId":"123","venueId":"456","securityCode":"ABC123",...}'
            className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
          />
          
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleManualScan}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              🔍 Verify QR Code
            </button>
            
            <button 
              onClick={() => setManualQRInput('')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <h4 className="font-semibold">❌ Error</h4>
          <p>{error}</p>
          {cameraPermissionDenied && (
            <div className="mt-3">
              <button 
                onClick={() => {
                  setCameraPermissionDenied(false);
                  setError(null);
                  setScannerActive(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔄 Try Again
              </button>
            </div>
          )}
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

      <style jsx>{`
        .scanner-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .scanner-start {
          text-align: center;
          padding: 2rem;
        }
        
        .scanner-active {
          text-align: center;
        }
        
        .camera-container {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
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
          border: 3px solid #3b82f6;
          border-radius: 8px;
          background: transparent;
          position: relative;
        }
        
        .scan-frame::before {
          content: '';
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 2px solid #60a5fa;
          border-radius: 8px;
          animation: pulse 2s infinite;
        }
        
        .scan-instructions {
          color: white;
          background: rgba(0, 0, 0, 0.7);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          margin-top: 1rem;
          font-size: 0.9rem;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .scanner-controls {
          margin-top: 1rem;
        }
        
        .error-message {
          margin-top: 1rem;
        }
        
        .success-message {
          margin-top: 1rem;
        }
        
        .scan-result {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default SimpleQRScanner;
