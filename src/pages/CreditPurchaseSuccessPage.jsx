import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CreditPurchaseSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [creditData, setCreditData] = useState(null);

  useEffect(() => {
    // Get credit info from URL params
    const amount = searchParams.get('amount');
    const venue = searchParams.get('venue');
    const credits = searchParams.get('credits');

    if (amount && venue && credits) {
      setCreditData({
        amount: parseFloat(amount),
        venue,
        credits: parseFloat(credits)
      });
    } else {
      // Redirect if no data
      navigate('/profile?tab=wallet', { replace: true });
    }
  }, [searchParams, navigate]);

  if (!creditData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-cream to-brand-gold/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 border-green-200 bg-white shadow-2xl">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block mb-4"
            >
              <div className="bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto">
                <Check className="w-12 h-12 text-green-600" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold mb-2">Payment Successful! 🎉</h1>
            <p className="text-green-50">Your venue credits have been added to your account</p>
          </div>

          <CardContent className="p-8">
            {/* Credit Details */}
            <div className="space-y-6">
              {/* Amount Paid */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6"
              >
                <p className="text-blue-600 text-sm font-semibold uppercase mb-2">Amount Paid</p>
                <p className="text-3xl font-bold text-blue-900">
                  ₦{creditData.amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
                </p>
              </motion.div>

              {/* Credits Received */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-green-50 border-2 border-green-200 rounded-lg p-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <p className="text-green-600 text-sm font-semibold uppercase">Credits Received</p>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  ₦{creditData.credits.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  After 10% platform commission
                </p>
              </motion.div>

              {/* Venue */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6"
              >
                <p className="text-purple-600 text-sm font-semibold uppercase mb-2">Venue</p>
                <p className="text-2xl font-bold text-purple-900">{creditData.venue}</p>
              </motion.div>

              {/* Info Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-brand-cream/50 border-2 border-brand-gold rounded-lg p-6"
              >
                <p className="text-gray-700 text-center">
                  ✅ A confirmation email has been sent to your inbox<br/>
                  ✅ Your credits are now available in your wallet<br/>
                  ✅ You can use these credits for your next booking
                </p>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-2 gap-4 mt-8"
            >
              <Button
                onClick={() => navigate('/profile?tab=wallet', { replace: true })}
                className="bg-brand-burgundy hover:bg-brand-burgundy/90 text-white font-semibold"
              >
                View Wallet
              </Button>
              <Button
                onClick={() => navigate('/venue-credit-purchase')}
                variant="outline"
                className="border-brand-burgundy text-brand-burgundy hover:bg-brand-cream"
              >
                Buy More Credits
              </Button>
            </motion.div>

            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 text-center"
            >
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CreditPurchaseSuccessPage;

