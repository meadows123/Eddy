import React, { useEffect, useState, useRef } from 'react';
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
  const [launchUrlChecked, setLaunchUrlChecked] = useState(false);
  const [verificationStep, setVerificationStep] = useState('Initializing...');
  const [debugLogs, setDebugLogs] = useState([]);
  const verificationStartedRef = useRef(false); // Track if verification has started

  // Reset verification ref on mount (in case it was stuck from previous attempt)
  useEffect(() => {
    verificationStartedRef.current = false;
    setDebugLogs(prev => [...prev, 'Component mounted - reset verification']);
  }, []);

  // Helper function to add debug logs (visible on screen)
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
    console.log(logMessage);
  };

  console.log('🔄 PaystackCallbackPage Component Mounted');
  console.log('🔍 Initial state:', {
    url: window.location.href,
    search: window.location.search,
    pathname: window.location.pathname,
    isInApp: typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic)
  });

  // Get launch URL and listen for URL changes from Capacitor App plugin (for deep links)
  useEffect(() => {
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    
    // If not in app, mark as checked immediately (no launch URL needed)
    if (!isInApp) {
      setLaunchUrlChecked(true);
      return;
    }
    
    if (isInApp) {
      // Get initial launch URL
      const getLaunchUrl = async () => {
        try {
          const { url } = await App.getLaunchUrl();
          if (url) {
            console.log('📱 Launch URL from Capacitor:', url);
            setLaunchUrl(url);
            // Update URL in history without reloading (to avoid interrupting verification)
            if (url.includes('?')) {
              try {
                const urlObj = new URL(url);
                if (urlObj.search) {
                  const newPath = urlObj.pathname + urlObj.search;
                  const currentPath = window.location.pathname + window.location.search;
                  
                  // Only update if the URL is actually different (avoid unnecessary navigation)
                  if (newPath !== currentPath) {
                    // Update URL without reloading - React Router will pick up the change
                    window.history.replaceState({}, '', newPath);
                    // Update searchParams by navigating to the same path with new search
                    navigate(newPath, { replace: true });
                  }
                }
              } catch (e) {
                // If URL parsing fails, try to extract path and query manually
                const match = url.match(/^(?:[^:]+:\/\/)?[^/]+(\/[^?]*)(\?.*)?/);
                if (match) {
                  const path = match[1] || '/paystack-callback';
                  const query = match[2] || '';
                  const newPath = path + query;
                  const currentPath = window.location.pathname + window.location.search;
                  
                  // Only update if the URL is actually different
                  if (newPath !== currentPath) {
                    window.history.replaceState({}, '', newPath);
                    navigate(newPath, { replace: true });
                  }
                }
              }
            }
          }
          setLaunchUrlChecked(true);
        } catch (error) {
          console.log('No launch URL or error getting launch URL:', error);
          setLaunchUrlChecked(true); // Mark as checked even if no URL
        }
      };
      
      getLaunchUrl();
      
      // Listen for app URL open events (when app is opened via deep link while running)
      const listener = App.addListener('appUrlOpen', (data) => {
        console.log('📱 App opened with URL:', data.url);
        setLaunchUrl(data.url);
        // Parse the URL and update the current location without reloading
        try {
          const urlObj = new URL(data.url);
          if (urlObj.search) {
            const newPath = urlObj.pathname + urlObj.search;
            const currentPath = window.location.pathname + window.location.search;
            
            // Only update if the URL is actually different (avoid unnecessary navigation)
            if (newPath !== currentPath) {
              window.history.replaceState({}, '', newPath);
              navigate(newPath, { replace: true });
            }
          }
        } catch (e) {
          const match = data.url.match(/^(?:[^:]+:\/\/)?[^/]+(\/[^?]*)(\?.*)?/);
          if (match) {
            const path = match[1] || '/paystack-callback';
            const query = match[2] || '';
            const newPath = path + query;
            const currentPath = window.location.pathname + window.location.search;
            
            // Only update if the URL is actually different
            if (newPath !== currentPath) {
              window.history.replaceState({}, '', newPath);
              navigate(newPath, { replace: true });
            }
          }
        }
      });
      
      return () => {
        listener.then(l => l.remove());
      };
    }
  }, [navigate]);

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
    addDebugLog('🔥 VERIFICATION USEEFFECT TRIGGERED - FORCE STARTING');
    addDebugLog(`URL: ${window.location.href}`);
    addDebugLog(`Search params: ${window.location.search}`);
    addDebugLog(`Status: ${status}, isRedirecting: ${isRedirecting}, launchUrlChecked: ${launchUrlChecked}`);

    // FORCE VERIFICATION TO START - remove all the conditional logic that was preventing it
    if (verificationStartedRef.current) {
      addDebugLog('Verification already started - but forcing restart anyway');
      // Reset to allow restart
      verificationStartedRef.current = false;
    }
    
    // Check if we're in the app
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    addDebugLog(`Environment: InApp=${isInApp}, Mobile=${isMobile}, LaunchChecked=${launchUrlChecked}`);

    // FORCE VERIFICATION - Skip all the conditional checks that were preventing it
    addDebugLog('🚀 FORCE PROCEEDING WITH VERIFICATION - ignoring environment checks');

    // Clear any redirect flags
    if (isRedirecting) {
      addDebugLog('Clearing redirect flag');
      setIsRedirecting(false);
    }
    
    // Mark verification as started IMMEDIATELY to prevent re-runs
    addDebugLog('Starting verification process');
    setVerificationStep('Starting verification...');
    verificationStartedRef.current = true;
    
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
      addDebugLog('🔥 VERIFYPAYMENT FUNCTION CALLED - STARTING VERIFICATION');
      console.log('🔥 VERIFYPAYMENT FUNCTION CALLED - THIS SHOULD SHOW IN CONSOLE');
      setVerificationStep('Extracting payment reference...');

      // Force show a visible alert to confirm we're running
      if (typeof window !== 'undefined' && window.alert) {
        console.log('Showing alert to confirm verification started');
        alert('🔥 VERIFICATION STARTED - Paystack callback processing...');
      }

      // TEMPORARY: Force an error to test error handling
      console.log('🔥 TESTING ERROR HANDLING - forcing an error');
      addDebugLog('TESTING ERROR HANDLING - forcing an error');
      setVerificationStep('TESTING ERROR HANDLING');
      throw new Error('TEST ERROR - This is a forced error to test error handling');
      try {
        // Paystack sends the reference as 'reference' OR 'trxref' parameter
        // Also check URL directly in case deep link format is different
        const urlParams = new URLSearchParams(window.location.search);
        
        addDebugLog(`Search params: ${searchParams.toString()}`);
        addDebugLog(`URL: ${window.location.href.substring(0, 100)}`);
        
        // Try multiple methods to extract reference
        let reference = searchParams.get('reference') || 
                       searchParams.get('trxref') || 
                       urlParams.get('reference') || 
                       urlParams.get('trxref');
        
        addDebugLog(`Initial reference: ${reference || 'NOT FOUND'}`);
        
        // If still no reference, try parsing from launch URL (deep link from Capacitor)
        if (!reference && launchUrl) {
          addDebugLog('Trying to extract from launch URL...');
          try {
            const launchUrlObj = new URL(launchUrl);
            reference = launchUrlObj.searchParams.get('reference') || 
                       launchUrlObj.searchParams.get('trxref');
            addDebugLog(`Extracted from launch URL: ${reference || 'NOT FOUND'}`);
          } catch (e) {
            // If URL parsing fails, try regex
            const urlMatch = launchUrl.match(/[?&#](?:reference|trxref)=([^&#]+)/);
            if (urlMatch) {
              reference = decodeURIComponent(urlMatch[1]);
              addDebugLog(`Extracted from launch URL (regex): ${reference}`);
            }
          }
        }
        
        // If still no reference, try parsing from full URL (for deep links)
        if (!reference) {
          const urlMatch = window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/);
          if (urlMatch) {
            reference = decodeURIComponent(urlMatch[1]);
            addDebugLog(`Extracted from full URL: ${reference}`);
          }
        }
        
        const cancelled = searchParams.get('status') === 'cancelled' || 
                         urlParams.get('status') === 'cancelled' ||
                         window.location.href.includes('status=cancelled') ||
                         (launchUrl && launchUrl.includes('status=cancelled'));

        addDebugLog(`Reference: ${reference || 'NOT FOUND'}, Cancelled: ${cancelled}`);

        // Check if payment was cancelled
        if (cancelled) {
          clearTimeout(timeoutId);
          setStatus('cancelled');
          setMessage('Payment was cancelled. Your booking has not been charged.');
          addDebugLog('Payment cancelled by user');
          return;
        }

        if (!reference) {
          clearTimeout(timeoutId);
          setStatus('error');
          setMessage('No payment reference found in the URL. The payment may have failed or the link is invalid.');
          setError('Missing reference parameter. URL: ' + window.location.href.substring(0, 100));
          addDebugLog('ERROR: No reference found');
          setVerificationStep('ERROR: No reference found');
          return;
        }

        setVerificationStep('Verifying payment with Paystack...');
        addDebugLog(`Verifying payment with reference: ${reference}`);

        // Import Supabase function caller
        const { verifyPaystackPayment: callVerify } = await import('@/lib/api.jsx');

        // Call Supabase Edge Function to verify payment
        setVerificationStep('Calling Paystack verification API...');
        addDebugLog('Calling Paystack verification API...');

        try {
          console.log('🔗 About to call verifyPaystackPayment with reference:', reference);
          const verifyData = await callVerify(reference);
          console.log('✅ API call succeeded:', verifyData);
          addDebugLog(`Verification response: status=${verifyData.data?.status}`);
        } catch (apiError) {
          console.error('❌ API call failed:', apiError);
          addDebugLog(`API call failed: ${apiError.message}`);
          throw apiError;
        }

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
        addDebugLog('Booking updated successfully - setting success status');
        setBookingDetails(bookingData);

        // Clear session data
        clearPaymentFromSession();

        // Set success status (show success page)
        addDebugLog('Setting status to SUCCESS');
        setVerificationStep('Payment verified - showing success page');
        setStatus('success');
        setMessage('Payment verified successfully! Your booking is confirmed.');
        addDebugLog('Success status set - page should update now');
        console.log('✅ Booking confirmation complete');
        console.log('🎉 PAYMENT SUCCESS - Status set to success, UI should update');
        
        // Force UI update by using setTimeout to ensure React processes state changes
        setTimeout(() => {
          addDebugLog('Forcing UI refresh after success');
          // Force a re-render by updating a state
          setVerificationStep(prev => prev + ' (refreshed)');
          
          // After showing success for 2 seconds, navigate to bookings page
          // This ensures user sees confirmation and then goes to their bookings
          setTimeout(() => {
            addDebugLog('Navigating to bookings page');
            console.log('✅ Navigating to bookings page after successful payment');
            navigate('/bookings', { replace: true });
          }, 2000);
        }, 100);

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
        
        const errorMsg = error instanceof Error ? error.message : String(error);
        addDebugLog(`ERROR: ${errorMsg}`);
        setVerificationStep(`ERROR: ${errorMsg}`);
        
        // Provide more helpful error messages
        let userFriendlyMessage = errorMsg;
        if (errorMsg.includes('JSON object requested')) {
          userFriendlyMessage = 'Payment was successful, but there was an issue updating your booking. Please contact support with your payment reference.';
        } else if (errorMsg.includes('Booking not found')) {
          userFriendlyMessage = 'Payment was successful, but we could not find your booking. Please contact support.';
        } else if (errorMsg.includes('Failed to update')) {
          userFriendlyMessage = 'Payment was successful, but there was an issue confirming your booking. Please contact support.';
        }
        
        setStatus('error');
        setMessage(userFriendlyMessage);
        setError(`${errorMsg} (Reference: ${reference})`);
      } finally {
        // Clear timeout when verification completes (success or error)
        clearTimeout(timeoutId);
      }
    };

    // Wrap in try-catch to catch any synchronous errors
    try {
      addDebugLog('Calling verifyPayment...');
      verifyPayment().catch((error) => {
        addDebugLog(`Unhandled promise rejection: ${error?.message || 'Unknown error'}`);
        setStatus('error');
        setMessage(`Payment verification failed: ${error?.message || 'Unknown error'}`);
        setError(`Verification error: ${error?.message || 'Unknown error'}`);
        setVerificationStep(`ERROR: ${error?.message || 'Unknown error'}`);
        clearTimeout(timeoutId);
      });
    } catch (error) {
      addDebugLog(`Error calling verifyPayment: ${error?.message || 'Unknown error'}`);
      setStatus('error');
      setMessage(`Failed to start verification: ${error?.message || 'Unknown error'}`);
      setError(`Startup error: ${error?.message || 'Unknown error'}`);
      setVerificationStep(`ERROR: ${error?.message || 'Unknown error'}`);
      clearTimeout(timeoutId);
    }
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, isRedirecting, status, launchUrl, launchUrlChecked, navigate]);

  // Log when component renders
  useEffect(() => {
    addDebugLog('Component rendered - React is working!');
    setVerificationStep('Component loaded successfully');
  }, []);

  // Watch for success status and ensure UI updates
  useEffect(() => {
    if (status === 'success') {
      addDebugLog('SUCCESS STATUS DETECTED - UI should show success page');
      // Force a small delay to ensure React has processed the state change
      const timer = setTimeout(() => {
        addDebugLog('Success page should be visible now');
        // Optionally auto-navigate to bookings after 3 seconds if user doesn't interact
        // Uncomment if you want automatic navigation:
        // setTimeout(() => {
        //   navigate('/bookings');
        // }, 3000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* HUGE BANNER - Always visible to confirm component loaded */}
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center text-sm font-bold z-50">
        🔴 PAYSTACK CALLBACK PAGE LOADED - React is Working! 🔴
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mt-12"
      >
        <Card className="p-8">
          {/* ALWAYS VISIBLE DEBUG PANEL AT TOP */}
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-left text-sm text-gray-800">
            <p className="font-bold text-yellow-800 mb-2">🔍 DEBUG INFO (Always Visible):</p>
            <p><strong>Current Step:</strong> <span className="text-blue-600">{verificationStep}</span></p>
            <p><strong>Reference:</strong> <span className="text-purple-600">{(() => {
              const urlParams = new URLSearchParams(window.location.search);
              let ref = searchParams.get('reference') || 
                     searchParams.get('trxref') || 
                     urlParams.get('reference') || 
                     urlParams.get('trxref') ||
                     (window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/)?.[1]);
              
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
            })()}</span></p>
            <p><strong>Status:</strong> <span className="text-blue-600">{status}</span></p>
            <p><strong>Verification Started:</strong> <span className={verificationStartedRef.current ? 'text-green-600' : 'text-red-600'}>{verificationStartedRef.current ? 'Yes' : 'No'}</span></p>
            <p><strong>Recent Logs ({debugLogs.length}):</strong></p>
            {debugLogs.length > 0 ? (
              <div className="mt-1 max-h-32 overflow-y-auto bg-white p-2 rounded">
                {debugLogs.slice(-5).map((log, idx) => (
                  <p key={idx} className="text-xs text-gray-700 font-mono">{log}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No logs yet...</p>
            )}
          </div>

          {/* Verifying/Redirecting State */}
          {(status === 'verifying' || isRedirecting) && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader className="h-12 w-12 animate-spin text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isRedirecting ? 'Opening App...' : 'Processing Payment'}
              </h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm font-semibold text-blue-600">{verificationStep}</p>
              {isRedirecting ? (
                <p className="text-sm text-gray-500">
                  Redirecting you to the mobile app to complete your payment verification...
                </p>
              ) : (
                <p className="text-sm text-gray-500">This may take a few moments...</p>
              )}
              
              {/* Manual Retry Button */}
              {status === 'verifying' && !isRedirecting && (
                <>
                  <Button
                    onClick={() => {
                      addDebugLog('Manual retry triggered');
                      verificationStartedRef.current = false;
                      setStatus('verifying');
                      setVerificationStep('Retrying...');
                      // Force re-run by updating a dependency
                      setLaunchUrlChecked(prev => !prev);
                      setLaunchUrlChecked(prev => !prev);
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Retry Verification
                  </Button>

                  {/* TEST BUTTON - Force success to test UI */}
                  <Button
                    onClick={() => {
                      console.log('🔥 FORCE SUCCESS TEST');
                      addDebugLog('FORCE SUCCESS TEST');
                      setStatus('success');
                      setMessage('Test success - forced');
                      setVerificationStep('Force success test');
                    }}
                    variant="outline"
                    className="mt-2 ml-2 bg-green-500 text-white hover:bg-green-600"
                  >
                    Test Success UI
                  </Button>
                </>
              )}
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


          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-red-700">Verification Error</h1>
              <p className="text-gray-600">{message}</p>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                  <p className="text-sm font-semibold text-red-700">Error Details:</p>
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
              
              {/* Debug info in error state */}
              <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs text-gray-600 max-h-64 overflow-y-auto">
                <p><strong>Debug Info:</strong></p>
                <p><strong>Current Step:</strong> {verificationStep}</p>
                <p><strong>Reference:</strong> {(() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  let ref = searchParams.get('reference') || 
                         searchParams.get('trxref') || 
                         urlParams.get('reference') || 
                         urlParams.get('trxref') ||
                         (window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/)?.[1]);
                  
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
                {debugLogs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p><strong>Recent Logs:</strong></p>
                    {debugLogs.map((log, idx) => (
                      <p key={idx} className="text-xs text-gray-500">{log}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    addDebugLog('Manual retry from error state');
                    verificationStartedRef.current = false;
                    setStatus('verifying');
                    setVerificationStep('Retrying...');
                    setError(null);
                    setLaunchUrlChecked(prev => !prev);
                    setLaunchUrlChecked(prev => !prev);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Retry Verification
                </Button>
                <Button
                  onClick={() => navigate('/bookings')}
                  variant="outline"
                  className="w-full"
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

