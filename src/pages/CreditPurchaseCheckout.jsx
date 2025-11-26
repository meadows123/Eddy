import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, Check, CreditCard, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Elements, CardElement } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { getUserLocationWithFallback, storeLocationInSession } from '@/lib/locationService';
import { initiateCreditPurchasePayment } from '@/lib/paystackCreditPurchaseHandler';
import PaystackCreditPurchaseForm from '@/components/checkout/PaystackCreditPurchaseForm';

const CreditPurchaseCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [creditData, setCreditData] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [paymentProcessor, setPaymentProcessor] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Authentication states
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeToTerms: false,
    referralCode: ''
  });

  const [errors, setErrors] = useState({});

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      const stripeInstance = await stripePromise;
      setStripe(stripeInstance);
    };
    initStripe();
  }, []);

  // Location detection for payment processor
  useEffect(() => {
    const detectLocation = async () => {
      try {
        setLocationLoading(true);
        console.log('Getting user location for credit purchase...');
        
        const locationData = await getUserLocationWithFallback();
        console.log('User location detected:', locationData);
        
        setUserLocation(locationData);
        storeLocationInSession(locationData);
        
        // Determine processor: Nigeria = Paystack, Others = Stripe
        if (locationData.country?.toLowerCase() === 'ng' || locationData.currency === 'NGN') {
          console.log('🇳🇬 Nigeria detected - using Paystack');
          setPaymentProcessor('paystack');
        } else {
          console.log('🌍 Non-Nigeria location - using Stripe');
          setPaymentProcessor('stripe');
        }
      } catch (error) {
        console.error('Location detection failed:', error);
        console.log('Defaulting to Stripe');
        setPaymentProcessor('stripe'); // Default to Stripe
      } finally {
        setLocationLoading(false);
      }
    };

    detectLocation();
  }, []);

  // Check for credit purchase data and fetch user profile
  useEffect(() => {
    if (location.state?.creditPurchase) {
      // Normalize the credit data structure
      const normalizedData = {
        ...location.state,
        venue: location.state.venue || {
          id: location.state.venueId,
          name: location.state.venueName
        },
        venueName: location.state.venueName || location.state.venue?.name,
        venueId: location.state.venueId || location.state.venue?.id
      };
      
      setCreditData(normalizedData);
      
      // Fetch user profile to get full name
      const fetchUserProfile = async () => {
        try {
          if (user?.id) {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('first_name, last_name, phone')
              .eq('id', user.id)
              .single();
            
            if (!error && profileData) {
              const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
              setFormData({
                fullName: location.state.fullName || fullName || '',
                email: location.state.email || user?.email || '',
                phone: location.state.phone || profileData.phone || user?.user_metadata?.phone || '',
                password: '',
                agreeToTerms: false,
                referralCode: ''
              });
            } else {
              // Fallback if profile fetch fails
              setFormData({
                fullName: location.state.fullName || user?.user_metadata?.full_name || '',
                email: location.state.email || user?.email || '',
                phone: location.state.phone || user?.user_metadata?.phone || '',
                password: '',
                agreeToTerms: false,
                referralCode: ''
              });
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // Fallback if error
          setFormData({
            fullName: location.state.fullName || user?.user_metadata?.full_name || '',
            email: location.state.email || user?.email || '',
            phone: location.state.phone || user?.user_metadata?.phone || '',
            password: '',
            agreeToTerms: false,
            referralCode: ''
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserProfile();
    } else {
      navigate('/venue-credit-purchase');
    }
  }, [location.state, navigate, user]);

  // Handle authentication
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        });

        if (error) throw error;

        if (data.user) {
          setLoginOpen(false);
          toast({
            title: "Login successful!",
            description: "Welcome back!",
          });
        }
      } else {
        // Signup
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.fullName,
              phone: authForm.phone
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
          setAwaitingConfirm(true);
          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Check if email was confirmed
  const checkEmailConfirmed = async () => {
    setAuthLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      if (user?.email_confirmed_at) {
        setAwaitingConfirm(false);
        setLoginOpen(false);
        toast({
          title: "Email confirmed!",
          description: "Your account is now active.",
        });
      } else {
        setAuthError('Email not yet confirmed. Please check your inbox and click the confirmation link.');
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Resend confirmation email
  const resendConfirmation = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authForm.email
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "Please check your inbox for the confirmation link.",
      });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
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
        return existingUser.user;
      }

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

      // For credit purchases, we need to process payment first
      // Since we have the paymentMethodId from the CheckoutForm, we can use it directly
      
      // For credit purchases, we'll use a simple approach
      // Since the CheckoutForm already created the payment method, we can just simulate a successful payment
      // In a real implementation, you would integrate with your payment processor here
      
      // For now, let's simulate a successful payment
      // In production, you would integrate with your actual payment processor

      // Payment successful! Now create the credit transaction
      
      // Use the venue_credits table which has the proper structure
      // Note: remaining_balance is a generated column, will be calculated automatically
      
      const creditDataToInsert = {
        user_id: currentUser.id,
        venue_id: creditData.venue.id,
        amount: creditData.amount * 1000, // Convert from thousands to actual naira (e.g., 100 -> 100000)
        used_amount: 0, // No credits used yet
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { data: creditRecord, error: creditError } = await supabase
        .from('venue_credits')
        .insert([creditDataToInsert])
        .select()
        .single();

      if (creditError) {
        console.error('❌ Error creating venue credit:', creditError);
        console.error('❌ Error details:', {
          code: creditError.code,
          message: creditError.message,
          details: creditError.details,
          hint: creditError.hint
        });
        throw new Error(`Failed to create venue credit: ${creditError.message}`);
      }

      // Generate QR code for credit record using proper format
      console.log('📱 Generating QR code for credit purchase...');
      let qrCodeUrl = null;
      try {
        const { generateCreditPurchaseQR } = await import('@/lib/qrCodeService');
        const qrCodeData = await generateCreditPurchaseQR({
          userId: currentUser.id,
          venueId: creditData.venue.id,
          creditId: creditRecord.id,
          amount: creditData.amount * 1000
        });
        qrCodeUrl = qrCodeData?.externalUrl || qrCodeData?.base64 || null;
        console.log('📱 QR code generated successfully for credit purchase');
      } catch (qrError) {
        console.error('❌ Failed to generate QR code:', qrError);
        // Fallback to simple QR code if generation fails
        qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${creditRecord.id}`;
      }

      // Send confirmation email to customer
      try {
        const recipientEmail = formData.email || user?.email;
        if (!recipientEmail) {
          throw new Error('Email address is required to send confirmation');
        }
        
        console.log('📧 Sending credit purchase confirmation email to:', recipientEmail);
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipientEmail,
            subject: `Credit Purchase Confirmed - ${creditData.venue.name}`,
            template: 'credit-purchase-confirmation',
            data: {
              customerName: formData.fullName,
              amount: creditData.amount * 1000,
              venueName: creditData.venue.name,
              dashboardUrl: `https://oneeddy.com/profile?tab=wallet`,
              qrCodeImage: qrCodeUrl,
              memberTier: 'VIP'
            }
          }
        });

        if (emailError) {
          console.error('❌ Error sending credit purchase confirmation email:', emailError);
        } else {
          console.log('✅ Credit purchase confirmation email sent successfully');
        }
      } catch (emailError) {
        console.error('❌ Error sending customer email:', emailError);
        // Don't fail the process if email fails
      }

      // Send venue owner notification
      try {
        console.log('📧 Looking up venue owner for notification...');
        console.log('📧 DEBUG: Venue ID for lookup:', creditData.venue.id);
        
        // Try to find venue owner by venue_id (primary method)
        let venueOwnerData = null;
        const { data: ownerDataList, error: ownerError } = await supabase
          .from('venue_owners')
          .select('owner_email, owner_name, email, venue_id, user_id')
          .eq('venue_id', creditData.venue.id)
          .limit(1);

        if (!ownerError && ownerDataList && ownerDataList.length > 0) {
          venueOwnerData = ownerDataList[0];
          console.log('✅ Venue owner data fetched by venue_id:', {
            owner_email: venueOwnerData.owner_email,
            email: venueOwnerData.email,
            owner_name: venueOwnerData.owner_name
          });
        } else {
          console.log('⚠️ Could not fetch venue owner data by venue_id:', ownerError);
          
          // Fallback: Try to find by owner_id if venue has it
          if (creditData.venue?.owner_id) {
            const { data: fallbackOwnerList, error: fallbackError } = await supabase
              .from('venue_owners')
              .select('owner_email, owner_name, email')
              .eq('user_id', creditData.venue.owner_id)
              .limit(1);
            
            if (!fallbackError && fallbackOwnerList && fallbackOwnerList.length > 0) {
              venueOwnerData = fallbackOwnerList[0];
              console.log('✅ Venue owner data fetched by owner_id (fallback):', {
                owner_email: venueOwnerData.owner_email,
                email: venueOwnerData.email
              });
            } else {
              console.log('⚠️ Could not fetch venue owner data by owner_id:', fallbackError);
            }
          }
        }

        if (venueOwnerData) {
          const ownerEmail = venueOwnerData.owner_email || venueOwnerData.email;
          
          if (ownerEmail && ownerEmail !== 'info@oneeddy.com' && ownerEmail.includes('@')) {
            console.log('📧 Sending venue owner notification to:', ownerEmail);
            
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
            const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            const venueOwnerEmailData = {
              ownerEmail: ownerEmail && ownerEmail !== 'info@oneeddy.com' ? ownerEmail : '',  // Pass empty if placeholder so Edge Function can look it up
              venueId: creditData.venue.id,  // Add venueId for Edge Function lookup
              venueName: creditData.venue.name,
              customerName: formData.fullName,
              customerEmail: recipientEmail,
              amount: creditData.amount * 1000,
              creditAmount: creditData.amount * 1000,
              purchaseDate: new Date().toLocaleDateString(),
              transactionType: 'Credit Purchase',
              qrCodeImage: qrCodeUrl
            };
            
            console.log('📧 Venue owner email data being sent:', {
              to: ownerEmail,
              ownerEmail: venueOwnerEmailData.ownerEmail,
              venueId: venueOwnerEmailData.venueId,
              template: 'venue-owner-booking-notification'
            });
            
            const venueOwnerResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: ownerEmail,
                subject: `New Credit Purchase - ${creditData.venue.name}`,
                template: 'venue-owner-booking-notification',  // Use the same template as Paystack
                data: venueOwnerEmailData
              })
            });

            const venueOwnerResponseData = await venueOwnerResponse.json().catch(() => ({}));
            
            if (venueOwnerResponse.ok) {
              console.log('✅ Venue owner notification sent successfully:', {
                status: venueOwnerResponse.status,
                response: venueOwnerResponseData
              });
            } else {
              console.error('⚠️ Venue owner email failed:', {
                status: venueOwnerResponse.status,
                statusText: venueOwnerResponse.statusText,
                error: venueOwnerResponseData
              });
            }
          } else {
            console.log('⚠️ Skipping venue owner email - invalid or placeholder email:', {
              ownerEmail,
              isPlaceholder: ownerEmail === 'info@oneeddy.com',
              hasAtSymbol: ownerEmail?.includes('@')
            });
          }
        } else {
          console.log('⚠️ No venue owner found for notification');
        }
      } catch (ownerError) {
        console.error('❌ Error in venue owner notification process:', ownerError);
        // Don't fail the process if owner notification fails
      }

      // Show success message
      toast({
        title: "Credits Purchased Successfully! 🎉",
        description: `₦${(creditData.amount * 1000).toLocaleString()} credits added to your account balance`,
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
                  <p><strong>Bonus Credits:</strong> +₦{((creditData.amount - creditData.purchaseAmount) * 1000).toLocaleString()}</p>
                  <p><strong>Total Credits:</strong> ₦{(creditData.amount * 1000).toLocaleString()}</p>
                  <p><strong>Purchase Amount:</strong> ₦{(creditData.purchaseAmount * 1000).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
                
                {/* Authentication Check */}
                {!user ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Sign in to continue</h4>
                      <p className="text-gray-600">Please sign in or create an account to purchase credits</p>
                    </div>
                    <Button
                      onClick={() => setLoginOpen(true)}
                      className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                    >
                      Sign In / Create Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Signed In User Info Section */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold text-green-900">You're Signed In</h4>
                      </div>
                      <div className="space-y-3">
                        {/* Full Name - Display Only */}
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Full Name
                          </label>
                          <div className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-gray-700">
                            {formData.fullName || 'N/A'}
                          </div>
                        </div>

                        {/* Email - Display Only */}
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Email Address
                          </label>
                          <div className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-gray-700">
                            {formData.email || 'N/A'}
                          </div>
                        </div>

                        {/* Phone - Display Only */}
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Phone Number
                          </label>
                          <div className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-gray-700">
                            {formData.phone || 'N/A'}
                          </div>
                        </div>
                      </div>
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

                    {/* Payment Processor Selection */}
                    {locationLoading ? (
                      <div className="border-t pt-4 text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-brand-burgundy" />
                        <p>Loading payment method...</p>
                      </div>
                    ) : paymentProcessor === 'paystack' ? (
                      <PaystackCreditPurchaseForm
                        amount={creditData.purchaseAmount * 1000}
                        venueName={creditData.venueName}
                        formData={formData}
                        setFormData={setFormData}
                        errors={errors}
                        onSubmit={async (paymentData) => {
                          try {
                            setIsSubmitting(true);
                            console.log('🇳🇬 Paystack credit purchase initiated:', paymentData);

                            const result = await initiateCreditPurchasePayment({
                              email: paymentData.email,
                              fullName: paymentData.fullName,
                              phone: paymentData.phone,
                              amount: creditData.purchaseAmount * 1000,
                              venueId: creditData.venue.id,
                              venueName: creditData.venueName,
                              userId: user?.id
                            });

                            console.log('✅ Payment initiated, redirecting to Paystack...');

                            const authUrl = result.data?.authorization_url || result.authorizationUrl;
                            if (authUrl) {
                              // Store callback path in sessionStorage before redirecting (for deep link handling)
                              const callbackPath = '/credit-purchase-callback';
                              const reference = result.data?.reference || result.reference;
                              if (reference) {
                                sessionStorage.setItem('paystack_callback_path', callbackPath);
                                sessionStorage.setItem('paystack_callback_reference', reference);
                                console.log('💾 Stored callback path before redirect:', callbackPath, 'Reference:', reference);
                              }
                              console.log('🚀 Redirecting to Paystack:', authUrl);
                              window.location.href = authUrl;
                            } else {
                              console.error('❌ Missing auth URL in response:', result);
                              throw new Error('No authorization URL returned from Paystack');
                            }
                          } catch (error) {
                            console.error('❌ Paystack payment error:', error);
                            setIsSubmitting(false);
                            toast({
                              title: 'Payment Error',
                              description: error.message || 'Failed to initiate payment',
                              variant: 'destructive'
                            });
                          }
                        }}
                        isLoading={isSubmitting}
                      />
                    ) : (
                      <>
                        {/* Card Details Section for Stripe */}
                        <div className="border-t pt-4">
                          <h4 className="text-md font-medium text-gray-700 mb-3">Card Details</h4>
                          <div className="space-y-3">
                            {/* Card Number */}
                            <div>
                              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                Card Number * (16 digits)
                              </label>
                              <input
                                type="text"
                                id="cardNumber"
                                placeholder="1234 5678 9012 3456"
                                maxLength="16"
                                inputMode="numeric"
                                onChange={(e) => {
                                  // Only allow digits
                                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Expiry and CVC */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                                  Expiry Date *
                                </label>
                                <input
                                  type="text"
                                  id="expiry"
                                  placeholder="MM/YY"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
                                  CVC *
                                </label>
                                <input
                                  type="text"
                                  id="cvc"
                                  placeholder="123"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Submit Button for Stripe */}
                        <button
                          onClick={() => handleSubmit('simulated-payment-method')}
                          disabled={isSubmitting}
                          className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                            isSubmitting 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-brand-burgundy hover:bg-brand-burgundy/90 focus:ring-2 focus:ring-brand-burgundy/50'
                          }`}
                        >
                          {isSubmitting ? 'Processing...' : `Purchase Credits - ₦${(creditData.purchaseAmount * 1000).toLocaleString()}`}
                        </button>
                      </>
                    )}
                  </div>
                )}
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
                  <span>+₦{((creditData.amount - creditData.purchaseAmount) * 1000).toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total Credits:</span>
                    <span>₦{(creditData.amount * 1000).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Purchase Amount:</span>
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
                  Your credit purchase of <span className="font-bold">₦{(creditData.amount * 1000).toLocaleString()} credits</span> for <span className="font-bold">{creditData.venueName}</span> has been confirmed.
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

      {/* Authentication Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-burgundy">
              {awaitingConfirm ? 'Confirm your email' : (authMode === 'login' ? 'Log in to continue' : 'Create an account')}
            </DialogTitle>
          </DialogHeader>

          {!awaitingConfirm ? (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <Label htmlFor="auth-email" className="text-brand-burgundy">Email</Label>
                <Input 
                  id="auth-email" 
                  type="email" 
                  value={authForm.email} 
                  onChange={(e) => setAuthForm(f => ({ ...f, email: e.target.value }))} 
                  required 
                />
              </div>
              {authMode === 'signup' && (
                <>
                  <div>
                    <Label htmlFor="auth-name" className="text-brand-burgundy">Full Name</Label>
                    <Input 
                      id="auth-name" 
                      type="text" 
                      value={authForm.fullName} 
                      onChange={(e) => setAuthForm(f => ({ ...f, fullName: e.target.value }))} 
                      placeholder="e.g. John Smith" 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="auth-phone" className="text-brand-burgundy">Phone (optional)</Label>
                    <Input 
                      id="auth-phone" 
                      type="tel" 
                      value={authForm.phone} 
                      onChange={(e) => setAuthForm(f => ({ ...f, phone: e.target.value }))} 
                      placeholder="+234 ..." 
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="auth-pass" className="text-brand-burgundy">Password</Label>
                <Input 
                  id="auth-pass" 
                  type="password" 
                  value={authForm.password} 
                  onChange={(e) => setAuthForm(f => ({ ...f, password: e.target.value }))} 
                  required 
                />
              </div>
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <Button type="submit" disabled={authLoading} className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90">
                {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
              </Button>
              <div className="text-center text-sm">
                {authMode === 'login' ? (
                  <button type="button" className="text-brand-gold" onClick={() => setAuthMode('signup')}>
                    New here? Create an account
                  </button>
                ) : (
                  <button type="button" className="text-brand-gold" onClick={() => setAuthMode('login')}>
                    Already have an account? Login
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-burgundy/80">
                We sent a confirmation email to <span className="font-medium text-brand-burgundy">{authForm.email}</span>. Please click the link in that email to verify your account. Once confirmed, return to the app.
              </p>
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <div className="flex gap-2">
                <Button onClick={checkEmailConfirmed} disabled={authLoading} className="flex-1 bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90">
                  I've confirmed
                </Button>
                <Button onClick={resendConfirmation} variant="outline" disabled={authLoading} className="flex-1 border-brand-burgundy text-brand-burgundy">
                  Resend email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditPurchaseCheckout; 