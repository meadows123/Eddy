import React, { useState } from 'react';
import { generateVenueEntryQR, parseQRCodeData } from '../lib/qrCodeService.js';

const QRTestPage = () => {
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const generateTestQR = async () => {
    try {
      const testBooking = {
        id: 'test-booking-123',
        venue_id: 'test-venue-456',
        booking_date: '2025-01-21',
        start_time: '19:00:00',
        number_of_guests: 4,
        status: 'confirmed',
        table: {
          table_number: '5'
        }
      };

      console.log('🧪 Generating test QR code...');
      const qrImage = await generateVenueEntryQR(testBooking);
      setQrCodeImage(qrImage);
      setTestResult('✅ QR code generated successfully!');
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      setTestResult(`❌ Error: ${error.message}`);
    }
  };

  const testQRParsing = () => {
    try {
      const testQRString = JSON.stringify({
        type: 'venue-entry',
        bookingId: 'test-booking-123',
        venueId: 'test-venue-456',
        securityCode: 'TEST1234',
        bookingDate: '2025-01-21',
        startTime: '19:00:00',
        tableNumber: '5',
        guestCount: 4,
        status: 'confirmed',
        timestamp: new Date().toISOString()
      });

      console.log('🧪 Testing QR code parsing...');
      const parsed = parseQRCodeData(testQRString);
      setQrData(parsed);
      setTestResult('✅ QR code parsing successful!');
    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      setTestResult(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-burgundy mb-8">QR Code System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code Generation Test */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">QR Code Generation Test</h2>
          <button
            onClick={generateTestQR}
            className="bg-brand-burgundy text-white px-4 py-2 rounded hover:bg-brand-burgundy/90 mb-4"
          >
            Generate Test QR Code
          </button>
          
          {qrCodeImage && (
            <div className="mt-4">
              <img 
                src={qrCodeImage} 
                alt="Test QR Code" 
                className="w-48 h-48 mx-auto border-2 border-brand-gold rounded"
              />
              <p className="text-sm text-gray-600 mt-2 text-center">
                This QR code contains booking data and can be scanned by the venue scanner
              </p>
            </div>
          )}
        </div>

        {/* QR Code Parsing Test */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">QR Code Parsing Test</h2>
          <button
            onClick={testQRParsing}
            className="bg-brand-gold text-brand-burgundy px-4 py-2 rounded hover:bg-brand-gold/90 mb-4"
          >
            Test QR Code Parsing
          </button>
          
          {qrData && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Parsed QR Data:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(qrData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Test Result:</h3>
          <p className={testResult.includes('✅') ? 'text-green-600' : 'text-red-600'}>
            {testResult}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-4">
        <a 
          href="/venue-owner/qr-scanner" 
          className="bg-brand-gold text-brand-burgundy px-6 py-3 rounded hover:bg-brand-gold/90 font-semibold"
        >
          🎯 Open QR Scanner
        </a>
        <a 
          href="/venue-owner/dashboard" 
          className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600 font-semibold"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
};

export default QRTestPage;
