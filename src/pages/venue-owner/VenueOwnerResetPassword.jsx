import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/ui/use-toast';
import { supabase } from '../../lib/supabase';

const VenueOwnerResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isStandardReset, setIsStandardReset] = useState(false);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check if we have the necessary tokens from the URL
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const standardToken = searchParams.get('token');
    const type = searchParams.get('type');
    
    console.log('🔍 Reset password page loaded with params:', {
      accessToken: accessToken ? 'Present' : 'Missing',
      refreshToken: refreshToken ? 'Present' : 'Missing',
      standardToken: standardToken ? 'Present' : 'Missing',
      type: type,
      allParams: Object.fromEntries(searchParams.entries())
    });

    setDebugInfo({
      accessToken: accessToken ? 'Present' : 'Missing',
      refreshToken: refreshToken ? 'Present' : 'Missing',
      standardToken: standardToken ? 'Present' : 'Missing',
      type: type,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Handle standard Supabase password reset (token parameter)
    if (standardToken) {
      console.log('🔄 Standard password reset detected');
      setIsStandardReset(true);
      return;
    }

    // Handle venue owner specific reset (access_token/refresh_token)
    if (!accessToken || !refreshToken) {
      console.error('❌ Missing tokens for password reset');
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    // Set the session with the tokens from the URL
    const setSession = async () => {
      try {
        console.log('🔄 Setting session with tokens...');
        
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('❌ Session error:', error);
          setError('Invalid reset link. Please request a new password reset.');
          return;
        }

        console.log('✅ Session set successfully');
        
        // Verify we have a user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ User verification failed:', userError);
          setError('Unable to verify user. Please request a new password reset.');
          return;
        }

        console.log('✅ User verified:', user.email);
        
      } catch (error) {
        console.error('❌ Error setting session:', error);
        setError('Failed to validate reset link. Please try again.');
      }
    };

    setSession();
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`At least ${minLength} characters`);
    if (!hasUpperCase) errors.push('One uppercase letter');
    if (!hasLowerCase) errors.push('One lowercase letter');
    if (!hasNumbers) errors.push('One number');
    if (!hasSpecialChar) errors.push('One special character');

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setError(`Password must contain: ${passwordErrors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Updating password...');
      
      let result;
      
      if (isStandardReset) {
        // For standard password reset with token
        const token = searchParams.get('token');
        if (!token) {
          throw new Error('Missing reset token');
        }
        
        console.log('🔄 Using token-based password reset...');
        
        // For Supabase password reset tokens, we need to use the correct approach
        // The token from the email is a recovery token that needs to be handled differently
        
        // First, let's check if we have an active session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.log('🔄 No active session, need to handle token-based reset...');
          
          // For token-based resets, we need to use the token to establish a session
          // Let's try to use the token as a recovery token
          const { data: recoveryData, error: recoveryError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (recoveryError) {
            console.error('❌ Token verification failed:', recoveryError);
            throw new Error('Invalid or expired reset token. Please request a new password reset.');
          }
          
          console.log('✅ Token verified successfully');
        }
        
        // Now try to update the password
        result = await supabase.auth.updateUser({
          password: formData.password
        });
        
        if (result.error && result.error.message.includes('Auth session missing')) {
          console.log('🔄 Session missing, trying alternative approach...');
          
          // If we still don't have a session, we need to use a different method
          // For Supabase password resets, sometimes we need to use the token directly
          // Let's try to use the token to set up a session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: token
          });
          
          if (sessionError) {
            console.error('❌ Session setting failed:', sessionError);
            throw new Error('Unable to validate reset token. Please request a new password reset.');
          }
          
          // Try updateUser again
          result = await supabase.auth.updateUser({
            password: formData.password
          });
        }
      } else {
        // For venue owner reset, we already have the session set
        result = await supabase.auth.updateUser({
          password: formData.password
        });
      }

      if (result.error) throw result.error;

      console.log('✅ Password updated successfully');
      setSuccess(true);
      
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
        variant: 'default',
      });

      // Redirect to appropriate login page after a short delay
      setTimeout(() => {
        if (isStandardReset) {
          navigate('/'); // Redirect to main site for regular users
        } else {
          navigate('/venue-owner/login'); // Redirect to venue owner login
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Password update error:', error);
      setError(error.message || 'Failed to update password');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewReset = () => {
    if (isStandardReset) {
      navigate('/'); // Redirect to main site for regular users
    } else {
      navigate('/venue-owner/login'); // Redirect to venue owner login
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="h-8 w-8 text-green-600" />
          </motion.div>
          
          <div>
            <h2 className="text-2xl font-heading text-gray-900">
              Password Updated Successfully!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been updated. You will be redirected to the login page shortly.
            </p>
          </div>

          <Button
            onClick={() => isStandardReset ? navigate('/') : navigate('/venue-owner/login')}
            className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
          >
            Go to Login
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

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
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-brand-burgundy/70">
            Enter your new password below
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-md p-4"
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={handleRequestNewReset}
                  className="text-sm text-red-500 hover:text-red-700 underline mt-1"
                >
                  Request new password reset
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {debugInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-md p-4"
          >
            <p className="text-xs text-blue-600 font-mono">
              Debug: {JSON.stringify(debugInfo, null, 2)}
            </p>
          </motion.div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-brand-burgundy">
                New Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-brand-burgundy/50" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-brand-burgundy/50" />
                  ) : (
                    <Eye className="h-5 w-5 text-brand-burgundy/50" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-brand-burgundy">
                Confirm New Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-brand-burgundy/50" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-brand-burgundy/50" />
                  ) : (
                    <Eye className="h-5 w-5 text-brand-burgundy/50" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
              disabled={loading || !!error}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-brand-burgundy/70">
            Remember your password?{' '}
            <button
              onClick={() => isStandardReset ? navigate('/') : navigate('/venue-owner/login')}
              className="text-brand-burgundy hover:text-brand-gold font-medium"
            >
              Back to login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VenueOwnerResetPassword; 