import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

/**
 * Paystack Credit Purchase Form
 * Handles credit purchase forms for Paystack payment processor
 */
export const PaystackCreditPurchaseForm = ({
  amount,
  venueName,
  onSubmit,
  isLoading = false,
  errors = {},
  formData = {},
  setFormData,
}) => {
  const { toast } = useToast();
  const [dataConsent, setDataConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Valid phone number is required';
    }

    if (!dataConsent) {
      newErrors.dataConsent = 'You must consent to data processing';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: 'Form Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        dataConsent
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
        <h3 className="text-lg font-semibold mb-6 text-brand-burgundy">Complete Your Credit Purchase</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Display */}
          <div className="bg-brand-gold/10 border-2 border-brand-gold rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-brand-burgundy">
              ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              for {venueName}
            </p>
          </div>

          {/* Venue Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            You will receive ₦{Math.round(amount * 0.9).toLocaleString('en-NG')} in venue credits after platform commission (10%)
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="credit-fullname" className="text-brand-burgundy font-semibold">
              Full Name *
            </Label>
            <Input
              id="credit-fullname"
              type="text"
              placeholder="John Doe"
              value={formData.fullName || ''}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              disabled={isSubmitting || isLoading}
              className={`mt-2 border-brand-burgundy/30 focus:border-brand-burgundy ${
                errors.fullName ? 'border-red-500' : ''
              }`}
              required
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="credit-email" className="text-brand-burgundy font-semibold">
              Email Address *
            </Label>
            <Input
              id="credit-email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting || isLoading}
              className={`mt-2 border-brand-burgundy/30 focus:border-brand-burgundy ${
                errors.email ? 'border-red-500' : ''
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="credit-phone" className="text-brand-burgundy font-semibold">
              Phone Number *
            </Label>
            <Input
              id="credit-phone"
              type="tel"
              placeholder="+234 XXX XXX XXXX"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isSubmitting || isLoading}
              className={`mt-2 border-brand-burgundy/30 focus:border-brand-burgundy ${
                errors.phone ? 'border-red-500' : ''
              }`}
              required
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Data Consent */}
          <div className="flex items-start space-x-2 bg-brand-gold/5 p-4 rounded-lg">
            <Checkbox
              id="credit-consent"
              checked={dataConsent}
              onCheckedChange={setDataConsent}
              disabled={isSubmitting || isLoading}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="credit-consent"
                className="text-sm text-brand-burgundy font-medium cursor-pointer"
              >
                I consent to Eddy Members processing my personal information for credit purchases and account management
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
              `Pay ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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

export default PaystackCreditPurchaseForm;

