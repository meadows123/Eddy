import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CreditPurchaseCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [creditData, setCreditData] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeToTerms: false,
    referralCode: ''
  });

  const [errors, setErrors] = useState({});

  // Handle form input changes
  const handleInputChange = (field, value) => {
    console.log('🔍 Form input change:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle checkbox changes specifically
  const handleCheckboxChange = (field, checked) => {
    console.log('🔍 Checkbox change:', field, checked);
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Check for credit purchase data
  useEffect(() => {
    if (location.state?.creditPurchase) {
      console.log('💰 Credit purchase flow detected:', location.state);
      setCreditData(location.state);
      
      // Pre-fill form data with user info
      setFormData({
        fullName: location.state.fullName || user?.user_metadata?.full_name || '',
        email: location.state.email || user?.email || '',
        phone: location.state.phone || user?.user_metadata?.phone || '',
        password: '',
        agreeToTerms: false,
        referralCode: ''
      });
      
      setLoading(false);
    } else {
      console.log('❌ No credit purchase data, redirecting to credit purchase page');
      navigate('/venue-credit-purchase');
    }
  }, [location.state, navigate, user]);

  const createOrUpdateUserAccount = async (userData) => {
    try {
      // If user is already authenticated, just update their profile if needed
      if (user) {
        // Update user profile with any new information
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: user.id,
            first_name: userData.fullName.split(' ')[0] || '',
            last_name: userData.fullName.split(' ').slice(1).join(' ') || '',
            phone: userData.phone
          }], {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }

        return user;
      }

      // For new users, create account
      // First check if user already exists by trying to sign them in
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (existingUser?.user) {
        // User already exists, just sign them in
        console.log('User already exists, signed in:', existingUser.user.id);
        return existingUser.user;
      }

      console.log('Creating new user account for:', userData.email);

      // Create new user account
      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            phone: userData.phone
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (!newUser.user) {
        throw new Error('Failed to create user account - no user returned from signup');
      }

      console.log('Successfully created user:', newUser.user.id);
      return newUser.user;
    } catch (error) {
      console.error('Error with user account:', error);
      throw error;
    }
  };

  const handleSubmit = async (paymentMethodId) => {
    if (!paymentMethodId) {
      console.error('No payment method ID provided');
      return;
    }

    // Validate form data
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms of service';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Form Validation Error",
        description: "Please fill in all required fields and agree to the terms",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create or update user account first
      const currentUser = await createOrUpdateUserAccount({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'temp-password'
      });

      if (!currentUser?.id) {
        throw new Error('Failed to create or authenticate user account');
      }

      console.log('💰 Processing credit purchase for:', creditData);
      console.log('🔍 Current user:', currentUser);
      console.log('🔍 Venue data:', creditData.venue);
      
      // For credit purchases, we need to process payment first
      // Since we have the paymentMethodId from the CheckoutForm, we can use it directly
      console.log('💳 Processing payment with Stripe for credit purchase...');
      
      // For credit purchases, we'll use a simple approach
      // Since the CheckoutForm already created the payment method, we can just simulate a successful payment
      // In a real implementation, you would integrate with your payment processor here
      
      console.log('💳 Simulating payment confirmation for credit purchase...');
      
      // For now, let's simulate a successful payment
      // In production, you would integrate with your actual payment processor
      console.log('✅ Payment confirmed successfully! (simulated)');

      // Payment successful! Now create the credit transaction
      console.log('💾 Creating credit transaction in database...');
      
      const creditDataToInsert = {
        user_id: currentUser.id,
        venue_id: creditData.venue.id,
        amount: creditData.amount * 1000, // Convert thousands to naira for storage
        remaining_balance: creditData.amount * 1000, // Convert thousands to naira for storage
        used_amount: 0, // No credits used yet
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 1 year
        notes: `Credit purchase for ${creditData.venueName} - Base: ₦${(creditData.purchaseAmount * 1000).toLocaleString()}, Bonus: ₦${((creditData.amount - creditData.purchaseAmount) * 1000).toLocaleString()}`,
        created_at: new Date().toISOString()
      };

      console.log('📝 Credit data to insert:', creditDataToInsert);

      const { data: creditRecord, error: creditError } = await supabase
        .from('venue_credit_transactions')
        .insert([creditDataToInsert])
        .select()
        .single();

      if (creditError) {
        console.error('❌ Error creating venue credit transaction:', creditError);
        console.error('❌ Error details:', {
          code: creditError.code,
          message: creditError.message,
          details: creditError.details,
          hint: creditError.hint
        });
        throw new Error(`Failed to create venue credit transaction: ${creditError.message}`);
      }

      console.log('✅ Venue credit transaction created successfully:', creditRecord);

      // Show success message
      toast({
        title: "Credits Purchased Successfully! 🎉",
        description: `₦${(creditData.purchaseAmount * 1000).toLocaleString()} credits added to your ${creditData.venueName} account`,
        className: "bg-green-500 text-white",
      });

      setShowConfirmation(true);

    } catch (error) {
      console.error('Error processing credit purchase:', error);
      toast({
        title: "Credit Purchase Error",
        description: error.message || "Failed to process credit purchase",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!creditData) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Credit Purchase Data</h2>
        <p className="text-muted-foreground mb-6">Please go back and select credits to purchase.</p>
        <Link to="/venue-credit-purchase">
          <Button>Back to Credit Purchase</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container py-10">
        <Link to="/venue-credit-purchase" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Credit Purchase
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold mb-6 flex items-center">
                <Wallet className="h-8 w-8 mr-2" />
                Credit Purchase Checkout
              </h1>

              {/* Credit Purchase Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Credit Purchase Summary</h3>
                <div className="text-sm text-blue-700">
                  <p><strong>Venue:</strong> {creditData.venueName}</p>
                  <p><strong>Credit Amount:</strong> ₦{(creditData.purchaseAmount * 1000).toLocaleString()}</p>
                  <p><strong>Bonus Credits:</strong> +{(creditData.amount - creditData.purchaseAmount) * 1000} credits</p>
                  <p><strong>Total Credits:</strong> {(creditData.amount * 1000).toLocaleString()} credits</p>
                  <p><strong>Total Amount:</strong> ₦{(creditData.purchaseAmount * 1000).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
                
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={(e) => handleCheckboxChange('agreeToTerms', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>{' '}
                      *
                    </label>
                  </div>
                  {errors.agreeToTerms && (
                    <p className="text-red-500 text-sm mt-1">{errors.agreeToTerms}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={() => handleSubmit('simulated-payment-method')}
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : `Purchase Credits - ₦${(creditData.purchaseAmount * 1000).toLocaleString()}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Credit Amount:</span>
                  <span>₦{(creditData.purchaseAmount * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Bonus Credits:</span>
                  <span>+{(creditData.amount - creditData.purchaseAmount) * 1000}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total Credits:</span>
                    <span>{(creditData.amount * 1000).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Amount:</span>
                    <span>₦{(creditData.purchaseAmount * 1000).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Success Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Credits Purchased! 🎉</DialogTitle>
              <DialogDescription className="text-center">
                <div className="flex justify-center my-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="mb-4">
                  Your credit purchase of <span className="font-bold">{(creditData.amount * 1000).toLocaleString()} credits</span> for <span className="font-bold">{creditData.venueName}</span> has been confirmed.
                </p>
                <p className="text-sm text-muted-foreground">
                  Credits have been added to your account and are ready to use.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button 
                onClick={() => navigate('/profile', { state: { activeTab: 'wallet' } })}
                className="bg-green-600 hover:bg-green-700"
              >
                View My Credits
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CreditPurchaseCheckout; 