import React from 'react';
import { CardElement } from '@stripe/react-stripe-js';
import { Label } from '@/components/ui/label';

const StripeCardInput = ({ error }) => {
  return (
    <div className="space-y-2">
      <Label>Card Details</Label>
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
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
};

export default StripeCardInput; 