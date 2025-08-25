import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';
import { CreditCard, MapPin, Star, ArrowLeft, Wallet, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const VenueCreditPurchase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userCredits, setUserCredits] = useState([]);

  // Predefined credit amounts
  const creditOptions = [
    { amount: 50, label: '₦50,000', bonus: 0, popular: false },
    { amount: 100, label: '₦100,000', bonus: 10, popular: true },
    { amount: 250, label: '₦250,000', bonus: 35, popular: false },
    { amount: 500, label: '₦500,000', bonus: 75, popular: false },
  ];

  useEffect(() => {
    checkAuthAndFetchData();
    
    // Check if venue is pre-selected from URL params
    const venueId = searchParams.get('venue');
    if (venueId) {
      setSelectedVenue({ id: venueId });
    }
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to purchase venue credits',
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setCurrentUser(user);
      await fetchVenues();
      await fetchUserCredits(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'Failed to authenticate user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      console.log('🔍 Fetching venues for credit purchase...');
      
      // First, let's see what venues exist without filters
      const { data: allVenues, error: allVenuesError } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (allVenuesError) {
        console.error('Error fetching all venues:', allVenuesError);
        throw allVenuesError;
      }

      console.log('📊 All venues found:', allVenues?.length || 0);
      console.log('📋 Venue statuses:', allVenues?.map(v => ({ id: v.id, name: v.name, status: v.status, is_active: v.is_active })));

      // Now apply filters to get venues suitable for credit purchase
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .or(`status.eq.approved,status.eq.active`)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching filtered venues:', error);
        throw error;
      }

      console.log('✅ Filtered venues found:', venuesData?.length || 0);
      console.log('🎯 Venues for credit purchase:', venuesData?.map(v => ({ id: v.id, name: v.name, status: v.status, is_active: v.is_active })));

      // If no venues found, show a helpful message
      if (!venuesData || venuesData.length === 0) {
        console.log('⚠️ No filtered venues found, falling back to all venues');
        
        // Fallback: show all venues with a note about status
        setVenues(allVenues || []);
        
        toast({
          title: 'Limited Venues Available',
          description: 'Some venues may not be fully approved yet. Please contact venue owners for more information.',
          variant: 'default',
        });
      } else {
        setVenues(venuesData);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load venues. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchUserCredits = async (userId) => {
    try {
      const { data: creditsData, error } = await supabase
        .from('venue_credit_transactions')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            type
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('remaining_balance', 0)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserCredits(creditsData || []);
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  };

  const handleVenueSelect = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    setSelectedVenue(venue);
  };

  const handleCreditAmountSelect = (amount) => {
    setCreditAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value) => {
    setCustomAmount(value);
    setCreditAmount('');
  };

  const getTotalAmount = () => {
    const baseAmount = creditAmount || parseFloat(customAmount) || 0;
    const selectedOption = creditOptions.find(opt => opt.amount === creditAmount);
    const bonus = selectedOption ? selectedOption.bonus : 0;
    // Convert to actual naira amount (multiply by 1000 since amounts represent thousands)
    const baseAmountNaira = baseAmount * 1000;
    const bonusNaira = bonus * 1000;
    return baseAmountNaira + bonusNaira;
  };

  const getPurchaseAmount = () => {
    const baseAmount = creditAmount || parseFloat(customAmount) || 0;
    // Convert to actual naira amount (multiply by 1000 since amounts represent thousands)
    return baseAmount * 1000;
  };

  const handlePurchase = async () => {
    if (!selectedVenue) {
      toast({
        title: 'Venue Required',
        description: 'Please select a venue for your credits',
        variant: 'destructive',
      });
      return;
    }

    const purchaseAmount = getPurchaseAmount();
    if (purchaseAmount < 10) {
      toast({
        title: 'Minimum Amount',
        description: 'Minimum credit purchase is ₦10,000',
        variant: 'destructive',
      });
      return;
    }

    // Redirect to checkout page for payment
    navigate('/checkout', {
      state: {
        creditPurchase: true,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        amount: getTotalAmount(),
        purchaseAmount: purchaseAmount,
        venue: selectedVenue
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-brand-cream/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-burgundy/70">Loading venues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mr-4 border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Purchase Venue Credits</h1>
            <p className="text-brand-burgundy/70">Add credits to your favorite venues for seamless bookings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Purchase Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue Selection */}
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Select Venue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedVenue?.id || ''} onValueChange={handleVenueSelect}>
                  <SelectTrigger className="border-brand-burgundy/20">
                    <SelectValue placeholder="Choose a venue for your credits" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{venue.name}</span>
                          <span className="text-sm text-gray-500">• {venue.type}</span>
                          <span className="text-sm text-gray-500">• {venue.city}</span>
                          {venue.status !== 'approved' && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              {venue.status}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {venues.length === 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800 text-sm">
                      No venues are currently available for credit purchase. This could be because:
                    </p>
                    <ul className="text-orange-700 text-sm mt-2 list-disc list-inside">
                      <li>No venues have been created yet</li>
                      <li>All venues are pending approval</li>
                      <li>Venues are not active</li>
                    </ul>
                  </div>
                )}
                
                {venues.length > 0 && (
                  <div className="mt-2 text-xs text-brand-burgundy/60">
                    💡 Venues marked with status badges may not be fully approved yet. Contact venue owners for more information.
                  </div>
                )}
                
                {selectedVenue && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-brand-cream/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-brand-burgundy">{selectedVenue.name}</h4>
                      {selectedVenue.status !== 'approved' && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          Status: {selectedVenue.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-brand-burgundy/70">{selectedVenue.address}</p>
                    <p className="text-sm text-brand-burgundy/70">{selectedVenue.type} • {selectedVenue.city}</p>
                    {selectedVenue.status !== 'approved' && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                        ⚠️ This venue is not fully approved yet. Credit purchases may be subject to approval.
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Credit Amount Selection */}
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Select Credit Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Predefined Amounts */}
                <div className="grid grid-cols-2 gap-4">
                  {creditOptions.map((option) => (
                    <motion.div
                      key={option.amount}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={`cursor-pointer transition-colors relative ${
                          creditAmount === option.amount
                            ? 'border-brand-gold bg-brand-gold/10'
                            : 'border-brand-burgundy/20 hover:border-brand-gold/50'
                        }`}
                        onClick={() => handleCreditAmountSelect(option.amount)}
                      >
                        <CardContent className="p-4 text-center">
                          {option.popular && (
                            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-brand-gold text-brand-burgundy">
                              Popular
                            </Badge>
                          )}
                          <div className="text-lg font-bold text-brand-burgundy">{option.label}</div>
                          {option.bonus > 0 && (
                            <div className="text-sm text-green-600 flex items-center justify-center">
                              <Gift className="h-3 w-3 mr-1" />
                              +₦{option.bonus.toLocaleString()} bonus
                            </div>
                          )}
                          <div className="text-xs text-brand-burgundy/60 mt-1">
                            Total: ₦{(option.amount + option.bonus).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Custom Amount */}
                <div>
                  <Label htmlFor="customAmount" className="text-brand-burgundy">
                    Or enter custom amount (₦)
                  </Label>
                  <Input
                    id="customAmount"
                    type="number"
                    min="10"
                    step="1"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter amount in thousands (min: 10)"
                  />
                  <p className="text-xs text-brand-burgundy/60 mt-1">
                    Custom amounts do not include bonus credits
                  </p>
                </div>

                {/* Total Summary */}
                {(creditAmount || customAmount) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-brand-burgundy/5 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-brand-burgundy">Total Credits:</span>
                      <span className="text-xl font-bold text-brand-burgundy">
                        ₦{getTotalAmount().toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-brand-burgundy/70 mt-1">
                      Purchase amount: ₦{getPurchaseAmount().toLocaleString()}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Button */}
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="p-6">
                <Button
                  onClick={handlePurchase}
                  disabled={!selectedVenue || (!creditAmount && !customAmount) || processing}
                  className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90 py-3"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase Credits - ₦{getPurchaseAmount().toLocaleString()}
                    </>
                  )}
                </Button>
                <p className="text-xs text-brand-burgundy/60 text-center mt-2">
                  Credits expire after 1 year from purchase date
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Current Credits */}
          <div className="space-y-6">
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Your Current Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userCredits.length > 0 ? (
                  <div className="space-y-3">
                    {userCredits.map((credit) => (
                      <div key={credit.id} className="p-3 bg-brand-cream/30 rounded-lg">
                        <div className="font-medium text-brand-burgundy text-sm">
                          {credit.venues.name}
                        </div>
                        <div className="text-xs text-brand-burgundy/70">
                          {credit.venues.type} • {credit.venues.address}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-brand-burgundy/70">Available:</span>
                          <span className="font-bold text-brand-burgundy">
                            ₦{(credit.remaining_balance / 1000).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-brand-burgundy/50 mt-1">
                          Expires: {new Date(credit.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-brand-burgundy/30 mx-auto mb-3" />
                    <p className="text-brand-burgundy/60 text-sm">No active credits</p>
                    <p className="text-brand-burgundy/50 text-xs">Purchase credits to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Benefits Card */}
            <Card className="bg-brand-gold/10 border-brand-gold/30">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Why Purchase Credits?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-brand-burgundy/80">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
                  <span>Faster bookings - skip payment step</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
                  <span>Bonus credits with larger purchases</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
                  <span>Support your favorite venues</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
                  <span>Never expire if used regularly</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueCreditPurchase; 