import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const VenueOwnerAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [timeRange, setTimeRange] = useState('thisMonth'); // thisMonth, lastMonth, thisWeek, lastWeek
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averageBookingValue: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    dailyRevenue: [],
    monthlyRevenue: [],
    statusBreakdown: {},
    recentBookings: []
  });

  // Refs for cleanup
  const subscriptionRef = useRef(null);
  const autoRefreshRef = useRef(null);

  useEffect(() => {
    checkAuthAndFetchData();
    
    // Set up auto-refresh every 30 seconds as fallback
    autoRefreshRef.current = setInterval(() => {
      if (currentUser && !refreshing) {
        console.log('Auto-refreshing analytics data...');
        fetchBookingsData(currentUser, true); // silent refresh
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      cleanupSubscriptions();
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser && bookings.length > 0) {
      calculateAnalytics();
    }
  }, [bookings, timeRange, currentUser]);

  const cleanupSubscriptions = () => {
    if (subscriptionRef.current) {
      console.log('Cleaning up real-time subscription...');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  };

  const setupRealtimeSubscription = async (venueIds) => {
    // Clean up existing subscription first
    cleanupSubscriptions();

    if (!venueIds || venueIds.length === 0) {
      console.log('No venue IDs provided for subscription');
      return;
    }

    console.log('Setting up real-time subscription for venues:', venueIds);

    try {
      // Subscribe to bookings changes for this venue owner's venues
      subscriptionRef.current = supabase
        .channel('venue-bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'bookings',
            filter: `venue_id=in.(${venueIds.join(',')})` // Filter by venue IDs
          },
          (payload) => {
            console.log('Real-time booking change detected:', payload);
            
            // Show a toast notification for new bookings
            if (payload.eventType === 'INSERT') {
              toast({
                title: 'New Booking!',
                description: `A new booking has been received for ₦${payload.new.total_amount?.toLocaleString() || 0}`,
                className: 'bg-green-50 border-green-200',
              });
            } else if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old.status) {
              toast({
                title: 'Booking Updated',
                description: `Booking status changed to ${payload.new.status}`,
                className: 'bg-blue-50 border-blue-200',
              });
            }

            // Refresh data after a short delay to allow DB changes to propagate
            setTimeout(() => {
              if (currentUser) {
                fetchBookingsData(currentUser, true);
              }
            }, 1000);
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates');
            toast({
              title: 'Live Updates Enabled',
              description: 'Analytics will update automatically when new bookings arrive',
              className: 'bg-green-50 border-green-200',
            });
          } else if (status === 'CLOSED') {
            console.log('Real-time subscription closed');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Real-time subscription error');
            toast({
              title: 'Real-time Updates Unavailable',
              description: 'Analytics will refresh every 30 seconds instead',
              variant: 'destructive',
            });
          }
        });
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      toast({
        title: 'Real-time Setup Failed',
        description: 'Using automatic refresh instead',
        variant: 'destructive',
      });
    }
  };

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view analytics',
          variant: 'destructive',
        });
        return;
      }

      setCurrentUser(user);
      await fetchBookingsData(user);
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'Failed to authenticate user',
        variant: 'destructive',
      });
    }
  };

  const fetchBookingsData = async (user, silentRefresh = false) => {
    try {
      if (!silentRefresh) {
        setLoading(true);
      }

      // First get venues owned by this user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', user.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setBookings([]);
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Set up real-time subscription for these venues (only if not already set up)
      if (!subscriptionRef.current) {
        await setupRealtimeSubscription(venueIds);
      }

      // Fetch bookings for the last 6 months to calculate trends
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          venue_id,
          user_id,
          status,
          total_amount,
          guest_count,
          booking_date,
          booking_time,
          created_at,
          updated_at,
          venues (
            id,
            name
          )
        `)
        .in('venue_id', venueIds)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      setBookings(bookingsData || []);
      
      if (!silentRefresh) {
        console.log('Analytics data refreshed successfully');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (!silentRefresh) {
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    if (currentUser) {
      await fetchBookingsData(currentUser);
    }
    setRefreshing(false);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'thisWeek':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'lastWeek':
        const lastWeek = subMonths(now, 1);
        return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const calculateAnalytics = () => {
    const { start, end } = getDateRange();
    
    // Filter bookings for current period
    const currentPeriodBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date || booking.created_at);
      return bookingDate >= start && bookingDate <= end;
    });

    // Get comparison period (previous month/week)
    const prevStart = timeRange.includes('Month') 
      ? startOfMonth(subMonths(start, 1))
      : startOfWeek(subMonths(start, 1));
    const prevEnd = timeRange.includes('Month')
      ? endOfMonth(subMonths(start, 1))
      : endOfWeek(subMonths(start, 1));

    const prevPeriodBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date || booking.created_at);
      return bookingDate >= prevStart && bookingDate <= prevEnd;
    });

    // Calculate metrics
    const totalRevenue = currentPeriodBookings.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0
    );
    
    const prevRevenue = prevPeriodBookings.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0
    );

    const totalBookings = currentPeriodBookings.length;
    const prevBookings = prevPeriodBookings.length;

    const confirmedBookings = currentPeriodBookings.filter(b => b.status === 'confirmed').length;
    const pendingBookings = currentPeriodBookings.filter(b => b.status === 'pending').length;
    const cancelledBookings = currentPeriodBookings.filter(b => b.status === 'cancelled').length;
    const completedBookings = currentPeriodBookings.filter(b => b.status === 'completed').length;

    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const revenueGrowth = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0;

    const bookingGrowth = prevBookings > 0 
      ? ((totalBookings - prevBookings) / prevBookings) * 100 
      : totalBookings > 0 ? 100 : 0;

    // Daily revenue for chart (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    const dailyRevenue = last30Days.map(date => {
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.booking_date || booking.created_at);
        return bookingDate.toDateString() === date.toDateString();
      });
      
      return {
        date: format(date, 'MMM dd'),
        revenue: dayBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0),
        bookings: dayBookings.length
      };
    });

    // Status breakdown
    const statusBreakdown = {
      confirmed: confirmedBookings,
      pending: pendingBookings,
      cancelled: cancelledBookings,
      completed: completedBookings
    };

    // Recent bookings (last 5)
    const recentBookings = currentPeriodBookings.slice(0, 5);

    setAnalytics({
      totalRevenue,
      totalBookings,
      averageBookingValue,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      revenueGrowth,
      bookingGrowth,
      dailyRevenue,
      statusBreakdown,
      recentBookings
    });
  };

  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
              <p className="text-brand-burgundy/70">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Analytics Dashboard</h1>
            <p className="text-brand-burgundy/70">Track your venue's performance and revenue</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-brand-burgundy/20 rounded-lg bg-white text-brand-burgundy"
            >
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
            
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Total Revenue</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getGrowthIcon(analytics.revenueGrowth)}
                <span className={`text-sm ml-1 ${getGrowthColor(analytics.revenueGrowth)}`}>
                  {analytics.revenueGrowth.toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Bookings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Total Bookings</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    {analytics.totalBookings}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getGrowthIcon(analytics.bookingGrowth)}
                <span className={`text-sm ml-1 ${getGrowthColor(analytics.bookingGrowth)}`}>
                  {analytics.bookingGrowth.toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Average Booking Value */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Avg. Booking Value</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    {formatCurrency(analytics.averageBookingValue)}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <span className="text-sm ml-1 text-gray-500">
                  Per booking average
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Bookings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-burgundy/70">Confirmed Bookings</p>
                  <p className="text-2xl font-bold text-brand-burgundy">
                    {analytics.confirmedBookings}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">
                  {analytics.pendingBookings} pending, {analytics.cancelledBookings} cancelled
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Daily Revenue Trend (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-1">
                {analytics.dailyRevenue.map((day, index) => {
                  const maxRevenue = Math.max(...analytics.dailyRevenue.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className="bg-brand-gold rounded-t w-full min-h-[4px] transition-all duration-300 hover:bg-brand-burgundy"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.date}: ${formatCurrency(day.revenue)} (${day.bookings} bookings)`}
                      />
                      <span className="text-xs text-brand-burgundy/70 mt-2 rotate-45 origin-top-left">
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Breakdown */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle>Booking Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-burgundy/70">Confirmed</span>
                <Badge className="bg-green-100 text-green-800">
                  {analytics.statusBreakdown.confirmed}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-burgundy/70">Pending</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {analytics.statusBreakdown.pending}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-burgundy/70">Completed</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {analytics.statusBreakdown.completed}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-burgundy/70">Cancelled</span>
                <Badge className="bg-red-100 text-red-800">
                  {analytics.statusBreakdown.cancelled}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        {analytics.recentBookings.length > 0 && (
          <Card className="mt-6 bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-2 w-2 bg-brand-gold rounded-full" />
                      <div>
                        <p className="font-medium text-brand-burgundy">
                          {booking.venues?.name || 'Unknown Venue'}
                        </p>
                        <p className="text-sm text-brand-burgundy/70">
                          {format(new Date(booking.booking_date || booking.created_at), 'MMM dd, yyyy')} • {booking.guest_count} guests
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-burgundy">
                        {formatCurrency(booking.total_amount)}
                      </p>
                      <Badge
                        className={
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VenueOwnerAnalytics; 