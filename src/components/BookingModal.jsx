import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, AlertCircle, User, Mail, Phone, Lock } from 'lucide-react';
import { checkTableAvailability, getAvailableTables } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const BookingModal = ({ isOpen, onClose, venue }) => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  // State for booking form
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(2);
  
  // State for availability checking
  const [availableTables, setAvailableTables] = useState([]);
  const [timeAvailability, setTimeAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Authentication modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Authentication functions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        });
        if (error) throw error;
        
        toast({
          title: "Logged in successfully!",
          description: "You can now proceed with your booking",
          className: "bg-green-500 text-white"
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.fullName,
              phone: authForm.phone
            }
          }
        });
        if (error) throw error;
        
        toast({
          title: "Account created successfully!",
          description: "You can now proceed with your booking",
          className: "bg-green-500 text-white"
        });
      }

      // Close auth modal and proceed to checkout
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', fullName: '', phone: '' });
      
      // Wait a moment for auth state to update, then proceed
      setTimeout(() => {
        continueToCheckout();
      }, 500);

    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthInputChange = (field, value) => {
    setAuthForm(prev => ({ ...prev, [field]: value }));
    if (authError) setAuthError(''); // Clear error when user types
  };

  // Load available tables when modal opens
  useEffect(() => {
    if (isOpen && venue?.id) {
      loadAvailableTables();
    }
  }, [isOpen, venue?.id]);

  // Check availability when date or table changes
  useEffect(() => {
    if (selectedDate && selectedTable) {
      checkAvailability();
    }
  }, [selectedDate, selectedTable]);

  const loadAvailableTables = async () => {
    try {
      const { data, error } = await getAvailableTables(venue.id);
      if (error) throw error;
      setAvailableTables(data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
      setErrorMessage('Failed to load available tables');
    }
  };

  const checkAvailability = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await checkTableAvailability(venue.id, selectedTable.id, selectedDate);
      if (error) throw error;
      
      setTimeAvailability(data || []);
    } catch (error) {
      console.error('Error checking availability:', error);
      setTimeAvailability([]);
      setErrorMessage('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setErrorMessage('');
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setSelectedTime('');
    setErrorMessage('');
  };

  const handleTimeSelect = (timeSlot) => {
    if (timeSlot.available) {
      setSelectedTime(timeSlot.time);
      setErrorMessage('');
    } else {
      setErrorMessage(`Sorry, ${timeSlot.time} is not available. This time slot has already been booked.`);
      setSelectedTime('');
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleContinueToCheckout = () => {
    if (!selectedDate || !selectedTime || !selectedTable) {
      setErrorMessage('Please select date, time, and table');
      return;
    }

    // Check if user is authenticated before proceeding to checkout
    if (!user) {
      console.log('🔐 User not authenticated, showing auth modal');
      setShowAuthModal(true);
      return;
    }

    console.log('✅ User authenticated, proceeding to checkout');
    continueToCheckout();
  };

  const continueToCheckout = () => {
    // Prepare the booking data
    const bookingData = {
      venue: venue,
      table: selectedTable,
      date: selectedDate,
      time: selectedTime,
      endTime: calculateEndTime(selectedTime),
      guestCount: guestCount
    };

    console.log('🚀 About to navigate to checkout with data:', bookingData);
    console.log('📍 Current location:', window.location.href);
    console.log('📋 Data structure check:', {
      venue: !!bookingData.venue,
      venueId: bookingData.venue?.id,
      table: !!bookingData.table,
      tableId: bookingData.table?.id,
      date: !!bookingData.date,
      time: !!bookingData.time,
      endTime: !!bookingData.endTime,
      guestCount: bookingData.guestCount
    });

    // Navigate FIRST, then close modal
    console.log('🧭 Navigating to /checkout...');
    navigate(`/checkout/${venue?.id}`, {
      state: bookingData,
      replace: true
    });
    
    console.log('✅ Navigation call completed');
    
    // Close the modal after navigation
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const calculateEndTime = (startTime) => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(start.getTime() + 4 * 60 * 60000); // 4 hours later
    return end.toTimeString().slice(0, 5);
  };

  const getAvailableCount = () => {
    return timeAvailability.filter(slot => slot.available).length;
  };

  const getTotalCount = () => {
    return timeAvailability.length;
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-burgundy">
            Book Your Table
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 text-sm">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Table Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              <Users className="h-4 w-4 inline mr-2" />
              Select Table
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {availableTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedTable?.id === table.id
                      ? 'border-brand-burgundy bg-brand-burgundy/10 text-brand-burgundy'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-lg">Table {table.table_number}</div>
                  <div className="text-sm text-gray-600">{table.capacity} guests</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          {selectedTable && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                <Calendar className="h-4 w-4 inline mr-2" />
                Select Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-burgundy focus:border-transparent"
              />
            </div>
          )}

          {/* Time Selection */}
          {selectedDate && selectedTable && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                <Clock className="h-4 w-4 inline mr-2" />
                Select Time
              </Label>
              
              {/* Availability Summary */}
              {timeAvailability.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-sm text-blue-700 text-center">
                    <span className="font-semibold">{getAvailableCount()}</span> of <span className="font-semibold">{getTotalCount()}</span> time slots available
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Checking availability...</div>
                </div>
              ) : timeAvailability.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {timeAvailability.map((timeSlot) => {
                    const isSelected = selectedTime === timeSlot.time;
                    return (
                      <button
                        key={timeSlot.time}
                        onClick={() => handleTimeSelect(timeSlot)}
                        className={`p-3 border rounded-lg text-center transition-colors text-sm ${
                          isSelected
                            ? 'border-brand-burgundy bg-brand-burgundy text-white'
                            : timeSlot.available
                            ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!timeSlot.available}
                        title={timeSlot.available ? `Book at ${timeSlot.time}` : timeSlot.reason}
                      >
                        {timeSlot.time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No available times for this date
                </div>
              )}
            </div>
          )}

          {/* Guest Count */}
          {selectedTable && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Number of Guests
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  disabled={guestCount <= 1}
                >
                  -
                </Button>
                <span className="text-lg font-semibold min-w-[3rem] text-center">{guestCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGuestCount(Math.min(selectedTable.capacity, guestCount + 1))}
                  disabled={guestCount >= selectedTable.capacity}
                >
                  +
                </Button>
                <span className="text-sm text-gray-600">Max: {selectedTable.capacity}</span>
              </div>
            </div>
          )}

          {/* Continue to Checkout Button */}
          {selectedDate && selectedTime && selectedTable && (
            <Button
              onClick={handleContinueToCheckout}
              className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90 py-3 text-lg"
            >
              Continue to Checkout
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Authentication Modal */}
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {authMode === 'login' ? 'Log In to Book' : 'Create Account to Book'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={authForm.fullName}
                    onChange={(e) => handleAuthInputChange('fullName', e.target.value)}
                    className="pl-10"
                    required={authMode === 'signup'}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={authForm.email}
                  onChange={(e) => handleAuthInputChange('email', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={authForm.password}
                  onChange={(e) => handleAuthInputChange('password', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={authForm.phone}
                    onChange={(e) => handleAuthInputChange('phone', e.target.value)}
                    className="pl-10"
                    required={authMode === 'signup'}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-brand-burgundy hover:bg-brand-burgundy/90"
              disabled={authLoading}
            >
              {authLoading ? (
                'Processing...'
              ) : (
                authMode === 'login' ? 'Log In & Continue' : 'Create Account & Continue'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm text-brand-burgundy hover:underline"
            >
              {authMode === 'login' 
                ? "Don't have an account? Create one" 
                : "Already have an account? Log in"
              }
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BookingModal;