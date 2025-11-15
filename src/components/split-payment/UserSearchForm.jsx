import React, { useState, useEffect } from 'react';
import { Search, Loader2, User, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

/**
 * User Search Form for Split Payment Initiation
 * Allows logged-in users to search for and select users to split payments with
 */
export const UserSearchForm = ({ onUserSelected, currentUserId, isLoading = false }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Searching for users with query:', query);

      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, city, country, phone')
        .neq('id', currentUserId) // Exclude current user
        .or(
          `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .limit(10);

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }

      console.log('✅ Found users:', data?.length || 0);
      setSearchResults(data || []);
      setHasSearched(true);
    } catch (error) {
      console.error('❌ User search failed:', error);
      toast({
        title: 'Search Error',
        description: error.message || 'Failed to search for users',
        variant: 'destructive'
      });
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
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    console.log('👤 User selected for split payment:', {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    });
  };

  const handleConfirmSelection = () => {
    if (!selectedUser) {
      toast({
        title: 'Select a User',
        description: 'Please select a user to split the payment with',
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ Confirming user selection for split payment');
    onUserSelected(selectedUser);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
            Split Payment with Friends
          </h2>
          <p className="text-gray-600">
            Search for a friend's email or name to invite them to split the payment
          </p>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="user-search" className="text-brand-burgundy font-semibold">
            Find User by Email or Name *
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="user-search"
              type="text"
              placeholder="Search by email, name, or phone..."
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
                  Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {searchResults.map((user) => (
                    <Card
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedUser?.id === user.id
                          ? 'border-2 border-brand-burgundy bg-brand-burgundy/5'
                          : 'border border-gray-200 hover:border-brand-burgundy/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-brand-burgundy" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-brand-burgundy">
                              {user.first_name} {user.last_name}
                            </h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">📱</span>
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              {(user.city || user.country) && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {[user.city, user.country].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          {selectedUser?.id === user.id && (
                            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  No users found matching "{searchQuery}". Try searching by email or name.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected User Display */}
        {selectedUser && (
          <Card className="bg-green-50 border-2 border-green-200 p-4">
            <p className="text-sm text-green-700 mb-2">✅ Selected User</p>
            <p className="font-semibold text-green-900">
              {selectedUser.first_name} {selectedUser.last_name}
            </p>
            <p className="text-sm text-green-800">{selectedUser.email}</p>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedUser || isSearching || isLoading}
            className="flex-1 bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Continuing...
              </>
            ) : (
              'Continue with Selected User'
            )}
          </Button>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 After you select a user, you'll be able to set up the split payment details and decide how much each person pays.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default UserSearchForm;

