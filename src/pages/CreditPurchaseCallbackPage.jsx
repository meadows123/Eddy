import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { verifyCreditPurchasePayment, getCreditPurchaseFromSession, clearCreditPurchaseFromSession, completeCreditPurchase } from '@/lib/paystackCreditPurchaseHandler';
import { Loader2 } from 'lucide-react';

/**
 * Handles Paystack callback for credit purchases
 * Verifies payment, creates credits, sends email
 */
const CreditPurchaseCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        setLoading(true);

        // Extract transaction reference
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        if (!reference) {
          throw new Error('No payment reference found');
        }

        console.log('📝 Processing credit purchase callback with reference:', reference);

        // Verify payment with Paystack
        const verifyData = await verifyCreditPurchasePayment(reference);
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
            amountAfterCommission: Math.round(totalAmount * 0.9), // 10% commission already taken
            platformCommission: Math.round(totalAmount * 0.1)
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
              amount: Math.round(totalAmount * 0.9)
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
                amount: Math.round(totalAmount * 0.9),
                totalPaid: Math.round(totalAmount),
                platformCommission: Math.round(totalAmount * 0.1),
                venueName,
                dashboardUrl: `${window.location.origin}/profile?tab=wallet`,
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
  }, [searchParams, navigate, toast]);

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

export default CreditPurchaseCallbackPage;

