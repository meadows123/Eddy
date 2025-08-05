import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, CalendarDays, User, CheckCircle, Lock, Tag as CouponIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getVenueById } from '@/data/clubData'; // Updated

// Basic validation, can be expanded
const validateBookingForm = (formData) => {
  const errors = {};
  if (!formData.fullName.trim()) errors.fullName = "Full name is required.";
  if (!formData.email.trim()) errors.email = "Email is required.";
  else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid.";
  if (!formData.phone.trim()) errors.phone = "Phone number is required.";
  if (!formData.cardNumber.replace(/\s/g, '').length === 16 || !/^\d+$/.test(formData.cardNumber.replace(/\s/g, ''))) errors.cardNumber = "Valid card number is required.";
  if (!formData.expiryDate.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)) errors.expiryDate = "Valid expiry (MM/YY) is required.";
  if (!formData.cvv.length === 3 || !/^\d+$/.test(formData.cvv)) errors.cvv = "Valid CVV is required.";
  if (!formData.agreeToTerms) errors.agreeToTerms = "You must agree to the terms.";
  return errors;
};

const BookingPage = () => {
  const { id: venueId } = useParams(); // venueId from URL
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selection, setSelection] = useState(null);
  const [venue, setVenue] = useState(null); // To store venue details
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    agreeToTerms: false,
    referralCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  
  useEffect(() => {
    const savedSelection = localStorage.getItem('lagosvibe_booking_selection');
    if (savedSelection) {
      const parsedSelection = JSON.parse(savedSelection);
      // Ensure selection matches the venue ID in the URL
      if (parsedSelection.venueId === parseInt(venueId)) {
        setSelection(parsedSelection);
        const currentVenue = getVenueById(venueId);
        setVenue(currentVenue);
      } else {
        // Mismatch, navigate to the correct venue detail page
        navigate(`/venues/${venueId}`);
      }
    } else {
      // No selection found, redirect to the venue detail page to make a selection
      navigate(`/venues/${venueId}`);
    }
    setLoading(false);
  }, [venueId, navigate]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    if (name === 'cardNumber') {
      processedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    } else if (name === 'expiryDate') {
        processedValue = value.replace(/[^0-9]/g, '');
        if (processedValue.length > 2) {
            processedValue = processedValue.slice(0,2) + '/' + processedValue.slice(2,4);
        }
    } else if (name === 'cvv') {
        processedValue = value.replace(/[^0-9]/g, '').slice(0,3);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const applyReferral = () => {
    if (formData.referralCode.toUpperCase() === "LAGOSVIP10") {
      setDiscountApplied(true);
      toast({ title: "Referral Code Applied!", description: "10% discount added to your booking.", className: "bg-brand-gold text-brand-burgundy" });
    } else {
      setDiscountApplied(false);
      toast({ title: "Invalid Referral Code", description: "The code you entered is not valid.", variant: "destructive", className: "bg-red-500 text-white" });
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const formErrors = validateBookingForm(formData);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      // Simulate payment processing
      setTimeout(() => {
        setIsSubmitting(false);
        setShowConfirmation(true);
        
        // Store booking in localStorage
        const bookings = JSON.parse(localStorage.getItem('lagosvibe_user_bookings') || '[]');
        const newBooking = {
          id: Date.now(),
          ...selection,
          customerDetails: { fullName: formData.fullName, email: formData.email, phone: formData.phone },
          bookingTimestamp: new Date().toISOString(),
          status: 'Confirmed',
          totalAmount: calculateTotal(),
          discountApplied: discountApplied,
          referralCode: formData.referralCode
        };
        bookings.push(newBooking);
        localStorage.setItem('lagosvibe_user_bookings', JSON.stringify(bookings));
        
        // Clear selection from localStorage
        localStorage.removeItem('lagosvibe_booking_selection');

        // Add loyalty points (mock)
        const currentPoints = parseInt(localStorage.getItem('lagosvibe_loyalty_points') || '0');
        const pointsEarned = Math.floor(calculateTotal() / 100); // e.g. 1 point per ₦100
        localStorage.setItem('lagosvibe_loyalty_points', (currentPoints + pointsEarned).toString());
        toast({ title: "Booking Confirmed!", description: `You've earned ${pointsEarned} loyalty points!`, className: "bg-brand-gold text-brand-burgundy" });

      }, 2500);
    } else {
      toast({
        title: "Please Check Your Details",
        description: "Some information is missing or incorrect.",
        variant: "destructive",
        className: "bg-red-500 text-white",
      });
    }
  };
  
  const calculateTotal = () => {
    if (!selection) return 0;
    let total = (selection.ticket?.price || 0) + (selection.table?.price || 0);
    // Add a mock service fee
    const serviceFee = total * 0.05; // 5% service fee
    total += serviceFee;

    if (discountApplied) {
      total *= 0.9; // Apply 10% discount
    }
    return Math.round(total); // Return whole number for Naira
  };
  
  if (loading || !selection || !venue) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto"></div>
        <p className="mt-4 text-brand-burgundy/70 font-body">Loading Booking Details...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-brand-cream min-h-screen py-10 md:py-16 font-body">
      <div className="container">
        <Link to={`/venues/${venueId}`} className="inline-flex items-center text-sm text-brand-burgundy/80 hover:text-brand-gold mb-8 group">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to {venue.name}
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Order Summary Column */}
          <div className="lg:col-span-1 lg:order-last">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="sticky top-24"
            >
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-brand-burgundy/10">
                <h2 className="text-2xl font-heading text-brand-burgundy mb-6">Order Summary</h2>
                <div className="space-y-4 text-brand-burgundy/90">
                  <div className="flex justify-between items-center">
                    <img src="https://images.unsplash.com/photo-1699990320295-ecd2664079ab" alt={selection.venueName} className="w-16 h-16 rounded-lg object-cover mr-4" />
                    <div className="text-right">
                        <p className="font-semibold text-lg">{selection.venueName}</p>
                        <p className="text-xs text-brand-burgundy/70">{venue.city}</p>
                    </div>
                  </div>
                  
                  {selection.ticket && (
                    <div className="pt-4 border-t border-brand-burgundy/10">
                      <p className="font-semibold">{selection.ticket.name}</p>
                      <p className="text-sm">Price: ₦{selection.ticket.price.toLocaleString()}</p>
                    </div>
                  )}
                  {selection.table && (
                     <div className="pt-4 border-t border-brand-burgundy/10">
                      <p className="font-semibold">{selection.table.name} Table</p>
                      {selection.table.date && <p className="text-sm">Date: {selection.table.date}, Time: {selection.table.time}</p>}
                      {selection.table.guestCount && <p className="text-sm">Guests: {selection.table.guestCount}</p>}
                      <p className="text-sm">Price: ₦{selection.table.price.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-brand-burgundy/10">
                     <p className="text-sm flex justify-between"><span>Subtotal:</span> <span>₦{((selection.ticket?.price || 0) + (selection.table?.price || 0)).toLocaleString()}</span></p>
                     <p className="text-sm flex justify-between"><span>Service Fee (5%):</span> <span>₦{(((selection.ticket?.price || 0) + (selection.table?.price || 0)) * 0.05).toLocaleString()}</span></p>
                    {discountApplied && <p className="text-sm text-green-600 flex justify-between"><span>Discount (10%):</span> <span>- ₦{(calculateTotal() / 0.9 * 0.1).toLocaleString()}</span></p>}
                  </div>
                  <div className="pt-4 border-t border-brand-burgundy/10">
                    <p className="text-xl font-heading flex justify-between">
                      <span>Total:</span> <span className="text-brand-gold">₦{calculateTotal().toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Checkout Form Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white p-6 md:p-10 rounded-xl shadow-xl border border-brand-burgundy/10"
            >
              <h1 className="text-3xl md:text-4xl font-heading text-brand-burgundy mb-8">Secure Booking</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-xl font-heading text-brand-burgundy mb-4 flex items-center"><User className="h-5 w-5 mr-2 text-brand-gold" />Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-brand-burgundy/80">Full Name</Label>
                      <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="e.g., Tunde Adekunle" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                      {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-brand-burgundy/80">Email Address</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="phone" className="text-brand-burgundy/80">Phone Number</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+234 800 000 0000" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="text-xl font-heading text-brand-burgundy mb-4 flex items-center"><CreditCard className="h-5 w-5 mr-2 text-brand-gold" />Payment Details</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="cardNumber" className="text-brand-burgundy/80">Card Number</Label>
                      <div className="relative">
                        <Input id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} placeholder="0000 0000 0000 0000" maxLength="19" className="pl-10 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50"/>
                      </div>
                      {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div>
                      <Label htmlFor="expiryDate" className="text-brand-burgundy/80">Expiry Date</Label>
                      <Input id="expiryDate" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} placeholder="MM/YY" maxLength="5" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                      {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-brand-burgundy/80">CVV</Label>
                      <Input id="cvv" name="cvv" value={formData.cvv} onChange={handleInputChange} placeholder="123" maxLength="3" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                      {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Referral Code */}
                <div>
                  <Label htmlFor="referralCode" className="text-brand-burgundy/80 flex items-center mb-1"><CouponIcon className="h-4 w-4 mr-1.5 text-brand-gold"/>Referral Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleInputChange} placeholder="e.g., LAGOSVIP10" className="bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy"/>
                    <Button type="button" onClick={applyReferral} variant="outline" className="border-brand-gold text-brand-gold hover:bg-brand-gold/10 whitespace-nowrap">Apply Code</Button>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-center space-x-2">
                  <Checkbox id="agreeToTerms" name="agreeToTerms" checked={formData.agreeToTerms} onCheckedChange={(checked) => handleInputChange({ target: { name: 'agreeToTerms', checked, type: 'checkbox' }})} className="border-brand-burgundy/50 data-[state=checked]:bg-brand-gold data-[state=checked]:text-brand-burgundy" />
                  <Label htmlFor="agreeToTerms" className="text-sm text-brand-burgundy/70">I agree to the <Link to="/terms" className="underline hover:text-brand-gold">terms and conditions</Link>.</Label>
                </div>
                 {errors.agreeToTerms && <p className="text-red-500 text-xs -mt-3">{errors.agreeToTerms}</p>}


                <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 py-3.5 text-lg rounded-md">
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-burgundy mr-2"></div>
                      Processing...
                    </div>
                  ) : `Pay ₦${calculateTotal().toLocaleString()}`}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
        
        <Dialog open={showConfirmation} onOpenChange={() => {setShowConfirmation(false); navigate('/profile')}}>
          <DialogContent className="sm:max-w-md bg-white text-brand-burgundy rounded-lg" aria-describedby="booking-dialog-desc">
            <div id="booking-dialog-desc" className="sr-only">Enter your booking details below.</div>
            <DialogHeader className="text-center">
              <div className="flex justify-center my-6">
                <div className="w-20 h-20 bg-brand-gold/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-brand-gold" />
                </div>
              </div>
              <DialogTitle className="text-3xl font-heading text-brand-burgundy">Booking Confirmed!</DialogTitle>
              <DialogDescription className="text-brand-burgundy/80 font-body mt-2">
                <p className="mb-2">
                  Your booking at <span className="font-semibold">{selection.venueName}</span> is confirmed.
                </p>
                {discountApplied && <p className="text-sm text-green-600 font-semibold">10% discount applied!</p>}
                <p className="text-sm mt-1">
                  A confirmation email has been sent to <span className="font-semibold">{formData.email}</span>. 
                  Check your profile for booking details and loyalty points.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-6">
              <Button onClick={() => {setShowConfirmation(false); navigate('/profile')}} className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
                View My Bookings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BookingPage;