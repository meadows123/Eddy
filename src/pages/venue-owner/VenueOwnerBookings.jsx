import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import BookingList from './components/BookingList';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const VenueOwnerBookings = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

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
            <BookingList currentUser={currentUser} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerBookings; 