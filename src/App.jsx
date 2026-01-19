import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import './lib/testLocationOverride'; // Test location override utility
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ChatBot from './components/ChatBot';

// Component to handle Paystack callback detection
const PaystackCallbackHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if we're currently on a callback page or have callback parameters in URL
    const currentPathCheck = location.pathname;
    const isOnCallbackPage = currentPathCheck.includes('/paystack-callback') || 
                             currentPathCheck.includes('/split-payment-callback') || 
                             currentPathCheck.includes('/credit-purchase-callback');
    const urlSearchParams = new URLSearchParams(location.search);
    const hasReferenceInUrl = !!(urlSearchParams.get('reference') || urlSearchParams.get('trxref'));
    
    // PRIORITY 1: Check sessionStorage for callback path (set by global listener in main.jsx)
    // BUT only use it if we're actually on a callback URL or have a reference parameter
    const storedCallbackPath = sessionStorage.getItem('paystack_callback_path');
    const storedCallbackUrl = sessionStorage.getItem('paystack_callback_url');
    const storedReference = sessionStorage.getItem('paystack_callback_reference');
    
    // Only use stored callback data if we're actually in a callback context
    if (storedCallbackPath && (isOnCallbackPage || hasReferenceInUrl)) {
      console.log('🔄 App detected Paystack callback path in sessionStorage:', {
        path: storedCallbackPath,
        url: storedCallbackUrl,
        reference: storedReference,
        isOnCallbackPage,
        hasReferenceInUrl
      });
      
      // Clear path and URL, but KEEP the reference for the callback page to use
      // The callback page component will clear the reference after using it
      sessionStorage.removeItem('paystack_callback_path');
      sessionStorage.removeItem('paystack_callback_url');
      // DON'T clear paystack_callback_reference here - let the callback page use it
      
      // Navigate immediately
      navigate(storedCallbackPath, { replace: true });
      return;
    } else if (storedCallbackPath && !isOnCallbackPage && !hasReferenceInUrl) {
      // Stale data - clear it to prevent false redirects
      console.log('🧹 Clearing stale callback data from sessionStorage (not in callback context)');
      sessionStorage.removeItem('paystack_callback_path');
      sessionStorage.removeItem('paystack_callback_url');
      sessionStorage.removeItem('paystack_callback_reference');
    }
    
    if (storedCallbackUrl && storedReference && (isOnCallbackPage || hasReferenceInUrl)) {
      console.log('🔄 App detected Paystack callback URL in sessionStorage:', {
        url: storedCallbackUrl,
        reference: storedReference
      });
      sessionStorage.removeItem('paystack_callback_url');
      // DON'T clear paystack_callback_reference here - let the callback page use it
      
      try {
        const url = new URL(storedCallbackUrl);
        navigate(`${url.pathname}${url.search}`, { replace: true });
        return;
      } catch (e) {
        console.error('Error parsing callback URL:', e);
        // Fallback: just navigate with reference
        navigate(`/paystack-callback?reference=${storedReference}`, { replace: true });
        return;
      }
    } else if (storedCallbackUrl && storedReference && !isOnCallbackPage && !hasReferenceInUrl) {
      // Stale data - clear it
      console.log('🧹 Clearing stale callback URL/reference from sessionStorage');
      sessionStorage.removeItem('paystack_callback_url');
      sessionStorage.removeItem('paystack_callback_reference');
    }
    
    // Check if we're on a Paystack callback URL (regular, split payment, or credit purchase)
    const callbackCheckPath = location.pathname;
    const callbackSearchParams = new URLSearchParams(location.search);
    const callbackReference = callbackSearchParams.get('reference') || callbackSearchParams.get('trxref');
    const isSplitPayment = callbackCheckPath.includes('/split-payment-callback');
    const isCreditPurchase = callbackCheckPath.includes('/credit-purchase-callback');
    const isRegularPayment = callbackCheckPath.includes('/paystack-callback');
    
    // If we're NOT on the callback page but URL has callback parameters, navigate there
    if (!isSplitPayment && !isCreditPurchase && !isRegularPayment && callbackReference) {
      // Determine which callback page to use based on stored path or default to regular
      const storedPath = sessionStorage.getItem('paystack_callback_path') || '';
      let callbackPath = '/paystack-callback';
      if (storedPath.includes('/split-payment-callback')) callbackPath = '/split-payment-callback';
      else if (storedPath.includes('/credit-purchase-callback')) callbackPath = '/credit-purchase-callback';
      console.log('🔄 App detected Paystack callback parameters in URL, navigating to callback page...');
      console.log('Reference:', callbackReference, 'Callback path:', callbackPath);
      navigate(`${callbackPath}?reference=${callbackReference}${callbackSearchParams.toString().includes('status') ? '&status=' + callbackSearchParams.get('status') : ''}`, { replace: true });
      return;
    }
    
    // Also check window.location directly (in case React Router hasn't updated yet)
    const windowUrl = window.location.href;
    const windowPath = window.location.pathname;
    const windowSearch = window.location.search;
    
    if ((windowUrl.includes('/paystack-callback') || windowUrl.includes('/split-payment-callback') || windowUrl.includes('/credit-purchase-callback')) && !isSplitPayment && !isCreditPurchase && !isRegularPayment) {
      let callbackType = 'paystack';
      let targetPath = '/paystack-callback';
      if (windowUrl.includes('/split-payment-callback')) {
        callbackType = 'split-payment';
        targetPath = '/split-payment-callback';
      } else if (windowUrl.includes('/credit-purchase-callback')) {
        callbackType = 'credit-purchase';
        targetPath = '/credit-purchase-callback';
      }
      console.log(`🔄 App detected ${callbackType} callback in window.location but not in React Router, navigating...`);
      console.log('Window URL:', windowUrl);
      const urlParams = new URLSearchParams(windowSearch);
      const ref = urlParams.get('reference') || urlParams.get('trxref');
      if (ref) {
        navigate(`${targetPath}?reference=${ref}${windowSearch}`, { replace: true });
        return;
      }
    }
    
    // Also listen for Capacitor app URL open events
    if (typeof window !== 'undefined' && window.Capacitor) {
      // Use dynamic import instead of require
      import('@capacitor/app').then(({ App }) => {
        const handleAppUrlOpen = (data) => {
          console.log('📱 App opened with URL:', data.url);
          if (data.url && (data.url.includes('/paystack-callback') || data.url.includes('/split-payment-callback') || data.url.includes('/credit-purchase-callback'))) {
            let callbackType = 'paystack';
            if (data.url.includes('/split-payment-callback')) callbackType = 'split-payment';
            else if (data.url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
            console.log(`🔄 App detected ${callbackType} callback in app URL open event`);
            try {
              const url = new URL(data.url);
              navigate(`${url.pathname}${url.search}`, { replace: true });
            } catch (e) {
              console.error('Error parsing app URL:', e);
              // Extract reference manually
              const match = data.url.match(/[?&#](?:reference|trxref)=([^&#]+)/);
              if (match) {
                let targetPath = '/paystack-callback';
                if (data.url.includes('/split-payment-callback')) targetPath = '/split-payment-callback';
                else if (data.url.includes('/credit-purchase-callback')) targetPath = '/credit-purchase-callback';
                navigate(`${targetPath}?reference=${match[1]}`, { replace: true });
              }
            }
          }
        };
        
        App.addListener('appUrlOpen', handleAppUrlOpen);
        
        // Check launch URL on mount (IMMEDIATELY - don't wait)
        App.getLaunchUrl().then(({ url }) => {
          if (url && (url.includes('/paystack-callback') || url.includes('/split-payment-callback') || url.includes('/credit-purchase-callback'))) {
            let callbackType = 'paystack';
            if (url.includes('/split-payment-callback')) callbackType = 'split-payment';
            else if (url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
            console.log(`🔄 App detected ${callbackType} callback in launch URL (from handler):`, url);
            try {
              const urlObj = new URL(url);
              const callbackPath = `${urlObj.pathname}${urlObj.search}`;
              console.log('🔄 Navigating to callback path:', callbackPath);
              navigate(callbackPath, { replace: true });
              return; // Exit early
            } catch (e) {
              console.error('Error parsing launch URL:', e);
              const match = url.match(/[?&#](?:reference|trxref)=([^&#]+)/);
              if (match) {
                navigate(`/paystack-callback?reference=${match[1]}`, { replace: true });
                return; // Exit early
              }
            }
          }
        }).catch(() => {
          // No launch URL - that's fine
        });
        
        return () => {
          App.removeAllListeners();
        };
      }).catch((error) => {
        console.warn('Could not load Capacitor App module in handler:', error);
      });
    }
  }, [location, navigate]);
  
  return null; // This component doesn't render anything
};
import LandingPage from './pages/LandingPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import VenueOwnerDashboard from './pages/venue-owner/VenueOwnerDashboard';
import VenueOwnerLogin from './pages/venue-owner/VenueOwnerLogin';
import VenueOwnerRegister from './pages/venue-owner/VenueOwnerRegister';
import VenueOwnerResetPassword from './pages/venue-owner/VenueOwnerResetPassword';
import VenueOwnerPending from './pages/venue-owner/VenueOwnerPending';
import VenueOwnerBookings from './pages/venue-owner/VenueOwnerBookings';
import VenueOwnerTables from './pages/venue-owner/VenueOwnerTables';
import VenueOwnerAnalytics from './pages/venue-owner/VenueOwnerAnalytics';
import VenueOwnerSettings from './pages/venue-owner/VenueOwnerSettings';
import VenueOwnerCredits from './pages/venue-owner/VenueOwnerCredits';
import VenueOwnerReceipts from './pages/venue-owner/VenueOwnerReceipts';
import QRScannerPage from './pages/venue-owner/QRScannerPage';
import VenueOwnerStripeSetup from './pages/venue-owner/VenueOwnerStripeSetup';
import VenueApprovalsPage from './pages/admin/VenueApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import VenueCreditPurchase from './pages/VenueCreditPurchase';
import CreditPurchaseCheckout from './pages/CreditPurchaseCheckout';
// import SupabaseTest from './components/SupabaseTest';
// import AuthTestPage from './pages/AuthTestPage';
// import EmailTest from './components/EmailTest';
// import EmailTestPage from './pages/EmailTestPage';
// import MapTest from './components/MapTest';
import SplitPaymentPage from './pages/SplitPaymentPage';
import SplitPaymentSuccessPage from './pages/SplitPaymentSuccessPage';
import SplitPaymentCallbackPage from './pages/SplitPaymentCallbackPage';
import PaystackCallbackPage from './pages/PaystackCallbackPage';
import CreditPurchaseCallbackPage from './pages/CreditPurchaseCallbackPage';
import CreditPurchaseSuccessPage from './pages/CreditPurchaseSuccessPage';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
// New pages for footer links
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import FAQPage from './pages/FAQPage';
import DataDeletionPage from './pages/DataDeletionPage';
// import EmailTemplateTest from './components/EmailTemplateTest';

const App = () => {
  // FORCE LOG WHEN APP COMPONENT LOADS
  console.log('🔥 APP COMPONENT LOADED');
  console.log('Current path:', window.location.pathname);

  return (
    <AuthProvider>
      <PaystackCallbackHandler />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ScrollToTop />
        <Navigation />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/:id" element={<VenueDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:id" element={<CheckoutPage />} />
            <Route path="/checkout/deposit" element={<CheckoutPage />} />
            <Route path="/split-payment/:bookingId/:requestId" element={<SplitPaymentPage />} />
            <Route path="/split-payment-callback" element={<SplitPaymentCallbackPage />} />
            <Route path="/split-payment-success" element={<SplitPaymentSuccessPage />} />
            <Route path="/paystack-callback" element={<PaystackCallbackPage />} />
            <Route path="/credit-purchase-callback" element={<CreditPurchaseCallbackPage />} />
            <Route path="/credit-purchase-success" element={<CreditPurchaseSuccessPage />} />
            <Route path="/explore" element={<ExplorePage />} />

            {/* Customer Routes */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reset-password" element={<VenueOwnerResetPassword />} />
            <Route path="/venue-credit-purchase" element={<VenueCreditPurchase />} />
            <Route path="/credit-purchase-checkout" element={<CreditPurchaseCheckout />} />

            {/* Information Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/delete-data" element={<DataDeletionPage />} />

            {/* Venue Owner Routes */}
            <Route path="/venue-owner/login" element={<VenueOwnerLogin />} />
            <Route path="/venue-owner/register" element={<VenueOwnerRegister />} />
            <Route path="/venue-owner/reset-password" element={<VenueOwnerResetPassword />} />
            <Route path="/venue-owner/pending" element={<VenueOwnerPending />} />
            <Route path="/venue-owner/dashboard" element={<VenueOwnerDashboard />} />
            <Route path="/venue-owner/bookings" element={<VenueOwnerBookings />} />
            <Route path="/venue-owner/tables" element={<VenueOwnerTables />} />
            <Route path="/venue-owner/analytics" element={<VenueOwnerAnalytics />} />
            <Route path="/venue-owner/settings" element={<VenueOwnerSettings />} />
            <Route path="/venue-owner/credits" element={<VenueOwnerCredits />} />
            <Route path="/venue-owner/receipts" element={<VenueOwnerReceipts />} />
            <Route path="/venue-owner/qr-scanner" element={<QRScannerPage />} />
            <Route path="/venue-owner/stripe-setup" element={<VenueOwnerStripeSetup />} />
            <Route path="/venue-owner/credits/purchase" element={<VenueCreditPurchase />} />

            {/* Admin Routes */}
            <Route path="/admin/venue-approvals" element={<VenueApprovalsPage />} />

            {/* Test Routes */}
            {/* <Route path="/test" element={<SupabaseTest />} /> */}
            {/* <Route path="/auth-test" element={<AuthTestPage />} /> */}
            {/* <Route path="/email-test" element={<EmailTest />} /> */}
            {/* <Route path="/email-debug" element={<EmailTestPage />} /> */}
            {/* <Route path="/email-templates" element={<EmailTemplateTest />} /> */}
            {/* <Route path="/map-test" element={<MapTest />} /> */}

            {/* Register Route */}
            <Route path="/register" element={<RegisterPage />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ChatBot />
        <Toaster />
      </div>
    </AuthProvider>
  );
};

export default App;