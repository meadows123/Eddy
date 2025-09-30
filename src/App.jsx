import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Toaster } from './components/ui/toaster';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import SplashScreen from './components/SplashScreen';
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
// import QRCodeTest from './components/QRCodeTest';
import VenueApprovalsPage from './pages/admin/VenueApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import VenueCreditPurchase from './pages/VenueCreditPurchase';
import CreditPurchaseCheckout from './pages/CreditPurchaseCheckout';
import SplitPaymentPage from './pages/SplitPaymentPage';
import SplitPaymentSuccessPage from './pages/SplitPaymentSuccessPage';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
// New pages for footer links
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import FAQPage from './pages/FAQPage';
import { supabase } from './lib/supabase.js';
import OpenRedirect from './pages/OpenRedirect';
import AppRedirectPage from './pages/AppRedirectPage.jsx';

const App = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle app/web redirects (email confirmation, etc.)
  useEffect(() => {
    // If someone lands directly on a confirmation URL without /open, try to detect and forward to /open
    const url = new URL(window.location.href);
    const hasTokens = url.searchParams.get('access_token') || new URLSearchParams(window.location.hash.replace('#','')).get('access_token');
    const target = url.searchParams.get('target') || new URLSearchParams(window.location.hash.replace('#','')).get('target');
    if (hasTokens || target) {
      navigate('/open' + url.search, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle deep links from mobile app (oneeddy:// scheme)
  useEffect(() => {
    const handleAppUrlOpen = (data) => {
      try {
        const url = new URL(data.url);
        if (url.protocol === 'oneeddy:') {
          const host = url.host; // e.g. 'admin' for oneeddy://admin/venue-approvals
          const pathname = url.pathname; // e.g. '/venue-approvals'
          const search = url.search || '';

          // Build an app route from scheme + host + path
          // Supports both:
          // - oneeddy://admin/venue-approvals           -> /admin/venue-approvals
          // - oneeddy:///admin/venue-approvals          -> /admin/venue-approvals
          let route = pathname;
          if (host) {
            route = `/${host}${pathname}`;
          }

          // Ensure route starts with '/'
          if (!route.startsWith('/')) {
            route = `/${route}`;
          }

          const finalRoute = `${route}${search}`;
          navigate(finalRoute, { replace: true });
        }
      } catch (error) {
        // Handle deep link error silently in production
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return (
    <AuthProvider>
      {showSplashScreen && <SplashScreen onComplete={() => setShowSplashScreen(false)} />}
      <div className="min-h-screen w-full bg-gray-50 flex flex-col overflow-x-hidden">
        <ScrollToTop />
        <Navigation />
        <main className="flex-grow w-full overflow-x-hidden">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/:id" element={<VenueDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:id" element={<CheckoutPage />} />
            <Route path="/checkout/deposit" element={<CheckoutPage />} />
            <Route path="/split-payment" element={<Navigate to="/profile" replace />} />
            <Route path="/split-payment/:bookingId/:requestId" element={<SplitPaymentPage />} />
            <Route path="/split-payment-success" element={<SplitPaymentSuccessPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/open" element={<OpenRedirect />} />
            <Route path="/app-redirect" element={<AppRedirectPage />} />

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
            <Route path="/venue-owner/qr-scanner" element={<CameraQRScanner onMemberScanned={(data) => console.log('Member scanned:', data)} />} />
            <Route path="/venue-owner/credits/purchase" element={<VenueCreditPurchase />} />

            {/* Admin Routes */}
            <Route path="/admin/venue-approvals" element={<VenueApprovalsPage />} />


            {/* Register Route */}
            <Route path="/register" element={<RegisterPage />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <Toaster />
      </div>
    </AuthProvider>
  );
};

export default App;