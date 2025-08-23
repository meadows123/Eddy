import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, CreditCard, Gift } from 'lucide-react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button'; // Add this import

const CheckoutForm = ({ formData, errors, handleInputChange, handleSubmit, isSubmitting, totalAmount, isAuthenticated = false }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!stripe || !elements) {
      console.error('Stripe not initialized');
      return;
    }

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        }
      });

      if (stripeError) {
        console.error('Stripe error:', stripeError);
        throw stripeError;
      }

      // Only pass the payment method ID
      await handleSubmit(paymentMethod.id);
    } catch (err) {
      console.error('Payment error:', err);
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
                <p className="text-xs text-muted-foreground mt-1">This will create your VIPClub account for future bookings</p>
              </div>
            )}
            {isAuthenticated && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <User className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Signed in to your VIPClub account</p>
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
            <div className="p-4 border rounded-lg bg-white">
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
                  hidePostalCode: true
                }}
              />
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
          disabled={isSubmitting || !stripe} 
          className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 py-3.5 text-lg rounded-md mt-6"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-cream mr-2"></div>
              Processing...
            </div>
          ) : `Pay ₦${totalAmount.toLocaleString()}`}
        </Button>
      </div>
    </form>
  );
};

export default CheckoutForm;