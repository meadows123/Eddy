import React, { useState } from 'react';

const QRCodeDataExtractor = () => {
  const [qrUrl, setQrUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');

  const extractQRData = () => {
    try {
      if (!qrUrl.trim()) {
        setError('Please enter a QR code URL');
        return;
      }

      // Extract the data parameter from the QR server URL
      const url = new URL(qrUrl);
      const dataParam = url.searchParams.get('data');
      
      if (!dataParam) {
        setError('No data parameter found in URL');
        return;
      }

      // Decode the data
      const decodedData = decodeURIComponent(dataParam);
      
      // Try to parse as JSON
      const qrData = JSON.parse(decodedData);
      
      setExtractedData(qrData);
      setError('');
      
      console.log('📱 Extracted QR data:', qrData);
    } catch (err) {
      setError(`Error extracting QR data: ${err.message}`);
      console.error('Error extracting QR data:', err);
    }
  };

  const copyToClipboard = () => {
    if (extractedData) {
      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
      alert('QR data copied to clipboard!');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">📱 Mobile QR Code Data Extractor</h3>
      <p className="text-gray-600 mb-4">
        Extract QR code data from the external URL to test manually in the scanner. 
        <strong className="block mt-1 text-sm">Perfect for mobile testing!</strong>
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QR Code URL (from email button):
          </label>
          <input
            type="url"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            placeholder="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={extractQRData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Extract QR Data
        </button>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {extractedData && (
          <div className="space-y-4">
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <h4 className="font-semibold mb-2">✅ QR Data Extracted Successfully!</h4>
              <p className="text-sm">
                <strong>Type:</strong> {extractedData.type}<br/>
                <strong>Member ID:</strong> {extractedData.memberId || 'N/A'}<br/>
                <strong>Venue ID:</strong> {extractedData.venueId || 'N/A'}<br/>
                <strong>Security Code:</strong> {extractedData.securityCode || 'N/A'}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Raw JSON Data:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                📋 Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  setQrUrl('');
                  setExtractedData(null);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
            
            <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p className="text-sm">
                <strong>Next Steps:</strong><br/>
                1. Copy the JSON data above<br/>
                2. Go to the QR Scanner<br/>
                3. Click "Manual Input"<br/>
                4. Paste the JSON data and click "Test This QR Data"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeDataExtractor;
