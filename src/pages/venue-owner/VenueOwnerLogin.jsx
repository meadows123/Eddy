import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';

const VenueOwnerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Starting login process for:', formData.email);
      
      // Log the form data (without password)
      console.log('📝 Login attempt:', {
        email: formData.email,
        passwordLength: formData.password.length,
        hasPassword: !!formData.password
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      console.log('🔐 Auth result:', { data, error });

      if (error) {
        console.error('❌ Authentication failed:', error);
        throw error;
      }

      if (!data.user) {
        console.error('❌ No user data returned');
        throw new Error('No user data returned from authentication');
      }

      console.log('✅ Authentication successful for user:', data.user.id);
      console.log('👤 User details:', {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        lastSignIn: data.user.last_sign_in_at
      });

      // Check if user is a venue owner
      console.log('🔍 Checking venue owner status...');
      const { data: venueOwner, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      console.log('🏢 Venue owner check result:', { venueOwner, venueOwnerError });

      if (venueOwnerError) {
        console.error('❌ Venue owner lookup failed:', venueOwnerError);
        throw new Error('Venue owner profile not found');
      }

      if (!venueOwner) {
        console.error('❌ No venue owner record found');
        throw new Error('No venue owner profile found for this user');
      }

      console.log('✅ Venue owner found:', {
        id: venueOwner.id,
        email: venueOwner.owner_email,
        status: venueOwner.status,
        name: venueOwner.owner_name
      });

      // Check if venue owner is active
      if (venueOwner.status !== 'active') {
        console.error('❌ Venue owner not active:', venueOwner.status);
        throw new Error(`Venue owner account is ${venueOwner.status}. Please contact support.`);
      }

      console.log('🎉 Login successful! Redirecting to dashboard...');
      
      // Navigate to dashboard
      navigate('/venue-owner/dashboard');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Provide more specific error messages
      if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password. If you recently registered, please check your email for a confirmation link and click it before logging in. You can also use the "Resend confirmation email" button below.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before logging in. If you didn\'t receive the email, use the "Resend confirmation email" button below.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. If you recently registered, please check your email for a confirmation link and click it before logging in.');
      } else {
        setError(error.message || 'Login failed');
      }
      
      // Show toast with additional guidance
      toast({
        title: 'Login Failed',
        description: 'If you recently registered, please check your email for a confirmation link. Use the "Debug Account Status" button to check your account status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to reset your password.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Sending password reset email to:', formData.email);
      console.log('📍 Redirect URL:', `${window.location.origin}/venue-owner/reset-password`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/venue-owner/reset-password`
      });
      
      if (error) throw error;
      
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for password reset instructions. Click the link in the email to reset your password. If you don\'t see it, check your spam folder.',
        variant: 'default',
      });
      
      setError(null);
      console.log('✅ Password reset email sent successfully');
      
      // Show additional instructions
      toast({
        title: 'Important',
        description: 'After clicking the reset link, you will be taken to a password reset page. If you are redirected to the home page, please check the URL for any error messages.',
        variant: 'default',
      });
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError(error.message || 'Failed to send password reset email');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Resending confirmation email to:', formData.email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/venue-owner/login`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Confirmation Email Sent',
        description: 'Check your email for the confirmation link. If you don\'t see it, check your spam folder.',
        variant: 'default',
      });
      
      setError(null);
      console.log('✅ Confirmation email resent successfully');
      
    } catch (error) {
      console.error('❌ Resend confirmation error:', error);
      setError(error.message || 'Failed to resend confirmation email');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend confirmation email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const debugVenueOwnerStatus = async () => {
    try {
      console.log('🔍 Debugging venue owner status...');
      
      // Check if user exists
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Current user:', user, 'User Error:', userError);
      
      if (user) {
        // Check venue owner records
        const { data: venueOwners, error: venueOwnerError } = await supabase
          .from('venue_owners')
          .select('*')
          .eq('user_id', user.id);
        console.log('🏢 Venue owners for user:', venueOwners, 'Error:', venueOwnerError);
        
        // Check by email
        const { data: venueOwnersByEmail, error: emailError } = await supabase
          .from('venue_owners')
          .select('*')
          .eq('owner_email', formData.email);
        console.log('📧 Venue owners by email:', venueOwnersByEmail, 'Error:', emailError);
      }
      
      // Check auth users by email (without authentication)
      console.log('🔍 Checking auth users by email:', formData.email);
      // Note: Cannot directly query auth.users from client-side
      // This information is available through the auth API after login
      console.log('👤 Auth users check: Use Supabase Auth API instead of direct query');
      
      // Check venue_owners table by email
      const { data: venueOwnersByEmail, error: venueOwnerEmailError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', formData.email);
      console.log('🏢 Venue owners by email:', venueOwnersByEmail, 'Error:', venueOwnerEmailError);
      
      // Check if there are any pending venue owner requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('pending_venue_owner_requests')
        .select('*')
        .eq('email', formData.email);
      console.log('⏳ Pending requests:', pendingRequests, 'Error:', pendingError);
      
      // Check venues by email
      const { data: venues, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('contact_email', formData.email);
      console.log('🏢 Venues by email:', venues, 'Error:', venueError);
      
      // Summary of findings
      console.log('📊 DEBUG SUMMARY:');
      console.log('   - Auth users check: Use Supabase Auth API instead of direct query');
      console.log('   - Venue owners found:', venueOwnersByEmail?.length || 0);
      console.log('   - Venues found:', venues?.length || 0);
      console.log('   - Pending requests:', pendingRequests?.length || 0);
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session, 'Session Error:', sessionError);

      if (sessionError) throw new Error('Session error: ' + sessionError.message);

      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'No session found. Please log in to access the dashboard.',
          variant: 'destructive',
        });
        setError('No session found. Please log in.');
        navigate('/venue-owner/login');
        return;
      }

      // Check if user is a venue owner
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User:', user, 'User Error:', userError);
      if (userError) throw new Error('User error: ' + userError.message);

      const { data: venueOwner, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Venue Owner:', venueOwner, 'Venue Owner Error:', venueOwnerError);

      if (venueOwnerError) throw new Error('Venue owner error: ' + venueOwnerError.message);
      if (!venueOwner) {
        toast({
          title: 'Venue Owner Account Required',
          description: 'No venue owner profile found. Please register as a venue owner.',
          variant: 'destructive',
        });
        setError('No venue owner profile found. Please register.');
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
        description: 'Failed to verify authentication: ' + error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const fetchVenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user, 'User Error:', userError);
      if (userError) throw new Error('User error: ' + userError.message);

      // Get venue details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      console.log('Venue data:', venueData, 'Venue Error:', venueError);

      if (venueError) throw new Error('Venue error: ' + venueError.message);
      if (!venueData) throw new Error('No venue found for this user.');

      // ...rest of your code...
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-12 w-12 bg-brand-burgundy/10 rounded-full flex items-center justify-center"
          >
            <Store className="h-6 w-6 text-brand-burgundy" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-heading text-brand-burgundy">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-brand-burgundy/70">
            Sign in to manage your venue
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-brand-burgundy">
                Email Address
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-brand-burgundy/50" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-brand-burgundy">
                Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-brand-burgundy/50" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-brand-burgundy border-brand-burgundy/20 rounded focus:ring-brand-burgundy"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-burgundy/70">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-brand-burgundy hover:text-brand-gold"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-brand-burgundy/70">
            Don't have a venue account?{' '}
            <Link to="/venue-owner/register" className="text-brand-burgundy hover:text-brand-gold font-medium">
              Register your venue
            </Link>
          </p>
          
          <div className="mt-4 pt-4 border-t border-brand-burgundy/10">
            <p className="text-xs text-brand-burgundy/60 mb-2">
              Having trouble logging in?
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="text-xs text-brand-burgundy/70 hover:text-brand-gold underline block"
                disabled={loading}
              >
                Resend confirmation email
              </button>
              
              <button
                type="button"
                onClick={debugVenueOwnerStatus}
                className="text-xs text-brand-burgundy/70 hover:text-brand-gold underline block"
                disabled={loading}
              >
                Debug Account Status
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VenueOwnerLogin; 