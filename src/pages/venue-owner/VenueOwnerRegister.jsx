import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, Building2, Phone, MapPin, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/use-toast';
import { supabase } from '../../lib/supabase';
import { notifyAdminOfVenueSubmission } from '../../lib/api'; // Adjust path if needed
import { sendBasicEmail } from '../../lib/emailService.js';
// import { 
//   notifyAdminOfVenueOwnerRegistration 
// } from '../../lib/venueOwnerEmailService.js'; // Replaced with Edge Function
// import emailjs from '@emailjs/browser'; // Replaced with Edge Function

const VenueOwnerRegister = () => {
  
  const navigate = useNavigate();

  // Function to send admin notification via Edge Function
  const sendAdminNotification = async (formData) => {
    try {
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'info@oneeddy.com',
          subject: `New Venue Owner Application - ${formData.venue_name}`,
          template: 'venue-owner-application',
          data: {
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
            venuePhone: formData.phone,
            viewUrl: 'https://oneeddy.com/admin/venue-approvals'
          }
        }
      });

      if (emailError) {
        console.error('❌ Edge Function email error:', emailError);
        throw emailError;
      }

      return emailData;
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      throw error;
    }
  };
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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

  // Test function to check Supabase email configuration
  const testSupabaseEmail = async () => {
    try {
      
      const testEmail = 'test@example.com';
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
        options: {
          emailRedirectTo: `${window.location.origin}/venue-owner/login`
        }
      });
      
      if (error) {
        console.error('❌ Supabase email test failed:', error);
        return { success: false, error: error.message };
      }
      
      
      return { success: true, data };
    } catch (err) {
      console.error('❌ Error testing Supabase email:', err);
      return { success: false, error: err.message };
    }
  };

  // Make test function available globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testSupabaseEmail = testSupabaseEmail;
    }
  }, []);

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

      // First, check if there's an existing venue owner record for this email
      const { data: existingVenues, error: venueCheckError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', formData.email)
        .in('status', ['pending_owner_signup', 'active']); // Check both old and new statuses


      if (venueCheckError) {
        throw venueCheckError;
      }

      if (existingVenues && existingVenues.length > 0) {
        const existingVenue = existingVenues[0];
        
        // If venue owner is already active, redirect to login
        if (existingVenue.status === 'active') {
          setError('Account already exists and is active. Please use the login page to access your dashboard.');
          setTimeout(() => {
            navigate('/venue-owner/login');
          }, 3000);
          return;
        }
        
        
        // Venue owner has been approved, create user account and link it
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/venue-owner/login`,
            data: {
              full_name: formData.full_name,
              phone: formData.phone,
              venue_name: existingVenue.venue_name
            }
          }
        });


        if (signUpError) {
          console.error('❌ User creation failed:', signUpError);
          throw signUpError;
        }

        if (!signUpData.user || !signUpData.user.id) {
          console.error('❌ No user data returned from signup');
          throw new Error('Failed to create user account');
        }


        // The database trigger should automatically link the venue owner
        // Let's wait a moment and then verify the link was created
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the venue owner was linked automatically
        const { data: linkedVenueOwner, error: linkCheckError } = await supabase
          .from('venue_owners')
          .select('*')
          .eq('owner_email', formData.email)
          .eq('user_id', signUpData.user.id)
          .eq('status', 'active')
          .single();

        if (linkCheckError || !linkedVenueOwner) {
          
          // Manual fallback linking
          const { error: manualLinkError } = await supabase
            .from('venue_owners')
            .update({ 
              user_id: signUpData.user.id,
              status: 'active',
              owner_name: formData.full_name,
              owner_phone: formData.phone
            })
            .eq('owner_email', formData.email)
            .eq('status', 'pending_owner_signup');

          if (manualLinkError) {
            console.error('❌ Manual linking also failed:', manualLinkError);
            throw manualLinkError;
          }
          
        } else {
        }

        // Link the venue to the user account
        
        // For the new flow, the venue should already exist with owner_id set
        // Try to find the venue linked to this venue owner
        let { data: venueToLink, error: venueFindError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', existingVenue.venue_id)
          .single();

        if (venueFindError && venueFindError.code === 'PGRST116') {
          // No venue found, try alternative approach
          
          // Try to find venue by venue name and owner email in venue_owners
          const { data: venueOwnerRecord } = await supabase
            .from('venue_owners')
            .select('venue_name, owner_email')
            .eq('owner_email', formData.email.trim())
            .eq('status', 'active')
            .single();
            
          if (venueOwnerRecord) {
            // Try to find venue by name and email combination
            const { data: altVenue, error: altError } = await supabase
              .from('venues')
              .select('*')
              .eq('name', venueOwnerRecord.venue_name)
              .ilike('contact_email', formData.email.trim())
              .is('owner_id', null)
              .single();
              
            if (!altError && altVenue) {
              venueToLink = altVenue;
              venueFindError = null;
            }
          }
        }

        if (venueFindError) {
          console.error('❌ Failed to find venue to link:', venueFindError);
          
          // Show all venues for debugging
          const { data: allVenues } = await supabase
            .from('venues')
            .select('id, name, contact_email, owner_id')
            .ilike('contact_email', `%${formData.email.split('@')[0]}%`);
            
          
          throw new Error('Venue not found. Please contact support.');
        }

        if (venueToLink) {
          
          // Update the venue with the owner_id
          const { error: venueUpdateError } = await supabase
            .from('venues')
            .update({ 
              owner_id: signUpData.user.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', venueToLink.id);

          if (venueUpdateError) {
            console.error('❌ Failed to update venue owner_id:', venueUpdateError);
            throw venueUpdateError;
          }


          // Update the venue_owners record with the venue_id
          const { error: venueOwnerUpdateError } = await supabase
            .from('venue_owners')
            .update({ 
              venue_id: venueToLink.id,
              updated_at: new Date().toISOString()
            })
            .eq('owner_email', formData.email.trim())
            .eq('status', 'active');

          if (venueOwnerUpdateError) {
            console.error('❌ Failed to update venue_owners with venue_id:', venueOwnerUpdateError);
            // Don't throw here as the main linking is done
          } else {
          }
        } else {
          throw new Error('Venue linking failed. Please contact support.');
        }

        // Send admin notification email
        try {
          const venueOwnerData = {
            email: formData.email,
            owner_name: formData.full_name,
            venue_name: existingVenue.venue_name,
            venue_type: existingVenue.venue_type,
            venue_address: existingVenue.venue_address,
            venue_city: existingVenue.venue_city
          };
          
          // Notify admin of new registration
          await notifyAdminOfVenueOwnerRegistration(venueOwnerData);
        } catch (emailError) {
          console.error('❌ Failed to send admin notification email:', {
            message: emailError.message || 'Unknown error',
            name: emailError.name || 'Unknown',
            details: emailError.details || null,
            stack: emailError.stack || null,
            fullError: emailError
          });
          // Don't fail the registration if email fails
        }

        // Check if email confirmation is required
        if (signUpData.user && !signUpData.user.email_confirmed_at) {
          setSuccess('Account created successfully! Please check your email and click the confirmation link before logging in.');
        } else {
          setSuccess('Account created successfully! You can now log in to manage your venue.');
        }
        
        
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


      // First, create the user account immediately
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/venue-owner/login`,
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            venue_name: formData.venue_name
          }
        }
      });

      if (signUpError) {
        console.error('❌ User creation failed:', signUpError);
        setError(`Failed to create account: ${signUpError.message}`);
        return;
      }

      if (!signUpData.user || !signUpData.user.id) {
        console.error('❌ No user data returned from signup');
        setError('Failed to create user account');
        return;
      }


      // Only create the pending request for admin tracking
      const requestData = {
        user_id: signUpData.user.id,
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
        console.error('❌ Failed to create pending request:', error);
        throw new Error(`Failed to create pending request: ${error.message}`);
      }

      // Remove the venue owner and venue creation code from here
      // The admin approval process will handle creating those records

      // Send admin notification email via Edge Function
      try {
        await sendAdminNotification(formData);
      } catch (emailError) {
        console.error('❌ Failed to send admin notification email:', {
          message: emailError.message || 'Unknown error',
          name: emailError.name || 'Unknown',
          details: emailError.details || null,
          stack: emailError.stack || null,
          fullError: emailError
        });
        // Don't fail the registration if email fails
      }

      // Check if email confirmation is required
      if (signUpData.user && !signUpData.user.email_confirmed_at) {
        setSuccess('Account created successfully! Please check your email and click the confirmation link to complete your registration. Your venue will be reviewed by our team within 48 hours.');
      } else {
        setSuccess('Account created successfully! Your venue application has been submitted and will be reviewed by our team within 48 hours.');
      }
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
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-white border-brand-burgundy/20 focus:border-brand-burgundy"
                    placeholder="Create a password"
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
                    <option value="$$$">$$$ (Premium)</option>
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

            {/* Email Confirmation Reminder */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Important: Check Your Email</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>After registering, you'll receive a confirmation email. <strong>Please check your inbox and click the verification link</strong> to complete your venue account setup and access your dashboard!</p>
                  </div>
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