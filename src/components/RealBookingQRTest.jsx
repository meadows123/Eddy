import React, { useState, useEffect } from 'react';
import { generateVenueEntryQR } from '@/lib/qrCodeService.js';
import { supabase } from '@/lib/supabase.js';

const RealBookingQRTest = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [generatedQR, setGeneratedQR] = useState(null);

  useEffect(() => {
    fetchRecentBookings();
  }, []);

  const fetchRecentBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey(full_name, email, phone),
          venues!bookings_venue_id_fkey(name, address),
          venue_tables!bookings_table_id_fkey(table_type, capacity)
        `)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRForBooking = async (booking) => {
    setLoading(true);
    try {
      console.log('📱 Generating QR for real booking:', booking.id);
      
      // Prepare booking data in the format expected by generateVenueEntryQR
      const bookingData = {
        id: booking.id,
        venue_id: booking.venue_id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        number_of_guests: booking.number_of_guests,
        table: {
          table_number: booking.venue_tables?.table_type || 'N/A'
        },
        venue_tables: booking.venue_tables
      };

      const qrCode = await generateVenueEntryQR(bookingData);
      
      setSelectedBooking(booking);
      setGeneratedQR(qrCode);
      
      console.log('✅ Real booking QR generated:', {
        bookingId: booking.id,
        hasExternalUrl: !!qrCode?.externalUrl,
        hasBase64: !!qrCode?.base64
      });
    } catch (error) {
      console.error('Error generating QR for real booking:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Real Booking QR Test</h3>
      <p className="text-gray-600 mb-4">
        Test QR code generation with real bookings from your database.
      </p>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {bookings.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No confirmed bookings found in the database.</p>
          <p className="text-sm mt-2">Create a booking first to test with real data.</p>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Recent Bookings:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {bookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {booking.profiles?.full_name || 'Unknown Customer'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {booking.venues?.name} • {booking.booking_date} at {booking.start_time}
                    </div>
                    <div className="text-xs text-gray-500">
                      Table: {booking.venue_tables?.table_type || 'N/A'} • 
                      Guests: {booking.number_of_guests} • 
                      ID: {booking.id.substring(0, 8)}...
                    </div>
                  </div>
                  <button
                    onClick={() => generateQRForBooking(booking)}
                    disabled={loading}
                    className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    Generate QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedQR && selectedBooking && (
        <div className="mt-6 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Generated QR Code:</h4>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 bg-white border rounded flex items-center justify-center">
              {generatedQR?.base64 ? (
                <img 
                  src={generatedQR.base64} 
                  alt="QR Code" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-400">No Image</span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Booking:</strong> {selectedBooking.id.substring(0, 8)}...
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Customer:</strong> {selectedBooking.profiles?.full_name}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Venue:</strong> {selectedBooking.venues?.name}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {selectedBooking.booking_date} at {selectedBooking.start_time}
              </div>
              {generatedQR?.externalUrl && (
                <div className="text-sm">
                  <a 
                    href={generatedQR.externalUrl} 
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
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Test Instructions:</strong> Scan this QR code with the venue scanner in the Live Orders tab to verify it works with real booking data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealBookingQRTest;
