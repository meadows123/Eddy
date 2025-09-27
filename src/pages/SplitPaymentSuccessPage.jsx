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
          allBookingFields: bookingData ? Object.keys(bookingData) : 'no booking data'
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
      if (requestData?.requester_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', requestData.requester_id) // Use requester_id instead of bookingData.user_id
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

            // Generate QR code for this individual payment confirmation
            console.log('📱 Generating QR code for individual split payment confirmation:', bookingData.id);
            const individualQrCodeImage = await generateVenueEntryQR(bookingData);
            console.log('📱 Individual QR code generated successfully:', individualQrCodeImage ? 'Yes' : 'No');

            // Debug: Log the email data being sent
            const emailData = {
              // Recipient info
              email: recipientData.email,
              customerName: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() || 'Guest',
              
              // Booking details
              bookingId: bookingData.id,
              bookingDate: bookingData.booking_date || bookingData.bookingDate,
              bookingTime: bookingData.start_time || bookingData.booking_time,
              guestCount: bookingData.number_of_guests || bookingData.guest_count,
              totalAmount: bookingData.total_amount || bookingData.totalAmount,
              paymentAmount: requestData.amount || 0,
              
              // Table details
              tableName: bookingData.table?.table_type,
              tableNumber: bookingData.table?.table_number,
              
              // Venue details
              venueName: bookingData.venues?.name,
              venueAddress: bookingData.venues?.address,
              venuePhone: bookingData.venues?.contact_phone,
              
              // QR Code for venue entry
              qrCodeImage: individualQrCodeImage,
              
              // Dashboard URL
              dashboardUrl: `${window.location.origin}/profile`
            };
            
            console.log('📧 Individual split payment email data being sent:', emailData);
            console.log('📱 Individual QR Code in email data:', {
              hasQrCodeImage: !!individualQrCodeImage,
              qrCodeImageLength: individualQrCodeImage?.length || 0,
              qrCodeImageStart: individualQrCodeImage?.substring(0, 50) || 'N/A'
            });

            console.log('📧 SENDING INDIVIDUAL CONFIRMATION EMAIL NOW:', {
              to: recipientData.email,
              template: 'split-payment-confirmation',
              hasQrCode: !!individualQrCodeImage
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
        venue_name: bookingData?.venues?.name
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
      console.log('📊 Payment status check:', { allPaid });
      
      if (allPaid) {
        console.log('🎉 All payments are complete! Sending completion emails...');
        // Update booking status to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        // Get booking and venue data for emails
        console.log('📚 Fetching booking data for completion email...');
        let bookingData = null;
        
        const { data: initialBookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            profiles (
              email,
              first_name,
              last_name,
              phone
            ),
            venues (
              name,
              address,
              city,
              contact_email,
              contact_phone,
              venue_owners (
                email,
                full_name
              )
            )
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('❌ Error fetching booking data for completion email:', bookingError);
          // Try to fetch booking data without joins as fallback
          const { data: simpleBooking, error: simpleError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
          
          if (simpleError) {
            console.error('❌ Error fetching simple booking data for completion email:', simpleError);
            return;
          }
          
          // Fetch venue and profile data separately
          let venueData = null;
          let profileData = null;
          
          
          if (simpleBooking?.venue_id) {
            const { data: venue } = await supabase
              .from('venues')
              .select('name, address, city, contact_email, contact_phone')
              .eq('id', simpleBooking.venue_id)
              .single();
            venueData = venue;
            
            // Fetch venue owner data separately
            if (venue?.id) {
              let venueOwner = null;
              
              // Try multiple approaches to find venue owner
              const { data: ownerByVenueId, error: venueIdError } = await supabase
                .from('venue_owners')
                .select('owner_email, owner_name, user_id, venue_name')
                .eq('venue_id', venue.id)
                .single();
              
              if (ownerByVenueId && !venueIdError) {
                venueOwner = ownerByVenueId;
                console.log('✅ Venue owner found by venue_id (fallback):', venueOwner);
              } else {
                console.log('❌ No venue owner found by venue_id (fallback):', venueIdError);
                
                // Try owner_id approach
                if (venue.owner_id) {
                  const { data: ownerByOwnerId, error: ownerIdError } = await supabase
                    .from('venue_owners')
                    .select('owner_email, owner_name, user_id, venue_name')
                    .eq('user_id', venue.owner_id)
                    .single();
                  
                  if (ownerByOwnerId && !ownerIdError) {
                    venueOwner = ownerByOwnerId;
                    console.log('✅ Venue owner found by owner_id (fallback):', venueOwner);
                  }
                }
                
                // Try user_id approach
                if (!venueOwner && venue.user_id) {
                  const { data: ownerByUserId, error: userIdError } = await supabase
                    .from('venue_owners')
                    .select('owner_email, owner_name, user_id, venue_name')
                    .eq('user_id', venue.user_id)
                    .single();
                  
                  if (ownerByUserId && !userIdError) {
                    venueOwner = ownerByUserId;
                    console.log('✅ Venue owner found by user_id (fallback):', venueOwner);
                  }
                }
              }
              
              if (venueOwner) {
                venueData.venue_owners = venueOwner;
                console.log('✅ Final venue owner data set (fallback):', venueOwner);
              } else {
                console.log('❌ No venue owner found with any approach (fallback)');
                
                // Fallback: Try to find venue owner by venue name
                if (venue?.name) {
                  console.log('🔄 Trying fallback lookup by venue name (fallback):', venue.name);
                  const { data: ownerByName, error: nameError } = await supabase
                    .from('venue_owners')
                    .select('owner_email, owner_name, user_id, venue_name')
                    .ilike('venue_name', `%${venue.name}%`)
                    .single();
                  
                  if (ownerByName && !nameError) {
                    venueData.venue_owners = ownerByName;
                    console.log('✅ Venue owner found by name (fallback):', ownerByName);
                  } else {
                    console.log('❌ No venue owner found by name (fallback):', nameError);
                  }
                }
              }
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
          
          // Create booking data object with joined data
          bookingData = {
            ...simpleBooking,
            venues: venueData,
            profiles: profileData
          };
          
          console.log('✅ Fallback booking data for completion email:', bookingData);
        } else {
          bookingData = initialBookingData;
          
          // Always fetch profile data separately since the join might not work
          if (bookingData?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email, phone')
              .eq('id', bookingData.user_id)
              .single();
            bookingData.profiles = profile;
          }
          
          // Always fetch venue owner data separately
          console.log('🔍 Venue data for owner lookup:', {
            venueId: bookingData?.venues?.id,
            venueUserId: bookingData?.venues?.user_id,
            venueOwnerId: bookingData?.venues?.owner_id,
            venueName: bookingData?.venues?.name,
            fullVenueData: bookingData?.venues
          });
          
          if (bookingData?.venues?.id) {
            // Try multiple approaches to find venue owner
            let venueOwner = null;
            
            // Approach 1: Try venue_id in venue_owners table
            const { data: ownerByVenueId, error: venueIdError } = await supabase
              .from('venue_owners')
              .select('owner_email, owner_name, user_id, venue_name')
              .eq('venue_id', bookingData.venues.id)
              .single();
            
            if (ownerByVenueId && !venueIdError) {
              venueOwner = ownerByVenueId;
              console.log('✅ Venue owner found by venue_id:', venueOwner);
            } else {
              console.log('❌ No venue owner found by venue_id:', venueIdError);
              
              // Approach 2: Try owner_id in venues table
              if (bookingData.venues.owner_id) {
                const { data: ownerByOwnerId, error: ownerIdError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .eq('user_id', bookingData.venues.owner_id)
                  .single();
                
                if (ownerByOwnerId && !ownerIdError) {
                  venueOwner = ownerByOwnerId;
                  console.log('✅ Venue owner found by owner_id:', venueOwner);
                } else {
                  console.log('❌ No venue owner found by owner_id:', ownerIdError);
                }
              }
              
              // Approach 3: Try user_id in venues table
              if (!venueOwner && bookingData.venues.user_id) {
                const { data: ownerByUserId, error: userIdError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .eq('user_id', bookingData.venues.user_id)
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
              bookingData.venues.venue_owners = venueOwner;
              console.log('✅ Final venue owner data set:', venueOwner);
            } else {
              console.log('❌ No venue owner found with any approach');
              
              // Fallback: Try to find venue owner by venue name
              if (bookingData.venues?.name) {
                console.log('🔄 Trying fallback lookup by venue name:', bookingData.venues.name);
                const { data: ownerByName, error: nameError } = await supabase
                  .from('venue_owners')
                  .select('owner_email, owner_name, user_id, venue_name')
                  .ilike('venue_name', `%${bookingData.venues.name}%`)
                  .single();
                
                if (ownerByName && !nameError) {
                  bookingData.venues.venue_owners = ownerByName;
                  console.log('✅ Venue owner found by name (fallback):', ownerByName);
                } else {
                  console.log('❌ No venue owner found by name either:', nameError);
                }
              }
            }
          } else {
            console.log('❌ No venue ID available for owner lookup');
            
            // Fallback: Try to find venue owner by venue name even without venue ID
            if (bookingData.venues?.name) {
              console.log('🔄 Trying fallback lookup by venue name (no venue ID):', bookingData.venues.name);
              const { data: ownerByName, error: nameError } = await supabase
                .from('venue_owners')
                .select('owner_email, owner_name, user_id, venue_name')
                .ilike('venue_name', `%${bookingData.venues.name}%`)
                .single();
              
              if (ownerByName && !nameError) {
                bookingData.venues.venue_owners = ownerByName;
                console.log('✅ Venue owner found by name (no venue ID):', ownerByName);
              } else {
                console.log('❌ No venue owner found by name (no venue ID):', nameError);
              }
            }
          }
        }

        console.log('✅ Booking data fetched:', {
          bookingId: bookingData?.id,
          venueName: bookingData?.venues?.name,
          initiatorEmail: bookingData?.profiles?.email,
          hasVenue: !!bookingData?.venues,
          hasProfile: !!bookingData?.profiles,
          venueData: bookingData?.venues,
          venueId: bookingData?.venues?.id,
          venueUserId: bookingData?.venues?.user_id,
          venueOwnerId: bookingData?.venues?.owner_id
        });

        // DEBUG: Let's check what's actually in the database
        console.log('🔍 DEBUG: Checking database for venue owner...');
        
        // Check all venue owners
        const { data: allVenueOwners, error: allOwnersError } = await supabase
          .from('venue_owners')
          .select('*')
          .limit(5);
        
        console.log('🔍 All venue owners in database:', { allVenueOwners, allOwnersError });
        
        // Check if there's a venue with this name
        if (bookingData?.venues?.name) {
          const { data: venueByName, error: venueByNameError } = await supabase
            .from('venues')
            .select('*')
            .ilike('name', `%${bookingData.venues.name}%`)
            .limit(3);
          
          console.log('🔍 Venues with similar name:', { venueByName, venueByNameError });
        }
        
        // Check if there's a venue owner with this venue name
        if (bookingData?.venues?.name) {
          const { data: ownerByVenueName, error: ownerByVenueNameError } = await supabase
            .from('venue_owners')
            .select('*')
            .ilike('venue_name', `%${bookingData.venues.name}%`)
            .limit(3);
          
          console.log('🔍 Venue owners with similar venue name:', { ownerByVenueName, ownerByVenueNameError });
        }

        if (bookingData) {
          console.log('📧 Preparing to send completion email to initiator:', {
            to: bookingData.profiles?.email,
            subject: `Booking Confirmed! - ${bookingData.venues?.name || 'Your Venue'}`,
            template: 'booking-confirmation'
          });

          // Get table information for the initiator
          let tableInfo = { table_name: 'Table not specified', table_number: 'N/A' };
          if (bookingData.table_id) {
            const { data: tableData } = await supabase
              .from('venue_tables')
              .select('table_type, table_number')
              .eq('id', bookingData.table_id)
              .single();
            if (tableData) {
              tableInfo = { table_name: tableData.table_type, table_number: tableData.table_number };
            }
          }

          // Generate QR code for the booking
          console.log('📱 Generating QR code for split payment booking:', bookingData.id);
          const qrCodeImage = await generateVenueEntryQR(bookingData);
          console.log('📱 QR code generated successfully:', qrCodeImage ? 'Yes' : 'No');

          // Prepare email data
          const emailData = {
            // Recipient info
            email: bookingData.profiles?.email || 'initiator@example.com',
            customerName: `${bookingData.profiles?.first_name || ''} ${bookingData.profiles?.last_name || ''}`.trim() || 'Guest',
            customerEmail: bookingData.profiles?.email || 'Not provided',
            customerPhone: bookingData.profiles?.phone || 'N/A',
            
            // Booking details
            bookingId: bookingData.id,
            bookingReference: bookingData.id, // Template expects bookingReference
            bookingDate: bookingData.booking_date || bookingData.bookingDate,
            bookingTime: bookingData.start_time || bookingData.booking_time,
            partySize: bookingData.number_of_guests || bookingData.guest_count || 1, // Template expects partySize
            guestCount: bookingData.number_of_guests || bookingData.guest_count,
            totalAmount: bookingData.total_amount || bookingData.totalAmount,
            initiatorAmount: bookingData.total_amount || bookingData.totalAmount, // For split-payment-complete template
            
            // Table details
            tableName: tableInfo.table_name,
            tableNumber: tableInfo.table_number,
            tableType: tableInfo.table_name || 'VIP Table',
            tableCapacity: bookingData.number_of_guests || 4,
            tableLocation: 'Prime location',
            tableFeatures: 'Premium features',
            
            // Venue details
            venueName: bookingData.venues?.name,
            venueAddress: bookingData.venues?.address,
            venuePhone: bookingData.venues?.contact_phone,
            
            // Special requests
            specialRequests: bookingData.special_requests || 'None specified',
            
            // QR Code for venue entry
            qrCodeImage: qrCodeImage
          };

          console.log('📧 Email data being sent:', emailData);
          console.log('📱 QR Code in email data:', {
            hasQrCodeImage: !!(emailData.qrCodeImage),
            qrCodeImageLength: emailData.qrCodeImage?.length || 0,
            qrCodeImageStart: emailData.qrCodeImage?.substring(0, 50) || 'N/A'
          });

          // Send completion email to initiator via Edge Function
          const { data: completionEmailResult, error: completionEmailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: bookingData.profiles?.email || 'initiator@example.com',
              subject: `Booking Confirmed! - ${bookingData.venues?.name || 'Your Venue'}`,
              template: 'split-payment-complete',
              data: emailData
            }
          });

          if (completionEmailError) {
            console.error('❌ Error sending split payment completion email:', {
              error: completionEmailError,
              response: completionEmailResult,
              emailData: {
                to: bookingData.profiles?.email,
                subject: `Booking Confirmed! - ${bookingData.venues?.name || 'Your Venue'}`,
                template: 'booking-confirmation'
              }
            });
          } else {
            console.log('✅ Split payment completion email sent successfully:', {
              result: completionEmailResult,
              recipient: bookingData.profiles?.email,
              template: 'booking-confirmation'
            });
          }

        // Send email to venue owner when all payments are completed
        console.log('📧 Sending venue owner notification...');
        try {
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
          console.log('✅ Venue owner notification sent successfully');
        } catch (venueOwnerError) {
          console.error('❌ Error sending venue owner notification:', venueOwnerError);
        }

          // Send confirmation email to the last person who paid (if different from initiator)
          const lastPayment = requests.find(req => req.id === requestId);
          if (lastPayment && lastPayment.recipient_id !== bookingData.profiles?.id) {
            console.log('📧 [FRONTEND] Sending confirmation email to last payer...');
            console.log('🔍 Last payment details:', {
              lastPayment,
              requestId,
              recipientId: lastPayment.recipient_id,
              initiatorId: bookingData.profiles?.id
            });
            console.log('🔍 Booking data for last payer:', {
              bookingId: bookingData.id,
              venueName: bookingData.venues?.name,
              tableId: bookingData.table_id,
              bookingDate: bookingData.booking_date,
              startTime: bookingData.start_time,
              guestCount: bookingData.number_of_guests,
              totalAmount: bookingData.total_amount
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
              if (bookingData.table_id) {
                const { data: tableData } = await supabase
                  .from('venue_tables')
                  .select('table_type, table_number')
                  .eq('id', bookingData.table_id)
                  .single();
                if (tableData) {
                  tableInfo = { table_name: tableData.table_type, table_number: tableData.table_number };
                }
              }

              // Generate QR code for the last payer (same booking, same QR code)
              console.log('📱 Generating QR code for last payer split payment booking:', bookingData.id);
              const lastPayerQrCodeImage = await generateVenueEntryQR(bookingData);
              console.log('📱 Last payer QR code generated successfully:', lastPayerQrCodeImage ? 'Yes' : 'No');

              // Prepare comprehensive email data for last payer
              const lastPayerEmailData = {
                // Recipient info
                email: lastPayerProfile.email,
                customerName: `${lastPayerProfile.first_name || ''} ${lastPayerProfile.last_name || ''}`.trim() || 'Guest',
                customerEmail: lastPayerProfile.email || 'Not provided',
                customerPhone: lastPayerProfile.phone || 'N/A',
                
                // Booking details
                bookingId: bookingData.id,
                bookingReference: bookingData.id, // Template expects bookingReference
                bookingDate: bookingData.booking_date || bookingData.bookingDate,
                bookingTime: bookingData.start_time || bookingData.booking_time,
                partySize: bookingData.number_of_guests || bookingData.guest_count || 1, // Template expects partySize
                guestCount: bookingData.number_of_guests || bookingData.guest_count,
                totalAmount: bookingData.total_amount || bookingData.totalAmount,
                initiatorAmount: lastPayment.amount || 0, // For split-payment-complete template
                
                // Table details
                tableName: tableInfo.table_name,
                tableNumber: tableInfo.table_number,
                tableType: tableInfo.table_name || 'VIP Table',
                tableCapacity: bookingData.number_of_guests || 4,
                tableLocation: 'Prime location',
                tableFeatures: 'Premium features',
                
                // Venue details
                venueName: bookingData.venues?.name,
                venueAddress: bookingData.venues?.address,
                venuePhone: bookingData.venues?.contact_phone,
                
                // Special requests
                specialRequests: bookingData.special_requests || 'None specified',
                
                // QR Code for venue entry
                qrCodeImage: lastPayerQrCodeImage
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

              const { data: lastPayerEmailResult, error: lastPayerEmailError } = await supabase.functions.invoke('send-email', {
                body: {
                  to: lastPayerProfile.email,
                  subject: `Payment Confirmed! - ${bookingData.venues?.name || 'Your Venue'}`,
                  template: 'split-payment-complete',
                  data: lastPayerEmailData
                }
              });

              if (lastPayerEmailError) {
                console.error('❌ Error sending last payer confirmation email:', lastPayerEmailError);
              } else {
                console.log('✅ Last payer confirmation email sent successfully');
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