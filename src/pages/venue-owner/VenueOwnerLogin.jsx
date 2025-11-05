// VenueOwnerLogin.jsx - Updated to fix auth.users query issue
// Cache bust: 2024-01-15 - Removed direct auth.users queries
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';
import { sendVenueOwnerPasswordReset } from '../../lib/venueOwnerEmailService.js';

const VenueOwnerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned from authentication');
      }

      // Check if user is a venue owner (without .single() to avoid 406 errors)
      const { data: venueOwners, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      let venueOwner = null;
      
      if (venueOwnerError) {
        // If error, try email fallback
        const { data: venueOwnersByEmail, error: emailError } = await supabase
          .from('venue_owners')
          .select('*')
          .eq('owner_email', data.user.email)
          .order('created_at', { ascending: false });
        
        if (!emailError && venueOwnersByEmail && venueOwnersByEmail.length > 0) {
          venueOwner = venueOwnersByEmail[0];
        } else {
          throw new Error(`Venue owner profile not found. Please ensure your account has been approved. Error: ${venueOwnerError.message}`);
        }
      } else {
        venueOwner = venueOwners && venueOwners.length > 0 ? venueOwners[0] : null;
        if (!venueOwner) {
          throw new Error(`No venue owner profile found for this user. Please contact support or ensure you have completed registration.`);
        }
      }

      // Check if venue owner is active (allow both 'active' and 'approved' status)
      const validStatuses = ['active', 'approved'];
      if (!validStatuses.includes(venueOwner.status)) {
        throw new Error(`Venue owner account status is "${venueOwner.status}". Your account must be approved by an admin before you can log in. Please contact support if you believe this is an error.`);
      }

      // If status is 'approved', update it to 'active' for consistency
      if (venueOwner.status === 'approved') {
        const { error: statusUpdateError } = await supabase
          .from('venue_owners')
          .update({ status: 'active' })
          .eq('id', venueOwner.id);
        
        if (!statusUpdateError) {
          venueOwner.status = 'active'; // Update local reference
        }
      }
      
      // Navigate to dashboard
      navigate('/venue-owner/dashboard');
      
    } catch (error) {
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
        description: 'If you recently registered, please check your email for a confirmation link.',
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
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `https://oneeddy.com/venue-owner/reset-password`
      });
      
      if (error) throw error;
      
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for password reset instructions. Click the link in the email to reset your password. If you don\'t see it, check your spam folder.',
        variant: 'default',
      });
      
      setError(null);
      
      // Show additional instructions
      toast({
        title: 'Important',
        description: 'After clicking the reset link, you will be taken to a password reset page. If you are redirected to the home page, please check the URL for any error messages.',
        variant: 'default',
      });
      
    } catch (error) {
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
          emailRedirectTo: `https://oneeddy.com/venue-owner/login`
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

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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
      if (userError) throw new Error('User error: ' + userError.message);

      // Try querying without .single() first to avoid 406 errors with RLS
      // If we get one result, we'll use it; if multiple, we'll pick the first
      const { data: venueOwners, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Get the first result if multiple found, or null if none
      const venueOwner = venueOwners && venueOwners.length > 0 ? venueOwners[0] : null;

      // Handle 406/403 errors (Not Acceptable/Forbidden) - usually RLS policy issues
      let finalVenueOwner = venueOwner;
      if (venueOwnerError) {
        // Check if it's a 406 or 403 error
        const isPolicyError = venueOwnerError.message?.includes('406') || 
                              venueOwnerError.message?.includes('403') ||
                              venueOwnerError.status === 406 || 
                              venueOwnerError.status === 403 ||
                              venueOwnerError.code === 'PGRST116' ||
                              venueOwnerError.code === '42501'; // Permission denied
        
        if (isPolicyError) {
          console.warn('⚠️ RLS policy error when querying venue_owners (status:', venueOwnerError.status, ')');
          console.warn('⚠️ User ID:', user.id);
          console.warn('⚠️ Error:', venueOwnerError);
          
          // Try querying by email as fallback (if user_id doesn't match or RLS blocks by user_id)
          const { data: venueOwnersByEmail, error: emailError } = await supabase
            .from('venue_owners')
            .select('*')
            .eq('owner_email', user.email)
            .order('created_at', { ascending: false });
          
          if (!emailError && venueOwnersByEmail && venueOwnersByEmail.length > 0) {
            // Use the first result if multiple found
            finalVenueOwner = venueOwnersByEmail[0];
            console.log('✅ Found venue owner by email fallback');
            
            // If found by email but user_id doesn't match, update it
            if (finalVenueOwner.user_id !== user.id) {
              console.warn('⚠️ user_id mismatch detected. Venue owner user_id:', finalVenueOwner.user_id, 'Auth user_id:', user.id);
              // Update the user_id if it's NULL or different
              if (finalVenueOwner.user_id === null || finalVenueOwner.user_id !== user.id) {
                const { error: updateError } = await supabase
                  .from('venue_owners')
                  .update({ user_id: user.id })
                  .eq('id', finalVenueOwner.id);
                
                if (updateError) {
                  console.error('❌ Failed to update user_id:', updateError);
                } else {
                  console.log('✅ Updated user_id to match auth user');
                  finalVenueOwner.user_id = user.id;
                }
              }
            }
          } else {
            throw new Error('Venue owner not found. RLS policy may be blocking access. Error: ' + venueOwnerError.message);
          }
        } else {
          throw new Error('Venue owner error: ' + venueOwnerError.message);
        }
      }
      if (!finalVenueOwner) {
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
      // Use finalVenueOwner instead of venueOwner
      fetchVenueData();
    } catch (error) {
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
      if (userError) throw new Error('User error: ' + userError.message);

      // Get venue details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (venueError) throw new Error('Venue error: ' + venueError.message);
      if (!venueData) throw new Error('No venue found for this user.');

      // ...rest of your code...
    } catch (error) {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-10 w-10 sm:h-12 sm:w-12 bg-brand-burgundy/10 rounded-full flex items-center justify-center"
          >
            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-brand-burgundy" />
          </motion.div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-heading text-brand-burgundy">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-brand-burgundy/70">
            Sign in to manage your venue
          </p>
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  ) : (
                    <Eye className="h-5 w-5 text-brand-burgundy/50 hover:text-brand-burgundy" />
                  )}
                </button>
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

        <div className="text-center mt-4 sm:mt-6">
          <p className="text-sm text-brand-burgundy/70">
            Don't have a venue account?{' '}
            <Link to="/venue-owner/register" className="text-brand-burgundy hover:text-brand-gold font-medium">
              Register your venue
            </Link>
          </p>
          
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-brand-burgundy/10">
            <p className="text-xs text-brand-burgundy/60 mb-2">
              Having trouble logging in?
            </p>
            <div className="space-y-1 sm:space-y-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="text-xs text-brand-burgundy/70 hover:text-brand-gold underline block"
                disabled={loading}
              >
                Resend confirmation email
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VenueOwnerLogin; 