import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

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
  const [email, setEmail] = useState(recipientEmail || '');
  const [fullName, setFullName] = useState(recipientName || '');
  const [phone, setPhone] = useState(recipientPhone || '');
  const [dataConsent, setDataConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validateForm = () => {
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name');
      return false;
    }

    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }

    if (!dataConsent) {
      setError('Please consent to data processing to proceed');
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
      setError(error.message || 'Failed to process payment');
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

          {/* Data Consent Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="paystack-consent"
              checked={dataConsent}
              onCheckedChange={setDataConsent}
              disabled={isSubmitting || isLoading}
            />
            <Label htmlFor="paystack-consent" className="text-sm cursor-pointer">
              I agree to the{' '}
              <Link to="/privacy-policy" className="text-brand-burgundy hover:underline">
                data privacy policy
              </Link>
            </Label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
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
        </form>
      </div>
    </Card>
  );
};

export default PaystackSplitPaymentForm;

