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
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import BookingList from './components/BookingList';
import ImageManagement from './components/ImageManagement';
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

      // Calculate booking trends (last 7 days)
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
        bookingTrendsData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: dayBookings.length,
          revenue: dayBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0)
        });
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchVenueData}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!venue && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-semibold mb-2">No Venue Found</h2>
          <p className="text-yellow-600">You haven't created a venue yet, or your venue is not associated with your account.</p>
          <a
            href="/venue-owner/register"
            className="mt-4 inline-block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
          >
            Create Venue
          </a>
        </div>
        <pre className="mt-4 bg-gray-100 p-2 rounded text-xs text-gray-700 overflow-x-auto">
          Debug Info: userId={currentUser?.id || 'N/A'}
        </pre>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-4 sm:py-8 px-4 sm:px-6">
        {/* Venue login message */}
        {loginVenueMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded bg-green-50 border border-green-200 text-green-800 text-center text-sm sm:text-base">
            {loginVenueMessage}
          </div>
        )}
        
        {/* Header Section */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6 sm:mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-2">Venue Dashboard</h1>
            <p className="text-sm sm:text-base text-brand-burgundy/70">Manage your venue, bookings, and revenue</p>
          </div>
          
          {/* Action Buttons - Improved mobile layout */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0">
            <Button 
              variant="outline" 
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2" 
              onClick={() => navigate('/venue-owner/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="outline" 
              className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2" 
              onClick={() => navigate('/venue-owner/credits')}
            >
              <Wallet className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Eddys Members Credits</span>
              <span className="sm:hidden">Credits</span>
            </Button>
            <Button 
              variant="outline" 
              className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2" 
              onClick={() => navigate('/venue-owner/receipts')}
            >
              <Receipt className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Receipt Management</span>
              <span className="sm:hidden">Receipts</span>
            </Button>
            <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2">
              <QrCode className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generate QR Code</span>
              <span className="sm:hidden">QR Code</span>
            </Button>
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-50 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>

        {/* Quick Stats - Improved mobile grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-brand-burgundy">₦{(stats.totalRevenue ?? 0).toLocaleString()}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Pending Payouts</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-brand-burgundy">₦{(stats.pendingPayouts ?? 0).toLocaleString()}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Active Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-brand-burgundy">{stats.activeBookings}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Current bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Total Tables</CardTitle>
              <Table2 className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-brand-burgundy">{stats.totalTables}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Available tables</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 w-full">
            <TabsTrigger 
              value="bookings" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex-1 text-xs sm:text-sm py-2 sm:py-3"
            >
              <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Bookings</span>
              <span className="sm:hidden">Bookings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex-1 text-xs sm:text-sm py-2 sm:py-3"
            >
              <Image className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Images</span>
              <span className="sm:hidden">Images</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex-1 text-xs sm:text-sm py-2 sm:py-3"
            >
              <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <BookingList currentUser={currentUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <ImageManagement venueId={venueId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="space-y-6">
                  {/* Booking Trends Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-brand-burgundy mb-4">Booking Trends (Last 7 Days)</h3>
                    <div className="h-64 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bookingTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="bookings" 
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Bookings */}
                  <div>
                    <h3 className="text-lg font-semibold text-brand-burgundy mb-4">Recent Bookings</h3>
                    <div className="space-y-3">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-brand-cream/30 rounded-lg space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <div className="font-medium text-brand-burgundy text-sm sm:text-base">
                              Booking #{booking.id.slice(0, 8)}...
                            </div>
                            <div className="text-xs sm:text-sm text-brand-burgundy/60">
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-brand-gold text-sm sm:text-base">
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

        {/* Add Table Dialog */}
        <Dialog>
          <DialogContent aria-describedby="add-table-desc" className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
            </DialogHeader>
            <div id="add-table-desc" className="sr-only">
              Fill out the form below to add a new table to your venue.
            </div>
            {/* ...rest of your dialog... */}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VenueOwnerDashboard; 