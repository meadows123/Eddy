import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { verifySplitPaystackPayment, getSplitPaymentFromSession, clearSplitPaymentFromSession } from '@/lib/paystackSplitPaymentHandler';
import { generateVenueEntryQR } from '@/lib/qrCodeService';
import { redirectToMobileApp } from '@/lib/urlUtils';
import { Loader2 } from 'lucide-react';

/**
 * Handles Paystack callback for split payments
 * Verifies payment, updates database, sends emails
 */
const SplitPaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to mobile app if we're in a mobile browser (not in the app)
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    
    // Only redirect if we're on mobile but NOT already in the app
    if (isMobile && !isInApp) {
      console.log('📱 Detected mobile browser, redirecting to app...');
      setIsRedirecting(true);
      setLoading(true);
      
      const reference = searchParams.get('reference') || searchParams.get('trxref');
      const cancelled = searchParams.get('status') === 'cancelled';
      
      const params = {};
      if (reference) params.reference = reference;
      if (cancelled) params.status = 'cancelled';
      
      // Build query string
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      const query = queryString ? `?${queryString}` : '';
      
      // Build app deep link URL
      const appUrl = `com.oneeddy.members://split-payment-callback${query}`;
      
      // For Android, use Intent URL for better compatibility
      const isAndroid = /Android/i.test(navigator.userAgent);
      let redirectUrl = appUrl;
      
      if (isAndroid) {
        // Android Intent URL - more reliable
        const currentPath = `/split-payment-callback${query}`;
        redirectUrl = `intent://oneeddy.com${currentPath}#Intent;scheme=https;package=com.oneeddy.members;end`;
      }
      
      console.log('📱 Redirecting to app with URL:', redirectUrl);
      
      // Try to open the app immediately
      try {
        if (isAndroid) {
          // For Android, try Intent URL first, then fallback to custom scheme
          window.location.href = redirectUrl;
          // Also try custom scheme as fallback
          setTimeout(() => {
            window.location.href = appUrl;
          }, 500);
        } else {
          // For iOS, use iframe method
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = 'none';
          iframe.src = appUrl;
          document.body.appendChild(iframe);
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error redirecting to app:', error);
        setIsRedirecting(false);
        setLoading(false);
      }
      
      // Don't proceed with verification - let the app handle it
      return;
    }
  }, [searchParams]);

  useEffect(() => {
    // Don't verify if we're redirecting to the app
    if (isRedirecting) {
      console.log('⏸️ Skipping verification - redirecting to app');
      return;
    }
    
    const handlePaymentCallback = async () => {
      try {
        setLoading(true);

        // Extract transaction reference
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        if (!reference) {
          throw new Error('No payment reference found');
        }

        console.log('📝 Processing split payment callback with reference:', reference);

        // Verify payment with Paystack
        const verifyData = await verifySplitPaystackPayment(reference);
        console.log('✅ Payment verification response:', {
          status: verifyData.data?.status,
          amount: verifyData.data?.amount,
          metadata: verifyData.data?.metadata
        });

        // Get payment data from session
        const sessionPaymentData = getSplitPaymentFromSession();
        const paystackMetadata = verifyData.data?.metadata || {};
        
        const requestId = paystackMetadata.requestId || sessionPaymentData?.requestId;
        const bookingId = paystackMetadata.bookingId || sessionPaymentData?.bookingId;
        const email = verifyData.data?.customer?.email || sessionPaymentData?.email;

        if (!requestId || !bookingId) {
          throw new Error('Missing request or booking ID in payment data');
        }

        console.log('📋 Extracted payment data:', { requestId, bookingId, email });

        // Verify payment was successful
        if (verifyData.data?.status !== 'success') {
          throw new Error('Payment was not successful');
        }

        // Update split payment request status
        console.log('🔄 Updating split payment request status...');
        const { data: updatedRequest, error: updateError } = await supabase
          .from('split_payment_requests')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Error updating payment request:', updateError);
          throw new Error(`Failed to update payment: ${updateError.message}`);
        }

        console.log('✅ Split payment request updated:', updatedRequest);

        // Check if all split payments are now complete
        console.log('🔍 Checking if all split payments are complete...');
        const { data: allRequests, error: checkError } = await supabase
          .from('split_payment_requests')
          .select('*')
          .eq('booking_id', bookingId);

        if (checkError) {
          console.error('❌ Error checking payment status:', checkError);
          throw new Error(`Failed to check payment status: ${checkError.message}`);
        }

        const allPaid = allRequests?.every(req => req.status === 'paid') || false;
        console.log('💰 All split payments paid?', allPaid, 'Total requests:', allRequests?.length);

        // Update booking if all payments complete
        if (allPaid) {
          console.log('✅ All split payments complete, updating booking...');
          const { error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              payment_status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (bookingUpdateError) {
            console.error('⚠️ Error updating booking status:', bookingUpdateError);
          } else {
            console.log('✅ Booking status updated to confirmed');
          }
        }

        // Send emails via edge function
        console.log('📧 Preparing to send emails...');
        await sendSplitPaymentEmails(bookingId, requestId, verifyData.data);

        // Clear session data
        clearSplitPaymentFromSession();

        // Show success message
        toast({
          title: 'Payment Successful!',
          description: allPaid 
            ? 'All payments complete! Your booking is confirmed.' 
            : 'Your payment has been processed. Waiting for other participants...',
          className: 'bg-green-500 text-white'
        });

        // Redirect to success page with all information
        // Use navigate for better mobile app compatibility (works with deep linking)
        navigate(`/split-payment-success?reference=${encodeURIComponent(reference)}&request_id=${encodeURIComponent(requestId)}&booking_id=${encodeURIComponent(bookingId)}&all_paid=${allPaid}`, { replace: true });

      } catch (err) {
        console.error('❌ Split payment callback error:', err);
        setError(err.message || 'Failed to process payment');
        
        toast({
          title: 'Payment Error',
          description: err.message || 'An error occurred while processing your payment',
          variant: 'destructive'
        });

        // Redirect to payment page after 3 seconds
        setTimeout(() => {
          navigate('/split-payment', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentCallback();
  }, [searchParams, navigate, toast, isRedirecting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-burgundy mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-brand-burgundy mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting you back...</p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Helper function to send split payment emails
 */
async function sendSplitPaymentEmails(bookingId, requestId, paymentData) {
  try {
    console.log('📧 Sending split payment emails...');

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Error fetching booking:', bookingError);
      return;
    }

    // Fetch split payment request details
    const { data: request, error: requestError } = await supabase
      .from('split_payment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('❌ Error fetching request:', requestError);
      return;
    }

    // Fetch venue details
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', booking.venue_id)
      .single();

    if (venueError || !venue) {
      console.error('❌ Error fetching venue:', venueError);
      return;
    }

    const recipientEmail = request.recipient_email || paymentData?.customer?.email;
    const initiatorEmail = request.initiator_email;

    console.log('📧 Email recipients:', {
      recipient: recipientEmail,
      initiator: initiatorEmail,
      venue: venue.contact_email
    });

    // Generate QR code using proper function
    let qrCodeUrl = null;
    try {
      // Fetch booking data for QR code generation
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, venue_id, booking_date, start_time, end_time, number_of_guests, table_id')
        .eq('id', bookingId)
        .single();
      
      if (!bookingError && bookingData) {
        const qrCodeData = await generateVenueEntryQR(bookingData);
        qrCodeUrl = qrCodeData?.externalUrl || qrCodeData?.base64 || null;
        console.log('📱 QR code generated successfully for split payment');
      } else {
        throw new Error('Failed to fetch booking data for QR code');
      }
    } catch (qrError) {
      console.error('❌ Failed to generate QR code:', qrError);
      // Fallback to simple QR code if generation fails
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingId)}`;
    }

    // Note: Individual payment confirmation emails are now sent from SplitPaymentSuccessPage.jsx
    // to avoid duplicate emails. Only venue owner notification is sent here.

    // Send venue owner notification if all payments complete
    if (venue.contact_email) {
      const { data: allRequests } = await supabase
        .from('split_payment_requests')
        .select('status')
        .eq('booking_id', bookingId);

      const allPaid = allRequests?.every(r => r.status === 'paid');

      if (allPaid) {
        console.log('📧 Sending venue owner notification...');
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: venue.contact_email,
            template: 'venue-owner-booking-notification',
            subject: `New Split Payment Booking - ${venue.name}`,
            data: {
              venueName: venue.name,
              customerName: request.initiator_name || 'Guest',
              customerEmail: initiatorEmail,
              customerPhone: request.initiator_phone,
              bookingDate: new Date(booking.booking_date).toLocaleDateString(),
              bookingTime: booking.start_time,
              guestCount: booking.number_of_guests,
              totalAmount: booking.total_amount,
              bookingId,
              venueId: booking.venue_id,
              paymentType: 'split'
            }
          })
        });
        console.log('✅ Venue owner email sent');
      }
    }

  } catch (error) {
    console.error('❌ Error sending split payment emails:', error);
  }
}

export default SplitPaymentCallbackPage;

