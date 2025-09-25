import React, { useState } from 'react';
import { generateVenueEntryQR } from '../lib/qrCodeService.js';

const QRCodeTest = () => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testQRGeneration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create a test booking
      const testBooking = {
        id: 'test-booking-123',
        venue_id: 'test-venue-456',
        booking_date: '2025-01-21',
        start_time: '19:00:00',
        number_of_guests: 4,
        status: 'confirmed',
        table: {
          table_number: 'VIP-001'
        }
      };

      console.log('🧪 Testing QR code generation...');
      const qrCodeImage = await generateVenueEntryQR(testBooking);
      
      if (qrCodeImage) {
        setQrCode(qrCodeImage);
        console.log('✅ QR code generated successfully!');
      } else {
        throw new Error('QR code generation returned null');
      }
    } catch (err) {
      console.error('❌ QR code generation failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>QR Code Generation Test</h2>
      
      <button 
        onClick={testQRGeneration}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#800020',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Generating...' : 'Test QR Code Generation'}
      </button>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {qrCode && (
        <div>
          <h3>Generated QR Code:</h3>
          <div style={{ textAlign: 'center' }}>
            <img 
              src={qrCode} 
              alt="Generated QR Code" 
              style={{ 
                maxWidth: '300px', 
                height: 'auto',
                border: '2px solid #800020',
                borderRadius: '10px'
              }}
            />
          </div>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            This QR code contains booking information and can be scanned by venue staff for entry verification.
          </p>
        </div>
      )}
    </div>
  );
};

export default QRCodeTest;
