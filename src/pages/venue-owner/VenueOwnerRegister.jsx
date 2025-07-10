import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, Building2, Phone, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '/src/components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '/src/components/ui/use-toast';
import { supabase } from '/src/lib/supabase';
import { useToast } from '../../components/ui/use-toast';
import { notifyAdminOfVenueSubmission } from '../../lib/api'; // Adjust path if needed
import { sendBasicEmail } from '@/lib/emailService';
import emailjs from '@emailjs/browser';

const VenueOwnerRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState(() => {
    // Try to load saved form data from localStorage
    const savedData = localStorage.getItem('venueRegistrationData');
    return savedData ? JSON.parse(savedData) : {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      venue_name: '',
      venue_description: '',
      venue_address: '',
      venue_city: '',
      venue_country: '',
      venue_phone: '',
      venue_email: '',
      venue_type: 'restaurant',
      opening_hours: '',
      capacity: '',
      price_range: '$$',
    };
  });

  const ADMIN_EMAIL = "sales@oneeddy.com"; // Replace with your admin's email

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('venueRegistrationData', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, check if there's an existing approved venue owner record for this email
      const { data: existingVenues, error: venueCheckError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', formData.email)
        .eq('status', 'pending_owner_signup');

      if (venueCheckError) {
        throw venueCheckError;
      }

      if (existingVenues && existingVenues.length > 0) {
        // Venue owner has been approved, create user account and link it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) throw signUpError;

        // Update all pending venue owner records with the user ID and mark as active
        const { error: updateError } = await supabase
          .from('venue_owners')
          .update({ 
            user_id: signUpData.user.id,
            status: 'active',
            owner_name: formData.full_name,
            owner_phone: formData.phone
          })
          .eq('owner_email', formData.email)
          .eq('status', 'pending_owner_signup');

        if (updateError) throw updateError;

        // Also update the venues table to link the venue to the user
        const { error: venueUpdateError } = await supabase
          .from('venues')
          .update({ 
            owner_id: signUpData.user.id
          })
          .eq('contact_email', formData.email);

        if (venueUpdateError) {
          console.error('Error updating venue owner_id:', venueUpdateError);
          // Don't fail the registration if venue update fails
        }

        setSuccess('Account created successfully! You can now log in to manage your venue.');
        // Clear form data
        setFormData({
          full_name: '',
          email: '',
          phone: '',
          password: '',
          venue_name: '',
          venue_description: '',
          venue_address: '',
          venue_city: '',
          venue_country: '',
          venue_phone: '',
          venue_email: '',
          venue_type: 'restaurant',
          opening_hours: '',
          capacity: '',
          price_range: '$$',
        });
        localStorage.removeItem('venueRegistrationData');
        return;
      }

      // No existing approved record, create a new pending request
      const requestData = {
        email: formData.email,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        venue_city: formData.venue_city,
        venue_country: formData.venue_country,
        contact_name: formData.full_name,
        contact_phone: formData.phone,
        additional_info: formData.venue_description,
        venue_type: formData.venue_type,
        opening_hours: formData.opening_hours,
        capacity: formData.capacity,
        price_range: formData.price_range,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('pending_venue_owner_requests')
        .insert([requestData]);

      if (error) {
        setError(error.message);
        console.error('Supabase error:', error);
        return;
      }
      setSuccess('Your venue application has been submitted successfully! Our team will review it within 48 hours. You will receive an email notification once your application is approved.');

      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VENUE_OWNER_REQUEST_TEMPLATE;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      console.log('Debug - SERVICE_ID:', SERVICE_ID);
      console.log('Debug - TEMPLATE_ID:', TEMPLATE_ID);
      console.log('Debug - PUBLIC_KEY:', PUBLIC_KEY);
      
      emailjs.init(PUBLIC_KEY);

      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          email: 'info@oneeddy.com',
          to_name: 'Admin',
          from_name: 'Eddys Members',
          subject: 'New Venue Owner Application',
          ownerName: formData.full_name,
          ownerEmail: formData.email,
          ownerPhone: formData.phone,
          applicationDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          venueName: formData.venue_name,
          venueDescription: formData.venue_description,
          venueType: formData.venue_type || 'Not specified',
          venueCapacity: formData.capacity || 'Not specified',
          venueAddress: formData.venue_address,
          priceRange: formData.price_range || 'Not specified',
          openingHours: formData.opening_hours || 'Not specified',
          venuePhone: formData.phone
        }
      );
      // Optionally clear the form or redirect
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg"
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
              Register Your Venue
            </h2>
            <p className="mt-2 text-sm text-brand-burgundy/70">
              Create your venue profile to start managing bookings
            </p>
            <div className="mt-4 p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-lg">
              <p className="text-sm text-brand-burgundy/80">
                <strong>How it works:</strong> Submit your venue application below. Our team will review it within 48 hours. 
                If approved, you'll receive an email invitation to complete your registration and access your venue dashboard.
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* User Details Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-brand-burgundy mb-4">Your Details</h3>
              
              <div>
                <Label htmlFor="full_name" className="text-brand-burgundy">
                  Full Name
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

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
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Create a password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-brand-burgundy">
                  Phone Number
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter contact number"
                  />
                </div>
              </div>
            </div>

            {/* Venue Details Section */}
            <div className="space-y-4 pt-6 border-t border-brand-burgundy/10">
              <h3 className="text-xl font-semibold text-brand-burgundy mb-4">Venue Details</h3>
              
              <div>
                <Label htmlFor="venue_name" className="text-brand-burgundy">
                  Venue Name
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="venue_name"
                    name="venue_name"
                    type="text"
                    required
                    value={formData.venue_name}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter your venue name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="venue_description" className="text-brand-burgundy">
                  Venue Description
                </Label>
                <Textarea
                  id="venue_description"
                  name="venue_description"
                  required
                  value={formData.venue_description}
                  onChange={handleChange}
                  className="mt-1 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="Describe your venue..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="venue_address" className="text-brand-burgundy">
                  Address
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="venue_address"
                    name="venue_address"
                    type="text"
                    required
                    value={formData.venue_address}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter venue address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue_city" className="text-brand-burgundy">
                    City
                  </Label>
                  <Input
                    id="venue_city"
                    name="venue_city"
                    type="text"
                    required
                    value={formData.venue_city}
                    onChange={handleChange}
                    className="mt-1 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="e.g., Lagos"
                  />
                </div>

                <div>
                  <Label htmlFor="venue_country" className="text-brand-burgundy">
                    Country
                  </Label>
                  <Input
                    id="venue_country"
                    name="venue_country"
                    type="text"
                    required
                    value={formData.venue_country}
                    onChange={handleChange}
                    className="mt-1 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="e.g., Nigeria"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="venue_phone" className="text-brand-burgundy">
                  Venue Phone
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="venue_phone"
                    name="venue_phone"
                    type="tel"
                    required
                    value={formData.venue_phone}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter venue phone"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="venue_email" className="text-brand-burgundy">
                  Venue Email
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <Input
                    id="venue_email"
                    name="venue_email"
                    type="email"
                    required
                    value={formData.venue_email}
                    onChange={handleChange}
                    className="pl-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Enter venue email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity" className="text-brand-burgundy">
                    Capacity (guests)
                  </Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="mt-1 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="e.g., 100"
                  />
                </div>

                <div>
                  <Label htmlFor="price_range" className="text-brand-burgundy">
                    Price Range
                  </Label>
                  <select
                    id="price_range"
                    name="price_range"
                    value={formData.price_range}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 bg-white border border-brand-burgundy/20 rounded-md focus:border-brand-burgundy focus:ring-1 focus:ring-brand-burgundy"
                  >
                    <option value="$">$ (Budget)</option>
                    <option value="$$">$$ (Moderate)</option>
                    <option value="$$$">$$$ (Expensive)</option>
                    <option value="$$$$">$$$$ (Very Expensive)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="opening_hours" className="text-brand-burgundy">
                  Opening Hours
                </Label>
                <Input
                  id="opening_hours"
                  name="opening_hours"
                  type="text"
                  value={formData.opening_hours}
                  onChange={handleChange}
                  className="mt-1 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                  placeholder="e.g., Mon-Sun 9AM-11PM"
                />
              </div>

              <div>
                <Label htmlFor="venue_type" className="text-brand-burgundy">
                  Venue Type
                </Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-brand-burgundy/50" />
                  </div>
                  <select
                    id="venue_type"
                    name="venue_type"
                    required
                    value={formData.venue_type}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-brand-burgundy/20 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-burgundy focus:border-transparent"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="bar">Bar</option>
                    <option value="club">Club</option>
                    <option value="lounge">Lounge</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
              >
                {loading ? 'Registering...' : 'Register Venue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {success && <div className="text-green-600 mb-2">{success}</div>}
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-brand-burgundy/70">
              Already have a venue account?{' '}
              <Link to="/venue-owner/login" className="text-brand-burgundy hover:text-brand-gold font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VenueOwnerRegister; 