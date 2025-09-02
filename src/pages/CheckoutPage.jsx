import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Calendar, Clock, User, Check, Share2, Plus, Minus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import SplitPaymentForm from '@/components/checkout/SplitPaymentForm';
import { validateCheckoutForm } from '@/lib/formValidation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendBookingConfirmation, sendVenueOwnerNotification, debugBookingEmail, sendBookingConfirmationEmail } from '../lib/emailService.js';
import { Elements, CardElement } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';

const CheckoutPage = () => {
const { id } = useParams();
const navigate = useNavigate();
const location = useLocation();
const { toast } = useToast();
const { user } = useAuth();

// Check if this is a deposit flow
const isDepositFlow = location.pathname.includes('/deposit');
const depositAmount = location.state?.depositAmount;

const [selection, setSelection] = useState(null);
const [loading, setLoading] = useState(true);
const [formData, setFormData] = useState({
fullName: '',
email: '',
phone: '',
password: '',
agreeToTerms: false,
referralCode: ''
  // Remove cardNumber, expiryDate, and cvv since we're using Stripe Elements
});
const [userProfile, setUserProfile] = useState(null);
const [errors, setErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [showConfirmation, setShowConfirmation] = useState(false);
const [vipPerks, setVipPerks] = useState([]);
const [venue, setVenue] = useState(null);
const [paymentMethod, setPaymentMethod] = useState('card');
const [splitCount, setSplitCount] = useState(1);
const [splitAmounts, setSplitAmounts] = useState([]);
const [splitLinks, setSplitLinks] = useState([]);
const [showShareDialog, setShowShareDialog] = useState(false);
const [splitPaymentRequests, setSplitPaymentRequests] = useState([]);
const [currentUserForSplit, setCurrentUserForSplit] = useState(null);

// Add this state to store the booking data from location.state
const [bookingData, setBookingData] = useState(null);

// Add Stripe instance state
const [stripe, setStripe] = useState(null);

// Initialize Stripe
useEffect(() => {
  const initStripe = async () => {
    const stripeInstance = await stripePromise;
    setStripe(stripeInstance);
  };
  initStripe();
}, []);

// Add these missing auth functions here
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

      if (data.user) {
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

const checkEmailConfirmed = async () => {
  setAuthLoading(true);
  setAuthError('');

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (data.user?.email_confirmed_at) {
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
    console.error('Email confirmation check error:', error);
    setAuthError(error.message);
  } finally {
    setAuthLoading(false);
  }
};

const resendConfirmation = async () => {
  setAuthLoading(true);
  setAuthError('');

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: authForm.email
    });

    if (error) throw error;

    toast({
      title: "Confirmation email sent!",
      description: "Please check your inbox.",
    });
  } catch (error) {
    console.error('Resend confirmation error:', error);
    setAuthError(error.message);
  } finally {
    setAuthLoading(false);
  }
};

const ensureSession = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('No authenticated user found');
  }
  return user;
};

const createBooking = async () => {
  try {
    // Prepare booking data for database - use the correct data structure
    const venueId = selection?.venue?.id || bookingData?.venue?.id || selection?.venueId || selection?.id;
    const tableId = selection?.table?.id || bookingData?.table?.id || selection?.selectedTable?.id || selection?.tableId || null;

    console.log('🔍 Debug venue ID lookup:', {
      'selection?.venue?.id': selection?.venue?.id,
      'bookingData?.venue?.id': bookingData?.venue?.id,
      'selection?.venueId': selection?.venueId,
      'selection?.id': selection?.id,
      'final venueId': venueId
    });

    // Validate required fields
    if (!venueId) {
      throw new Error('Venue ID is required for booking');
    }

    const sessionCheckUser = await ensureSession();
    const bookingDataToInsert = {
      user_id: sessionCheckUser.id,
      venue_id: venueId,
      table_id: tableId,
      booking_date: selection?.date || bookingData?.date || new Date().toISOString().split('T')[0],
      start_time: selection?.time || bookingData?.time || '19:00:00',
      end_time: selection?.endTime || bookingData?.endTime || '23:00:00',
      number_of_guests: parseInt(selection?.guests) || parseInt(bookingData?.guestCount) || 2,
      status: 'pending', // Use 'pending' for split payments
      total_amount: parseFloat(calculateTotal())
    };

    console.log('Creating booking for split payment:', bookingDataToInsert);

    // Save booking to database
    const { data: bookingRecord, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingDataToInsert])
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log('Split payment booking created:', bookingRecord.id);
    return bookingRecord.id;

  } catch (error) {
    console.error('Error creating booking for split payment:', error);
    throw error;
  }
};

