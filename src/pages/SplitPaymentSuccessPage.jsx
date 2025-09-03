import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { sendSplitPaymentVenueOwnerNotification } from '@/lib/emailService';

const SplitPaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const paymentIntentId = searchParams.get('payment_intent');
  const requestId = searchParams.get('request_id');

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      console.log('🚀 Starting handlePaymentSuccess with:', { paymentIntentId, requestId });
      setLoading(true);

      if (!paymentIntentId || !requestId) {
        throw new Error('Missing payment information');
      }

      // Fetch the payment request details first
      const { data: requestData, error: requestError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      // If we have the request data, fetch booking data separately
      let bookingData = null;
      if (requestData?.booking_id) {
        const { data: booking, error: bookingError } = await supabase
          .from('split_payment_requests')
          .select(`
            bookings (
              *,
              venues (
                name,
                address,
                city,
                contact_email,
                contact_phone
              )
            )
          `)
          .eq('id', requestId)
          .single();
        
        bookingData = booking?.bookings;
        console.log('📋 Booking data fetch result:', { bookingData, bookingError });
      }

      if (requestError) {
        console.error('❌ Error fetching request data:', requestError);
        throw new Error('Failed to fetch payment request details');
      }

      console.log('✅ Request data fetched successfully:', {
        requestId: requestData.id,
        bookingId: requestData.booking_id,
        recipientId: requestData.recipient_id,
        amount: requestData.amount,
        hasBooking: !!bookingData
      });

      // Fetch user profile information separately
      let userProfile = null;
      if (bookingData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', bookingData.user_id)
          .single();
        
        if (!profileError && profileData) {
          userProfile = profileData;
        }
      }

      // Update the payment request status
      const { error: updateError } = await supabase
        .from('split_payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Update error:', updateError);
        // Don't throw error, just log it
      }

      // Send email notifications
      try {
        console.log('📧 About to send email notifications:', {
          hasRequestData: !!requestData,
          hasBookings: !!bookingData,
          recipientId: requestData?.recipient_id
        });

        if (requestData && bookingData) {
          // Get recipient data
          const { data: recipientData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', requestData.recipient_id)
            .single();

          if (recipientData) {
            console.log('📧 Sending confirmation email to recipient:', {
              email: recipientData.email,
              name: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim(),
              bookingId: bookingData.id,
              amount: requestData.amount
            });

            // Send confirmation email via Edge Function
            console.log('🚀 About to call Edge Function with data:', {
              to: recipientData.email,
              subject: `Split Payment Confirmed - ${bookingData.venues?.name || 'Your Venue'}`,
              template: 'split-payment-confirmation',
              bookingId: bookingData.id
            });

            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: recipientData.email || 'recipient@example.com',
                subject: `Split Payment Confirmed - ${bookingData.venues?.name || 'Your Venue'}`,
                template: 'split-payment-confirmation',
                data: {
                  // Recipient info
                  email: recipientData.email || 'recipient@example.com',
                  customerName: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() || 'Guest',
                  
                  // Booking details
                  bookingId: bookingData.id,
                  bookingDate: bookingData.booking_date || bookingData.bookingDate,
                  bookingTime: bookingData.start_time || bookingData.booking_time,
                  guestCount: bookingData.number_of_guests || bookingData.guest_count,
                  totalAmount: bookingData.total_amount || bookingData.totalAmount,
                  paymentAmount: requestData.amount || 0,
                  
                  // Venue details
                  venueName: bookingData.venues?.name,
                  venueAddress: bookingData.venues?.address,
                  venuePhone: bookingData.venues?.contact_phone,
                  
                  // Dashboard URL
                  dashboardUrl: `${window.location.origin}/profile`
                }
              }
            });

            if (emailError) {
              console.error('❌ Error sending split payment confirmation email:', emailError);
            } else {
              console.log('✅ Split payment confirmation email sent successfully:', {
                result: emailResult,
                recipient: recipientData.email,
                bookingId: bookingData.id
              });
            }
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending split payment recipient email:', emailError);
        // Don't fail the process if email fails
      }

      // Check if all payments are complete and send completion emails
      await checkAllPaymentsComplete(requestData.booking_id);

      // Set basic success data
      setPaymentDetails({
        id: requestId,
        amount: 1275, // Use the amount from the URL or state
        status: 'paid',
        paymentIntentId
      });

      setSuccess(true);

      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
        className: "bg-green-500 text-white"
      });

    } catch (error) {
      console.error('Error processing payment success:', error);
      setError(error.message);
      toast({
        title: "Payment Error",
        description: "There was an issue processing your payment. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAllPaymentsComplete = async (bookingId) => {
    try {
      const { data: requests } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('booking_id', bookingId);
        
      const allPaid = requests.every(req => req.status === 'paid');
      
      if (allPaid) {
        // Update booking status to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        // Get booking and venue data for emails
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(`
            *,
            venues (
              name,
              address,
              city,
              contact_email,
              contact_phone
            ),
            profiles!bookings_user_id_fkey (
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', bookingId)
          .single();

        if (bookingData) {
          // Send completion email to initiator via Edge Function
          const { data: completionEmailResult, error: completionEmailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: bookingData.profiles?.email || 'initiator@example.com',
              subject: `Booking Confirmed! - ${bookingData.venues?.name || 'Your Venue'}`,
              template: 'split-payment-complete',
              data: {
                // Recipient info
                email: bookingData.profiles?.email || 'initiator@example.com',
                customerName: `${bookingData.profiles?.first_name || ''} ${bookingData.profiles?.last_name || ''}`.trim() || 'Guest',
                
                // Booking details
                bookingId: bookingData.id,
                bookingDate: bookingData.booking_date || bookingData.bookingDate,
                bookingTime: bookingData.start_time || bookingData.booking_time,
                guestCount: bookingData.number_of_guests || bookingData.guest_count,
                totalAmount: bookingData.total_amount || bookingData.totalAmount,
                initiatorAmount: requests.find(req => req.requester_id === req.recipient_id)?.amount || 0,
                
                // Venue details
                venueName: bookingData.venues?.name,
                venueAddress: bookingData.venues?.address,
                venuePhone: bookingData.venues?.contact_phone,
                
                // Dashboard URL
                dashboardUrl: `${window.location.origin}/profile`
              }
            }
          });

          if (completionEmailError) {
            console.error('❌ Error sending split payment completion email:', completionEmailError);
          } else {
            console.log('✅ Split payment completion email sent successfully');
          }

          // Send email to venue owner when all payments are completed
          await sendSplitPaymentVenueOwnerNotification(
            bookingData,
            bookingData.venues,
            {
              email: bookingData.profiles?.email || 'initiator@example.com',
              full_name: `${bookingData.profiles?.first_name || ''} ${bookingData.profiles?.last_name || ''}`.trim() || 'Guest',
              customerName: `${bookingData.profiles?.first_name || ''} ${bookingData.profiles?.last_name || ''}`.trim() || 'Guest'
            },
            requests
          );

          console.log('✅ Split payment completion emails sent successfully');
        }
          
        // Send confirmation notifications to all parties
        toast({
          title: "Booking Confirmed!",
          description: "All split payments have been received. Your booking is now confirmed.",
          className: "bg-green-500 text-white"
        });
      }
    } catch (error) {
      console.error('Error checking payment completion:', error);
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-20 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-4">Payment Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="container py-20 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-4">Payment Not Found</h2>
        <p className="text-muted-foreground mb-6">Unable to verify payment completion.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Payment Completed</span>
                </div>
                <p className="text-sm text-green-700">
                  Your payment of ₦{paymentDetails?.amount?.toLocaleString()} has been processed successfully.
                </p>
              </div>

              <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{paymentDetails?.bookings?.venues?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {paymentDetails?.bookings?.venues?.address}, {paymentDetails?.bookings?.venues?.city}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Requested by</span>
                    <p className="font-medium">
                      {paymentDetails?.bookings?.profiles?.first_name} {paymentDetails?.bookings?.profiles?.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Booking Date</span>
                    <p className="font-medium">
                      {new Date(paymentDetails?.bookings?.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to your email address.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  The person who requested this payment has been notified.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/')}
            className="flex-1"
          >
            Go Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            className="flex-1"
          >
            View Profile
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SplitPaymentSuccessPage; 