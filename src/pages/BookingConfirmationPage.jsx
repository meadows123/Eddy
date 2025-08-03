import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Users, MapPin, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const BookingConfirmationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  
  // Booking form state
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '',
    guests: '2',
    tableId: '',
    specialRequests: ''
  });

  // Available time slots
  const timeSlots = [
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', 
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  // Guest count options
  const guestOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchVenueAndTables = async () => {
      setLoading(true);
      try {
        // Fetch venue data
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single();

        if (venueError) throw venueError;

        // Fetch images for this venue
        const { data: imagesData, error: imagesError } = await supabase
          .from('venue_images')
          .select('*')
          .eq('venue_id', id)
          .order('is_primary', { ascending: false });

        if (imagesError) {
          console.error('Error fetching images:', imagesError);
        }

        // Fetch available tables
        const { data: tablesData, error: tablesError } = await supabase
          .from('venue_tables')
          .select('*')
          .eq('venue_id', id)
          .eq('is_active', true)
          .order('capacity');

        if (tablesError) {
          console.error('Error fetching tables:', tablesError);
        }

        setVenue({
          ...venueData,
          images: imagesData?.map(img => img.image_url) || []
        });
        setTables(tablesData || []);
      } catch (error) {
        console.error('Error fetching venue:', error);
        toast({
          title: "Error",
          description: "Failed to load venue details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVenueAndTables();
    }
  }, [id, toast]);

  const handleBack = () => {
    navigate(`/venues/${id}`);
  };

  const handleInputChange = (field, value) => {
    setBookingDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateBooking = () => {
    if (!bookingDetails.date) {
      toast({
        title: "Date Required",
        description: "Please select a date for your booking",
        variant: "destructive"
      });
      return false;
    }

    if (!bookingDetails.time) {
      toast({
        title: "Time Required",
        description: "Please select a time for your booking",
        variant: "destructive"
      });
      return false;
    }

    if (!bookingDetails.tableId && tables.length > 0) {
      toast({
        title: "Table Required",
        description: "Please select a table for your booking",
        variant: "destructive"
      });
      return false;
    }

    // Check if selected date is not in the past
    const selectedDate = new Date(bookingDetails.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: "Invalid Date",
        description: "Please select a future date",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const proceedToCheckout = () => {
    if (!validateBooking()) return;

    // Store booking details in sessionStorage to pass to checkout
    const bookingData = {
      venueId: id,
      venueName: venue.name,
      venueImage: venue.images?.[0],
      venueLocation: venue.location,
      ...bookingDetails,
      selectedTable: tables.find(t => t.id === bookingDetails.tableId)
    };

    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    navigate('/checkout');
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getSelectedTable = () => {
    return tables.find(t => t.id === bookingDetails.tableId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-brand-burgundy">Loading booking details...</div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading text-brand-burgundy mb-4">Venue not found</h2>
          <Button onClick={() => navigate('/venues')} className="bg-brand-burgundy text-brand-cream">
            Back to Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="bg-white border-b border-brand-burgundy/10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="text-brand-burgundy hover:bg-brand-burgundy/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-brand-burgundy">Confirm Your Booking</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Venue Summary */}
        <Card className="border-brand-burgundy/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden">
                <img
                  src={venue.images?.[0] || "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-brand-burgundy">{venue.name}</h2>
                <div className="flex items-center gap-2 text-sm text-brand-burgundy/70">
                  <MapPin className="h-4 w-4" />
                  <span>{venue.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 fill-brand-gold text-brand-gold" />
                  <span className="text-brand-burgundy">{venue.rating}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card className="border-brand-burgundy/10">
          <CardHeader>
            <CardTitle className="text-brand-burgundy">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Selection */}
            <div>
              <Label htmlFor="date" className="text-brand-burgundy mb-2 block">
                <Calendar className="h-4 w-4 inline mr-2" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                min={getMinDate()}
                value={bookingDetails.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="border-brand-burgundy/30 focus:border-brand-gold"
              />
            </div>

            {/* Time Selection */}
            <div>
              <Label htmlFor="time" className="text-brand-burgundy mb-2 block">
                <Clock className="h-4 w-4 inline mr-2" />
                Time
              </Label>
              <Select 
                value={bookingDetails.time} 
                onValueChange={(value) => handleInputChange('time', value)}
              >
                <SelectTrigger className="border-brand-burgundy/30 focus:border-brand-gold">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guest Count */}
            <div>
              <Label htmlFor="guests" className="text-brand-burgundy mb-2 block">
                <Users className="h-4 w-4 inline mr-2" />
                Number of Guests
              </Label>
              <Select 
                value={bookingDetails.guests} 
                onValueChange={(value) => handleInputChange('guests', value)}
              >
                <SelectTrigger className="border-brand-burgundy/30 focus:border-brand-gold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {guestOptions.map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} {count === 1 ? 'guest' : 'guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table Selection */}
            {tables.length > 0 && (
              <div>
                <Label htmlFor="table" className="text-brand-burgundy mb-2 block">
                  Table Selection
                </Label>
                <Select 
                  value={bookingDetails.tableId} 
                  onValueChange={(value) => handleInputChange('tableId', value)}
                >
                  <SelectTrigger className="border-brand-burgundy/30 focus:border-brand-gold">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.table_number} (Capacity: {table.capacity} guests)
                        {table.table_type && ` - ${table.table_type}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Special Requests */}
            <div>
              <Label htmlFor="requests" className="text-brand-burgundy mb-2 block">
                Special Requests (Optional)
              </Label>
              <Input
                id="requests"
                placeholder="Any special requirements or requests..."
                value={bookingDetails.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                className="border-brand-burgundy/30 focus:border-brand-gold"
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
        {(bookingDetails.date || bookingDetails.time || bookingDetails.guests) && (
          <Card className="border-brand-burgundy/10 bg-brand-gold/5">
            <CardHeader>
              <CardTitle className="text-brand-burgundy flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-gold" />
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bookingDetails.date && (
                <div className="flex justify-between">
                  <span className="text-brand-burgundy/70">Date:</span>
                  <span className="text-brand-burgundy font-medium">
                    {new Date(bookingDetails.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {bookingDetails.time && (
                <div className="flex justify-between">
                  <span className="text-brand-burgundy/70">Time:</span>
                  <span className="text-brand-burgundy font-medium">{bookingDetails.time}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-brand-burgundy/70">Guests:</span>
                <span className="text-brand-burgundy font-medium">{bookingDetails.guests}</span>
              </div>
              {getSelectedTable() && (
                <div className="flex justify-between">
                  <span className="text-brand-burgundy/70">Table:</span>
                  <span className="text-brand-burgundy font-medium">
                    Table {getSelectedTable().table_number} (Capacity: {getSelectedTable().capacity})
                  </span>
                </div>
              )}
              {bookingDetails.specialRequests && (
                <div className="pt-2 border-t border-brand-burgundy/10">
                  <span className="text-brand-burgundy/70">Special Requests:</span>
                  <p className="text-brand-burgundy text-sm mt-1">{bookingDetails.specialRequests}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bottom spacing for fixed button */}
        <div className="h-20"></div>
      </div>

      {/* Fixed Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <Button 
          className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 h-12 text-base font-medium"
          onClick={proceedToCheckout}
          disabled={!bookingDetails.date || !bookingDetails.time}
        >
          Continue to Checkout
        </Button>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;