// inside component top-level
const { user: sessionUser, signIn, signUp } = useAuth();
const [loginOpen, setLoginOpen] = useState(false);
const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', phone: '' });
const [authLoading, setAuthLoading] = useState(false);
const [authError, setAuthError] = useState('');
const [awaitingConfirm, setAwaitingConfirm] = useState(false);

// Add the useEffect to handle booking data from location.state
useEffect(() => {
  console.log('🔍 CheckoutPage useEffect triggered');
  console.log('📍 Current location:', window.location.href);
  console.log('📦 Location state:', location.state);
  console.log(' User:', user);
  
  if (location.state) {
    // Get booking data from navigation state
    const incomingData = location.state;
    
    console.log('📋 Booking data received:', incomingData);
    
    if (incomingData.venue && incomingData.date && incomingData.time) {
      // Regular booking flow
      console.log('✅ Valid booking data found:', {
        incomingData,
        'incomingData.table': incomingData.table,
        'incomingData.table?.price': incomingData.table?.price,
        'incomingData.selectedTable': incomingData.selectedTable,
        'incomingData.selectedTable?.price': incomingData.selectedTable?.price
      });
      
      // Set the booking data for display
      setBookingData(incomingData);
      
      // Set form data from booking - match the actual data structure
      setFormData(prev => ({
        ...prev,
        venueId: incomingData.venue.id,
        tableId: incomingData.table?.id || incomingData.selectedTable?.id,
        date: incomingData.date,
        startTime: incomingData.time,
        endTime: incomingData.endTime,
        numberOfGuests: incomingData.guestCount
      }));
      
      console.log('📝 Form data set successfully');
      console.log('🎯 Component should now render with data');
      
      // 🚨 CRITICAL FIX: Set loading to false when we have data
      setLoading(false);
      console.log('✅ Loading set to false');
      
    } else {
      console.log('❌ Incomplete booking data, redirecting to venues');
      console.log('Missing:', {
        venue: !incomingData.venue,
        date: !incomingData.date,
        time: !incomingData.time
      });
      navigate('/venues');
    }
  } else {
    console.log('❌ No location state, redirecting to venues');
    navigate('/venues');
  }
}, [location.state, navigate, user]);

// Add debugging for the render conditions
console.log('🎭 Render conditions check:', {
  loading,
  selection: !!selection,
  bookingData: !!bookingData,
  hasData: !!(selection || bookingData)
});

