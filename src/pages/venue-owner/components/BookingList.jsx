import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const BookingList = ({ currentUser }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ref for cleanup
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
    
    // Cleanup on unmount
    return () => {
      cleanupSubscriptions();
    };
  }, [currentUser]);

  const cleanupSubscriptions = () => {
    if (subscriptionRef.current) {
      console.log('Cleaning up BookingList real-time subscription...');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  };

  const setupRealtimeSubscription = async (venueIds) => {
    // Clean up existing subscription first
    cleanupSubscriptions();

    if (!venueIds || venueIds.length === 0) {
      console.log('No venue IDs provided for BookingList subscription');
      return;
    }

    console.log('Setting up BookingList real-time subscription for venues:', venueIds);

    try {
      // Subscribe to bookings changes for this venue owner's venues
      subscriptionRef.current = supabase
        .channel('booking-list-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'bookings',
            filter: `venue_id=in.(${venueIds.join(',')})` // Filter by venue IDs
          },
          (payload) => {
            console.log('Real-time booking change detected in BookingList:', payload);
            
            // Show notification for new bookings
            if (payload.eventType === 'INSERT') {
              toast({
                title: 'New Booking Received!',
                description: `A new booking has been received`,
                className: 'bg-green-50 border-green-200',
              });
            }
            
            // Refresh data after a short delay to allow DB changes to propagate
            setTimeout(() => {
              fetchBookings(true); // silent refresh
            }, 1000);
          }
        )
        .subscribe((status) => {
          console.log('BookingList subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to BookingList real-time updates');
          }
        });
    } catch (error) {
      console.error('Error setting up BookingList real-time subscription:', error);
    }
  };

  const fetchBookings = async (silentRefresh = false) => {
    try {
      if (!silentRefresh) {
        setLoading(true);
      }
      
      // Get venues owned by current user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', currentUser.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setBookings([]);
        if (!silentRefresh) {
          setLoading(false);
        }
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Set up real-time subscription for these venues (only if not already set up)
      if (!subscriptionRef.current) {
        await setupRealtimeSubscription(venueIds);
      }

      // Fetch bookings for these venues with related data
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
          special_requests,
          created_at,
          updated_at,
          venues (
            id,
            name
          ),
          venue_tables!table_id (
            id,
            table_number
          )
        `)
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('📊 Fetched', bookingsData?.length || 0, 'bookings');
      if (bookingsData && bookingsData.length > 0) {
        console.log('🔍 First booking sample:', {
          id: bookingsData[0].id,
          user_id: bookingsData[0].user_id,
          venue_id: bookingsData[0].venue_id,
          table_id: bookingsData[0].table_id,
          number_of_guests: bookingsData[0].number_of_guests,
          total_amount: bookingsData[0].total_amount,
          venue_tables: bookingsData[0].venue_tables
        });
      }

      // Fetch user profiles for bookings in batches
      const userIds = [...new Set(bookingsData?.map(b => b.user_id))].filter(Boolean);
      const userProfiles = {};
      
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone')
            .in('id', userIds);
          
          if (!profilesError && profiles) {
            profiles.forEach(profile => {
              userProfiles[profile.id] = profile;
            });
            console.log('✅ Successfully fetched profiles for', profiles.length, 'users');
          } else if (profilesError) {
            console.warn('⚠️ Could not fetch profiles:', profilesError);
          }
        } catch (error) {
          console.warn('⚠️ Error fetching profiles:', error);
        }
      }

      // Attach user profile data to bookings
      const bookingsWithProfiles = bookingsData?.map(booking => ({
        ...booking,
        profiles: userProfiles[booking.user_id] || null
      })) || [];

      // Debug: Log the first booking to see the data structure
      if (bookingsWithProfiles.length > 0) {
        console.log('🔍 Sample booking data structure:', bookingsWithProfiles[0]);
        console.log('🔍 Available fields:', Object.keys(bookingsWithProfiles[0]));
      }

      setBookings(bookingsWithProfiles);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (!silentRefresh) {
        toast({
          title: 'Error',
          description: 'Failed to load bookings',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      toast({
        title: 'Success',
        description: `Booking ${newStatus} successfully`,
        className: 'bg-green-500 text-white'
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
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

  const formatCustomerName = (booking) => {
    if (booking.profiles) {
      const firstName = booking.profiles.first_name || '';
      const lastName = booking.profiles.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Unknown Customer';
    }
    // Fallback to user_id if no profile data
    return `Customer ${booking.user_id?.substring(0, 8)}...` || 'Unknown Customer';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center p-8">
        <p className="text-brand-burgundy/70">No bookings found.</p>
      </div>
    );
  }

  // Mobile-optimized booking card component
  const BookingCard = ({ booking }) => (
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
                  {format(new Date(booking.booking_date), 'PPP')} at {booking.start_time || 'N/A'} - {booking.end_time || 'N/A'}
                </p>
                <p className="text-xs sm:text-sm text-brand-burgundy/60">
                  {booking.number_of_guests || 'N/A'} guest{booking.number_of_guests && booking.number_of_guests !== 1 ? 's' : ''} • {booking.venue_tables?.table_number ? `Table ${booking.venue_tables.table_number}` : 'N/A'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-bold text-brand-gold text-sm sm:text-base">
                  ₦{(booking.total_amount || 0).toLocaleString()}
                </div>
                <Badge className={`mt-1 ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </Badge>
              </div>
            </div>
            
            {booking.special_requests && (
              <div className="mt-3 p-2 bg-brand-cream/30 rounded text-xs sm:text-sm text-brand-burgundy/70">
                <strong>Special Requests:</strong> {booking.special_requests}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/10 w-full sm:w-auto"
              onClick={() => {
                // Handle view details
                console.log('View booking details:', booking.id);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">View</span>
            </Button>
            
            {booking.status === 'pending' && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-600 hover:bg-green-50 flex-1 sm:flex-none"
                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Accept</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                >
                  <X className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Decline</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header with responsive buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <h3 className="text-lg font-semibold text-brand-burgundy">Recent Bookings</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            onClick={fetchBookings}
          >
            <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {formatCustomerName(booking)}
                </TableCell>
                <TableCell>
                  <div>
                    <div>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</div>
                    <div className="text-sm text-brand-burgundy/60">
                      {booking.start_time || 'N/A'} - {booking.end_time || 'N/A'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {booking.venue_tables?.table_number ? `Table ${booking.venue_tables.table_number}` : 'N/A'}
                </TableCell>
                <TableCell>
                  {booking.number_of_guests || 'N/A'}
                </TableCell>
                <TableCell>
                  ₦{(booking.total_amount || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {booking.status === 'pending' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 hover:text-blue-700"
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                        title="Mark as completed"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-2">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  );
};

export default BookingList; 