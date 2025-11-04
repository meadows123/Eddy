import React, { useState, useRef, useEffect } from 'react';

const CameraTestComponent = () => {
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const testCamera = async () => {
    setCameraStatus('testing');
    setError(null);

    try {
      console.log('📷 Testing camera access...');
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Get available devices
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      
      console.log('📷 Available video devices:', videoDevices);
      setDevices(videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No cameras found');
      }

      // Test camera access with mobile-optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: selectedDevice || undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment', // Use back camera on mobile
          frameRate: { ideal: 30, max: 60 }
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        streamRef.current = stream;
      }

      setCameraStatus('success');
      console.log('✅ Camera test successful');

    } catch (err) {
      console.error('❌ Camera test failed:', err);
      setError(err.message);
      setCameraStatus('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">📱 Mobile Camera Test</h3>
      <p className="text-gray-600 mb-4">
        Test if your mobile camera is working properly for QR code scanning.
      </p>
      
      <div className="space-y-4">
        {/* Device Selection */}
        {devices.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Camera:
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Default Camera (Back Camera on Mobile)</option>
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Test Button */}
        <div className="flex gap-2">
          <button
            onClick={testCamera}
            disabled={cameraStatus === 'testing'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {cameraStatus === 'testing' ? 'Testing...' : 'Test Mobile Camera'}
          </button>
          
          {cameraStatus === 'success' && (
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* Camera Feed */}
        {cameraStatus === 'success' && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">📱 Mobile Camera Feed:</h4>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full border rounded"
              style={{ 
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
            <p className="text-sm text-green-600 mt-2">
              ✅ Mobile camera is working! You should see your camera feed above.
            </p>
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <p><strong>Mobile Tips:</strong></p>
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>Hold phone steady when scanning QR codes</li>
                <li>Ensure good lighting on the QR code</li>
                <li>Keep QR code 6-12 inches from camera</li>
                <li>Use the back camera for best results</li>
              </ul>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <h4 className="font-semibold">❌ Mobile Camera Test Failed</h4>
            <p className="text-sm mt-1">{error}</p>
            <div className="text-xs mt-2">
              <strong>Mobile solutions:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>Allow camera permissions when prompted</li>
                <li>Make sure you're using HTTPS (required for camera)</li>
                <li>Try Chrome or Safari on mobile</li>
                <li>Check if another app is using the camera</li>
                <li>Restart your browser if needed</li>
              </ul>
            </div>
          </div>
        )}

        {/* Status Display */}
        {cameraStatus === 'testing' && (
          <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p>🔄 Testing mobile camera access...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraTestComponent;
