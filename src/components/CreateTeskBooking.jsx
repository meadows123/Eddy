import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const CreateTestBooking = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const createTestBooking = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Create a test booking in the database
      const testBooking = {
        id: 'test-booking-123',
        venue_id: 'test-venue-456',
        user_id: 'test-user-789',
        table_id: 'test-table-101',
        booking_date: '2025-01-21',
        start_time: '19:00:00',
        end_time: '23:00:00',
        number_of_guests: 2,
        status: 'confirmed',
        total_amount: 100.00,
        qr_security_code: 'TEST1234',
        qr_code_scan_count: 0,
        last_scan_at: null,
        last_scan_by: null
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([testBooking])
        .select();

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        message: 'Test booking created successfully!',
        data: data[0]
      });

      console.log('✅ Test booking created:', data[0]);
    } catch (error) {
      console.error('❌ Error creating test booking:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        error: error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Create Test Booking</h2>
      <p>This will create a test booking in the database for QR scanner testing.</p>
      
      <button 
        onClick={createTestBooking}
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
        {loading ? 'Creating...' : 'Create Test Booking'}
      </button>

      {result && (
        <div style={{ 
          padding: '10px', 
          borderRadius: '5px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <strong>{result.success ? 'Success!' : 'Error!'}</strong><br/>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default CreateTestBooking;
