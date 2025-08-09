import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import VenueApprovalsPage from './pages/admin/VenueApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import VenueCreditPurchase from './pages/VenueCreditPurchase';
// import SupabaseTest from './components/SupabaseTest';
import AuthTestPage from './pages/AuthTestPage';
import EmailTest from './components/EmailTest';
import EmailTestPage from './pages/EmailTestPage';
import MapTest from './components/MapTest';
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
import EmailTemplateTest from './components/EmailTemplateTest';
import { supabase } from './lib/supabase';

const App = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle app/web redirects (email confirmation, etc.)
  useEffect(() => {
    const url = new URL(window.location.href);
    const target = url.searchParams.get('target');
    // Optional: tokens may be in fragment/hash for Supabase; try to extract
    const hash = window.location.hash?.replace('#', '') || '';
    const hashParams = new URLSearchParams(hash);
    const access_token = url.searchParams.get('access_token') || hashParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token') || hashParams.get('refresh_token');

    (async () => {
      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch {}

      if (target === 'signup-confirm') {
        let returnTo = url.searchParams.get('returnTo');
        if (!returnTo) {
          try { returnTo = localStorage.getItem('lagosvibe_return_to') || '/checkout'; } catch { returnTo = '/checkout'; }
        }
        // Clean stored value
        try { localStorage.removeItem('lagosvibe_return_to'); } catch {}
        navigate(returnTo, { replace: true });
      }
    })();
    // run once on mount for current URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthProvider>
      {showSplashScreen && <SplashScreen onComplete={() => setShowSplashScreen(false)} />}
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
            <Route path="/split-payment-success" element={<SplitPaymentSuccessPage />} />
            <Route path="/explore" element={<ExplorePage />} />

            {/* Customer Routes */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reset-password" element={<VenueOwnerResetPassword />} />
            <Route path="/venue-credit-purchase" element={<VenueCreditPurchase />} />

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
            <Route path="/venue-owner/credits/purchase" element={<VenueCreditPurchase />} />

            {/* Admin Routes */}
            <Route path="/admin/venue-approvals" element={<VenueApprovalsPage />} />

            {/* Test Routes */}
            {/* <Route path="/test" element={<SupabaseTest />} /> */}
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route path="/email-test" element={<EmailTest />} />
            <Route path="/email-debug" element={<EmailTestPage />} />
            <Route path="/email-templates" element={<EmailTemplateTest />} />
            <Route path="/map-test" element={<MapTest />} />

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