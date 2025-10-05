import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trash2, 
  AlertTriangle, 
  Shield, 
  User, 
  Building2, 
  FileText, 
  CreditCard,
  Calendar,
  Mail,
  Database,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';

const DataDeletionPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirmation, 3: Processing, 4: Complete
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [dataToDelete, setDataToDelete] = useState({
    profile: true,
    bookings: true,
    payments: true,
    emails: true,
    preferences: true,
    venueData: false, // Only for venue owners
  });

  const isVenueOwner = user && user.user_metadata?.user_type === 'venue_owner';

  const handleDataDeletion = async () => {
    if (!user) return;

    setIsLoading(true);
    setStep(3);

    try {
      console.log('🗑️ Starting data deletion process for user:', user.id);

      // Step 1: Delete user bookings and related data
      if (dataToDelete.bookings) {
        console.log('🗑️ Deleting user bookings...');
        
        // Get all bookings for this user
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id);

        if (bookingsError) {
          console.error('❌ Error fetching bookings:', bookingsError);
        } else if (bookings && bookings.length > 0) {
          const bookingIds = bookings.map(b => b.id);

          // Delete split payment requests
          const { error: splitPaymentError } = await supabase
            .from('split_payment_requests')
            .delete()
            .in('booking_id', bookingIds);

          if (splitPaymentError) {
            console.error('❌ Error deleting split payment requests:', splitPaymentError);
          }

          // Delete bookings
          const { error: deleteBookingsError } = await supabase
            .from('bookings')
            .delete()
            .eq('user_id', user.id);

          if (deleteBookingsError) {
            console.error('❌ Error deleting bookings:', deleteBookingsError);
          }
        }
      }

      // Step 2: Delete venue owner data if applicable
      if (isVenueOwner && dataToDelete.venueData) {
        console.log('🗑️ Deleting venue owner data...');
        
        // Get venue owner record
        const { data: venueOwner, error: venueOwnerError } = await supabase
          .from('venue_owners')
          .select('venue_id')
          .eq('user_id', user.id)
          .single();

        if (venueOwnerError) {
          console.error('❌ Error fetching venue owner data:', venueOwnerError);
        } else if (venueOwner) {
          // Delete venue tables
          const { error: tablesError } = await supabase
            .from('venue_tables')
            .delete()
            .eq('venue_id', venueOwner.venue_id);

          if (tablesError) {
            console.error('❌ Error deleting venue tables:', tablesError);
          }

          // Delete venue
          const { error: venueError } = await supabase
            .from('venues')
            .delete()
            .eq('id', venueOwner.venue_id);

          if (venueError) {
            console.error('❌ Error deleting venue:', venueError);
          }

          // Delete venue owner record
          const { error: deleteVenueOwnerError } = await supabase
            .from('venue_owners')
            .delete()
            .eq('user_id', user.id);

          if (deleteVenueOwnerError) {
            console.error('❌ Error deleting venue owner record:', deleteVenueOwnerError);
          }
        }
      }

      // Step 3: Delete user profile
      if (dataToDelete.profile) {
        console.log('🗑️ Deleting user profile...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (profileError) {
          console.error('❌ Error deleting profile:', profileError);
        }
      }

      // Step 4: Log the deletion request
      console.log('📝 Logging data deletion request...');
      const { error: logError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          deletion_reason: reason,
          data_types_deleted: Object.keys(dataToDelete).filter(key => dataToDelete[key]),
          deleted_at: new Date().toISOString(),
          user_type: isVenueOwner ? 'venue_owner' : 'customer'
        });

      if (logError) {
        console.error('❌ Error logging deletion request:', logError);
      }

      // Step 5: Sign out user and redirect
      console.log('✅ Data deletion completed successfully');
      setStep(4);
      
      toast({
        title: "Data Deletion Complete",
        description: "All your data has been successfully deleted from our system.",
      });

      // Sign out after a short delay
      setTimeout(async () => {
        await signOut();
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('❌ Error during data deletion:', error);
      toast({
        title: "Deletion Error",
        description: "There was an error deleting your data. Please contact support.",
        variant: "destructive"
      });
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
          Delete Your Data
        </h2>
        <p className="text-brand-burgundy/70">
          This action will permanently delete all your personal data from our system.
        </p>
      </div>

      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Warning:</strong> This action cannot be undone. Once deleted, your data cannot be recovered.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-brand-burgundy">
            <Database className="h-5 w-5 mr-2" />
            Data Types to Delete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="profile" 
              checked={dataToDelete.profile}
              onCheckedChange={(checked) => 
                setDataToDelete(prev => ({ ...prev, profile: checked }))
              }
            />
            <Label htmlFor="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Profile Information (Name, Email, Phone)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="bookings" 
              checked={dataToDelete.bookings}
              onCheckedChange={(checked) => 
                setDataToDelete(prev => ({ ...prev, bookings: checked }))
              }
            />
            <Label htmlFor="bookings" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Booking History & Reservations
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="payments" 
              checked={dataToDelete.payments}
              onCheckedChange={(checked) => 
                setDataToDelete(prev => ({ ...prev, payments: checked }))
              }
            />
            <Label htmlFor="payments" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Records & Transaction History
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="emails" 
              checked={dataToDelete.emails}
              onCheckedChange={(checked) => 
                setDataToDelete(prev => ({ ...prev, emails: checked }))
              }
            />
            <Label htmlFor="emails" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email Communication Records
            </Label>
          </div>

          {isVenueOwner && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="venueData" 
                checked={dataToDelete.venueData}
                onCheckedChange={(checked) => 
                  setDataToDelete(prev => ({ ...prev, venueData: checked }))
                }
              />
              <Label htmlFor="venueData" className="flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Venue Information & Business Data
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Label htmlFor="reason">Reason for Data Deletion (Optional)</Label>
        <Textarea
          id="reason"
          placeholder="Please let us know why you're requesting data deletion..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="confirm" 
          checked={confirmed}
          onCheckedChange={setConfirmed}
        />
        <Label htmlFor="confirm" className="text-sm">
          I understand that this action is permanent and cannot be undone
        </Label>
      </div>

      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={() => setStep(2)}
          disabled={!confirmed}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Shield className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
          Final Confirmation
        </h2>
        <p className="text-brand-burgundy/70">
          Please review your data deletion request before proceeding.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-burgundy">Deletion Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(dataToDelete).map(([key, value]) => {
            if (!value) return null;
            
            const labels = {
              profile: 'Profile Information',
              bookings: 'Booking History',
              payments: 'Payment Records',
              emails: 'Email Records',
              venueData: 'Venue & Business Data'
            };

            return (
              <div key={key} className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>{labels[key]}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {reason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand-burgundy">Reason Provided</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brand-burgundy/80">{reason}</p>
          </CardContent>
        </Card>
      )}

      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>This is your final chance to cancel.</strong> Once you proceed, your data will be permanently deleted and cannot be recovered.
        </AlertDescription>
      </Alert>

      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={() => setStep(1)}
          className="flex-1"
        >
          Go Back
        </Button>
        <Button 
          onClick={handleDataDeletion}
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete My Data Now
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
        <Database className="h-8 w-8 text-blue-600 animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
        Deleting Your Data
      </h2>
      <p className="text-brand-burgundy/70">
        Please wait while we securely delete your data from our system...
      </p>
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy"></div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-brand-burgundy mb-2">
        Data Deletion Complete
      </h2>
      <p className="text-brand-burgundy/70">
        All your data has been successfully deleted from our system. You will be redirected to the home page.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>What happens next?</strong><br />
          You have been signed out and will be redirected to the home page. 
          If you wish to use our service again, you'll need to create a new account.
        </p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-cream/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brand-burgundy mb-2">
              Authentication Required
            </h2>
            <p className="text-brand-burgundy/70 mb-4">
              You must be logged in to access the data deletion page.
            </p>
            <Button onClick={() => navigate('/profile')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-cream/30">
      <div className="container py-8 px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-xl border-brand-gold/20">
            <CardHeader className="bg-gradient-to-r from-brand-burgundy to-brand-gold text-white">
              <CardTitle className="flex items-center">
                <Trash2 className="h-6 w-6 mr-2" />
                Data Deletion Request
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DataDeletionPage;
