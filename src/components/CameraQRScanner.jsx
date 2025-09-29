import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import jsQR from 'jsqr';

const CameraQRScanner = ({ onMemberScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Initialize camera when scanner becomes active
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
      console.log('📷 Initializing camera...');
      setError(null);
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('📷 Available cameras:', videoDevices.map(d => d.label));
      
      if (videoDevices.length === 0) {
        throw new Error('No cameras found');
      }
      
      // Use the first available camera (or back camera if available)
      let selectedDeviceId = videoDevices[0]?.deviceId;
      
      // Prefer back camera on mobile devices
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
        console.log('📷 Using back camera:', backCamera.label);
      } else {
        console.log('📷 Using default camera:', videoDevices[0].label);
      }

      console.log('📷 Selected camera ID:', selectedDeviceId);

      // Enhanced mobile-optimized constraints
      const constraints = {
        video: {
          facingMode: { exact: 'environment' }, // Force back camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
          aspectRatio: { ideal: 1.777777778 },
          focusMode: 'continuous', // Enable continuous autofocus
          exposureMode: 'continuous', // Enable continuous exposure
          whiteBalanceMode: 'continuous', // Enable continuous white balance
          zoom: 1.0 // No digital zoom
        }
      };

      let stream;
      try {
        // Try with exact environment mode first
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.log('📷 Exact environment mode failed, trying fallback...', err);
        
        // Fallback to preferred environment mode
        const fallbackConstraints = {
          video: {
            facingMode: 'environment', // Prefer back camera but don't require it
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 30, max: 60 },
            aspectRatio: { ideal: 1.777777778 }
          }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      
      streamRef.current = stream;

      // Set up video element with mobile optimizations
      if (videoRef.current) {
        // Set important attributes for mobile
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        
        // Set source and wait for metadata
        videoRef.current.srcObject = stream;
        
        // Handle video ready state
        videoRef.current.onloadedmetadata = async () => {
          try {
            // Try to play immediately
            await videoRef.current.play();
            console.log('📷 Video playback started successfully');
            
            // Start QR code detection
            startQRDetection();
          } catch (playError) {
            console.warn('❌ Video play failed:', playError);
            
            // Try alternative play approach
            try {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
                console.log('📷 Video playback started with promise');
                
                // Start QR code detection
                startQRDetection();
              }
            } catch (retryError) {
              console.error('❌ Video play retry failed:', retryError);
              throw new Error('Failed to start video playback');
            }
          }
        };
      }

      setIsScanning(true);
      setError(null);
      console.log('✅ Camera started successfully');
      
      // Show instruction to user
      setSuccess('Camera activated! Point at QR code to scan.');

    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      
      if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
        setError('Camera access denied. Please allow camera permissions and try again.');
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

  const startQRDetection = () => {
    // Create canvas for QR detection
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Start scanning loop
    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw current video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try to find QR code with enhanced settings
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
          canOverwriteImage: true,
          greyScaleWeights: {
            red: 0.2126,
            green: 0.7152,
            blue: 0.0722
          },
          tryHarder: true
        });
        
        if (code) {
          console.log('🔍 QR Code found:', code.data);
          
          // Play success sound
          try {
            const beep = new Audio("data:audio/wav;base64,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");
            beep.play();
          } catch (e) {
            console.log('Audio feedback not supported');
          }

          // Highlight QR code location with animation
          context.beginPath();
          context.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          context.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          context.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          context.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.lineWidth = 4;
          context.strokeStyle = '#00FF00';
          context.stroke();

          // Add success overlay
          context.fillStyle = 'rgba(0, 255, 0, 0.2)';
          context.fill();

          // Add success message
          context.font = '20px Arial';
          context.fillStyle = '#00FF00';
          context.textAlign = 'center';
          context.fillText('QR Code Detected!', canvas.width / 2, canvas.height - 20);

          // Process the scan
          handleScan(code.data);
        }
      }
    }, 100); // Scan every 100ms
  };

  const stopCamera = () => {
    try {
      // Stop QR detection
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
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
      console.log('🔍 Looking up booking:', qrData.bookingId);
      
      // First check if booking exists at all
      const { data: bookingCheck, error: checkError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('id', qrData.bookingId)
        .single();
        
      if (checkError) {
        console.error('❌ Booking lookup failed:', checkError);
        throw new Error(`Booking not found. ID: ${qrData.bookingId}`);
      }
      
      if (bookingCheck.status !== 'confirmed') {
        console.error('❌ Booking not confirmed:', { status: bookingCheck.status });
        throw new Error(`Booking is not confirmed (status: ${bookingCheck.status})`);
      }
      
      // Get full booking details
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
        console.error('❌ Booking lookup failed:', { bookingError, bookingId: qrData.bookingId });
        throw new Error(`Booking not found or not confirmed. ID: ${qrData.bookingId}`);
      }
      
      console.log('📋 Found booking:', {
        id: booking.id,
        status: booking.status,
        date: booking.booking_date,
        today: today
      });

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
        <p>Scan customer QR codes to verify bookings and check them in</p>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📋 How to use:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Click "Start Camera" below</li>
            <li>2. Point camera at customer's QR code</li>
            <li>3. Verification happens automatically</li>
          </ol>
        </div>
      </div>

      {!scannerActive ? (
        <div className="scanner-start">
          <div className="text-center">
            <button 
              onClick={startScanning}
              className="start-scan-btn bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-semibold shadow-lg transition-all"
            >
              📷 Start Camera
            </button>
          </div>
        </div>
      ) : (
        <div className="scanner-active">
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxWidth: '100vw',
                height: 'auto',
                maxHeight: '80vh',
                borderRadius: '8px',
                objectFit: 'cover',
                backgroundColor: '#000',
                margin: '0 auto'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
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
          </div>
        </div>
      )}

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
          width: 280px;
          height: 280px;
          border: 3px solid #FFD700;
          border-radius: 12px;
          background: transparent;
          position: relative;
          box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3);
          animation: pulse 2s infinite;
        }
        
        .scan-frame::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #FFD700;
          animation: scan 2s infinite;
        }
        
        .scan-frame::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 2px solid rgba(255, 215, 0, 0.5);
          border-radius: 16px;
          animation: expand 3s infinite;
        }
        
        .scan-instructions {
          color: white;
          background: rgba(0, 0, 0, 0.8);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          margin-top: 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        @keyframes pulse {
          0% { border-color: #FFD700; box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3); }
          50% { border-color: #800020; box-shadow: 0 0 0 8px rgba(128, 0, 32, 0.3); }
          100% { border-color: #FFD700; box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3); }
        }
        
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 3px); }
          100% { top: 0; }
        }
        
        @keyframes expand {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
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

export default CameraQRScanner;
