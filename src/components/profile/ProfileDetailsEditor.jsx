import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, X } from 'lucide-react';

/**
 * Profile Details Editor Component
 * Allows users to edit their profile information
 */
const ProfileDetailsEditor = ({ user }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: '',
    city: '',
    country: ''
  });
  const [originalData, setOriginalData] = useState(formData);

  // Load current profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone, age, city, country')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (data) {
          const profileData = {
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            age: data.age || '',
            city: data.city || '',
            country: data.country || ''
          };
          setFormData(profileData);
          setOriginalData(profileData);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
      }
    };

    loadProfileData();
  }, [user?.id, user?.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.first_name?.trim() || !formData.last_name?.trim() || !formData.email?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'First name, last name, and email are required',
          variant: 'destructive'
        });
        setIsSaving(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive'
        });
        setIsSaving(false);
        return;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          age: formData.age ? parseInt(formData.age) : null,
          city: formData.city,
          country: formData.country
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setOriginalData(formData);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
        className: 'bg-green-50 border-green-200'
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2 pb-8 border-b border-brand-burgundy/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Profile Details</h2>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-brand-burgundy hover:bg-brand-burgundy/90"
          >
            Edit Profile
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 p-4 bg-brand-cream/20 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-brand-burgundy font-semibold">
                First Name *
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-brand-burgundy font-semibold">
                Last Name *
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter your last name"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-brand-burgundy font-semibold">
                Email Address *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-brand-burgundy font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-brand-burgundy font-semibold">
                Age
              </Label>
              <Input
                id="age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-brand-burgundy font-semibold">
                City
              </Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
                className="border-brand-burgundy/20"
              />
            </div>

            {/* Country */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="country" className="text-brand-burgundy font-semibold">
                Country
              </Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter your country"
                className="border-brand-burgundy/20"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-brand-cream/20 rounded-lg">
          {/* Display Mode */}
          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">First Name</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.first_name || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">Last Name</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.last_name || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">Email Address</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.email || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">Phone Number</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.phone || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">Age</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.age || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-brand-burgundy/70 font-medium">City</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.city || '—'}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-brand-burgundy/70 font-medium">Country</p>
            <p className="text-lg font-medium text-brand-burgundy">{formData.country || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDetailsEditor;

