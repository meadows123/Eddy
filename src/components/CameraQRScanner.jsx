import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { parseQRCodeData } from '@/lib/qrCodeService.js';
import { sendQRScanNotification } from '@/lib/emailService.js';
import emailRateLimiter from '@/lib/emailRateLimiter.js';
import jsQR from 'jsqr';
import { QrCode } from 'lucide-react';

// Short pleasant blip sound for QR scan success
const playSuccessBlip = () => {
  try {
    // Short, pleasant beep sound (0.1 seconds)
    const successSound = new Audio("data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD//w==");
    successSound.volume = 0.4;
    successSound.play();
  } catch (e) {
    // Audio feedback not supported
  }
};

const CameraQRScanner = ({ onMemberScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailRateLimited, setEmailRateLimited] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true); // Enabled by default
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  
  // Track recently scanned QR codes to prevent duplicates
  const [recentlyScanned, setRecentlyScanned] = useState(new Set());
  const lastScanTimeRef = useRef(0); // Use ref for immediate updates
  const isProcessingRef = useRef(false); // Use ref for immediate updates
  const SCAN_COOLDOWN = 30000; // 30 seconds cooldown between scans (increased from 5s)

  // Initialize camera when scanner becomes active
  useEffect(() => {
    if (scannerActive) {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scannerActive]);
  
  // Cleanup recently scanned set when component unmounts
  useEffect(() => {
    return () => {
      setRecentlyScanned(new Set());
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setError(null);
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
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
      }

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
            
            // Start QR code detection
            startQRDetection();
          } catch (playError) {
            
            // Try alternative play approach
            try {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
                
                // Start QR code detection
                startQRDetection();
              }
            } catch (retryError) {
              throw new Error('Failed to start video playback');
            }
          }
        };
      }

      setIsScanning(true);
      setError(null);
      
      // Show instruction to user
      setSuccess('Camera activated! Point at QR code to scan.');

    } catch (err) {
      
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
        
        if (code && code.data && code.data.trim() !== '') {
          console.log('🔍 QR Code found:', code.data);
          
          // Validate QR data format before processing
          const isValidFormat = code.data.startsWith('{') || 
                               code.data.startsWith('vipclub://') || 
                               code.data.startsWith('oneeddy://');
          
          if (!isValidFormat) {
            console.log('⚠️ Invalid QR code format, skipping...');
            return;
          }
          
          // Play success sound (short pleasant blip)
          playSuccessBlip();
          
          /*try {
            const successSound = new Audio("data:audio/wav;base64,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");
            successSound.play();
          } catch (e) {
            console.log('Audio feedback not supported');
          }*/

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
    } catch (err) {
      // Error stopping camera
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

  const clearResults = () => {
    setError(null);
    setSuccess(null);
    setScanResult(null);
  };

  const handleScan = async (qrDataString) => {
    try {
      
      // Prevent multiple simultaneous scans using ref (immediate check)
      if (isProcessingRef.current) {
        return;
      }
      
      // Check cooldown period to prevent rapid duplicate scans using ref
      const now = Date.now();
      if (now - lastScanTimeRef.current < SCAN_COOLDOWN) {
        return;
      }
      
      // Update refs IMMEDIATELY (synchronous) to prevent race conditions
      lastScanTimeRef.current = now;
      isProcessingRef.current = true;
      
      // Update state for UI
      setIsProcessing(true);
      setEmailRateLimited(false);
      
      // Parse the QR code data
      let qrData;
      try {
        qrData = parseQRCodeData(qrDataString);
      } catch (parseError) {
        // Silently ignore parsing errors
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Check if qrData is valid
      if (!qrData) {
        // Don't throw error for parse failures - just silently ignore
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Create a unique identifier for this scan
      const scanId = qrData.type === 'venue-entry' 
        ? `booking-${qrData.bookingId}-${qrData.securityCode}`
        : `member-${qrData.memberId}`;
      
      // Check if we've already scanned this QR code recently
      if (recentlyScanned.has(scanId)) {
        return;
      }
      
      // Update scan tracking (no need to update lastScanTime as it's now a ref)
      setRecentlyScanned(prev => {
        const newSet = new Set(prev);
        newSet.add(scanId);
        // Keep only the last 10 scans to prevent memory buildup
        if (newSet.size > 10) {
          const firstItem = newSet.values().next().value;
          newSet.delete(firstItem);
        }
        return newSet;
      });
      
      if (!qrData.type) {
        throw new Error('QR code data missing type field');
      }
      
      if (qrData.type === 'venue-entry') {
        await handleBookingScan(qrData);
      } else if (qrData.type === 'eddys_member') {
        await handleMemberScan(qrData);
      } else {
        throw new Error(`Unknown QR code type: ${qrData.type}`);
      }
      
      // Call the callback if provided
      if (onMemberScanned) {
        onMemberScanned(qrData);
      }
      
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleBookingScan = async (qrData) => {
    try {

      if (!qrData.bookingId || !qrData.securityCode) {
        throw new Error('Invalid booking QR code format');
      }

      // Get booking details
      
      // First check if booking exists at all
      let { data: bookingCheck, error: checkError } = await supabase
        .from('bookings')
        .select('id, status, qr_security_code, booking_date, created_at')
        .eq('id', qrData.bookingId)
        .single();
      
        
      if (checkError) {
        throw new Error(`Booking lookup failed: ${checkError.message}`);
      }
      
      if (!bookingCheck) {
        throw new Error(`No booking found with ID: ${qrData.bookingId}`);
      }
      
      if (bookingCheck.status !== 'confirmed') {
        throw new Error(`Booking is not confirmed (status: ${bookingCheck.status})`);
      }
      
      
      // Get full booking details
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
          user_id,
          venue_id,
          table_id
        `)
        .eq('id', qrData.bookingId)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {

        // Since we already found the booking in the first check, use that data
        if (bookingCheck) {
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
      } else {
        // Get related data separately
        
        // Get user profile
        let profiles = { full_name: 'Unknown', email: 'Unknown', phone: 'Unknown' };
        if (booking.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', booking.user_id)
            .single();
          if (profileData) {
            profiles = profileData;
          }
        }

        // Get venue data
        let venues = { name: 'Unknown', address: 'Unknown' };
        if (booking.venue_id) {
          const { data: venueData } = await supabase
            .from('venues')
            .select('name, address')
            .eq('id', booking.venue_id)
            .single();
          if (venueData) {
            venues = venueData;
          }
        }

        // Get table data
        let venue_tables = { table_type: 'Unknown', capacity: 0 };
        if (booking.table_id) {
          const { data: tableData } = await supabase
            .from('venue_tables')
            .select('table_type, capacity')
            .eq('id', booking.table_id)
            .single();
          if (tableData) {
            venue_tables = tableData;
          }
        }

        // Add the related data to the booking object
        booking.profiles = profiles;
        booking.venues = venues;
        booking.venue_tables = venue_tables;
      }

      if (bookingError || !booking) {
        // Since we already found the booking in the first check, use that data
        if (bookingCheck) {
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

      // Normalize dates for comparison (strip any timezone info)
      const normalizedBookingDate = new Date(bookingDate).toISOString().split('T')[0];
      const normalizedToday = new Date(today).toISOString().split('T')[0];

      if (normalizedBookingDate !== normalizedToday) {
        throw new Error(`This booking is for ${normalizedBookingDate}, not today (${normalizedToday})`);
      }

      // Verify security code
      if (booking.qr_security_code) {
        // For bookings with security codes, verify they match
        if (booking.qr_security_code !== qrData.securityCode) {
          throw new Error('Invalid security code');
        }
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
        // Failed to update scan count, continue anyway
      }

      const scanResultData = {
        type: 'venue-entry',
        bookingId: booking.id,
        customerName: '***', // Hide personal details
        customerEmail: '***', // Hide personal details
        venueName: booking.venues?.name || 'Unknown',
        tableType: booking.venue_tables?.table_type || 'N/A',
        tableNumber: qrData.tableNumber || 'N/A', // Add table number from QR code
        guestCount: booking.number_of_guests,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        scanTime: new Date().toLocaleString(),
        status: 'verified'
      };

      setScanResult(scanResultData);

      // Play success sound for successful verification
      playSuccessBlip();
      
      /*try{
        const successSound = new Audio("data:audio/wav;base64,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");
        successSound.play();
      } catch (e) {
        console.log('Audio feedback not supported');
      }*/

      // Send email notification to customer (with rate limiting)
      if (emailEnabled) {
        try {
          const customerEmail = booking.profiles?.email || 'unknown@example.com';
          const bookingId = booking.id;
          
          // Check if we can send an email
          const rateLimitCheck = emailRateLimiter.canSendEmail(bookingId, customerEmail);
          
          if (!rateLimitCheck.canSend) {
            setEmailRateLimited(true);
            // Don't send email, but don't show error to user
          } else {
            setEmailRateLimited(false);
            const notificationData = {
              customerName: booking.profiles?.full_name || 'Valued Customer',
              customerEmail: customerEmail,
              venueName: booking.venues?.name || 'Unknown Venue',
              bookingId: bookingId,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
              guestCount: booking.number_of_guests,
              tableNumber: qrData.tableNumber || 'N/A',
              scanTime: new Date().toLocaleString()
            };
            
            const emailResult = await sendQRScanNotification(notificationData);
            
            // Record that we sent an email
            emailRateLimiter.recordEmailSent(bookingId, customerEmail);
          }
        } catch (emailError) {
          // Don't throw error - email failure shouldn't break the scan process
        }
      }

      setSuccess('✅ Booking verified! Customer can be seated.');
      setError(null);
      
      // Stop scanning after successful scan to prevent duplicates
      stopScanning();

    } catch (err) {
      throw err;
    }
  };

  const handleMemberScan = async (qrData) => {
    try {
      
      if (!qrData.memberId) {
        throw new Error('Invalid member QR code format');
      }

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          member_tier,
          created_at
        `)
        .eq('id', qrData.memberId)
        .single();

      if (memberError || !member) {
        throw new Error(`Member not found: ${memberError?.message || 'Unknown error'}`);
      }

      setScanResult({
        type: 'eddys_member',
        customerName: '***', // Hide personal details from bouncer
        customerEmail: '***', // Hide personal details from bouncer
        memberTier: member.member_tier || 'Standard',
        memberSince: member.created_at,
        creditBalance: '***', // Hide credit balance from bouncer
        venueName: 'Eddys VIP Club',
        scanTime: new Date().toLocaleString(),
        status: 'verified'
      });

      // Play success sound for successful member verification
      playSuccessBlip();
      
      /*try{
        const successSound = new Audio("data:audio/wav;base64,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");
        successSound.play();
      } catch (e) {
        console.log('Audio feedback not supported');
      }*/

      setSuccess('✅ Eddys Member verified! Welcome to the club.');
      setError(null);
      
      // Stop scanning after successful scan to prevent duplicates
      stopScanning();

    } catch (err) {
      throw err;
    }
  };

  return (
      <div className="venue-qr-scanner">
      <div className="scanner-header p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4 shadow-lg">
            <QrCode className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Venue Entry Scanner</h2>
          <p className="text-white/90 text-sm">Scan customer QR codes to verify bookings and check them in</p>
        </div>
        
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg">
          <h4 className="font-semibold text-white mb-3 flex items-center">
            <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center mr-2 shadow-md">
              <span className="text-indigo-700 text-xs font-bold">1</span>
            </div>
            How to use:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-white/90">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-300 rounded-full shadow-sm"></div>
              <span>Click "Start Camera" below</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-300 rounded-full shadow-sm"></div>
              <span>Point camera at QR code</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-300 rounded-full shadow-sm"></div>
              <span>Verification happens automatically</span>
            </div>
          </div>
        </div>
      </div>

      {!scannerActive ? (
        <div className="scanner-start p-8 bg-gradient-to-b from-white to-gray-50">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full mb-4 shadow-2xl">
                <QrCode className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Scan</h3>
              <p className="text-gray-600 text-sm">Tap the button below to activate your camera</p>
            </div>
            <button 
              onClick={startScanning}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto space-x-2"
            >
              <QrCode className="h-5 w-5" />
              <span>Start Camera</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="scanner-active p-4">
          <div className="camera-container relative bg-black rounded-xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxWidth: '100vw',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'cover',
                backgroundColor: '#000',
                display: 'block'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
              <div className="scan-overlay">
              <div className="scan-frame"></div>
              <div className="scan-instructions bg-black/80 backdrop-blur-sm border border-cyan-400/50 rounded-lg px-4 py-2 shadow-lg">
                <p className="text-white font-medium text-sm">
                  Point camera at QR code
                </p>
              </div>
            </div>
          </div>
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="processing-indicator mb-4">
              <div className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-xl shadow-md">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-700 font-medium">Processing scan...</span>
              </div>
            </div>
          )}
          
          {/* Email rate limit indicator */}
          {emailRateLimited && (
            <div className="rate-limit-indicator mb-4">
              <div className="flex items-center justify-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl">
                <span className="text-orange-600 mr-2">⚠️</span>
                <span className="text-orange-800 font-medium">Email already sent for this booking</span>
              </div>
            </div>
          )}
          
          <div className="scanner-controls text-center mt-6">
            <button 
              onClick={stopScanning}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto space-x-2"
            >
              <div className="w-4 h-4 bg-white rounded-sm"></div>
              <span>Stop Scanning</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message mt-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 rounded-xl shadow-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">✕</span>
            </div>
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="success-message mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl shadow-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <h4 className="font-semibold">Success</h4>
              <p className="text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div className="scan-result mt-6 p-6 bg-gradient-to-br from-white to-blue-50/30 border border-blue-200 rounded-2xl shadow-xl">
          {scanResult.type === 'eddys_member' ? (
            <>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-bold">👑</span>
                </div>
                <h4 className="text-xl font-bold text-gray-800">Eddys Member Verified</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="member-info bg-white/80 rounded-xl p-4 border border-blue-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                      <span className="text-white text-xs">👑</span>
                    </span>
                    Member Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Name:</span> {scanResult.customerName}</p>
                    <p><span className="font-medium text-gray-700">Email:</span> {scanResult.customerEmail}</p>
                    <p><span className="font-medium text-gray-700">Member Tier:</span> {scanResult.memberTier}</p>
                    <p><span className="font-medium text-gray-700">Member Since:</span> {new Date(scanResult.memberSince).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="venue-info bg-white/80 rounded-xl p-4 border border-purple-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                      <span className="text-white text-xs">🏢</span>
                    </span>
                    Venue Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Venue:</span> {scanResult.venueName}</p>
                    <p><span className="font-medium text-gray-700">Available Credits:</span> ₦{scanResult.creditBalance?.toLocaleString()}</p>
                    <p><span className="font-medium text-gray-700">Scanned at:</span> {scanResult.scanTime}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-bold">✓</span>
                </div>
                <h4 className="text-xl font-bold text-gray-800">Booking Verified</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="booking-info bg-white/80 rounded-xl p-4 border border-teal-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                      <span className="text-white text-xs">📋</span>
                    </span>
                    Booking Details
                  </h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Booking ID:</span> {scanResult.bookingId}</p>
                    <p><span className="font-medium text-gray-700">Date:</span> {scanResult.bookingDate}</p>
                    <p><span className="font-medium text-gray-700">Time:</span> {scanResult.startTime}</p>
                    <p><span className="font-medium text-gray-700">Guests:</span> {scanResult.guestCount}</p>
                  </div>
                </div>
                
                <div className="venue-info bg-white/80 rounded-xl p-4 border border-indigo-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                      <span className="text-white text-xs">🏢</span>
                    </span>
                    Venue Details
                  </h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Venue:</span> {scanResult.venueName}</p>
                    <p><span className="font-medium text-gray-700">Table Type:</span> {scanResult.tableType}</p>
                    <p><span className="font-medium text-gray-700">Table Number:</span> {scanResult.tableNumber}</p>
                    <p><span className="font-medium text-gray-700">Scanned:</span> {scanResult.scanTime}</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button 
              onClick={clearResults}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .scanner-header {
          text-align: center;
          margin-bottom: 0;
        }
        
        .scanner-start {
          text-align: center;
        }
        
        .scanner-active {
          text-align: center;
        }
        
        .camera-container {
          position: relative;
          display: inline-block;
          margin-bottom: 0;
          width: 100%;
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
          border: 3px solid #06b6d4;
          border-radius: 20px;
          background: transparent;
          position: relative;
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
          animation: pulse 2s infinite;
        }
        
        .scan-frame::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #06b6d4, #6366f1, #8b5cf6);
          animation: scan 2s infinite;
          border-radius: 20px;
        }
        
        .scan-frame::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 2px solid rgba(6, 182, 212, 0.5);
          border-radius: 30px;
          animation: expand 3s infinite;
        }
        
        .scan-instructions {
          margin-top: 1.5rem;
        }
        
        @keyframes pulse {
          0% { 
            border-color: #06b6d4; 
            box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
          }
          50% { 
            border-color: #6366f1; 
            box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.3);
          }
          100% { 
            border-color: #06b6d4; 
            box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
          }
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