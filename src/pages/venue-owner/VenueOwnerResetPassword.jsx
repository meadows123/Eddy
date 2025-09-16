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
    
    // Handle standard Supabase password reset (token parameter)
    if (standardToken) {
      setIsStandardReset(true);
      return;
    }

    // Handle venue owner specific reset (access_token/refresh_token)
    if (!accessToken || !refreshToken) {
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    // Set the session with the tokens from the URL
    const setSession = async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          setError('Invalid reset link. Please request a new password reset.');
          return;
        }
        
        // Verify we have a user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Unable to verify user. Please request a new password reset.');
          return;
        }
        
      } catch (error) {
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setError(`Password must contain: ${passwordErrors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isStandardReset) {
        const token = searchParams.get('token');
        if (!token) throw new Error('Missing reset token');

        // Try to get the user/session
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // No session, verify the token
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          if (verifyError) {
            setError('Invalid or expired reset token. Please request a new password reset.');
            setLoading(false);
            return;
          }
        }

        // Now update the password
        result = await supabase.auth.updateUser({ password: formData.password });
      } else {
        // Venue owner flow (session already set)
        result = await supabase.auth.updateUser({ password: formData.password });
      }

      if (result.error) throw result.error;

      setSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
        variant: 'default',
      });

      setTimeout(() => {
        if (isStandardReset) {
          navigate('/');
        } else {
          navigate('/venue-owner/login');
        }
      }, 2000);

    } catch (error) {
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
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center p-4 fixed inset-0 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 bg-white p-4 rounded-xl shadow-lg text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="h-6 w-6 text-green-600" />
          </motion.div>
          
          <div>
            <h2 className="text-xl font-heading text-gray-900">
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
    <div className="h-screen w-screen bg-gray-50 flex items-center justify-center p-4 fixed inset-0 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 bg-white p-4 rounded-xl shadow-lg overflow-y-auto max-h-full"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-10 w-10 bg-brand-burgundy/10 rounded-full flex items-center justify-center"
          >
            <Store className="h-5 w-5 text-brand-burgundy" />
          </motion.div>
          <h2 className="mt-4 text-2xl font-heading text-brand-burgundy">
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

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

        <div className="text-center mt-4">
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