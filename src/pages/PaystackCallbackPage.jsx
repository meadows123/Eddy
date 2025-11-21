import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle, AlertCircle, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPaymentFromSession, clearPaymentFromSession } from '@/lib/paystackCheckoutHandler';
import { generateVenueEntryQR } from '@/lib/qrCodeService';
import { redirectToMobileApp } from '@/lib/urlUtils';
import { App } from '@capacitor/app';

const PaystackCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, cancelled
  const [message, setMessage] = useState('Verifying your payment...');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [launchUrl, setLaunchUrl] = useState(null);

  console.log('🔄 PaystackCallbackPage Component Mounted');
  console.log('🔍 Initial state:', {
    url: window.location.href,
    search: window.location.search,
    pathname: window.location.pathname,
    isInApp: typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic)
  });

  // Get launch URL from Capacitor App plugin (for deep links)
  useEffect(() => {
    const getLaunchUrl = async () => {
      const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
      if (isInApp) {
        try {
          const { url } = await App.getLaunchUrl();
          if (url) {
            console.log('📱 Launch URL from Capacitor:', url);
            setLaunchUrl(url);
            // If launch URL has query params, update the URL to include them
            if (url.includes('?')) {
              const urlObj = new URL(url);
              // Update window.location to include the query params
              if (urlObj.search) {
                window.history.replaceState({}, '', urlObj.pathname + urlObj.search);
              }
            }
          }
        } catch (error) {
          console.log('No launch URL or error getting launch URL:', error);
        }
      }
    };
    getLaunchUrl();
  }, []);

  // Check if we're in the app - if so, we should NOT redirect, just verify payment
  useEffect(() => {
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    
    // If we're in the app, make sure isRedirecting is false so verification can run
    if (isInApp && isRedirecting) {
      console.log('📱 In app - clearing redirect flag to allow verification');
      setIsRedirecting(false);
    }
    
    // Only redirect if we're on mobile browser (NOT in app)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && !isInApp && !isRedirecting) {
      console.log('📱 Fallback: Detected mobile browser, attempting redirect to app...');
      setIsRedirecting(true);
      setMessage('Opening app...');
      
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
      const appUrl = `com.oneeddy.members://paystack-callback${query}`;
      
      // For Android, use Intent URL for better compatibility
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Try to open the app
      try {
        if (isAndroid) {
          // For Android, try Intent URL
          const currentPath = `/paystack-callback${query}`;
          const intentUrl = `intent://oneeddy.com${currentPath}#Intent;scheme=https;package=com.oneeddy.members;end`;
          window.location.href = intentUrl;
        } else {
          // For iOS, use custom scheme
          window.location.href = appUrl;
        }
      } catch (error) {
        console.error('Error redirecting to app:', error);
        setIsRedirecting(false);
      }
      
      // Don't proceed with verification - let the app handle it
      return;
    }
  }, [searchParams, isRedirecting]);

  useEffect(() => {
    // Don't verify if we're redirecting to the app (and not in app)
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    if (isRedirecting && !isInApp) {
      console.log('⏸️ Skipping verification - redirecting to app');
      return;
    }
    
    // Set a timeout to prevent infinite spinning (30 seconds)
    const timeoutId = setTimeout(() => {
      if (status === 'verifying') {
        console.error('⏰ Payment verification timeout after 30 seconds');
        setStatus('error');
        setMessage('Payment verification is taking longer than expected. Please check your bookings or contact support.');
        setError('Verification timeout - please check your bookings page');
      }
    }, 30000);
    
    const verifyPayment = async () => {
      try {
        // Paystack sends the reference as 'reference' OR 'trxref' parameter
        // Also check URL directly in case deep link format is different
        const urlParams = new URLSearchParams(window.location.search);
        
        // Try multiple methods to extract reference
        let reference = searchParams.get('reference') || 
                       searchParams.get('trxref') || 
                       urlParams.get('reference') || 
                       urlParams.get('trxref');
        
        // If still no reference, try parsing from launch URL (deep link from Capacitor)
        if (!reference && launchUrl) {
          try {
            const launchUrlObj = new URL(launchUrl);
            reference = launchUrlObj.searchParams.get('reference') || 
                       launchUrlObj.searchParams.get('trxref');
            console.log('📱 Extracted reference from launch URL:', reference);
          } catch (e) {
            // If URL parsing fails, try regex
            const urlMatch = launchUrl.match(/[?&#](?:reference|trxref)=([^&#]+)/);
            if (urlMatch) {
              reference = decodeURIComponent(urlMatch[1]);
              console.log('📱 Extracted reference from launch URL string:', reference);
            }
          }
        }
        
        // If still no reference, try parsing from full URL (for deep links)
        if (!reference) {
          const urlMatch = window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/);
          if (urlMatch) {
            reference = decodeURIComponent(urlMatch[1]);
          }
        }
        
        const cancelled = searchParams.get('status') === 'cancelled' || 
                         urlParams.get('status') === 'cancelled' ||
                         window.location.href.includes('status=cancelled') ||
                         (launchUrl && launchUrl.includes('status=cancelled'));

        console.log('🔄 Paystack Callback Page Loaded:', {
          reference,
          cancelled,
          url: window.location.href,
          launchUrl: launchUrl,
          searchParams: window.location.search,
          pathname: window.location.pathname,
          isInApp: isInApp,
          isRedirecting: isRedirecting,
          searchParamsKeys: Array.from(searchParams.keys()),
          urlParamsKeys: Array.from(urlParams.keys())
        });

        // Check if payment was cancelled
        if (cancelled) {
          clearTimeout(timeoutId);
          setStatus('cancelled');
          setMessage('Payment was cancelled. Your booking has not been charged.');
          console.log('❌ Payment cancelled by user');
          return;
        }

        if (!reference) {
          clearTimeout(timeoutId);
          setStatus('error');
          setMessage('No payment reference found in the URL. The payment may have failed or the link is invalid.');
          setError('Missing reference parameter. URL: ' + window.location.href.substring(0, 100));
          console.error('❌ No reference in URL. Full URL:', window.location.href);
          console.error('❌ Search params:', Array.from(searchParams.entries()));
          console.error('❌ URL params:', Array.from(urlParams.entries()));
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
        console.log('🔍 Booking ID to update:', bookingId);
        
        // First verify the booking exists
        const { data: existingBooking, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .eq('id', bookingId)
          .maybeSingle();
        
        if (checkError) {
          console.error('❌ Error checking booking existence:', checkError);
          throw new Error(`Failed to verify booking: ${checkError.message}`);
        }
        
        if (!existingBooking) {
          console.error('❌ Booking not found with ID:', bookingId);
          throw new Error(`Booking not found. Please contact support with reference: ${reference}`);
        }
        
        // Update booking payment status
        // Use a two-step approach: update first, then fetch separately to avoid join/select issues
        console.log('📝 Attempting to update booking with ID:', bookingId);
        const { data: updateData, error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'completed',
            payment_reference: reference,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .select('id'); // Select just id to verify update worked

        console.log('📝 Database update result:', { 
          updateError, 
          updateData, 
          rowsUpdated: updateData?.length 
        });

        if (updateError) {
          console.error('❌ UPDATE ERROR:', updateError);
          console.error('❌ Update error details:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint
          });
          throw new Error(`Failed to update booking: ${updateError.message}`);
        }

        // Verify that at least one row was updated
        if (!updateData || updateData.length === 0) {
          console.warn('⚠️ No rows were updated. Booking might not exist or already be updated.');
          // Don't throw error here - booking might already be updated, continue to fetch
        } else {
          console.log('✅ Successfully updated booking:', updateData[0].id);
        }

        // Now fetch the updated booking data separately (without joins to avoid errors)
        const { data: bookingDataArray, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            id, 
            booking_date, 
            start_time, 
            end_time, 
            number_of_guests, 
            total_amount, 
            venue_id, 
            user_id,
            table_id
          `)
          .eq('id', bookingId)
          .limit(1);
        
        if (fetchError) {
          console.error('❌ Error fetching updated booking:', fetchError);
          throw new Error(`Failed to fetch updated booking: ${fetchError.message}`);
        }
        
        // Get the first (and should be only) booking from the array
        let bookingData = bookingDataArray && bookingDataArray.length > 0 ? bookingDataArray[0] : null;
        
        if (!bookingData) {
          console.error('❌ No booking data returned after fetch');
          throw new Error(`Booking was updated but could not be retrieved. Booking ID: ${bookingId}, Reference: ${reference}`);
        }
        
        // Fetch venue data separately to avoid join issues
        if (bookingData.venue_id) {
          const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('name, address, city, contact_phone')
            .eq('id', bookingData.venue_id)
            .maybeSingle();
          
          if (!venueError && venueData) {
            bookingData.venues = venueData;
            console.log('✅ Venue data fetched separately:', venueData);
          } else if (venueError) {
            console.warn('⚠️ Error fetching venue data:', venueError);
            // Don't fail the whole process if venue fetch fails
          }
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

          // Generate QR code for the booking using proper function
          console.log('📱 Generating QR code for booking:', bookingId);
          let qrCodeUrl = null;
          try {
            const qrCodeData = await generateVenueEntryQR({
              id: bookingId,
              venue_id: bookingData.venue_id,
              booking_date: bookingData.booking_date,
              start_time: bookingData.start_time,
              end_time: bookingData.end_time,
              number_of_guests: bookingData.number_of_guests,
              table_id: bookingData.table_id || null
            });
            qrCodeUrl = qrCodeData?.externalUrl || qrCodeData?.base64 || null;
            console.log('📱 QR code generated successfully:', qrCodeUrl ? 'Yes' : 'No');
          } catch (qrError) {
            console.error('❌ Failed to generate QR code:', qrError);
            // Fallback to simple QR code if generation fails
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingId)}`;
          }

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
            const { data: venueDataArray, error: venueError } = await supabase
              .from('venues')
              .select('contact_email, owner_id')
              .eq('id', bookingData.venue_id)
              .limit(1);
            
            const venueData = venueDataArray && venueDataArray.length > 0 ? venueDataArray[0] : null;
            
            console.log('📍 Venue fetch result:', { venueData, venueError });
            
            if (venueError) {
              console.warn('⚠️ Error fetching venue:', venueError);
            } else if (venueData?.contact_email) {
              venueOwnerEmail = venueData.contact_email;
              console.log('✅ Found venue contact email:', venueOwnerEmail);
            } else if (venueData?.owner_id) {
              // If no contact email, try to get from venue_owners table
              console.log('📧 No contact email, fetching from venue_owners with owner_id:', venueData.owner_id);
              const { data: ownerDataList, error: ownerError } = await supabase
                .from('venue_owners')
                .select('owner_email')
                .eq('user_id', venueData.owner_id);
              
              console.log('📍 Venue owner fetch result:', { ownerDataList, ownerError });
              
              if (ownerError) {
                console.warn('⚠️ Error fetching venue owner:', ownerError);
              } else if (ownerDataList && ownerDataList.length > 0 && ownerDataList[0]?.owner_email) {
                venueOwnerEmail = ownerDataList[0].owner_email;
                console.log('✅ Found venue owner email:', venueOwnerEmail);
              }
            } else {
              console.warn('⚠️ Venue found but no contact_email or owner_id');
            }
          } catch (venueError) {
            console.error('❌ Exception fetching venue email:', venueError);
          }

          console.log('📧 Sending to venue owner:', venueOwnerEmail);
          
          // Prepare email data with all required fields for the Edge Function
          const venueEmailData = {
            venueName: paystackMetadata.venueName,
            customerName: paystackMetadata.customerName,
            customerEmail: email,
            customerPhone: paystackMetadata.customerPhone,
            bookingDate: new Date(bookingData.booking_date).toLocaleDateString(),
            bookingTime: bookingData.start_time,
            guestCount: bookingData.number_of_guests,
            totalAmount: bookingData.total_amount,
            bookingId: bookingId,
            // CRITICAL: Include ownerEmail and venueId so Edge Function can process the email
            ownerEmail: venueOwnerEmail !== 'info@oneeddy.com' ? venueOwnerEmail : '', // Empty string if placeholder, so Edge Function will look it up
            venueId: bookingData.venue_id // Required for Edge Function to look up venue owner if ownerEmail is missing
          };
          
          console.log('📧 Venue owner email data:', {
            ownerEmail: venueEmailData.ownerEmail,
            venueId: venueEmailData.venueId,
            venueName: venueEmailData.venueName
          });
          
          const venueEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: venueOwnerEmail, // Still include in 'to' field as fallback
              template: 'venue-owner-booking-notification',
              subject: `New Booking - ${paystackMetadata.venueName}`,
              data: venueEmailData
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
        // Get reference for error reporting (try multiple methods)
        const urlParams = new URLSearchParams(window.location.search);
        let reference = searchParams.get('reference') || 
                       searchParams.get('trxref') || 
                       urlParams.get('reference') || 
                       urlParams.get('trxref') ||
                       (window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/)?.[1]) ||
                       'unknown';
        
        console.error('❌ Callback verification error:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          reference: reference,
          url: window.location.href
        });
        
        // Log to console in a very visible way
        console.error('🚨 PAYMENT CALLBACK ERROR 🚨');
        console.error('Payment Reference:', reference);
        console.error('Error Message:', error?.message);
        console.error('Full Error:', error);
        
        setStatus('error');
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Provide more helpful error messages
        let userFriendlyMessage = errorMsg;
        if (errorMsg.includes('JSON object requested')) {
          userFriendlyMessage = 'Payment was successful, but there was an issue updating your booking. Please contact support with your payment reference.';
        } else if (errorMsg.includes('Booking not found')) {
          userFriendlyMessage = 'Payment was successful, but we could not find your booking. Please contact support.';
        } else if (errorMsg.includes('Failed to update')) {
          userFriendlyMessage = 'Payment was successful, but there was an issue confirming your booking. Please contact support.';
        }
        
        setMessage(userFriendlyMessage);
        setError(`${errorMsg} (Reference: ${reference})`);
      } finally {
        // Clear timeout when verification completes (success or error)
        clearTimeout(timeoutId);
      }
    };

    verifyPayment();
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, isRedirecting, status, launchUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* Verifying/Redirecting State */}
          {(status === 'verifying' || isRedirecting) && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader className="h-12 w-12 animate-spin text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isRedirecting ? 'Opening App...' : 'Processing'}
              </h1>
              <p className="text-gray-600">{message}</p>
              {isRedirecting ? (
                <p className="text-sm text-gray-500">
                  Redirecting you to the mobile app to complete your payment verification...
                </p>
              ) : (
                <p className="text-sm text-gray-500">This may take a few moments...</p>
              )}
              
              {/* Debug info - visible on screen for troubleshooting */}
              <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs text-gray-600">
                <p><strong>Debug Info:</strong></p>
                <p>URL: {window.location.href.substring(0, 80)}...</p>
                <p>Launch URL: {launchUrl ? (launchUrl.length > 80 ? launchUrl.substring(0, 80) + '...' : launchUrl) : 'None'}</p>
                <p>Reference: {(() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  let ref = searchParams.get('reference') || 
                         searchParams.get('trxref') || 
                         urlParams.get('reference') || 
                         urlParams.get('trxref') ||
                         (window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/)?.[1]);
                  
                  // Also check launchUrl
                  if (!ref && launchUrl) {
                    try {
                      const launchUrlObj = new URL(launchUrl);
                      ref = launchUrlObj.searchParams.get('reference') || launchUrlObj.searchParams.get('trxref');
                    } catch (e) {
                      const match = launchUrl.match(/[?&#](?:reference|trxref)=([^&#]+)/);
                      if (match) ref = decodeURIComponent(match[1]);
                    }
                  }
                  
                  return ref || 'Not found';
                })()}</p>
                <p>In App: {typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic) ? 'Yes' : 'No'}</p>
                <p>Status: {status}</p>
              </div>
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
                    <p><strong>Guests:</strong> {bookingDetails.number_of_guests || bookingDetails.guest_count || 'N/A'}</p>
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

