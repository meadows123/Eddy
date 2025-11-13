import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

/**
 * Paystack Split Payment Form
 * Handles split payment forms for Paystack payment processor
 */
export const PaystackSplitPaymentForm = ({
  amount,
  recipientEmail,
  recipientName,
  recipientPhone,
  onSubmit,
  isLoading = false,
  requestId,
  bookingId,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(recipientEmail || '');
  const [fullName, setFullName] = useState(recipientName || '');
  const [phone, setPhone] = useState(recipientPhone || '');
  const [dataConsent, setDataConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return false;
    }

    if (!fullName || fullName.trim().length < 2) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your full name',
        variant: 'destructive'
      });
      return false;
    }

    if (!phone || phone.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid phone number',
        variant: 'destructive'
      });
      return false;
    }

    if (!dataConsent) {
      toast({
        title: 'Data Consent Required',
        description: 'Please consent to data processing to proceed',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        email,
        fullName,
        phone,
        amount,
        requestId,
        bookingId
      });
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payment',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-brand-burgundy">Complete Your Split Payment</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount Display */}
          <div className="bg-brand-gold/10 border-2 border-brand-gold rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-brand-burgundy">
              ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="paystack-email" className="text-brand-burgundy font-semibold">
              Email Address
            </Label>
            <Input
              id="paystack-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="paystack-name" className="text-brand-burgundy font-semibold">
              Full Name
            </Label>
            <Input
              id="paystack-name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="paystack-phone" className="text-brand-burgundy font-semibold">
              Phone Number
            </Label>
            <Input
              id="paystack-phone"
              type="tel"
              placeholder="+234 XXX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Data Consent */}
          <div className="flex items-start space-x-2 bg-brand-gold/5 p-4 rounded-lg">
            <Checkbox
              id="paystack-consent"
              checked={dataConsent}
              onCheckedChange={setDataConsent}
              disabled={isSubmitting || isLoading}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="paystack-consent"
                className="text-sm text-brand-burgundy font-medium cursor-pointer"
              >
                I consent to Eddy Members processing my personal information for booking and payment purposes
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !dataConsent}
            className="w-full bg-brand-burgundy hover:bg-brand-burgundy/90 text-white font-semibold py-3 rounded-lg"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </Button>

          {/* Info Message */}
          <div className="flex gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <p>Your payment will be processed securely through Paystack</p>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default PaystackSplitPaymentForm;

