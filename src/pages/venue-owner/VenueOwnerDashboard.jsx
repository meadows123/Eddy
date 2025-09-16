import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  Settings,
  QrCode,
  Image,
  LogOut,
  Table2,
  Users,
  Wallet,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import BookingList from './components/BookingList';
import ImageManagement from './components/ImageManagement';
import TableManagement from './components/TableManagement';
import { supabase } from '../../lib/supabase';
import { toast } from '../../components/ui/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuth } from '../../contexts/AuthContext';

const VenueOwnerDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [venue, setVenue] = useState(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    popularTables: [],
    pendingPayouts: 0,
    activeBookings: 0,
    totalTables: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const venueId = venue?.id;
  const [loginVenueMessage, setLoginVenueMessage] = useState('');

  // Refs for cleanup
  const subscriptionRef = useRef(null);
  const autoRefreshRef = useRef(null);

  console.log('Dashboard currentUser (top-level):', currentUser);

  useEffect(() => {
    checkAuth();
    fetchVenueLoginMessage();
    
    // Set up auto-refresh every 60 seconds
    autoRefreshRef.current = setInterval(() => {
      if (currentUser && !loading) {
        console.log('Auto-refreshing dashboard data...');
        fetchVenueData(true); // silent refresh
      }
    }, 60000);

    // Cleanup on unmount
    return () => {
      cleanupSubscriptions();
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  // Debug: Log when currentUser changes
  useEffect(() => {
    console.log('🔄 currentUser changed in dashboard:', currentUser);
  }, [currentUser]);

  // Debug: Log when bookingTrends changes
  useEffect(() => {
    console.log('📊 bookingTrends changed in dashboard:', {
      length: bookingTrends?.length || 0,
      data: bookingTrends,
      hasData: bookingTrends && bookingTrends.length > 0
    });
  }, [bookingTrends]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        console.log('No session found, redirecting to login...');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access the dashboard',
          variant: 'destructive',
        });
        navigate('/venue-owner/login');
        return;
      }

      // Check if user is a venue owner
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: venueOwner, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (venueOwnerError || !venueOwner) {
        console.log('User is not a venue owner, redirecting to register...');
        toast({
          title: 'Venue Owner Account Required',
          description: 'Please register as a venue owner to access the dashboard',
          variant: 'destructive',
        });
        navigate('/venue-owner/register');
        return;
      }

      // If we get here, user is authenticated and is a venue owner
      console.log('✅ User authenticated as venue owner:', user);
      fetchVenueData();
    } catch (error) {
      console.error('Auth check error:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to verify authentication',
        variant: 'destructive',
      });
    }
  };

  const fetchVenueData = async (silent = false) => {
    try {
      console.log('Fetching venue data...');
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }
      console.log('🔍 Setting currentUser in dashboard:', user);
      setCurrentUser(user);

      // Get venue owned by this user
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (venueError) {
        console.error('Venue fetch error:', venueError);
        throw venueError;
      }

      setVenue(venueData);

      // Set up real-time subscription for this venue
      await setupRealtimeSubscription([venueData.id]);

      // Fetch booking statistics
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueData.id);

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw bookingsError;
      }

      // Calculate statistics
      const totalBookings = bookingsData.length;
      const totalRevenue = bookingsData.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
      const activeBookings = bookingsData.filter(booking => 
        ['pending', 'confirmed'].includes(booking.status)
      ).length;

      // Get recent bookings (last 5)
      const recentBookingsData = bookingsData
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Calculate booking trends (last 7 days) - IMPROVED DATA FETCHING
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentBookings = bookingsData.filter(booking => 
        new Date(booking.created_at) >= sevenDaysAgo
      );

      const bookingTrendsData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayBookings = recentBookings.filter(booking => 
          new Date(booking.created_at).toDateString() === date.toDateString()
        );
        
        // Calculate revenue for the day (only confirmed/completed bookings)
        const dayRevenue = dayBookings.reduce((sum, booking) => {
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            let amount = parseFloat(booking.total_amount) || 0;
            // Convert kobo to naira if needed
            if (amount > 0 && amount < 1000) {
              amount = amount * 100;
            }
            return sum + amount;
          }
          return sum;
        }, 0);
        
        bookingTrendsData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: dayBookings.length,
          revenue: dayRevenue
        });
      }
      
      // Debug logging for chart data
      console.log('📊 Dashboard booking trends data:', {
        totalDays: bookingTrendsData.length,
        data: bookingTrendsData,
        totalBookings: recentBookings.length,
        totalRevenue: recentBookings.reduce((sum, b) => {
          if (b.status === 'confirmed' || b.status === 'completed') {
            let amount = parseFloat(b.total_amount) || 0;
            if (amount > 0 && amount < 1000) amount = amount * 100;
            return sum + amount;
          }
          return sum;
        }, 0)
      });
      
      // If no real data, generate sample data for testing
      if (bookingTrendsData.length === 0 || bookingTrendsData.every(d => d.bookings === 0 && d.revenue === 0)) {
        console.log('⚠️ No real booking data, generating sample data for testing');
        const sampleData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          sampleData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            bookings: Math.floor(Math.random() * 5) + 1, // Random 1-5 bookings
            revenue: Math.floor(Math.random() * 50000) + 10000 // Random 10k-60k revenue
          });
        }
        console.log('📊 Generated sample data:', sampleData);
        setBookingTrends(sampleData);
      } else {
        setBookingTrends(bookingTrendsData);
      }

      // Get table count
      const { data: tablesData, error: tablesError } = await supabase
        .from('venue_tables')
        .select('*')
        .eq('venue_id', venueData.id);

      if (tablesError) {
        console.error('Tables fetch error:', tablesError);
        throw tablesError;
      }

      setStats({
        totalBookings,
        totalRevenue,
        averageRating: venueData.rating || 0,
        popularTables: [],
        pendingPayouts: totalRevenue * 0.1, // 10% pending payout
        activeBookings,
        totalTables: tablesData.length
      });

      setRecentBookings(recentBookingsData);
      setBookingTrends(bookingTrendsData);

    } catch (error) {
      console.error('Error fetching venue data:', error);
      if (!silent) {
        setError(error.message);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueLoginMessage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: venueOwner } = await supabase
          .from('venue_owners')
          .select('venues(name)')
          .eq('user_id', user.id)
          .single();
        
        if (venueOwner?.venues?.name) {
          setLoginVenueMessage(`Welcome back! You are logged in as the owner of ${venueOwner.venues.name}`);
        }
      }
    } catch (error) {
      console.error('Error fetching venue login message:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/venue-owner/login');
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
    }
  };

  const cleanupSubscriptions = () => {
    if (subscriptionRef.current) {
      console.log('Cleaning up dashboard real-time subscription...');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  };

  const setupRealtimeSubscription = async (venueIds) => {
    // Clean up existing subscription first
    cleanupSubscriptions();

    if (!venueIds || venueIds.length === 0) {
      console.log('No venue IDs provided for dashboard subscription');
      return;
    }

    console.log('Setting up dashboard real-time subscription for venues:', venueIds);

    try {
      // Subscribe to bookings changes for this venue owner's venues
      subscriptionRef.current = supabase
        .channel('dashboard-bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'bookings',
            filter: `venue_id=in.(${venueIds.join(',')})` // Filter by venue IDs
          },
          (payload) => {
            console.log('Real-time booking change detected in dashboard:', payload);
            
            // Refresh data after a short delay to allow DB changes to propagate
            setTimeout(() => {
              if (currentUser) {
                fetchVenueData(true);
              }
            }, 1000);
          }
        )
        .subscribe((status) => {
          console.log('Dashboard subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to dashboard real-time updates');
          }
        });
    } catch (error) {
      console.error('Error setting up dashboard real-time subscription:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen fixed inset-0 bg-brand-cream/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-brand-cream/50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm w-full">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchVenueData}
            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!venue && !loading) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-brand-cream/50 flex items-center justify-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm w-full">
          <h2 className="text-yellow-800 font-semibold mb-2">No Venue Found</h2>
          <p className="text-yellow-600 text-sm mb-4">You haven't created a venue yet, or your venue is not associated with your account.</p>
          <a
            href="/venue-owner/register"
            className="w-full inline-block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors text-center"
          >
            Create Venue
          </a>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen w-full bg-brand-cream/50 overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-hidden">
          <div className="p-2 sm:p-3 md:p-4 lg:p-6 max-w-full">
          {/* Venue login message */}
          {loginVenueMessage && (
            <div className="mb-3 sm:mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-center text-sm">
              {loginVenueMessage}
            </div>
          )}
          
          {/* Header Section - Mobile Optimized */}
            <div className="mb-3 sm:mb-4 md:mb-6">
              <div className="text-center mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading text-brand-burgundy mb-1">Venue Dashboard</h1>
              <p className="text-xs sm:text-sm text-brand-burgundy/70">Manage your venue, bookings, and revenue</p>
            </div>
            
            {/* Action Buttons - Mobile Grid Layout */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
              <Button 
                variant="outline" 
                className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 text-xs sm:text-sm py-2 px-2 sm:px-3" 
                onClick={() => navigate('/venue-owner/settings')}
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Settings</span>
              </Button>
              <Button 
                variant="outline" 
                className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 text-xs sm:text-sm py-2 px-2 sm:px-3" 
                onClick={() => navigate('/venue-owner/credits')}
              >
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Credits</span>
                <span className="sm:hidden">Credits</span>
              </Button>
              <Button 
                variant="outline" 
                className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 text-xs sm:text-sm py-2 px-2 sm:px-3" 
                onClick={() => navigate('/venue-owner/receipts')}
              >
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Receipts</span>
                <span className="sm:hidden">Receipts</span>
              </Button>
              <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 text-xs sm:text-sm py-2 px-2 sm:px-3">
                <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">QR Code</span>
                <span className="sm:hidden">QR</span>
              </Button>
              <Button 
                variant="outline" 
                className="border-red-500 text-red-500 hover:bg-red-50 text-xs sm:text-sm py-2 px-2 sm:px-3 col-span-2 sm:col-span-1" 
                onClick={handleLogout}
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Log Out
              </Button>
            </div>
          </div>

          {/* Quick Stats - Mobile Optimized Grid */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
            <Card className="bg-white border-brand-burgundy/10">
                <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 sm:px-3 py-1.5 sm:py-2">
                <CardTitle className="text-xs font-medium text-brand-burgundy/70">Revenue</CardTitle>
                <CreditCard className="h-3 w-3 text-brand-gold" />
              </CardHeader>
                <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
                  <div className="text-xs sm:text-sm md:text-lg font-bold text-brand-burgundy">₦{(stats.totalRevenue ?? 0).toLocaleString()}</div>
                <p className="text-xs text-brand-burgundy/70">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 sm:px-3 py-1.5 sm:py-2">
                <CardTitle className="text-xs font-medium text-brand-burgundy/70">Payouts</CardTitle>
                <TrendingUp className="h-3 w-3 text-brand-gold" />
              </CardHeader>
              <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
                <div className="text-xs sm:text-sm md:text-lg font-bold text-brand-burgundy">₦{(stats.pendingPayouts ?? 0).toLocaleString()}</div>
                <p className="text-xs text-brand-burgundy/70">Pending</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 sm:px-3 py-1.5 sm:py-2">
                <CardTitle className="text-xs font-medium text-brand-burgundy/70">Bookings</CardTitle>
                <Calendar className="h-3 w-3 text-brand-gold" />
              </CardHeader>
              <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
                <div className="text-xs sm:text-sm md:text-lg font-bold text-brand-burgundy">{stats.activeBookings}</div>
                <p className="text-xs text-brand-burgundy/70">Active</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 sm:px-3 py-1.5 sm:py-2">
                <CardTitle className="text-xs font-medium text-brand-burgundy/70">Tables</CardTitle>
                <Table2 className="h-3 w-3 text-brand-gold" />
              </CardHeader>
              <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
                <div className="text-xs sm:text-sm md:text-lg font-bold text-brand-burgundy">{stats.totalTables}</div>
                <p className="text-xs text-brand-burgundy/70">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Mobile Optimized Tabs */}
          <Tabs defaultValue="bookings" className="space-y-2 sm:space-y-3 md:space-y-4">
            <TabsList className="bg-white p-0.5 sm:p-1 rounded-lg border border-brand-burgundy/10 w-full grid grid-cols-4">
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy text-xs py-1.5 sm:py-2 px-1"
              >
                <Calendar className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Bookings</span>
                <span className="sm:hidden">Book</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tables" 
                className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy text-xs py-1.5 sm:py-2 px-1"
              >
                <Table2 className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Tables</span>
                <span className="sm:hidden">Table</span>
              </TabsTrigger>
              <TabsTrigger 
                value="images" 
                className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy text-xs py-1.5 sm:py-2 px-1"
              >
                <Image className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Images</span>
                <span className="sm:hidden">Img</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy text-xs py-1.5 sm:py-2 px-1"
              >
                <BarChart3 className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
              <Card className="bg-white border-brand-burgundy/10">
                <CardContent className="pt-2 sm:pt-3 px-2 sm:px-3 pb-2 sm:pb-3">
                  <BookingList currentUser={currentUser} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tables">
              <Card className="bg-white border-brand-burgundy/10">
                <CardContent className="pt-2 sm:pt-3 px-2 sm:px-3 pb-2 sm:pb-3">
                  <TableManagement currentUser={currentUser} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images">
              <Card className="bg-white border-brand-burgundy/10">
                <CardContent className="pt-2 sm:pt-3 px-2 sm:px-3 pb-2 sm:pb-3">
                  <ImageManagement currentUser={currentUser} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="bg-white border-brand-burgundy/10">
                <CardContent className="pt-2 sm:pt-3 px-2 sm:px-3 pb-2 sm:pb-3">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Booking Trends Chart - Mobile Optimized */}
                    <div>
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm md:text-base font-semibold text-brand-burgundy">Trends (7 Days)</h3>
                        <Button
                          onClick={() => fetchVenueData(true)}
                          variant="outline"
                          size="sm"
                          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 text-xs px-1.5 sm:px-2 py-1"
                        >
                          <RefreshCw className="h-3 w-3 mr-0.5 sm:mr-1" />
                          <span className="hidden sm:inline">Refresh</span>
                          <span className="sm:hidden">↻</span>
                        </Button>
                      </div>
                      
                      <div className="h-40 sm:h-48 md:h-64">
                        {bookingTrends && bookingTrends.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={bookingTrends}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="date" 
                                stroke="#6b7280"
                                fontSize={10}
                                tick={{ fontSize: 10 }}
                              />
                              <YAxis 
                                stroke="#6b7280"
                                fontSize={10}
                                tick={{ fontSize: 10 }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '12px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="bookings" 
                                stroke="#8b5cf6" 
                                strokeWidth={2}
                                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                              <div className="text-2xl mb-2">📊</div>
                              <p className="text-xs">No data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Bookings - Mobile Optimized */}
                    <div>
                      <h3 className="text-xs sm:text-sm md:text-base font-semibold text-brand-burgundy mb-2 sm:mb-3">Recent Bookings</h3>
                      <div className="space-y-1.5 sm:space-y-2">
                        {recentBookings.map((booking) => (
                          <div key={booking.id} className="flex justify-between items-center p-1.5 sm:p-2 md:p-3 bg-brand-cream/30 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-brand-burgundy text-xs sm:text-sm truncate">
                                #{booking.id.slice(0, 8)}...
                              </div>
                              <div className="text-xs text-brand-burgundy/60">
                                {new Date(booking.booking_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right ml-2">
                              <div className="font-semibold text-brand-gold text-xs sm:text-sm">
                                ₦{(booking.total_amount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-brand-burgundy/60">
                                {booking.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default VenueOwnerDashboard;