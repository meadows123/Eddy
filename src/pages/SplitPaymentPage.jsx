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
        disabled={processing}
        className="w-full bg-brand-burgundy text-white"
      >
        {processing ? 'Processing...' : `Pay ${amount}`}
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
  
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
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
  }, [bookingId, requestId]);

  const fetchPaymentRequest = async () => {
    try {
      setLoading(true);

      // Validate params
      if (!bookingId || !requestId) {
        throw new Error('Missing required parameters');
      }

      // Fetch the payment request with correct relationships
      const { data: requestData, error: requestError } = await supabase
        .from('split_payment_requests')
        .select(`
          *,
          bookings (
            *,
            venues (
              name,
              address,
              city
            ),
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', requestId)
        .eq('booking_id', bookingId)
        .single();

      console.log('🔍 Payment request data:', requestData);

      if (requestError) {
        console.error('❌ Error fetching payment request:', requestError);
        throw requestError;
      }

      if (!requestData) {
        throw new Error('Payment request not found');
      }

      if (requestData.status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This payment request has already been completed.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (requestData.status === 'expired') {
        toast({
          title: "Payment Expired",
          description: "This payment request has expired.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setPaymentRequest(requestData);
      setBooking(requestData.bookings);
      setVenue(requestData.bookings?.venues);

    } catch (error) {
      console.error('Error fetching payment request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load payment request. Please check the link.",
        variant: "destructive"
      });
      navigate('/');
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
                    <h3 className="font-semibold text-lg">{venue?.name}</h3>
                    <p className="text-sm text-muted-foreground">{venue?.address}, {venue?.city}</p>
                  </div>
                  <Badge variant="outline">Split Payment</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Requested by</Label>
                    <p className="font-medium">
                      {booking?.profiles?.first_name} {booking?.profiles?.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Booking Date</Label>
                    <p className="font-medium">
                      {new Date(booking?.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-6">
                <div className="text-3xl font-bold text-brand-burgundy mb-2">
                  ₦{paymentRequest.amount.toLocaleString()}
                </div>
                <p className="text-muted-foreground">Your portion of the booking</p>
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
                  // Process the payment and create split request
                  // ... your existing payment processing code
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