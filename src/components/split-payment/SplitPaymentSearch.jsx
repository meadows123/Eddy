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
  const [error, setError] = useState(null);

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
    <Card className="w-full">
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-8 text-brand-burgundy">Find Split Payments to Complete</h3>

        <form className="space-y-8">
          {/* Search Input */}
          <div className="space-y-3">
            <Label htmlFor="split-search" className="text-brand-burgundy font-semibold text-lg">
              Search by Email or Phone *
            </Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
              <Input
                id="split-search"
                type="text"
                placeholder="Search by recipient email or phone..."
                value={searchQuery}
                onChange={handleSearch}
                disabled={isSearching || isLoading}
                className="pl-14 py-3 text-base border-2 border-brand-burgundy/30 focus:border-brand-burgundy rounded-lg"
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-brand-burgundy animate-spin" />
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">
              Type at least 2 characters to search
            </p>
          </div>

          {/* Search Results */}
          {hasSearched && (
            <div className="space-y-4">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-base text-gray-700 font-semibold">
                    Found {searchResults.length} pending split payment{searchResults.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {searchResults.map((payment) => (
                      <Card
                        key={payment.id}
                        onClick={() => handleSelectPayment(payment)}
                        className={`p-6 cursor-pointer transition-all border-2 ${
                          selectedPayment?.id === payment.id
                            ? 'border-brand-burgundy bg-brand-burgundy/5 shadow-lg'
                            : 'border-gray-200 hover:border-brand-burgundy hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-brand-burgundy mb-2 text-lg">
                              {payment.booking?.venue?.name || 'Venue'}
                            </h3>
                            <p className="text-base text-gray-600">
                              {payment.booking?.venue?.address && payment.booking?.venue?.city
                                ? `${payment.booking.venue.address}, ${payment.booking.venue.city}`
                                : 'Location not available'}
                            </p>
                          </div>
                          <div className="text-right">
                            {selectedPayment?.id === payment.id && (
                              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center mb-2">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Details Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-gray-50 p-4 rounded-lg">
                          {/* Date */}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">DATE</p>
                              <span className="text-gray-700 font-medium">{formatDate(payment.booking?.booking_date)}</span>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🕐</span>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">TIME</p>
                              <span className="text-gray-700 font-medium">
                                {formatTime(payment.booking?.start_time)} - {formatTime(payment.booking?.end_time)}
                              </span>
                            </div>
                          </div>

                          {/* Guests */}
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">GUESTS</p>
                              <span className="text-gray-700 font-medium">{payment.booking?.number_of_guests} guests</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-brand-burgundy" />
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">AMOUNT</p>
                              <span className="text-lg font-bold text-brand-burgundy">₦{payment.amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recipient Info */}
                        <div className="pt-4 border-t border-gray-300 space-y-2">
                          <p className="text-sm text-gray-700">
                            <strong>Recipient Email:</strong> <span className="text-gray-600">{payment.recipient_email}</span>
                          </p>
                          {payment.recipient_phone && (
                            <p className="text-sm text-gray-700">
                              <strong>Phone:</strong> <span className="text-gray-600">{payment.recipient_phone}</span>
                            </p>
                          )}
                          {payment.requester && (
                            <p className="text-sm text-gray-700">
                              <strong>Requested by:</strong> <span className="text-gray-600">{payment.requester.first_name} {payment.requester.last_name}</span>
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="mt-4">
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-3 py-2 rounded-full font-semibold">
                            ⏳ Pending Payment
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800 text-base font-medium">
                    No pending split payments found matching "{searchQuery}". Try searching by email or phone number.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selected Payment Display */}
          {selectedPayment && (
            <Card className="bg-green-50 border-2 border-green-300 p-6">
              <p className="text-lg text-green-700 mb-4 font-bold">✅ Selected Split Payment</p>
              <p className="font-bold text-green-900 text-xl mb-3">{selectedPayment.booking?.venue?.name}</p>
              <p className="text-base text-green-800 mb-2">
                <strong>Amount to Pay:</strong> <span className="text-2xl font-bold text-green-600">₦{selectedPayment.amount.toLocaleString()}</span>
              </p>
              <p className="text-base text-green-800">
                <strong>Recipient:</strong> {selectedPayment.recipient_email}
              </p>
            </Card>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
              <p className="text-base text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedPayment || isSearching || isLoading}
            className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90 py-4 text-lg font-bold rounded-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Proceed to Pay ₦${selectedPayment ? selectedPayment.amount.toLocaleString() : '0'}`
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default SplitPaymentSearch;

