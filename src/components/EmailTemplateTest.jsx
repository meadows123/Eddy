import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/use-toast';
import { notifyAdminOfVenueSubmission, testEmailJSConnection as testEmailJSConnectivity } from '../lib/api';

const EmailTemplateTest = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [previewData, setPreviewData] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState('booking');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Sample data for testing
  const sampleBooking = {
    id: 'BOOK123456',
    booking_date: new Date().toISOString(),
    booking_time: '20:00:00',
    guest_count: 4,
    table_number: 'VIP-001',
    total_amount: '25000',
    status: 'confirmed'
  };

  const sampleVenue = {
    name: 'The Golden Lounge',
    address: '123 Victoria Island, Lagos, Nigeria',
    contact_phone: '+234 801 234 5678',
    contact_email: 'info@goldenlounge.com',
    images: ['/images/sample-venue.jpg'],
    dress_code: 'Smart casual'
  };

  const sampleCustomer = {
    full_name: 'John Doe',
    email: testEmail,
    phone: '+234 803 456 7890'
  };

  const sampleVenueOwner = {
    full_name: 'Venue Manager',
    email: 'owner@goldenlounge.com'
  };

  const generatePreview = async (templateType) => {
    try {
      setLoading(true);
      
      // Dynamic imports with error handling
      const { 
        bookingConfirmationTemplate, 
        venueOwnerNotificationTemplate,
        cancellationTemplate,
        generateEmailData
      } = await import('@/lib/emailTemplates');

      const emailData = generateEmailData(sampleBooking, sampleVenue, sampleCustomer);
      
      let htmlContent = '';
      switch (templateType) {
        case 'booking':
          htmlContent = bookingConfirmationTemplate(emailData);
          break;
        case 'owner':
          htmlContent = venueOwnerNotificationTemplate(emailData, sampleVenueOwner);
          break;
        case 'cancellation':
          emailData.refundAmount = '20000';
          htmlContent = cancellationTemplate(emailData);
          break;
        default:
          htmlContent = '<p>No template selected</p>';
      }
      
      setPreviewData(htmlContent);
    } catch (err) {
      console.error('Error generating preview:', err);
      toast({
        title: 'Preview Error',
        description: `Failed to generate preview: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testAdminNotification = async () => {
    try {
      setLoading(true);
      console.log('🔄 [V2] Testing admin notification system...', Date.now());
      
      // Simple import - cache busting should happen via browser refresh
      const { notifyAdminOfVenueSubmission } = await import('../lib/api.jsx');
      
      // Sample test data with unique identifier
      const testVenue = {
        id: 'test-venue-123',
        name: 'V2 TEST - Admin Notification Venue',
        type: 'restaurant',
        address: '123 V2 Test Street, Lagos, Nigeria',
        city: 'Lagos',
        description: 'Version 2 cache test venue for admin notifications'
      };
      
      const testUserProfile = {
        id: 'test-user-123',
        first_name: 'Version',
        last_name: 'Two',
        phone: '+234 803 456 7890',
        email: testEmail
      };
      
      const testUser = {
        id: 'test-user-123',
        email: testEmail
      };
      
      console.log('📤 [V2] Sending admin notification - should show NEW template...');
      await notifyAdminOfVenueSubmission(testVenue, testUserProfile, testUser);
      
      console.log('✅ [V2] Admin notification test successful');
      
      toast({
        title: 'Admin Notification Test Successful!',
        description: 'V2 notification sent to info@oneeddy.com',
      });
      
    } catch (error) {
      console.error('❌ Admin notification test failed:', error);
      toast({
        title: 'Admin Notification Test Failed',
        description: error.message || 'Failed to send admin notification',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testBasicEmail = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing basic email service...');
      
      toast({
        title: 'Basic Email Test',
        description: 'Email service test completed. Check console for details.',
      });
      
    } catch (error) {
      console.error('Email test error:', error);
      toast({
        title: 'Email Test Error',
        description: `Error: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testEmailJSConnection = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing EmailJS connectivity...');
      
      const result = await testEmailJSConnectivity();
      
      if (result.success) {
        toast({
          title: 'EmailJS Connection Test Successful!',
          description: `EmailJS is working with: ${result.workingFields}`,
        });
        
        console.log('✅ Working field configuration:', result.workingData);
        console.log('📝 Use these fields in your admin notification function');
        
      } else {
        toast({
          title: 'EmailJS Connection Test Failed',
          description: result.error || 'All field variations failed',
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('❌ EmailJS connection test failed:', error);
      toast({
        title: 'EmailJS Connection Test Failed',
        description: error.message || 'Failed to test EmailJS connection',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-heading text-brand-burgundy mb-6">Email Template Testing</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Template Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter your email to test"
              />
            </div>

            <Tabs value={activeTemplate} onValueChange={setActiveTemplate}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="booking">Customer</TabsTrigger>
                <TabsTrigger value="owner">Venue Owner</TabsTrigger>
                <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="booking" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Preview the booking confirmation email sent to customers.
                </p>
              </TabsContent>
              
              <TabsContent value="owner" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Preview the new booking notification sent to venue owners.
                </p>
              </TabsContent>
              
              <TabsContent value="cancellation" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Preview the cancellation email with refund information.
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Button 
                onClick={() => generatePreview(activeTemplate)} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Generate Preview'}
              </Button>
              
              <Button 
                onClick={testEmailJSConnection} 
                variant="outline" 
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test EmailJS Connection'}
              </Button>
              
              <Button 
                onClick={testBasicEmail} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Basic Email'}
              </Button>
              
              <Button 
                onClick={testAdminNotification} 
                variant="outline" 
                className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Admin Notification'}
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Template Testing:</h4>
              <p className="text-sm text-blue-700">
                Use the "Generate Preview" button to see how the email templates look.
                The preview uses sample data from a test venue booking.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">Admin Notification Test:</h4>
              <p className="text-sm text-orange-700">
                This tests the admin notification system that sends emails to <strong>info@oneeddy.com</strong> when venue owners register. 
                Now using the proper Supabase function invocation method.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Fixed Connection Issue:</h4>
              <p className="text-sm text-green-700">
                Updated to use <code>supabase.functions.invoke()</code> instead of direct fetch calls for better reliability.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading preview...</p>
              </div>
            ) : previewData ? (
              <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: previewData }}
                  className="email-preview"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Click "Generate Preview" to see the email template</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        .email-preview img {
          max-width: 100%;
          height: auto;
        }
        
        .email-preview table {
          max-width: 100%;
        }
        
        .email-preview {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default EmailTemplateTest; 