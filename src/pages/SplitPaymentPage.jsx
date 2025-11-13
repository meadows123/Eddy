import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, User, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { stripePromise } from '@/lib/stripe';
import { useAuth } from '@/contexts/AuthContext';
import { getBaseUrl } from '@/lib/urlUtils';
import { getUserLocationWithFallback, getLocationFromSession, storeLocationInSession } from '@/lib/locationService';
import { initiateSplitPaystackPayment } from '@/lib/paystackSplitPaymentHandler';
import PaystackSplitPaymentForm from '@/components/checkout/PaystackSplitPaymentForm';
import UserSearchForm from '@/components/split-payment/UserSearchForm';

// Payment form component
const PaymentForm = ({ amount, onSuccess, recipientEmail = '', recipientName = '', recipientPhone = '' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState(recipientEmail);
  const [fullName, setFullName] = useState(recipientName);
  const [phone, setPhone] = useState(recipientPhone);
  const [dataConsent, setDataConsent] = useState(false);

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name');
      return false;
    }

    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
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
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (stripeError) {
        throw stripeError;
      }

      // Call your payment processing function here
      await onSuccess(paymentMethod.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-brand-burgundy">Complete Your Split Payment</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount Display */}
          <div className="bg-brand-gold/10 border-2 border-brand-gold rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-brand-burgundy">
              ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="stripe-email" className="text-brand-burgundy font-semibold">
              Email Address
            </Label>
            <Input
              id="stripe-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={processing}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="stripe-name" className="text-brand-burgundy font-semibold">
              Full Name
            </Label>
            <Input
              id="stripe-name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={processing}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="stripe-phone" className="text-brand-burgundy font-semibold">
              Phone Number
            </Label>
            <Input
              id="stripe-phone"
              type="tel"
              placeholder="+234 123 456 7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={processing}
              className="mt-2 border-brand-burgundy/30 focus:border-brand-burgundy"
              required
            />
          </div>

          {/* Card Details */}
          <div>
            <Label htmlFor="card-element" className="text-brand-burgundy font-semibold">
              Card Details
            </Label>
            <div className="p-4 border border-brand-burgundy/30 rounded-lg mt-2">
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
                }}
              />
            </div>
          </div>

          {/* Data Consent Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="stripe-consent"
              checked={dataConsent}
              onCheckedChange={setDataConsent}
              disabled={processing}
            />
            <Label htmlFor="stripe-consent" className="text-sm cursor-pointer">
              I agree to the{' '}
              <Link to="/privacy-policy" className="text-brand-burgundy hover:underline">
                data privacy policy
              </Link>
            </Label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={processing || !stripe}
            className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${amount.toLocaleString()}`
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};

// Main component
const SplitPaymentPage = () => {

  // First, let's see what's happening in the component
  const { bookingId, requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [paymentProcessor, setPaymentProcessor] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedSplitUser, setSelectedSplitUser] = useState(null);
  const [pageMode, setPageMode] = useState(null); // 'search', 'payment', or null for loading

  // Add debug logs to trace the auth state

  // Check if user is authenticated (only after loading is complete)
  useEffect(() => {
    // Don't redirect if still loading
    if (authLoading) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to initiate or complete a split payment.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    // Determine page mode based on URL parameters
    if (bookingId && requestId) {
      // User received a split payment request
      console.log('📋 Viewing existing split payment request');
      setPageMode('payment');
    } else {
      // User is initiating a new split payment
      console.log('🔍 User initiating new split payment - showing user search');
      setPageMode('search');
    }

    setLoading(false);
  }, [user, authLoading, navigate, toast, bookingId, requestId]);

  // Location detection for payment processor
  useEffect(() => {
    const detectLocation = async () => {
      try {
        setLocationLoading(true);
        console.log('Getting user location for split payment...');
        
        const location = await getUserLocationWithFallback();
        console.log('User location detected:', location);
        
        setUserLocation(location);
        storeLocationInSession(location);
        
        // Determine processor: Nigeria = Paystack, Others = Stripe
        if (location.country?.toLowerCase() === 'ng' || location.currency === 'NGN') {
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

  useEffect(() => {
    if (bookingId && requestId && user) {
      fetchPaymentRequest();
    } else if (bookingId && requestId) {
      console.error('❌ Missing required parameters:', { bookingId, requestId });
      toast({
        title: "Invalid Link",
        description: "This payment link is invalid or incomplete.",
        variant: "destructive"
      });
      navigate('/profile');
    }
  }, [bookingId, requestId, user]);

  const fetchPaymentRequest = async () => {
    try {
      setLoading(true);

      // Handle special case for initiator
      if (requestId === 'initiator') {
        
        // For initiator, we need to fetch the booking directly and create a mock payment request
        
        // Try a simpler query first without joins to see if booking exists
        const { data: simpleBooking, error: simpleError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();
          
        
        if (simpleError || !simpleBooking) {
          console.error('❌ Booking not found with simple query:', { simpleError, simpleBooking });
          throw new Error('Booking not found');
        }
        
        // Now get venue and user data separately
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('name, address, city')
          .eq('id', simpleBooking.venue_id)
          .single();
          
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', simpleBooking.user_id)
          .single();
          
        
        // Combine the data
        const bookingData = {
          ...simpleBooking,
          venues: venueData || { name: 'Unknown Venue', address: 'Lagos', city: 'Lagos' },
          profiles: userData || { first_name: 'User', last_name: '' }
        };
        

        // Use the combined booking data
        const finalBookingData = bookingData;

        // Create a mock payment request for the initiator
        const mockRequest = {
          id: 'initiator',
          booking_id: bookingId,
          requester_id: bookingData.user_id,
          recipient_id: bookingData.user_id,
          amount: 0, // Initiator doesn't need to pay
          status: 'paid',
          created_at: new Date().toISOString()
        };

        setPaymentRequest(mockRequest);
        setBooking(finalBookingData);
        setVenue(finalBookingData.venues);
        
        
        setLoading(false);
        return;
      }

      // Fetch the payment request for regular recipients
      const { data: requestData, error: requestError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId)
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (requestError) {
        console.error('❌ Error fetching payment request:', requestError);
        console.error('🔍 Lookup details:', { requestId, bookingId });
        
        // Try to find any split payment request with this ID to debug
        const { data: debugData, error: debugError } = await supabase
          .from('split_payment_requests')
          .select('*')
          .eq('id', requestId);
        
        if (debugError) {
          console.error('❌ Debug lookup also failed:', debugError);
        } else if (debugData && debugData.length > 0) {
        } else {
        }
        
        // Run comprehensive debug
        await debugDatabaseState();
        
        throw requestError;
      }

      if (!requestData) {
        console.error('❌ Split payment request not found');
        throw new Error('Split payment request not found');
      }


      // Check if the current user is the intended recipient
      if (requestData.recipient_id && requestData.recipient_id !== user?.id) {
        toast({
          title: "Access Denied",
          description: "This payment request is not intended for you.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      // Check if payment request is already paid or expired
      if (requestData.status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This payment request has already been completed.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      if (requestData.status === 'expired') {
        toast({
          title: "Payment Expired",
          description: "This payment request has expired.",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }

      // First get the split payment request
      const { data: bookingData, error: bookingError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (bookingError) {
        console.error('❌ Error fetching split payment request:', bookingError);
        throw new Error(`Split payment request not found: ${bookingError.message}`);
      }

      if (!bookingData) {
        console.error('❌ Split payment request not found');
        throw new Error('Split payment request not found');
      }

      // Fetch requester profile separately
      if (bookingData.requester_id) {
        console.log('�� Current user ID:', user?.id);
        
        const { data: requesterProfile, error: requesterError } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', bookingData.requester_id)
          .single();


        if (!requesterError && requesterProfile) {
          bookingData.requester_profile = requesterProfile;
        } else {
          console.error('❌ Error fetching requester profile:', requesterError);
          console.error('❌ This might be an RLS policy issue - user cannot access other user profiles');
        }
      } else {
        console.error('❌ No requester_id found in bookingData');
      }

      // Then fetch the booking details separately
      let actualBookingData = null;
      if (bookingData?.booking_id) {
        const { data: booking, error: bookingFetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            venues (
              name,
              address,
              city,
              contact_email,
              contact_phone
            )
          `)
          .eq('id', bookingData.booking_id)
          .maybeSingle(); // Use maybeSingle() to handle missing bookings gracefully

        
        if (!bookingFetchError && booking) {
          actualBookingData = booking;
        } else {
          console.error('❌ Error fetching booking details:', bookingFetchError);
          console.error('🔍 Booking ID:', bookingData.booking_id);
          
          // Try to find the booking without any joins to debug
          
          const { data: simpleBooking, error: simpleBookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingData.booking_id)
            .maybeSingle();
          
          
          // Test query to see if we can fetch any bookings
          const { data: testBookings, error: testError } = await supabase
            .from('bookings')
            .select('id, user_id, created_at')
            .limit(3);
          
          
          if (!simpleBookingError && simpleBooking) {
            actualBookingData = simpleBooking;
          } else if (simpleBookingError) {
            console.error('🔍 Booking query error:', simpleBookingError);
          } else {
            console.error('🔍 Booking does not exist in database');
            console.error('🔍 This split payment request references a non-existent booking');
          }
        }
      }


      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
        // Don't throw here, just log the error
      }

      // Set venue data from the booking data (already fetched)
      if (actualBookingData?.venues) {
        const venueData = actualBookingData.venues;
        setVenue({
          id: actualBookingData.venue_id,
          name: venueData.name || 'Venue Name Not Available',
          address: venueData.address || 'Address Not Available',
          city: venueData.city || 'City Not Available',
          contact_phone: venueData.contact_phone || 'N/A',
          contact_email: venueData.contact_email || 'N/A',
          type: 'Restaurant', // Default type
          description: 'Venue details from booking'
        });
      } else if (actualBookingData?.venue_id) {
        // If we have booking data but no venue join, fetch venue separately
        await fetchVenueData(actualBookingData.venue_id);
      } else if (bookingData?.bookings?.venues) {
        const venueData = bookingData.bookings.venues;
        setVenue({
          id: bookingData.bookings.venue_id,
          name: venueData.name || 'Venue Name Not Available',
          address: venueData.address || 'Address Not Available',
          city: venueData.city || 'City Not Available',
          contact_phone: venueData.contact_phone || 'N/A',
          contact_email: venueData.contact_email || 'N/A',
          type: 'Restaurant', // Default type
          description: 'Venue details from booking'
        });
      } else {
        
        // Fallback if no venue data - booking doesn't exist
        setVenue({
          name: 'Booking Not Found',
          address: 'This booking may have been cancelled or deleted',
          city: 'Unknown',
          type: 'Unknown',
          description: 'The booking associated with this payment request could not be found. Please contact the person who sent you this payment request for more information.',
          contact_phone: 'N/A',
          contact_email: 'N/A'
        });
      }

      // Set the state
      setPaymentRequest(bookingData);
      setBooking(actualBookingData || {});


    } catch (error) {
      console.error('❌ Error in fetchPaymentRequest:', error);
      toast({
        title: "Error",
        description: "Failed to load payment request. Please check the link.",
        variant: "destructive"
      });
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  // Separate function to fetch venue data
  const fetchVenueData = async (venueId) => {
    try {
      
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, name, address, city, type, description, contact_phone, contact_email')
        .eq('id', venueId)
        .maybeSingle();

      if (!venueError && venue) {
        setVenue(venue);
      } else {
        console.error('❌ Error fetching venue data:', venueError);
        // Set a fallback venue object with basic info
        setVenue({
          name: 'Venue Information Unavailable',
          address: 'Location details not available',
          city: 'Unknown',
          type: 'Unknown',
          description: 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.',
          contact_phone: 'N/A',
          contact_email: 'N/A'
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchVenueData:', error);
      setVenue({
        name: 'Venue Information Unavailable',
        address: 'Location details not available',
        city: 'Unknown',
        type: 'Unknown',
        description: 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.',
        contact_phone: 'N/A',
        contact_email: 'N/A'
      });
    }
  };

  // Debug function to check database state
  const debugDatabaseState = async () => {
    
    // Check all split payment requests
    const { data: allRequests, error: allRequestsError } = await supabase
      .from('split_payment_requests')
      .select('*')
      .limit(10);
    
    if (allRequestsError) {
      console.error('❌ Error fetching all requests:', allRequestsError);
    } else {
    }
    
    // Check specific request ID
    if (requestId && requestId !== 'initiator') {
      const { data: specificRequest, error: specificError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId);
      
      if (specificError) {
        console.error('❌ Error fetching specific request:', specificError);
      } else {
      }
    }
    
    // Check bookings
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            name,
            address,
            city,
            contact_email,
            contact_phone
          ),
          venue_tables!inner(id.eq.table_id) (
            table_number
          )
        `)
        .eq('id', bookingId);
      
      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
      } else {
      }
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Update split payment request status
      const { error: updateError } = await supabase
        .from('split_payment_requests')
        .update({ 
          status: 'paid',
          stripe_payment_id: paymentIntent.id,
          paid_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);

      if (updateError) throw updateError;

      // Navigate to success page
      navigate(`/split-payment-success?payment_intent=${paymentIntent.id}&request_id=${paymentRequest.id}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Payment successful but failed to update status. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!paymentRequest) {
    return (
      <div className="container py-20 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-4">Payment Request Not Found</h2>
        <p className="text-muted-foreground mb-6">The payment link may be invalid or expired.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  // Don't show payment form for initiator
  if (paymentRequest?.id === 'initiator') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container py-10">
          <Link to="/profile" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Complete</h1>
                <p className="text-gray-600">You've already paid your portion of this booking.</p>
              </div>

              {/* Venue Information */}
              {venue && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Venue Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-brand-burgundy">
                            {venue.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {venue.address && venue.city ? `${venue.address}, ${venue.city}` : 'Location details not available'}
                          </p>
                          {venue.type && venue.type !== 'Unknown' && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2">Initiator</Badge>
                      </div>
                      
                      {/* Additional venue details */}
                      {venue.name !== 'Venue Information Unavailable' && (
                        <div className="mt-3 pt-3 border-t border-brand-gold/20">
                          {venue.description && venue.description !== 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.' && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {venue.description}
                            </p>
                          )}
                          <div className="grid grid-cols-1 gap-3 text-xs">
                            {venue.contact_phone && venue.contact_phone !== 'N/A' && (
                              <div>
                                <span className="font-medium text-brand-burgundy">Contact:</span>
                                <span className="ml-1">{venue.contact_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Table Information */}
                      {booking?.table?.table_number ? (
                        <div className="mt-3 pt-3 border-t border-brand-gold/20">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="font-semibold text-blue-800 mb-2">Table Details</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-blue-700">Table Number:</span>
                                <span className="ml-1 text-blue-600">{booking.table.table_number}</span>
                              </div>
                              {booking?.number_of_guests && (
                                <div>
                                  <span className="font-medium text-blue-700">Party Size:</span>
                                  <span className="ml-1 text-blue-600">{booking.number_of_guests} guests</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Show helpful message when venue info is unavailable */}
                      {venue.name === 'Venue Information Unavailable' && (
                        <div className="mt-3 pt-3 border-t border-brand-gold/20">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>Note:</strong> Venue details could not be loaded. This might be because:
                            </p>
                            <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside space-y-1">
                              <li>The venue has been removed or updated</li>
                              <li>There was an issue loading the venue information</li>
                              <li>The booking was created with incomplete venue data</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <Label className="text-muted-foreground">Booking Date</Label>
                          <p className="font-medium">
                            {booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Your Amount</Label>
                          <p className="font-medium text-green-600">₦0.00 (Paid)</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-center">
                <Link to="/profile">
                  <Button className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90">
                    Back to Profile
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (pageMode === null || locationLoading) {
    return (
      <div className="container py-20 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 text-brand-burgundy animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show user search form for initiating new split payments
  if (pageMode === 'search') {
    return (
      <div className="container py-10 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-3xl font-bold mb-6 flex items-center">
                <CreditCard className="h-8 w-8 mr-2 text-brand-burgundy" />
                Initiate Split Payment
              </h1>

              {/* Signed In Status */}
              {user && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800">Signed in as {user.email}</p>
                      <p className="text-sm text-green-700">Your account details will be auto-populated</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* User Search Form */}
              <UserSearchForm
                currentUserId={user?.id}
                onUserSelected={(selectedUser) => {
                  console.log('✅ User selected for split payment:', selectedUser);
                  setSelectedSplitUser(selectedUser);
                  toast({
                    title: 'User Selected',
                    description: `Ready to split payment with ${selectedUser.first_name} ${selectedUser.last_name}`,
                    className: 'bg-green-500 text-white'
                  });
                }}
                isLoading={processing}
              />

              {/* Selected User Details */}
              {selectedSplitUser && (
                <Card className="p-6 border-brand-burgundy/30 bg-brand-cream/30">
                  <h3 className="text-lg font-semibold text-brand-burgundy mb-4">
                    Splitting with: {selectedSplitUser.first_name} {selectedSplitUser.last_name}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedSplitUser.email}</span>
                    </div>
                    {selectedSplitUser.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{selectedSplitUser.phone}</span>
                      </div>
                    )}
                    {(selectedSplitUser.city || selectedSplitUser.country) && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">
                          {[selectedSplitUser.city, selectedSplitUser.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar - User Info */}
            <div>
              <Card className="p-6 bg-blue-50 border-blue-200 sticky top-4">
                <h3 className="font-semibold text-blue-900 mb-4">Your Account</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Name</p>
                    <p className="text-blue-600">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Email</p>
                    <p className="text-blue-600 break-all">{user?.email || 'Loading...'}</p>
                  </div>
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600">
                      ✅ Your details will be used as the primary payer for this split payment
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Split Payment Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-brand-burgundy">
                      {venue?.name || 'Venue Information Unavailable'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {venue?.address && venue?.city ? `${venue.address}, ${venue.city}` : 'Location details not available'}
                    </p>
                    {venue?.type && venue.type !== 'Unknown' && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-2">Split Payment</Badge>
                </div>
                
                {/* Additional venue details */}
                {venue && venue.name !== 'Venue Information Unavailable' && (
                  <div className="mt-3 pt-3 border-t border-brand-gold/20">
                    {venue.description && venue.description !== 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.' && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {venue.description}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 text-xs">
                      {venue.contact_phone && venue.contact_phone !== 'N/A' && (
                        <div>
                          <span className="font-medium text-brand-burgundy">Contact:</span>
                          <span className="ml-1">{venue.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show helpful message when venue info is unavailable */}
                {venue && venue.name === 'Venue Information Unavailable' && (
                  <div className="mt-3 pt-3 border-t border-brand-gold/20">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Venue details could not be loaded. This might be because:
                      </p>
                      <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside space-y-1">
                        <li>The venue has been removed or updated</li>
                        <li>There was an issue loading the venue information</li>
                        <li>The booking was created with incomplete venue data</li>
                      </ul>
                      <p className="text-xs text-yellow-700 mt-2">
                        Please contact the person who sent you this payment request for venue details.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <Label className="text-muted-foreground">Requested by</Label>
                    <p className="font-medium">
                      {paymentRequest.requester_id ? 
                        `${paymentRequest.requester_profile?.first_name || ''} ${paymentRequest.requester_profile?.last_name || ''}`.trim() || 
                        paymentRequest.requester_profile?.phone || 
                        'Unknown User'
                      : 'A friend'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Booking Date</Label>
                    <p className="font-medium">
                      {booking?.booking_date ? 
                        new Date(booking.booking_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 
                        new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric'
                        })
                      }
                    </p>
                  </div>
                  {booking?.table?.table_number && (
                    <div>
                      <Label className="text-muted-foreground">Table</Label>
                      <p className="font-medium">
                        {booking.table.table_number}
                      </p>
                    </div>
                  )}
                  {booking?.number_of_guests && (
                    <div>
                      <Label className="text-muted-foreground">Party Size</Label>
                      <p className="font-medium">
                        {booking.number_of_guests} guests
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center py-6">
                <div className="text-3xl font-bold text-brand-burgundy mb-2">
                  ₦{(paymentRequest.amount || 0).toLocaleString()}
                </div>
                <p className="text-muted-foreground">Your portion of the split payment</p>
                {!paymentRequest.amount && (
                  <p className="text-sm text-red-500 mt-2">Warning: Invalid payment amount</p>
                )}
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Requested by: {paymentRequest.requester_profile ? 
                    `${paymentRequest.requester_profile.first_name} ${paymentRequest.requester_profile.last_name}`.trim() || 
                    paymentRequest.requester_profile.phone || 
                    'Unknown User'
                    : 'Unknown User'}
                  </p>
                  <p>Booking ID: {paymentRequest.booking_id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {locationLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-brand-burgundy" />
                <p>Loading payment method...</p>
              </div>
            ) : paymentProcessor === 'paystack' ? (
              <PaystackSplitPaymentForm
                amount={paymentRequest.amount}
                recipientEmail={paymentRequest.recipient_email}
                recipientName={paymentRequest.recipient_name}
                recipientPhone={paymentRequest.recipient_phone}
                requestId={paymentRequest.id}
                bookingId={paymentRequest.booking_id}
                onSubmit={async (paymentData) => {
                  try {
                    setProcessing(true);
                    console.log('🇳🇬 Paystack split payment initiated:', paymentData);

                    const result = await initiateSplitPaystackPayment({
                      email: paymentData.email,
                      fullName: paymentData.fullName,
                      phone: paymentData.phone,
                      amount: paymentData.amount,
                      requestId: paymentData.requestId,
                      bookingId: paymentData.bookingId,
                      userId: user?.id
                    });

                    console.log('✅ Payment initiated, redirecting to Paystack...');

                    if (result.authorizationUrl) {
                      window.location.href = result.authorizationUrl;
                    } else {
                      throw new Error('No authorization URL returned');
                    }
                  } catch (error) {
                    console.error('❌ Paystack payment error:', error);
                    setProcessing(false);
                    toast({
                      title: 'Payment Error',
                      description: error.message || 'Failed to initiate payment',
                      variant: 'destructive'
                    });
                  }
                }}
                isLoading={processing}
              />
            ) : (
              <Elements stripe={stripePromise}>
                <PaymentForm 
                  amount={paymentRequest.amount}
                  recipientEmail={paymentRequest.recipient_email}
                  recipientName={paymentRequest.recipient_name}
                  recipientPhone={paymentRequest.recipient_phone}
                  onSuccess={async (paymentMethodId) => {
                    try {
                      setProcessing(true);
                      
                      // Create payment intent using the Edge Function
                      const response = await fetch(
                        'https://agydpkzfucicraedllgl.supabase.co/functions/v1/create-split-payment-intent',
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                          },
                          body: JSON.stringify({
                            amount: paymentRequest.amount,
                            paymentMethodId,
                            bookingId: paymentRequest.booking_id,
                            splitRequests: [paymentRequest],
                            email: paymentRequest.recipient_email || user?.email || '',
                            bookingType: 'split',
                            isInitiatorPayment: false
                          })
                        }
                      );

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to create payment intent');
                      }

                      const { clientSecret, paymentIntentId } = await response.json();

                      // Load Stripe and confirm payment
                      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY);
                      if (!stripe) {
                        throw new Error('Failed to load Stripe');
                      }

                      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
                        payment_method: paymentMethodId
                      });
                      if (confirmError) {
                        throw new Error(`Payment failed: ${confirmError.message}`);
                      }

                      // Payment successful - update the payment request status
                      const { error: updateError } = await supabase
                        .from('split_payment_requests')
                        .update({ 
                          status: 'paid',
                          paid_at: new Date().toISOString(),
                          stripe_payment_id: paymentIntentId || 'manual_payment'
                        })
                        .eq('id', paymentRequest.id);

                      if (updateError) {
                        console.error('Error updating payment status:', updateError);
                      }

                      // Check if all split payments for this booking are now paid
                      const { data: allRequests, error: checkError } = await supabase
                        .from('split_payment_requests')
                        .select('status')
                        .eq('booking_id', paymentRequest.booking_id);

                      if (!checkError && allRequests) {
                        // Check if all requests are paid
                        const allRequestsPaid = allRequests.every(req => req.status === 'paid');
                        
                        if (allRequestsPaid) {
                          // Update booking status to confirmed when all split payments are complete
                          await supabase
                            .from('bookings')
                            .update({ status: 'confirmed' })
                            .eq('id', paymentRequest.booking_id);
                        }
                      }

                      // Show success message and redirect
                      toast({
                        title: "Payment Successful!",
                        description: `Your portion (₦${paymentRequest.amount.toLocaleString()}) has been paid successfully. The booking will be confirmed once all split payments are complete.`,
                        className: "bg-green-500 text-white"
                      });

                      // Navigate to success page
                      navigate(`/split-payment-success?payment_intent=success&request_id=${paymentRequest.id}`);

                    } catch (error) {
                      console.error('Payment error:', error);
                      toast({
                        title: "Payment Failed",
                        description: error.message || "Failed to process payment. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setProcessing(false);
                    }
                  }} 
                />
              </Elements>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SplitPaymentPage; 