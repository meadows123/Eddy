import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Eye, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../components/ui/use-toast';

const BookingList = ({ currentUser }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Get venues owned by current user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', currentUser.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Fetch bookings for these venues with related data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
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

      if (bookingsError) throw bookingsError;

      // Fetch user profiles separately to handle potential missing profiles
      const userIds = bookingsData?.map(b => b.user_id).filter(Boolean) || [];
      let userProfiles = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        profilesData?.forEach(profile => {
          userProfiles[profile.id] = profile;
        });
      }

      // Combine bookings with user profiles
      const bookingsWithProfiles = bookingsData?.map(booking => ({
        ...booking,
        user_profiles: userProfiles[booking.user_id] || null
      })) || [];

      setBookings(bookingsWithProfiles);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
    if (booking.user_profiles) {
      return `${booking.user_profiles.first_name || ''} ${booking.user_profiles.last_name || ''}`.trim();
    }
    // Fallback to localStorage data if available
    return booking.customerName || 'Unknown Customer';
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-brand-burgundy">Recent Bookings</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            onClick={fetchBookings}
          >
            Refresh
          </Button>
          <Button size="sm" className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
            New Booking
          </Button>
        </div>
      </div>

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
                    {booking.start_time} - {booking.end_time}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {booking.venue_tables?.table_number ? `Table ${booking.venue_tables.table_number}` : 'No table assigned'}
              </TableCell>
              <TableCell>
                {booking.number_of_guests}
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
  );
};

export default BookingList; 