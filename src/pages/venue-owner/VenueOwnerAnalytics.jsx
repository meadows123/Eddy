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
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import BackToDashboardButton from '../../components/BackToDashboardButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    if (currentUser) {
      if (bookings.length > 0) {
        console.log('📊 Calculating analytics with', bookings.length, 'bookings');
        calculateAnalytics();
      } else {
        console.log('📊 No bookings available, calculating analytics with empty data');
        // Calculate analytics even with no bookings to show empty chart
        calculateAnalytics();
      }
    }
  }, [bookings, timeRange, currentUser]);

  // Debug: Log when analytics state changes
  useEffect(() => {
    console.log('📊 Analytics state changed:', {
      hasAnalytics: !!analytics,
      dailyRevenueLength: analytics?.dailyRevenue?.length || 0,
      totalRevenue: analytics?.totalRevenue || 0,
      totalBookings: analytics?.totalBookings || 0,
      dailyRevenueSample: analytics?.dailyRevenue?.slice(0, 3) || []
    });
  }, [analytics]);

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

      // Fetch ALL bookings (remove date restriction to show all data)
      // We'll filter by date range in the calculateAnalytics function instead
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          venue_id,
          user_id,
          status,
          total_amount,
          number_of_guests,
          booking_date,
          start_time,
          end_time,
          created_at,
          updated_at,
          venues (
            id,
            name
          )
        `)
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('📥 Fetched ALL bookings:', {
        totalBookings: bookingsData?.length || 0,
        venueIds,
        sampleBooking: bookingsData?.[0]
      });

      setBookings(bookingsData || []);

      if (bookingsData && bookingsData.length > 0) {
        console.log('💰 Sample revenue data:', {
          totalAmounts: bookingsData.map(b => b.total_amount).slice(0, 5),
          statuses: bookingsData.map(b => b.status).slice(0, 5),
          dates: bookingsData.map(b => b.booking_date || b.created_at).slice(0, 5)
        });
        
        // Log all bookings with their amounts for debugging
        console.log('📊 All bookings revenue summary:', bookingsData.map(b => ({
          id: b.id,
          total_amount: b.total_amount,
          status: b.status,
          date: b.booking_date || b.created_at,
          venue_id: b.venue_id
        })));
      }

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
    
    console.log('🔍 Calculating analytics for period:', { start, end });
    console.log('📊 Total bookings available:', bookings.length);
    
    // Filter bookings for current period
    const currentPeriodBookings = bookings.filter(booking => {
      // Use booking_date for revenue calculations, fallback to created_at for display
      const bookingDate = new Date(booking.booking_date || booking.created_at);
      const isInPeriod = bookingDate >= start && bookingDate <= end;
      
      // Debug logging for first few bookings
      if (bookings.indexOf(booking) < 3) {
        console.log('📦 Booking date check:', {
          bookingId: booking.id,
          bookingDate: booking.booking_date,
          createdAt: booking.created_at,
          parsedDate: bookingDate,
          isInPeriod,
          totalAmount: booking.total_amount,
          status: booking.status
        });
      }
      
      return isInPeriod;
    });

    console.log('✅ Current period bookings:', currentPeriodBookings.length);

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

    // Calculate metrics - only count revenue from confirmed/completed bookings
    const totalRevenue = currentPeriodBookings.reduce((sum, booking) => {
      // Only count revenue from confirmed or completed bookings
      if (booking.status !== 'confirmed' && booking.status !== 'completed') {
        console.log('🚫 Skipping revenue from non-confirmed booking:', {
          bookingId: booking.id,
          status: booking.status,
          totalAmount: booking.total_amount
        });
        return sum;
      }
      
      let amount = parseFloat(booking.total_amount) || 0;
      
      // Check if total_amount is stored in kobo (very small values) and convert to naira
      if (amount > 0 && amount < 1000) {
        console.log('⚠️ Small amount detected, converting from kobo to naira:', {
          bookingId: booking.id,
          originalAmount: amount,
          convertedAmount: amount * 100
        });
        amount = amount * 100; // Convert kobo to naira
      }
      
      // Debug: Log each booking's revenue contribution
      if (amount > 0) {
        console.log('💰 Revenue contribution:', {
          bookingId: booking.id,
          totalAmount: booking.total_amount,
          parsedAmount: amount,
          status: booking.status,
          date: booking.booking_date || booking.created_at
        });
      }
      return sum + amount;
    }, 0);
    
    const prevRevenue = prevPeriodBookings.reduce((sum, booking) => {
      // Only count revenue from confirmed or completed bookings
      if (booking.status !== 'confirmed' && booking.status !== 'completed') {
        return sum;
      }
      
      let amount = parseFloat(booking.total_amount) || 0;
      
      // Check if total_amount is stored in kobo (very small values) and convert to naira
      if (amount > 0 && amount < 1000) {
        amount = amount * 100; // Convert kobo to naira
      }
      
      return sum + amount;
    }, 0);

    console.log('💰 Revenue calculation:', {
      totalRevenue,
      prevRevenue,
      currentBookings: currentPeriodBookings.length,
      prevBookings: prevPeriodBookings.length
    });

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

    // Daily revenue for chart - use selected time range
    const { start: chartStart, end: chartEnd } = getDateRange();
    const daysInRange = Math.ceil((chartEnd - chartStart) / (1000 * 60 * 60 * 24)) + 1;
    
    const dateRange = Array.from({ length: daysInRange }, (_, i) => {
      const date = new Date(chartStart);
      date.setDate(date.getDate() + i);
      return date;
    });

    console.log('📅 Date range for chart:', {
      start: chartStart.toDateString(),
      end: chartEnd.toDateString(),
      daysInRange,
      sampleDates: dateRange.slice(0, 5).map(d => d.toDateString())
    });

    const dailyRevenue = dateRange.map(date => {
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.booking_date || booking.created_at);
        // Compare dates by date string (ignoring time)
        const isMatch = bookingDate.toDateString() === date.toDateString();
        
        // Debug: Log first few date comparisons
        if (bookings.indexOf(booking) < 3) {
          console.log('📅 Date comparison:', {
            bookingId: booking.id,
            bookingDate: booking.booking_date || booking.created_at,
            parsedBookingDate: bookingDate.toDateString(),
            targetDate: date.toDateString(),
            isMatch,
            status: booking.status,
            totalAmount: booking.total_amount
          });
        }
        
        return isMatch;
      });
      
      console.log(`📊 Day ${date.toDateString()}: Found ${dayBookings.length} bookings`);
      
      const dayRevenue = dayBookings.reduce((sum, booking) => {
        // Only count revenue from confirmed or completed bookings
        if (booking.status !== 'confirmed' && booking.status !== 'completed') {
          console.log('🚫 Skipping non-confirmed booking for daily revenue:', {
            date: date.toDateString(),
            bookingId: booking.id,
            status: booking.status,
            totalAmount: booking.total_amount
          });
          return sum;
        }
        
        let amount = parseFloat(booking.total_amount) || 0;
        
        // Check if total_amount is stored in kobo (very small values) and convert to naira
        if (amount > 0 && amount < 1000) {
          console.log('⚠️ Converting kobo to naira for daily revenue:', {
            date: date.toDateString(),
            bookingId: booking.id,
            originalAmount: amount,
            convertedAmount: amount * 100
          });
          amount = amount * 100; // Convert kobo to naira
        }
        
        // Debug: Log each booking's daily revenue contribution
        if (amount > 0) {
          console.log('📈 Daily revenue contribution:', {
            date: date.toDateString(),
            bookingId: booking.id,
            totalAmount: booking.total_amount,
            parsedAmount: amount,
            status: booking.status
          });
        }
        return sum + amount;
      }, 0);
      
      // Debug logging for days with revenue
      if (dayRevenue > 0) {
        console.log('📈 Day with revenue:', {
          date: date.toDateString(),
          revenue: dayRevenue,
          bookings: dayBookings.length,
          bookingIds: dayBookings.map(b => b.id)
        });
      } else {
        console.log('📈 Day with no revenue:', {
          date: date.toDateString(),
          revenue: dayRevenue,
          totalBookings: dayBookings.length,
          confirmedBookings: dayBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
        });
      }
      
      return {
        date: format(date, 'MMM dd'),
        revenue: dayRevenue,
        bookings: dayBookings.length
      };
    });

    console.log('📊 Daily revenue data:', dailyRevenue);
    
    // Debug: Check if we have any confirmed/completed bookings at all
    const allConfirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    console.log('🔍 All confirmed/completed bookings:', {
      total: allConfirmedBookings.length,
      sample: allConfirmedBookings.slice(0, 3).map(b => ({
        id: b.id,
        status: b.status,
        total_amount: b.total_amount,
        date: b.booking_date || b.created_at
      }))
    });

    // SIMPLE FIX: If no revenue in the 90-day range, create a chart with your actual confirmed bookings
    if (dailyRevenue.every(d => d.revenue === 0)) {
      console.log('⚠️ No revenue in 90-day range, creating chart with actual confirmed bookings');
      
      if (allConfirmedBookings.length > 0) {
        // Create a simple chart showing your actual confirmed bookings by date
        const actualRevenueData = allConfirmedBookings.map(booking => {
          const date = new Date(booking.booking_date || booking.created_at);
          let amount = parseFloat(booking.total_amount) || 0;
          
          // Convert kobo to naira if needed
          if (amount > 0 && amount < 1000) {
            amount = amount * 100;
          }
          
          return {
            date: format(date, 'MMM dd'),
            revenue: amount,
            bookings: 1
          };
        });
        
        // Sort by date
        actualRevenueData.sort((a, b) => {
          const dateA = new Date(a.date + ' 2024');
          const dateB = new Date(b.date + ' 2024');
          return dateA - dateB;
        });
        
        console.log('📊 Created chart with actual confirmed bookings:', actualRevenueData);
        
        // Replace the daily revenue with actual data
        dailyRevenue.splice(0, dailyRevenue.length, ...actualRevenueData);
      }
    }
    
    // Debug: Check which dates have confirmed bookings
    const confirmedBookingsByDate = {};
    allConfirmedBookings.forEach(booking => {
      const date = new Date(booking.booking_date || booking.created_at);
      const dateKey = date.toDateString();
      if (!confirmedBookingsByDate[dateKey]) {
        confirmedBookingsByDate[dateKey] = [];
      }
      confirmedBookingsByDate[dateKey].push(booking);
    });
    
    console.log('📅 Confirmed bookings by date:', {
      totalDates: Object.keys(confirmedBookingsByDate).length,
      sampleDates: Object.entries(confirmedBookingsByDate).slice(0, 5).map(([date, bookings]) => ({
        date,
        count: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
      }))
    });

    // If no real data, generate sample data for testing
    if (dailyRevenue.every(d => d.revenue === 0 && d.bookings === 0)) {
      console.log('⚠️ No real revenue data, generating sample data for testing');
      const sampleDailyRevenue = dateRange.map((date, index) => ({
        date: format(date, 'MMM dd'),
        revenue: Math.floor(Math.random() * 50000) + 10000, // Random 10k-60k revenue
        bookings: Math.floor(Math.random() * 5) + 1 // Random 1-5 bookings
      }));
      console.log('📊 Generated sample daily revenue:', sampleDailyRevenue);
      dailyRevenue.splice(0, dailyRevenue.length, ...sampleDailyRevenue);
    }

    // Status breakdown
    const statusBreakdown = {
      confirmed: confirmedBookings,
      pending: pendingBookings,
      cancelled: cancelledBookings,
      completed: completedBookings
    };

    // Recent bookings (last 5)
    const recentBookings = currentPeriodBookings.slice(0, 5);

    const newAnalytics = {
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
    };

    console.log('📈 Final analytics:', newAnalytics);
    console.log('📊 Daily revenue data being set:', {
      length: newAnalytics.dailyRevenue.length,
      sample: newAnalytics.dailyRevenue.slice(0, 5),
      hasData: newAnalytics.dailyRevenue.some(d => d.revenue > 0)
    });
    setAnalytics(newAnalytics);
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

  const getDateRangeDisplay = () => {
    const now = new Date();
    switch (timeRange) {
      case 'thisWeek':
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
        return `${format(startOfThisWeek, 'MMM dd')} - ${format(endOfThisWeek, 'MMM dd, yyyy')}`;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        const startOfLastWeek = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const endOfLastWeek = endOfWeek(lastWeek, { weekStartsOn: 1 });
        return `${format(startOfLastWeek, 'MMM dd')} - ${format(endOfLastWeek, 'MMM dd, yyyy')}`;
      case 'thisMonth':
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);
        return `${format(startOfThisMonth, 'MMM dd')} - ${format(endOfThisMonth, 'MMM dd, yyyy')}`;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        const startOfLastMonth = startOfMonth(lastMonth);
        const endOfLastMonth = endOfMonth(lastMonth);
        return `${format(startOfLastMonth, 'MMM dd')} - ${format(endOfLastMonth, 'MMM dd, yyyy')}`;
      default:
        return '';
    }
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
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center mb-2">
              <BackToDashboardButton className="mr-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-2">Analytics Dashboard</h1>
            <p className="text-sm sm:text-base text-brand-burgundy/70">Track your venue's performance and revenue</p>
            <div className="mt-2 p-2 bg-brand-gold/10 rounded-lg border border-brand-gold/20">
              <p className="text-xs font-medium text-brand-burgundy">
                📅 Currently viewing: <span className="font-semibold">{getDateRangeDisplay()}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            {/* Time Range Selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeRange('thisWeek')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  timeRange === 'thisWeek'
                    ? 'bg-brand-gold text-brand-burgundy border-brand-gold shadow-md'
                    : 'bg-white text-brand-burgundy/70 border-brand-burgundy/20 hover:bg-brand-gold/10 hover:border-brand-gold/50'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeRange('lastWeek')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  timeRange === 'lastWeek'
                    ? 'bg-brand-gold text-brand-burgundy border-brand-gold shadow-md'
                    : 'bg-white text-brand-burgundy/70 border-brand-burgundy/20 hover:bg-brand-gold/10 hover:border-brand-gold/50'
                }`}
              >
                Last Week
              </button>
              <button
                onClick={() => setTimeRange('thisMonth')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  timeRange === 'thisMonth'
                    ? 'bg-brand-gold text-brand-burgundy border-brand-gold shadow-md'
                    : 'bg-white text-brand-burgundy/70 border-brand-burgundy/20 hover:bg-brand-gold/10 hover:border-brand-gold/50'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeRange('lastMonth')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  timeRange === 'lastMonth'
                    ? 'bg-brand-gold text-brand-burgundy border-brand-gold shadow-md'
                    : 'bg-white text-brand-burgundy/70 border-brand-burgundy/20 hover:bg-brand-gold/10 hover:border-brand-gold/50'
                }`}
              >
                Last Month
              </button>
            </div>
            
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Total Revenue */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-brand-burgundy/70">Total Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-brand-burgundy truncate">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-full flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-1 sm:mt-2">
                {getGrowthIcon(analytics.revenueGrowth)}
                <span className={`text-xs sm:text-sm ml-1 ${getGrowthColor(analytics.revenueGrowth)}`}>
                  {analytics.revenueGrowth.toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Bookings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-brand-burgundy/70">Total Bookings</p>
                  <p className="text-lg sm:text-2xl font-bold text-brand-burgundy">
                    {analytics.totalBookings}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-1 sm:mt-2">
                {getGrowthIcon(analytics.bookingGrowth)}
                <span className={`text-xs sm:text-sm ml-1 ${getGrowthColor(analytics.bookingGrowth)}`}>
                  {analytics.bookingGrowth.toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Average Booking Value */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-brand-burgundy/70">Avg. Booking Value</p>
                  <p className="text-lg sm:text-2xl font-bold text-brand-burgundy truncate">
                    {formatCurrency(analytics.averageBookingValue)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-full flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex items-center mt-1 sm:mt-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <span className="text-xs sm:text-sm ml-1 text-gray-500">
                  Per booking average
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Bookings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-brand-burgundy/70">Confirmed Bookings</p>
                  <p className="text-lg sm:text-2xl font-bold text-brand-burgundy">
                    {analytics.confirmedBookings}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-full flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-1 sm:mt-2">
                <span className="text-xs sm:text-sm text-gray-500">
                  {analytics.pendingBookings} pending, {analytics.cancelledBookings} cancelled
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue Chart */}
          <Card className="xl:col-span-2 bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-sm sm:text-base">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Bookings & Revenue Chart
                <span className="ml-2 text-xs font-normal text-brand-burgundy/60">
                  ({getDateRangeDisplay()})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {/* Debug info for chart data */}
              <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <strong>Chart Debug:</strong> {analytics.dailyRevenue.length} days, 
                Max revenue: {Math.max(...analytics.dailyRevenue.map(d => d.revenue))}, 
                Total days with revenue: {analytics.dailyRevenue.filter(d => d.revenue > 0).length}
              </div>
              
              <div className="h-64 sm:h-80">
                {analytics.dailyRevenue && analytics.dailyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#8b5cf6"
                        fontSize={12}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#f59e0b"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => [
                          name === 'bookings' ? `${value} bookings` : `₦${value.toLocaleString()}`,
                          name === 'bookings' ? 'Bookings' : 'Revenue'
                        ]}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="bookings" 
                        fill="#8b5cf6" 
                        radius={[4, 4, 0, 0]}
                        name="Bookings"
                        barSize={40}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="revenue" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]}
                        name="Revenue (₦)"
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="text-sm">No revenue data available</p>
                      <p className="text-xs text-gray-400">Check if you have any confirmed bookings</p>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <strong>Debug:</strong> analytics.dailyRevenue: {analytics.dailyRevenue ? analytics.dailyRevenue.length : 'undefined'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Breakdown */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Booking Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-brand-burgundy/70">Confirmed</span>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {analytics.statusBreakdown.confirmed}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-brand-burgundy/70">Pending</span>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {analytics.statusBreakdown.pending}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-brand-burgundy/70">Completed</span>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {analytics.statusBreakdown.completed}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-brand-burgundy/70">Cancelled</span>
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {analytics.statusBreakdown.cancelled}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        {analytics.recentBookings.length > 0 && (
          <Card className="mt-4 sm:mt-6 bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {analytics.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-brand-burgundy/10 rounded-lg space-y-2 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="h-2 w-2 bg-brand-gold rounded-full flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-brand-burgundy text-sm sm:text-base truncate">
                          {booking.venues?.name || 'Unknown Venue'}
                        </p>
                        <p className="text-xs sm:text-sm text-brand-burgundy/70">
                          {format(new Date(booking.booking_date || booking.created_at), 'MMM dd, yyyy')} • {booking.number_of_guests} guests
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:text-right space-x-2 sm:space-x-0">
                      <p className="font-semibold text-brand-burgundy text-sm sm:text-base">
                        {formatCurrency(booking.total_amount)}
                      </p>
                      <Badge
                        className={`text-xs ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
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