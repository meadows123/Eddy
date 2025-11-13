import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';

const PaystackCheckoutForm = ({
  formData,
  handleInputChange,
  isSubmitting,
  totalAmount,
  isAuthenticated,
  onPaymentInitiate,
  errors = {}
}) => {
  const [email, setEmail] = useState(formData?.email || '');
  const [fullName, setFullName] = useState(formData?.fullName || '');
  const [phone, setPhone] = useState(formData?.phone || '');
  const [dataConsent, setDataConsent] = useState(formData?.dataConsent || false);
  const [localErrors, setLocalErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Update form data when props change
  useEffect(() => {
    if (formData) {
      setEmail(formData.email || '');
      setFullName(formData.fullName || '');
      setPhone(formData.phone || '');
      setDataConsent(formData.dataConsent || false);
    }
  }, [formData]);

  const validateForm = () => {
    const newErrors = {};

    if (!email || email.trim() === '') {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!fullName || fullName.trim() === '') {
      newErrors.fullName = 'Full name is required';
    }

    if (!phone || phone.trim() === '') {
      newErrors.phone = 'Phone number is required';
    }

    if (!dataConsent) {
      newErrors.dataConsent = 'Please agree to data collection';
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaystackPayment = async (e) => {
    e.preventDefault();

    console.log('📱 Paystack payment form submitted');

    // Validate form
    if (!validateForm()) {
      console.log('❌ Form validation failed:', localErrors);
      return;
    }

    setIsProcessing(true);

    try {
      const paymentData = {
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        amount: parseFloat(totalAmount),
        dataConsent
      };

      console.log('🇳🇬 Initiating Paystack payment:', paymentData);

      // Call the parent's callback to initiate payment
      if (onPaymentInitiate) {
        await onPaymentInitiate(paymentData);
      }
    } catch (error) {
      console.error('❌ Paystack payment error:', error);
      setLocalErrors({ submit: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Method Info */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Paystack Payment Gateway</p>
            <p className="text-sm text-green-700">Secure payment processing for Nigeria</p>
          </div>
        </div>
      </Card>

      {/* Form Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Billing Information</h3>

        <form onSubmit={handlePaystackPayment} className="space-y-4">
          {/* Email */}
          <div>
            <Label htmlFor="paystack-email" className="font-medium">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paystack-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLocalErrors({ ...localErrors, email: '' });
              }}
              placeholder="your@email.com"
              className={`mt-1 ${localErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={isProcessing}
            />
            {localErrors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {localErrors.email}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="paystack-fullname" className="font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paystack-fullname"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setLocalErrors({ ...localErrors, fullName: '' });
              }}
              placeholder="John Doe"
              className={`mt-1 ${localErrors.fullName ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={isProcessing}
            />
            {localErrors.fullName && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {localErrors.fullName}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="paystack-phone" className="font-medium">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paystack-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setLocalErrors({ ...localErrors, phone: '' });
              }}
              placeholder="+234 (0) 912-345-6789"
              className={`mt-1 ${localErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={isProcessing}
            />
            {localErrors.phone && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {localErrors.phone}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t my-4"></div>

          {/* Amount Display */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-300 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Amount to Pay</p>
            <p className="text-3xl font-bold text-green-700">₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-2">All prices include fees</p>
          </div>

          {/* Data Consent Checkbox */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="paystack-consent"
                checked={dataConsent}
                onCheckedChange={(checked) => {
                  setDataConsent(checked);
                  setLocalErrors({ ...localErrors, dataConsent: '' });
                }}
                disabled={isProcessing}
                className={localErrors.dataConsent ? 'border-red-500' : ''}
              />
              <Label htmlFor="paystack-consent" className="font-normal text-sm cursor-pointer">
                I agree to Eddy Members collecting and processing my personal information for bookings, payments, and account management.{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </Label>
            </div>
            {localErrors.dataConsent && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {localErrors.dataConsent}
              </p>
            )}
          </div>

          {/* Submit Error */}
          {localErrors.submit && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>{localErrors.submit}</div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold text-lg rounded-lg transition-colors"
            disabled={isProcessing || isSubmitting}
          >
            {isProcessing || isSubmitting ? (
              <>
                <Loader className="mr-2 h-5 w-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                Pay ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </>
            )}
          </Button>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-3">
            <CheckCircle className="h-4 w-4" />
            <span>Secure payment powered by Paystack</span>
          </div>
        </form>
      </Card>

      {/* Additional Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-600">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Payment Information</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Your payment is processed securely by Paystack</li>
              <li>You will be redirected to complete your payment</li>
              <li>Your booking is confirmed once payment is verified</li>
              <li>A confirmation email will be sent to your email address</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaystackCheckoutForm;

