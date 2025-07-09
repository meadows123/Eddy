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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      // Check if user is a venue owner
      const { data: owner, error: ownerError } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', data.user.id)
        .single();
      if (ownerError || !owner) {
        // Not a venue owner yet, redirect to registration
        navigate('/venue-owner/register');
      } else {
        // Already a venue owner, redirect to dashboard
        navigate('/venue-owner/dashboard');
      }
    } catch (error) {
      setError(error.message || 'Login failed');
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
              <Link to="/venue-owner/forgot-password" className="text-brand-burgundy hover:text-brand-gold">
                Forgot your password?
              </Link>
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
        </div>
      </motion.div>
    </div>
  );
};

export default VenueOwnerLogin; 