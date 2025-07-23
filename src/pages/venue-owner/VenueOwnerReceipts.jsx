import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Receipt, 
  Upload, 
  Search, 
  User,
  CreditCard,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Minus,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const VenueOwnerReceipts = () => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [venue, setVenue] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  
  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    receiptNumber: '',
    totalAmount: '',
    creditAmountUsed: '',
    cashAmountPaid: '0',
    receiptDate: new Date().toISOString().split('T')[0],
    notes: '',
    receiptImage: null,
    receiptImageUrl: ''
  });
  
  // Receipt items state
  const [receiptItems, setReceiptItems] = useState([
    { itemName: '', quantity: 1, unitPrice: '', category: 'drinks' }
  ]);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to manage receipts',
          variant: 'destructive',
        });
        return;
      }

      setCurrentUser(user);
      await fetchVenueAndReceipts(user.id);
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

  const fetchVenueAndReceipts = async (userId) => {
    try {
      // Get venue owned by this user
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (venueError) {
        if (venueError.code === 'PGRST116') {
          setVenue(null);
          setReceipts([]);
          return;
        }
        throw venueError;
      }

      setVenue(venueData);

      // Fetch receipts for this venue
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('venue_receipts')
        .select(`
          *,
          profiles:member_user_id (
            id,
            full_name,
            email,
            first_name,
            last_name
          ),
          venue_receipt_items (*)
        `)
        .eq('venue_id', venueData.id)
        .order('created_at', { ascending: false });

      if (receiptsError) {
        console.error('Error fetching receipts:', receiptsError);
        // If profiles table not ready, fetch without join
        const { data: fallbackReceipts, error: fallbackError } = await supabase
          .from('venue_receipts')
          .select('*')
          .eq('venue_id', venueData.id)
          .order('created_at', { ascending: false });
        
        if (!fallbackError) {
          setReceipts(fallbackReceipts || []);
        }
      } else {
        setReceipts(receiptsData || []);
      }

    } catch (error) {
      console.error('Error fetching venue and receipts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load venue data',
        variant: 'destructive',
      });
    }
  };

  const searchMembers = async (searchTerm) => {
    if (!venue || !searchTerm || searchTerm.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    try {
      // Search for members who have credits at this venue
      const { data: membersData, error } = await supabase
        .from('venue_credits')
        .select(`
          user_id,
          remaining_balance,
          profiles:user_id (
            id,
            full_name,
            email,
            first_name,
            last_name
          )
        `)
        .eq('venue_id', venue.id)
        .eq('status', 'active')
        .gt('remaining_balance', 0)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error searching members:', error);
        return;
      }

      // Filter results based on search term
      const filteredMembers = (membersData || [])
        .filter(member => {
          if (!member.profiles) return false;
          const fullName = member.profiles.full_name || `${member.profiles.first_name || ''} ${member.profiles.last_name || ''}`.trim();
          const email = member.profiles.email || '';
          
          return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 email.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .map(member => ({
          ...member,
          display_name: member.profiles.full_name || `${member.profiles.first_name || ''} ${member.profiles.last_name || ''}`.trim() || 'Unknown Member',
          display_email: member.profiles.email || 'No email'
        }));

      setMemberSearchResults(filteredMembers);

    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const selectMember = async (member) => {
    setSelectedMember(member);
    setMemberSearchTerm(member.display_name);
    setMemberSearchResults([]);
    
    // Get full credit balance for this member
    try {
      const { data: balanceData, error } = await supabase
        .rpc('get_member_credit_balance', {
          p_venue_id: venue.id,
          p_member_user_id: member.user_id
        });

      if (!error && balanceData) {
        setSelectedMember(prev => ({
          ...prev,
          total_balance: balanceData.total_balance,
          active_credits: balanceData.active_credits || []
        }));
      }
    } catch (error) {
      console.error('Error fetching member balance:', error);
    }
  };

  const addReceiptItem = () => {
    setReceiptItems([...receiptItems, { itemName: '', quantity: 1, unitPrice: '', category: 'drinks' }]);
  };

  const removeReceiptItem = (index) => {
    if (receiptItems.length > 1) {
      setReceiptItems(receiptItems.filter((_, i) => i !== index));
    }
  };

  const updateReceiptItem = (index, field, value) => {
    const updated = receiptItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setReceiptItems(updated);
  };

  const calculateItemsTotal = () => {
    return receiptItems.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  const uploadReceiptImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(`receipts/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(`receipts/${fileName}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt image:', error);
      throw error;
    }
  };

  const processReceipt = async () => {
    if (!selectedMember) {
      toast({
        title: 'Member Required',
        description: 'Please select a member first',
        variant: 'destructive',
      });
      return;
    }

    if (!receiptForm.totalAmount || !receiptForm.creditAmountUsed) {
      toast({
        title: 'Amount Required',
        description: 'Please enter both total amount and credit amount used',
        variant: 'destructive',
      });
      return;
    }

    // Require receipt image
    if (!receiptForm.receiptImage) {
      toast({
        title: 'Receipt Image Required',
        description: 'Please upload a receipt image before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      let receiptImageUrl = receiptForm.receiptImageUrl;

      // Upload image if provided
      if (receiptForm.receiptImage) {
        receiptImageUrl = await uploadReceiptImage(receiptForm.receiptImage);
      }

      // Prepare receipt items
      const validItems = receiptItems.filter(item => 
        item.itemName && item.unitPrice && item.quantity
      ).map(item => ({
        item_name: item.itemName,
        quantity: parseInt(item.quantity),
        unit_price: Math.round(parseFloat(item.unitPrice) * 100), // Convert to kobo
        total_price: Math.round(parseInt(item.quantity) * parseFloat(item.unitPrice) * 100),
        category: item.category
      }));

      // Process the credit redemption
      const { data: result, error } = await supabase
        .rpc('process_credit_redemption', {
          p_venue_id: venue.id,
          p_member_user_id: selectedMember.user_id,
          p_processed_by_user_id: currentUser.id,
          p_receipt_number: receiptForm.receiptNumber || `R-${Date.now()}`,
          p_receipt_image_url: receiptImageUrl,
          p_total_amount: Math.round(parseFloat(receiptForm.totalAmount) * 100),
          p_credit_amount_used: Math.round(parseFloat(receiptForm.creditAmountUsed) * 100),
          p_cash_amount_paid: Math.round(parseFloat(receiptForm.cashAmountPaid || 0) * 100),
          p_receipt_date: receiptForm.receiptDate,
          p_notes: receiptForm.notes,
          p_receipt_items: validItems // <-- pass as array, not JSON.stringify(validItems)
        });

      if (error) throw error;

      if (!result.success) {
        toast({
          title: 'Processing Failed',
          description: result.error || 'Failed to process receipt',
          variant: 'destructive',
        });
        return;
      }

      // Success!
      toast({
        title: 'Receipt Processed! 🎉',
        description: `₦${receiptForm.creditAmountUsed} deducted from ${selectedMember.display_name}'s credits`,
        className: 'bg-green-500 text-white',
      });

      // Replace `memberUserId`, `venueId`, and `amount` with the actual values from your receipt form.
      const memberUserId = selectedMember.user_id;
      const venueId = venue.id;
      const amount = Math.round(parseFloat(receiptForm.creditAmountUsed) * 100);

      console.log('Processing receipt for member:', memberUserId, 'venue:', venueId, 'amount:', amount);

      // The following block was removed as per the edit hint.
      // const { data, error: updateError } = await supabase
      //   .from('venue_credits')
      //   .update({ used_amount: supabase.raw('used_amount + ?', [amount]) })
      //   .eq('user_id', memberUserId)
      //   .eq('venue_id', venueId)
      //   .eq('status', 'active')
      //   .gte('remaining_balance', amount)
      //   .order('expires_at', { ascending: true })
      //   .limit(1);

      // if (updateError) {
      //   console.error('Error updating venue_credits:', updateError);
      //   // Optionally show an error message to the venue owner
      // } else {
      //   console.log('Credits deducted successfully!');
      //   // Optionally show a success message or update the UI
      // }

      // Reset form
      setReceiptForm({
        receiptNumber: '',
        totalAmount: '',
        creditAmountUsed: '',
        cashAmountPaid: '0',
        receiptDate: new Date().toISOString().split('T')[0],
        notes: '',
        receiptImage: null,
        receiptImageUrl: ''
      });
      setReceiptItems([{ itemName: '', quantity: 1, unitPrice: '', category: 'drinks' }]);
      setSelectedMember(null);
      setMemberSearchTerm('');
      setShowUploadDialog(false);

      // Refresh receipts list
      await fetchVenueAndReceipts(currentUser.id);

    } catch (error) {
      console.error('Error processing receipt:', error);
      toast({
        title: 'Processing Error',
        description: error.message || 'Failed to process receipt',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    if (!searchTerm) return true;
    const memberName = receipt.profiles?.full_name || 'Unknown Member';
    const receiptNumber = receipt.receipt_number || '';
    return memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="bg-brand-cream/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-burgundy/70">Loading receipts...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="bg-brand-cream/50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-brand-burgundy/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-burgundy mb-2">No Venue Found</h3>
            <p className="text-brand-burgundy/70">You need to have an approved venue to manage receipts.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Receipt Management</h1>
            <p className="text-brand-burgundy/70">
              Process member purchases and manage credit redemptions for <span className="font-semibold">{venue.name}</span>
            </p>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90 mt-4 sm:mt-0">
                <Receipt className="h-4 w-4 mr-2" />
                Process Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Process Member Receipt</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Member Selection */}
                <div className="space-y-2">
                  <Label>Select Member</Label>
                  <div className="relative">
                    <Input
                      value={memberSearchTerm}
                      onChange={(e) => {
                        setMemberSearchTerm(e.target.value);
                        searchMembers(e.target.value);
                      }}
                      placeholder="Search member by name or email..."
                      className="border-brand-burgundy/20"
                    />
                    {memberSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-brand-burgundy/20 rounded-md mt-1 max-h-48 overflow-y-auto">
                        {memberSearchResults.map((member) => (
                          <button
                            key={member.user_id}
                            onClick={() => selectMember(member)}
                            className="w-full text-left px-4 py-2 hover:bg-brand-cream/50 border-b border-brand-burgundy/10 last:border-b-0"
                          >
                            <div className="font-medium text-brand-burgundy">{member.display_name}</div>
                            <div className="text-sm text-brand-burgundy/70">{member.display_email}</div>
                            <div className="text-sm text-brand-gold font-semibold">
                              Available: ₦{(member.remaining_balance / 100).toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedMember && (
                    <div className="p-4 bg-brand-cream/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-brand-burgundy">{selectedMember.display_name}</h4>
                          <p className="text-sm text-brand-burgundy/70">{selectedMember.display_email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-brand-gold">
                            ₦{((selectedMember.total_balance || 0) / 100).toLocaleString()}
                          </div>
                          <div className="text-sm text-brand-burgundy/70">Available Credits</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedMember(null);
                            setMemberSearchTerm('');
                          }}
                        >
                          Remove Member
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Receipt Number</Label>
                    <Input
                      value={receiptForm.receiptNumber}
                      onChange={(e) => setReceiptForm({ ...receiptForm, receiptNumber: e.target.value })}
                      placeholder="e.g., R-001 (optional)"
                      className="border-brand-burgundy/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Date</Label>
                    <Input
                      type="date"
                      value={receiptForm.receiptDate}
                      onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                      className="border-brand-burgundy/20"
                    />
                  </div>
                </div>

                {/* Amount Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount (₦)</Label>
                    <Input
                      type="number"
                      value={receiptForm.totalAmount}
                      onChange={(e) => setReceiptForm({ ...receiptForm, totalAmount: e.target.value })}
                      placeholder="0.00"
                      className="border-brand-burgundy/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Credit Amount Used (₦)</Label>
                    <Input
                      type="number"
                      value={receiptForm.creditAmountUsed}
                      onChange={(e) => setReceiptForm({ ...receiptForm, creditAmountUsed: e.target.value })}
                      placeholder="0.00"
                      className="border-brand-burgundy/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cash Paid (₦)</Label>
                    <Input
                      type="number"
                      value={receiptForm.cashAmountPaid}
                      onChange={(e) => setReceiptForm({ ...receiptForm, cashAmountPaid: e.target.value })}
                      placeholder="0.00"
                      className="border-brand-burgundy/20"
                    />
                  </div>
                </div>

                {/* Receipt Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Receipt Items (Optional)</Label>
                    <Button
                      type="button"
                      onClick={addReceiptItem}
                      variant="outline"
                      size="sm"
                      className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  {receiptItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border border-brand-burgundy/10 rounded-lg">
                      <div className="md:col-span-2">
                        <Input
                          value={item.itemName}
                          onChange={(e) => updateReceiptItem(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          className="border-brand-burgundy/20"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReceiptItem(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="border-brand-burgundy/20"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateReceiptItem(index, 'unitPrice', e.target.value)}
                          placeholder="Unit Price"
                          className="border-brand-burgundy/20"
                        />
                      </div>
                      <div>
                        <select
                          value={item.category}
                          onChange={(e) => updateReceiptItem(index, 'category', e.target.value)}
                          className="w-full p-2 border border-brand-burgundy/20 rounded-md"
                        >
                          <option value="drinks">Drinks</option>
                          <option value="food">Food</option>
                          <option value="service">Service</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-center">
                        {receiptItems.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeReceiptItem(index)}
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {receiptItems.some(item => item.itemName && item.unitPrice) && (
                    <div className="text-right text-brand-burgundy">
                      <strong>Items Total: ₦{calculateItemsTotal().toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                {/* Receipt Image Upload */}
                <div className="space-y-2">
                  <Label>
                    Receipt Image
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceiptForm({ ...receiptForm, receiptImage: e.target.files[0] })}
                    className="border-brand-burgundy/20"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                    placeholder="Additional notes about this transaction..."
                    className="border-brand-burgundy/20"
                  />
                </div>

                {/* Process Button */}
                <Button
                  onClick={processReceipt}
                  disabled={processing || !selectedMember}
                  className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Process Receipt
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-brand-burgundy/40" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search receipts by member name or receipt number..."
              className="pl-10 border-brand-burgundy/20"
            />
          </div>
        </div>

        {/* Receipts List */}
        <Card className="bg-white border-brand-burgundy/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Recent Receipts ({filteredReceipts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReceipts.length > 0 ? (
              <div className="space-y-4">
                {filteredReceipts.map((receipt) => (
                  <motion.div
                    key={receipt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-brand-burgundy/10 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                        <div className="p-2 bg-brand-burgundy/10 rounded-full">
                          <Receipt className="h-5 w-5 text-brand-burgundy" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-brand-burgundy">
                            {receipt.profiles?.full_name || 'Unknown Member'}
                          </h4>
                          <p className="text-sm text-brand-burgundy/70">
                            Receipt #{receipt.receipt_number || 'N/A'}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-brand-burgundy/60">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(receipt.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(receipt.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end space-y-2">
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-bold text-brand-burgundy">
                              Total: ₦{(receipt.total_amount / 100).toLocaleString()}
                            </div>
                            <div className="text-sm text-brand-gold">
                              Credits: ₦{(receipt.credit_amount_used / 100).toLocaleString()}
                            </div>
                            {receipt.cash_amount_paid > 0 && (
                              <div className="text-sm text-brand-burgundy/70">
                                Cash: ₦{(receipt.cash_amount_paid / 100).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <Badge
                            className={`${
                              receipt.status === 'completed' ? 'bg-green-100 text-green-800' :
                              receipt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              receipt.status === 'refunded' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {receipt.status}
                          </Badge>
                        </div>
                        {receipt.receipt_image_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(receipt.receipt_image_url, '_blank')}
                            className="border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/10"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Image
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {receipt.notes && (
                      <div className="mt-3 p-3 bg-brand-cream/30 rounded-lg">
                        <p className="text-sm text-brand-burgundy/70">{receipt.notes}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-brand-burgundy/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-burgundy mb-2">No Receipts Found</h3>
                <p className="text-brand-burgundy/60 mb-6">
                  {searchTerm ? 'No receipts match your search criteria.' : 'Start processing member receipts to see them here.'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Process First Receipt
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerReceipts; 