// Add this useEffect to handle loading state
useEffect(() => {
  console.log('🔄 Loading state changed:', loading);
  console.log('📊 Current state:', {
    loading,
    selection: !!selection,
    bookingData: !!bookingData,
    formData: !!formData
  });
}, [loading, selection, bookingData, formData]);

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('⏰ Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

// Add this useEffect after your existing useEffects to populate form data for authenticated users
useEffect(() => {
  if (user && !formData.fullName && !formData.email) {
    console.log(' User authenticated, populating form with profile data');
    
    // Populate form with user's profile information
    setFormData(prev => ({
      ...prev,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || ''
    }));
    
    console.log('✅ Form populated with user data:', {
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || ''
    });
  }
}, [user, formData.fullName, formData.email]);

const handleInputChange = (e) => {
const { name, value, type, checked } = e.target;
setFormData(prev => ({
...prev,
[name]: type === 'checkbox' ? checked : value
}));
if (errors[name]) {
setErrors(prev => ({ ...prev, [name]: null }));
}
};

const applyReferralCode = (code) => {
if (code === "VIP2025") {
toast({ title: "Referral code applied!", description: "You've unlocked 10% off!" });
// This is a mock, in a real app this would adjust price or add perks
setVipPerks(prev => [...prev, "10% Discount Applied"]);
return true;
}
toast({ title: "Invalid referral code", variant: "destructive" });
return false;
};

const sendBookingConfirmationEmail = async (bookingData) => {
let booking, venue, customer;

try {
// Use the actual database booking record if available
if (bookingData.dbRecord) {
booking = bookingData.dbRecord;
} else {
// Fallback to constructed data - use both selection and bookingData
const dataSource = selection || bookingData;
booking = {
  id: bookingData.bookingId || bookingData.id,
  booking_date: bookingData.bookingDate || new Date().toISOString(),
  booking_time: dataSource?.time || '19:00:00',
  guest_count: dataSource?.guests || dataSource?.guestCount || 2,
  table_number: dataSource?.table?.name || dataSource?.table?.table_number,
  total_amount: bookingData.totalAmount,
  status: 'confirmed'
};
}

// Fetch actual venue data from database if venue_id is available
if (booking.venue_id) {
const { data: venueData, error: venueError } = await supabase
  .from('venues')
  .select(`
    *,
    venue_owners!inner(
      owner_email,
      owner_name,
      email
    )
  `)
  .eq('id', booking.venue_id)
  .single();

if (!venueError && venueData) {
  venue = venueData;
} else {
  console.warn('Could not fetch venue data with join, trying fallback:', venueError);
  // Fallback to simple venue query if join fails
  const { data: fallbackVenueData, error: fallbackError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', booking.venue_id)
    .single();
  
  if (!fallbackError && fallbackVenueData) {
    venue = fallbackVenueData;
  } else {
    console.warn('Could not fetch venue data, using fallback:', fallbackError);
    const dataSource = selection || bookingData;
    venue = {
      name: bookingData.venueName || dataSource?.venueName,
      address: dataSource?.venueAddress || 'Lagos, Nigeria',
      contact_phone: dataSource?.venuePhone || '+234 XXX XXX XXXX',
      contact_email: dataSource?.venueEmail || 'info@oneeddy.com',
      images: dataSource?.venueImage ? [dataSource.venueImage] : [],
      dress_code: 'Smart casual'
    };
  }
}
} else {
// Fallback venue data - use both selection and bookingData
const dataSource = selection || bookingData;
venue = {
  name: bookingData.venueName || dataSource?.venueName,
  address: dataSource?.venueAddress || 'Lagos, Nigeria',
  contact_phone: dataSource?.venuePhone || '+234 XXX XXX XXXX',
  contact_email: dataSource?.venueEmail || 'info@oneeddy.com',
  images: dataSource?.venueImage ? [dataSource.venueImage] : [],
  dress_code: 'Smart casual'
};
}

// Use actual customer data from form or user profile
customer = {
full_name: bookingData.customerName || formData.fullName,
email: bookingData.customerEmail || formData.email,
phone: bookingData.customerPhone || formData.phone
};

// Send customer confirmation email using EmailJS
const customerEmailResult = await sendBookingConfirmation(booking, venue, customer);

// Get venue owner info if available for notification
const dataSource = selection || bookingData;
const venueOwnerEmail = bookingData?.venueOwnerEmail || venue?.venue_owners?.owner_email || venue?.venue_owners?.email || venue?.contact_email || dataSource?.ownerEmail || venue?.owner_email;

console.log('🔍 Venue owner email check:', {
  venueOwnerEmail,
  hasValidEmail: venueOwnerEmail && venueOwnerEmail.includes('@'),
  venueContactEmail: venue?.contact_email,
  venueOwnerFromJoin: venue?.venue_owners?.owner_email || venue?.venue_owners?.email,
  bookingDataVenueOwnerEmail: bookingData?.venueOwnerEmail,
  dataSourceOwnerEmail: dataSource?.ownerEmail
});

if (venueOwnerEmail && venueOwnerEmail.includes('@')) {
  const venueOwner = {
    full_name: bookingData?.venueOwnerName || venue?.venue_owners?.owner_name || 'Venue Owner',
    email: venueOwnerEmail
  };

  // Send venue owner notification (blocking to ensure it's sent)
  try {
    console.log('📧 Sending venue owner notification to:', venueOwnerEmail);
    const venueOwnerResult = await sendVenueOwnerNotification(booking, venue, customer, venueOwner);
    console.log('✅ Venue owner notification sent successfully:', venueOwnerResult);
  } catch (venueOwnerError) {
    console.error('❌ Venue owner notification failed:', venueOwnerError);
    // Don't fail the entire process if venue owner email fails
  }
} else {
  console.warn('⚠️ No valid venue owner email found:', {
    venueOwnerEmail,
    venueContactEmail: venue?.contact_email,
    dataSourceOwnerEmail: dataSource?.ownerEmail
  });
}

console.log('✅ Email service result:', customerEmailResult);
return true;
} catch (error) {
console.error('❌ Failed to send booking emails:', error);

// If it's the "recipients address is empty" error, run debug function
if ((error.text === 'The recipients address is empty' || error.message?.includes('recipients address is empty')) && booking && venue && customer) {
console.log('🔍 Running email debug function...');
try {
  await debugBookingEmail(booking, venue, customer);
} catch (debugError) {
  console.error('❌ Debug function also failed:', debugError);
}
}

return false;
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

      // For new users, we don't need to verify the session immediately
      // The user object from signup is sufficient for creating the profile
      console.log('New user created successfully, proceeding with profile creation');

      // Skip client-side profile upsert here to avoid RLS errors during email-confirmation flow.
      // Profiles are auto-created by DB trigger on auth.users insert.
      // Optionally update profile after the user logs in (when a session exists).

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

  if (!stripe) {
    console.error('Stripe not initialized');
    return;
  }

setIsSubmitting(true);

try {
    // Create or update user account first
        const currentUser = await createOrUpdateUserAccount({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });

    if (!currentUser?.id) {
      throw new Error('Failed to create or authenticate user account');
    }

    // Get venue and table IDs for regular booking flow
    const venueId = bookingData?.venue?.id || selection?.venue?.id;
    const tableId = bookingData?.table?.id || selection?.table?.id;

if (!venueId) {
      throw new Error('Venue ID is required');
    }

    // Create pending booking first
    const bookingDetails = {
      user_id: currentUser.id,
  venue_id: venueId,
  table_id: tableId,
  booking_date: selection?.date || bookingData?.date || new Date().toISOString().split('T')[0],
  start_time: selection?.time || bookingData?.time || '19:00:00',
  end_time: selection?.endTime || bookingData?.endTime || '23:00:00',
  number_of_guests: parseInt(selection?.guests) || parseInt(bookingData?.guestCount) || 2,
      status: 'pending',
  total_amount: parseFloat(calculateTotal())
};

    console.log('Creating booking for split payment:', bookingDetails);

    // Save booking to database
    const { data: pendingBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingDetails])
      .select()
    .single();
  
    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    if (!pendingBooking?.id) {
      throw new Error('Failed to create booking record');
    }

    // Since we already have the paymentMethodId from the form, we can proceed directly
    // The payment method was already created in CheckoutForm, so we just need to confirm it
    
    // For single payments, we'll use a different approach - create a PaymentIntent directly
    // We need to use the Edge Function after all, but with the correct parameters
    
    const response = await fetch(
      'https://agydpkzfucicraedllgl.supabase.co/functions/v1/create-split-payment-intent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          amount: Math.round(parseFloat(calculateTotal()) * 100),
          paymentMethodId,
          email: formData.email,
          bookingId: pendingBooking.id, // Now we have the booking ID
          bookingType: 'single', // Specify this is a single payment
          splitRequests: [] // Empty array for single payments
        })
      }
    );

    if (!response.ok) {
      // If payment fails, delete the pending booking
      await supabase
  .from('bookings')
        .delete()
        .eq('id', pendingBooking.id);

      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    const { clientSecret } = await response.json();

    // Confirm the payment
    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
    if (confirmError) {
      // If payment fails, delete the pending booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', pendingBooking.id);

      throw new Error(`Payment failed: ${confirmError.message}`);
    }

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', pendingBooking.id);

    if (updateError) {
      throw new Error(`Failed to update booking status: ${updateError.message}`);
    }

    // Show success message
toast({ 
      title: "Booking Confirmed!",
      description: "Your booking has been confirmed. Check your email for details.",
  className: "bg-green-500 text-white"
});

    // Get venue data for email - include venue owner information
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select(`
        *,
        venue_owners!inner(
          owner_email,
          owner_name,
          email
        )
      `)
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.warn('Could not fetch venue data for email:', venueError);
      // Fallback to simple venue query if join fails
      const { data: fallbackVenueData, error: fallbackError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
      
      if (!fallbackError && fallbackVenueData) {
        venueData = fallbackVenueData;
      }
    }

    // Send confirmation email with complete data
    try {
      const dataSource = selection || bookingData;
      const emailResult = await sendBookingConfirmationEmail({
        ...pendingBooking,
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        venueName: venueData?.name || dataSource?.venueName || 'Venue',
        venueAddress: venueData?.address || dataSource?.venueAddress || 'Lagos, Nigeria',
        venuePhone: venueData?.contact_phone || dataSource?.venuePhone || '+234 XXX XXX XXXX',
        venueEmail: venueData?.venue_owners?.owner_email || venueData?.venue_owners?.email || venueData?.contact_email || dataSource?.venueEmail || 'info@oneeddy.com',
        venueOwnerEmail: venueData?.venue_owners?.owner_email || venueData?.venue_owners?.email,
        venueOwnerName: venueData?.venue_owners?.owner_name,
        venueDescription: venueData?.description || 'Experience luxury dining and entertainment in Lagos\' most exclusive venue.',
        venueDressCode: venueData?.dress_code || 'Smart Casual'
      });

      if (emailResult) {
        console.log('✅ Booking confirmation emails sent successfully');
      } else {
        console.warn('⚠️ Email sending failed, but booking was successful');
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      // Don't fail the booking if email fails
}

setShowConfirmation(true);

} catch (error) {
console.error('Error processing booking:', error);
toast({
  title: "Booking Error",
      description: error.message || "Failed to process booking",
      variant: "destructive"
});
} finally {
setIsSubmitting(false);
}
};

const calculateTotal = () => {
  console.log('🔍 calculateTotal debugging:', {
    isDepositFlow,
    depositAmount,
    selection,
    bookingData,
    'selection?.selectedTable': selection?.selectedTable,
    'bookingData?.table': bookingData?.table,
    'bookingData?.table?.price': bookingData?.table?.price
  });

if (isDepositFlow && depositAmount) {
return depositAmount.toFixed(2);
}
  
if (!selection && !bookingData) return 0;

// Handle new booking modal format vs old format
let basePrice = 0;
if (selection?.isFromModal) {
// New format from booking modal
basePrice = selection.selectedTable?.price || 50;
} else if (bookingData?.isFromModal) {
// New format from booking modal (when bookingData is available)
    basePrice = bookingData.table?.price || bookingData.selectedTable?.price || 50;
} else {
    // Old format - check both selection and bookingData
    basePrice = (selection?.ticket?.price || 0) + 
                (selection?.table?.price || 0) + 
                (bookingData?.table?.price || 0);
  }

  // Add logging to see what price is being used
  console.log('💰 Price calculation:', {
    'selection?.selectedTable?.price': selection?.selectedTable?.price,
    'bookingData?.table?.price': bookingData?.table?.price,
    'bookingData?.selectedTable?.price': bookingData?.selectedTable?.price,
    basePrice
  });

let total = basePrice + 25; // 25 is service fee
if (vipPerks.includes("10% Discount Applied")) {
total *= 0.9; // Apply 10% discount
}

  console.log('💰 Total calculation:', {
    basePrice,
    serviceFee: 25,
    total,
    vipPerksApplied: vipPerks.includes("10% Discount Applied")
  });

return total.toFixed(2);
};

const handleSplitCountChange = (newCount) => {
if (newCount < 1) return;
setSplitCount(newCount);
const amountPerPerson = Math.ceil(venue.price / newCount);
const amounts = Array(newCount).fill(amountPerPerson);
// Adjust the last amount to account for rounding
const total = amounts.reduce((sum, amount) => sum + amount, 0);
if (total !== venue.price) {
amounts[amounts.length - 1] = venue.price - (amounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0));
}
setSplitAmounts(amounts);
setSplitLinks(Array(newCount).fill(''));
};

