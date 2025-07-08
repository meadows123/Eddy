import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Table2,
  Settings,
  QrCode,
  Image,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import BookingList from './components/BookingList';
import TableManagement from './components/TableManagement';
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
    popularTables: []
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const venueId = venue?.id;
  const [loginVenueMessage, setLoginVenueMessage] = useState('');

  console.log('Dashboard currentUser (top-level):', currentUser);

  useEffect(() => {
    checkAuth();
    fetchVenueLoginMessage();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Fetch VIP members who have deposited money (credit_balance > 0)
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            id,
            first_name,
            last_name,
            credit_balance,
            phone_number,
            city,
            country,
            created_at
          `)
          .gt('credit_balance', 0)
          .order('credit_balance', { ascending: false });

        if (error) {
          console.error('Error fetching VIP members:', error);
        } else {
          console.log('VIP members fetched:', data);
          setMembers(data || []);
        }
      } catch (err) {
        console.error('Error in fetchMembers:', err);
      }
    };

    // Fetch members when component mounts or user changes
    if (currentUser) {
      fetchMembers();
    }
  }, [currentUser]);

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

  const fetchVenueData = async () => {
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
      console.log('Current user:', user);

      // Get all venues for this owner
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id);
      if (venuesError) {
        console.error('Error fetching venues:', venuesError);
        throw venuesError;
      }
      console.log('Venues data:', venuesData);
      console.log('Number of venues found:', venuesData?.length || 0);
      
      // Use the first venue for dashboard context (if you want to support multiple, update UI accordingly)
      const venueData = venuesData && venuesData.length > 0 ? venuesData[0] : null;
      setVenue(venueData);
      const venueIds = venuesData?.map(v => v.id) || [];
      console.log('Venue IDs:', venueIds);

      // Get booking statistics for all venues owned by this user
      let bookings = [];
      if (venueIds.length > 0) {
        console.log('Fetching bookings for venue IDs:', venueIds);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            venue_tables!table_id (
              id,
              table_number,
              price
            )
          `)
          .in('venue_id', venueIds);
        
        if (bookingsError) {
          console.error('Error fetching bookings with table join:', bookingsError);
          // Fallback: try to get bookings without the table join
          console.log('Trying fallback query without table join...');
          const { data: fallbackBookings, error: fallbackError } = await supabase
            .from('bookings')
            .select('*')
            .in('venue_id', venueIds);
          
          if (fallbackError) {
            console.error('Fallback booking query also failed:', fallbackError);
            throw fallbackError;
          } else {
            console.log('Fallback booking query succeeded:', fallbackBookings);
            bookings = fallbackBookings || [];
          }
        } else {
          bookings = bookingsData || [];
          console.log('Raw bookings data:', bookingsData);
          console.log('Number of bookings found:', bookings.length);
        }
      } else {
        console.log('No venue IDs found, skipping booking fetch');
      }

      // Also check for any bookings in the database (debug)
      const { data: allBookings, error: allBookingsError } = await supabase
        .from('bookings')
        .select('id, venue_id, user_id, status, total_amount, created_at')
        .limit(10);
      console.log('All bookings in database (first 10):', allBookings);
      console.log('Total bookings in database:', allBookings?.length || 0);

      // Test venue_tables structure (debug)
      const { data: testTables, error: testTablesError } = await supabase
        .from('venue_tables')
        .select('*')
        .limit(1);
      console.log('Sample venue_tables data:', testTables);
      console.log('venue_tables columns available:', testTables?.[0] ? Object.keys(testTables[0]) : 'No tables found');
      if (testTablesError) {
        console.log('venue_tables error:', testTablesError);
      }

      // Get venue tables count
      let totalTables = 0;
      if (venueIds.length > 0) {
        const { data: tablesData, error: tablesError } = await supabase
          .from('venue_tables')
          .select('id')
          .in('venue_id', venueIds);
        if (!tablesError) {
          totalTables = tablesData?.length || 0;
        }
        console.log('Total tables found:', totalTables);
      }

      // Calculate statistics
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
      const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
      const pendingPayouts = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, booking) => sum + (booking.total_amount || 0), 0) * 0.8; // Assuming 80% payout after fees
      
      // Get popular tables
      const tableBookings = {};
      bookings.forEach(booking => {
        if (booking.venue_tables?.table_number) {
          tableBookings[booking.venue_tables.table_number] = (tableBookings[booking.venue_tables.table_number] || 0) + 1;
        } else if (booking.table_id) {
          // Fallback: use table_id if table details not available
          tableBookings[`Table ${booking.table_id.slice(-8)}`] = (tableBookings[`Table ${booking.table_id.slice(-8)}`] || 0) + 1;
        }
      });
      const popularTables = Object.entries(tableBookings)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalBookings,
        totalRevenue,
        activeBookings,
        pendingPayouts,
        totalTables,
        popularTables
      });

      // Get recent bookings
      const recentBookingsData = bookings
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentBookings(recentBookingsData);

      // Get booking trends (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const trends = last7Days.map(date => ({
        date,
        bookings: bookings.filter(b => b.created_at && b.created_at.startsWith(date)).length,
        revenue: bookings
          .filter(b => b.created_at && b.created_at.startsWith(date))
          .reduce((sum, b) => sum + (b.total_amount || 0), 0)
      }));

      setBookingTrends(trends);
      console.log('Data fetch completed successfully');

    } catch (error) {
      console.error('Error in fetchVenueData:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: `Failed to fetch venue data: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueLoginMessage = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoginVenueMessage('Error fetching user info.');
        return;
      }
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', user.id);
      if (venuesError) {
        setLoginVenueMessage('Error fetching venue.');
        return;
      }
      if (venues && venues.length > 0) {
        setLoginVenueMessage(`You have successfully logged in to ${venues[0].name}`);
      } else {
        setLoginVenueMessage('No venue found for this account.');
      }
    } catch (err) {
      setLoginVenueMessage('Unexpected error fetching venue.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Success',
        description: 'Successfully logged out',
      });
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
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
      <div className="container py-8">
        {/* Venue login message */}
        {loginVenueMessage && (
          <div className="mb-6 p-4 rounded bg-green-50 border border-green-200 text-green-800 text-center">
            {loginVenueMessage}
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Venue Dashboard</h1>
            <p className="text-brand-burgundy/70">Manage your venue, bookings, and revenue</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-brand-gold text-brand-gold hover:bg-brand-gold/10" onClick={() => navigate('/venue-owner/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
              <QrCode className="h-4 w-4 mr-2" />
              Generate QR Code
            </Button>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-burgundy">₦{(stats.totalRevenue ?? 0).toLocaleString()}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Pending Payouts</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-burgundy">₦{(stats.pendingPayouts ?? 0).toLocaleString()}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Active Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-burgundy">{stats.activeBookings}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Current bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-brand-burgundy/70">Total Tables</CardTitle>
              <Table2 className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-burgundy">{stats.totalTables}</div>
              <p className="text-xs text-brand-burgundy/70 mt-1">Available tables</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10">
            <TabsTrigger value="bookings" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
              <Calendar className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="tables" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
              <Table2 className="h-4 w-4 mr-2" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
              <Image className="h-4 w-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6">
                <BookingList currentUser={currentUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6">
                {venue && currentUser ? (
                  <TableManagement currentUser={currentUser} />
                ) : (
                  <div>Loading venue info...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6">
                {venue && currentUser ? (
                  <ImageManagement currentUser={currentUser} />
                ) : (
                  <div>Loading venue info...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Trends Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-brand-burgundy">Booking Trends (Last 7 Days)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookingTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="bookings"
                          stroke="#8B4513"
                          name="Bookings"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#DAA520"
                          name="Revenue (₦)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular Tables */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-brand-burgundy">Popular Tables</h3>
                  {stats.popularTables && stats.popularTables.length > 0 ? (
                    <div className="space-y-4">
                      {stats.popularTables.map((table, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-brand-cream/30 rounded-lg">
                          <span className="font-medium text-brand-burgundy">{table.name}</span>
                          <span className="font-semibold text-brand-gold">{table.count} bookings</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-burgundy/70">No booking data available yet.</p>
                  )}
                </div>

                {/* Recent Bookings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-brand-burgundy">Recent Bookings</h3>
                  {recentBookings && recentBookings.length > 0 ? (
                    <div className="space-y-4">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-3 bg-brand-cream/30 rounded-lg">
                          <div>
                            <p className="font-semibold text-brand-burgundy">
                              {booking.venue_tables?.table_number 
                                ? `Table ${booking.venue_tables.table_number}` 
                                : booking.table_id 
                                ? `Table ${booking.table_id.slice(-8)}` 
                                : 'Unknown Table'}
                            </p>
                            <p className="text-sm text-brand-burgundy/70">
                              {new Date(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-gold">₦{(booking.total_amount || 0).toLocaleString()}</p>
                            <p className="text-sm text-brand-burgundy/70 capitalize">
                              {booking.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-burgundy/70">No recent bookings found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add StaffManagement component here */}
                <p className="text-brand-burgundy/70">Loading staff...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Eddy VIP Members */}
        <Card className="bg-white border-brand-burgundy/10 mt-8">
          <CardHeader>
            <CardTitle className="text-brand-burgundy flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Eddy VIP Members
            </CardTitle>
            <p className="text-sm text-brand-burgundy/70">
              VIP members who have deposited funds and are eligible for exclusive perks
            </p>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-brand-cream/30 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-brand-burgundy">{members.length}</div>
                    <div className="text-sm text-brand-burgundy/70">Total VIP Members</div>
                  </div>
                  <div className="bg-brand-cream/30 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-brand-gold">
                      ${members.reduce((sum, member) => sum + (member.credit_balance || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-brand-burgundy/70">Total Deposits</div>
                  </div>
                  <div className="bg-brand-cream/30 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-brand-burgundy">
                      {members.filter(m => (m.credit_balance || 0) >= 10000).length}
                    </div>
                    <div className="text-sm text-brand-burgundy/70">Premium Members</div>
                  </div>
                </div>

                {/* Members Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-brand-burgundy/20">
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">Member</th>
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">VIP Status</th>
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">Credit Balance</th>
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">Location</th>
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">Joined</th>
                        <th className="text-left py-3 px-2 font-semibold text-brand-burgundy">Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        const isVIP = (member.credit_balance || 0) >= 1000;
                        const isPremium = (member.credit_balance || 0) >= 10000;
                        const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown Member';
                        const location = [member.city, member.country].filter(Boolean).join(', ') || 'Not specified';
                        const joinDate = member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Unknown';
                        
                        return (
                          <tr key={member.id} className="border-b border-brand-burgundy/10 hover:bg-brand-cream/20 transition-colors">
                            <td className="py-3 px-2">
                              <div>
                                <div className="font-medium text-brand-burgundy">{memberName}</div>
                                <div className="text-xs text-brand-burgundy/60">ID: {member.id.slice(0, 8)}...</div>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isPremium 
                                  ? 'bg-gradient-to-r from-brand-gold to-yellow-400 text-brand-burgundy'
                                  : isVIP 
                                  ? 'bg-brand-burgundy text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isPremium ? '👑 Premium VIP' : isVIP ? '⭐ VIP Member' : '📱 Basic Member'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="font-semibold text-brand-gold">
                                ${(member.credit_balance || 0).toLocaleString()}
                              </div>
                              {isPremium && (
                                <div className="text-xs text-brand-burgundy/60">Premium Perks Active</div>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm text-brand-burgundy/80">{location}</div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm text-brand-burgundy/80">{joinDate}</div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm text-brand-burgundy/80">
                                {member.phone_number || 'Not provided'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* VIP Tiers Info */}
                <div className="mt-6 p-4 bg-brand-cream/30 rounded-lg">
                  <h4 className="font-semibold text-brand-burgundy mb-2">VIP Membership Tiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-gray-100 rounded-full"></span>
                      <span className="text-brand-burgundy/70">Basic Member: $0 - $999</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-brand-burgundy rounded-full"></span>
                      <span className="text-brand-burgundy/70">VIP Member: $1,000 - $9,999</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-brand-gold rounded-full"></span>
                      <span className="text-brand-burgundy/70">Premium VIP: $10,000+</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-brand-burgundy/30 mb-4" />
                <h3 className="text-lg font-medium text-brand-burgundy mb-2">No VIP Members Yet</h3>
                <p className="text-brand-burgundy/70">
                  VIP members will appear here once they make their first deposit through the app.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Table Dialog */}
        <Dialog>
          <DialogContent aria-describedby="add-table-desc">
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