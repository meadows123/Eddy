import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import VenueOwnerDashboard from './pages/venue-owner/VenueOwnerDashboard';
import VenueOwnerLogin from './pages/venue-owner/VenueOwnerLogin';
import VenueOwnerRegister from './pages/venue-owner/VenueOwnerRegister';
import VenueOwnerPending from './pages/venue-owner/VenueOwnerPending';
import VenueOwnerBookings from './pages/venue-owner/VenueOwnerBookings';
import VenueOwnerTables from './pages/venue-owner/VenueOwnerTables';
import VenueOwnerAnalytics from './pages/venue-owner/VenueOwnerAnalytics';
import VenueApprovalsPage from './pages/admin/VenueApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import SupabaseTest from './components/SupabaseTest';
import AuthTestPage from './pages/AuthTestPage';
import EmailTest from './components/EmailTest';
import MapTest from './components/MapTest';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import Map, { Marker } from 'react-map-gl';
import RegisterPage from './pages/RegisterPage';

const venues = [
  {
    id: 1,
    name: "Club DNA",
    lat: 6.5242,
    lng: 3.3789,
    price: 75000,
    rating: 4.5,
    address: "Victoria Island, Lagos",
    country: "NG"
  },
  // ...more venues
];

const App = () => {
  // State for filters
  const [minPrice, setMinPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [search, setSearch] = useState("");

  // Filtered venues
  const filteredVenues = venues.filter(v =>
    v.price >= minPrice &&
    v.rating >= minRating &&
    v.address.toLowerCase().includes(search.toLowerCase())
  );

  console.log('filteredVenues:', filteredVenues);

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetch(`https://ipinfo.io/json?token=${import.meta.env.VITE_IPINFO_TOKEN}`)
      .then(res => res.json())
      .then(data => {
        console.log('IPINFO data:', data);
        if (data && data.loc) {
          const [lat, lng] = data.loc.split(',');
          setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        } else {
          setUserLocation({ lat: 6.5244, lng: 3.3792 }); // Lagos
        }
      })
      .catch(() => {
        setUserLocation({ lat: 6.5244, lng: 3.3792 }); // Lagos
      });
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
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
            <Route path="/explore" element={<ExplorePage />} />

            {/* Customer Routes */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Venue Owner Routes */}
            <Route path="/venue-owner/login" element={<VenueOwnerLogin />} />
            <Route path="/venue-owner/register" element={<VenueOwnerRegister />} />
            <Route path="/venue-owner/pending" element={<VenueOwnerPending />} />
            <Route path="/venue-owner/dashboard" element={<VenueOwnerDashboard />} />
            <Route path="/venue-owner/bookings" element={<VenueOwnerBookings />} />
            <Route path="/venue-owner/tables" element={<VenueOwnerTables />} />
            <Route path="/venue-owner/analytics" element={<VenueOwnerAnalytics />} />

            {/* Admin Routes */}
            <Route path="/admin/venue-approvals" element={<VenueApprovalsPage />} />

            {/* Test Routes */}
            <Route path="/test" element={<SupabaseTest />} />
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route path="/email-test" element={<EmailTest />} />
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