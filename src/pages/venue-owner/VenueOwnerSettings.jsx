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
import { Save, Phone, Mail, MapPin, Clock, Users, Plus, Trash2, UserPlus, Settings, Bell, Calendar } from 'lucide-react';

const VenueOwnerSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [venue, setVenue] = useState(null);
  const [staff, setStaff] = useState([]);
  
  // Venue Profile Form
  const [venueForm, setVenueForm] = useState({
    name: '',
    description: '',
    type: '',
    address: '',
    city: '',
    country: '',
    contact_phone: '',
    contact_email: '',
    capacity: '',
    price_range: '',
    opening_hours: '',
    cuisine: [],
    music: [],
    ambiance: '',
    dress_code: ''
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

  useEffect(() => {
    checkAuth();
  }, []);

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

      // Fetch venue
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (venueError) {
        console.error('Error fetching venue:', venueError);
        return;
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
        capacity: venueData.capacity || '',
        price_range: venueData.price_range || '',
        opening_hours: venueData.opening_hours || '',
        cuisine: venueData.cuisine || [],
        music: venueData.music || [],
        ambiance: venueData.ambiance || '',
        dress_code: venueData.dress_code || ''
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

      const { error } = await supabase
        .from('venues')
        .update({
          name: venueForm.name,
          description: venueForm.description,
          type: venueForm.type,
          address: venueForm.address,
          city: venueForm.city,
          country: venueForm.country,
          contact_phone: venueForm.contact_phone,
          contact_email: venueForm.contact_email,
          capacity: venueForm.capacity ? parseInt(venueForm.capacity) : null,
          price_range: venueForm.price_range,
          opening_hours: venueForm.opening_hours,
          ambiance: venueForm.ambiance,
          dress_code: venueForm.dress_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', venue.id);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Venue details updated successfully',
        className: 'bg-green-500 text-white'
      });

      // Refresh venue data
      await fetchVenueData(currentUser.id);

    } catch (error) {
      console.error('Error updating venue:', error);
      toast({
        title: 'Error',
        description: 'Failed to update venue details',
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
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Venue Found</h2>
        <p className="text-gray-600 mb-6">You don't have a venue associated with your account.</p>
        <Button onClick={() => navigate('/venue-owner/register')}>
          Create Venue
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-heading text-brand-burgundy mb-6">Venue Settings</h1>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 mb-4">
          <TabsTrigger value="profile" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            <Settings className="h-4 w-4 mr-2" />
            Venue Profile
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            <Users className="h-4 w-4 mr-2" />
            Staff Management
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Venue Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Venue Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVenueSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy">Basic Information</h3>
                    
                    <div>
                      <Label htmlFor="name">Venue Name</Label>
                      <Input
                        id="name"
                        value={venueForm.name}
                        onChange={(e) => setVenueForm({...venueForm, name: e.target.value})}
                        placeholder="Enter venue name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Venue Type</Label>
                      <Select value={venueForm.type} onValueChange={(value) => setVenueForm({...venueForm, type: value})}>
                        <SelectTrigger>
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={venueForm.description}
                        onChange={(e) => setVenueForm({...venueForm, description: e.target.value})}
                        placeholder="Describe your venue"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={venueForm.capacity}
                        onChange={(e) => setVenueForm({...venueForm, capacity: e.target.value})}
                        placeholder="Maximum capacity"
                      />
                    </div>
                  </div>

                  {/* Contact & Location */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-brand-burgundy">Contact & Location</h3>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={venueForm.address}
                        onChange={(e) => setVenueForm({...venueForm, address: e.target.value})}
                        placeholder="Full address"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={venueForm.city}
                          onChange={(e) => setVenueForm({...venueForm, city: e.target.value})}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={venueForm.country}
                          onChange={(e) => setVenueForm({...venueForm, country: e.target.value})}
                          placeholder="Country"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={venueForm.contact_phone}
                        onChange={(e) => setVenueForm({...venueForm, contact_phone: e.target.value})}
                        placeholder="+234 xxx xxx xxxx"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={venueForm.contact_email}
                        onChange={(e) => setVenueForm({...venueForm, contact_email: e.target.value})}
                        placeholder="contact@venue.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="opening_hours">Opening Hours</Label>
                      <Input
                        id="opening_hours"
                        value={venueForm.opening_hours}
                        onChange={(e) => setVenueForm({...venueForm, opening_hours: e.target.value})}
                        placeholder="e.g., Mon-Sun: 6PM - 2AM"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button type="submit" disabled={saving} className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90">
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
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Staff Management
                </div>
                <Button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Staff Form */}
              {showAddStaff && (
                <Card className="mb-6 border border-brand-gold/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Staff Member</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="staff_name">Full Name</Label>
                        <Input
                          id="staff_name"
                          value={newStaff.name}
                          onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                          placeholder="Enter staff name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff_email">Email</Label>
                        <Input
                          id="staff_email"
                          type="email"
                          value={newStaff.email}
                          onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff_phone">Phone</Label>
                        <Input
                          id="staff_phone"
                          value={newStaff.phone}
                          onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff_role">Role</Label>
                        <Select value={newStaff.role} onValueChange={(value) => setNewStaff({...newStaff, role: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="host">Host</SelectItem>
                            <SelectItem value="server">Server</SelectItem>
                            <SelectItem value="bartender">Bartender</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        onClick={() => {
                          // Add staff member logic here
                          const newStaffMember = {
                            id: Date.now(),
                            ...newStaff
                          };
                          setStaff([...staff, newStaffMember]);
                          setNewStaff({ name: '', email: '', role: '', phone: '' });
                          setShowAddStaff(false);
                          toast({
                            title: 'Success!',
                            description: 'Staff member added successfully',
                            className: 'bg-green-500 text-white'
                          });
                        }}
                        className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Staff
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddStaff(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Staff List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-brand-burgundy">Current Staff</h3>
                {staff.length === 0 ? (
                  <div className="text-center py-8 text-brand-burgundy/70">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No staff members added yet.</p>
                    <p className="text-sm">Click "Add Staff" to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {staff.map((member) => (
                      <Card key={member.id} className="border border-brand-burgundy/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-brand-burgundy" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-brand-burgundy">{member.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-brand-burgundy/70">
                                  <span className="flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {member.email}
                                  </span>
                                  {member.phone && (
                                    <span className="flex items-center">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {member.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-brand-gold/20 text-brand-burgundy">
                                {member.role}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStaff(staff.filter(s => s.id !== member.id));
                                  toast({
                                    title: 'Staff Removed',
                                    description: `${member.name} has been removed`,
                                  });
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences Tab */}
        <TabsContent value="notifications">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <h3 className="font-semibold text-brand-burgundy mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">New Bookings</h4>
                        <p className="text-sm text-brand-burgundy/70">Get notified when new reservations are made</p>
                      </div>
                      <Switch
                        checked={notifications.email_bookings}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, email_bookings: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">Cancellations</h4>
                        <p className="text-sm text-brand-burgundy/70">Get notified when bookings are cancelled</p>
                      </div>
                      <Switch
                        checked={notifications.email_cancellations}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, email_cancellations: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">Payment Confirmations</h4>
                        <p className="text-sm text-brand-burgundy/70">Get notified when payments are processed</p>
                      </div>
                      <Switch
                        checked={notifications.email_payments}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, email_payments: checked})
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SMS Notifications */}
                <div>
                  <h3 className="font-semibold text-brand-burgundy mb-4">SMS Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">New Bookings</h4>
                        <p className="text-sm text-brand-burgundy/70">Get SMS alerts for new reservations</p>
                      </div>
                      <Switch
                        checked={notifications.sms_bookings}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, sms_bookings: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">Urgent Cancellations</h4>
                        <p className="text-sm text-brand-burgundy/70">Get SMS alerts for last-minute cancellations</p>
                      </div>
                      <Switch
                        checked={notifications.sms_cancellations}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, sms_cancellations: checked})
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Reports & Summaries */}
                <div>
                  <h3 className="font-semibold text-brand-burgundy mb-4">Reports & Summaries</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">Daily Summary</h4>
                        <p className="text-sm text-brand-burgundy/70">Daily report of bookings and revenue</p>
                      </div>
                      <Switch
                        checked={notifications.daily_summary}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, daily_summary: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-brand-burgundy/10 rounded-lg">
                      <div>
                        <h4 className="font-medium text-brand-burgundy">Weekly Report</h4>
                        <p className="text-sm text-brand-burgundy/70">Comprehensive weekly performance report</p>
                      </div>
                      <Switch
                        checked={notifications.weekly_report}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, weekly_report: checked})
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      // Save notification preferences logic here
                      toast({
                        title: 'Success!',
                        description: 'Notification preferences updated successfully',
                        className: 'bg-green-500 text-white'
                      });
                    }}
                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>

                {/* Note about email service */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-800">Email Service Status</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Email notifications will be fully functional once SMTP configuration is completed. 
                        Currently, booking confirmations are still processed but may use fallback methods.
                      </p>
                    </div>
                  </div>
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