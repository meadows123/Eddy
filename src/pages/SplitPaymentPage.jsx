import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, User, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { stripePromise } from '@/lib/stripe';
import { useAuth } from '@/contexts/AuthContext';

// Payment form component
const PaymentForm = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (stripeError) {
        throw stripeError;
      }

      // Call your payment processing function here
      await onSuccess(paymentMethod.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#800020',
                '::placeholder': {
                  color: '#800020',
                },
              },
            },
          }}
        />
      </div>
      <Button 
        type="submit" 
        disabled={processing || !stripe}
        className="w-full bg-brand-burgundy text-white"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ₦${amount.toLocaleString()}`
        )}
      </Button>
      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
};

// Main component
const SplitPaymentPage = () => {
  const { bookingId, requestId } = useParams();
  console.log('🔍 Split Payment Params:', { bookingId, requestId });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      console.log('❌ User not authenticated, redirecting to profile');
      toast({
        title: "Authentication Required",
        description: "Please log in to complete this payment.",
        variant: "destructive"
      });
      navigate('/profile');
      return;
    }

    // If no parameters are provided, redirect to profile page
    if (!bookingId || !requestId) {
      console.log('❌ Missing required parameters, redirecting to profile');
      toast({
        title: "Invalid Access",
        description: "Split payments can only be accessed via a payment request link.",
        variant: "destructive"
      });
      navigate('/profile');
      return;
    }
    fetchPaymentRequest();
  }, [bookingId, requestId, user]);

  const fetchPaymentRequest = async () => {
    try {
      setLoading(true);

      // Validate params
      if (!bookingId || !requestId) {
        throw new Error('Missing required parameters');
      }

      console.log('🔍 Fetching payment request:', { requestId, bookingId });

      // First, fetch the payment request
      const { data: requestData, error: requestError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId)
        .eq('booking_id', bookingId)
        .single();

      if (requestError) {
        console.error('❌ Error fetching payment request:', requestError);
        throw requestError;
      }

      if (!requestData) {
        throw new Error('Payment request not found');
      }

      console.log('✅ Payment request found:', requestData);

      // Check if the current user is the intended recipient
      if (requestData.recipient_id && requestData.recipient_id !== user.id) {
        console.log('❌ User not authorized for this payment request');
        toast({
          title: "Access Denied",
          description: "This payment request is not intended for you.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      // Check if payment request is already paid or expired
      if (requestData.status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This payment request has already been completed.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      if (requestData.status === 'expired') {
        toast({
          title: "Payment Expired",
          description: "This payment request has expired.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      // Now fetch the booking data separately
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', requestData.booking_id)
        .single();

      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
        // Don't throw here, just log the error
      }

      // Fetch venue data separately
      let venueData = null;
      if (bookingData?.venue_id) {
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select('name, address, city, type')
          .eq('id', bookingData.venue_id)
          .single();

        if (!venueError && venue) {
          venueData = venue;
        }
      }

      // Set the state
      setPaymentRequest(requestData);
      setBooking(bookingData || {});
      setVenue(venueData || {});

      console.log('✅ All data loaded successfully:', {
        paymentRequest: requestData,
        booking: bookingData,
        venue: venueData
      });

    } catch (error) {
      console.error('❌ Error fetching payment request:', error);
      toast({
        title: "Error",
        description: "Failed to load payment request. Please check the link.",
        variant: "destructive"
      });
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Update split payment request status
      const { error: updateError } = await supabase
        .from('split_payment_requests')
        .update({ 
          status: 'paid',
          stripe_payment_id: paymentIntent.id,
          paid_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);

      if (updateError) throw updateError;

      // Navigate to success page
      navigate(`/split-payment-success?payment_intent=${paymentIntent.id}&request_id=${paymentRequest.id}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Payment successful but failed to update status. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!paymentRequest) {
    return (
      <div className="container py-20 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-4">Payment Request Not Found</h2>
        <p className="text-muted-foreground mb-6">The payment link may be invalid or expired.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Split Payment Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {venue?.name || 'Venue Information Unavailable'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {venue?.address && venue?.city ? `${venue.address}, ${venue.city}` : 'Location details not available'}
                    </p>
                  </div>
                  <Badge variant="outline">Split Payment</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Requested by</Label>
                    <p className="font-medium">
                      {paymentRequest.requester_id ? `User ${paymentRequest.requester_id.slice(0, 8)}...` : 'Unknown User'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Booking Date</Label>
                    <p className="font-medium">
                      {booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-6">
                <div className="text-3xl font-bold text-brand-burgundy mb-2">
                  ₦{(paymentRequest.amount || 0).toLocaleString()}
                </div>
                <p className="text-muted-foreground">Your portion of the split payment</p>
                {!paymentRequest.amount && (
                  <p className="text-sm text-red-500 mt-2">Warning: Invalid payment amount</p>
                )}
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Requested by: {paymentRequest.requester_id ? `User ${paymentRequest.requester_id.slice(0, 8)}...` : 'Unknown User'}</p>
                  <p>Booking ID: {paymentRequest.booking_id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <PaymentForm 
                amount={paymentRequest.amount} 
                onSuccess={async (paymentMethodId) => {
                  try {
                    setProcessing(true);
                    
                    // Create payment intent using the Edge Function
                    const response = await fetch(
                      'https://agydpkzfucicraedllgl.supabase.co/functions/v1/create-split-payment-intent',
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                          amount: paymentRequest.amount,
                          paymentMethodId,
                          bookingId: paymentRequest.booking_id,
                          splitRequests: [paymentRequest],
                          email: paymentRequest.recipient_email || user?.email || '',
                          bookingType: 'split',
                          isInitiatorPayment: false
                        })
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to create payment intent');
                    }

                    const { clientSecret, paymentIntentId } = await response.json();

                    // Load Stripe and confirm payment
                    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY);
                    if (!stripe) {
                      throw new Error('Failed to load Stripe');
                    }

                    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
                    if (confirmError) {
                      throw new Error(`Payment failed: ${confirmError.message}`);
                    }

                    // Payment successful - update the payment request status
                    const { error: updateError } = await supabase
                      .from('split_payment_requests')
                      .update({ 
                        status: 'paid',
                        paid_at: new Date().toISOString(),
                        stripe_payment_id: paymentIntentId || 'manual_payment'
                      })
                      .eq('id', paymentRequest.id);

                    if (updateError) {
                      console.error('Error updating payment status:', updateError);
                    }

                    // Check if all split payments for this booking are now paid
                    const { data: allRequests, error: checkError } = await supabase
                      .from('split_payment_requests')
                      .select('status')
                      .eq('booking_id', paymentRequest.booking_id);

                    if (!checkError && allRequests) {
                      // Check if all requests are paid
                      const allRequestsPaid = allRequests.every(req => req.status === 'paid');
                      
                      if (allRequestsPaid) {
                        // Update booking status to confirmed when all split payments are complete
                        await supabase
                          .from('bookings')
                          .update({ status: 'confirmed' })
                          .eq('id', paymentRequest.booking_id);
                      }
                    }

                    // Show success message and redirect
                    toast({
                      title: "Payment Successful!",
                      description: `Your portion (₦${paymentRequest.amount.toLocaleString()}) has been paid successfully. The booking will be confirmed once all split payments are complete.`,
                      className: "bg-green-500 text-white"
                    });

                    // Navigate to success page
                    navigate(`/split-payment-success?payment_intent=success&request_id=${paymentRequest.id}`);

                  } catch (error) {
                    console.error('Payment error:', error);
                    toast({
                      title: "Payment Failed",
                      description: error.message || "Failed to process payment. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setProcessing(false);
                  }
                }} 
              />
            </Elements>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SplitPaymentPage; 