import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, CreditCard, Gift } from 'lucide-react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button'; // Add this import

const CheckoutForm = ({ formData, errors, handleInputChange, handleSubmit, isSubmitting, totalAmount, isAuthenticated = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [stripeReady, setStripeReady] = React.useState(false);

  // Check if Stripe is ready
  React.useEffect(() => {
    if (stripe && elements) {
      setStripeReady(true);
    } else {
      setStripeReady(false);
    }
  }, [stripe, elements]);

  // Add timeout to show error if Stripe doesn't load within 15 seconds
  const [stripeLoadError, setStripeLoadError] = React.useState(false);
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!stripeReady && (!stripe || !elements)) {
        console.error('Stripe Elements failed to load. Please check your Stripe configuration.');
        setStripeLoadError(true);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [stripeReady, stripe, elements]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple submissions
    if (isProcessingPayment || isSubmitting) {
      console.warn('Payment already processing, ignoring submit');
      return;
    }

    if (!stripe) {
      console.error('Stripe is not initialized');
      alert('Payment form is not ready. Please wait for it to load and try again.');
      return;
    }

    if (!elements) {
      console.error('Stripe Elements is not initialized');
      alert('Payment form is not ready. Please wait for it to load and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      console.error('CardElement is not found');
      alert('Card element is not available. Please refresh the page and try again.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log('Creating payment method...');
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        }
      });

      if (stripeError) {
        console.error('Stripe error:', stripeError);
        
        // Provide helpful error message for live mode / test card mismatch
        let errorMessage = stripeError.message || 'Please check your card details and try again.';
        if (stripeError.message?.includes('live mode') && stripeError.message?.includes('test card')) {
          errorMessage = '⚠️ LIVE/TEST Mode Mismatch: Your backend Edge Function is using a LIVE Stripe secret key, but you are trying to use a TEST card number.\n\nTo fix this:\n1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets\n2. Set STRIPE_TEST_SECRET_KEY to your TEST key (starts with sk_test_)\n3. OR update STRIPE_SECRET_KEY to your TEST key (starts with sk_test_)\n4. Wait 30-60 seconds for Edge Function to redeploy\n5. Try again\n\nCheck Edge Function logs to verify the key mode.';
        }
        
        console.error('Full Stripe error:', stripeError);
        alert(`Payment error: ${errorMessage}`);
        throw stripeError;
      }

      if (!paymentMethod || !paymentMethod.id) {
        console.error('Payment method was not created');
        alert('Failed to create payment method. Please try again.');
        throw new Error('Payment method creation failed');
      }

      console.log('Payment method created:', paymentMethod.id);
      // Only pass the payment method ID
      await handleSubmit(paymentMethod.id);
    } catch (err) {
      console.error('Payment submission error:', err);
      // Re-throw so parent component can handle it
      if (err.message && !err.message.includes('Payment error:')) {
        alert(`Payment failed: ${err.message || 'Please try again.'}`);
      }
      throw err;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <form onSubmit={handlePaymentSubmit} id="payment-form">
      <div className="space-y-6">
        {/* Personal Information section */}
        <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <User className="mr-2 h-5 w-5" />
            {isAuthenticated ? 'Confirm Your Information' : 'Personal Information'}
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} className={errors.fullName ? 'border-destructive' : ''} />
              {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                className={errors.email ? 'border-destructive' : ''} 
                readOnly={isAuthenticated}
                disabled={isAuthenticated}
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
              {isAuthenticated && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed during checkout</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className={errors.phone ? 'border-destructive' : ''} />
              {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
            </div>
            {!isAuthenticated && (
              <div>
                <Label htmlFor="password">Create Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  className={errors.password ? 'border-destructive' : ''} 
                  placeholder="Create a password for your account"
                />
                {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                <p className="text-xs text-muted-foreground mt-1">This will create your Eddy's Members account for future bookings</p>
              </div>
            )}
            {isAuthenticated && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <User className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Signed in to your Eddy's Members account</p>
                    <p className="text-xs text-green-600">Your booking will be saved to your profile</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Referral Code section */}
        <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Gift className="mr-2 h-5 w-5" />
            Referral Code (Optional)
          </h2>
          <div>
            <Label htmlFor="referralCode">Referral Code</Label>
            <Input 
              id="referralCode" 
              name="referralCode" 
              value={formData.referralCode} 
              onChange={handleInputChange} 
              placeholder="Enter code for perks" 
            />
          </div>
        </div>
        
        {/* Payment Information section */}
        <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Information
          </h2>
          <div className="space-y-4">
            <div 
              className="p-4 border rounded-lg bg-white mobile-payment-container"
              style={{
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              {!stripeReady ? (
                <div className="w-full text-center text-gray-500">
                  {stripeLoadError ? (
                    <>
                      <p className="text-sm text-red-600 mb-2">⚠️ Payment form failed to load</p>
                      <p className="text-xs text-gray-500">Please refresh the page or check your connection.</p>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-burgundy mx-auto mb-2"></div>
                      <p className="text-sm">Loading payment form...</p>
                    </>
                  )}
                </div>
              ) : (
                <CardElement 
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#800020',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: '1.5',
                        '::placeholder': {
                          color: '#800020',
                        },
                      },
                      invalid: {
                        color: '#e53e3e',
                      },
                    },
                    hidePostalCode: true,
                    // Mobile-specific options
                    supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
                    // Simple placeholder text
                    placeholder: 'Card number',
                    // Disable autofill for better mobile compatibility
                    disableLink: false,
                    // Ensure proper focus handling on mobile
                    classes: {
                      focus: 'is-focused',
                      invalid: 'is-invalid',
                    }
                  }}
                />
              )}
            </div>
            {errors.stripe && (
              <p className="text-destructive text-sm mt-1">{errors.stripe}</p>
            )}
          </div>
        </div>
        
        {/* Terms and conditions */}
        <div className="flex items-start gap-2">
          <input 
            type="checkbox" 
            id="agreeToTerms" 
            name="agreeToTerms" 
            checked={formData.agreeToTerms} 
            onChange={handleInputChange} 
            className="mt-1" 
          />
          <div>
            <Label htmlFor="agreeToTerms" className="text-sm">
              I agree to the Terms of Service and Privacy Policy
            </Label>
            {errors.agreeToTerms && (
              <p className="text-destructive text-sm">{errors.agreeToTerms}</p>
            )}
          </div>
        </div>

        {/* Add the submit button back */}
        <Button 
          type="submit" 
          disabled={isSubmitting || isProcessingPayment || !stripe || !stripeReady} 
          className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 py-3.5 text-lg rounded-md mt-6"
        >
          {isSubmitting || isProcessingPayment ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-cream mr-2"></div>
              {isProcessingPayment ? 'Processing Payment...' : 'Processing Booking...'}
            </div>
          ) : `Pay ₦${totalAmount.toLocaleString()}`}
        </Button>
      </div>
    </form>
  );
};

export default CheckoutForm;