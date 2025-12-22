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
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVenues(venuesData || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load venues',
        variant: 'destructive',
      });
    }
  };

  const fetchUserCredits = async (userId) => {
    try {
      console.log('🔍 Fetching user credits for userId:', userId);
      
      // First, fetch all credits for the user to see what we have
      const { data: allCreditsData, error: allCreditsError } = await supabase
        .from('venue_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (allCreditsError) {
        console.error('❌ Error fetching all credits:', allCreditsError);
        throw allCreditsError;
      }

      console.log('📊 All credits found:', {
        total: allCreditsData?.length || 0,
        credits: allCreditsData?.map(c => ({
          id: c.id,
          venue_id: c.venue_id,
          status: c.status,
          amount: c.amount,
          used_amount: c.used_amount,
          remaining_balance: c.remaining_balance,
          expires_at: c.expires_at
        }))
      });

      // Filter active credits with remaining balance and not expired
      const now = new Date().toISOString();
      const activeCredits = (allCreditsData || []).filter(credit => {
        const remainingBalance = credit.remaining_balance || (credit.amount - (credit.used_amount || 0));
        const isActive = credit.status === 'active';
        const hasBalance = remainingBalance > 0;
        const notExpired = !credit.expires_at || new Date(credit.expires_at) > new Date(now);
        
        return isActive && hasBalance && notExpired;
      });

      console.log('✅ Active credits after filtering:', {
        count: activeCredits.length,
        credits: activeCredits.map(c => ({
          id: c.id,
          venue_id: c.venue_id,
          remaining_balance: c.remaining_balance || (c.amount - (c.used_amount || 0))
        }))
      });

      // Now fetch venue data for the active credits (using optional join)
      if (activeCredits.length > 0) {
        const venueIds = [...new Set(activeCredits.map(c => c.venue_id).filter(Boolean))];
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('id, name, address, type')
          .in('id', venueIds);

        if (venuesError) {
          console.warn('⚠️ Error fetching venues:', venuesError);
        }

        // Create a map of venue_id -> venue for quick lookup
        const venuesMap = new Map((venuesData || []).map(v => [v.id, v]));

        // Attach venue data to credits
        const creditsWithVenues = activeCredits.map(credit => {
          const remainingBalance = credit.remaining_balance || (credit.amount - (credit.used_amount || 0));
          return {
            ...credit,
            remaining_balance: remainingBalance,
            venues: venuesMap.get(credit.venue_id) || {
              id: credit.venue_id,
              name: 'Unknown Venue',
              address: 'Address not available',
              type: 'Unknown'
            }
          };
        });

        console.log('✅ Credits with venue data:', creditsWithVenues.length);
        setUserCredits(creditsWithVenues);
      } else {
        console.log('⚠️ No active credits found for user');
        setUserCredits([]);
      }
    } catch (error) {
      console.error('❌ Error fetching user credits:', error);
      setUserCredits([]);
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
    return baseAmount + bonus;
  };

  const getPurchaseAmount = () => {
    return creditAmount || parseFloat(customAmount) || 0;
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
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedVenue && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-brand-cream/30 rounded-lg"
                  >
                    <h4 className="font-semibold text-brand-burgundy">{selectedVenue.name}</h4>
                    <p className="text-sm text-brand-burgundy/70">{selectedVenue.address}</p>
                    <p className="text-sm text-brand-burgundy/70">{selectedVenue.type} • {selectedVenue.city}</p>
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
                              +₦{(option.bonus * 1000).toLocaleString()} bonus
                            </div>
                          )}
                          <div className="text-xs text-brand-burgundy/60 mt-1">
                            Total: ₦{((option.amount + option.bonus) * 1000).toLocaleString()}
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
                        ₦{(getTotalAmount() * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-brand-burgundy/70 mt-1">
                      Purchase amount: ₦{(getPurchaseAmount() * 1000).toLocaleString()}
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
                      Purchase Credits - ₦{(getPurchaseAmount() * 1000).toLocaleString()}
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
                            ₦{(credit.remaining_balance / 100).toLocaleString()}
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