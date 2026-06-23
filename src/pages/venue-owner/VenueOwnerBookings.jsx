import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AlertTriangle } from 'lucide-react';
import BookingList from './components/BookingList';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../components/ui/use-toast';

const VenueOwnerBookings = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
      fetchBookings();
    }
  }, [currentUser]);

  const fetchBookings = async () => {
    try {
      if (!currentUser?.id) return;

      // Get venues owned by current user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', currentUser.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setBookings([]);
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Fetch bookings for these venues
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          venue_id,
          table_id,
          booking_date,
          start_time,
          end_time,
          number_of_guests,
          total_amount,
          status,
          created_at,
          updated_at,
          venues (
            id,
            name
          )
        `)
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch user profiles for bookings
      const userIds = [...new Set(bookingsData?.map(b => b.user_id))].filter(Boolean);
      const userProfiles = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .in('id', userIds);
        
        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            userProfiles[profile.id] = profile;
          });
        }
      }

      // Attach user profile data to bookings
      const bookingsWithProfiles = bookingsData?.map(booking => ({
        ...booking,
        profiles: userProfiles[booking.user_id] || null
      })) || [];

      setBookings(bookingsWithProfiles);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive'
      });
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
          reason: 'venue_owner_cancellation'
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
          title: "Booking Cancelled & Refunded",
          description: `The booking has been cancelled and ₦${(data.amount_refunded / 100).toLocaleString()} will be refunded to the customer within 5-10 business days.`,
          className: "bg-green-500 text-white"
        });
      } else {
        toast({
          title: "Booking Cancelled",
          description: "The booking has been cancelled successfully.",
          className: "bg-green-500 text-white"
        });
      }
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  const formatCustomerName = (booking) => {
    if (booking.profiles) {
      const firstName = booking.profiles.first_name || '';
      const lastName = booking.profiles.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Unknown Customer';
    }
    return `Customer ${booking.user_id?.substring(0, 8)}...` || 'Unknown Customer';
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

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-2">Bookings Management</h1>
            <p className="text-sm sm:text-base text-brand-burgundy/70">View and manage all your venue bookings</p>
          </div>
        </div>

        <Card className="bg-white border-brand-burgundy/10">
          <CardContent className="p-4 sm:pt-6">
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="border-brand-burgundy/10 hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div>
                            <h4 className="font-semibold text-brand-burgundy text-sm sm:text-base">
                              {formatCustomerName(booking)}
                            </h4>
                            <p className="text-xs sm:text-sm text-brand-burgundy/60">
                              {new Date(booking.booking_date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })} at {booking.start_time || 'N/A'} - {booking.end_time || 'N/A'}
                            </p>
                            <p className="text-xs sm:text-sm text-brand-burgundy/60">
                              {booking.number_of_guests || 'N/A'} guest{booking.number_of_guests && booking.number_of_guests !== 1 ? 's' : ''} • {booking.table_id ? `Table ID: ${booking.table_id}` : 'No table assigned'}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-bold text-brand-gold text-sm sm:text-base">
                              ₦{(booking.total_amount || 0).toLocaleString()}
                            </div>
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <Button
                            onClick={() => cancelBooking(booking.id)}
                            variant="outline"
                            className="text-red-500 border-red-500 hover:bg-red-50 w-full sm:w-auto"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Cancel & Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {bookings.length === 0 && (
                <div className="text-center p-8">
                  <p className="text-brand-burgundy/70">No bookings found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerBookings; 