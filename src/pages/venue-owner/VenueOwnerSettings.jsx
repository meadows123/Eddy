import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';
import { Save, Phone, Mail, MapPin, Clock, Users, Plus, Trash2, UserPlus, Settings, Bell, Calendar, User } from 'lucide-react';

const VenueOwnerSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [venue, setVenue] = useState(null);
  const [staff, setStaff] = useState([]);
  
  // Venue Profile Form - Only fields that exist in venues table
  const [venueForm, setVenueForm] = useState({
    name: '',
    description: '',
    type: '',
    address: '',
    city: '',
    country: '',
    contact_phone: '',
    contact_email: '',
    price_range: '',
    opening_hours: '',
    website_url: '',
    vibe: ''
  });

  // Staff Management
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: '',
    phone: ''
  });
  const [showAddStaff, setShowAddStaff] = useState(false);

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    email_bookings: true,
    email_cancellations: true,
    email_payments: true,
    sms_bookings: false,
    sms_cancellations: false,
    daily_summary: true,
    weekly_report: true
  });

  // Debug function to check venue ownership
  const debugVenueOwnership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user');
        return;
      }

      console.log('🔍 VENUE OWNERSHIP DEBUG:');
      console.log('👤 Current user:', { id: user.id, email: user.email });
      console.log('🏢 Current venue:', venue ? { id: venue.id, owner_id: venue.owner_id, name: venue.name } : 'No venue');

      // Check venue ownership
      const { data: venueCheck, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id);

      console.log('🏢 Venues owned by user:', venueCheck);
      if (venueError) console.error('❌ Venue check error:', venueError);

      // Check venue_owners record
      const { data: venueOwnerCheck, error: ownerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id);

      console.log('👥 Venue owner records:', venueOwnerCheck);
      if (ownerError) console.error('❌ Venue owner check error:', ownerError);

      // Test if we can update the venue
      if (venue) {
        const { data: updateTest, error: updateError } = await supabase
          .from('venues')
          .select('id, name, owner_id')
          .eq('id', venue.id)
          .eq('owner_id', user.id);

        console.log('🧪 Update test result:', updateTest);
        if (updateError) console.error('❌ Update test error:', updateError);
      }

    } catch (error) {
      console.error('❌ Debug function error:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-debug on component mount in development
  useEffect(() => {
    if (import.meta.env.DEV && venue && currentUser) {
      debugVenueOwnership();
    }
  }, [venue, currentUser]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access settings',
          variant: 'destructive',
        });
        navigate('/venue-owner/login');
        return;
      }

      // Get current user and venue data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: venueOwner, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (venueOwnerError || !venueOwner) {
        toast({
          title: 'Venue Owner Account Required',
          description: 'Please register as a venue owner',
          variant: 'destructive',
        });
        navigate('/venue-owner/register');
        return;
      }

      setCurrentUser(user);
      await fetchVenueData(user.id);
    } catch (error) {
      console.error('Auth check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify authentication',
        variant: 'destructive',
      });
    }
  };

  const fetchVenueData = async (userId) => {
    try {
      setLoading(true);

      console.log('🔍 Fetching venue data for user:', userId);

      // Fetch venue
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (venueError) {
        console.error('❌ Error fetching venue:', venueError);
        
        // Try to find venue by email instead (fallback)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          console.log('🔄 Trying to fetch venue by email:', user.email);
          const { data: venueByEmail, error: emailError } = await supabase
            .from('venues')
            .select('*')
            .eq('contact_email', user.email)
            .single();
          
          if (venueByEmail && !emailError) {
            console.log('✅ Found venue by email, updating owner_id...');
            // Update the venue's owner_id
            await supabase
              .from('venues')
              .update({ owner_id: userId })
              .eq('id', venueByEmail.id);
            
            setVenue({ ...venueByEmail, owner_id: userId });
            console.log('✅ Venue owner_id fixed');
          } else {
            console.error('❌ No venue found by email either:', emailError);
            return;
          }
        } else {
          return;
        }
      } else {
        setVenue(venueData);
        console.log('✅ Venue fetched successfully:', venueData.id);
      }

      setVenue(venueData);
      
      // Populate form with venue data
      setVenueForm({
        name: venueData.name || '',
        description: venueData.description || '',
        type: venueData.type || '',
        address: venueData.address || '',
        city: venueData.city || '',
        country: venueData.country || '',
        contact_phone: venueData.contact_phone || '',
        contact_email: venueData.contact_email || '',
        price_range: venueData.price_range || '',
        opening_hours: venueData.opening_hours || '',
        website_url: venueData.website_url || '',
        vibe: venueData.vibe || '',
        // Note: capacity should be managed in venue tables, not here
        // Note: ambiance and dress_code don't exist in venues table
      });

      // Fetch staff (simplified implementation)
      setStaff([
        {
          id: 1,
          name: 'Manager',
          email: venueData.contact_email,
          role: 'Manager',
          phone: venueData.contact_phone
        }
      ]);

    } catch (error) {
      console.error('Error fetching venue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load venue data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSubmit = async (e) => {
    e.preventDefault();
    if (!venue) return;

    try {
      setSaving(true);

      console.log('🔄 Attempting to update venue:', venue.id);
      console.log('👤 Current user ID:', currentUser?.id);
      console.log('🏢 Venue owner_id:', venue.owner_id);

      // Validate that we have proper authentication
      if (!currentUser?.id) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Validate that this user owns this venue
      if (venue.owner_id !== currentUser.id) {
        console.error('❌ User does not own this venue:', {
          userID: currentUser.id,
          venueOwnerID: venue.owner_id
        });
        throw new Error('You do not have permission to update this venue.');
      }

      // Only update columns that exist in the venues table
      const updateData = {
        name: venueForm.name,
        description: venueForm.description,
        type: venueForm.type,
        address: venueForm.address,
        city: venueForm.city,
        country: venueForm.country,
        contact_phone: venueForm.contact_phone,
        contact_email: venueForm.contact_email,
        price_range: venueForm.price_range,
        opening_hours: venueForm.opening_hours || null,
        website_url: venueForm.website_url || null,
        vibe: venueForm.vibe || null,
        updated_at: new Date().toISOString()
      };

      // Note: Removed ambiance and dress_code as they don't exist in venues table
      // Note: Removed capacity as it's not in the venues table (it's in venue_tables)

      console.log('📝 Update data:', updateData);

      const { data, error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', venue.id)
        .eq('owner_id', currentUser.id) // Double-check ownership
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No venue was updated. Please check that you own this venue.');
      }

      console.log('✅ Venue updated successfully:', data[0]);

      toast({
        title: 'Success!',
        description: 'Venue details updated successfully',
        className: 'bg-green-500 text-white'
      });

      // Refresh venue data
      await fetchVenueData(currentUser.id);

    } catch (error) {
      console.error('❌ Error updating venue:', error);
      
      let errorMessage = 'Failed to update venue details';
      
      if (error.message.includes('permission') || error.message.includes('policy')) {
        errorMessage = 'Permission denied. Please ensure you own this venue.';
      } else if (error.message.includes('authentication') || error.message.includes('auth')) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Venue Found</h2>
        <p className="text-gray-600 mb-6">You don't have a venue associated with your account.</p>
        <Button onClick={() => navigate('/venue-owner/register')}>
          Create Venue
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-4 sm:mb-6">Venue Settings</h1>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 mb-4 grid grid-cols-3 w-full">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Venue Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger 
            value="staff" 
            className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Staff Management</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Venue Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Venue Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleVenueSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Basic Information</h3>
                    
                    <div>
                      <Label htmlFor="name" className="text-sm sm:text-base">Venue Name</Label>
                      <Input
                        id="name"
                        value={venueForm.name}
                        onChange={(e) => setVenueForm({...venueForm, name: e.target.value})}
                        placeholder="Enter venue name"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type" className="text-sm sm:text-base">Venue Type</Label>
                      <Select value={venueForm.type} onValueChange={(value) => setVenueForm({...venueForm, type: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select venue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="club">Nightclub</SelectItem>
                          <SelectItem value="lounge">Lounge</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="cafe">Cafe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
                      <Textarea
                        id="description"
                        value={venueForm.description}
                        onChange={(e) => setVenueForm({...venueForm, description: e.target.value})}
                        placeholder="Describe your venue"
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="vibe" className="text-sm sm:text-base">Venue Vibe</Label>
                      <Select value={venueForm.vibe} onValueChange={(value) => setVenueForm({...venueForm, vibe: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select venue vibe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sophisticated">Sophisticated</SelectItem>
                          <SelectItem value="Energetic">Energetic</SelectItem>
                          <SelectItem value="Relaxed">Relaxed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact & Location */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Contact & Location</h3>
                    
                    <div>
                      <Label htmlFor="address" className="text-sm sm:text-base">Address</Label>
                      <Textarea
                        id="address"
                        value={venueForm.address}
                        onChange={(e) => setVenueForm({...venueForm, address: e.target.value})}
                        placeholder="Full address"
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm sm:text-base">City</Label>
                        <Input
                          id="city"
                          value={venueForm.city}
                          onChange={(e) => setVenueForm({...venueForm, city: e.target.value})}
                          placeholder="City"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country" className="text-sm sm:text-base">Country</Label>
                        <Input
                          id="country"
                          value={venueForm.country}
                          onChange={(e) => setVenueForm({...venueForm, country: e.target.value})}
                          placeholder="Country"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact_phone" className="text-sm sm:text-base">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={venueForm.contact_phone}
                        onChange={(e) => setVenueForm({...venueForm, contact_phone: e.target.value})}
                        placeholder="Phone number"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_email" className="text-sm sm:text-base">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={venueForm.contact_email}
                        onChange={(e) => setVenueForm({...venueForm, contact_email: e.target.value})}
                        placeholder="Email address"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website_url" className="text-sm sm:text-base">Website URL</Label>
                      <Input
                        id="website_url"
                        value={venueForm.website_url}
                        onChange={(e) => setVenueForm({...venueForm, website_url: e.target.value})}
                        placeholder="https://yourvenue.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information - Full Width */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Additional Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price_range" className="text-sm sm:text-base">Price Range</Label>
                      <Select value={venueForm.price_range} onValueChange={(value) => setVenueForm({...venueForm, price_range: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select price range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="opening_hours" className="text-sm sm:text-base">Opening Hours</Label>
                      <Input
                        id="opening_hours"
                        value={venueForm.opening_hours}
                        onChange={(e) => setVenueForm({...venueForm, opening_hours: e.target.value})}
                        placeholder="e.g., Mon-Sun 6PM-2AM"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  {/* Debug button - only show in development */}
                  {import.meta.env.DEV && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={debugVenueOwnership}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      🔍 Debug Ownership
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Add Staff Button */}
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Staff Members</h3>
                  <Button 
                    onClick={() => setShowAddStaff(!showAddStaff)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Staff</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>

                {/* Add Staff Form */}
                {showAddStaff && (
                  <Card className="border-brand-gold/20 bg-brand-gold/5">
                    <CardContent className="p-4 sm:p-6">
                      <h4 className="font-semibold mb-4 text-brand-burgundy">Add New Staff Member</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="staff_name" className="text-sm sm:text-base">Name</Label>
                          <Input
                            id="staff_name"
                            value={newStaff.name}
                            onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                            placeholder="Staff member name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="staff_email" className="text-sm sm:text-base">Email</Label>
                          <Input
                            id="staff_email"
                            type="email"
                            value={newStaff.email}
                            onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                            placeholder="staff@venue.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="staff_role" className="text-sm sm:text-base">Role</Label>
                          <Input
                            id="staff_role"
                            value={newStaff.role}
                            onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                            placeholder="Manager, Server, etc."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="staff_phone" className="text-sm sm:text-base">Phone</Label>
                          <Input
                            id="staff_phone"
                            value={newStaff.phone}
                            onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="button" className="flex-1 sm:flex-none">
                          <UserPlus className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Add Staff Member</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowAddStaff(false)}
                          className="flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Staff List */}
                <div className="space-y-3">
                  {staff.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No staff members added yet.</p>
                  ) : (
                    staff.map((member, index) => (
                      <Card key={index} className="border-brand-burgundy/10">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-brand-burgundy">{member.name}</h4>
                              <p className="text-sm text-gray-600">{member.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                                {member.phone && (
                                  <span className="text-xs text-gray-500">{member.phone}</span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Email Notifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Email Notifications</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm sm:text-base">New Bookings</Label>
                          <p className="text-xs text-gray-500">Get notified when someone books your venue</p>
                        </div>
                        <Switch 
                          checked={notifications.email_bookings}
                          onCheckedChange={(checked) => setNotifications({...notifications, email_bookings: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm sm:text-base">Cancellations</Label>
                          <p className="text-xs text-gray-500">Get notified when bookings are cancelled</p>
                        </div>
                        <Switch 
                          checked={notifications.email_cancellations}
                          onCheckedChange={(checked) => setNotifications({...notifications, email_cancellations: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm sm:text-base">Payment Confirmations</Label>
                          <p className="text-xs text-gray-500">Get notified when payments are received</p>
                        </div>
                        <Switch 
                          checked={notifications.email_payments}
                          onCheckedChange={(checked) => setNotifications({...notifications, email_payments: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">SMS Notifications</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm sm:text-base">New Bookings</Label>
                          <p className="text-xs text-gray-500">SMS alerts for new bookings</p>
                        </div>
                        <Switch 
                          checked={notifications.sms_bookings}
                          onCheckedChange={(checked) => setNotifications({...notifications, sms_bookings: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm sm:text-base">Cancellations</Label>
                          <p className="text-xs text-gray-500">SMS alerts for cancellations</p>
                        </div>
                        <Switch 
                          checked={notifications.sms_cancellations}
                          onCheckedChange={(checked) => setNotifications({...notifications, sms_cancellations: checked})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reports */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-brand-burgundy text-base sm:text-lg">Reports</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm sm:text-base">Daily Summary</Label>
                        <p className="text-xs text-gray-500">Receive daily booking summaries</p>
                      </div>
                      <Switch 
                        checked={notifications.daily_summary}
                        onCheckedChange={(checked) => setNotifications({...notifications, daily_summary: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm sm:text-base">Weekly Report</Label>
                        <p className="text-xs text-gray-500">Receive weekly performance reports</p>
                      </div>
                      <Switch 
                        checked={notifications.weekly_report}
                        onCheckedChange={(checked) => setNotifications({...notifications, weekly_report: checked})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Save Preferences</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueOwnerSettings; 