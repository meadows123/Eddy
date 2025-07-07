import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/use-toast';
import { 
  bookingConfirmationTemplate, 
  venueOwnerNotificationTemplate,
  cancellationTemplate,
  generateEmailData
} from '@/lib/emailTemplates.js';
import { testEmailService } from '@/lib/emailService.js';

const EmailTemplateTest = () => {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [previewData, setPreviewData] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState('booking');

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

  const generatePreview = (templateType) => {
    const emailData = generateEmailData(sampleBooking, sampleVenue, sampleCustomer);
    
    switch (templateType) {
      case 'booking':
        return bookingConfirmationTemplate(emailData);
      case 'owner':
        return venueOwnerNotificationTemplate(emailData, sampleVenueOwner);
      case 'cancellation':
        emailData.refundAmount = '20000';
        return cancellationTemplate(emailData);
      default:
        return '';
    }
  };

  const handlePreview = () => {
    const htmlContent = generatePreview(activeTemplate);
    setPreviewData(htmlContent);
  };

  const handleTestEmail = async () => {
    try {
      const result = await testEmailService();
      if (result.success) {
        toast({
          title: 'Email Test Successful!',
          description: 'EmailJS is configured correctly.',
          className: 'bg-green-500 text-white'
        });
      } else {
        toast({
          title: 'Email Test Failed',
          description: result.error || 'Please check your EmailJS configuration.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Email Test Error',
        description: 'Make sure you have configured EmailJS credentials.',
        variant: 'destructive'
      });
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
              <Button onClick={handlePreview} className="w-full">
                Generate Preview
              </Button>
              
              <Button 
                onClick={handleTestEmail} 
                variant="outline" 
                className="w-full"
              >
                Test EmailJS Setup
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Create account at emailjs.com</li>
                <li>2. Get your Service ID, Template ID, and Public Key</li>
                <li>3. Update credentials in src/lib/emailService.js</li>
                <li>4. Create templates in EmailJS dashboard</li>
                <li>5. Test using the button above</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewData ? (
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