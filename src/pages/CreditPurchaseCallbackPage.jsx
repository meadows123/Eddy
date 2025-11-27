import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { verifyCreditPurchasePayment, getCreditPurchaseFromSession, clearCreditPurchaseFromSession, completeCreditPurchase } from '@/lib/paystackCreditPurchaseHandler';
import { Loader2 } from 'lucide-react';
import { App } from '@capacitor/app';

/**
 * Handles Paystack callback for credit purchases
 * Verifies payment, creates credits, sends email
 */
const CreditPurchaseCallbackPage = () => {
  console.log('🔥 Credit purchase callback page loaded');
  console.log('🔥 Current URL:', window.location.href);
  console.log('🔥 Search params:', window.location.search);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [launchUrl, setLaunchUrl] = useState(null);
  const [launchUrlChecked, setLaunchUrlChecked] = useState(false);
  const verificationStartedRef = useRef(false);

  // Reset verification ref on mount and check for immediate redirect
  useEffect(() => {
    verificationStartedRef.current = false;
    
    // Immediate check: if we're on mobile browser (not in app), redirect immediately
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    
    if (isMobile && !isInApp) {
      console.log('🚨 IMMEDIATE: Mobile browser detected on callback page, redirecting NOW');
      setIsRedirecting(true);
      setLoading(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference') || urlParams.get('trxref');
      const cancelled = urlParams.get('status') === 'cancelled';
      
      const params = {};
      if (reference) params.reference = reference;
      if (cancelled) params.status = 'cancelled';
      
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      const query = queryString ? `?${queryString}` : '';
      
      const appUrl = `com.oneeddy.members://credit-purchase-callback${query}`;
      
      if (/Android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://oneeddy.com/credit-purchase-callback${query}#Intent;scheme=https;package=com.oneeddy.members;end`;
        console.log('🚨 IMMEDIATE: Redirecting Android to:', intentUrl);
        window.location.href = intentUrl;
      } else {
        console.log('🚨 IMMEDIATE: Redirecting iOS to:', appUrl);
        window.location.href = appUrl;
      }
    }
  }, []);

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
          const result = await App.getLaunchUrl();
          const url = result?.url;
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
                  const path = match[1] || '/credit-purchase-callback';
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
            const path = match[1] || '/credit-purchase-callback';
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
      const appUrl = `com.oneeddy.members://credit-purchase-callback${query}`;
      
      // For Android, use Intent URL for better compatibility
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Try to open the app
      try {
        if (isAndroid) {
          // For Android, try Intent URL
          const currentPath = `/credit-purchase-callback${query}`;
          const intentUrl = `intent://oneeddy.com${currentPath}#Intent;scheme=https;package=com.oneeddy.members;end`;
          window.location.href = intentUrl;
        } else {
          // For iOS, use custom scheme
          window.location.href = appUrl;
        }
      } catch (error) {
        console.error('Error redirecting to app:', error);
        setIsRedirecting(false);
        setLoading(false);
      }
      
      // Don't proceed with verification - let the app handle it
      return;
    }
  }, [searchParams, isRedirecting]);

  useEffect(() => {
    console.log('🔥 VERIFICATION USEEFFECT TRIGGERED - FORCE STARTING');
    console.log('🔥 URL:', window.location.href);
    console.log('🔥 Search params:', window.location.search);
    console.log('🔥 Status:', { isRedirecting, launchUrlChecked, verificationStarted: verificationStartedRef.current });
    
    // FORCE VERIFICATION TO START - similar to PaystackCallbackPage
    if (verificationStartedRef.current) {
      console.log('Verification already started - but forcing restart anyway');
      // Reset to allow restart
      verificationStartedRef.current = false;
    }
    
    // Check if we're in the app
    const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log(`Environment: InApp=${isInApp}, Mobile=${isMobile}, LaunchChecked=${launchUrlChecked}`);
    
    // FORCE VERIFICATION - Skip conditional checks that were preventing it
    console.log('🚀 FORCE PROCEEDING WITH VERIFICATION - ignoring environment checks');
    
    // Clear any redirect flags
    if (isRedirecting && !isInApp) {
      console.log('Clearing redirect flag to allow verification');
      setIsRedirecting(false);
    }
    
    // Wait for launch URL check to complete (if in app) - but don't block forever
    if (isInApp && !launchUrlChecked) {
      console.log('Waiting for launch URL check (max 2 seconds)...');
      const timeout = setTimeout(() => {
        console.log('Launch URL check timeout - proceeding anyway');
        setLaunchUrlChecked(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }
    
    // Mark verification as started IMMEDIATELY
    console.log('Starting verification process');
    verificationStartedRef.current = true;
    
    // Set a timeout to prevent infinite spinning (30 seconds)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('⏰ Payment verification timeout after 30 seconds');
        setError('Payment verification is taking longer than expected. Please check your credits or contact support.');
        setLoading(false);
      }
    }, 30000);
    
    const handlePaymentCallback = async () => {
      try {
        setLoading(true);
        console.log('🔄 Processing payment callback...');

        // Extract transaction reference - try multiple methods like PaystackCallbackPage
        const urlParams = new URLSearchParams(window.location.search);
        let reference = searchParams.get('reference') || 
                       searchParams.get('trxref') || 
                       urlParams.get('reference') || 
                       urlParams.get('trxref');
        
        console.log('🔍 Reference extraction attempt 1 (URL params):', reference);
        
        // If still no reference, try parsing from launch URL (deep link from Capacitor)
        if (!reference && launchUrl) {
          console.log('🔍 Trying launch URL:', launchUrl);
          try {
            const launchUrlObj = new URL(launchUrl);
            reference = launchUrlObj.searchParams.get('reference') || 
                       launchUrlObj.searchParams.get('trxref');
            console.log('🔍 Reference from launch URL:', reference);
          } catch (e) {
            console.log('🔍 Launch URL parsing failed, trying regex');
            // If URL parsing fails, try regex
            const urlMatch = launchUrl.match(/[?&#](?:reference|trxref)=([^&#]+)/);
            if (urlMatch) {
              reference = decodeURIComponent(urlMatch[1]);
              console.log('🔍 Reference from launch URL (regex):', reference);
            }
          }
        }
        
        // If still no reference, try parsing from full URL (for deep links)
        if (!reference) {
          console.log('🔍 Trying full URL:', window.location.href);
          const urlMatch = window.location.href.match(/[?&#](?:reference|trxref)=([^&#]+)/);
          if (urlMatch) {
            reference = decodeURIComponent(urlMatch[1]);
            console.log('🔍 Reference from full URL:', reference);
          }
        }
        
        // CRITICAL FALLBACK: Use reference from sessionStorage (stored before redirecting)
        if (!reference) {
          console.log('🔍 Trying sessionStorage for reference...');
          const storedReference = sessionStorage.getItem('paystack_callback_reference');
          if (storedReference) {
            reference = storedReference;
            console.log('✅ Found reference in sessionStorage:', reference);
            // Clear it after using it so it doesn't interfere with future payments
            sessionStorage.removeItem('paystack_callback_reference');
          }
        }
        
        if (!reference) {
          console.error('❌ No reference found in URL, launch URL, or sessionStorage');
          console.error('❌ Debug info:', {
            url: window.location.href,
            search: window.location.search,
            pathname: window.location.pathname,
            launchUrl: launchUrl,
            sessionStorageRef: sessionStorage.getItem('paystack_callback_reference')
          });
          throw new Error('No payment reference found');
        }
        
        console.log('✅ Using reference:', reference);

        console.log('📝 Processing credit purchase callback with reference:', reference);

        // Verify payment with Paystack
        // Declare verifyData outside try block to ensure it's in scope throughout the function
        let verifyData;
        verifyData = await verifyCreditPurchasePayment(reference);
        console.log('✅ Payment verification response:', {
          status: verifyData.data?.status,
          amount: verifyData.data?.amount,
          metadata: verifyData.data?.metadata
        });

        // Get payment data from session
        const sessionPaymentData = getCreditPurchaseFromSession();
        const paystackMetadata = verifyData.data?.metadata || {};
        
        const venueId = paystackMetadata.venueId || sessionPaymentData?.venueId;
        const venueName = paystackMetadata.venueName || sessionPaymentData?.venueName;
        const email = verifyData.data?.customer?.email || sessionPaymentData?.email;
        const fullName = paystackMetadata.customerName || sessionPaymentData?.fullName;
        const totalAmount = verifyData.data?.amount / 100; // Convert from kobo to naira

        if (!venueId) {
          throw new Error('Missing venue ID in payment data');
        }

        console.log('📋 Extracted payment data:', { venueId, venueName, email, totalAmount });

        // Verify payment was successful
        if (verifyData.data?.status !== 'success') {
          throw new Error('Payment was not successful');
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Error getting user:', userError);
          throw new Error('User not authenticated');
        }

        console.log('✅ User authenticated:', user.id);

        // Complete credit purchase
        console.log('💳 Completing credit purchase...');
        const creditRecord = await completeCreditPurchase({
          bookingData: {
            userId: user.id,
            venueId,
            venueName
          },
          paymentData: {
            reference,
            amount: totalAmount // Full amount (no commission deducted)
          },
          supabaseClient: supabase
        });

        console.log('✅ Credit purchase completed:', creditRecord);

        // Send confirmation email with QR code
        console.log('📧 Sending credit purchase confirmation email...');
        try {
          // Generate QR code for the credit record using proper format
          console.log('📱 Generating QR code for credit purchase...');
          let qrCodeUrl = null;
          try {
            const { generateCreditPurchaseQR } = await import('@/lib/qrCodeService');
            const qrCodeData = await generateCreditPurchaseQR({
              userId: user.id,
              venueId: venueId,
              creditId: creditRecord.id,
              amount: totalAmount // Full amount (no commission)
            });
            qrCodeUrl = qrCodeData?.externalUrl || qrCodeData?.base64 || null;
            console.log('📱 QR code generated successfully for credit purchase');
          } catch (qrError) {
            console.error('❌ Failed to generate QR code:', qrError);
            // Fallback to simple QR code if generation fails
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${creditRecord.id}&color=800020&bgcolor=FFFFFF&format=png`;
          }
          
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: email,
              template: 'credit-purchase-confirmation',
              subject: `Credit Purchase Confirmed - ${venueName}`,
              data: {
                customerName: fullName,
                email,
                amount: totalAmount, // Full amount (no commission deducted)
                totalPaid: totalAmount,
                venueName,
                dashboardUrl: `https://oneeddy.com/profile?tab=wallet`,
                memberTier: 'VIP',
                qrCodeImage: qrCodeUrl
              }
            })
          });

          if (!emailResponse.ok) {
            console.error('⚠️ Error sending email:', emailResponse.status);
          } else {
            console.log('✅ Confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('❌ Error sending email:', emailError);
          // Don't fail if email fails
        }

        // Send venue owner notification
        console.log('📧 Sending venue owner notification...');
        try {
          console.log('📧 DEBUG: Venue ID for lookup:', venueId);
          
          // Try to find venue owner by venue_id (primary method)
          let venueOwnerData = null;
          const { data: ownerDataList, error: ownerError } = await supabase
            .from('venue_owners')
            .select('owner_email, owner_name, email, venue_id, user_id')
            .eq('venue_id', venueId)
            .limit(1);

          if (!ownerError && ownerDataList && ownerDataList.length > 0) {
            venueOwnerData = ownerDataList[0];
            console.log('✅ Venue owner data fetched by venue_id:', {
              owner_email: venueOwnerData.owner_email,
              email: venueOwnerData.email,
              owner_name: venueOwnerData.owner_name
            });
          } else {
            console.log('⚠️ Could not fetch venue owner data by venue_id:', ownerError);
            
            // Fallback: Try to find by owner_id if venue has it
            const { data: venueData, error: venueError } = await supabase
              .from('venues')
              .select('owner_id, contact_email')
              .eq('id', venueId)
              .single();

            if (!venueError && venueData?.owner_id) {
              const { data: fallbackOwnerList, error: fallbackError } = await supabase
                .from('venue_owners')
                .select('owner_email, owner_name, email')
                .eq('user_id', venueData.owner_id)
                .limit(1);
              
              if (!fallbackError && fallbackOwnerList && fallbackOwnerList.length > 0) {
                venueOwnerData = fallbackOwnerList[0];
                console.log('✅ Venue owner data fetched by owner_id (fallback):', {
                  owner_email: venueOwnerData.owner_email,
                  email: venueOwnerData.email
                });
              } else {
                console.log('⚠️ Could not fetch venue owner data by owner_id:', fallbackError);
              }
            }
          }

          if (venueOwnerData) {
            const ownerEmail = venueOwnerData.owner_email || venueOwnerData.email;
            
            if (ownerEmail && ownerEmail !== 'info@oneeddy.com' && ownerEmail.includes('@')) {
              console.log('📧 Sending venue owner notification to:', ownerEmail);
              
              const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
              const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              const venueOwnerEmailData = {
                ownerEmail: ownerEmail && ownerEmail !== 'info@oneeddy.com' ? ownerEmail : '',  // Pass empty if placeholder so Edge Function can look it up
                venueId: venueId,  // Add venueId for Edge Function lookup
                venueName,
                bookingDate: new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                bookingTime: new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }),
                endTime: 'N/A',
                guestCount: 1,
                totalAmount: Math.round(totalAmount * 0.9),
                tableInfo: `Credit Purchase: ₦${Math.round(totalAmount * 0.9).toLocaleString()} credits`,
                customerName: fullName,
                customerEmail: email,
                customerPhone: 'N/A',
                specialRequests: `Credit Purchase Payment`,
                ownerUrl: `${window.location.origin}/venue-owner/dashboard`
              };
              
              console.log('📧 Venue owner email data being sent:', {
                to: ownerEmail,
                ownerEmail: venueOwnerEmailData.ownerEmail,
                venueId: venueOwnerEmailData.venueId,
                template: 'venue-owner-booking-notification'
              });
              
              const venueEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  to: ownerEmail,
                  template: 'venue-owner-booking-notification',
                  subject: `New Credit Purchase - ${venueName}`,
                  data: venueOwnerEmailData
                })
              });

              const venueEmailResponseData = await venueEmailResponse.json().catch(() => ({}));
              
              if (venueEmailResponse.ok) {
                console.log('✅ Venue owner notification sent successfully:', {
                  status: venueEmailResponse.status,
                  response: venueEmailResponseData
                });
              } else {
                console.error('⚠️ Venue owner email failed:', {
                  status: venueEmailResponse.status,
                  statusText: venueEmailResponse.statusText,
                  error: venueEmailResponseData
                });
              }
            } else {
              console.log('⚠️ Skipping venue owner email - invalid or placeholder email:', {
                ownerEmail,
                isPlaceholder: ownerEmail === 'info@oneeddy.com',
                hasAtSymbol: ownerEmail?.includes('@')
              });
            }
          } else {
            console.log('⚠️ No venue owner found for notification');
          }
        } catch (venueEmailError) {
          console.error('❌ Error sending venue owner email:', venueEmailError);
          // Don't fail if email fails
        }

        // Clear session data
        clearCreditPurchaseFromSession();

        // Show success message
        toast({
          title: 'Payment Successful!',
          description: `₦${Math.round(totalAmount * 0.9).toLocaleString()} credits added to your account.`,
          className: 'bg-green-500 text-white'
        });

        // Redirect to success page with details
        setTimeout(() => {
          navigate(`/credit-purchase-success?amount=${totalAmount}&venue=${venueName}&credits=${Math.round(totalAmount * 0.9)}`, { replace: true });
        }, 1000);

      } catch (err) {
        console.error('❌ Credit purchase callback error:', err);
        setError(err.message || 'Failed to process payment');
        
        toast({
          title: 'Payment Error',
          description: err.message || 'An error occurred while processing your payment',
          variant: 'destructive'
        });

        // Redirect to credit purchase page after 3 seconds
        setTimeout(() => {
          navigate('/venue-credit-purchase', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentCallback();
  }, [searchParams, navigate, toast, isRedirecting, launchUrlChecked, launchUrl]);

  // Always show loading state initially (component just mounted)
  if (loading || isRedirecting || (!error && loading === true)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-burgundy mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isRedirecting ? 'Opening App...' : 'Processing your payment...'}
          </h1>
          <p className="text-gray-600 font-medium">
            {isRedirecting 
              ? 'Redirecting you to the mobile app to complete your payment verification...' 
              : 'This may take a few moments...'}
          </p>
          {isRedirecting && (
            <p className="text-sm text-gray-500 mt-2">
              If the app doesn't open automatically, please open it manually.
            </p>
          )}
          <div className="mt-4 text-xs text-gray-400">
            <p>URL: {window.location.href.substring(0, 60)}...</p>
            <p>Reference: {searchParams.get('reference') || searchParams.get('trxref') || 'Not found'}</p>
          </div>
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

  // Fallback: show loading if we somehow get here
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-burgundy mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Initializing payment verification...</p>
      </div>
    </div>
  );
};

export default CreditPurchaseCallbackPage;

