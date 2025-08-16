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

const SplitPaymentForm = ({ 
  totalAmount, 
  onSplitCreated, 
  user, 
  bookingId, 
  createBookingIfNeeded // new prop
}) => {
  const { toast } = useToast();
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

  // Initialize split amounts when count changes
  useEffect(() => {
    const amountPerPerson = Math.ceil(totalAmount / splitCount);
    const amounts = Array(splitCount - 1).fill(amountPerPerson); // Exclude current user
    
    // Adjust the last amount to account for rounding
    const totalSplit = amounts.reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = totalAmount - totalSplit;
    
    setSplitAmounts(amounts);
    setSplitRecipients(Array(splitCount - 1).fill(null));
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
    setIsCreating(true);
    try {
      let realBookingId = bookingId;
      if (!realBookingId && typeof createBookingIfNeeded === 'function') {
        realBookingId = await createBookingIfNeeded();
      }
      if (!realBookingId) throw new Error('Booking could not be created.');

      const userProfileId = user.id;
      const splitRequests = splitRecipients.map((recipient, index) => ({
        booking_id: realBookingId,
        requester_id: userProfileId,
        recipient_id: recipient.id,
        recipient_phone: recipient.phone || null,
        amount: splitAmounts[index],
        payment_link: `${window.location.origin}/split-payment/${realBookingId}/${index}`,
        status: 'pending'
      }));

      const { data, error } = await supabase
        .from('split_payment_requests')
        .insert(splitRequests)
        .select();

      if (error) throw error;

      // Create notifications for recipients
      const notifications = data.map(request => ({
        user_id: request.recipient_id,
        split_payment_id: request.id,
        type: 'payment_request',
        title: 'Payment Request Received',
        message: `${user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Someone'} has requested ₦${request.amount.toLocaleString()} for a shared booking.`
      }));

      const { error: notifError } = await supabase
        .from('payment_notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }

      // Store the created requests and mark as created
      setCreatedSplitRequests(data);
      setSplitRequestsCreated(true);

      toast({
        title: "Split Payment Requests Created!",
        description: `Successfully sent ${data.length} payment requests. Now complete your payment.`,
        className: "bg-green-500 text-white",
      });

      onSplitCreated(data);

    } catch (error) {
      console.error('Error creating split payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to create split payment requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const myAmount = totalAmount - splitAmounts.reduce((sum, amount) => sum + amount, 0);

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
                  <div className="text-sm text-green-600">You pay this now</div>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="text-sm text-green-700 mb-2">
                  <strong>Payment Summary:</strong>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>₦{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Others will pay:</span>
                    <span>₦{splitAmounts.reduce((sum, amount) => sum + amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-medium text-green-800">
                    <span>Your portion:</span>
                    <span>₦{myAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // This will trigger the main checkout payment flow for the initiator's portion
                  toast({
                    title: "Pay Your Portion",
                    description: `You'll be redirected to complete your payment of ₦${myAmount.toLocaleString()}`,
                  });
                  // You can add navigation logic here or trigger the main payment flow
                }}
              >
                Pay Your Portion (₦{myAmount.toLocaleString()})
              </Button>
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
                  // This will trigger the main checkout payment flow for the initiator's portion
                  toast({
                    title: "Processing Payment",
                    description: `Processing your payment of ₦${myAmount.toLocaleString()}`,
                  });
                  // You can add actual payment processing logic here
                  // For now, this will redirect to the main checkout flow
                }}
              >
                Pay ₦{myAmount.toLocaleString()} to Complete Booking
              </Button>

              {/* Status Info */}
              <div className="text-center text-sm text-blue-600">
                <p>✅ Split payment requests sent to {createdSplitRequests.length} people</p>
                <p>⏳ Complete your payment to finalize the booking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Split Payment Button - Only show when not created yet */}
      {!splitRequestsCreated && (
        <Button
          className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 text-sm sm:text-base"
          onClick={createSplitPaymentRequests}
          disabled={isCreating || splitRecipients.some(r => !r) || !user?.id}
        >
          {isCreating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-burgundy mr-2"></div>
              <span className="text-sm sm:text-base">Creating Requests...</span>
            </div>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              <span className="truncate">
                {user?.id ? "Send Payment Requests" : "Sign in to send requests"}
              </span>
            </>
          )}
        </Button>
      )}

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Search for Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="pl-10 text-sm sm:text-base"
              />
            </div>

            {isSearching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-burgundy mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted cursor-pointer gap-2"
                  onClick={() => selectRecipient(result, currentSplitIndex)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-brand-burgundy/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-brand-burgundy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">{result.displayName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {result.phone}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    VIP Member
                  </Badge>
                </div>
              ))}
            </div>

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm sm:text-base">No users found matching "{searchQuery}"</p>
                <p className="text-xs sm:text-sm mt-1">Try searching by name or phone number</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SplitPaymentForm; 