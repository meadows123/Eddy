import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { 
  Home, 
  Building2, 
  Calendar, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // Force the mobile menu to close when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = (e) => {
    if (e) {
      e.preventDefault(); // Prevent any default behavior
      e.stopPropagation(); // Stop event bubbling
    }
    setIsMobileMenuOpen(!isMobileMenuOpen);
    console.log('📱 Toggling mobile menu:', !isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Close mobile menu if open
      setIsMobileMenuOpen(false);
      // Redirect to home page after logout
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const customerNavItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Venues', path: '/venues', icon: Building2 },
    ...(user ? [{ name: 'My Bookings', path: '/bookings', icon: Calendar }] : []),
  ];

  const ownerNavItems = [
    { name: 'Dashboard', path: '/venue-owner/dashboard', icon: Home },
    { name: 'Bookings', path: '/venue-owner/bookings', icon: Calendar },
    { name: 'Tables', path: '/venue-owner/tables', icon: Building2 },
    { name: 'Analytics', path: '/venue-owner/analytics', icon: Settings },
  ];

  const navItems = user ? (user.isOwner ? ownerNavItems : customerNavItems) : customerNavItems;

  return (
    <>
      {/* Safe area spacer for iOS */}
      {isIOS && <div className="h-12 bg-white" />}

      {/* Main navigation */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm ${
        isIOS ? 'mt-12' : 'mt-0' // Add margin top for iOS to account for safe area
      }`}>
        <nav className="mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="/logos/Logo1-Trans-new.png"
                alt="Eddys Members"
                className="h-8 w-auto"
                style={{ maxWidth: '120px' }}
              />
            </Link>

            {/* Hamburger menu button with larger touch target */}
            <button
              onClick={toggleMobileMenu}
              onTouchEnd={toggleMobileMenu}
              className="md:hidden p-4 -mr-4 touch-manipulation"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-brand-burgundy" />
              ) : (
                <Menu className="h-6 w-6 text-brand-burgundy" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg">
            <div className="px-4 py-4 space-y-4">
              {/* Your menu items here */}
              <Link
                to="/"
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-brand-burgundy/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              {/* Add other menu items similarly */}
            </div>
          </div>
        )}
      </div>

      {/* Content spacer */}
      <div className={isIOS ? 'h-28' : 'h-16'} />
    </>
  );
};

export default Navigation; 