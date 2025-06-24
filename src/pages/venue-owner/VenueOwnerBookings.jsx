import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import BookingList from './components/BookingList';
import { supabase } from '../../lib/supabase';

const VenueOwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBookings([]);
        setLoading(false);
        return;
      }
      // Fetch bookings for venues owned by this user
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', user.id);
      setBookings(data || []);
      setLoading(false);
    };
    fetchBookings();
  }, []);

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Bookings</h1>
            <p className="text-brand-burgundy/70">Manage your venue bookings</p>
          </div>
        </div>

        <Card className="bg-white border-brand-burgundy/10">
          <CardContent className="pt-6">
            <BookingList bookings={bookings} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerBookings; 