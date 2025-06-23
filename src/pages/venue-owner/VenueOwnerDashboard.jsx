import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Table2,
  Settings,
  QrCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import BookingList from './components/BookingList';
import TableManagement from './components/TableManagement';
import { supabase } from '../../lib/supabase';
import { toast } from '../../components/ui/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const VenueOwnerDashboard = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', currentUser?.id);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        // Deduplicate by user id
        const unique = Array.from(new Map(data.map(m => [m.id, m])).values());
        setMembers(unique);
      }
    };

    if (venueId) fetchMembers();
  }, [venueId, currentUser?.id]);

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
      // Use the first venue for dashboard context (if you want to support multiple, update UI accordingly)
      const venueData = venuesData && venuesData.length > 0 ? venuesData[0] : null;
      setVenue(venueData);
      const venueIds = venuesData.map(v => v.id);

      // Get booking statistics for all venues owned by this user
      let bookings = [];
      if (venueIds.length > 0) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .in('venue_id', venueIds);
        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          throw bookingsError;
        }
        bookings = bookingsData;
      }
      console.log('Bookings data:', bookings);

      // Calculate statistics
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.tables?.price || 0), 0);
      const averageRating = bookings.reduce((sum, booking) => sum + (booking.rating || 0), 0) / totalBookings || 0;

      // Get popular tables
      const tableBookings = {};
      bookings.forEach(booking => {
        if (booking.tables?.name) {
          tableBookings[booking.tables.name] = (tableBookings[booking.tables.name] || 0) + 1;
        }
      });
      const popularTables = Object.entries(tableBookings)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalBookings,
        totalRevenue,
        averageRating,
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
        bookings: bookings.filter(b => b.created_at.startsWith(date)).length,
        revenue: bookings
          .filter(b => b.created_at.startsWith(date))
          .reduce((sum, b) => sum + (b.tables?.price || 0), 0)
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
                <BookingList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6">
                {venue && venue.owner_id ? (
                  <TableManagement currentUser={{ id: venue.owner_id }} />
                ) : (
                  <div className="text-center text-brand-burgundy/70 py-8">Loading venue info...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Analytics component here */}
                <p className="text-brand-burgundy/70">Loading analytics...</p>
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

        {/* Booking Trends Chart */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Booking Trends</h3>
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
                  stroke="#8884d8"
                  name="Bookings"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#82ca9d"
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Popular Tables */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Popular Tables</h3>
          <div className="space-y-4">
            {stats.popularTables.map((table, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{table.name}</span>
                <span className="font-semibold">{table.count} bookings</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{booking.tables?.name || 'Unknown Table'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${booking.tables?.price || 0}</p>
                  <p className="text-sm text-gray-500">
                    {booking.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Eddy Members */}
        <Card className="bg-white border-brand-burgundy/10 mt-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Eddy Members</h2>
            {members && members.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Credit Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id}>
                      <td className="py-2">{member.first_name} {member.last_name}</td>
                      <td className="py-2">${(member.credit_balance ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No Eddy Members yet.</p>
            )}
          </div>
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