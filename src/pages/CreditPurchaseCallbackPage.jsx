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
          }
        });

        console.log('✅ Credit purchase completed:', creditRecord);

        // Send confirmation email
        console.log('📧 Sending credit purchase confirmation email...');
        try {
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
                memberTier: 'VIP'
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

        // Clear session data
        clearCreditPurchaseFromSession();

        // Show success message
        toast({
          title: 'Payment Successful!',
          description: `₦${Math.round(totalAmount * 0.9).toLocaleString()} credits added to your account.`,
          className: 'bg-green-500 text-white'
        });

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/profile?tab=wallet', { replace: true });
        }, 2000);

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

