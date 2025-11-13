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

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
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
          customer: verifyData.data?.customer?.email
        });

        // Check if payment was successful
        if (verifyData.data?.status !== 'success') {
          setStatus('error');
          setMessage(`Payment status: ${verifyData.data?.status || 'unknown'}. Please try again.`);
          setError('Payment was not successful');
          console.log('❌ Payment not successful:', verifyData.data?.status);
          return;
        }

        console.log('✅ Payment successful! Creating booking...');

        // Get booking data from session
        const paymentData = getPaymentFromSession();
        const { bookingId, email } = paymentData;

        if (!bookingId) {
          throw new Error('Booking ID not found in session');
        }

        console.log('📝 Updating booking:', bookingId);
        console.log('🔍 Session payment data:', paymentData);

        // Update booking in database
        console.log('📊 About to update booking in database...');
        const { data: bookingData, error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'completed',
            payment_reference: reference,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .select(`
            id,
            user_id,
            venue_id,
            booking_date,
            start_time,
            end_time,
            guest_count,
            total_amount,
            venues (
              id,
              name,
              address,
              city
            ),
            profiles (
              id,
              full_name,
              email
            )
          `)
          .single();

        console.log('📝 Database update result:', { bookingData, updateError });

        if (updateError) {
          console.error('❌ UPDATE ERROR:', updateError);
          throw new Error(`Failed to update booking: ${updateError.message}`);
        }

        console.log('✅ Booking updated:', bookingData);
        setBookingDetails(bookingData);

        // Clear session data
        clearPaymentFromSession();

        // Set success status immediately (emails will be sent via webhook)
        setStatus('success');
        setMessage('Payment verified successfully! Your booking is confirmed.');
        console.log('✅ Booking confirmation complete');
        console.log('📧 Emails will be sent via Paystack webhook handler');

        // Redirect to bookings page after 2 seconds
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);

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

