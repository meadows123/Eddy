import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle, AlertCircle, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPaymentFromSession, clearPaymentFromSession } from '@/lib/paystackCheckoutHandler';

const PaystackCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, cancelled
  const [message, setMessage] = useState('Verifying your payment...');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [error, setError] = useState(null);

  console.log('🔄 PaystackCallbackPage Component Mounted');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Paystack sends the reference as 'reference' OR 'trxref' parameter
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        const cancelled = searchParams.get('status') === 'cancelled';

        console.log('🔄 Paystack Callback Page Loaded:', {
          reference,
          cancelled,
          url: window.location.href
        });

        // Check if payment was cancelled
        if (cancelled) {
          setStatus('cancelled');
          setMessage('Payment was cancelled. Your booking has not been charged.');
          console.log('❌ Payment cancelled by user');
          return;
        }

        if (!reference) {
          setStatus('error');
          setMessage('No payment reference found. Please try again.');
          setError('Missing reference parameter');
          console.log('❌ No reference in URL');
          return;
        }

        console.log('🔍 Verifying payment with reference:', reference);

        // Import Supabase function caller
        const { verifyPaystackPayment: callVerify } = await import('@/lib/api.jsx');

        // Call Supabase Edge Function to verify payment
        const verifyData = await callVerify(reference);
        console.log('✅ Payment verification response:', {
          status: verifyData.data?.status,
          amount: verifyData.data?.amount,
          customer: verifyData.data?.customer?.email,
          metadata: verifyData.data?.metadata
        });

        // Check if payment was successful
        if (verifyData.data?.status !== 'success') {
          setStatus('error');
          setMessage(`Payment status: ${verifyData.data?.status || 'unknown'}. Please try again.`);
          setError('Payment was not successful');
          console.log('❌ Payment not successful:', verifyData.data?.status);
          return;
        }

        console.log('✅ Payment successful! Extracting booking data...');

        // Get booking data from Paystack metadata (sent during initialization)
        const paystackMetadata = verifyData.data?.metadata || {};
        const paymentData = getPaymentFromSession();
        
        // Booking ID comes from Paystack metadata first, then session storage
        const bookingId = paystackMetadata.bookingId || paymentData?.bookingId;
        const email = verifyData.data?.customer?.email || paymentData?.email;

        console.log('🔍 Extracted booking data:', {
          bookingId,
          email,
          fromMetadata: !!paystackMetadata.bookingId,
          metadata: paystackMetadata
        });

        if (!bookingId) {
          throw new Error('Booking ID not found in payment verification or session');
        }

        console.log('📝 Updating booking:', bookingId);
        console.log('🔍 Paystack metadata:', paystackMetadata);

        // Update booking payment status in database
        console.log('📊 About to update booking payment status...');
        const { data: bookingData, error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'completed',
            payment_reference: reference,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .select('id, booking_date, start_time, end_time, number_of_guests, total_amount, venue_id, user_id')
          .single();

        console.log('📝 Database update result:', { bookingData, updateError });

        if (updateError) {
          console.error('❌ UPDATE ERROR:', updateError);
          throw new Error(`Failed to update booking: ${updateError.message}`);
        }

        console.log('✅ Booking payment status updated:', bookingData);
        setBookingDetails(bookingData);

        // Clear session data
        clearPaymentFromSession();

        // Set success status (show success page)
        setStatus('success');
        setMessage('Payment verified successfully! Your booking is confirmed.');
        console.log('✅ Booking confirmation complete');

        // Send emails as fallback (webhook might not fire reliably)
        console.log('📧 Sending emails as fallback from callback page...');
        try {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

          // Generate QR code for the booking
          console.log('📱 Generating QR code for booking:', bookingId);
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingId)}`;
          console.log('📱 QR code URL:', qrCodeUrl);

          // Send customer confirmation email
          console.log('📧 Sending customer confirmation email to:', email);
          const customerResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: email,
              template: 'booking-confirmation',
              subject: `Booking Confirmed! - ${paystackMetadata.venueName}`,
              data: {
                email: email,
                customerName: paystackMetadata.customerName,
                bookingId: bookingId,
                bookingDate: new Date(bookingData.booking_date).toLocaleDateString(),
                bookingTime: bookingData.start_time,
                endTime: bookingData.end_time,
                guestCount: bookingData.number_of_guests,
                totalAmount: bookingData.total_amount,
                venueName: paystackMetadata.venueName,
                venueAddress: paystackMetadata.venueAddress,
                qrCodeImage: qrCodeUrl
              }
            }),
          });

          if (customerResponse.ok) {
            console.log('✅ Customer confirmation email sent successfully');
          } else {
            const error = await customerResponse.json();
            console.error('⚠️ Customer email failed:', error);
          }
        } catch (error) {
          console.error('⚠️ Error sending customer email:', error);
        }

        // Send venue owner notification email
        try {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

          console.log('📧 Sending venue owner notification...');
          console.log('📊 Booking data available:', bookingData);
          
          // Fetch venue owner email
          let venueOwnerEmail = 'info@oneeddy.com'; // Fallback
          console.log('🔍 Looking up venue with ID:', bookingData?.venue_id);
          try {
            // First try to get venue contact email
            const { data: venueData, error: venueError } = await supabase
              .from('venues')
              .select('contact_email, owner_id')
              .eq('id', bookingData.venue_id)
              .single();
            
            console.log('📍 Venue fetch result:', { venueData, venueError });
            
            if (venueError) {
              console.warn('⚠️ Error fetching venue:', venueError);
            } else if (venueData?.contact_email) {
              venueOwnerEmail = venueData.contact_email;
              console.log('✅ Found venue contact email:', venueOwnerEmail);
            } else if (venueData?.owner_id) {
              // If no contact email, try to get from venue_owners table
              console.log('📧 No contact email, fetching from venue_owners with owner_id:', venueData.owner_id);
              const { data: ownerData, error: ownerError } = await supabase
                .from('venue_owners')
                .select('owner_email')
                .eq('user_id', venueData.owner_id)
                .single();
              
              console.log('📍 Venue owner fetch result:', { ownerData, ownerError });
              
              if (ownerError) {
                console.warn('⚠️ Error fetching venue owner:', ownerError);
              } else if (ownerData?.owner_email) {
                venueOwnerEmail = ownerData.owner_email;
                console.log('✅ Found venue owner email:', venueOwnerEmail);
              }
            } else {
              console.warn('⚠️ Venue found but no contact_email or owner_id');
            }
          } catch (venueError) {
            console.error('❌ Exception fetching venue email:', venueError);
          }

          console.log('📧 Sending to venue owner:', venueOwnerEmail);
          const venueEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: venueOwnerEmail,
              template: 'venue-owner-booking-notification',
              subject: `New Booking - ${paystackMetadata.venueName}`,
              data: {
                venueName: paystackMetadata.venueName,
                customerName: paystackMetadata.customerName,
                customerEmail: email,
                customerPhone: paystackMetadata.customerPhone,
                bookingDate: new Date(bookingData.booking_date).toLocaleDateString(),
                bookingTime: bookingData.start_time,
                guestCount: bookingData.number_of_guests,
                totalAmount: bookingData.total_amount,
                bookingId: bookingId
              }
            }),
          });

          if (venueEmailResponse.ok) {
            console.log('✅ Venue owner notification sent successfully');
          } else {
            const error = await venueEmailResponse.json();
            console.error('⚠️ Venue owner email failed:', error);
          }
        } catch (error) {
          console.error('⚠️ Error sending venue owner email:', error);
        }

      } catch (error) {
        console.error('❌ Callback verification error:', error);
        setStatus('error');
        const errorMsg = error instanceof Error ? error.message : String(error);
        setMessage(errorMsg || 'An error occurred while processing your payment.');
        setError(errorMsg);
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader className="h-12 w-12 animate-spin text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Processing</h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">This may take a few moments...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                >
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </motion.div>
              </div>
              <h1 className="text-2xl font-bold text-green-700">Payment Successful!</h1>
              <p className="text-gray-600">{message}</p>

              {/* Booking Details */}
              {bookingDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left space-y-2 my-4">
                  <p className="text-sm font-semibold text-gray-700">Booking Details:</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Venue:</strong> {bookingDetails.venues?.name}</p>
                    <p><strong>Date:</strong> {new Date(bookingDetails.booking_date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {bookingDetails.start_time} - {bookingDetails.end_time}</p>
                    <p><strong>Guests:</strong> {bookingDetails.guest_count}</p>
                    <p><strong>Total Amount:</strong> ₦{bookingDetails.total_amount?.toLocaleString()}</p>
                    <p><strong>Reference:</strong> {bookingDetails.id?.slice(0, 8)}...</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  A confirmation email has been sent to your email address.
                </p>
                <Button
                  onClick={() => navigate('/bookings')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  View My Bookings
                </Button>
                <Button
                  onClick={() => navigate('/venues')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Venues
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-red-700">Payment Failed</h1>
              <p className="text-gray-600">{message}</p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  Error: {error}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Your booking has not been charged. Please try again.
                </p>
                <Button
                  onClick={() => navigate(-1)}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/venues')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Venues
                </Button>
              </div>
            </div>
          )}

          {/* Cancelled State */}
          {status === 'cancelled' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-yellow-700">Payment Cancelled</h1>
              <p className="text-gray-600">{message}</p>

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  You can try again whenever you're ready.
                </p>
                <Button
                  onClick={() => navigate(-1)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/venues')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Venues
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Security Notice */}
        <div className="text-center mt-4 text-xs text-gray-500">
          <p>🔒 Your payment is secure and encrypted by Paystack</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaystackCallbackPage;

