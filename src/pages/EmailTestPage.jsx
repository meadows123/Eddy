import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import emailjs from '@emailjs/browser';

const EmailTestPage = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const { toast } = useToast();

  // EmailJS config from environment
  const config = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  };

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [...prev, { message, type, timestamp }]);
  };

  const testEmailJS = async () => {
    if (!testEmail) {
      toast({ title: "Please enter an email", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      // Check configuration
      addResult('Checking EmailJS configuration...', 'info');
      
      if (!config.serviceId || !config.templateId || !config.publicKey) {
        addResult('❌ EmailJS configuration incomplete!', 'error');
        addResult(`Service ID: ${config.serviceId ? '✅ Set' : '❌ Missing'}`, 'error');
        addResult(`Template ID: ${config.templateId ? '✅ Set' : '❌ Missing'}`, 'error');
        addResult(`Public Key: ${config.publicKey ? '✅ Set' : '❌ Missing'}`, 'error');
        return;
      }

      addResult('✅ Configuration looks good', 'success');
      addResult(`Service ID: ${config.serviceId}`, 'info');
      addResult(`Template ID: ${config.templateId}`, 'info');

      // Test 1: Simple parameters
      addResult('Testing with simple parameters...', 'info');
      
      const simpleParams = {
        to_email: testEmail,
        to_name: 'Test User',
        from_name: 'Eddys Members',
        subject: 'Eddys Members Test Email',
        message: 'This is a test email to verify EmailJS configuration.'
      };

      try {
        const result1 = await emailjs.send(config.serviceId, config.templateId, simpleParams);
        addResult('✅ Simple test successful!', 'success');
        addResult(`Response: ${result1.text}`, 'success');
      } catch (error) {
        addResult(`❌ Simple test failed: ${error.text || error.message}`, 'error');
        addResult(`Error status: ${error.status}`, 'error');
      }

      // Test 2: Alternative parameter names
      addResult('Testing with alternative parameter names...', 'info');
      
      const alternativeParams = {
        user_email: testEmail,      // Common alternative
        email: testEmail,           // Another common name
        to: testEmail,              // Simple "to"
        recipient: testEmail,       // Another variant
        user_name: 'Test User',
        name: 'Test User',
        from_name: 'Eddys Members',
        message: 'Testing alternative parameter names for EmailJS template.'
      };

      try {
        const result2 = await emailjs.send(config.serviceId, config.templateId, alternativeParams);
        addResult('✅ Alternative parameters test successful!', 'success');
        addResult(`Response: ${result2.text}`, 'success');
      } catch (error) {
        addResult(`❌ Alternative parameters test failed: ${error.text || error.message}`, 'error');
        addResult(`Error status: ${error.status}`, 'error');
      }

      // Test 3: Booking-like parameters (matching your template)
      addResult('Testing with your template parameters...', 'info');
      
      const bookingParams = {
        // Customer Information
        customerName: 'Test Customer',
        customerEmail: testEmail,
        customerPhone: '+234 XXX XXX XXXX',
        
        // Booking Information
        bookingReference: 'VIP-TEST123',
        partySize: '2',
        bookingDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        bookingTime: '7:00 PM',
        bookingDuration: '4',
        
        // Table Information
        tableNumber: 'VIP-001',
        tableType: 'VIP Table',
        tableCapacity: '2',
        tableLocation: 'Prime Location',
        tableFeatures: 'Premium seating with excellent view',
        
        // Venue Information
        venueName: 'Test Venue',
        venueDescription: 'Experience luxury dining and entertainment in Lagos\' most exclusive venue.',
        venueAddress: 'Lagos, Nigeria',
        venuePhone: '+234 XXX XXX XXXX',
        venueDressCode: 'Smart Casual',
        venueParking: 'Valet parking available',
        venueCuisine: 'International cuisine',
        venueHours: '6:00 PM - 2:00 AM',
        
        // Special Information
        specialRequests: 'None specified',
        
        // Action URLs
        viewBookingUrl: window.location.origin + '/profile',
        modifyBookingUrl: window.location.origin + '/profile',
        cancelBookingUrl: window.location.origin + '/profile',
        websiteUrl: window.location.origin,
        supportUrl: 'mailto:info@oneeddy.com',
        unsubscribeUrl: window.location.origin + '/settings'
      };

      try {
        const result3 = await emailjs.send(config.serviceId, config.templateId, bookingParams);
        addResult('✅ Booking test successful!', 'success');
        addResult(`Response: ${result3.text}`, 'success');
      } catch (error) {
        addResult(`❌ Booking test failed: ${error.text || error.message}`, 'error');
        addResult(`Error status: ${error.status}`, 'error');
      }

      toast({ 
        title: "Email tests completed", 
        description: "Check the results below and your email inbox"
      });

    } catch (error) {
      addResult(`❌ Unexpected error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-brand-burgundy">EmailJS Debug Test</CardTitle>
          <p className="text-gray-600">Test your EmailJS configuration to fix booking confirmation emails</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="Enter your email to test"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={testEmailJS}
              disabled={isLoading}
              className="bg-brand-burgundy hover:bg-brand-burgundy/90"
            >
              {isLoading ? 'Testing...' : 'Test EmailJS'}
            </Button>
          </div>

          {/* Configuration Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Current Configuration:</h3>
            <div className="text-sm space-y-1">
              <div>Service ID: <code className="bg-white px-1 rounded">{config.serviceId || '❌ Not set'}</code></div>
              <div>Template ID: <code className="bg-white px-1 rounded">{config.templateId || '❌ Not set'}</code></div>
              <div>Public Key: <code className="bg-white px-1 rounded">{config.publicKey ? '✅ Set' : '❌ Not set'}</code></div>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
              <h3 className="font-medium mb-2">Test Results:</h3>
              <div className="space-y-1 text-sm font-mono">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded ${
                      result.type === 'success' ? 'bg-green-50 text-green-800' :
                      result.type === 'error' ? 'bg-red-50 text-red-800' :
                      'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-gray-500">[{result.timestamp}]</span> {result.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Enter your email address above</li>
              <li>Click "Test EmailJS" to run the tests</li>
              <li>Check the results below for any errors</li>
              <li>Check your email inbox for test messages</li>
              <li>If tests fail, check your EmailJS template configuration</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestPage; 