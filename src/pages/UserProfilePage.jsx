import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Removed API imports - using direct Supabase queries for better error handling
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Heart, Calendar, Settings, Clipboard, XCircle, CheckCircle, Send, Link as LinkIcon, Wallet, User, Eye, EyeOff, Clock, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Input } from "../components/ui/input";
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { useToast } from "@/components/ui/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const UserProfilePage = () => {
  const { toast } = useToast();
  console.log('🔍 UserProfilePage component is rendering');
  const { user, signIn, signUp, signOut } = useAuth();
  console.log('👤 Current user:', user);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    password: '', 
    confirm: '',
    firstName: '',
    lastName: '',
    age: '',
    phone: '',
    city: '',
    country: ''
  });
  const [error, setError] = useState(null);
  const [signupError, setSignupError] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savedVenues, setSavedVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    city: '',
    country: '',
    age: ''
  });
  const [splitPaymentsSent, setSplitPaymentsSent] = useState([]);
  const [splitPaymentsReceived, setSplitPaymentsReceived] = useState([]);
  const [splitPaymentsLoading, setSplitPaymentsLoading] = useState(true);
  const [splitPaymentsError, setSplitPaymentsError] = useState(null);
  const [splitPaymentNotification, setSplitPaymentNotification] = useState(null);
  const [payingRequest, setPayingRequest] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [stripeSuccess, setStripeSuccess] = useState(null);
  const [bookingRef, setBookingRef] = useState(null);
  const [venueCredits, setVenueCredits] = useState([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  
  // Add password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add this function to debug table structure
  const debugTableStructure = async () => {
    if (!user) return;
    
    console.log('🔍 Debugging venue_credits table structure...');
    
    try {
      // First, let's try a simple select to see if the table exists
      const { data: simpleData, error: simpleError } = await supabase
        .from('venue_credits')
        .select('*')
        .limit(1);
      
      console.log('📊 Simple table query result:', { data: simpleData, error: simpleError });
      
      if (simpleError) {
        console.error('❌ Table query failed:', simpleError);
        
        // Try to get table info
        const { data: tableInfo, error: tableError } = await supabase
          .rpc('get_table_info', { table_name: 'venue_credits' });
        
        console.log('📋 Table info:', { data: tableInfo, error: tableError });
        
        // Try alternative table names
        const alternativeTables = ['venue_credits', 'credits', 'user_credits', 'venue_credit'];
        
        for (const tableName of alternativeTables) {
          console.log(`🔍 Trying alternative table: ${tableName}`);
          const { data: altData, error: altError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!altError) {
            console.log(`✅ Found working table: ${tableName}`, altData);
            break;
          } else {
            console.log(`❌ Table ${tableName} not accessible:`, altError);
          }
        }
      } else {
        console.log('✅ Table exists and is accessible');
        console.log('📊 Sample data:', simpleData);
      }
      
    } catch (error) {
      console.error('❌ Debug function error:', error);
    }
  };

  // Load user data when logged in
  useEffect(() => {
    if (user) {
      loadUserData();
      loadVenueCredits();
      debugTableStructure(); // Add this debug call
    }
  }, [user]);

  // Load split payment requests (sent and received)
  useEffect(() => {
    if (!user) return;
    setSplitPaymentsLoading(true);
    const fetchSplitPayments = async () => {
      try {
        // Sent requests - join with recipient profiles
        const { data: sent, error: sentError } = await supabase
          .from('split_payment_requests')
          .select(`
            *,
            profiles!split_payment_requests_recipient_id_fkey (
              first_name,
              last_name,
              phone
            )
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });
        
        // Received requests - join with requester profiles  
        const { data: received, error: receivedError } = await supabase
          .from('split_payment_requests')
          .select(`
            *,
            profiles!split_payment_requests_requester_id_fkey (
              first_name,
              last_name,
              phone
            )
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false });
          
        console.log('Split payments data:', { sent, received, sentError, receivedError });
          
        if (sentError || receivedError) throw sentError || receivedError;
        
        // Map the joined data to the expected format
        const mappedSent = (sent || []).map(request => ({
          ...request,
          recipient_profile: request.profiles
        }));
        
        const mappedReceived = (received || []).map(request => ({
          ...request,
          requester_profile: request.profiles
        }));
        
        setSplitPaymentsSent(mappedSent);
        setSplitPaymentsReceived(mappedReceived);
        setSplitPaymentsError(null);
        
        // Notification for new received requests
        const newRequest = mappedReceived.find(r => r.status === 'pending' && !r.seen_by_recipient);
        if (newRequest) setSplitPaymentNotification('You have a new split payment request!');
      } catch (err) {
        console.error('Error fetching split payments:', err);
        setSplitPaymentsError('Failed to load split payment requests.');
      } finally {
        setSplitPaymentsLoading(false);
      }
    };
    fetchSplitPayments();
  }, [user]);

  const loadVenueCredits = async () => {
    if (!user) {
      console.log('❌ No user found, skipping credit load');
      return;
    }
    
    console.log('🔍 Loading venue credits for user:', user.id);
    setCreditsLoading(true);
    
    try {
      console.log('📡 Querying venue_credits table...');
      const { data: creditsData, error } = await supabase
        .from('venue_credits')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('remaining_balance', 0)
        .order('created_at', { ascending: false });

      console.log('📊 Credits query result:', { data: creditsData, error });

      if (error) {
        console.error('❌ Error fetching credits:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Credits fetched successfully, count:', creditsData?.length || 0);

      // Get venue data for each credit separately
      const creditsWithVenueData = await Promise.all(
        (creditsData || []).map(async (credit, index) => {
          console.log(`🏢 Fetching venue data for credit ${index + 1}:`, credit.venue_id);
          
          try {
            const { data: venueData, error: venueError } = await supabase
              .from('venues')
              .select('id, name, address, type, city')
              .eq('id', credit.venue_id)
              .single();

            if (!venueError && venueData) {
              console.log(`✅ Venue data fetched for credit ${index + 1}:`, venueData.name);
              credit.venues = venueData;
            } else {
              console.warn(`⚠️ Could not fetch venue data for credit ${index + 1}:`, venueError);
              // Fallback venue data
              credit.venues = {
                id: credit.venue_id,
                name: 'Unknown Venue',
                address: 'Address not available',
                type: 'Venue',
                city: 'City not available'
              };
            }
          } catch (err) {
            console.error(`❌ Error fetching venue data for credit ${index + 1}:`, err);
            credit.venues = {
              id: credit.venue_id,
              name: 'Unknown Venue',
              address: 'Address not available',
              type: 'Venue',
              city: 'City not available'
            };
          }
          return credit;
        })
      );

      console.log('🎯 Final credits with venue data:', creditsWithVenueData);
      setVenueCredits(creditsWithVenueData);
      
    } catch (error) {
      console.error('❌ Error loading venue credits:', error);
    } finally {
      setCreditsLoading(false);
      console.log('🏁 Credit loading completed');
    }
  };

  const loadUserData = async () => {
    try {
      // Load profile - handle missing profile by creating one
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, try to create one or update existing
        console.log('Profile not found, attempting to create or update...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([{
            id: user.id,
            first_name: '',
            last_name: '',
            phone: '',
            city: '',
            country: '',
            age: null
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating/updating profile:', createError);
          // If upsert fails, try to fetch the existing profile again
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!fetchError && existingProfile) {
            setProfile(existingProfile);
            setProfileForm({
              first_name: existingProfile.first_name || '',
              last_name: existingProfile.last_name || '',
              phone_number: existingProfile.phone || '',
              city: existingProfile.city || '',
              country: existingProfile.country || '',
              age: existingProfile.age || ''
            });
          }
        } else {
          setProfile(newProfile);
          setProfileForm({
            first_name: newProfile.first_name || '',
            last_name: newProfile.last_name || '',
            phone_number: newProfile.phone || '',
            city: newProfile.city || '',
            country: newProfile.country || '',
            age: newProfile.age || ''
          });
        }
      } else if (profileError) {
        console.error('Profile error:', profileError);
      } else {
        setProfile(profileData);
        setProfileForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone_number: profileData.phone || '',
          city: profileData.city || '',
          country: profileData.country || '',
          age: profileData.age || ''
        });
      }

      // Load saved venues (check if table exists first)
      console.log('🔍 Loading saved venues for user:', user.id);
      
      const { data: savedVenuesData, error: savedVenuesError } = await supabase
        .from('saved_venues')
        .select(`
          *,
          venues (
            id,
            name,
            type,
            city,
            rating
          )
        `)
        .eq('user_id', user.id);
      
      console.log('📊 Saved venues query result:', { data: savedVenuesData, error: savedVenuesError });
      
      if (savedVenuesError) {
        console.error('❌ Saved venues error:', savedVenuesError);
        // If table doesn't exist, set empty array
        setSavedVenues([]);
      } else {
        console.log('✅ Saved venues loaded successfully:', savedVenuesData?.length || 0);
        setSavedVenues(savedVenuesData || []);
      }

      // Load bookings with proper relationships
      console.log('🔍 Fetching bookings for user:', user.id);

      // First, let's check if the bookings table exists and has any data
      const { data: testData, error: testError } = await supabase
        .from('bookings')
        .select('id')
        .limit(1);

      console.log('📊 Test query result:', { testData, testError });

      // Now try the full query
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            id,
            name,
            type,
            city,
            address
          ),
          venue_tables!table_id (
            id,
            table_number
          )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      // Log the full response
      console.log('📊 Full bookings query:', {
        query: 'SELECT * FROM bookings WHERE user_id = ' + user.id,
        data: bookingsData,
        error: bookingsError,
        count: bookingsData?.length || 0
      });

      // Check if we got any data
      if (bookingsError) {
        console.error('❌ Bookings error:', bookingsError);
        setBookings([]);
      } else {
        if (bookingsData && bookingsData.length > 0) {
          console.log('✅ Found bookings:', bookingsData.map(b => ({
            id: b.id,
            venue: b.venues?.name,
            date: b.booking_date,
            status: b.status
          })));
        } else {
          console.log('⚠️ No bookings found for user');
        }
        setBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone_number,
          city: profileForm.city,
          country: profileForm.country,
          age: profileForm.age ? parseInt(profileForm.age) : null
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updatedProfile);
      setEditingProfile(false);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await signIn(form);
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirm) {
      setSignupError('Passwords do not match');
      return;
    }
    try {
      console.log('🔍 DEBUG: UserProfilePage signup payload:', {
        email: signupForm.email,
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        city: signupForm.city,
        country: signupForm.country
      });

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: {
            first_name: signupForm.firstName,
            last_name: signupForm.lastName,
            age: signupForm.age,
            city: signupForm.city,
            country: signupForm.country,
            phone: signupForm.phone
          }
        }
      });

      console.log('📥 DEBUG: Auth response:', { signUpData, signUpError });

      if (signUpError) {
        console.error('❌ DEBUG: Sign up error:', signUpError);
        setSignupError(signUpError.message);
        return;
      }

      console.log('✅ DEBUG: Auth signup successful, user created:', signUpData.user);

      const userId = signUpData.user.id;
      // Use upsert to handle the case where trigger already created a profile
      const profileData = {
        id: userId, 
        first_name: signupForm.firstName, 
        last_name: signupForm.lastName, 
        age: signupForm.age ? parseInt(signupForm.age) : null,
        phone: signupForm.phone,
        city: signupForm.city,
        country: signupForm.country,
        email: signupForm.email
      };

      console.log('📤 DEBUG: Profile data for upsert:', profileData);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([profileData]);

      console.log('📥 DEBUG: Profile upsert result:', { profileError });

      if (profileError) {
        console.error('❌ DEBUG: Upsert error:', profileError);
        setSignupError(profileError.message);
        return;
      }

      console.log('✅ DEBUG: Profile created successfully');
      setSignupSuccess('Account created successfully! Please check your email to confirm your account.');
      
    } catch (error) {
      console.error('💥 DEBUG: Unexpected error during signup:', error);
      setSignupError(error.message);
    }
  };

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "profile");

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-heading text-brand-burgundy">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="mt-2 text-brand-burgundy/70">
              {isSignup ? 'Join Eddys Members today' : 'Sign in to your account'}
            </p>
          </div>

          {isSignup ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={signupForm.firstName}
                  onChange={e => setSignupForm({ ...signupForm, firstName: e.target.value })}
                  className="w-full border p-2 rounded bg-white"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={signupForm.lastName}
                  onChange={e => setSignupForm({ ...signupForm, lastName: e.target.value })}
                  className="w-full border p-2 rounded bg-white"
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signupForm.email}
                onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              
              {/* Password field with visibility toggle */}
              <div className="relative">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={signupForm.password}
                  onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full border p-2 pr-10 rounded bg-white"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                >
                  {showSignupPassword ? (
                    <EyeOff className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  ) : (
                    <Eye className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  )}
                </button>
              </div>
              
              {/* Confirm Password field with visibility toggle */}
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm"
                  placeholder="Confirm Password"
                  value={signupForm.confirm}
                  onChange={e => setSignupForm({ ...signupForm, confirm: e.target.value })}
                  className="w-full border p-2 pr-10 rounded bg-white"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  ) : (
                    <Eye className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  )}
                </button>
              </div>
              
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={signupForm.age}
                onChange={e => setSignupForm({ ...signupForm, age: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                min="18"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={signupForm.phone}
                onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={signupForm.city}
                onChange={e => setSignupForm({ ...signupForm, city: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              <input
                type="text"
                name="country"
                placeholder="Country"
                value={signupForm.country}
                onChange={e => setSignupForm({ ...signupForm, country: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              {signupError && <div className="text-red-500">{signupError}</div>}
              {signupSuccess && <div className="text-green-600">{signupSuccess}</div>}
              <Button type="submit" className="w-full bg-brand-burgundy text-white">Sign Up</Button>
              
              <div className="text-center mt-4">
                <span className="text-brand-burgundy/70">Already have an account? </span>
                <button 
                  type="button" 
                  onClick={() => setIsSignup(false)}
                  className="font-bold text-brand-burgundy hover:text-brand-burgundy/80 transition-colors"
                >
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              
              {/* Password field with visibility toggle */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                  className="w-full border p-2 pr-10 rounded bg-white"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  ) : (
                    <Eye className="h-4 w-4 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  )}
                </button>
              </div>
              
              {error && <div className="text-red-500">{error}</div>}
              {success && <div className="text-green-600">{success}</div>}
              <Button type="submit" className="w-full bg-brand-burgundy text-white">Login</Button>
              
              {/* Forgot Password Link */}
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.email) {
                      setError('Please enter your email address first');
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                        redirectTo: `${window.location.origin}/reset-password`
                      });
                      if (error) throw error;
                      setSuccess('Password reset email sent! Check your inbox.');
                      setError(''); // Clear any previous errors
                    } catch (err) {
                      setError(err.message || 'Failed to send password reset email');
                    }
                  }}
                  className="text-sm text-brand-burgundy hover:text-brand-gold transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="text-center mt-4">
                <span className="text-brand-burgundy/70">Don't have an account? </span>
                <button 
                  type="button" 
                  onClick={() => setIsSignup(true)}
                  className="font-bold text-brand-burgundy hover:text-brand-burgundy/80 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-4 sm:py-8 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-2">My Profile</h1>
            <p className="text-sm sm:text-base text-brand-burgundy/70">Manage your account and preferences</p>
          </div>
          <Button 
            onClick={signOut}
            variant="outline" 
            className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 w-full sm:w-auto"
          >
            Sign Out
          </Button>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 grid grid-cols-2 md:grid-cols-7 h-auto">
            <TabsTrigger value="profile" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Heart className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Saved</span>
              <span className="sm:hidden">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Bookings</span>
              <span className="sm:hidden">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="split-payments" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Send className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Split Payments</span>
              <span className="sm:hidden">Split</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Wallet className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Wallet</span>
              <span className="sm:hidden">Wallet</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
                  <h2 className="text-xl font-semibold text-center sm:text-left">Profile Information</h2>
                  {profile && !editingProfile && (
                    <Button
                      onClick={() => setEditingProfile(true)}
                      variant="outline"
                      className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 w-full sm:w-auto"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
                {profile ? (
                  editingProfile ? (
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">Email</label>
                        <p className="text-sm text-brand-burgundy/50">{user.email} (cannot be changed)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">First Name</label>
                        <Input
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(prev => ({...prev, first_name: e.target.value}))}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">Last Name</label>
                        <Input
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(prev => ({...prev, last_name: e.target.value}))}
                          placeholder="Enter last name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">Phone Number</label>
                        <Input
                          value={profileForm.phone_number}
                          onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">Age</label>
                        <Input
                          type="number"
                          value={profileForm.age}
                          onChange={(e) => setProfileForm(prev => ({...prev, age: e.target.value}))}
                          placeholder="Enter age"
                          min={1}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">City</label>
                          <Input
                            value={profileForm.city}
                            onChange={(e) => setProfileForm(prev => ({...prev, city: e.target.value}))}
                            placeholder="Enter city"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-burgundy/70 mb-1">Country</label>
                          <Input
                            value={profileForm.country}
                            onChange={(e) => setProfileForm(prev => ({...prev, country: e.target.value}))}
                            placeholder="Enter country"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={updateProfile}
                          className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingProfile(false);
                            setProfileForm({
                              first_name: profile.first_name || '',
                              last_name: profile.last_name || '',
                              phone_number: profile.phone || '',
                              city: profile.city || '',
                              country: profile.country || '',
                              age: profile.age || ''
                            });
                          }}
                          variant="outline"
                          className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70">Email</label>
                        <p className="mt-1">{user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70">Name</label>
                        <p className="mt-1">{profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}` : 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70">Phone</label>
                        <p className="mt-1">{profile.phone || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70">Age</label>
                        <p className="mt-1">{profile.age || 'Not set'}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-brand-burgundy/70">City</label>
                          <p className="mt-1">{profile.city || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-burgundy/70">Country</label>
                          <p className="mt-1">{profile.country || 'Not set'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-burgundy/70">Member Since</label>
                        <p className="mt-1">{new Date(profile.created_at || user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )
                ) : (
                  <p>Loading profile...</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4">Saved Venues</h2>
                {savedVenues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedVenues.map((saved) => (
                      <Card key={saved.id} className="p-4">
                        <h3 className="font-semibold">{saved.venues.name}</h3>
                        <p className="text-sm text-brand-burgundy/70">{saved.venues.type}</p>
                        <Button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('saved_venues')
                                .delete()
                                .eq('user_id', user.id)
                                .eq('venue_id', saved.venue_id);
                              
                              if (error) throw error;
                              
                              // Remove from local state
                              setSavedVenues(prev => prev.filter(v => v.id !== saved.id));
                            } catch (error) {
                              console.error('Error removing saved venue:', error);
                            }
                          }}
                          variant="outline"
                          className="mt-2 text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Remove
                        </Button>
              </Card>
                    ))}
                  </div>
                ) : (
                  <p>No saved venues yet</p>
                )}
              </div>
              </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
                  {bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                            <h3 className="font-semibold">{booking.venues?.name || 'Venue not found'}</h3>
                            <p className="text-sm text-brand-burgundy/70">
                              {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Date not set'} at {booking.start_time || 'Time not set'}
                            </p>
                            <p className="text-sm text-brand-burgundy/70">
                              {booking.number_of_guests || booking.guest_count || 0} guests
                            </p>
                            {booking.venue_tables && (
                              <p className="text-sm text-brand-burgundy/70">
                                Table: {booking.venue_tables.table_number}
                              </p>
                            )}
                            <p className="text-sm text-brand-burgundy/70">
                              Total: ₦{(booking.total_amount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-brand-burgundy">
                              {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Unknown'}
                            </p>
                            {(booking.status === 'confirmed' || booking.status === 'pending') && (
                              <Button
                                onClick={async () => {
                                  // Check if eligible for refund
                                  const now = new Date();
                                  const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`);
                                  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                                  
                                  if (hoursUntilBooking < 24) {
                                    toast({
                                      title: "Cancellation Not Available",
                                      description: "Cancellations with refund are only available 24+ hours before your booking. Please contact support for assistance.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  try {
                                    // Call the refund edge function
                                    const { data, error } = await supabase.functions.invoke('process-booking-refund', {
                                      body: { 
                                        bookingId: booking.id,
                                        reason: 'customer_cancellation'
                                      }
                                    });
                                    
                                    if (error) throw error;
                                    
                                    if (data.refunded) {
                                      toast({
                                        title: "Booking Cancelled & Refunded",
                                        description: `Your booking has been cancelled and ₦${(data.amount_refunded / 100).toLocaleString()} will be refunded to your card within 5-10 business days.`,
                                        className: "bg-green-500 text-white"
                                      });
                                    } else {
                                      toast({
                                        title: "Booking Cancelled",
                                        description: "Your booking has been cancelled successfully.",
                                        className: "bg-green-500 text-white"
                                      });
                                    }
                                    
                                    // Update local state
                                    setBookings(prev => 
                                      prev.map(b => 
                                        b.id === booking.id 
                                          ? { ...b, status: 'cancelled', refund_status: data.refunded ? 'refunded' : 'no_payment' }
                                          : b
                                      )
                                    );
                                    
                                  } catch (error) {
                                    console.error('Error processing cancellation:', error);
                                    toast({
                                      title: "Cancellation Failed",
                                      description: error.message || "Failed to cancel booking. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                variant="outline"
                                className="mt-2 text-red-500 border-red-500 hover:bg-red-50"
                              >
                                Cancel & Refund
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                      ))}
                    </div>
                  ) : (
                  <p>No bookings yet</p>
                  )}
              </div>
              </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6 space-y-10">
                {/* Change Password Section */}
                <div className="space-y-2 pb-8 border-b border-brand-burgundy/10">
                  <h2 className="text-xl font-semibold mb-2">Change Password</h2>
                  <ChangePasswordForm user={user} />
                </div>
                
                {/* Payment Details Section */}
                <div className="space-y-2 pb-8 border-b border-brand-burgundy/10">
                  <h2 className="text-xl font-semibold mb-2">Payment Details</h2>
                  <p className="text-brand-burgundy/70">Payment management coming soon...</p>
                </div>
                
                {/* Referral Codes Section */}
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold mb-2">Referral Codes</h2>
                  <SimpleReferralSection user={user} />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="split-payments">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4">Split Payments</h2>
                
                {/* Received Requests Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-brand-burgundy mb-4">Received Payment Requests</h3>
                  {splitPaymentsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy mx-auto"></div>
                      <p className="mt-2 text-brand-burgundy/70">Loading requests...</p>
                    </div>
                  ) : splitPaymentsReceived.length === 0 ? (
                    <div className="text-center py-6 bg-brand-cream/30 rounded-lg">
                      <p className="text-brand-burgundy/70">No payment requests received</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {splitPaymentsReceived.map(request => (
                        <Card key={request.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-brand-burgundy">₦{request.amount?.toLocaleString()}</div>
                              <div className="text-sm text-brand-burgundy/70">
                                From: {request.requester_profile ? 
                                  `${request.requester_profile.first_name} ${request.requester_profile.last_name}`.trim() || 
                                  request.requester_profile.phone || 
                                  'Unknown User'
                                  : 'A friend'}
                              </div>
                              <div className="text-xs text-brand-burgundy/50">
                                {new Date(request.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              {request.status === 'pending' && (
                                <div className="space-y-2">
                                  <Button
                                    onClick={() => navigate(`/split-payment/${request.booking_id}/${request.id}`)}
                                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                                  >
                                    Pay Your Portion (₦{request.amount?.toLocaleString()})
                                  </Button>
                                  <div className="text-xs text-muted-foreground">
                                    Split payment request from {request.requester_profile ? 
                                      `${request.requester_profile.first_name} ${request.requester_profile.last_name}`.trim() || 
                                      request.requester_profile.phone || 
                                      'Unknown User'
                                      : 'A friend'}
                                  </div>
                                </div>
                              )}
                              {request.status === 'paid' && (
                                <Badge className="bg-green-100 text-green-800">Paid</Badge>
                              )}
                              {request.status === 'expired' && (
                                <Badge className="bg-gray-100 text-gray-800">Expired</Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent Requests Section */}
                <div>
                  <h3 className="text-lg font-semibold text-brand-burgundy mb-4">Sent Payment Requests</h3>
                  {splitPaymentsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy mx-auto"></div>
                      <p className="mt-2 text-brand-burgundy/70">Loading requests...</p>
                    </div>
                  ) : splitPaymentsSent.length === 0 ? (
                    <div className="text-center py-6 bg-brand-cream/30 rounded-lg">
                      <p className="text-brand-burgundy/70">No payment requests sent</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {splitPaymentsSent.map(request => (
                        <Card key={request.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-brand-burgundy">₦{request.amount?.toLocaleString()}</div>
                              <div className="text-sm text-brand-burgundy/70">
                                To: {request.recipient_profile ? 
                                  `${request.recipient_profile.first_name} ${request.recipient_profile.last_name}`.trim() || 
                                  request.recipient_profile.phone || 
                                  request.recipient_phone || 
                                  'Unknown User'
                                : 'A friend'}
                              </div>
                              <div className="text-xs text-brand-burgundy/50">
                                {new Date(request.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-brand-burgundy border-brand-burgundy hover:bg-brand-burgundy/10"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/split-payment/${request.booking_id}/${request.id}`);
                                  toast({
                                    title: "Success",
                                    description: "Payment link copied to clipboard"
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </Button>
                              {request.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      await supabase
                                        .from('split_payment_requests')
                                        .update({ status: 'cancelled' })
                                        .eq('id', request.id);
                                      
                                      setSplitPaymentsSent(prev => 
                                        prev.map(r => r.id === request.id ? { ...r, status: 'cancelled' } : r)
                                      );
                                      
                                      toast({
                                        title: "Success",
                                        description: "Payment request cancelled"
                                      });
                                    } catch (error) {
                                      console.error('Error cancelling request:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to cancel the request",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className={
                              request.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' :
                              request.status === 'paid' ? 'bg-green-50 text-green-800 border-green-300' :
                              'bg-red-50 text-red-800 border-red-300'
                            }>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading text-brand-burgundy mb-2">Venue Credits</h2>
                    <p className="text-brand-burgundy/70">
                      Manage your credits for faster bookings at your favorite venues
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/venue-credit-purchase')}
                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90 mt-4 sm:mt-0"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Purchase Credits
                  </Button>
                </div>

                {creditsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                  </div>
                ) : venueCredits.length > 0 ? (
                  <div className="space-y-4">
                    {/* Credits Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10 text-center">
                        <div className="text-2xl font-bold text-brand-burgundy">
                          {venueCredits.length}
                        </div>
                        <div className="text-sm text-brand-burgundy/70">Active Venues</div>
                      </div>
                      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10 text-center">
                        <div className="text-2xl font-bold text-brand-gold">
                          ₦{venueCredits.reduce((sum, credit) => sum + credit.remaining_balance, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-brand-burgundy/70">Total Available</div>
                      </div>
                      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10 text-center">
                        <div className="text-2xl font-bold text-brand-burgundy">
                          ₦{venueCredits.reduce((sum, credit) => sum + credit.amount, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-brand-burgundy/70">Total Purchased</div>
                      </div>
                    </div>

                    {/* Credits List */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-brand-burgundy">Your Venue Credits</h3>
                      {venueCredits.map((credit) => (
                        <div key={credit.id} className="border border-brand-burgundy/10 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="mb-3 sm:mb-0">
                              <h4 className="font-semibold text-brand-burgundy">{credit.venues.name}</h4>
                              <p className="text-sm text-brand-burgundy/70">
                                {credit.venues.type} • {credit.venues.city}
                              </p>
                              <p className="text-xs text-brand-burgundy/60 mt-1">
                                Purchased: {new Date(credit.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex flex-col sm:items-end">
                              <div className="text-lg font-bold text-brand-gold mb-1">
                                ₦{credit.remaining_balance.toLocaleString()}
                              </div>
                              <div className="text-sm text-brand-burgundy/70">
                                of ₦{credit.amount.toLocaleString()} credits
                              </div>
                              {credit.used_amount > 0 && (
                                <div className="text-xs text-brand-burgundy/60">
                                  Used: ₦{credit.used_amount.toLocaleString()}
                                </div>
                              )}
                              <div className="text-xs text-brand-burgundy/50 mt-1">
                                Purchased: {new Date(credit.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-3">
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
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-brand-burgundy/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-brand-burgundy mb-2">No Venue Credits</h3>
                    <p className="text-brand-burgundy/60 mb-6">
                      Purchase credits at your favorite venues for faster bookings and exclusive benefits.
                    </p>
                    <Button 
                      onClick={() => navigate('/venue-credit-purchase')}
                      className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Purchase Your First Credits
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function ChangePasswordForm({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // Re-authenticate user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw signInError;
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-brand-burgundy/70">Current Password</label>
        <input
          type="password"
          className="w-full border p-2 rounded bg-white"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-burgundy/70">New Password</label>
        <input
          type="password"
          className="w-full border p-2 rounded bg-white"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-burgundy/70">Confirm New Password</label>
        <input
          type="password"
          className="w-full border p-2 rounded bg-white"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
      <button
        type="submit"
        className="bg-brand-gold text-brand-burgundy px-4 py-2 rounded hover:bg-brand-gold/90"
        disabled={loading}
      >
        {loading ? 'Updating...' : 'Change Password'}
      </button>
    </form>
  );
}

function PaymentDetailsSection({ user }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // You will need to create a SetupIntent on your backend and fetch the clientSecret here
  // For now, this is a placeholder
  const clientSecret = null; // TODO: Fetch from your backend

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!stripe || !elements) {
      setMessage('Stripe is not loaded');
      setLoading(false);
      return;
    }

    // Confirm card setup (save card for future use)
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          email: user.email,
        },
      },
    });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage('Payment method saved!');
      // Optionally, refresh the list of saved payment methods here
    }

    if (depositAmount && user) {
      // Update the user's credit_balance in Supabase
      await supabase
        .from('profiles')
        .update({ credit_balance: supabase.raw('credit_balance + ?', [depositAmount]) })
        .eq('id', user.id);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Payment Details</h2>
      <p className="text-brand-burgundy/70 mb-2">
        Your card details are processed securely by Stripe and never touch our servers. You can remove your payment method at any time.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <CardElement options={{ hidePostalCode: true }} />
        <button
          type="submit"
          className="bg-brand-gold text-brand-burgundy px-4 py-2 rounded hover:bg-brand-gold/90"
          disabled={!stripe || loading}
        >
          {loading ? 'Saving...' : 'Save Payment Method'}
        </button>
        {message && <div className="mt-2 text-brand-burgundy">{message}</div>}
      </form>
      {/* TODO: List and allow removal of saved payment methods */}
      <div className="mt-4 text-xs text-brand-burgundy/60">
        We comply with GDPR. Your payment data is handled by Stripe and you may request deletion at any time.
      </div>
    </div>
  );
}

function SimpleReferralSection({ user }) {
  const [friendEmail, setFriendEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const sendReferralInvitation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!friendEmail || !friendEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Generate a unique referral code
      const referralCode = `${user.email.split('@')[0].toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Send invitation using Edge Function
      console.log('📧 Sending referral invitation:', {
        email: friendEmail,
        data: {
          referralCode,
          senderName: user.user_metadata?.full_name || 'Your friend',
          personalMessage
        }
      });

      // First, store the referral in the database
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: user.id,
          referral_code: referralCode,
          recipient_email: friendEmail,
          status: 'pending'
        }])
        .select()
        .single();

      if (referralError) {
        console.error('❌ Error storing referral:', referralError);
        throw new Error('Failed to create referral record');
      }

      // Send invitation using our custom Edge Function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: friendEmail,
            subject: `${user.user_metadata?.full_name || 'Someone'} invited you to join VIPClub!`,
            template: 'referral-invitation',
            data: {
              senderName: user.user_metadata?.full_name || 'Your friend',
              personalMessage,
              referralCode,
              signupUrl: `${window.location.origin}/signup?ref=${referralCode}`
            }
          }
        });

        if (emailError) {
          console.error('❌ Email function error:', emailError);
          await supabase
            .from('referrals')
            .update({ status: 'failed', error_message: emailError.message })
            .eq('id', referralData.id);
        } else {
          console.log('✅ Email sent successfully:', emailData);
          await supabase
            .from('referrals')
            .update({ status: 'sent' })
            .eq('id', referralData.id);
        }
      } catch (error) {
        console.error('❌ Error sending email:', error);
        await supabase
          .from('referrals')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', referralData.id);
      }

      console.log('✅ Referral process completed');

      setSuccess('Referral invitation sent successfully!');
      setFriendEmail('');
      setPersonalMessage('');
    } catch (error) {
      console.error('Error sending referral:', error);
      setError('Failed to send referral invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Invitation Form */}
      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10">
        <h3 className="text-lg font-semibold text-brand-burgundy mb-3">Invite a Friend</h3>
        <form onSubmit={sendReferralInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-burgundy/70">Friend's Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded bg-white border-brand-burgundy/30 focus:border-brand-gold"
              value={friendEmail}
              onChange={e => setFriendEmail(e.target.value)}
              placeholder="friend@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-burgundy/70">Personal Message (Optional)</label>
            <textarea
              className="w-full border p-2 rounded bg-white border-brand-burgundy/30 focus:border-brand-gold"
              value={personalMessage}
              onChange={e => setPersonalMessage(e.target.value)}
              placeholder="Hey! I think you'd love Eddys Members..."
              rows={3}
            />
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-gold text-brand-burgundy px-4 py-2 rounded hover:bg-brand-gold/90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Referral Code Display */}
      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10">
        <h3 className="text-lg font-semibold text-brand-burgundy mb-3">Your Referral Code</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={user?.id ? `EDDY${user.id.slice(0, 8).toUpperCase()}` : 'Loading...'}
            readOnly
            className="flex-1 border p-2 rounded bg-white border-brand-burgundy/30 font-mono text-sm"
          />
          <button
            onClick={() => {
              const code = user?.id ? `EDDY${user.id.slice(0, 8).toUpperCase()}` : '';
              navigator.clipboard.writeText(code);
              toast({
                title: "Success",
                description: "Referral code copied to clipboard"
              });
            }}
            className="bg-brand-burgundy text-white px-3 py-2 rounded hover:bg-brand-burgundy/90"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-brand-burgundy/70 mt-2">
          Share this code with friends to earn rewards when they join!
        </p>
      </div>

      {/* Referral Benefits */}
      <div className="bg-brand-cream/30 p-4 rounded-lg border border-brand-burgundy/10">
        <h3 className="text-lg font-semibold text-brand-burgundy mb-3">Referral Benefits</h3>
        <ul className="space-y-2 text-sm text-brand-burgundy/70">
          <li>• Earn credits when your friends join</li>
          <li>• Get exclusive member benefits</li>
          <li>• Unlock special venue access</li>
          <li>• Receive priority booking status</li>
        </ul>
      </div>
    </div>
  );
}

// Stripe payment handler for split payments
function SplitPaymentStripeModal({ request, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Call your backend to create a PaymentIntent
      const res = await fetch('/api/create-split-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: request.amount, requestId: request.id })
      });
      const { clientSecret } = await res.json();
      if (!clientSecret) throw new Error('Failed to get payment secret');
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });
      if (result.error) {
        setError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
        <button className="absolute top-2 right-2" onClick={onClose}><XCircle className="h-5 w-5 text-red-500" /></button>
        <h2 className="text-lg font-bold mb-4">Pay Split Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>Amount: <span className="font-semibold">₦{request.amount?.toLocaleString()}</span></div>
          <CardElement className="p-2 border rounded" />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-brand-burgundy text-white" disabled={loading}>{loading ? 'Processing...' : 'Pay Now'}</Button>
        </form>
      </div>
    </div>
  );
}

export default UserProfilePage;