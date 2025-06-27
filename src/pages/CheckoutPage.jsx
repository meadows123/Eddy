import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Calendar, Clock, User, Check, Share2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import { validateCheckoutForm } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
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
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          to: bookingData.customerEmail,
          subject: 'Booking Confirmation - VIPClub',
          template: 'booking-confirmation',
          data: {
            customerName: bookingData.customerName,
            venueName: bookingData.venueName,
            bookingDate: new Date(bookingData.bookingDate).toLocaleDateString(),
            ticketInfo: bookingData.ticket ? `${bookingData.ticket.name} - ₦${bookingData.ticket.price}` : null,
            tableInfo: bookingData.table ? `${bookingData.table.name} - ₦${bookingData.table.price}` : null,
            totalAmount: calculateTotal(),
            bookingId: bookingData.id
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send confirmation email');
      }

      console.log('Booking confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // Don't block the booking process if email fails
    }
  };

  const createUserAccount = async (userData) => {
    try {
      // Check if user already exists
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

      // Create user profile
      if (newUser.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            id: newUser.user.id,
            first_name: userData.fullName.split(' ')[0] || '',
            last_name: userData.fullName.split(' ').slice(1).join(' ') || '',
            phone_number: userData.phone,
            credit_balance: 0
          }]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return newUser.user;
    } catch (error) {
      console.error('Error creating user account:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateCheckoutForm(formData);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      
      try {
        // Apply referral code if provided
        if (formData.referralCode) {
          applyReferralCode(formData.referralCode);
        }

        // Create user account
        const user = await createUserAccount({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });

        // Create booking record
        const newBooking = {
          id: Date.now(),
          ...selection,
          customerName: formData.fullName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          userId: user?.id,
          bookingDate: new Date().toISOString(),
          status: 'confirmed',
          referralCode: formData.referralCode,
          vipPerksApplied: vipPerks,
          totalAmount: calculateTotal()
        };

        // Save booking to localStorage (in production, this would go to your database)
        const bookings = JSON.parse(localStorage.getItem('lagosvibe_bookings') || '[]');
        bookings.push(newBooking);
        localStorage.setItem('lagosvibe_bookings', JSON.stringify(bookings));
        localStorage.removeItem('lagosvibe_booking_selection');

        // Send confirmation email
        await sendBookingConfirmationEmail(newBooking);

        // Unlock VIP perks
        const unlockedPerks = ["Free Welcome Drink", "Priority Queue"];
        localStorage.setItem('lagosvibe_vip_perks', JSON.stringify(unlockedPerks));
        
        toast({ 
          title: "Account Created & Booking Confirmed!", 
          description: "Welcome to VIPClub! Check your email for confirmation.",
          className: "bg-green-500 text-white"
        });

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
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSplitCountChange(splitCount - 1)}
                      disabled={splitCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <Label>Split between {splitCount} people</Label>
                      <div className="text-sm text-brand-burgundy/70">
                        ₦{Math.ceil(calculateTotal() / splitCount).toLocaleString()} per person
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSplitCountChange(splitCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {splitAmounts.map((amount, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>Person {index + 1}</Label>
                          <div className="text-sm text-brand-burgundy/70">
                            ₦{amount.toLocaleString()}
                          </div>
                        </div>
                        {splitLinks[index] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(splitLinks[index])}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                    onClick={generateSplitLinks}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Generate Split Links
                  </Button>
                </div>
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

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent aria-describedby="checkout-dialog-desc-2">
          <div id="checkout-dialog-desc-2" className="sr-only">Confirm your booking and review your order details.</div>
          <DialogHeader>
            <DialogTitle>Share Payment Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {splitLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Person {index + 1}</Label>
                  <div className="text-sm text-brand-burgundy/70 break-all">
                    {link}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            ))}
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
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;