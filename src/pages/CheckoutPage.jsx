console.log('Successfully created user:', newUser.user.id);

// Wait a moment and verify the user exists in auth.users
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

// Verify user exists in the database
const { data: userVerification, error: verifyError } = await supabase.auth.getUser();
if (verifyError || !userVerification.user || userVerification.user.id !== newUser.user.id) {
  console.error('User verification failed:', verifyError);
  throw new Error('User account creation failed - please try again');
}

console.log('User verified in database:', userVerification.user.id);

// Create user profile if it doesn't exist
if (newUser.user) {{ Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendBookingConfirmation, sendVenueOwnerNotification, debugBookingEmail } from '../lib/emailService.js';

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
      .from('profiles')
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
        phone: data.phone || user.user_metadata?.phone || ''
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
console.log('location.state:', location.state);

// Check if this is a credit purchase flow
const isCreditPurchase = location.state?.creditPurchase;

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
} else if (isCreditPurchase) {
// For credit purchase flow, use data from location.state
console.log('Credit purchase flow detected');
const { venueId, venueName, amount, purchaseAmount, venue } = location.state;
setSelection({
  isCreditPurchase: true,
  venueId,
  venueName,
  creditAmount: amount,
  purchaseAmount,
  venue
});
} else {
// Check for new booking data from modal first
const pendingBooking = sessionStorage.getItem('pendingBooking');
console.log('pendingBooking from sessionStorage:', pendingBooking);

if (pendingBooking) {
  const bookingData = JSON.parse(pendingBooking);
  console.log('Found pendingBooking data:', bookingData);
  
  // Convert booking data to selection format
  setSelection({
    venueId: bookingData.venueId,
    venueName: bookingData.venueName,
    venueImage: bookingData.venueImage,
    venueLocation: bookingData.venueLocation,
    date: bookingData.date,
    time: bookingData.time,
    guests: parseInt(bookingData.guests),
    tableId: bookingData.tableId,
    selectedTable: bookingData.selectedTable,
    specialRequests: bookingData.specialRequests,
    isFromModal: true // Flag to identify this came from the modal
  });
  
  // Clear the pending booking data after using it
  sessionStorage.removeItem('pendingBooking');
} else {
  // Original venue booking flow - check localStorage
  if (!id) {
    console.log('No venue ID provided, redirecting to venues');
    navigate('/venues');
    return;
  }
  
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
}
setLoading(false);
}, [id, navigate, isDepositFlow, depositAmount, location.state]);

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
// Use the actual database booking record if available
if (bookingData.dbRecord) {
  booking = bookingData.dbRecord;
} else {
  // Fallback to constructed data
  booking = {
    id: bookingData.bookingId || bookingData.id,
    booking_date: bookingData.bookingDate || new Date().toISOString(),
    booking_time: selection.time || '19:00:00',
    guest_count: selection.guests || selection.guestCount || 2,
    table_number: selection.table?.name || selection.table?.table_number,
    total_amount: bookingData.totalAmount,
    status: 'confirmed'
  };
}

// Fetch actual venue data from database if venue_id is available
if (booking.venue_id) {
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', booking.venue_id)
    .single();
  
  if (!venueError && venueData) {
    venue = venueData;
  } else {
    console.warn('Could not fetch venue data, using fallback:', venueError);
    venue = {
      name: bookingData.venueName || selection.venueName,
      address: selection.venueAddress || 'Lagos, Nigeria',
      contact_phone: selection.venuePhone || '+234 XXX XXX XXXX',
      contact_email: selection.venueEmail || 'info@oneeddy.com',
      images: selection.venueImage ? [selection.venueImage] : [],
      dress_code: 'Smart casual'
    };
  }
} else {
  // Fallback venue data
  venue = {
    name: bookingData.venueName || selection.venueName,
    address: selection.venueAddress || 'Lagos, Nigeria',
    contact_phone: selection.venuePhone || '+234 XXX XXX XXXX',
    contact_email: selection.venueEmail || 'info@oneeddy.com',
    images: selection.venueImage ? [selection.venueImage] : [],
    dress_code: 'Smart casual'
  };
}

// Use actual customer data from form or user profile
customer = {
  full_name: bookingData.customerName || formData.fullName,
  email: bookingData.customerEmail || formData.email,
  phone: bookingData.customerPhone || formData.phone
};

// Send customer confirmation email using EmailJS
const customerEmailResult = await sendBookingConfirmation(booking, venue, customer);

// Get venue owner info if available for notification
const venueOwnerEmail = venue.contact_email || selection.ownerEmail || 'info@oneeddy.com';
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
// First check if user already exists by trying to sign them in
const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
  email: userData.email,
  password: userData.password
});

