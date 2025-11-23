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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendVenueOwnerNotification, debugBookingEmail } from '../lib/emailService.js';
import { checkTableAvailability } from '../lib/api.jsx';
import { Elements, CardElement } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { generateSecurityCode, generateVenueEntryQR } from '@/lib/qrCodeService';
import { getFullUrl } from '@/lib/urlUtils';
import { getUserLocationWithFallback, getLocationFromSession, storeLocationInSession, setTestLocation, clearTestLocation, TestLocations } from '@/lib/locationService';
import PaystackCheckoutForm from '@/components/checkout/PaystackCheckoutForm';
import SplitPaymentCheckoutForm from '@/components/checkout/SplitPaymentCheckoutForm';
import { initiatePaystackPayment } from '@/lib/paystackCheckoutHandler';
import { initiateSplitPaystackPayment } from '@/lib/paystackSplitPaymentHandler';

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

// Add location and payment processor state
const [userLocation, setUserLocation] = useState(null);
const [paymentProcessor, setPaymentProcessor] = useState(null);
const [locationLoading, setLocationLoading] = useState(true);
const [showLocationOverride, setShowLocationOverride] = useState(false);


// Detect if we're coming back from Paystack and redirect to callback page
useEffect(() => {
  const checkForPaystackCallback = () => {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    
    // If we're on checkout page but URL has Paystack callback parameters, navigate to callback page
    if (location.pathname.includes('/checkout') && reference) {
      // Determine callback path from URL or default to regular payment
      let callbackPath = '/paystack-callback';
      let callbackType = 'Paystack';
      if (currentUrl.includes('/split-payment-callback')) {
        callbackPath = '/split-payment-callback';
        callbackType = 'split-payment';
      } else if (currentUrl.includes('/credit-purchase-callback')) {
        callbackPath = '/credit-purchase-callback';
        callbackType = 'credit-purchase';
      }
      console.log(`🔄 Detected ${callbackType} callback parameters on checkout page, redirecting to callback page...`);
      console.log('Reference:', reference);
      setIsSubmitting(false); // Reset submitting state
      navigate(`${callbackPath}?reference=${reference}${urlParams.toString().includes('status') ? '&' + urlParams.toString().split('&').find(p => p.includes('status')) : ''}`, { replace: true });
      return;
    }
    
    // Also check if URL path is paystack-callback, split-payment-callback, or credit-purchase-callback but we're still on checkout (shouldn't happen but just in case)
    if (currentUrl.includes('/paystack-callback') || currentUrl.includes('/split-payment-callback') || currentUrl.includes('/credit-purchase-callback')) {
      let callbackPath = '/paystack-callback';
      let callbackType = 'paystack';
      let splitString = '/paystack-callback';
      if (currentUrl.includes('/split-payment-callback')) {
        callbackPath = '/split-payment-callback';
        callbackType = 'split-payment';
        splitString = '/split-payment-callback';
      } else if (currentUrl.includes('/credit-purchase-callback')) {
        callbackPath = '/credit-purchase-callback';
        callbackType = 'credit-purchase';
        splitString = '/credit-purchase-callback';
      }
      const pathAfterCallback = currentUrl.split(splitString)[1] || '';
      console.log(`🔄 Detected ${callbackType}-callback in URL, navigating...`);
      setIsSubmitting(false);
      navigate(`${callbackPath}${pathAfterCallback}`, { replace: true });
    }
  };
  
  checkForPaystackCallback();
  
  // Also listen for Capacitor app URL open events (when app is opened via deep link)
  if (typeof window !== 'undefined' && window.Capacitor) {
    // Use dynamic import instead of require
    import('@capacitor/app').then(({ App }) => {
      const handleAppUrlOpen = (data) => {
        console.log('📱 App opened with URL:', data.url);
        if (data.url && (data.url.includes('/paystack-callback') || data.url.includes('/split-payment-callback') || data.url.includes('/credit-purchase-callback'))) {
          let callbackType = 'Paystack';
          if (data.url.includes('/split-payment-callback')) callbackType = 'split-payment';
          else if (data.url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
          console.log(`🔄 Detected ${callbackType} callback in app URL open event`);
          setIsSubmitting(false);
          // Extract the path and query from the URL
          const url = new URL(data.url);
          navigate(`${url.pathname}${url.search}`, { replace: true });
        }
      };
      
      App.addListener('appUrlOpen', handleAppUrlOpen);
      
      // Also check launch URL
      App.getLaunchUrl().then(({ url }) => {
        if (url && (url.includes('/paystack-callback') || url.includes('/split-payment-callback') || url.includes('/credit-purchase-callback'))) {
          let callbackType = 'Paystack';
          if (url.includes('/split-payment-callback')) callbackType = 'split-payment';
          else if (url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
          console.log(`🔄 Detected ${callbackType} callback in launch URL:`, url);
          setIsSubmitting(false);
          const urlObj = new URL(url);
          navigate(`${urlObj.pathname}${urlObj.search}`, { replace: true });
        }
      }).catch(() => {
        // No launch URL or error - that's fine
      });
      
      return () => {
        App.removeAllListeners();
      };
    }).catch((error) => {
      console.warn('Could not load Capacitor App module in CheckoutPage:', error);
    });
  }
}, [location.pathname, navigate]);

// Detect user location and payment processor
useEffect(() => {
  const initializeLocation = async () => {
    try {
      // Check if location is already in session
      let detectedLocation = getLocationFromSession();
      
      if (!detectedLocation) {
        // If not in session, detect using IP
        detectedLocation = await getUserLocationWithFallback();
        storeLocationInSession(detectedLocation);
      }
      
      setUserLocation(detectedLocation);
      setPaymentProcessor(detectedLocation.processor);
      
      console.log('📍 Payment processor selected:', {
        processor: detectedLocation.processor,
        currency: detectedLocation.currency,
        country: detectedLocation.country,
        description: `${detectedLocation.country} - ${detectedLocation.processor.toUpperCase()}`,
        isTest: detectedLocation.isTest || false
      });
    } catch (error) {
      console.error('Error detecting location:', error);
      // Default to Paystack for Nigeria
      const fallback = {
        country: 'NG',
        currency: 'NGN',
        processor: 'paystack'
      };
      setUserLocation(fallback);
      setPaymentProcessor('paystack');
    } finally {
      setLocationLoading(false);
    }
  };
  
  initializeLocation();
}, []);

// Function to handle location override
const handleLocationOverride = (locationType) => {
  let newLocation;
  switch (locationType) {
    case 'nigeria':
      newLocation = TestLocations.nigeria();
      break;
    case 'uk':
      newLocation = TestLocations.uk();
      break;
    case 'usa':
      newLocation = TestLocations.usa();
      break;
    case 'europe':
      newLocation = TestLocations.europe();
      break;
    case 'clear':
      clearTestLocation();
      // Reload location
      window.location.reload();
      return;
    default:
      return;
  }
  
  setUserLocation(newLocation);
  setPaymentProcessor(newLocation.processor);
  setShowLocationOverride(false);
  
  toast({
    title: "Location Override Set",
    description: `Testing with ${newLocation.country} - ${newLocation.processor.toUpperCase()}`,
  });
};

// Initialize Stripe
useEffect(() => {
  const initStripe = async () => {
    if (!stripePromise) {
      console.warn('Stripe promise is null - Stripe key not configured');
      setStripe(null);
      return;
    }
    try {
      const stripeInstance = await stripePromise;
      if (stripeInstance) {
        setStripe(stripeInstance);
      } else {
        console.error('Stripe instance is null after promise resolution');
        setStripe(null);
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      setStripe(null);
    }
  };
  initStripe();
}, []);

// Add this helper function at the top
const ensureTimeFormat = (time) => {
  if (!time) return null;
  
  // If time is in HH:MM format, add :00 for seconds
  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }
  // If time is already in HH:MM:SS format, return as is
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  // If time is just hours, add minutes and seconds
  if (/^\d{2}$/.test(time)) {
    return `${time}:00:00`;
  }
  return time;
};

// Add this function near the top of the file
const validateBookingTimes = (startTime, endTime) => {
  
  // Ensure times are in HH:MM:SS format
  const timeFormat = /^\d{2}:\d{2}:\d{2}$/;

  if (!timeFormat.test(startTime) || !timeFormat.test(endTime)) {
    throw new Error('Times must be in HH:MM:SS format');
  }

  // Convert times to comparable format
  const start = new Date(`1970-01-01T${startTime}`);
  let end = new Date(`1970-01-01T${endTime}`);
  
  // If end time is before start time, assume it's the next day
  if (end <= start) {
    end = new Date(`1970-01-02T${endTime}`);
  }

  // Ensure the booking is exactly 4 hours
  const expectedEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000); // Add exactly 4 hours
  
  // If the provided end time doesn't match the expected 4-hour duration, use the calculated one
  if (Math.abs(end.getTime() - expectedEnd.getTime()) > 60000) { // Allow 1 minute tolerance
    endTime = expectedEnd.toTimeString().slice(0, 8); // Format as HH:MM:SS
  }
  
  return {
    startTime,
    endTime
  };
};

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

// Add this helper function to handle times that cross midnight
const adjustTimeForMidnight = (startTime, endTime) => {
  // Add seconds if missing
  startTime = ensureTimeFormat(startTime);
  endTime = ensureTimeFormat(endTime);

  // If end time is less than start time, it means it's the next day
  // Instead of adding 24 hours (which creates invalid times like 26:00:00),
  // we'll keep the original end time and handle midnight crossing in the database
  if (endTime < startTime) {
    // Keep the original end time - the database can handle midnight crossing
    // by storing the time as-is and interpreting it as next day
  }

  return { startTime, endTime };
};

const createBooking = async () => {
  try {
    // Prepare booking data for database - use the correct data structure
    const venueId = selection?.venue?.id || bookingData?.venue?.id || selection?.venueId || selection?.id;
    const tableId = selection?.table?.id || bookingData?.table?.id || selection?.selectedTable?.id || selection?.tableId || null;

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
      number_of_guests: parseInt(selection?.guests) || parseInt(bookingData?.guestCount) || 2,
      status: 'pending',
      total_amount: parseFloat(calculateTotal())
    };

    // Handle the times - check multiple possible sources
    const rawStartTime = selection?.time || bookingData?.time || formData?.startTime || '19:00';
    let rawEndTime = selection?.endTime || bookingData?.endTime || formData?.endTime;
    
    // If no end time is provided, calculate it as 4 hours from start time
    if (!rawEndTime) {
      const startTimeObj = new Date(`2000-01-01 ${rawStartTime}`);
      const endTimeObj = new Date(startTimeObj.getTime() + 4 * 60 * 60 * 1000); // Add 4 hours
      rawEndTime = endTimeObj.toTimeString().slice(0, 8); // Format as HH:MM:SS
    }

    const { startTime, endTime } = adjustTimeForMidnight(rawStartTime, rawEndTime);

    bookingDataToInsert.start_time = startTime;
    bookingDataToInsert.end_time = endTime;

    // Validate the times are in order
    if (!bookingDataToInsert.start_time || !bookingDataToInsert.end_time) {
      throw new Error('Start time and end time are required');
    }

    // If booking goes past midnight, adjust end time for comparison
    let endTimeForComparison = bookingDataToInsert.end_time;
    if (endTimeForComparison < bookingDataToInsert.start_time) {
      // Booking spans midnight, end time is actually next day
      endTimeForComparison = '23:59:59'; // Set to end of day
    }

    // Ensure end time is after start time
    if (bookingDataToInsert.start_time >= endTimeForComparison) {
      throw new Error('End time must be after start time');
    }


    // Validate and potentially adjust times
    try {
      const { startTime, endTime } = validateBookingTimes(
        bookingDataToInsert.start_time, 
        bookingDataToInsert.end_time
      );
      bookingDataToInsert.start_time = startTime;
      bookingDataToInsert.end_time = endTime;
    } catch (error) {
      throw new Error(`Invalid booking times: ${error.message}`);
    }

    // Final availability check before booking creation with retry logic
    let finalAvailabilityCheck = null;
    let availabilityError = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      const result = await checkTableAvailability(
        venueId, 
        tableId, 
        bookingDataToInsert.booking_date
      );
      
      finalAvailabilityCheck = result.data;
      availabilityError = result.error;
      
      if (!availabilityError) break;
      
      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    if (availabilityError) {
      throw new Error('Failed to verify table availability after multiple attempts');
    }

    // Check if the selected time slot is still available
    // Normalize time formats for comparison
    const normalizedStartTime = bookingDataToInsert.start_time.includes(':') 
      ? bookingDataToInsert.start_time 
      : `${bookingDataToInsert.start_time}:00`;
    
    const selectedTimeSlot = finalAvailabilityCheck?.find(slot => {
      // Normalize slot time format for comparison
      const normalizedSlotTime = slot.time.includes(':') 
        ? slot.time 
        : `${slot.time}:00`;
      return normalizedSlotTime === normalizedStartTime;
    });
    
    if (!selectedTimeSlot?.available) {
      throw new Error(`Time slot ${bookingDataToInsert.start_time} is no longer available. Please select a different time.`);
    }

    // Save booking to database
    const { data: bookingRecord, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingDataToInsert])
      .select()
      .single();

    if (bookingError) {
      console.error('bookingError details:', bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    return bookingRecord.id;

  } catch (error) {
    throw error;
  }
};

// inside component top-level
const { user: sessionUser, signIn, signUp } = useAuth();
const [loginOpen, setLoginOpen] = useState(false);
const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', phone: '', dataConsent: false });
const [authLoading, setAuthLoading] = useState(false);
const [authError, setAuthError] = useState('');
const [awaitingConfirm, setAwaitingConfirm] = useState(false);

// Add the useEffect to handle booking data from location.state
useEffect(() => {
  
  if (location.state) {
    // Get booking data from navigation state
    const incomingData = location.state;
    
    // Check if this is a credit purchase flow
    if (incomingData.creditPurchase) {
      // Credit purchase flow - redirect to credit purchase checkout
      navigate('/credit-purchase-checkout', { state: incomingData });
      return;
    }
    
    if (incomingData.venue && incomingData.date && incomingData.time) {
      // Regular booking flow
      
      // Set the booking data for display
      setBookingData(incomingData);
      
      // CRITICAL FIX: Set selection state for OrderSummary component
      setSelection({
        ...incomingData,
        venueName: incomingData.venue?.name || incomingData.venueName,
        venueLocation: incomingData.venue?.city || incomingData.venueLocation,
        isFromModal: true
      });
      
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
      
      
      // 🚨 CRITICAL FIX: Set loading to false when we have data
      setLoading(false);
      
    } else {
      navigate('/venues');
    }
  } else {
    navigate('/venues');
  }
}, [location.state, navigate, user]);


// Add this useEffect to handle loading state
useEffect(() => {
}, [loading, selection, bookingData, formData]);

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

// Add this useEffect after your existing useEffects to populate form data for authenticated users
useEffect(() => {
  if (user && !formData.fullName && !formData.email) {
    // Populate form with user's profile information
    setFormData(prev => ({
      ...prev,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || ''
    }));
    
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
// Fallback to constructed data
booking = {
  id: bookingData.bookingId || bookingData.id,
  booking_date: bookingData.bookingDate || new Date().toISOString(),
  booking_time: selection.time || '19:00:00',
  guest_count: selection.guests || selection.guestCount || 2,
  table_number: selection.table?.name || selection.table?.table_number,
  total_amount: bookingData.totalAmount,
  status: 'confirmed'
};
}

// Fetch actual venue data from database if venue_id is available
if (booking.venue_id) {
const { data: venueData, error: venueError } = await supabase
  .from('venues')
  .select('*')
  .eq('id', booking.venue_id)
  .single();

if (!venueError && venueData) {
  venue = venueData;
  
  // Get venue owner information separately
  if (venue.owner_id) {
    const { data: ownerData, error: ownerError } = await supabase
      .from('venue_owners')
      .select('owner_email, owner_name, email')
      .eq('user_id', venue.owner_id)
      .single();
    
    if (!ownerError && ownerData) {
      venue.venue_owners = ownerData;
    } else {
    }
  }
} else {
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

// Customer email will be sent after payment confirmation

// Get venue owner info if available for notification
const dataSource = selection || bookingData;
const venueOwnerEmail = bookingData?.venueOwnerEmail || venue?.venue_owners?.owner_email || venue?.venue_owners?.email || venue?.contact_email || dataSource?.ownerEmail || venue?.owner_email;

if (venueOwnerEmail && venueOwnerEmail.includes('@')) {
  const venueOwner = {
    name: bookingData?.venueOwnerName || venue?.venue_owners?.owner_name || 'Venue Owner',
    email: venueOwnerEmail
  };

  // Send venue owner notification (blocking to ensure it's sent)
  try {
    const venueIdForNotification =
      booking?.venue_id ||
      venue?.id ||
      bookingData?.venue?.id ||
      selection?.venue?.id ||
      selection?.venueId ||
      selection?.id;

    const venueOwnerResult = await sendVenueOwnerNotification(
      booking,
      { ...venue, id: venue?.id || venueIdForNotification },
      customer,
      venueOwner,
      venueIdForNotification
    );
  } catch (venueOwnerError) {
    console.error('❌ Venue owner notification failed:', venueOwnerError);
    // Don't fail the entire process if venue owner email fails
  }
} else {
}

return true;
} catch (error) {
console.error('❌ Failed to send booking emails:', error);

// If it's the "recipients address is empty" error, run debug function
if ((error.text === 'The recipients address is empty' || error.message?.includes('recipients address is empty')) && booking && venue && customer) {
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
  // Profile update failed, continue anyway
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
throw signUpError;
}

if (!newUser.user) {
throw new Error('Failed to create user account - no user returned from signup');
}


        // CRITICAL: For new users, ensure Supabase session is properly established for RLS
        if (newUser.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: newUser.session.access_token,
            refresh_token: newUser.session.refresh_token
          });
          
          if (sessionError) {
            throw new Error('Failed to establish authentication session');
          }
          
          // Wait a moment for the session to be fully established
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify the session is working
          const { data: verifySession, error: verifyError } = await supabase.auth.getUser();
          if (verifyError || !verifySession.user || verifySession.user.id !== newUser.user.id) {
            throw new Error('Authentication session verification failed');
          }
          
        } else {
          throw new Error('No authentication session available - please try again');
        }


      // Skip client-side profile upsert here to avoid RLS errors during email-confirmation flow.
      // Profiles are auto-created by DB trigger on auth.users insert.
      // Optionally update profile after the user logs in (when a session exists).

return newUser.user;
} catch (error) {
throw error;
}
};

const handleSubmit = async (paymentMethodId) => {
  let customerEmailResult = false;

  if (!paymentMethodId) {
    console.error('Payment method ID is missing');
    toast({
      title: "Payment Error",
      description: "Payment method is missing. Please try again.",
      variant: "destructive"
    });
    return;
  }

  if (!stripe) {
    console.error('Stripe instance is not available');
    toast({
      title: "Payment Error",
      description: "Payment system is not ready. Please refresh the page and try again.",
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

    // Generate security code for QR
    const securityCode = generateSecurityCode();

    // Create booking with confirmed status
    const bookingDetails = {
      user_id: currentUser.id,
      venue_id: venueId,
      table_id: tableId,
      booking_date: selection?.date || bookingData?.date || new Date().toISOString().split('T')[0],
      start_time: selection?.time || bookingData?.time || '19:00:00',
      end_time: selection?.endTime || bookingData?.endTime || '23:00:00',
      number_of_guests: parseInt(selection?.guests) || parseInt(bookingData?.guestCount) || 2,
      status: 'confirmed',
      qr_security_code: securityCode,
      total_amount: parseFloat(calculateTotal())
};


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

    // Route to correct payment processor
    console.log('💳 Payment processor:', paymentProcessor);
    
    if (paymentProcessor === 'paystack') {
      // PAYSTACK FLOW - Use existing Paystack handler
      console.log('🇳🇬 Processing with Paystack...');
      
      const result = await initiatePaystackPayment({
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        amount: parseFloat(calculateTotal()),
        bookingData: {
          ...selection,
          bookingId: pendingBooking.id,
          venueId: venueId,
          venueName: selection?.venue?.name || 'Venue'
        },
        userId: currentUser?.id
      });

      const authUrl = result.data?.authorization_url || result.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
        return;
      } else {
        throw new Error('No authorization URL returned from Paystack');
      }
    } else {
      // STRIPE FLOW - Create PaymentIntent and confirm payment
      console.log('💳 Processing with Stripe...');
      
      if (!stripe) {
        throw new Error('Stripe is not initialized');
      }

      if (!paymentMethodId) {
        throw new Error('Payment method ID is required. Please ensure your card details are entered correctly.');
      }

      const requestBody = {
        amount: parseFloat(calculateTotal()),
        currency: userLocation?.currency || 'gbp',
        bookingId: pendingBooking.id,
        email: formData.email,
        description: `Booking at ${selection?.venue?.name || 'Venue'}`
      };

      console.log('📤 Sending PaymentIntent request:', {
        ...requestBody,
        amount: requestBody.amount,
        hasPaymentMethodId: !!paymentMethodId
      });
      
      // Call Edge Function to create Payment Intent
      const createIntentResponse = await fetch(
        'https://agydpkzfucicraedllgl.supabase.co/functions/v1/create-stripe-payment-intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('📥 PaymentIntent response status:', createIntentResponse.status);

      if (!createIntentResponse.ok) {
        let errorData;
        try {
          errorData = await createIntentResponse.json();
        } catch (e) {
          const errorText = await createIntentResponse.text();
          console.error('❌ Failed to parse error response:', errorText);
          throw new Error(`Failed to create payment intent: ${createIntentResponse.status} ${createIntentResponse.statusText}`);
        }
        console.error('❌ Failed to create Stripe PaymentIntent:', errorData);
        console.error('❌ Full error response:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || errorData.message || 'Failed to create payment intent');
      }

      const intentData = await createIntentResponse.json();
      
      if (!intentData.clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('✅ PaymentIntent created:', intentData.paymentIntentId);
      console.log('💳 Confirming payment with payment method:', paymentMethodId);

      // Confirm payment with payment method ID
      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: paymentMethodId
        }
      );

      if (confirmError) {
        console.error('❌ Stripe payment confirmation error:', confirmError);
        throw new Error(`Payment failed: ${confirmError.message}`);
      }

      if (!paymentIntent) {
        throw new Error('Payment confirmation failed - no payment intent returned');
      }

      if (paymentIntent.status === 'requires_action') {
        console.error('❌ Payment requires additional action');
        throw new Error('Payment requires additional authentication. Please complete the 3D Secure verification.');
      }

      if (paymentIntent.status !== 'succeeded') {
        console.error('❌ Payment not succeeded, status:', paymentIntent.status);
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }

      console.log('✅ Stripe payment confirmed successfully:', paymentIntent.id);
    }

    // Update booking status to confirmed
    
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        qr_security_code: securityCode
      })
      .eq('id', pendingBooking.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update booking status: ${updateError.message}`);
    }

    // Generate QR code for venue entry
    let qrCodeImage = null;
    try {
      const qrCodeData = await generateVenueEntryQR({
        ...updatedBooking,
        venue_id: venueId,
        table_id: tableId,
        table: { table_number: selection?.table?.name || selection?.table?.table_number || 'N/A' }
      });
      qrCodeImage = qrCodeData?.externalUrl || qrCodeData?.base64 || qrCodeData;
    } catch (qrError) {
      console.error('❌ Failed to generate QR code:', qrError);
      // Continue without QR code - booking is still valid
    }

    // Show success message
    toast({ 
      title: "Booking Confirmed!",
      description: "Your booking has been confirmed. Check your email for details.",
      className: "bg-green-500 text-white"
    });

    // Get venue data for email
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.error('⚠️ Error fetching venue data:', venueError);
    }

    // Fetch table data for email
    let tableData = null;
    let tableNumber = 'N/A';
    if (tableId) {
      const { data: tableInfo, error: tableError } = await supabase
        .from('venue_tables')
        .select('table_number, table_type, capacity')
        .eq('id', tableId)
        .single();
      
      if (!tableError && tableInfo) {
        tableData = tableInfo;
        tableNumber = tableInfo.table_number || 'N/A';
        console.log('✅ Table data fetched:', tableNumber);
      } else {
        console.log('⚠️ Could not fetch table data:', tableError);
        // Fallback to selection data
        tableNumber = selection?.table?.table_number || selection?.table?.name || 'N/A';
      }
    } else {
      // Fallback to selection data if no tableId
      tableNumber = selection?.table?.table_number || selection?.table?.name || 'N/A';
    }

    // Fetch venue owner email using the same pattern as Paystack (working configuration)
    let venueOwnerEmail = 'info@oneeddy.com'; // Fallback
    console.log('🔍 Looking up venue with ID:', venueId);
    try {
      // First try to get venue contact email (same as Paystack)
      const { data: venueDataForEmail, error: venueError } = await supabase
        .from('venues')
        .select('contact_email, owner_id')
        .eq('id', venueId)
        .single();
      
      console.log('📍 Venue fetch result:', { venueDataForEmail, venueError });
      
      if (!venueError && venueDataForEmail) {
        if (venueDataForEmail.contact_email) {
          venueOwnerEmail = venueDataForEmail.contact_email;
          console.log('✅ Found venue contact email:', venueOwnerEmail);
        } else if (venueDataForEmail.owner_id) {
          // If no contact email, try to get from venue_owners table (same as Paystack)
          console.log('📧 No contact email, fetching from venue_owners with owner_id:', venueDataForEmail.owner_id);
          const { data: ownerDataList, error: ownerError } = await supabase
            .from('venue_owners')
            .select('owner_email, user_id')
            .eq('user_id', venueDataForEmail.owner_id)
            .limit(1);
          
          console.log('📍 Venue owner fetch result:', { ownerDataList, ownerError });
          
          if (ownerError) {
            console.warn('⚠️ Error fetching venue owner:', ownerError);
          } else if (ownerDataList && ownerDataList.length > 0) {
            // Check if owner_email is available
            if (ownerDataList[0]?.owner_email) {
              venueOwnerEmail = ownerDataList[0].owner_email;
              console.log('✅ Found venue owner email from venue_owners table:', venueOwnerEmail);
            } else if (ownerDataList[0]?.user_id) {
              // If owner_email is null, fetch from profiles table
              console.log('📧 owner_email is null, fetching from profiles table with user_id:', ownerDataList[0].user_id);
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', ownerDataList[0].user_id)
                .single();
              
              if (profileError) {
                console.warn('⚠️ Error fetching profile email:', profileError);
              } else if (profileData?.email) {
                venueOwnerEmail = profileData.email;
                console.log('✅ Found venue owner email from profiles table:', venueOwnerEmail);
              } else {
                console.warn('⚠️ Profile found but no email');
              }
            }
          }
        } else {
          console.warn('⚠️ Venue found but no contact_email or owner_id');
        }
      }
    } catch (venueError) {
      console.error('❌ Exception fetching venue email:', venueError);
    }
    
    console.log('📧 Final venue owner email for Stripe single payment:', venueOwnerEmail);

    // Skip sending venue owner email if it's still placeholder
    const shouldSendVenueOwnerEmail = venueOwnerEmail && venueOwnerEmail !== 'info@oneeddy.com';

    // Format booking time (start - end) - calculate outside try block so it's accessible to both email sections
    const formatTime = (timeString) => {
      if (!timeString) return 'N/A';
      const [hours, minutes] = timeString.split(':');
      return `${parseInt(hours)}:${minutes}`;
    };
    
    const startTime = formatTime(updatedBooking.start_time);
    const endTime = formatTime(updatedBooking.end_time);
    const bookingTime = startTime !== 'N/A' && endTime !== 'N/A' 
      ? `${startTime} - ${endTime}` 
      : 'N/A';

    // Send customer confirmation email now that payment is confirmed
    try {
      console.log('📧 Sending customer confirmation email after payment confirmation:', {
        customerEmail: formData.email,
        customerName: formData.fullName,
        bookingId: updatedBooking.id,
        venueName: venueData?.name
      });

      // Use Supabase Edge Function instead of EmailJS for customer confirmation
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: formData.email,
          subject: `Booking Confirmed - ${venueData?.name || 'Eddy'}`,
          template: 'booking-confirmation',
          data: {
            customerName: formData.fullName,
            venueName: venueData?.name || 'Venue',
            bookingDate: new Date(updatedBooking.booking_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            bookingTime: bookingTime,
            bookingId: updatedBooking.id,
            tableInfo: tableNumber !== 'N/A' ? `Table ${tableNumber}` : 'Table not specified',
            tableNumber: tableNumber,
            totalAmount: Number(updatedBooking.total_amount || 0),
            guestCount: updatedBooking.number_of_guests || 2,
            ticketInfo: `Eddy Experience - ${updatedBooking.number_of_guests || 2} guests`,
            qrCodeImage: qrCodeImage?.externalUrl || qrCodeImage?.base64 || qrCodeImage,
            venueAddress: venueData?.address || 'Address not available',
            venuePhone: venueData?.contact_phone || 'Contact not available',
            customerPhone: formData.phone || 'N/A'
          }
        }
      });

      if (emailError) {
        throw emailError;
      }

      customerEmailResult = true;
      console.log('✅ Customer confirmation email sent successfully after payment');
    } catch (customerEmailError) {
      console.error('❌ Customer confirmation email failed after payment:', customerEmailError);
      customerEmailResult = false;
    }

    // Send venue owner notification email using the same pattern as Paystack (working configuration)
    if (shouldSendVenueOwnerEmail) {
      try {
        console.log('📧 Sending venue owner notification for Stripe single payment...');
        console.log('📧 Final venue owner email:', venueOwnerEmail);
        
        // Prepare email data with all required fields for the Edge Function (same as Paystack)
        const venueEmailData = {
          venueName: venueData?.name || 'Venue',
          customerName: formData.fullName,
          customerEmail: formData.email,
          customerPhone: formData.phone || 'N/A',
          bookingDate: new Date(updatedBooking.booking_date).toLocaleDateString(),
          bookingTime: bookingTime,
          guestCount: updatedBooking.number_of_guests || 2,
          totalAmount: Number(updatedBooking.total_amount || 0),
          bookingId: updatedBooking.id,
          tableNumber: tableNumber,
          tableInfo: tableNumber !== 'N/A' ? `Table ${tableNumber}` : 'Table not specified',
          ownerEmail: venueOwnerEmail !== 'info@oneeddy.com' ? venueOwnerEmail : '', // Empty string if placeholder, so Edge Function will look it up
          venueId: venueId // Required for Edge Function to look up venue owner if ownerEmail is missing
        };
        
        console.log('📧 Venue owner email data:', {
          ownerEmail: venueEmailData.ownerEmail,
          venueId: venueEmailData.venueId,
          venueName: venueEmailData.venueName
        });
        
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const venueOwnerResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: venueOwnerEmail, // Still include in 'to' field as fallback
            template: 'venue-owner-booking-notification',
            subject: `New Booking - ${venueData?.name || 'Venue'}`,
            data: venueEmailData
          }),
        });

        if (venueOwnerResponse.ok) {
          console.log('✅ Venue owner notification sent successfully');
        } else {
          const error = await venueOwnerResponse.json();
          console.error('⚠️ Venue owner email failed:', error);
        }
      } catch (error) {
        console.error('⚠️ Error sending venue owner email:', error);
      }
    } else {
      console.warn('⚠️ Skipping venue owner email - no valid email found (placeholder or empty)');
    }

      setShowConfirmation(true);
    } catch (error) {
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

if (isDepositFlow && depositAmount) {
return depositAmount.toFixed(2);
}
  
if (!selection && !bookingData) return 0;

// Handle new booking modal format vs old format
let basePrice = 0;
if (selection?.isFromModal || bookingData?.isFromModal) {
  // New format from booking modal - try all possible locations for table price
  basePrice = selection?.selectedTable?.price || 
              selection?.table?.price || 
              bookingData?.selectedTable?.price || 
              bookingData?.table?.price || 
              50;
} else {
  // Old format - check both selection and bookingData
  basePrice = (selection?.ticket?.price || 0) + 
              (selection?.table?.price || 0) + 
              (bookingData?.table?.price || 0);
}


let total = basePrice + 25; // 25 is service fee
if (vipPerks.includes("10% Discount Applied")) {
total *= 0.9; // Apply 10% discount
}


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
return getFullUrl(`/split-payment/${id}/${index + 1}/${amount}`);
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

  // Update the loading check to include bookingData
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

  // Update the selection check to include bookingData
  if (!selection && !bookingData) {
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

              {/* Show loading state while detecting location */}
              {locationLoading ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="animate-pulse">
                    <p className="text-blue-800 mb-2">🔍 Detecting your location...</p>
                    <p className="text-sm text-blue-700">This will only take a moment</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Show payment processor info */}
                  <div className={`border rounded-lg p-4 mb-6 ${
                    paymentProcessor === 'paystack' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${
                          paymentProcessor === 'paystack' 
                            ? 'text-green-800' 
                            : 'text-purple-800'
                        }`}>
                          {paymentProcessor === 'paystack' 
                            ? '🇳🇬 Paystack Payment (NGN)' 
                            : `💳 Stripe Payment (${userLocation?.currency || 'EUR'})`}
                          {userLocation?.isTest && (
                            <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                              🧪 TEST MODE
                            </span>
                          )}
                        </p>
                        <p className={`text-sm ${
                          paymentProcessor === 'paystack' 
                            ? 'text-green-700' 
                            : 'text-purple-700'
                        }`}>
                          {paymentProcessor === 'paystack' 
                            ? 'Using Paystack for secure Nigerian payments' 
                            : 'Using Stripe for secure international payments'}
                        </p>
                      </div>
                      {/* Test Location Override Button - Always show for testing payment processors */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLocationOverride(!showLocationOverride)}
                        className="text-xs"
                      >
                        {showLocationOverride ? 'Hide' : '🧪 Test Location'}
                      </Button>
                    </div>
                    
                    {/* Location Override Panel */}
                    {showLocationOverride && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold mb-2 text-gray-700">Test Location Override:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationOverride('nigeria')}
                            className="text-xs"
                          >
                            🇳🇬 Nigeria (Paystack)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationOverride('uk')}
                            className="text-xs"
                          >
                            🇬🇧 UK (Stripe)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationOverride('usa')}
                            className="text-xs"
                          >
                            🇺🇸 USA (Stripe)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationOverride('europe')}
                            className="text-xs"
                          >
                            🇪🇺 Europe (Stripe)
                          </Button>
                        </div>
                        {userLocation?.isTest && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationOverride('clear')}
                            className="text-xs mt-2 w-full"
                          >
                            Clear Override (Use Auto-Detect)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <Tabs defaultValue="single" className="w-full mb-6">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="single">Single Payment</TabsTrigger>
                      <TabsTrigger value="split">Split Payment</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single">
                      {paymentProcessor === 'paystack' ? (
                        <PaystackCheckoutForm
                          formData={formData}
                          handleInputChange={handleInputChange}
                          isSubmitting={isSubmitting}
                          totalAmount={calculateTotal()}
                          isAuthenticated={!!user}
                          errors={errors}
                          onPaymentInitiate={async (paymentData) => {
                            console.log('🇳🇬 Paystack payment initiated from CheckoutPage:', paymentData);
                            setIsSubmitting(true);
                            try {
                              // Create a pending booking first
                              console.log('📝 Creating pending booking for Paystack payment...');
                              const venueId = selection?.venue?.id || selection?.venueId || selection?.id;
                              const tableId = selection?.table?.id || selection?.selectedTable?.id || selection?.tableId;
                              
                              if (!venueId) {
                                throw new Error('Venue ID is required');
                              }

                              const { data: pendingBooking, error: bookingError } = await supabase
                                .from('bookings')
                                .insert([{
                                  user_id: user?.id,
                                  venue_id: venueId,
                                  table_id: tableId,
                                  booking_date: selection?.date || new Date().toISOString().split('T')[0],
                                  start_time: selection?.time || '19:00',
                                  end_time: selection?.endTime || '23:00',
                                  number_of_guests: parseInt(selection?.guests) || parseInt(selection?.guestCount) || 2,
                                  status: 'pending',
                                  total_amount: paymentData.amount
                                }])
                                .select('id')
                                .single();

                              if (bookingError || !pendingBooking) {
                                throw new Error(`Failed to create booking: ${bookingError?.message}`);
                              }

                              console.log('✅ Pending booking created:', pendingBooking.id);

                              // Prepare booking data with the created booking ID
                              const bookingDataForPaystack = {
                                ...(selection || bookingData),
                                bookingId: pendingBooking.id,
                                venueId: venueId,
                                venueName: selection?.venue?.name || 'Venue',
                                bookingDate: selection?.date,
                                startTime: selection?.time,
                                endTime: selection?.endTime,
                                guestCount: selection?.guests || 2
                              };

                              // Initiate Paystack payment
                              const result = await initiatePaystackPayment({
                                email: paymentData.email,
                                fullName: paymentData.fullName,
                                phone: paymentData.phone,
                                amount: paymentData.amount,
                                bookingData: bookingDataForPaystack,
                                userId: user?.id
                              });

                              console.log('✅ Payment initiated successfully, redirecting to Paystack...');

                              // Redirect to Paystack authorization URL
                              const authUrl = result.data?.authorization_url || result.authorizationUrl;
                              if (authUrl) {
                                window.location.href = authUrl;
                              } else {
                                console.error('❌ Missing auth URL in response:', result);
                                throw new Error('No authorization URL returned from Paystack');
                              }
                            } catch (error) {
                              console.error('❌ Paystack payment initiation error:', error);
                              setIsSubmitting(false);
                              toast({
                                title: 'Payment Error',
                                description: error instanceof Error ? error.message : 'Failed to initiate payment',
                                variant: 'destructive'
                              });
                            }
                          }}
                        />
                      ) : stripePromise !== null ? (
                        <Elements stripe={stripePromise} options={{ locale: 'en' }}>
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
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <p className="text-yellow-800 mb-2">⚠️ Stripe payment is not configured</p>
                          <p className="text-sm text-yellow-700">Please set VITE_STRIPE_TEST_PUBLISHABLE_KEY in your environment variables.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="split">
                      {paymentProcessor === 'paystack' ? (
                        <SplitPaymentCheckoutForm
                          totalAmount={calculateTotal()}
                          venueId={selection?.venue?.id || selection?.venueId || selection?.id}
                          venueName={selection?.venue?.name || 'Venue'}
                          bookingData={selection || bookingData}
                          userEmail={user?.email}
                          userPhone={formData.phone}
                          userName={formData.fullName}
                          onPaymentInitiate={async (paymentData) => {
                            console.log('🇳🇬 Paystack split payment initiated from CheckoutPage:', paymentData);
                            setIsSubmitting(true);
                            try {
                              // Create a pending booking first
                              console.log('📝 Creating pending booking for Paystack split payment...');
                              const venueId = selection?.venue?.id || selection?.venueId || selection?.id;
                              const tableId = selection?.table?.id || selection?.selectedTable?.id || selection?.tableId;
                              
                              if (!venueId) {
                                throw new Error('Venue ID is required');
                              }

                              const { data: pendingBooking, error: bookingError } = await supabase
                                .from('bookings')
                                .insert([{
                                  user_id: user?.id,
                                  venue_id: venueId,
                                  table_id: tableId,
                                  booking_date: selection?.date || new Date().toISOString().split('T')[0],
                                  start_time: selection?.time || '19:00',
                                  end_time: selection?.endTime || '23:00',
                                  number_of_guests: parseInt(selection?.guests) || parseInt(selection?.guestCount) || 2,
                                  status: 'pending',
                                  total_amount: paymentData.amount
                                }])
                                .select('id')
                                .single();

                              if (bookingError || !pendingBooking) {
                                throw new Error(`Failed to create booking: ${bookingError?.message}`);
                              }

                              console.log('✅ Pending booking created:', pendingBooking.id);

                              // Create split payment requests for each recipient
                              console.log('📝 Creating split payment requests for recipients...');
                              const splitRequests = [];
                              for (const recipient of paymentData.splitRecipients) {
                                // Look up recipient's user ID from their email
                                console.log(`🔍 Looking up recipient with email: ${recipient.email}`);
                                let recipientUserId = null;
                                try {
                                  const { data: recipientProfile, error: profileError } = await supabase
                                    .from('profiles')
                                    .select('id')
                                    .eq('email', recipient.email)
                                    .single();
                                  
                                  console.log(`📋 Lookup result for ${recipient.email}:`, { recipientProfile, profileError });
                                  
                                  if (profileError) {
                                    console.warn(`⚠️ Could not find user for email ${recipient.email}:`, profileError);
                                  } else if (recipientProfile) {
                                    recipientUserId = recipientProfile.id;
                                    console.log(`✅ Found recipient ID for ${recipient.email}:`, recipientUserId);
                                  }
                                } catch (err) {
                                  console.warn(`⚠️ Error looking up recipient:`, err);
                                }
                                
                                const { data: splitRequest, error: splitError } = await supabase
                                  .from('split_payment_requests')
                                  .insert([{
                                    booking_id: pendingBooking.id,
                                    recipient_email: recipient.email,
                                    recipient_phone: recipient.phone,
                                    amount: recipient.amount,
                                    status: 'pending',
                                    requester_id: user?.id,
                                    recipient_id: recipientUserId // Populate if found, otherwise null
                                  }])
                                  .select('id')
                                  .single();

                                if (splitError) {
                                  console.error('❌ Error creating split request:', splitError);
                                  throw new Error(`Failed to create split request: ${splitError.message}`);
                                }

                                splitRequests.push(splitRequest);
                              }

                              console.log('✅ Split payment requests created:', splitRequests.length);

                              // Create a split payment request for the initiator as well
                              console.log('📝 Creating split payment request for initiator...');
                              const { data: initiatorRequest, error: initiatorError } = await supabase
                                .from('split_payment_requests')
                                .insert([{
                                  booking_id: pendingBooking.id,
                                  recipient_email: paymentData.email,
                                  recipient_phone: paymentData.phone,
                                  amount: paymentData.amount,
                                  status: 'pending',
                                  requester_id: user?.id,
                                  recipient_id: user?.id // Initiator is also a recipient of their own request
                                }])
                                .select('id')
                                .single();

                              if (initiatorError) {
                                console.error('❌ Error creating initiator request:', initiatorError);
                                throw new Error(`Failed to create initiator request: ${initiatorError.message}`);
                              }

                              console.log('✅ Initiator split payment request created:', initiatorRequest.id);
                              splitRequests.unshift(initiatorRequest); // Add to beginning so it's used as primary

                              // Send emails to recipients asking them to pay their share
                              console.log('📧 Sending split payment request emails to recipients...');
                              console.log(`📧 Recipients count: ${paymentData.splitRecipients?.length || 0}`);
                              console.log(`📧 Split requests count: ${splitRequests.length}`);
                              console.log(`📧 Split requests: ${JSON.stringify(splitRequests.map(r => ({ id: r?.id })))}`);
                              
                              // Validate that we have the right number of requests (initiator + recipients)
                              if (splitRequests.length < paymentData.splitRecipients.length + 1) {
                                console.error('❌ Mismatch: Split requests count does not match recipients count', {
                                  splitRequestsCount: splitRequests.length,
                                  recipientsCount: paymentData.splitRecipients.length,
                                  expectedTotal: paymentData.splitRecipients.length + 1
                                });
                              }
                              
                              for (let i = 0; i < paymentData.splitRecipients.length; i++) {
                                const recipient = paymentData.splitRecipients[i];
                                // splitRequests[0] is the initiator, so recipients start at index 1
                                const recipientRequestId = splitRequests[i + 1]?.id;
                                
                                if (!recipientRequestId) {
                                  console.error(`❌ Missing request ID for recipient ${i + 1} (${recipient.email})`, {
                                    recipientIndex: i,
                                    splitRequestsLength: splitRequests.length,
                                    splitRequests: splitRequests.map((r, idx) => ({ index: idx, id: r?.id }))
                                  });
                                  // Continue to next recipient but log the error
                                  continue;
                                }
                                
                                const paymentLink = getFullUrl(`/split-payment/${pendingBooking.id}/${recipientRequestId}`);
                                
                                console.log(`📧 Sending email to recipient ${i + 1}:`, {
                                  email: recipient.email,
                                  name: recipient.name,
                                  amount: recipient.amount,
                                  requestId: recipientRequestId,
                                  paymentLink,
                                  bookingId: pendingBooking.id
                                });
                                
                                try {
                                  const emailPayload = {
                                    to: recipient.email,
                                    template: 'split-payment-request',
                                    subject: `Split Payment Request - ${selection?.venue?.name || 'Venue'}`,
                                    data: {
                                      recipientName: recipient.name,
                                      initiatorName: paymentData.fullName,
                                      venueName: selection?.venue?.name || 'Venue',
                                      bookingDate: selection?.date,
                                      bookingTime: selection?.time,
                                      amount: recipient.amount,
                                      paymentUrl: paymentLink,
                                      requestId: recipientRequestId,
                                      totalAmount: paymentData.amount
                                      // Explicitly NOT including qrCodeImage or qrCodeUrl - QR codes should only be sent when all payments are complete
                                    }
                                  };
                                  
                                  // Verify QR codes are NOT included
                                  console.log(`📧 DEBUG: Split payment request email data (should NOT have QR codes):`, {
                                    hasQrCodeImage: !!emailPayload.data.qrCodeImage,
                                    hasQrCodeUrl: !!emailPayload.data.qrCodeUrl,
                                    dataKeys: Object.keys(emailPayload.data)
                                  });
                                  
                                  console.log(`📧 Email payload for ${recipient.email}:`, emailPayload);
                                  
                                  const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                    },
                                    body: JSON.stringify(emailPayload)
                                  });

                                  const responseData = await emailResponse.json().catch(() => ({}));
                                  
                                  if (!emailResponse.ok) {
                                    console.error(`❌ Email API error for ${recipient.email}:`, {
                                      status: emailResponse.status,
                                      statusText: emailResponse.statusText,
                                      data: responseData,
                                      emailPayload: emailPayload
                                    });
                                  } else {
                                    console.log(`✅ Split payment request email sent successfully to ${recipient.email}`, {
                                      recipientEmail: recipient.email,
                                      requestId: recipientRequestId,
                                      paymentLink: paymentLink
                                    });
                                  }
                                } catch (emailError) {
                                  console.error(`❌ Failed to send email to ${recipient.email}:`, {
                                    error: emailError,
                                    errorMessage: emailError?.message,
                                    errorStack: emailError?.stack,
                                    recipientEmail: recipient.email,
                                    requestId: recipientRequestId
                                  });
                                }
                              }
                              
                              console.log('📧 Finished sending split payment request emails to all recipients');

                              // Initiate Paystack payment for initiator
                              const result = await initiateSplitPaystackPayment({
                                email: paymentData.email,
                                fullName: paymentData.fullName,
                                phone: paymentData.phone,
                                amount: paymentData.amount,
                                bookingId: pendingBooking.id,
                                requestId: splitRequests[0]?.id, // Use first request as primary
                                userId: user?.id
                              });

                              console.log('✅ Split payment initiated successfully, redirecting to Paystack...');

                              // Redirect to Paystack authorization URL
                              const authUrl = result.data?.authorization_url || result.authorizationUrl;
                              if (authUrl) {
                                window.location.href = authUrl;
                              } else {
                                console.error('❌ Missing auth URL in response:', result);
                                throw new Error('No authorization URL returned from Paystack');
                              }
                            } catch (error) {
                              console.error('❌ Paystack split payment initiation error:', error);
                              setIsSubmitting(false);
                              toast({
                                title: 'Payment Error',
                                description: error instanceof Error ? error.message : 'Failed to initiate payment',
                                variant: 'destructive'
                              });
                            }
                          }}
                          isLoading={isSubmitting}
                        />
                      ) : stripePromise !== null ? (
                        <Elements stripe={stripePromise} options={{ locale: 'en' }}>
                          <SplitPaymentForm
                            totalAmount={parseFloat(calculateTotal())}
                            user={user}
                            bookingId={null}
                            createBookingIfNeeded={createBooking}
                          />
                        </Elements>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <p className="text-yellow-800 mb-2">⚠️ Stripe payment is not configured</p>
                          <p className="text-sm text-yellow-700">Please set VITE_STRIPE_TEST_PUBLISHABLE_KEY in your environment variables.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
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
                <div className="mb-2">
                  Your booking at <span className="font-bold">{(selection || bookingData)?.venue?.name}</span> has been confirmed.
                </div>
                {vipPerks.length > 0 && (
                  <div className="my-2 text-sm text-green-400">
                    <div className="font-semibold">VIP Perks Applied:</div>
                    <ul className="list-disc list-inside">
                      {vipPerks.map(perk => <li key={perk}>{perk}</li>)}
                    </ul>
                  </div>
                )}
                <div className="text-sm">
                  A confirmation email has been sent to {formData.email}. You can show this email or your ID at the entrance.
                </div>
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
                
                <div className="flex items-start gap-3 bg-brand-gold/10 border border-brand-gold rounded-lg p-4">
                  <Checkbox 
                    id="data-consent"
                    checked={authForm.dataConsent}
                    onCheckedChange={(checked) => setAuthForm(f => ({ ...f, dataConsent: checked }))}
                    className="mt-1"
                  />
                  <Label htmlFor="data-consent" className="text-sm text-brand-burgundy cursor-pointer leading-relaxed">
                    I agree to Eddy collecting and using my personal information (name, email, phone, payment details) for making bookings, processing payments, and managing my account. See our <Link to="/privacy" className="underline font-semibold hover:text-brand-burgundy/80">Privacy Policy</Link> for more details.
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  disabled={authLoading || !authForm.dataConsent} 
                  className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                </Button>
                <div className="text-center text-sm">
                  {authMode === 'login' ? (
                    <button type="button" className="text-brand-gold" onClick={() => { setAuthMode('signup'); setAuthForm(f => ({ ...f, dataConsent: false })); }}>New here? Create an account</button>
                  ) : (
                    <button type="button" className="text-brand-gold" onClick={() => { setAuthMode('login'); setAuthForm(f => ({ ...f, dataConsent: false })); }}>Already have an account? Login</button>
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