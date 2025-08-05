import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin, Star, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const BookingModal = ({ isOpen, onClose, venue }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
    if (isOpen && venue) {
      fetchTables();
    }
  }, [isOpen, venue]);

  const fetchTables = async () => {
    if (!venue?.id) return;
    
    setLoading(true);
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .from('venue_tables')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('status', 'available')
        .order('capacity');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
      }

      setTables(tablesData || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
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
      venueId: venue.id,
      venueName: venue.name,
      venueImage: venue.images?.[0],
      venueLocation: venue.city,
      ...bookingDetails,
      selectedTable: tables.find(t => t.id === bookingDetails.tableId)
    };

    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    onClose(); // Close modal
    navigate('/checkout'); // Navigate to checkout
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getSelectedTable = () => {
    return tables.find(t => t.id === bookingDetails.tableId);
  };

  const resetForm = () => {
    setBookingDetails({
      date: '',
      time: '',
      guests: '2',
      tableId: '',
      specialRequests: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!venue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto bg-brand-cream">
        <DialogHeader className="border-b border-brand-burgundy/10 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-brand-burgundy">
              Book Your Table
            </DialogTitle>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-brand-burgundy/70 hover:text-brand-burgundy hover:bg-brand-burgundy/5"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                    <span>{venue.city}</span>
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
          <div className="space-y-4">
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
            {loading ? (
              <div className="text-center py-4 text-brand-burgundy/70">
                Loading tables...
              </div>
            ) : tables.length > 0 ? (
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
                        Table {table.table_number} (Capacity: {table.capacity} guests) - ${table.price_per_hour || 50}/hour
                        {table.table_type && ` • ${table.table_type}`}
                        {table.minimum_spend && ` • Min spend: $${table.minimum_spend}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-4 text-brand-burgundy/70 bg-brand-gold/5 rounded-lg">
                <p>No tables available at this venue.</p>
                <p className="text-sm">You can still proceed to make a general booking.</p>
              </div>
            )}

            {/* Special Requests */}
            <div>
              <Label htmlFor="requests" className="text-brand-burgundy mb-2 block">
                Special Requests (Optional)
              </Label>
              <Input
                id="requests"
                placeholder="Any special requirements..."
                value={bookingDetails.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                className="border-brand-burgundy/30 focus:border-brand-gold"
              />
            </div>
          </div>

          {/* Booking Summary */}
          {(bookingDetails.date || bookingDetails.time || bookingDetails.guests) && (
            <Card className="border-brand-burgundy/10 bg-brand-gold/5">
              <CardHeader>
                <CardTitle className="text-brand-burgundy flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-brand-gold" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {bookingDetails.date && (
                  <div className="flex justify-between">
                    <span className="text-brand-burgundy/70">Date:</span>
                    <span className="text-brand-burgundy font-medium">
                      {new Date(bookingDetails.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
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
                  <>
                    <div className="flex justify-between">
                      <span className="text-brand-burgundy/70">Table:</span>
                      <span className="text-brand-burgundy font-medium">
                        Table {getSelectedTable().table_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-burgundy/70">Price:</span>
                      <span className="text-brand-burgundy font-medium">
                        ${getSelectedTable().price_per_hour || 50}/hour
                      </span>
                    </div>
                    {getSelectedTable().minimum_spend && (
                      <div className="flex justify-between">
                        <span className="text-brand-burgundy/70">Min Spend:</span>
                        <span className="text-brand-burgundy font-medium">
                          ${getSelectedTable().minimum_spend}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Total Cost Summary */}
                {(getSelectedTable() || (!getSelectedTable() && bookingDetails.date && bookingDetails.time)) && (
                  <div className="pt-2 border-t border-brand-burgundy/10">
                    <div className="flex justify-between font-semibold text-brand-burgundy">
                      <span>Estimated Total:</span>
                      <span>${getSelectedTable() ? (getSelectedTable().price_per_hour || 50) : 50} + service fees</span>
                    </div>
                    <p className="text-xs text-brand-burgundy/60 mt-1">
                      *Final pricing will be confirmed at checkout
                    </p>
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

          {/* Continue Button */}
          <Button 
            className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 h-12 text-base font-medium"
            onClick={proceedToCheckout}
            disabled={!bookingDetails.date || !bookingDetails.time}
          >
            Continue to Checkout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;