if (existingUser?.user) {
  // User already exists, just sign them in
  console.log('User already exists, signed in:', existingUser.user.id);
  return existingUser.user;
}

console.log('Creating new user account for:', userData.email);

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

if (signUpError) {
  console.error('Signup error:', signUpError);
  throw signUpError;
}

if (!newUser.user) {
  throw new Error('Failed to create user account - no user returned from signup');
}

console.log('Successfully created user:', newUser.user.id);

// Wait a moment and verify the user exists in auth.users
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

// Verify user exists in the database
const { data: userVerification, error: verifyError } = await supabase.auth.getUser();
if (verifyError || !userVerification.user || userVerification.user.id !== newUser.user.id) {
  console.error('User verification failed:', verifyError);
  throw new Error('User account creation failed - please try again');
}

console.log('User verified in database:', userVerification.user.id);

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

  // Validate that we have a valid user
  if (!currentUser || !currentUser.id) {
    throw new Error('Failed to create or authenticate user account. Please try again.');
  }

  console.log('Current user for booking:', { id: currentUser.id, email: currentUser.email });

  // Handle credit purchase flow
  if (selection.isCreditPurchase) {
    // Create venue credit record
    const { data: creditData, error: creditError } = await supabase
      .from('venue_credits')
      .insert([{
        user_id: currentUser?.id,
        venue_id: selection.venueId,
        amount: selection.creditAmount * 100, // Convert to kobo/cents
        notes: `Credit purchase for ${selection.venueName}`,
        status: 'active'
      }])
      .select()
      .single();

    if (creditError) {
      throw new Error(`Failed to create venue credits: ${creditError.message}`);
    }

    // Show success message
    toast({
      title: "Credits Purchased Successfully! 🎉",
      description: `₦${selection.creditAmount.toLocaleString()} credits added to your ${selection.venueName} account`,
      className: "bg-green-500 text-white",
    });

    // Navigate back to profile/wallet
    setTimeout(() => {
      navigate('/profile', { state: { activeTab: 'wallet' } });
    }, 2000);

    return; // Exit early for credit purchase flow
  }

  // Original booking flow continues here...
  // Prepare booking data for database
  const venueId = selection.venueId || selection.id;
  const tableId = selection.selectedTable?.id || selection.table?.id || null;
  
  // Validate required fields
  if (!venueId) {
    throw new Error('Venue ID is required for booking');
  }

  const bookingData = {
    user_id: currentUser.id, // We've already validated this exists
    venue_id: venueId,
    table_id: tableId,
    booking_date: selection.date || new Date().toISOString().split('T')[0],
    start_time: selection.time || '19:00:00',
    end_time: selection.endTime || '23:00:00',
    number_of_guests: parseInt(selection.guests) || parseInt(selection.guestCount) || 2,
    status: 'confirmed',
    total_amount: parseFloat(calculateTotal())
  };

  console.log('Booking data to insert:', bookingData);

  // Validate table_id exists if provided
  if (tableId) {
    const { data: tableExists, error: tableError } = await supabase
      .from('venue_tables')
      .select('id')
      .eq('id', tableId)
      .single();
    
    if (tableError || !tableExists) {
      console.warn('Table ID not found, proceeding without table assignment');
      bookingData.table_id = null;
    }
  }

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
if (selection?.isCreditPurchase) {
return selection.purchaseAmount.toFixed(2);
}
if (!selection) return 0;

// Handle new booking modal format vs old format
let basePrice = 0;
if (selection.isFromModal) {
// New format from booking modal
basePrice = selection.selectedTable?.price_per_hour || 50;
} else {
// Old format
basePrice = (selection.ticket?.price || 0) + (selection.table?.price || 0);
}

let total = basePrice + 25; // 25 is service fee
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
  <Link to={
    isDepositFlow ? "/profile" : 
    location.state?.creditPurchase ? "/venue-credit-purchase" :
    `/venues/${id}`
  }>
    <Button>
      {isDepositFlow ? "Back to Profile" : 
       location.state?.creditPurchase ? "Back to Credit Purchase" :
       "Back to Venue"}
    </Button>
  </Link>
</div>
);
}

return (
<div className="container py-10">
<Link to={
  isDepositFlow ? "/profile" : 
  location.state?.creditPurchase ? "/venue-credit-purchase" :
  `/venues/${id}`
} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
  <ArrowLeft className="mr-2 h-4 w-4" />
  {isDepositFlow ? "Back to Profile" : 
   location.state?.creditPurchase ? "Back to Credit Purchase" :
   "Back to Venue"}
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