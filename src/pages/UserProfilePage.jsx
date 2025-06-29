import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Removed API imports - using direct Supabase queries for better error handling
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Heart, Calendar, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Input } from "../components/ui/input";
import { useNavigate, useLocation } from 'react-router-dom';

const stripePromise = loadStripe('pk_test_...'); // Replace with your real publishable key

const UserProfilePage = () => {
  const { user, signIn, signUp, signOut } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [signupError, setSignupError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savedVenues, setSavedVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();
  const [depositAmount, setDepositAmount] = useState("");

  // Load user data when logged in
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
      } else {
        setProfile(profileData);
      }

      // Load saved venues (check if table exists first)
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
      
      if (savedVenuesError) {
        console.error('Saved venues error:', savedVenuesError);
        // If table doesn't exist, set empty array
        setSavedVenues([]);
      } else {
        setSavedVenues(savedVenuesData || []);
      }

      // Load bookings with proper relationships
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
      
      if (bookingsError) {
        console.error('Bookings error:', bookingsError);
        setBookings([]);
      } else {
        setBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
      });
      if (signUpError) {
        console.error('Sign up error:', signUpError);
        setSignupError(signUpError.message);
        return;
      }

      const userId = signUpData.user.id;
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{ id: userId, first_name: '', last_name: '', phone_number: '' }]);
      if (profileError) {
        console.error('Insert error:', profileError);
        setSignupError(profileError.message);
        return;
      }
    } catch (error) {
      setSignupError(error.message);
    }
  };

  if (!user) {
    return (
      <div className="bg-brand-cream/50 min-h-screen">
        <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded shadow mb-20">
          <h2 className="text-2xl font-bold mb-4 text-brand-burgundy">{isSignup ? 'Sign Up' : 'Login to your profile'}</h2>
          {isSignup ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signupForm.email}
                onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={signupForm.password}
                onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              <input
                type="password"
                name="confirm"
                placeholder="Confirm Password"
                value={signupForm.confirm}
                onChange={e => setSignupForm({ ...signupForm, confirm: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              {signupError && <div className="text-red-500">{signupError}</div>}
              <Button type="submit" className="w-full bg-brand-burgundy text-white">Sign Up</Button>
              <div className="text-center mt-4">
                <span className="text-brand-burgundy/70">Already have an account? </span>
                <button 
                  type="button" 
                  onClick={() => setIsSignup(false)}
                  className="font-bold text-brand-burgundy hover:text-brand-burgundy/80 transition-colors"
                >
                  Log In
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
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                className="w-full border p-2 rounded bg-white"
                required
              />
              {error && <div className="text-red-500">{error}</div>}
              <Button type="submit" className="w-full bg-brand-burgundy text-white">Login</Button>
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
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">My Profile</h1>
            <p className="text-brand-burgundy/70">Manage your account and preferences</p>
          </div>
          <Button 
            onClick={signOut}
            variant="outline" 
            className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
          >
            Sign Out
                </Button>
              </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 grid grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="profile" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
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
            <TabsTrigger value="member" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm col-span-2 md:col-span-1">
              <span role="img" aria-label="VIP" className="h-3 w-3 md:h-4 md:w-4 text-xs md:text-sm">👑</span>
              <span className="hidden sm:inline">Member</span>
              <span className="sm:hidden">VIP</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
                {profile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-burgundy/70">Email</label>
                      <p className="mt-1">{user.email}</p>
            </div>
                  <div>
                      <label className="block text-sm font-medium text-brand-burgundy/70">Name</label>
                      <p className="mt-1">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-brand-burgundy/70">Phone</label>
                      <p className="mt-1">{profile.phone_number || 'Not set'}</p>
                  </div>
                  </div>
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
                            <h3 className="font-semibold">{booking.venues.name}</h3>
                            <p className="text-sm text-brand-burgundy/70">
                              {new Date(booking.booking_date).toLocaleDateString()} at {booking.start_time}
                            </p>
                            <p className="text-sm text-brand-burgundy/70">
                              {booking.number_of_guests} guests
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
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </p>
                            {(booking.status === 'confirmed' || booking.status === 'pending') && (
                              <Button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('bookings')
                                      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                                      .eq('id', booking.id);
                                    
                                    if (error) throw error;
                                    
                                    // Update local state
                                    setBookings(prev => 
                                      prev.map(b => 
                                        b.id === booking.id 
                                          ? { ...b, status: 'cancelled' }
                                          : b
                                      )
                                    );
                                  } catch (error) {
                                    console.error('Error cancelling booking:', error);
                                  }
                                }}
                                variant="outline"
                                className="mt-2 text-red-500 border-red-500 hover:bg-red-50"
                              >
                                Cancel
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
                <Elements stripe={stripePromise}>
                  <div className="space-y-2 pb-8 border-b border-brand-burgundy/10">
                    <PaymentDetailsSection user={user} />
                  </div>
                </Elements>
                {/* Referral Codes Section */}
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold mb-2">Referral Codes</h2>
                  <ReferralCodesSection user={user} />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="member">
            <Card className="bg-white border-brand-burgundy/10">
              <div className="p-2 sm:p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4">VIP Member Credit</h2>
                <p className="mb-4 text-brand-burgundy/70">
                  Deposit funds to your Eddy account and unlock exclusive VIP perks. 
                  The more you deposit, the more power and privileges you get!
                </p>
                {/* Example: Show current credit and butler status */}
                <div className="mb-6">
                  <div className="text-lg font-bold">
                    Credit Balance: <span className="text-brand-gold">${profile?.credit_balance?.toLocaleString() ?? 0}</span>
                  </div>
                  <div className="mt-2">
                    {profile?.credit_balance >= 10000 ? (
                      <div className="text-green-700 font-semibold flex items-center">
                        <span role="img" aria-label="butler" className="mr-2">🕴️</span>
                        You have a personal butler! Contact us for your VIP concierge service.
                      </div>
                    ) : (
                      <div className="text-brand-burgundy/70">
                        Deposit <span className="font-bold">${(10000 - (profile?.credit_balance ?? 0)).toLocaleString()}</span> more to unlock your personal butler!
                      </div>
                    )}
                  </div>
                </div>
                {/* Deposit Form (navigate to checkout) */}
                <form className="space-y-4 max-w-xs" onSubmit={e => {
                  e.preventDefault();
                  if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) < 100) return;
                  navigate('/checkout/deposit', { state: { depositAmount: Number(depositAmount) } });
                }}>
                  <label className="block text-sm font-medium text-brand-burgundy/70">Deposit Amount</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    className="w-full border p-2 rounded bg-white"
                    placeholder="Enter amount (USD)"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                  />
                  <Button type="submit" className="w-full bg-brand-burgundy text-white">Deposit</Button>
                </form>
                {/* Optionally: Transaction history, perks list, etc. */}
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
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email);
      if (resetError) throw resetError;
      setSuccess('Password updated and reset email sent!');
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
        .from('user_profiles')
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

function ReferralCodesSection({ user }) {
  // Implementation of ReferralCodesSection component
  return (
    <p>Referral Codes Section</p>
  );
}

export default UserProfilePage;