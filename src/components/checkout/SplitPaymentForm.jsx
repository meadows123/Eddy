import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Minus, 
  Search, 
  User, 
  Mail, 
  Phone, 
  X, 
  Send, 
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// First, add Stripe imports at the top
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { stripePromise } from '@/lib/stripe';

// Add PaymentForm component
const PaymentForm = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      setError('Stripe is not loaded');
      setProcessing(false);
      return;
    }

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          // Add any billing details if needed
        }
      });

      if (stripeError) {
        throw stripeError;
      }

      // Pass both paymentMethod and stripe instance to onSuccess
      await onSuccess(paymentMethod.id, stripe);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-white">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#800020',
                '::placeholder': {
                  color: '#800020',
                },
              },
            },
            hidePostalCode: true
          }}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full bg-brand-burgundy text-white"
      >
        {processing ? 'Processing...' : `Pay ₦${amount.toLocaleString()}`}
      </Button>
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </form>
  );
};

const SplitPaymentForm = ({ 
  totalAmount, 
  onSplitCreated, 
  user, 
  bookingId, 
  createBookingIfNeeded
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [splitCount, setSplitCount] = useState(2);
  const [splitAmounts, setSplitAmounts] = useState([]);
  const [splitRecipients, setSplitRecipients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [currentSplitIndex, setCurrentSplitIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  // Add this state for tracking split payment creation
  const [splitRequestsCreated, setSplitRequestsCreated] = useState(false);
  const [createdSplitRequests, setCreatedSplitRequests] = useState([]);
  // Add state for realBookingId
  const [realBookingId, setRealBookingId] = useState(null);
  // Add myAmount to the state variables
  const [myAmount, setMyAmount] = useState(0);

  // Add this logging right after the component definition
  console.log('SplitPaymentForm received props:', {
    totalAmount,
    bookingId,
    user: user?.id
  });

  // Update the useEffect to set myAmount in state
  useEffect(() => {
    console.log('SplitPaymentForm useEffect triggered:', {
      totalAmount,
      splitCount,
      'totalAmount type': typeof totalAmount
    });
    
    // Separate table price and service charge
    const serviceCharge = 25; // Service charge is ₦25
    const tablePrice = totalAmount - serviceCharge; // Get the base table price
    
    // Calculate split for table price
    const tablePricePerPerson = Math.ceil(tablePrice / splitCount);
    
    // Each person pays their share of table price + service charge
    const amountPerPerson = tablePricePerPerson + serviceCharge;
    const amounts = Array(splitCount - 1).fill(amountPerPerson); // Exclude current user
    
    // Your amount is your share of table + service charge
    const myTableShare = tablePricePerPerson;
    const calculatedMyAmount = myTableShare + serviceCharge;
    
    console.log('Split amounts calculation:', {
      totalAmount,
      tablePrice,
      serviceCharge,
      tablePricePerPerson,
      amountPerPerson,
      amounts,
      myAmount: calculatedMyAmount,
      'Total to collect': amounts.reduce((sum, amount) => sum + amount, 0)
    });
    
    setSplitAmounts(amounts);
    setSplitRecipients(Array(splitCount - 1).fill(null));
    setMyAmount(calculatedMyAmount); // Set myAmount in state
  }, [splitCount, totalAmount]);

  const handleSplitCountChange = (newCount) => {
    if (newCount < 2) return;
    setSplitCount(newCount);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('Searching users with user object:', user);
    setIsSearching(true);
    try {
      // Validate user exists and is authenticated
      if (!user?.id) {
        console.error('No user ID available for search. User object:', user);
        toast({
          title: "Authentication Required",
          description: "Please sign in to search for users to split payments with.",
          variant: "destructive"
        });
        setSearchResults([]);
        return;
      }

             const { data, error } = await supabase
         .from('profiles')
         .select('id, first_name, last_name, phone')
         .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
         .neq('id', user.id) // Exclude current user
         .limit(10);

      if (error) throw error;

             // Transform results
       const results = (data || []).map(profile => ({
         ...profile,
         displayName: `${profile.first_name} ${profile.last_name}`.trim(),
         type: 'profile'
       }));

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search Error",
        description: "Failed to search users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectRecipient = (recipient, index) => {
    const newRecipients = [...splitRecipients];
    newRecipients[index] = recipient;
    setSplitRecipients(newRecipients);
    setShowSearchDialog(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeRecipient = (index) => {
    const newRecipients = [...splitRecipients];
    newRecipients[index] = null;
    setSplitRecipients(newRecipients);
  };

  const openSearchDialog = (index) => {
    // Check if user is authenticated before opening search dialog
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to search for users to split payments with.",
        variant: "destructive"
      });
      return;
    }
    setCurrentSplitIndex(index);
    setShowSearchDialog(true);
  };

  const createSplitPaymentRequests = async () => {
    try {
      let newBookingId = bookingId;
      console.log('Initial bookingId:', bookingId);

      if (!newBookingId && typeof createBookingIfNeeded === 'function') {
        console.log('Creating new booking...');
        newBookingId = await createBookingIfNeeded();
        console.log('Created new bookingId:', newBookingId);
      }

      if (!newBookingId) {
        console.error('No booking ID available');
        throw new Error('Booking could not be created.');
      }

      // Store the bookingId
      setRealBookingId(newBookingId);
      console.log('Set realBookingId to:', newBookingId);

      // Ensure we have recipients before creating requests
      if (!splitRecipients || splitRecipients.length === 0) {
        throw new Error('Please select recipients for split payment.');
      }

      const userProfileId = user.id;
      const splitRequests = splitRecipients.map((recipient, index) => ({
        booking_id: newBookingId,
        requester_id: userProfileId,
        recipient_id: recipient.id,
        recipient_phone: recipient.phone || null,
        amount: splitAmounts[index],
        payment_link: `${window.location.origin}/split-payment/${newBookingId}/${index}`,
        status: 'pending'
      }));

      console.log('Split requests to create:', splitRequests);

      const { data, error } = await supabase
        .from('split_payment_requests')
        .insert(splitRequests)
        .select();

      if (error) throw error;

      // Store the created requests and mark as created
      setCreatedSplitRequests(data);
      setSplitRequestsCreated(true);

      // Return the newBookingId so we can use it immediately
      return newBookingId;

    } catch (error) {
      console.error('Error in createSplitPaymentRequests:', error);
      throw error;
    }
  };

  // Add comprehensive logging to debug the amounts
  console.log('🔍 Amount Debugging:', {
    totalAmount,
    splitCount,
    splitAmounts,
    'splitAmounts.reduce': splitAmounts.reduce((sum, amount) => sum + amount, 0),
    myAmount,
    'myAmount in kobo': myAmount * 100,
    'myAmount >= 50': myAmount >= 50,
    'splitRecipients count': splitRecipients.filter(r => r).length
  });

  // Add logging to debug the amounts
  console.log('Amount breakdown:', {
    totalAmount,
    splitAmounts,
    myAmount,
    fullTablePrice: totalAmount
  });

  const handlePayment = async () => {
    try {
      // First create the split payment requests
      await createSplitPaymentRequests();
      
      // Then navigate to checkout with the correct data
      navigate('/checkout', {
        state: {
          ...location.state,
          isSplitPayment: true,
          initiatorAmount: myAmount,
          splitRequests: createdSplitRequests,
          totalAmount: totalAmount,
          bookingId: bookingId
        }
      });
    } catch (error) {
      console.error('Error handling split payment:', error);
      toast({
        title: "Error",
        description: "Failed to process split payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Status */}
      {!user?.id && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3 text-orange-800">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-2 w-2 sm:h-3 sm:w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm sm:text-base">Authentication Required</div>
                <div className="text-xs sm:text-sm">Please sign in to search for users to split payments with.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split Count Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Split Payment Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 sm:gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSplitCountChange(splitCount - 1)}
              disabled={splitCount <= 2}
              className="flex-shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center min-w-0">
              <Label className="text-base sm:text-lg break-words">Split between {splitCount} people</Label>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Including you
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSplitCountChange(splitCount + 1)}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Your Amount */}
          <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-brand-gold rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-brand-burgundy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base">You</div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user?.email || 'Guest User'
                    }
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-base sm:text-lg">₦{myAmount.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Your portion</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {splitAmounts.map((amount, index) => (
              <div key={index} className="border rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <Label className="text-sm sm:text-base">Person {index + 2}</Label>
                  <div className="font-bold text-sm sm:text-base">₦{amount.toLocaleString()}</div>
                </div>
                
                {splitRecipients[index] ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {splitRecipients[index].displayName}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {splitRecipients[index].phone}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-sm sm:text-base"
                    onClick={() => openSearchDialog(index)}
                    disabled={!user?.id}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    <span className="truncate">
                      {user?.id ? "Search for recipient" : "Sign in to search"}
                    </span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Initiator's Payment Section */}
      {user?.id && splitRecipients.some(r => r) && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">Your Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">Your Portion</div>
                    <div className="text-sm text-green-600">
                      {splitRecipients.filter(r => r).length} other people will pay ₦{splitAmounts.reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-800">₦{myAmount.toLocaleString()}</div>
                  <div className="text-sm text-green-600">Pay now</div>
                </div>
              </div>

              {/* Payment Form */}
              <Elements stripe={stripePromise}>
                <PaymentForm 
                  amount={myAmount} 
                  onSuccess={async (paymentMethodId, stripe) => {
                    try {
                      // Add loading state to prevent double clicks
                      if (isCreating) {
                        console.log('Payment already in progress...');
                        return;
                      }

                      setIsCreating(true);

                      // Log initial state
                      console.log('Starting payment flow:', {
                        splitRecipients,
                        splitAmounts,
                        myAmount,
                        bookingId
                      });

                      // Create booking and split requests in one step
                      const { confirmedBookingId, splitRequests } = await (async () => {
                        // Get or create booking ID
                        let newBookingId = bookingId;
                        if (!newBookingId && typeof createBookingIfNeeded === 'function') {
                          newBookingId = await createBookingIfNeeded();
                        }

                        if (!newBookingId) {
                          throw new Error('Could not create booking.');
                        }

                        // Create split requests
                        const userProfileId = user.id;
                        const requests = splitRecipients.map((recipient, index) => ({
                          booking_id: newBookingId,
                          requester_id: userProfileId,
                          recipient_id: recipient.id,
                          recipient_phone: recipient.phone || null,
                          amount: splitAmounts[index],
                          payment_link: `${window.location.origin}/split-payment/${newBookingId}/${index}`,
                          status: 'pending'
                        }));

                        const { data, error } = await supabase
                          .from('split_payment_requests')
                          .insert(requests)
                          .select();

                        if (error) throw error;

                        return { confirmedBookingId: newBookingId, splitRequests: data };
                      })();

                      // Store the created requests
                      setCreatedSplitRequests(splitRequests);
                      setSplitRequestsCreated(true);

                      // Process payment immediately after creating requests
                      const response = await fetch(
                        'https://agydpkzfucicraedllgl.supabase.co/functions/v1/create-split-payment-intent',
                        {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                          },
                          body: JSON.stringify({
                            amount: myAmount,
                            paymentMethodId,
                            bookingId: confirmedBookingId,
                            splitRequests,
                            email: user?.email
                          })
                        }
                      );

                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error Response:', errorText);
                        throw new Error(`Payment failed. Please try again.`);
                      }

                      const { clientSecret, paymentIntentId } = await response.json();
                      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
                      
                      if (confirmError) {
                        throw new Error('Payment could not be confirmed. Please try again.');
                      }

                      // Get the first split request ID for success page
                      const splitRequestId = splitRequests[0]?.id;
                      if (!splitRequestId) {
                        throw new Error('Split request ID is missing.');
                      }

                      // Navigate to success page
                      navigate(`/split-payment-success?payment_intent=${paymentIntentId}&request_id=${splitRequestId}`);

                    } catch (error) {
                      console.error('Payment failed:', error);
                      toast({
                        title: "Payment Failed",
                        description: error.message || "Failed to process payment. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                />
              </Elements>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Section - Show after split requests are created */}
      {splitRequestsCreated && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Complete Your Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Booking Amount:</span>
                    <span className="font-medium">₦{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Split Requests Sent:</span>
                    <span className="text-blue-600">{createdSplitRequests.length} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Others will pay:</span>
                    <span className="text-blue-600">₦{splitAmounts.reduce((sum, amount) => sum + amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-blue-800">
                      <span>Your Payment Due:</span>
                      <span className="text-lg">₦{myAmount.toLocaleString()}</span>
                    </div>
                      </div>
                    </div>
                  </div>

              {/* Payment Form */}
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Payment Details</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cardNumber" className="text-sm text-blue-700">Card Number</Label>
                    <Input 
                      id="cardNumber" 
                      placeholder="1234 5678 9012 3456" 
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiryDate" className="text-sm text-blue-700">Expiry Date</Label>
                      <Input 
                        id="expiryDate" 
                        placeholder="MM/YY" 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-sm text-blue-700">CVV</Label>
                      <Input 
                        id="cvv" 
                        placeholder="123" 
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cardholderName" className="text-sm text-blue-700">Cardholder Name</Label>
                    <Input 
                      id="cardholderName" 
                      placeholder="John Doe" 
                      className="mt-1"
                      defaultValue={user?.user_metadata?.full_name || user?.user_metadata?.first_name || ''}
                    />
                  </div>
                </div>
            </div>

              {/* Payment Button */}
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium"
                onClick={() => {
                  toast({
                    title: "Split Payment Created",
                    description: "Your split payment requests have been sent. You can now complete your own payment using the main checkout form above.",
                    variant: "default"
                  });
                }}
              >
                Split Payment Complete
              </Button>
              </div>
          </CardContent>
        </Card>
            )}

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search for Recipient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="searchQuery">Search by name or phone</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchQuery"
                  placeholder="Enter name or phone number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Simple search without debouncing for now
                    searchUsers(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => selectRecipient(result, currentSplitIndex)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{result.displayName}</div>
                        <div className="text-sm text-muted-foreground">{result.phone}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No users found matching "{searchQuery}"</p>
                <p className="text-sm">Try searching by first name, last name, or phone number</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SplitPaymentForm; 