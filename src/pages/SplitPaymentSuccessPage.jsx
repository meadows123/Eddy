import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { sendSplitPaymentVenueOwnerNotification, sendSplitPaymentCompletionEmails } from '@/lib/emailService';
import { generateVenueEntryQR } from '@/lib/qrCodeService';

const SplitPaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [allPaymentsDone, setAllPaymentsDone] = useState(false);

  const paymentIntentId = searchParams.get('payment_intent');
  const paystackReference = searchParams.get('reference');
  const requestId = searchParams.get('request_id');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      console.log('🚀 Starting handlePaymentSuccess with:', { paymentIntentId, paystackReference, requestId, bookingId });
      setLoading(true);

      // For Paystack: require reference and request_id
      // For Stripe: require payment_intent and request_id
      if (!requestId || (!paymentIntentId && !paystackReference)) {
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
          .from('bookings')
          .select(`
            *,
            venues (
              name,
              address,
              city,
              contact_email,
              contact_phone,
              price_range
            ),
            venue_tables (
              table_number,
              table_type
            )
          `)
          .eq('id', requestData.booking_id)
          .single();
        
        if (bookingError) {
          console.error('❌ Error fetching booking data with joins:', bookingError);
          // Try to fetch booking data without joins as fallback
          const { data: simpleBooking, error: simpleError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', requestData.booking_id)
            .single();
          
          if (simpleError) {
            console.error('❌ Error fetching simple booking data:', simpleError);
          } else {
            bookingData = simpleBooking;
            console.log('✅ Fallback booking data fetched:', simpleBooking);
            
            // Try to fetch venue data separately
            if (simpleBooking?.venue_id) {
              const { data: venueData } = await supabase
                .from('venues')
                .select('name, address, city, contact_email, contact_phone, price_range')
                .eq('id', simpleBooking.venue_id)
                .single();
              
              if (venueData) {
                bookingData.venues = venueData;
                console.log('✅ Venue data fetched separately:', venueData);
              }
            }
          }
        } else {
          bookingData = booking;
        }
        
        console.log('📋 Booking data fetch result:', { 
          bookingData, 
          bookingError,
          hasVenue: !!bookingData?.venues,
          hasTable: !!bookingData?.venue_tables,
          booking_date: bookingData?.booking_date,
          start_time: bookingData?.start_time,
          end_time: bookingData?.end_time,
          venue_id: bookingData?.venue_id,
          user_id: bookingData?.user_id,
          number_of_guests: bookingData?.number_of_guests,
          number_of_guests_type: typeof bookingData?.number_of_guests,
          guest_count: bookingData?.guest_count,
          allBookingFields: bookingData ? Object.keys(bookingData) : 'no booking data',
          fullBookingData: JSON.stringify(bookingData, null, 2)
        });
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
      let requesterProfile = null; // Store requester profile separately
      if (requestData?.requester_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', requestData.requester_id) // Use requester_id instead of bookingData.user_id
          .single();
        
        if (!profileError && profileData) {
          userProfile = profileData;
          requesterProfile = profileData; // Store for later use
          console.log('✅ Requester profile fetched:', {
            email: requesterProfile.email,
            name: `${requesterProfile.first_name} ${requesterProfile.last_name}`
          });
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

      // Send email notification to the recipient who just paid (ALWAYS send individual confirmation)
      console.log('📧 STARTING INDIVIDUAL CONFIRMATION EMAIL PROCESS');
      try {
        console.log('📧 About to send email notification to recipient:', {
          hasRequestData: !!requestData,
          hasBookings: !!bookingData,
          recipientId: requestData?.recipient_id,
          requestData: requestData,
          bookingData: bookingData
        });

        if (requestData && bookingData) {
          console.log('📧 Processing individual confirmation email for recipient:', requestData.recipient_id);
          
          // Skip individual email if recipient hasn't logged in yet (recipient_id is null)
          // The recipient will receive an invite email instead from CheckoutPage
          if (!requestData.recipient_id) {
            console.log('📧 Skipping individual confirmation email - recipient not yet registered (will receive invite email)');
          } else {
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

            // Fetch all split payment requests to calculate the total amount
            const { data: allSplitRequests, error: splitRequestsError } = await supabase
              .from('split_payment_requests')
              .select('amount')
              .eq('booking_id', bookingData.id);

            // Calculate total amount from all split payments
            const calculatedTotalAmount = allSplitRequests?.reduce((sum, req) => sum + (Number(req.amount) || 0), 0) || 0;
            
            console.log('💰 Split payment amounts:', {
              individualPayment: requestData.amount,
              allRequests: allSplitRequests,
              calculatedTotal: calculatedTotalAmount,
              bookingTotal: bookingData.total_amount
            });

            // Debug: Log the email data being sent (NO QR CODE for split payment confirmation)
            const emailData = {
              // Recipient info
              email: recipientData.email,
              customerName: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() || 'Guest',
              
              // Booking details
              bookingId: bookingData.id,
              bookingDate: bookingData.booking_date || bookingData.bookingDate,
              bookingTime: bookingData.start_time || bookingData.booking_time,
              guestCount: bookingData.number_of_guests || bookingData.guest_count,
              // Total amount should be the sum of all split payments, not the booking total
              totalAmount: calculatedTotalAmount || bookingData.total_amount || bookingData.totalAmount,
              // Individual payment amount for this user
              paymentAmount: Number(requestData.amount) || 0,
              
              // Table details
              tableName: bookingData.table?.table_type,
              tableNumber: bookingData.table?.table_number,
              
              // Venue details
              venueName: bookingData.venues?.name,
              venueAddress: bookingData.venues?.address,
              venuePhone: bookingData.venues?.contact_phone,
              
              // NO QR CODE - removed per user request
              // QR codes are only sent when all payments are complete
              
              // Dashboard URL
              dashboardUrl: `${window.location.origin}/profile`
            };
            
            console.log('📧 Individual split payment email data being sent (NO QR CODE):', emailData);
            console.log('📱 Verification: QR Code fields in email data:', {
              hasQrCodeImage: !!emailData.qrCodeImage,
              hasQrCodeUrl: !!emailData.qrCodeUrl,
              qrCodeImage: emailData.qrCodeImage,
              qrCodeUrl: emailData.qrCodeUrl
            });

            console.log('📧 SENDING INDIVIDUAL CONFIRMATION EMAIL NOW:', {
              to: recipientData.email,
              template: 'split-payment-confirmation',
              subject: `Split Payment Confirmed - ${bookingData.venues?.name || 'Your Venue'}`
            });

            // Send confirmation email via Edge Function
            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: recipientData.email,
                subject: `Split Payment Confirmed - ${bookingData.venues?.name || 'Your Venue'}`,
                template: 'split-payment-confirmation',
                data: emailData
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
            } else {
              console.error('❌ No recipient data found for ID:', requestData.recipient_id);
            }
          }
        } else {
          console.error('❌ Missing request data or booking data for email sending');
        }
      } catch (emailError) {
        console.error('❌ Error sending split payment recipient email:', emailError);
        console.error('❌ Email error details:', {
          message: emailError.message,
          stack: emailError.stack,
          requestData: requestData,
          bookingData: bookingData
        });
        // Don't fail the process if email fails
      }

      // Check if all payments are complete and send completion emails
      await checkAllPaymentsComplete(requestData.booking_id);

      // IMPORTANT: Log the exact value being used for number_of_guests
      console.log('🔍 CRITICAL DEBUG: number_of_guests value:', {
        raw_value: bookingData?.number_of_guests,
        type: typeof bookingData?.number_of_guests,
        all_keys_in_bookingData: Object.keys(bookingData || {}),
        entire_bookingData: bookingData
      });

      // Set payment details with booking data
      setPaymentDetails({
        id: requestId,
        amount: requestData.amount,
        status: 'paid',
        paymentIntentId,
        booking_date: bookingData?.booking_date || new Date().toISOString().split('T')[0],
        booking_time: bookingData?.start_time || bookingData?.booking_time || '19:00:00',
        venue_name: bookingData?.venues?.name,
        venue_price_range: bookingData?.venues?.price_range,
        table_name: bookingData?.venue_tables?.[0]?.table_type,
        table_number: bookingData?.venue_tables?.[0]?.table_number,
        number_of_guests: bookingData?.number_of_guests,
        requester_profile: userProfile // Add this line
      });

      // Add debug logging
      console.log('🔍 Payment details being set:', {
        original_booking_date: bookingData?.booking_date,
        final_booking_date: bookingData?.booking_date || new Date().toISOString().split('T')[0],
        original_start_time: bookingData?.start_time,
        original_booking_time: bookingData?.booking_time,
        final_booking_time: bookingData?.start_time || bookingData?.booking_time || '19:00:00',
        venue_name: bookingData?.venues?.name,
        number_of_guests_from_booking: bookingData?.number_of_guests,
        all_booking_fields: bookingData ? Object.keys(bookingData) : 'no data'
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
      console.log('🔍 Checking if all payments are complete for booking:', bookingId);

      const { data: requests, error: requestsError } = await supabase
        .from('split_payment_requests')
        .select('*')
        .eq('booking_id', bookingId);

      if (requestsError) {
        console.error('❌ Error fetching split payment requests:', requestsError);
        return;
      }

      console.log('✅ Found split payment requests:', {
        totalRequests: requests?.length,
        paidRequests: requests?.filter(req => req.status === 'paid').length,
        requests: requests?.map(req => ({
          id: req.id,
          status: req.status,
          amount: req.amount,
          recipient_id: req.recipient_id
        }))
      });
        
      const allPaid = requests?.every(req => req.status === 'paid');
      console.log('📊 Payment status check:', { allPaid, totalRequests: requests?.length });
      
      // Set the state to indicate if all payments are done
      setAllPaymentsDone(allPaid);
      
      // Initialize completionBookingData before the if block so it's available throughout
      let completionBookingData = null;
      
      if (allPaid) {
        console.log('🎉 All payments are complete! Sending completion emails...');
        console.log('🔍 DEBUG: All payments confirmed - venue owner notification will be sent');
        // Update booking status to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        // Get booking and venue data for emails
        console.log('📚 Fetching booking data for completion email...');
        
        // Fetch booking data separately to avoid join issues
        const { data: simpleBooking, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('❌ Error fetching booking data for completion email:', bookingError);
          return;
        }
        
        // Fetch venue, profile, and table data separately
        let venueData = null;
        let profileData = null;
        let tableData = null;
        
        if (simpleBooking?.venue_id) {
          try {
            const { data: venue, error: venueError } = await supabase
              .from('venues')
              .select('*')
              .eq('id', simpleBooking.venue_id)
              .single();
            
            if (venueError) {
              console.error('❌ Error fetching venue:', venueError);
            } else {
              venueData = venue;
              console.log('✅ Venue fetched successfully:', venueData?.id);
            }
          } catch (err) {
            console.error('❌ Exception fetching venue:', err);
          }
        }
        
        if (simpleBooking?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone')
            .eq('id', simpleBooking.user_id)
            .single();
          profileData = profile;
        }

        // Fetch table data if table_id exists
        if (simpleBooking?.table_id) {
          try {
            const { data: table } = await supabase
              .from('tables')
              .select('*')
              .eq('id', simpleBooking.table_id)
              .single();
            tableData = table;
            console.log('✅ Table fetched:', tableData?.table_number);
          } catch (err) {
            console.error('❌ Error fetching table:', err);
          }
        }
        
        // Create booking data object with separately fetched data
        console.log('🔧 About to create completionBookingData with:', {
          hasSimpleBooking: !!simpleBooking,
          hasVenueData: !!venueData,
          hasProfileData: !!profileData
        });
        
        completionBookingData = {
          ...simpleBooking,
          venues: venueData,
          profiles: profileData,
          tables: tableData
        };
        
        console.log('🔧 completionBookingData created:', completionBookingData);
        console.log('✅ Booking data for completion email:', completionBookingData);
        
        // Fetch venue owner data separately (only if we have venue data)
        if (completionBookingData && completionBookingData.venues?.id) {
          // Try multiple approaches to find venue owner
          let venueOwner = null;
          
          // Approach 1: Try venue_id in venue_owners table
          const { data: ownerByVenueId, error: venueIdError } = await supabase
            .from('venue_owners')
            .select('owner_email, owner_name, user_id, venue_name')
            .eq('venue_id', completionBookingData.venues.id)
            .single();
          
          if (ownerByVenueId && !venueIdError) {
            venueOwner = ownerByVenueId;
            console.log('✅ Venue owner found by venue_id:', venueOwner);
          } else {
            console.log('❌ No venue owner found by venue_id:', venueIdError);
            
            // Approach 2: Try owner_id in venues table
            if (completionBookingData.venues.owner_id) {
              const { data: ownerByOwnerId, error: ownerIdError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .eq('user_id', completionBookingData.venues.owner_id)
                  .single();
                
                if (ownerByOwnerId && !ownerIdError) {
                  venueOwner = ownerByOwnerId;
                  console.log('✅ Venue owner found by owner_id:', venueOwner);
                } else {
                  console.log('❌ No venue owner found by owner_id:', ownerIdError);
                }
              }
              
              // Approach 3: Try user_id in venues table
              if (!venueOwner && completionBookingData.venues.user_id) {
                const { data: ownerByUserId, error: userIdError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .eq('user_id', completionBookingData.venues.user_id)
                  .single();
                
                if (ownerByUserId && !userIdError) {
                  venueOwner = ownerByUserId;
                  console.log('✅ Venue owner found by user_id:', venueOwner);
                } else {
                  console.log('❌ No venue owner found by user_id:', userIdError);
                }
              }
            }
            
            if (venueOwner) {
              completionBookingData.venues.venue_owners = venueOwner;
              console.log('✅ Final venue owner data set:', venueOwner);
            } else {
              console.log('❌ No venue owner found with any approach');
              
              // Fallback: Try to find venue owner by venue name
              if (completionBookingData.venues?.name) {
                console.log('🔄 Trying fallback lookup by venue name:', completionBookingData.venues.name);
                const { data: ownersByName, error: nameError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .ilike('venue_name', `%${completionBookingData.venues.name}%`);
                
                if (ownersByName?.length > 0 && !nameError) {
                  completionBookingData.venues.venue_owners = ownersByName[0];
                  console.log('✅ Venue owner found by name (fallback):', ownersByName[0]);
                } else {
                  console.log('❌ No venue owner found by name either:', nameError);
                }
              }
            }
          }
        }

        if (completionBookingData) {
          console.log('📧 Preparing to send completion email to initiator:', {
            to: completionBookingData.profiles?.email,
            subject: `Booking Confirmed! - ${completionBookingData.venues?.name || 'Your Venue'}`,
            template: 'booking-confirmation'
          });

          // Get table information for the initiator
          let tableInfo = { table_name: 'Table not specified', table_number: 'N/A' };
          if (completionBookingData.table_id) {
            const { data: tableData } = await supabase
              .from('venue_tables')
              .select('table_type, table_number')
              .eq('id', completionBookingData.table_id)
              .single();
            if (tableData) {
              tableInfo = { table_name: tableData.table_type, table_number: tableData.table_number };
            }
          }

          // Generate QR code for the booking
          console.log('📱 Generating QR code for split payment booking:', completionBookingData.id);
          const qrCodeImage = await generateVenueEntryQR(completionBookingData);
          console.log('📱 QR code generated successfully:', qrCodeImage ? 'Yes' : 'No');

          // Prepare email data
          const emailData = {
            // Recipient info
            email: completionBookingData.profiles?.email || 'initiator@example.com',
            customerName: `${completionBookingData.profiles?.first_name || ''} ${completionBookingData.profiles?.last_name || ''}`.trim() || 'Guest',
            customerEmail: completionBookingData.profiles?.email || 'Not provided',
            customerPhone: completionBookingData.profiles?.phone || 'N/A',
            
            // Booking details
            bookingId: completionBookingData.id,
            bookingReference: completionBookingData.id, // Template expects bookingReference
            bookingDate: completionBookingData.booking_date || completionBookingData.bookingDate,
            bookingTime: completionBookingData.start_time || completionBookingData.booking_time,
            partySize: completionBookingData.number_of_guests || completionBookingData.guest_count || 1, // Template expects partySize
            guestCount: completionBookingData.number_of_guests || completionBookingData.guest_count,
            totalAmount: completionBookingData.total_amount || completionBookingData.totalAmount,
            initiatorAmount: completionBookingData.total_amount || completionBookingData.totalAmount, // For split-payment-complete template
            requestsCount: requests?.length || 1, // For split-payment-initiation template
            
            // Table details
            tableName: tableInfo.table_name,
            tableNumber: tableInfo.table_number,
            tableType: tableInfo.table_name || 'VIP Table',
            tableCapacity: completionBookingData.number_of_guests || 4,
            tableLocation: 'Prime location',
            tableFeatures: 'Premium features',
            
            // Venue details
            venueName: completionBookingData.venues?.name,
            venueAddress: completionBookingData.venues?.address,
            venuePhone: completionBookingData.venues?.contact_phone,
            
            // Special requests
            specialRequests: completionBookingData.special_requests || 'None specified',
            
            // QR Code for venue entry
            qrCodeImage: qrCodeImage?.externalUrl || qrCodeImage,
            qrCodeUrl: qrCodeImage?.externalUrl || (qrCodeImage?.base64 ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({
              type: 'venue-entry',
              bookingId: completionBookingData.id,
              venueId: completionBookingData.venue_id,
              securityCode: 'GENERATED',
              bookingDate: completionBookingData.booking_date,
              startTime: completionBookingData.start_time,
              tableNumber: completionBookingData.venue_tables?.table_type || completionBookingData.table?.table_number || 'N/A',
              guestCount: completionBookingData.number_of_guests,
              status: 'confirmed',
              timestamp: new Date().toISOString()
            }))}&color=800020&bgcolor=FFFFFF&format=png` : '')
          };

          console.log('📧 Email data being sent:', emailData);
          console.log('📱 QR Code in email data:', {
            hasQrCodeImage: !!(emailData.qrCodeImage),
            qrCodeImageLength: emailData.qrCodeImage?.length || 0,
            qrCodeImageStart: emailData.qrCodeImage?.substring(0, 50) || 'N/A'
          });

          // Note: Individual "Split Payment Confirmed" emails are sent above (line 250)
          // No additional emails needed when all payments are complete for Paystack flow

          // Send split-payment-initiation email to initiator when they make their payment
          // NOTE: This email should NOT include QR code - QR code is only sent when all payments are complete
          // IMPORTANT: Only send this email if the current payer is the initiator (requester)
          // The initiator is identified by requester_id matching recipient_id in the request
          const isInitiator = requestData?.requester_id && requestData?.requester_id === requestData?.recipient_id;
          const initiatorEmail = requesterProfile?.email || requestData?.recipient_email;
          
          console.log('📧 Checking if should send split-payment-initiation to initiator...', {
            isInitiator,
            requesterId: requestData?.requester_id,
            recipientId: requestData?.recipient_id,
            initiatorEmail,
            currentPayerEmail: requestData?.recipient_email
          });
          
          if (isInitiator && initiatorEmail) {
            console.log('📧 Sending split-payment-initiation to initiator:', initiatorEmail);
            try {
              const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
              const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

              // Create emailData without QR code for split-payment-initiation
              // IMPORTANT: Create a new object without QR code fields to ensure they're not included
              const initiationEmailData = {
                email: emailData.email,
                customerName: emailData.customerName,
                customerEmail: emailData.customerEmail,
                customerPhone: emailData.customerPhone,
                bookingId: emailData.bookingId,
                bookingReference: emailData.bookingReference,
                bookingDate: emailData.bookingDate,
                bookingTime: emailData.bookingTime,
                partySize: emailData.partySize,
                guestCount: emailData.guestCount,
                totalAmount: emailData.totalAmount,
                initiatorAmount: emailData.initiatorAmount,
                requestsCount: emailData.requestsCount,
                tableName: emailData.tableName,
                tableNumber: emailData.tableNumber,
                tableType: emailData.tableType,
                tableCapacity: emailData.tableCapacity,
                tableLocation: emailData.tableLocation,
                tableFeatures: emailData.tableFeatures,
                venueName: emailData.venueName,
                venueAddress: emailData.venueAddress,
                venuePhone: emailData.venuePhone,
                specialRequests: emailData.specialRequests,
                dashboardUrl: emailData.dashboardUrl || `${window.location.origin}/profile`
                // Explicitly NOT including qrCodeImage or qrCodeUrl
              };

              // Verify QR codes are NOT included
              console.log('📧 DEBUG: Initiation email data (should NOT have QR codes):', {
                hasQrCodeImage: !!initiationEmailData.qrCodeImage,
                hasQrCodeUrl: !!initiationEmailData.qrCodeUrl,
                dataKeys: Object.keys(initiationEmailData)
              });

              const initiationEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  to: initiatorEmail,
                  subject: `Split Payment Initiated - ${completionBookingData.venues?.name || 'Your Venue'}`,
                  template: 'split-payment-initiation',
                  data: initiationEmailData
                })
              });

              const initiationResponseData = await initiationEmailResponse.json().catch(() => ({}));
              if (!initiationEmailResponse.ok) {
                console.error('❌ Error sending split payment initiation email:', {
                  status: initiationEmailResponse.status,
                  statusText: initiationEmailResponse.statusText,
                  data: initiationResponseData
                });
              } else {
                console.log('✅ Split payment initiation email sent to initiator:', {
                  to: initiatorEmail,
                  response: initiationResponseData
                });
              }
            } catch (initiationEmailError) {
              console.error('❌ Exception sending split payment initiation email:', initiationEmailError);
            }
          } else {
            console.log('⚠️ Skipping split-payment-initiation email - current payer is not the initiator', {
              isInitiator,
              hasInitiatorEmail: !!initiatorEmail
            });
          }

        // Send email to venue owner when all payments are completed
        console.log('📧 Sending venue owner notification...');
        console.log('🔍 DEBUG: This venue owner notification is being sent because ALL payments are complete');
        console.log('🚨 DEBUG: NEW VENUE OWNER EMAIL LOOKUP CODE IS BEING EXECUTED!');
        console.log('🔍 DEBUG: Available venue data:', {
          venueId: completionBookingData.venues?.id,
          venueName: completionBookingData.venues?.name,
          venueContactEmail: completionBookingData.venues?.contact_email,
          fullVenueData: completionBookingData.venues
        });
        
        console.log('🔍 DEBUG: Full venue data structure:', JSON.stringify(completionBookingData.venues, null, 2));
        try {
          // Fetch venue owner email using the same pattern as Paystack (working configuration)
          let venueOwnerEmail = 'info@oneeddy.com'; // Fallback
          
          // Try different possible venue ID fields
          const venueId = completionBookingData.venues?.id || completionBookingData.venues?.venue_id || completionBookingData.venue_id;
          
          console.log('🔍 Looking up venue with ID:', venueId);
          try {
            // First try to get venue contact email (same as Paystack)
            const { data: venueDataForEmail, error: venueError } = await supabase
              .from('venues')
              .select('contact_email, owner_id')
              .eq('id', venueId)
              .single();
            
            console.log('📍 Venue fetch result:', { venueDataForEmail, venueError });
            
            if (venueError) {
              console.warn('⚠️ Error fetching venue:', venueError);
            } else if (venueDataForEmail?.contact_email) {
              venueOwnerEmail = venueDataForEmail.contact_email;
              console.log('✅ Found venue contact email:', venueOwnerEmail);
            } else if (venueDataForEmail?.owner_id) {
              // If no contact email, try to get from venue_owners table (same as Paystack)
              console.log('📧 No contact email, fetching from venue_owners with owner_id:', venueDataForEmail.owner_id);
              const { data: ownerDataList, error: ownerError } = await supabase
                .from('venue_owners')
                .select('owner_email, user_id')
                .eq('user_id', venueDataForEmail.owner_id)
                .limit(1);
              
              console.log('📍 Venue owner fetch result:', { ownerDataList, ownerError });
              
              if (ownerError) {
                console.warn('⚠️ Error fetching venue owner:', ownerError);
              } else if (ownerDataList && ownerDataList.length > 0) {
                // Check if owner_email is available
                if (ownerDataList[0]?.owner_email) {
                  venueOwnerEmail = ownerDataList[0].owner_email;
                  console.log('✅ Found venue owner email from venue_owners table:', venueOwnerEmail);
                } else if (ownerDataList[0]?.user_id) {
                  // If owner_email is null, fetch from profiles table
                  console.log('📧 owner_email is null, fetching from profiles table with user_id:', ownerDataList[0].user_id);
                  const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', ownerDataList[0].user_id)
                    .single();
                  
                  if (profileError) {
                    console.warn('⚠️ Error fetching profile email:', profileError);
                  } else if (profileData?.email) {
                    venueOwnerEmail = profileData.email;
                    console.log('✅ Found venue owner email from profiles table:', venueOwnerEmail);
                  } else {
                    console.warn('⚠️ Profile found but no email');
                  }
                }
              }
            } else {
              console.warn('⚠️ Venue found but no contact_email or owner_id');
            }
          } catch (venueError) {
            console.error('❌ Exception fetching venue email:', venueError);
          }
          
          console.log('📧 Final venue owner email for split payment:', venueOwnerEmail);
          
          // Skip sending if email is still placeholder
          if (!venueOwnerEmail || venueOwnerEmail === 'info@oneeddy.com') {
            console.warn('⚠️ Skipping venue owner email - no valid email found (placeholder or empty)');
            // Don't send email, but continue with rest of the function
          } else {
            // Prepare email data for venue owner notification
            // Format dates and times properly
            const bookingDateFormatted = completionBookingData.booking_date
              ? new Date(completionBookingData.booking_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : 'N/A';
            
            const startTimeFormatted = completionBookingData.start_time
              ? new Date(`2000-01-01T${completionBookingData.start_time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : 'N/A';
            
            const endTimeFormatted = completionBookingData.end_time
              ? new Date(`2000-01-01T${completionBookingData.end_time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : '23:00';

            // Calculate the full total amount from all split payment requests
            const fullTotalAmount = requests?.reduce((sum, req) => sum + (Number(req.amount) || 0), 0) || completionBookingData.total_amount;
            
            console.log('💰 Calculating total amount for venue owner email:', {
              bookingTotalAmount: completionBookingData.total_amount,
              calculatedFullAmount: fullTotalAmount,
              numberOfRequests: requests?.length,
              requestAmounts: requests?.map(r => r.amount)
            });

            // Prepare email data with all required fields for the Edge Function (same as Paystack)
            const emailData = {
              to: venueOwnerEmail, // Still include in 'to' field as fallback
              subject: `New Booking - ${completionBookingData.venues?.name || 'Venue'}`,
              template: 'venue-owner-booking-notification',
              data: {
                ownerEmail: venueOwnerEmail !== 'info@oneeddy.com' ? venueOwnerEmail : '', // Empty string if placeholder, so Edge Function will look it up
                venueId: completionBookingData.venue_id, // Required for Edge Function to look up venue owner if ownerEmail is missing
                venueName: completionBookingData.venues?.name || 'Venue',
                customerName: `${completionBookingData.profiles?.first_name || ''} ${completionBookingData.profiles?.last_name || ''}`.trim() || 'Guest',
                customerEmail: completionBookingData.profiles?.email || 'guest@example.com',
                customerPhone: completionBookingData.profiles?.phone || 'N/A',
                bookingDate: bookingDateFormatted,
                bookingTime: startTimeFormatted,
                endTime: endTimeFormatted,
                guestCount: completionBookingData.number_of_guests,
                partySize: completionBookingData.number_of_guests,
                tableInfo: `Table ${completionBookingData.tables?.table_number || completionBookingData.venue_tables?.[0]?.table_number || 'N/A'}`,
                totalAmount: fullTotalAmount, // Use the calculated full amount from all split payments
                bookingId: completionBookingData.id,
                paymentType: 'split',
                paymentStatus: 'All payments completed',
                numberOfPayments: requests.length
              }
            };
            
            console.log('📧 DEBUG: Email data being sent to Edge Function:', {
              to: emailData.to,
              subject: emailData.subject,
              template: emailData.template,
              dataKeys: Object.keys(emailData.data),
              venueOwnerEmail,
              ownerEmailInData: emailData.data.ownerEmail,
              venueIdInData: emailData.data.venueId,
              bookingDataVenues: completionBookingData.venues
            });
            
            // Send venue owner notification using fetch (matching other email sends)
            console.log('📧 ABOUT TO SEND VENUE OWNER EMAIL TO:', venueOwnerEmail);
            try {
              const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
              const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

              console.log('📧 Using Supabase URL:', SUPABASE_URL);
              console.log('📧 Has API key:', !!SUPABASE_ANON_KEY);

              const venueOwnerEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(emailData)
              });

              console.log('📧 Venue owner email response status:', venueOwnerEmailResponse.status);
              const venueEmailResponseData = await venueOwnerEmailResponse.json().catch(() => ({}));
              if (!venueOwnerEmailResponse.ok) {
                console.error('❌ Error sending venue owner notification:', {
                  status: venueOwnerEmailResponse.status,
                  statusText: venueOwnerEmailResponse.statusText,
                  data: venueEmailResponseData
                });
              } else {
                console.log('✅ Venue owner notification sent successfully:', venueEmailResponseData);
              }
            } catch (venueFetchError) {
              console.error('❌ Exception sending venue owner notification:', venueFetchError);
            }
          } // End of else block for valid email check
        } catch (venueOwnerError) {
          console.error('❌ Error in venue owner notification block:', venueOwnerError);
        }

          // Send confirmation email to the last person who paid (if different from initiator)
          const lastPayment = requests.find(req => req.id === requestId);
          if (lastPayment && lastPayment.recipient_id !== completionBookingData.profiles?.id) {
            console.log('📧 [FRONTEND] Sending confirmation email to last payer...');
            console.log('🔍 Last payment details:', {
              lastPayment,
              requestId,
              recipientId: lastPayment.recipient_id,
              initiatorId: completionBookingData.profiles?.id
            });
            console.log('🔍 Booking data for last payer:', {
              bookingId: completionBookingData.id,
              venueName: completionBookingData.venues?.name,
              tableId: completionBookingData.table_id,
              bookingDate: completionBookingData.booking_date,
              startTime: completionBookingData.start_time,
              guestCount: completionBookingData.number_of_guests,
              totalAmount: completionBookingData.total_amount
            });
            
            // Get the last payer's profile
            const { data: lastPayerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', lastPayment.recipient_id)
              .single();

            if (lastPayerProfile) {
              // Get table information for the last payer
              let tableInfo = { table_name: 'Table not specified', table_number: 'N/A' };
              if (completionBookingData.table_id) {
                const { data: tableData } = await supabase
                  .from('venue_tables')
                  .select('table_type, table_number')
                  .eq('id', completionBookingData.table_id)
                  .single();
                if (tableData) {
                  tableInfo = { table_name: tableData.table_type, table_number: tableData.table_number };
                }
              }

              // Generate QR code for the last payer (same booking, same QR code)
              console.log('📱 Generating QR code for last payer split payment booking:', completionBookingData.id);
              const lastPayerQrCodeImage = await generateVenueEntryQR(completionBookingData);
              console.log('📱 Last payer QR code generated successfully:', lastPayerQrCodeImage ? 'Yes' : 'No');

              // Prepare comprehensive email data for last payer
              const lastPayerEmailData = {
                // Recipient info
                email: lastPayerProfile.email,
                customerName: `${lastPayerProfile.first_name || ''} ${lastPayerProfile.last_name || ''}`.trim() || 'Guest',
                customerEmail: lastPayerProfile.email || 'Not provided',
                customerPhone: lastPayerProfile.phone || 'N/A',
                
                // Booking details
                bookingId: completionBookingData.id,
                bookingReference: completionBookingData.id, // Template expects bookingReference
                bookingDate: completionBookingData.booking_date || completionBookingData.bookingDate,
                bookingTime: completionBookingData.start_time || completionBookingData.booking_time,
                partySize: completionBookingData.number_of_guests || completionBookingData.guest_count || 1, // Template expects partySize
                guestCount: completionBookingData.number_of_guests || completionBookingData.guest_count,
                totalAmount: completionBookingData.total_amount || completionBookingData.totalAmount,
                initiatorAmount: lastPayment.amount || 0, // For split-payment-complete template
                
                // Table details
                tableName: tableInfo.table_name,
                tableNumber: tableInfo.table_number,
                tableType: tableInfo.table_name || 'VIP Table',
                tableCapacity: completionBookingData.number_of_guests || 4,
                tableLocation: 'Prime location',
                tableFeatures: 'Premium features',
                
                // Venue details
                venueName: completionBookingData.venues?.name,
                venueAddress: completionBookingData.venues?.address,
                venuePhone: completionBookingData.venues?.contact_phone,
                
                // Special requests
                specialRequests: completionBookingData.special_requests || 'None specified',
                
                // QR Code for venue entry
                qrCodeImage: lastPayerQrCodeImage?.externalUrl || lastPayerQrCodeImage,
                qrCodeUrl: lastPayerQrCodeImage?.externalUrl || (lastPayerQrCodeImage?.base64 ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({
                  type: 'venue-entry',
                  bookingId: completionBookingData.id,
                  venueId: completionBookingData.venue_id,
                  securityCode: 'GENERATED',
                  bookingDate: completionBookingData.booking_date,
                  startTime: completionBookingData.start_time,
                  tableNumber: completionBookingData.venue_tables?.table_type || completionBookingData.table?.table_number || 'N/A',
                  guestCount: completionBookingData.number_of_guests,
                  status: 'confirmed',
                  timestamp: new Date().toISOString()
                }))}&color=800020&bgcolor=FFFFFF&format=png` : '')
              };

              console.log('📧 Last payer email data:', {
                to: lastPayerProfile.email,
                template: 'split-payment-complete',
                data: lastPayerEmailData
              });
              console.log('📱 QR Code in last payer email data:', {
                hasQrCodeImage: !!(lastPayerEmailData.qrCodeImage),
                qrCodeImageLength: lastPayerEmailData.qrCodeImage?.length || 0,
                qrCodeImageStart: lastPayerEmailData.qrCodeImage?.substring(0, 50) || 'N/A'
              });

              // Send "All Payments Confirmed!" email to last payer
              try {
                const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
                const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

                // Calculate total amount from all split payments
                const fullTotalAmount = requests?.reduce((sum, req) => sum + (Number(req.amount) || 0), 0) || completionBookingData.total_amount;
                
                // Update email data with calculated total and remove QR code
                const lastPayerCompletionEmailData = {
                  ...lastPayerEmailData,
                  totalAmount: fullTotalAmount,
                  paymentAmount: Number(lastPayment.amount) || 0,
                  // Remove QR code fields - user requested no QR codes in split payment confirmation emails
                  qrCodeImage: undefined,
                  qrCodeUrl: undefined
                };

                const lastPayerEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    to: lastPayerProfile.email,
                    subject: `All Payments Confirmed! - ${completionBookingData.venues?.name || 'Your Venue'}`,
                    template: 'split-payment-confirmation',
                    data: lastPayerCompletionEmailData
                  })
                });

                if (!lastPayerEmailResponse.ok) {
                  const errorData = await lastPayerEmailResponse.text();
                  console.error('❌ Error sending last payer confirmation email:', lastPayerEmailResponse.status, errorData);
                } else {
                  console.log('✅ Last payer confirmation email sent successfully');
                }
              } catch (lastPayerEmailError) {
                console.error('❌ Exception sending last payer confirmation email:', lastPayerEmailError);
              }

              // Send "All Payments Confirmed!" email to initiator
              console.log('📧 Sending "All Payments Confirmed!" email to initiator...');
              try {
                const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
                const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

                // Calculate total amount from all split payments
                const fullTotalAmount = requests?.reduce((sum, req) => sum + (Number(req.amount) || 0), 0) || completionBookingData.total_amount;
                
                // Find the initiator - the person who created the split payment (first requester_id)
                const initiatorRequest = requests?.[0]; // The first request has the initiator's requester_id
                const initiatorId = initiatorRequest?.requester_id;
                
                // Find initiator's payment amount (where requester_id === recipient_id, or first request)
                const initiatorPayment = requests?.find(req => req.requester_id === req.recipient_id) || requests?.[0];
                const initiatorPaymentAmount = Number(initiatorPayment?.amount) || 0;

                // Fetch initiator's profile
                let initiatorProfile = null;
                if (initiatorId) {
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', initiatorId)
                    .single();
                  
                  if (profileError) {
                    console.error('❌ Error fetching initiator profile:', profileError);
                  } else {
                    initiatorProfile = profile;
                    console.log('✅ Initiator profile fetched:', { id: initiatorId, email: profile.email });
                  }
                }

                // Use initiator's profile if found, otherwise fallback to booking profile
                const initiatorEmail = initiatorProfile?.email || completionBookingData.profiles?.email;
                const initiatorName = initiatorProfile 
                  ? `${initiatorProfile.first_name || ''} ${initiatorProfile.last_name || ''}`.trim() || 'Guest'
                  : `${completionBookingData.profiles?.first_name || ''} ${completionBookingData.profiles?.last_name || ''}`.trim() || 'Guest';
                const initiatorPhone = initiatorProfile?.phone || completionBookingData.profiles?.phone || 'N/A';

                if (!initiatorEmail) {
                  console.error('❌ No initiator email found, skipping email');
                } else {
                  const initiatorEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                      to: initiatorEmail,
                      subject: `All Payments Confirmed! - ${completionBookingData.venues?.name || 'Your Venue'}`,
                      template: 'split-payment-confirmation',
                      data: {
                        email: initiatorEmail,
                        customerName: initiatorName,
                        customerEmail: initiatorEmail,
                        customerPhone: initiatorPhone,
                        bookingId: completionBookingData.id,
                        bookingDate: completionBookingData.booking_date,
                        bookingTime: completionBookingData.start_time,
                        guestCount: completionBookingData.number_of_guests,
                        totalAmount: fullTotalAmount,
                        paymentAmount: initiatorPaymentAmount,
                        venueName: completionBookingData.venues?.name,
                        venueAddress: completionBookingData.venues?.address,
                        venuePhone: completionBookingData.venues?.contact_phone,
                        // NO QR CODE - removed per user request
                        dashboardUrl: `${window.location.origin}/profile`
                      }
                    })
                  });

                  const confirmResponseData = await initiatorEmailResponse.json().catch(() => ({}));
                  if (!initiatorEmailResponse.ok) {
                    console.error(`❌ Error sending confirmation to initiator:`, {
                      status: initiatorEmailResponse.status,
                      statusText: initiatorEmailResponse.statusText,
                      data: confirmResponseData
                    });
                  } else {
                    console.log(`✅ Confirmation email sent to initiator: ${initiatorEmail}`, confirmResponseData);
                  }
                }
              } catch (error) {
                console.error(`❌ Exception sending confirmation to initiator:`, error);
              }
              if (requests && requests.length > 0) {
                // Get initiator ID to exclude from loop
                const initiatorRequestId = requests?.[0]?.requester_id;
                
                for (const request of requests) {
                  // Skip if this is the last payer (already sent above), if recipient_id is null, or if this is the initiator
                  if (request.id === requestId || !request.recipient_id || request.recipient_id === initiatorRequestId) {
                    continue;
                  }

                  try {
                    // Fetch recipient profile
                    const { data: recipientProfile } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', request.recipient_id)
                      .single();

                    if (recipientProfile) {
                      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
                      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

                      const recipientEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                          to: recipientProfile.email,
                          subject: `All Payments Confirmed! - ${completionBookingData.venues?.name || 'Your Venue'}`,
                          template: 'split-payment-confirmation',
                          data: {
                            email: recipientProfile.email,
                            customerName: `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim() || 'Guest',
                            customerEmail: recipientProfile.email,
                            customerPhone: recipientProfile.phone || 'N/A',
                            bookingId: completionBookingData.id,
                            bookingDate: completionBookingData.booking_date,
                            bookingTime: completionBookingData.start_time,
                            guestCount: completionBookingData.number_of_guests,
                            totalAmount: completionBookingData.total_amount,
                            venueName: completionBookingData.venues?.name,
                            venueAddress: completionBookingData.venues?.address,
                            paymentAmount: request.amount
                          }
                        })
                      });

                      const recipientConfirmResponseData = await recipientEmailResponse.json().catch(() => ({}));
                      if (!recipientEmailResponse.ok) {
                        console.error(`❌ Error sending confirmation to ${recipientProfile.email}:`, {
                          status: recipientEmailResponse.status,
                          statusText: recipientEmailResponse.statusText,
                          data: recipientConfirmResponseData
                        });
                      } else {
                        console.log(`✅ Confirmation email sent to ${recipientProfile.email}`, recipientConfirmResponseData);
                      }
                    }
                  } catch (error) {
                    console.error(`❌ Exception sending confirmation to recipient:`, error);
                  }
                }
              }
            }
          }

          console.log('✅ Split payment completion emails sent successfully');
        }
          
        // Send confirmation notifications to all parties
        toast({
          title: "Booking Confirmed!",
          description: "All split payments have been received. Your booking is now confirmed.",
          className: "bg-green-500 text-white"
        });
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
              {allPaymentsDone ? 'Booking Confirmed!' : 'Your Payment Confirmed!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">{allPaymentsDone ? 'All Payments Complete' : 'Your Payment Completed'}</span>
                </div>
                <p className="text-sm text-green-700">
                  {allPaymentsDone 
                    ? `All split payments have been received. Your booking is now confirmed!`
                    : `Your payment of ₦${paymentDetails?.amount?.toLocaleString()} has been processed successfully. We're waiting for other participants to complete their payments.`
                  }
                </p>
              </div>

              <div className="bg-brand-cream/30 border border-brand-gold/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{paymentDetails?.venue_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Venue details
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Booking Date</span>
                    <p className="font-medium">
                      {(() => {
                        try {
                          if (paymentDetails?.booking_date) {
                            const date = new Date(paymentDetails.booking_date);
                            // Check if date is valid
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            }
                          }
                          return 'Date not available';
                        } catch (error) {
                          console.error('Error formatting date:', error);
                          return 'Date not available';
                        }
                      })()}
                    </p>
                  </div>
                  {paymentDetails?.booking_time && (
                    <div>
                      <span className="text-muted-foreground">Booking Time</span>
                      <p className="font-medium">
                        {paymentDetails.booking_time.slice(0, 5)} {/* Format "19:00:00" to "19:00" */}
                      </p>
                    </div>
                  )}
                  {paymentDetails?.venue_name && (
                    <div>
                      <span className="text-muted-foreground">Venue</span>
                      <p className="font-medium">
                        {paymentDetails.venue_name}
                      </p>
                    </div>
                  )}
                  {paymentDetails?.table_name && (
                    <div>
                      <span className="text-muted-foreground">Table</span>
                      <p className="font-medium">
                        {paymentDetails.table_name}
                        {paymentDetails.table_number && ` (${paymentDetails.table_number})`}
                      </p>
                    </div>
                  )}
                  {paymentDetails?.number_of_guests && (
                    <div>
                      <span className="text-muted-foreground">Party Size</span>
                      <p className="font-medium">
                        {paymentDetails.number_of_guests} guests
                      </p>
                    </div>
                  )}
                  {paymentDetails?.venue_price_range && (
                    <div>
                      <span className="text-muted-foreground">Price Range</span>
                      <p className="font-medium">
                        {paymentDetails.venue_price_range}
                      </p>
                    </div>
                  )}
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