import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Calendar, Clock, User, Check, Share2, Plus, Minus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import SplitPaymentForm from '@/components/checkout/SplitPaymentForm';
import { validateCheckoutForm } from '@/lib/formValidation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendBookingConfirmation, sendVenueOwnerNotification, debugBookingEmail } from '@/lib/emailService';

const CheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if this is a deposit flow
  const isDepositFlow = location.pathname.includes('/deposit');
  const depositAmount = location.state?.depositAmount;
  
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    agreeToTerms: false,
    referralCode: ''
  });
  const [userProfile, setUserProfile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [vipPerks, setVipPerks] = useState([]);
  const [venue, setVenue] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [splitCount, setSplitCount] = useState(1);
  const [splitAmounts, setSplitAmounts] = useState([]);
  const [splitLinks, setSplitLinks] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [splitPaymentRequests, setSplitPaymentRequests] = useState([]);
  
  // Fetch user profile if authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
          } else if (data) {
            setUserProfile(data);
            // Pre-fill form with user data
            setFormData(prev => ({
              ...prev,
              fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.user_metadata?.full_name || '',
              email: user.email || '',
              phone: data.phone_number || user.user_metadata?.phone || ''
            }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    console.log('CheckoutPage useEffect triggered');
    console.log('isDepositFlow:', isDepositFlow);
    console.log('id from params:', id);
    console.log('location.pathname:', location.pathname);
    
    if (isDepositFlow) {
      // For deposit flow, we don't need venue selection
      if (!depositAmount) {
        console.log('No deposit amount, redirecting to profile');
        navigate('/profile'); // Redirect back to profile if no deposit amount
        return;
      }
      setSelection({ 
        depositAmount, 
        isDeposit: true,
        venueName: 'VIP Credit Deposit'
      });
    } else {
      // Original venue booking flow
      const savedSelection = localStorage.getItem('lagosvibe_booking_selection');
      console.log('savedSelection from localStorage:', savedSelection);
      
      if (savedSelection) {
        const parsedSelection = JSON.parse(savedSelection);
        console.log('parsedSelection:', parsedSelection);
        console.log('parsedSelection.venueId:', parsedSelection.venueId);
        console.log('id from params:', id);
        console.log('Comparison result:', parsedSelection.venueId === id);
        
        if (parsedSelection.venueId === id) {
          console.log('Venue ID matches, setting selection');
          setSelection(parsedSelection);
        } else {
          console.log('Venue ID mismatch, redirecting to venue page');
          navigate(`/venues/${id}`); // Redirect if venue ID doesn't match
        }
      } else {
        console.log('No saved selection, redirecting to venue page');
        navigate(`/venues/${id}`); // Redirect if no selection
      }
    }
    setLoading(false);
  }, [id, navigate, isDepositFlow, depositAmount]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const applyReferralCode = (code) => {
    if (code === "VIP2025") {
      toast({ title: "Referral code applied!", description: "You've unlocked 10% off!" });
      // This is a mock, in a real app this would adjust price or add perks
      setVipPerks(prev => [...prev, "10% Discount Applied"]);
      return true;
    }
    toast({ title: "Invalid referral code", variant: "destructive" });
    return false;
  };

  const sendBookingConfirmationEmail = async (bookingData) => {
    let booking, venue, customer;
    
    try {
      // Prepare data for customer email
      booking = {
        id: bookingData.bookingId || bookingData.id,
        booking_date: bookingData.bookingDate || new Date().toISOString(),
        booking_time: selection.time || '19:00:00',
        guest_count: selection.guests || selection.guestCount || 2,
        table_number: selection.table?.name || selection.table?.table_number,
        total_amount: bookingData.totalAmount,
        status: 'confirmed'
      };

      venue = {
        name: bookingData.venueName || selection.venueName,
        address: selection.venueAddress || 'Lagos, Nigeria',
        contact_phone: selection.venuePhone || '+234 XXX XXX XXXX',
        contact_email: selection.venueEmail || 'info@vipclub.com',
        images: selection.venueImage ? [selection.venueImage] : [],
        dress_code: 'Smart casual'
      };

      customer = {
        full_name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone || formData.phone
      };

      // Send customer confirmation email using EmailJS
      const customerEmailResult = await sendBookingConfirmation(booking, venue, customer);
      
      // Get venue owner info if available for notification
      const venueOwnerEmail = selection.ownerEmail || 'owner@vipclub.com';
      if (venueOwnerEmail) {
        const venueOwner = {
          full_name: 'Venue Owner',
          email: venueOwnerEmail
        };
        
        // Send venue owner notification (non-blocking)
        sendVenueOwnerNotification(booking, venue, customer, venueOwner)
          .catch(error => console.log('Venue owner notification failed:', error));
      }

      console.log('✅ Email service result:', customerEmailResult);
      return true;
    } catch (error) {
      console.error('❌ Failed to send booking emails:', error);
      
      // If it's the "recipients address is empty" error, run debug function
      if ((error.text === 'The recipients address is empty' || error.message?.includes('recipients address is empty')) && booking && venue && customer) {
        console.log('🔍 Running email debug function...');
        try {
          await debugBookingEmail(booking, venue, customer);
        } catch (debugError) {
          console.error('❌ Debug function also failed:', debugError);
        }
      }
      
      return false;
    }
  };

  const createOrUpdateUserAccount = async (userData) => {
    try {
      // If user is already authenticated, just update their profile if needed
      if (user) {
        // Update user profile with any new information
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert([{
            id: user.id,
            first_name: userData.fullName.split(' ')[0] || '',
            last_name: userData.fullName.split(' ').slice(1).join(' ') || '',
            phone_number: userData.phone
          }], {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }

        return user;
      }

      // For new users, create account
      // First check if user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (existingUser?.user) {
        // User already exists, just sign them in
        return existingUser.user;
      }

      // Create new user account
      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            phone: userData.phone
          }
        }
      });

      if (signUpError) throw signUpError;

      // Create user profile if it doesn't exist
      if (newUser.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert([{
            id: newUser.user.id,
            first_name: userData.fullName.split(' ')[0] || '',
            last_name: userData.fullName.split(' ').slice(1).join(' ') || '',
            phone_number: userData.phone
          }], {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return newUser.user;
    } catch (error) {
      console.error('Error with user account:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateCheckoutForm(formData, !!user);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      
      try {
        // Apply referral code if provided
        if (formData.referralCode) {
          applyReferralCode(formData.referralCode);
        }

        // Create or update user account
        const currentUser = await createOrUpdateUserAccount({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });

        // Prepare booking data for database
        const bookingData = {
          user_id: currentUser?.id,
          venue_id: selection.venueId || selection.id,
          table_id: selection.table?.id || null,
          booking_date: selection.date || new Date().toISOString().split('T')[0], // Use selected date or today
          start_time: selection.time || '19:00:00', // Use selected time or default to 7 PM
          end_time: selection.endTime || '23:00:00', // Default 4-hour booking
          number_of_guests: selection.guests || selection.guestCount || 2,
          status: 'confirmed',
          total_amount: parseFloat(calculateTotal())
        };

        // Save booking to database
        const { data: bookingRecord, error: bookingError } = await supabase
          .from('bookings')
          .insert([bookingData])
          .select()
          .single();

        if (bookingError) {
          throw new Error(`Failed to create booking: ${bookingError.message}`);
        }

        // Create booking record for localStorage (for backward compatibility)
        const newBooking = {
          id: bookingRecord.id,
          ...selection,
          customerName: formData.fullName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          userId: currentUser?.id,
          bookingDate: new Date().toISOString(),
          status: 'confirmed',
          referralCode: formData.referralCode,
          vipPerksApplied: vipPerks,
          totalAmount: calculateTotal(),
          dbRecord: bookingRecord // Reference to database record
        };

        // Save booking to localStorage (for backward compatibility with existing components)
        const bookings = JSON.parse(localStorage.getItem('lagosvibe_bookings') || '[]');
        bookings.push(newBooking);
        localStorage.setItem('lagosvibe_bookings', JSON.stringify(bookings));
        localStorage.removeItem('lagosvibe_booking_selection');

        // Send confirmation email (non-blocking)
        const emailSent = await sendBookingConfirmationEmail({
          ...newBooking,
          bookingId: bookingRecord.id,
          venueName: selection.venueName || selection.name
        });

        // Unlock VIP perks
        const unlockedPerks = ["Free Welcome Drink", "Priority Queue"];
        localStorage.setItem('lagosvibe_vip_perks', JSON.stringify(unlockedPerks));
        
        // Show success message regardless of email status
        const isNewUser = !user;
        toast({ 
          title: isNewUser ? "Account Created & Booking Confirmed!" : "Booking Confirmed!", 
          description: emailSent 
            ? (isNewUser ? "Welcome to VIPClub! Check your email for confirmation." : "Your booking is confirmed! Check your email for confirmation.")
            : (isNewUser ? "Welcome to VIPClub! Your booking is confirmed. You can view details in your profile." : "Your booking is confirmed. You can view details in your profile."),
          className: "bg-green-500 text-white"
        });

        // If email failed, show a separate notification
        if (!emailSent) {
          setTimeout(() => {
            toast({
              title: "Email Notification",
              description: "Confirmation email could not be sent, but your booking is saved. You can view it in your profile.",
              variant: "default"
            });
          }, 3000);
        }

        setShowConfirmation(true);

      } catch (error) {
        console.error('Error processing booking:', error);
        toast({
          title: "Booking Error",
          description: error.message || "There was an error processing your booking. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({
        title: "Form validation failed",
        description: "Please check the form and fix the errors.",
        variant: "destructive",
      });
    }
  };
  
  const calculateTotal = () => {
    if (isDepositFlow && depositAmount) {
      return depositAmount.toFixed(2);
    }
    if (!selection) return 0;
    let total = (selection.ticket?.price || 0) + (selection.table?.price || 0) + 25; // 25 is service fee
    if (vipPerks.includes("10% Discount Applied")) {
      total *= 0.9; // Apply 10% discount
    }
    return total.toFixed(2);
  };
  
  const handleSplitCountChange = (newCount) => {
    if (newCount < 1) return;
    setSplitCount(newCount);
    const amountPerPerson = Math.ceil(venue.price / newCount);
    const amounts = Array(newCount).fill(amountPerPerson);
    // Adjust the last amount to account for rounding
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    if (total !== venue.price) {
      amounts[amounts.length - 1] = venue.price - (amounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0));
    }
    setSplitAmounts(amounts);
    setSplitLinks(Array(newCount).fill(''));
  };

  const generateSplitLinks = () => {
    const links = splitAmounts.map((amount, index) => {
      // In a real app, this would generate a unique payment link
      return `${window.location.origin}/split-payment/${id}/${index + 1}/${amount}`;
    });
    setSplitLinks(links);
    setShowShareDialog(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copied!",
      description: "Share this link with your friends to collect payment.",
    });
  };

  const handleSplitPaymentCreated = (requests) => {
    setSplitPaymentRequests(requests);
    setShowShareDialog(true);
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
  
  if (!selection) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Selection Found</h2>
        <p className="text-muted-foreground mb-6">Please go back and select a ticket or table first.</p>
        <Link to={`/venues/${id}`}>
          <Button>Back to Venue</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <Link to={isDepositFlow ? "/profile" : `/venues/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isDepositFlow ? "Back to Profile" : "Back to Venue"}
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold mb-6 flex items-center">
              <CreditCard className="h-8 w-8 mr-2" />
              Checkout
            </h1>

            <Tabs defaultValue="single" className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="single">Single Payment</TabsTrigger>
                <TabsTrigger value="split">Split Payment</TabsTrigger>
              </TabsList>

              <TabsContent value="single">
                <CheckoutForm 
                  formData={formData}
                  errors={errors}
                  handleInputChange={handleInputChange}
                  handleSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  totalAmount={calculateTotal()}
                  isAuthenticated={!!user}
                  icons={{
                    user: <User className="h-5 w-5 mr-2" />
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 py-3.5 text-lg rounded-md"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-cream mr-2"></div>
                      Processing...
                    </div>
                  ) : `Pay ₦${calculateTotal().toLocaleString()}`}
                </Button>
              </TabsContent>

              <TabsContent value="split">
                <SplitPaymentForm
                  totalAmount={parseFloat(calculateTotal())}
                  onSplitCreated={handleSplitPaymentCreated}
                  user={userProfile || user}
                  bookingId={selection?.id}
                  createBookingIfNeeded={async () => {
                    // If booking already exists, return its ID
                    if (selection?.id) return selection.id;
                    // Otherwise, create a pending booking in the DB
                    const bookingData = {
                      user_id: (userProfile || user)?.id,
                      venue_id: selection.venueId || selection.id,
                      table_id: selection.table?.id || null,
                      booking_date: selection.date || new Date().toISOString().split('T')[0],
                      start_time: selection.time || '19:00:00',
                      end_time: selection.endTime || '23:00:00',
                      number_of_guests: selection.guests || selection.guestCount || 2,
                      status: 'pending',
                      total_amount: parseFloat(calculateTotal())
                    };
                    const { data: bookingRecord, error: bookingError } = await supabase
                      .from('bookings')
                      .insert([bookingData])
                      .select()
                      .single();
                    if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`);
                    // Update selection state with new booking ID
                    setSelection(prev => ({ ...prev, id: bookingRecord.id }));
                    return bookingRecord.id;
                  }}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
        
        <div>
          <div className="sticky top-20">
            <OrderSummary 
              selection={selection} 
              totalAmount={calculateTotal()} 
              vipPerks={vipPerks}
              icons={{
                calendar: <Calendar className="h-5 w-5 mr-2" />,
                clock: <Clock className="h-5 w-5 mr-2" />
              }}
            />
          </div>
        </div>
      </div>
      
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md" aria-describedby="checkout-dialog-desc">
          <div id="checkout-dialog-desc" className="sr-only">Enter your payment details to complete your booking.</div>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Booking Confirmed!</DialogTitle>
            <DialogDescription className="text-center">
              <div className="flex justify-center my-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="mb-2">
                Your booking at <span className="font-bold">{selection.venueName}</span> has been confirmed.
              </p>
              {vipPerks.length > 0 && (
                <div className="my-2 text-sm text-green-400">
                  <p className="font-semibold">VIP Perks Applied:</p>
                  <ul className="list-disc list-inside">
                    {vipPerks.map(perk => <li key={perk}>{perk}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-sm">
                A confirmation email has been sent to {formData.email}. You can show this email or your ID at the entrance.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Link to="/">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
                Back to Home
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Payment Requests Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent aria-describedby="checkout-dialog-desc-2">
          <div id="checkout-dialog-desc-2" className="sr-only">View and manage your split payment requests.</div>
          <DialogHeader>
            <DialogTitle>Split Payment Requests Sent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {splitPaymentRequests.length > 0 ? (
              splitPaymentRequests.map((request, index) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-brand-burgundy" />
                      </div>
                      <div>
                        <div className="font-medium">Recipient {index + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.recipient_phone}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₦{request.amount.toLocaleString()}</div>
                      <Badge variant="outline" className="text-xs">
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(request.payment_link)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Payment Link
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No split payment requests created yet.</p>
              </div>
            )}
            
            <div className="flex justify-end gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Close
              </Button>
              <Button
                className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                onClick={() => {
                  setShowShareDialog(false);
                  navigate('/bookings');
                }}
              >
                View All Bookings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;