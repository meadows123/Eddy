import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Building, Users, Music, MapPin } from 'lucide-react';

const JoinVenuePage = () => {
  const { toast } = useToast();
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Venue submission data:", formData);
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest! We'll review your application and get back to you soon.",
        className: "bg-primary text-primary-foreground"
      });
      setFormData({
        venueName: '', contactPerson: '', email: '', phone: '',
        address: '', city: '', venueType: '', capacity: '', musicGenres: '', venueDescription: '',
      });
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
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="venueName" className="text-foreground flex items-center"><Building className="h-4 w-4 mr-2 text-primary" />Venue Name</Label>
                <Input type="text" id="venueName" name="venueName" value={formData.venueName} onChange={handleChange} placeholder="e.g., The Underground Lounge" className={`mt-1 ${errors.venueName ? 'border-destructive' : ''}`} />
                {errors.venueName && <p className="text-sm text-destructive mt-1">{errors.venueName}</p>}
              </div>
              <div>
                <Label htmlFor="contactPerson" className="text-foreground">Contact Person</Label>
                <Input type="text" id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="e.g., Alex Smith" className={`mt-1 ${errors.contactPerson ? 'border-destructive' : ''}`} />
                {errors.contactPerson && <p className="text-sm text-destructive mt-1">{errors.contactPerson}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="text-foreground">Contact Email</Label>
                <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="contact@yourvenue.com" className={`mt-1 ${errors.email ? 'border-destructive' : ''}`} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="phone" className="text-foreground">Contact Phone</Label>
                <Input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g., 020 1234 5678" className={`mt-1 ${errors.phone ? 'border-destructive' : ''}`} />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="text-foreground flex items-center"><MapPin className="h-4 w-4 mr-2 text-primary" />Venue Address</Label>
              <Input type="text" id="address" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main Street" className={`mt-1 ${errors.address ? 'border-destructive' : ''}`} />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="city" className="text-foreground">City</Label>
                <Input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder="e.g., London" className={`mt-1 ${errors.city ? 'border-destructive' : ''}`} />
                {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="venueType" className="text-foreground">Venue Type</Label>
                <Select value={formData.venueType} onValueChange={(value) => handleSelectChange('venueType', value)}>
                  <SelectTrigger className={`mt-1 ${errors.venueType ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Select venue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="lounge">Lounge</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="pub">Pub</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="nightclub">Nightclub</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.venueType && <p className="text-sm text-destructive mt-1">{errors.venueType}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="capacity" className="text-foreground flex items-center"><Users className="h-4 w-4 mr-2 text-primary" />Capacity (approx.)</Label>
                <Input type="number" id="capacity" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="e.g., 500" className="mt-1" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="musicGenres" className="text-foreground flex items-center"><Music className="h-4 w-4 mr-2 text-primary" />Main Music Genres (comma-separated)</Label>
              <Input type="text" id="musicGenres" name="musicGenres" value={formData.musicGenres} onChange={handleChange} placeholder="e.g., House, Techno, Hip Hop" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="venueDescription" className="text-foreground">Tell Us About Your Venue</Label>
              <Textarea id="venueDescription" name="venueDescription" value={formData.venueDescription} onChange={handleChange} placeholder="Describe what makes your venue unique..." rows={5} className="mt-1" />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground text-lg py-3">
              Submit Application
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinVenuePage;