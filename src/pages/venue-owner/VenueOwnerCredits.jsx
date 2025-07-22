import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  User,
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const VenueOwnerCredits = () => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venueCredits, setVenueCredits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [venue, setVenue] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsData, setStatsData] = useState({
    totalCredits: 0,
    activeMembers: 0,
    usedCredits: 0,
    recentCredits: 0
  });

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
          description: 'Please log in to view venue credits',
          variant: 'destructive',
        });
        return;
      }

      setCurrentUser(user);
      await fetchVenueAndCredits(user.id);
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

  const fetchVenueAndCredits = async (userId, silent = false) => {
    try {
      if (!silent) setRefreshing(true);

      // First get the venue owned by this user
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (venueError) {
        if (venueError.code === 'PGRST116') {
          // No venue found
          setVenue(null);
          setVenueCredits([]);
          return;
        }
        throw venueError;
      }

      setVenue(venueData);

      // Fetch credits for this venue (without joins for now)
      const { data: creditsData, error: creditsError } = await supabase
        .from('venue_credits')
        .select('*')
        .eq('venue_id', venueData.id)
        .order('created_at', { ascending: false });

      if (creditsError) throw creditsError;

      // Add basic user data for display (will be improved after profiles table is set up)
      const creditsWithDisplayData = (creditsData || []).map((credit) => {
        credit.display_data = {
          name: `Member ${credit.user_id.substring(0, 8)}...`,
          email: `member-${credit.user_id.substring(0, 8)}@hidden`,
          initials: credit.user_id.substring(0, 2).toUpperCase()
        };
        return credit;
      });

      setVenueCredits(creditsWithDisplayData);
      calculateStats(creditsWithDisplayData);

    } catch (error) {
      console.error('Error fetching venue credits:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to load venue credits',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const calculateStats = (credits) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const totalCredits = credits.reduce((sum, credit) => sum + (credit.amount / 100), 0);
    const usedCredits = credits.reduce((sum, credit) => sum + (credit.used_amount / 100), 0);
    const activeMembers = new Set(credits.filter(c => c.status === 'active' && c.remaining_balance > 0).map(c => c.user_id)).size;
    const recentCredits = credits.filter(c => new Date(c.created_at) >= thirtyDaysAgo).reduce((sum, credit) => sum + (credit.amount / 100), 0);

    setStatsData({
      totalCredits,
      activeMembers,
      usedCredits,
      recentCredits
    });
  };

  const handleRefresh = () => {
    if (currentUser) {
      fetchVenueAndCredits(currentUser.id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserDisplayName = (credit) => {
    if (credit.display_data?.name) {
      return credit.display_data.name;
    }
    if (credit.profiles?.full_name) {
      return credit.profiles.full_name;
    }
    return `Member ${credit.user_id.substring(0, 8)}...`;
  };

  const getUserEmail = (credit) => {
    if (credit.display_data?.email) {
      return credit.display_data.email;
    }
    if (credit.profiles?.email) {
      return credit.profiles.email;
    }
    return `member-${credit.user_id.substring(0, 8)}@hidden`;
  };

  const filteredCredits = venueCredits.filter(credit => {
    const userName = getUserDisplayName(credit).toLowerCase();
    const userEmail = getUserEmail(credit).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) ||
           credit.status.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
              <p className="text-brand-burgundy/70">Loading venue credits...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="container py-8">
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-brand-burgundy/40 mx-auto mb-4" />
            <h2 className="text-2xl font-heading text-brand-burgundy mb-2">No Venue Found</h2>
            <p className="text-brand-burgundy/70 mb-6">
              You need to have an approved venue to view member credits.
            </p>
            <Button 
              onClick={() => window.location.href = '/venue-owner/register'}
              className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
            >
              Register Your Venue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Eddys Members Credits</h1>
            <p className="text-brand-burgundy/70">
              Manage and track member credits for <span className="font-semibold">{venue.name}</span>
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 mt-4 sm:mt-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Total Credits</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    ₦{statsData.totalCredits.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Active Members</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    {statsData.activeMembers}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Used Credits</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    ₦{statsData.usedCredits.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">This Month</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    ₦{statsData.recentCredits.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white border-brand-burgundy/10 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-burgundy/40 h-4 w-4" />
                <Input
                  placeholder="Search by member name, email, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-brand-burgundy/20 focus:border-brand-burgundy"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits List */}
        <Card className="bg-white border-brand-burgundy/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Member Credits ({filteredCredits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCredits.length > 0 ? (
              <div className="space-y-4">
                {filteredCredits.map((credit) => (
                  <motion.div
                    key={credit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-brand-burgundy/10 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                        <div className="p-2 bg-brand-burgundy/10 rounded-full">
                          <User className="h-5 w-5 text-brand-burgundy" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-brand-burgundy">
                            {getUserDisplayName(credit)}
                          </h4>
                          <p className="text-sm text-brand-burgundy/70">
                            {getUserEmail(credit)}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-brand-burgundy/60">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(credit.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {new Date(credit.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end space-y-2">
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-bold text-brand-burgundy">
                              ₦{(credit.remaining_balance / 100).toLocaleString()} remaining
                            </div>
                            <div className="text-sm text-brand-burgundy/70">
                              of ₦{(credit.amount / 100).toLocaleString()} total
                            </div>
                            {credit.used_amount > 0 && (
                              <div className="text-xs text-brand-burgundy/60">
                                Used: ₦{(credit.used_amount / 100).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <Badge className={getStatusColor(credit.status)}>
                            {credit.status}
                          </Badge>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full sm:w-32">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-brand-gold rounded-full h-2 transition-all duration-300"
                              style={{
                                width: `${Math.max(0, Math.min(100, ((credit.amount - credit.used_amount) / credit.amount) * 100))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {credit.notes && (
                      <div className="mt-3 pt-3 border-t border-brand-burgundy/10">
                        <p className="text-sm text-brand-burgundy/70 italic">
                          Note: {credit.notes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-16 w-16 text-brand-burgundy/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-burgundy mb-2">
                  {searchTerm ? 'No matching credits found' : 'No member credits yet'}
                </h3>
                <p className="text-brand-burgundy/60 mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'When members purchase credits for your venue, they will appear here'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => window.open('/venue-credit-purchase?venue=' + venue.id, '_blank')}
                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                  >
                    Share Credit Purchase Link
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

export default VenueOwnerCredits; 