const generateSplitLinks = () => {
const links = splitAmounts.map((amount, index) => {
// In a real app, this would generate a unique payment link
return `${window.location.origin}/split-payment/${id}/${index + 1}/${amount}`;
});
setSplitLinks(links);
setShowShareDialog(true);
};

const copyToClipboard = (text) => {
navigator.clipboard.writeText(text);
toast({
title: "Link copied!",
description: "Share this link with your friends to collect payment.",
});
};

const handleSplitPaymentCreated = (requests) => {
setSplitPaymentRequests(requests);
setShowShareDialog(true);
};

  // Add debugging for the render conditions
  console.log('🎭 Render conditions check:', {
    loading,
    selection: !!selection,
    bookingData: !!bookingData,
    hasData: !!(selection || bookingData)
  });

  // Update the loading check to include bookingData
  if (loading) {
    console.log('⏳ Showing loading state');
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  // Update the selection check to include bookingData
  if (!selection && !bookingData) {
    console.log('❌ No data available, showing no selection message');
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Selection Found</h2>
        <p className="text-muted-foreground mb-6">Please go back and select a ticket or table first.</p>
        <Link to={
          isDepositFlow ? "/profile" : 
          `/venues/${id}`
        }>
          <Button>
            {isDepositFlow ? "Back to Profile" : 
             "Back to Venue"}
          </Button>
        </Link>
      </div>
    );
  }

  console.log('🎉 Rendering main checkout content');
  console.log('📊 Final render data:', {
    selection,
    bookingData,
    formData
  });

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container py-10">
        <Link to={
          isDepositFlow ? "/profile" : 
          `/venues/${id}`
        } className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isDepositFlow ? "Back to Profile" : 
           "Back to Venue"}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold mb-6 flex items-center">
                <CreditCard className="h-8 w-8 mr-2" />
                Checkout
              </h1>

              {/* Show the selected booking details */}
              {(selection || bookingData) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-800 mb-2">Booking Summary</h3>
                  <div className="text-sm text-blue-700">
                    <p><strong>Venue:</strong> {(selection || bookingData).venue.name}</p>
                    <p><strong>Table:</strong> {(selection || bookingData).table.table_number} (Capacity: {(selection || bookingData).table.capacity})</p>
                    <p><strong>Date:</strong> {(selection || bookingData).date}</p>
                    <p><strong>Time:</strong> {(selection || bookingData).time} - {(selection || bookingData).endTime}</p>
                    <p><strong>Guests:</strong> {(selection || bookingData).guestCount}</p>
                  </div>
                </div>
              )}

              <Tabs defaultValue="single" className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="single">Single Payment</TabsTrigger>
                  <TabsTrigger value="split">Split Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="single">
                  <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    formData={formData}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    totalAmount={calculateTotal()}
                    isAuthenticated={!!user}
                    icons={{
                      user: <User className="h-5 w-5 mr-2" />
                    }}
                  />
                  </Elements>
                </TabsContent>

                <TabsContent value="split">
                  <Elements stripe={stripePromise}>
                  <SplitPaymentForm
                    totalAmount={parseFloat(calculateTotal())}
                    onSplitCreated={handleSplitPaymentCreated}
                    user={user}
                    bookingId={selection?.id || bookingData?.id}
                    createBookingIfNeeded={async () => {
                      const u = await ensureSession();
                      // If booking already exists, return its ID
                      if (selection?.id) return selection.id;
                      
                      // Create new booking
                      const bookingId = await createBooking();
                      return bookingId;
                    }}
                  />
                  </Elements>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
          
          <div className="lg:col-span-1">
            <OrderSummary 
              selection={selection || bookingData}
              totalAmount={calculateTotal()}
              vipPerks={vipPerks}
            />
          </div>
        </div>

        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-md" aria-describedby="checkout-dialog-desc">
            <div id="checkout-dialog-desc" className="sr-only">Enter your payment details to complete your booking.</div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Booking Confirmed!</DialogTitle>
              <DialogDescription className="text-center">
                <div className="flex justify-center my-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <p className="mb-2">
                  Your booking at <span className="font-bold">{(selection || bookingData)?.venue?.name}</span> has been confirmed.
                </p>
                {vipPerks.length > 0 && (
                  <div className="my-2 text-sm text-green-400">
                    <p className="font-semibold">VIP Perks Applied:</p>
                    <ul className="list-disc list-inside">
                      {vipPerks.map(perk => <li key={perk}>{perk}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-sm">
                  A confirmation email has been sent to {formData.email}. You can show this email or your ID at the entrance.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Link to="/">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
                  Back to Home
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>

        {/* Split Payment Requests Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent aria-describedby="checkout-dialog-desc-2">
            <div id="checkout-dialog-desc-2" className="sr-only">View and manage your split payment requests.</div>
            <DialogHeader>
              <DialogTitle>Split Payment Requests Sent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {splitPaymentRequests.length > 0 ? (
                splitPaymentRequests.map((request, index) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-brand-burgundy" />
                        </div>
                        <div>
                          <div className="font-medium">Recipient {index + 1}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.recipient_phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₦{request.amount.toLocaleString()}</div>
                        <Badge variant="outline" className="text-xs">
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(request.payment_link)}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Payment Link
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No split payment requests created yet.</p>
                </div>
              )}
              
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                  onClick={() => {
                    setShowShareDialog(false);
                    navigate('/bookings');
                  }}
                >
                  View All Bookings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                  <Input id="auth-email" type="email" value={authForm.email} onChange={(e) => setAuthForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                {authMode === 'signup' && (
                  <>
                    <div>
                      <Label htmlFor="auth-name" className="text-brand-burgundy">Full Name</Label>
                      <Input id="auth-name" type="text" value={authForm.fullName} onChange={(e) => setAuthForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. John Smith" required />
                    </div>
                    <div>
                      <Label htmlFor="auth-phone" className="text-brand-burgundy">Phone (optional)</Label>
                      <Input id="auth-phone" type="tel" value={authForm.phone} onChange={(e) => setAuthForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234 ..." />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="auth-pass" className="text-brand-burgundy">Password</Label>
                  <Input id="auth-pass" type="password" value={authForm.password} onChange={(e) => setAuthForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                {authError && <div className="text-red-600 text-sm">{authError}</div>}
                <Button type="submit" disabled={authLoading} className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90">
                  {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                </Button>
                <div className="text-center text-sm">
                  {authMode === 'login' ? (
                    <button type="button" className="text-brand-gold" onClick={() => setAuthMode('signup')}>New here? Create an account</button>
                  ) : (
                    <button type="button" className="text-brand-gold" onClick={() => setAuthMode('login')}>Already have an account? Login</button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-brand-burgundy/80">
                  We sent a confirmation email to <span className="font-medium text-brand-burgundy">{authForm.email}</span>. Please click the link in that email to verify your account. Once confirmed, return to the app.
                </p>
                {EMAIL_REDIRECT && (
                  <p className="text-xs text-brand-burgundy/60">
                    Tip: The link opens the app via <span className="font-mono">{EMAIL_REDIRECT}</span>.
                  </p>
                )}
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
      </div>
    );
};

export default CheckoutPage;