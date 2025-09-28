import React, { useState } from 'react';
import { generateEddysMemberQR, generateVenueEntryQR } from '@/lib/qrCodeService.js';
import { supabase } from '@/lib/supabase.js';

const QRCodeTestGenerator = () => {
  const [testQRCodes, setTestQRCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateTestEddysMemberQR = async () => {
    setLoading(true);
    try {
      const testMemberData = {
        userId: 'test-member-123',
        venueId: 'test-venue-456',
        memberTier: 'VIP',
        memberSince: new Date().toISOString()
      };

      const qrCode = await generateEddysMemberQR(testMemberData);
      
      setTestQRCodes(prev => [...prev, {
        id: Date.now(),
        type: 'eddys_member',
        data: testMemberData,
        qrCode: qrCode,
        timestamp: new Date().toLocaleString()
      }]);
    } catch (error) {
      console.error('Error generating test Eddys Member QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTestVenueEntryQR = async () => {
    setLoading(true);
    try {
      const testBookingData = {
        id: 'test-booking-789',
        venue_id: 'test-venue-456',
        booking_date: '2025-01-21',
        start_time: '19:00:00',
        number_of_guests: 2,
        table: { table_number: '5' }
      };

      const qrCode = await generateVenueEntryQR(testBookingData);
      
      setTestQRCodes(prev => [...prev, {
        id: Date.now(),
        type: 'venue-entry',
        data: testBookingData,
        qrCode: qrCode,
        timestamp: new Date().toLocaleString()
      }]);
    } catch (error) {
      console.error('Error generating test Venue Entry QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTestQRCodes = () => {
    setTestQRCodes([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">QR Code Test Generator</h3>
      <p className="text-gray-600 mb-4">
        Generate test QR codes to verify scanning functionality in the venue owner dashboard.
      </p>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={generateTestEddysMemberQR}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Eddys Member QR'}
        </button>
        
        <button
          onClick={generateTestVenueEntryQR}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Venue Entry QR'}
        </button>
        
        <button
          onClick={clearTestQRCodes}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All
        </button>
      </div>

      {testQRCodes.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Generated Test QR Codes:</h4>
          {testQRCodes.map((qr) => (
            <div key={qr.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {qr.type === 'eddys_member' ? 'Eddys Member QR' : 'Venue Entry QR'}
                </span>
                <span className="text-sm text-gray-500">{qr.timestamp}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-white border rounded flex items-center justify-center">
                  {qr.qrCode?.base64 ? (
                    <img 
                      src={qr.qrCode.base64} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400">No Image</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Type:</strong> {qr.type}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Data:</strong>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-20">
                      {JSON.stringify(qr.data, null, 2)}
                    </pre>
                  </div>
                  {qr.qrCode?.externalUrl && (
                    <div className="text-sm">
                      <a 
                        href={qr.qrCode.externalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Open External QR Code
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QRCodeTestGenerator;
