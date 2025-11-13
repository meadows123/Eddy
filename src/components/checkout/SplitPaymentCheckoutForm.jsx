import React, { useState } from 'react';
import { AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

/**
 * Split Payment Checkout Form for Paystack
 * Allows users to split payment with others
 */
export const SplitPaymentCheckoutForm = ({
  totalAmount,
  venueId,
  venueName,
  bookingData,
  onPaymentInitiate,
  isLoading = false,
  errors = {},
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [splitRecipients, setSplitRecipients] = useState([
    { email: '', name: '', amount: Math.floor(totalAmount / 2) }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyAlert, setCopyAlert] = useState(false);

  const addRecipient = () => {
    setSplitRecipients([
      ...splitRecipients,
      { email: '', name: '', amount: 0 }
    ]);
  };

  const removeRecipient = (index) => {
    if (splitRecipients.length > 1) {
      setSplitRecipients(splitRecipients.filter((_, i) => i !== index));
    } else {
      toast({
        title: 'At least one recipient is required',
        variant: 'destructive'
      });
    }
  };

  const updateRecipient = (index, field, value) => {
    const updated = [...splitRecipients];
    updated[index][field] = value;
    setSplitRecipients(updated);
  };

  const calculateRemainingAmount = () => {
    const allocatedAmount = splitRecipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0);
    return totalAmount - allocatedAmount;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email || !email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    if (!fullName || fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required';
    }

    if (!phone || phone.length < 10) {
      newErrors.phone = 'Valid phone number is required';
    }

    if (!dataConsent) {
      newErrors.dataConsent = 'You must consent to data processing';
    }

    // Validate split recipients
    splitRecipients.forEach((recipient, idx) => {
      if (!recipient.email || !recipient.email.includes('@')) {
        newErrors[`recipient_${idx}_email`] = 'Valid email required';
      }
      if (!recipient.name || recipient.name.trim().length < 2) {
        newErrors[`recipient_${idx}_name`] = 'Name required';
      }
      if (!recipient.amount || parseInt(recipient.amount) <= 0) {
        newErrors[`recipient_${idx}_amount`] = 'Amount must be greater than 0';
      }
    });

    // Check if total amount is allocated
    if (calculateRemainingAmount() !== 0) {
      newErrors.totalAmount = `Total must equal ₦${totalAmount.toLocaleString()}`;
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: 'Form Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onPaymentInitiate({
        email,
        fullName,
        phone,
        amount: totalAmount,
        venueId,
        venueName,
        splitRecipients,
        bookingData,
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopyAlert(true);
    setTimeout(() => setCopyAlert(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Amount Display */}
      <Card className="bg-brand-gold/10 border-2 border-brand-gold">
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-2">Total Booking Amount</p>
          <p className="text-4xl font-bold text-brand-burgundy mb-4">
            ₦{totalAmount.toLocaleString('en-NG')}
          </p>
          
          {/* Split Breakdown */}
          <div className="bg-white rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Your Payment:</span>
              <span className="font-semibold text-brand-burgundy">
                ₦{splitRecipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0).toLocaleString('en-NG')}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center text-sm">
              <span className="text-gray-600">Split with Others:</span>
              <span className="font-semibold text-green-600">
                ₦{splitRecipients.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0).toLocaleString('en-NG')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Message */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          You'll pay through Paystack first. Split payment requests will be sent to others to cover their share.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Your Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-brand-burgundy">Your Details</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="split-fullname" className="text-brand-burgundy font-semibold">
                Full Name *
              </Label>
              <Input
                id="split-fullname"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
                required
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <Label htmlFor="split-email" className="text-brand-burgundy font-semibold">
                Email Address *
              </Label>
              <Input
                id="split-email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="split-phone" className="text-brand-burgundy font-semibold">
                Phone Number *
              </Label>
              <Input
                id="split-phone"
                type="tel"
                placeholder="+234 XXX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
                required
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>
        </Card>

        {/* Split Recipients */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-brand-burgundy">Split with Others</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRecipient}
              className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
            >
              + Add Person
            </Button>
          </div>

          <div className="space-y-4">
            {splitRecipients.map((recipient, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-brand-burgundy">Person {index + 1}</h4>
                  {splitRecipients.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Email *</Label>
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={recipient.email}
                      onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      disabled={isSubmitting || isLoading}
                      className="mt-1 text-sm"
                    />
                    {errors[`recipient_${index}_email`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`recipient_${index}_email`]}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Name *</Label>
                    <Input
                      type="text"
                      placeholder="Recipient Name"
                      value={recipient.name}
                      onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                      disabled={isSubmitting || isLoading}
                      className="mt-1 text-sm"
                    />
                    {errors[`recipient_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`recipient_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Their Share (₦) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={recipient.amount}
                      onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                      disabled={isSubmitting || isLoading}
                      className="mt-1 text-sm"
                    />
                    {errors[`recipient_${index}_amount`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`recipient_${index}_amount`]}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Total Validation */}
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            calculateRemainingAmount() === 0 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {calculateRemainingAmount() === 0 ? (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Total allocated correctly
              </div>
            ) : (
              <div>
                Remaining: ₦{calculateRemainingAmount().toLocaleString('en-NG')}
              </div>
            )}
          </div>
          {errors.totalAmount && (
            <p className="text-red-500 text-sm mt-2">{errors.totalAmount}</p>
          )}
        </Card>

        {/* Data Consent */}
        <div className="flex items-start space-x-2 bg-brand-gold/5 p-4 rounded-lg">
          <Checkbox
            id="split-consent"
            checked={dataConsent}
            onCheckedChange={setDataConsent}
            disabled={isSubmitting || isLoading}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="split-consent"
              className="text-sm text-brand-burgundy font-medium cursor-pointer"
            >
              I consent to Eddy Members processing my personal information for split payment management
            </Label>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || isLoading || !dataConsent || calculateRemainingAmount() !== 0}
          className="w-full bg-brand-burgundy hover:bg-brand-burgundy/90 text-white font-semibold py-3 rounded-lg"
        >
          {isSubmitting || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₦${totalAmount.toLocaleString('en-NG')} to Start Split Payment`
          )}
        </Button>

        {/* Info Message */}
        <div className="flex gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <p>Your payment will be processed through Paystack. Others will receive split payment requests via email.</p>
        </div>
      </form>
    </div>
  );
};

export default SplitPaymentCheckoutForm;

