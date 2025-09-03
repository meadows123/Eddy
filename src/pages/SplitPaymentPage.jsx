import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, User, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
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

// Payment form component
const PaymentForm = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
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
      <Button 
        type="submit" 
        disabled={processing || !stripe}
        className="w-full bg-brand-burgundy text-white"
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
      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
};

// Main component
const SplitPaymentPage = () => {
  const { bookingId, requestId } = useParams();
  console.log('🔍 Split Payment Params:', { bookingId, requestId });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      console.log('❌ User not authenticated, redirecting to profile');
      toast({
        title: "Authentication Required",
        description: "Please log in to complete this payment.",
        variant: "destructive"
      });
      navigate('/profile');
      return;
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    console.log('🔍 SplitPaymentPage useEffect triggered with:', { bookingId, requestId, user });
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
        console.log('🔍 Handling initiator request for booking:', bookingId);
        
        // For initiator, we need to fetch the booking directly and create a mock payment request
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('❌ Error fetching booking for initiator:', bookingError);
          throw new Error('Booking not found');
        }

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
        setBooking(bookingData);
        
        // Fetch venue data
        if (bookingData.venue_id) {
          await fetchVenueData(bookingData.venue_id);
        }
        
        setLoading(false);
        return;
      }

      // Fetch the payment request for regular recipients
      const { data: requestData, error: requestError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId)
        .eq('booking_id', bookingId)
        .single();

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
          console.log('🔍 Found split payment request but booking_id mismatch:', debugData[0]);
          console.log('🔍 Expected booking_id:', bookingId);
          console.log('🔍 Actual booking_id:', debugData[0].booking_id);
        } else {
          console.log('🔍 No split payment request found with ID:', requestId);
        }
        
        // Run comprehensive debug
        await debugDatabaseState();
        
        throw requestError;
      }

      console.log('✅ Payment request found:', requestData);

      // Check if the current user is the intended recipient
      if (requestData.recipient_id && requestData.recipient_id !== user?.id) {
        console.log('❌ User not authorized for this payment request');
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

      // Fetch booking data through the split payment request to avoid RLS issues
      const { data: bookingData, error: bookingError } = await supabase
        .from('split_payment_requests')
        .select(`
          *,
          bookings (
            *,
            venues (
              name,
              address,
              city,
              contact_email,
              contact_phone
            ),
            venue_tables!table_id (
              table_number
            )
          )
        `)
        .eq('id', requestId)
        .single();

      // Extract the booking data from the nested structure
      const actualBookingData = bookingData?.bookings;
      
      console.log('📋 Booking data fetch result:', { 
        bookingData, 
        bookingError,
        hasBookings: !!actualBookingData,
        hasVenue: !!actualBookingData?.venues,
        hasTable: !!actualBookingData?.venue_tables
      });

      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
        // Don't throw here, just log the error
      }

      // Set venue data from the booking data (already fetched)
      if (actualBookingData?.venues) {
        setVenue({
          id: actualBookingData.venue_id,
          name: actualBookingData.venues.name || 'Venue Name Not Available',
          address: actualBookingData.venues.address || 'Address Not Available',
          city: actualBookingData.venues.city || 'City Not Available',
          contact_phone: actualBookingData.venues.contact_phone || 'N/A',
          contact_email: actualBookingData.venues.contact_email || 'N/A',
          type: 'Restaurant', // Default type
          description: 'Venue details from booking',
          price_range: 'N/A'
        });
      } else {
        // Fallback if no venue data
        setVenue({
          name: 'Venue Information Unavailable',
          address: 'Location details not available',
          city: 'Unknown',
          type: 'Unknown',
          description: 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.',
          price_range: 'Unknown',
          contact_phone: 'N/A',
          contact_email: 'N/A'
        });
      }

      // Set the state
      setPaymentRequest(requestData);
      setBooking(actualBookingData || {});

      console.log('✅ All data loaded successfully:', {
        paymentRequest: requestData,
        booking: actualBookingData,
        venue: actualBookingData?.venues,
        'booking.venue_id': actualBookingData?.venue_id,
        'booking.table_id': actualBookingData?.table_id,
        'booking.table_name': actualBookingData?.table_name,
        'booking.table_number': actualBookingData?.table_number
      });

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
      console.log('🔍 Fetching venue data for venue_id:', venueId);
      
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, name, address, city, type, description, price_range, contact_phone, contact_email')
        .eq('id', venueId)
        .single();

      if (!venueError && venue) {
        setVenue(venue);
        console.log('✅ Venue data fetched successfully:', venue);
      } else {
        console.error('❌ Error fetching venue data:', venueError);
        // Set a fallback venue object with basic info
        setVenue({
          name: 'Venue Information Unavailable',
          address: 'Location details not available',
          city: 'Unknown',
          type: 'Unknown',
          description: 'Venue details could not be loaded. Please contact the person who sent you this payment request for more information.',
          price_range: 'Unknown',
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
        price_range: 'Unknown',
        contact_phone: 'N/A',
        contact_email: 'N/A'
      });
    }
  };

  // Debug function to check database state
  const debugDatabaseState = async () => {
    console.log('🔍 Debugging database state...');
    
    // Check all split payment requests
    const { data: allRequests, error: allRequestsError } = await supabase
      .from('split_payment_requests')
      .select('*')
      .limit(10);
    
    if (allRequestsError) {
      console.error('❌ Error fetching all requests:', allRequestsError);
    } else {
      console.log('🔍 All split payment requests:', allRequests);
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
        console.log('🔍 Specific request lookup:', specificRequest);
      }
    }
    
    // Check bookings
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId);
      
      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
      } else {
        console.log('🔍 Booking lookup:', booking);
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
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {venue.price_range && venue.price_range !== 'Unknown' && (
                              <div>
                                <span className="font-medium text-brand-burgundy">Price Range:</span>
                                <span className="ml-1">{venue.price_range}</span>
                              </div>
                            )}
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
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {venue.price_range && venue.price_range !== 'Unknown' && (
                        <div>
                          <span className="font-medium text-brand-burgundy">Price Range:</span>
                          <span className="ml-1">{venue.price_range}</span>
                        </div>
                      )}
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
                      {paymentRequest.requester_id ? `User ${paymentRequest.requester_id.slice(0, 8)}...` : 'Unknown User'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Booking Date</Label>
                    <p className="font-medium">
                      {booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                  {booking?.start_time && (
                    <div>
                      <Label className="text-muted-foreground">Booking Time</Label>
                      <p className="font-medium">
                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
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
                  <p>Requested by: {paymentRequest.requester_id ? `User ${paymentRequest.requester_id.slice(0, 8)}...` : 'Unknown User'}</p>
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
            <Elements stripe={stripePromise}>
              <PaymentForm 
                amount={paymentRequest.amount} 
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

                    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SplitPaymentPage; 