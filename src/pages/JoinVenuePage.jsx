import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Building, Users, Music, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Add this import

const JoinVenuePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Add loading state
  const [formData, setFormData] = useState({
    venueName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    venueType: '',
    capacity: '',
    musicGenres: '',
    venueDescription: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({...prev, [name]: null}));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({...prev, [name]: null}));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.venueName.trim()) newErrors.venueName = "Venue name is required.";
    if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact person name is required.";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid.";
    }
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!formData.address.trim()) newErrors.address = "Venue address is required.";
    if (!formData.city.trim()) newErrors.city = "City is required.";
    if (!formData.venueType.trim()) newErrors.venueType = "Venue type is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        console.log("Submitting venue application:", formData);
        
        // 1. Save the application to the database
        const { data: applicationData, error: dbError } = await supabase
          .from('pending_venue_owner_requests')
          .insert([{
            venue_name: formData.venueName,
            contact_name: formData.contactPerson,
            email: formData.email,
            contact_phone: formData.phone,
            venue_address: formData.address,
            venue_city: formData.city,
            venue_type: formData.venueType,
            capacity: formData.capacity,
            additional_info: formData.venueDescription,
            music_genres: formData.musicGenres,
            status: 'pending',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save application. Please try again.');
        }

        console.log('✅ Application saved to database:', applicationData);

        // 2. Send admin notification email
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: 'info@oneeddy.com', // Admin email
            subject: 'New Venue Owner Application - ' + formData.venueName,
            template: 'venue-owner-application',
            data: {
              ownerName: formData.contactPerson,
              ownerEmail: formData.email,
              ownerPhone: formData.phone,
              applicationDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              venueName: formData.venueName,
              venueDescription: formData.venueDescription,
              venueType: formData.venueType,
              venueCapacity: formData.capacity,
              venueAddress: formData.address,
              priceRange: '$$', // Default price range
              openingHours: 'Not specified',
              venuePhone: formData.phone,
              viewUrl: 'https://www.oneeddy.com/admin/venue-approvals'
            }
          }
        });

        if (emailError) {
          console.error('Email error:', emailError);
          // Don't throw here - the application was saved successfully
          toast({
            title: "Application Submitted!",
            description: "Your application has been saved. We'll review it and get back to you soon.",
            variant: "default"
          });
        } else {
          console.log('✅ Admin notification email sent:', emailData);
          toast({
            title: "Application Submitted!",
            description: "Thank you for your interest! We'll review your application and get back to you soon.",
            className: "bg-primary text-primary-foreground"
          });
        }

        // 3. Reset form
        setFormData({
          venueName: '', contactPerson: '', email: '', phone: '',
          address: '', city: '', venueType: '', capacity: '', musicGenres: '', venueDescription: '',
        });

      } catch (error) {
        console.error('Submission error:', error);
        toast({
          title: "Error!",
          description: error.message || "Failed to submit application. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    } else {
      toast({
        title: "Error!",
        description: "Please correct the errors in the form.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="py-12 md:py-20 bg-gradient-to-b from-background to-background/90">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-primary glow-text">Partner With NightVibe</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Showcase your venue to a vibrant community of nightlife enthusiasts. Join our curated list of premier UK destinations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-3xl mx-auto bg-card p-6 md:p-10 rounded-lg shadow-xl border border-border/70 glass-effect"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... existing form fields ... */}
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground text-lg py-3"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinVenuePage;