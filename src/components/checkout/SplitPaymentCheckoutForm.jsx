import React, { useState } from 'react';
import { AlertCircle, Loader2, Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

/**
 * Split Payment Checkout Form for Paystack
 * Matches Stripe split payment UI - shows split setup, recipients, and payment details
 */
export const SplitPaymentCheckoutForm = ({
  totalAmount,
  venueId,
  venueName,
  bookingData,
  onPaymentInitiate,
  isLoading = false,
  errors = {},
  userEmail = '',
}) => {
  const { toast } = useToast();
  const [splitCount, setSplitCount] = useState(2); // Number of people to split with
  const [yourAmount, setYourAmount] = useState(Math.floor(totalAmount / 2));
  const [recipients, setRecipients] = useState([
    { email: '', name: '', phone: '', amount: Math.floor(totalAmount / 2) }
  ]);
  const [dataConsent, setDataConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Update split count
  const updateSplitCount = (newCount) => {
    if (newCount < 2) return;
    setSplitCount(newCount);
    
    // Recalculate amounts evenly
    const amountPerPerson = Math.floor(totalAmount / newCount);
    setYourAmount(amountPerPerson);
    
    // Update recipients array
    const newRecipients = Array(newCount - 1).fill(null).map(() => ({
      email: '',
      name: '',
      phone: '',
      amount: amountPerPerson
    }));
    setRecipients(newRecipients);
  };

  const updateRecipient = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const validateForm = () => {
    setError(null);

    if (!yourAmount || yourAmount <= 0) {
      setError('Your amount must be greater than 0');
      return false;
    }

    // Validate all recipients
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      if (!recipient.email || !recipient.email.includes('@')) {
        setError(`Recipient ${i + 1}: Valid email required`);
        return false;
      }

      if (!recipient.name || recipient.name.trim().length < 2) {
        setError(`Recipient ${i + 1}: Name required`);
        return false;
      }

      if (!recipient.phone || recipient.phone.length < 10) {
        setError(`Recipient ${i + 1}: Valid phone required`);
        return false;
      }

      if (!recipient.amount || parseInt(recipient.amount) <= 0) {
        setError(`Recipient ${i + 1}: Amount must be greater than 0`);
        return false;
      }
    }

    // Check total allocation
    const totalAllocated = yourAmount + recipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0);
    if (totalAllocated !== totalAmount) {
      setError(`Total must equal ₦${totalAmount.toLocaleString()}. Currently: ₦${totalAllocated.toLocaleString()}`);
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
      await onPaymentInitiate({
        email: userEmail,
        fullName: userEmail?.split('@')[0] || 'User',
        phone: '',
        amount: yourAmount,
        venueId,
        venueName,
        splitRecipients: recipients,
        bookingData,
        dataConsent
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllocated = yourAmount + recipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0);

  return (
    <Card className="w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-brand-burgundy">Split Payment Setup</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Split Count Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-800">Split between {splitCount} people</p>
                <p className="text-sm text-gray-600">Including you</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => updateSplitCount(Math.max(2, splitCount - 1))}
                  disabled={splitCount <= 2}
                  className="h-10 w-10 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{splitCount}</span>
                <Button
                  type="button"
                  onClick={() => updateSplitCount(splitCount + 1)}
                  className="h-10 w-10 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* You Row */}
            <Card className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-burgundy/20 flex items-center justify-center">
                    <span className="text-brand-burgundy font-semibold">👤</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">You</p>
                    <p className="text-sm text-gray-600">{userEmail || 'your@email.com'}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-brand-burgundy">
                  ₦{yourAmount.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-2">Your portion</p>
            </Card>
          </div>

          {/* Amount Breakdown Box */}
          <div className="bg-brand-gold/10 border-2 border-brand-gold rounded-lg p-4">
            <p className="text-3xl font-bold text-brand-burgundy mb-4">
              ₦{totalAmount.toLocaleString()}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your Payment:</span>
                <span className="font-semibold text-brand-burgundy">₦{yourAmount.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-gray-600">Split with Others:</span>
                <span className="font-semibold text-green-600">
                  ₦{recipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You'll pay through Paystack first. Split payment requests will be sent to others to cover their share.
            </p>
          </div>

          {/* Your Details */}
          <Card className="p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-brand-burgundy mb-4">Your Details</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-brand-burgundy font-semibold">Full Name *</Label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={userEmail?.split('@')[0] || ''}
                  disabled
                  className="mt-2 bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-brand-burgundy font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={userEmail || ''}
                  disabled
                  className="mt-2 bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-brand-burgundy font-semibold">Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="+234 XXX XXX XXXX"
                  disabled
                  className="mt-2 bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          </Card>

          {/* Split with Others */}
          <Card className="p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-brand-burgundy mb-4">Split with Others</h4>
            <div className="space-y-4">
              {recipients.map((recipient, index) => (
                <Card key={index} className="p-4 bg-gray-50 border border-gray-200">
                  <h5 className="font-semibold text-brand-burgundy mb-3">Person {index + 1}</h5>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Email *</Label>
                      <Input
                        type="email"
                        placeholder="recipient@example.com"
                        value={recipient.email}
                        onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                        disabled={isSubmitting || isLoading}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Name *</Label>
                      <Input
                        type="text"
                        placeholder="Recipient Name"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                        disabled={isSubmitting || isLoading}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Their Share (₦) *</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                        disabled={isSubmitting || isLoading}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {/* Remaining Amount */}
              <div className={`p-4 rounded-lg border-2 font-semibold text-center ${
                totalAllocated === totalAmount
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {totalAllocated === totalAmount ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-5 w-5" />
                    All amounts allocated correctly
                  </div>
                ) : (
                  `Remaining: ₦${Math.max(0, totalAmount - totalAllocated).toLocaleString()}`
                )}
              </div>
            </div>
          </Card>

          {/* Data Consent Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="split-consent"
              checked={dataConsent}
              onCheckedChange={setDataConsent}
              disabled={isSubmitting || isLoading}
            />
            <Label htmlFor="split-consent" className="text-sm cursor-pointer">
              I consent to Eddy Members processing my personal information for split payment management
            </Label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !dataConsent || totalAllocated !== totalAmount}
            className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${yourAmount.toLocaleString()}`
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default SplitPaymentCheckoutForm;
