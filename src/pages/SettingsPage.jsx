import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Bell, Lock, User, CreditCard, Globe, Trash2, Database } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw signInError;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      if (updateError) throw updateError;

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-heading text-brand-burgundy mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Account Settings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <User className="h-5 w-5 mr-2" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue="+234 123 456 7890" />
              </div>
              <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <Lock className="h-5 w-5 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <Button 
                  type="submit" 
                  className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-brand-burgundy/70">Receive updates about your bookings</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-brand-burgundy/70">Get text messages for important updates</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-brand-burgundy/70">Receive promotions and special offers</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="**** **** **** ****" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="***" />
                </div>
              </div>
              <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
                Add Payment Method
              </Button>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <Globe className="h-5 w-5 mr-2" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="w-full rounded-md border border-brand-burgundy/10 bg-white px-3 py-2"
                >
                  <option value="en">English</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                  <option value="ha">Hausa</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full rounded-md border border-brand-burgundy/10 bg-white px-3 py-2"
                >
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
              <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-brand-burgundy">
                <Database className="h-5 w-5 mr-2" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-1">Delete Your Data</h3>
                    <p className="text-sm text-red-700 mb-3">
                      You have the right to request deletion of all your personal data from our system. 
                      This action is permanent and cannot be undone.
                    </p>
                    <Button 
                      variant="outline" 
                      className="border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => navigate('/delete-data')}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Request Data Deletion
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-xs text-brand-burgundy/60">
                <p>
                  <strong>Note:</strong> This will delete all your account data including profile information, 
                  booking history, and payment records. You will need to create a new account if you wish to 
                  use our service again.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 