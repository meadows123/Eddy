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
  bookingId 
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

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, phone_number')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .neq('id', user?.id) // Exclude current user
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
    setCurrentSplitIndex(index);
    setShowSearchDialog(true);
  };

  const createSplitPaymentRequests = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create split payment requests.",
        variant: "destructive"
      });
      return;
    }

    // Validate that all recipients are selected
    const hasEmptyRecipients = splitRecipients.some(recipient => !recipient);
    if (hasEmptyRecipients) {
      toast({
        title: "Missing Recipients",
        description: "Please select recipients for all split payments.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const splitRequests = splitRecipients.map((recipient, index) => ({
        booking_id: bookingId,
        requester_id: user.id,
        recipient_id: recipient.id,
        recipient_phone: recipient.phone_number || null,
        amount: splitAmounts[index],
        payment_link: `${window.location.origin}/split-payment/${bookingId}/${index}`,
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
        message: `${user.first_name || 'Someone'} has requested ₦${request.amount.toLocaleString()} for a shared booking.`
      }));

      const { error: notifError } = await supabase
        .from('payment_notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }

      toast({
        title: "Split Payment Requests Created!",
        description: `Successfully sent ${data.length} payment requests.`,
        className: "bg-green-500 text-white"
      });

      onSplitCreated(data);

    } catch (error) {
      console.error('Error creating split payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to create split payment requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const myAmount = totalAmount - splitAmounts.reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="space-y-6">
      {/* Split Count Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Split Payment Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSplitCountChange(splitCount - 1)}
              disabled={splitCount <= 2}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <Label className="text-lg">Split between {splitCount} people</Label>
              <div className="text-sm text-muted-foreground">
                Including you
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSplitCountChange(splitCount + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Your Amount */}
          <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-brand-burgundy" />
                </div>
                <div>
                  <div className="font-medium">You</div>
                  <div className="text-sm text-muted-foreground">
                    {user?.first_name} {user?.last_name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">₦{myAmount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Your portion</div>
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
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Person {index + 2}</Label>
                  <div className="font-bold">₦{amount.toLocaleString()}</div>
                </div>
                
                {splitRecipients[index] ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {splitRecipients[index].displayName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {splitRecipients[index].phone_number}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openSearchDialog(index)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search for recipient
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Split Payment Button */}
      <Button
        className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
        onClick={createSplitPaymentRequests}
        disabled={isCreating || splitRecipients.some(r => !r)}
      >
        {isCreating ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-burgundy mr-2"></div>
            Creating Requests...
          </div>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Payment Requests
          </>
        )}
      </Button>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search for Recipient</DialogTitle>
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
                className="pl-10"
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
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => selectRecipient(result, currentSplitIndex)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-brand-burgundy" />
                    </div>
                    <div>
                      <div className="font-medium">{result.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.phone_number}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    VIP Member
                  </Badge>
                </div>
              ))}
            </div>

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No users found matching "{searchQuery}"</p>
                <p className="text-sm mt-1">Try searching by name or phone number</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SplitPaymentForm; 