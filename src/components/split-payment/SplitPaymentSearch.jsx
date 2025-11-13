import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, Calendar, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

/**
 * Split Payment Search Component
 * Allows users to search for existing split payments they can initiate
 */
export const SplitPaymentSearch = ({ onPaymentSelected, currentUserId, isLoading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchSplitPayments = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Searching for split payments with query:', query);

      // Search split payments by booking info or recipient email
      const { data, error } = await supabase
        .from('split_payment_requests')
        .select(`
          *,
          booking:bookings(
            id,
            booking_date,
            start_time,
            end_time,
            number_of_guests,
            total_amount,
            venue:venues(
              id,
              name,
              address,
              city
            )
          ),
          requester:profiles!requester_id(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'pending')
        .neq('requester_id', currentUserId)
        .or(
          `recipient_email.ilike.%${query}%,recipient_phone.ilike.%${query}%`
        )
        .limit(20)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }

      console.log('✅ Found split payments:', data?.length || 0);
      setSearchResults(data || []);
      setHasSearched(true);
    } catch (error) {
      console.error('❌ Split payment search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timer = setTimeout(() => {
      searchSplitPayments(query);
    }, 300);

    return () => clearTimeout(timer);
  };

  const handleSelectPayment = (payment) => {
    setSelectedPayment(payment);
    console.log('💰 Split payment selected:', {
      id: payment.id,
      amount: payment.amount,
      recipient: payment.recipient_email,
      booking: payment.booking?.id
    });
  };

  const handleConfirmSelection = () => {
    if (!selectedPayment) {
      return;
    }

    console.log('✅ Confirming split payment selection');
    onPaymentSelected(selectedPayment);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
            Find Split Payments to Initiate
          </h2>
          <p className="text-gray-600">
            Search for split payments pending your payment
          </p>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="split-search" className="text-brand-burgundy font-semibold">
            Search by Email or Phone *
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="split-search"
              type="text"
              placeholder="Search by recipient email or phone..."
              value={searchQuery}
              onChange={handleSearch}
              disabled={isSearching || isLoading}
              className="pl-10 border-brand-burgundy/30 focus:border-brand-burgundy"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy animate-spin" />
            )}
          </div>
          <p className="text-sm text-gray-500">
            Type at least 2 characters to search
          </p>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-3">
            {searchResults.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 font-medium">
                  Found {searchResults.length} pending split payment{searchResults.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((payment) => (
                    <Card
                      key={payment.id}
                      onClick={() => handleSelectPayment(payment)}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedPayment?.id === payment.id
                          ? 'border-2 border-brand-burgundy bg-brand-burgundy/5'
                          : 'border border-gray-200 hover:border-brand-burgundy/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-brand-burgundy mb-1">
                            {payment.booking?.venue?.name || 'Venue'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {payment.booking?.venue?.address && payment.booking?.venue?.city
                              ? `${payment.booking.venue.address}, ${payment.booking.venue.city}`
                              : 'Location not available'}
                          </p>
                        </div>
                        <div className="text-right">
                          {selectedPayment?.id === payment.id && (
                            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center mb-2">
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        {/* Date */}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{formatDate(payment.booking?.booking_date)}</span>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">🕐</span>
                          <span className="text-gray-600">
                            {formatTime(payment.booking?.start_time)} - {formatTime(payment.booking?.end_time)}
                          </span>
                        </div>

                        {/* Guests */}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{payment.booking?.number_of_guests} guests</span>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center gap-1 font-semibold text-brand-burgundy">
                          <DollarSign className="h-4 w-4" />
                          <span>₦{payment.amount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Recipient Info */}
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <strong>Recipient:</strong> {payment.recipient_email}
                        </p>
                        {payment.recipient_phone && (
                          <p className="text-xs text-gray-600">
                            <strong>Phone:</strong> {payment.recipient_phone}
                          </p>
                        )}
                        {payment.requester && (
                          <p className="text-xs text-gray-600">
                            <strong>Requested by:</strong> {payment.requester.first_name} {payment.requester.last_name}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="mt-2">
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Pending Payment
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  No pending split payments found matching "{searchQuery}". Try searching by email or phone number.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected Payment Display */}
        {selectedPayment && (
          <Card className="bg-green-50 border-2 border-green-200 p-4">
            <p className="text-sm text-green-700 mb-2">✅ Selected Split Payment</p>
            <p className="font-semibold text-green-900">{selectedPayment.booking?.venue?.name}</p>
            <p className="text-sm text-green-800">
              Amount: ₦{selectedPayment.amount.toLocaleString()}
            </p>
            <p className="text-sm text-green-800">
              Recipient: {selectedPayment.recipient_email}
            </p>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedPayment || isSearching || isLoading}
            className="flex-1 bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Continuing...
              </>
            ) : (
              'Continue with Selected Payment'
            )}
          </Button>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            💡 After selecting a split payment, you'll be able to review the details and proceed with payment.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default SplitPaymentSearch;

