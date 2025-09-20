import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { toast } from '../components/ui/use-toast';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthAndFetchBookings();
  }, []);

  const checkAuthAndFetchBookings = async () => {
    try {
      // Check if user is authenticated
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);
      await fetchUserBookings(currentUser.id);
    } catch (error) {
      console.error('Error checking auth:', error);
      setLoading(false);
    }
  };

  const fetchUserBookings = async (userId) => {
    try {
      setLoading(true);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            city,
            type
          ),
          venue_tables!table_id (
            id,
            table_number
          )
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your bookings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      // Get booking details first
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');
      
      // Check refund eligibility
      const now = new Date();
      const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`);
      const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilBooking < 24) {
        toast({
          title: "Limited Cancellation Options",
          description: "For bookings within 24 hours, please contact our support team for assistance with cancellation.",
          variant: "destructive"
        });
        return;
      }
      
      // Process automatic refund
      const { data, error } = await supabase.functions.invoke('process-booking-refund', {
        body: { 
          bookingId,
          reason: 'customer_cancellation'
        }
      });
      
      if (error) throw error;
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { 
                ...booking, 
                status: 'cancelled',
                refund_status: data.refunded ? 'refunded' : 'no_payment'
              }
            : booking
        )
      );
      
      if (data.refunded) {
        toast({
          title: 'Booking Cancelled & Refunded',
          description: `Your ₦${(data.amount_refunded / 100).toLocaleString()} refund will appear in your account within 5-10 business days.`,
          className: 'bg-green-500 text-white'
        });
      } else {
        toast({
          title: 'Booking Cancelled',
          description: 'Your booking has been cancelled successfully.',
          className: 'bg-green-500 text-white'
        });
      }
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel booking. Please contact support.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="container py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-heading text-brand-burgundy mb-4">My Bookings</h1>
            <p className="text-brand-burgundy/70 mb-6">Please log in to view your bookings.</p>
            <Button 
              onClick={() => window.location.href = '/register'}
              className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
            >
              Log In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-heading text-brand-burgundy">My Bookings</h1>
            <Button 
              onClick={() => fetchUserBookings(user.id)}
              variant="outline"
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              Refresh
            </Button>
          </div>

          {bookings.length === 0 ? (
            <Card className="bg-white border-brand-burgundy/10 text-center p-8">
              <CardContent>
                <h2 className="text-xl font-semibold text-brand-burgundy mb-4">No Bookings Yet</h2>
                <p className="text-brand-burgundy/70 mb-6">
                  You haven't made any bookings yet. Start exploring our venues!
                </p>
                <Button 
                  onClick={() => window.location.href = '/venues'}
                  className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                >
                  Browse Venues
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="bg-white border-brand-burgundy/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl font-semibold text-brand-burgundy">
                      {booking.venues?.name || 'Unknown Venue'}
                    </CardTitle>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-brand-burgundy/70">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(booking.booking_date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center text-brand-burgundy/70">
                          <Clock className="h-4 w-4 mr-2" />
                          {booking.start_time} - {booking.end_time}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-brand-burgundy/70">
                          <MapPin className="h-4 w-4 mr-2" />
                          {booking.venues?.city || 'Unknown Location'}
                        </div>
                        <div className="flex items-center text-brand-burgundy/70">
                          <Users className="h-4 w-4 mr-2" />
                          {booking.number_of_guests} {booking.number_of_guests === 1 ? 'Guest' : 'Guests'}
                        </div>
                      </div>
                    </div>
                    
                    {booking.venue_tables && (
                      <div className="mt-4 pt-4 border-t border-brand-burgundy/10">
                        <p className="text-sm text-brand-burgundy/70">Table: {booking.venue_tables.table_number}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-brand-burgundy/10">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-brand-burgundy/70">Total Amount</p>
                          <p className="text-lg font-semibold text-brand-burgundy">
                            ₦{(booking.total_amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                            onClick={() => {
                              // Could navigate to a booking detail page
                              toast({
                                title: 'Booking Details',
                                description: `Booking ID: ${booking.id}`,
                              });
                            }}
                          >
                            View Details
                          </Button>
                          {(booking.status === 'confirmed' || booking.status === 'pending') && (
                            <Button
                              onClick={async () => {
                                // Check if eligible for refund
                                const now = new Date();
                                const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`);
                                const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                                
                                if (hoursUntilBooking < 24) {
                                  toast({
                                    title: "Cancellation Not Available",
                                    description: "Cancellations with refund are only available 24+ hours before your booking. Please contact support for assistance.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                try {
                                  // Call the refund edge function
                                  const { data, error } = await supabase.functions.invoke('process-booking-refund', {
                                    body: { 
                                      bookingId: booking.id,
                                      reason: 'customer_cancellation'
                                    }
                                  });
                                  
                                  if (error) throw error;
                                  
                                  if (data.refunded) {
                                    toast({
                                      title: "Booking Cancelled & Refunded",
                                      description: `Your booking has been cancelled and ₦${(data.amount_refunded / 100).toLocaleString()} will be refunded to your card within 5-10 business days.`,
                                      className: "bg-green-500 text-white"
                                    });
                                  } else {
                                    toast({
                                      title: "Booking Cancelled",
                                      description: "Your booking has been cancelled successfully.",
                                      className: "bg-green-500 text-white"
                                    });
                                  }
                                  
                                  // Update local state
                                  setBookings(prev => 
                                    prev.map(b => 
                                      b.id === booking.id 
                                        ? { ...b, status: 'cancelled', refund_status: data.refunded ? 'refunded' : 'no_payment' }
                                        : b
                                    )
                                  );
                                  
                                } catch (error) {
                                  console.error('Error processing cancellation:', error);
                                  toast({
                                    title: "Cancellation Failed",
                                    description: error.message || "Failed to cancel booking. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              variant="outline"
                              className="mt-2 text-red-500 border-red-500 hover:bg-red-50"
                            >
                              Cancel & Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsPage; 