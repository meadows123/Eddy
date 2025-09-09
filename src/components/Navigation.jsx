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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isOwner = location.pathname.includes('/venue-owner');
  
  // Detect if running on iOS
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Debug logging
  useEffect(() => {
    console.log('🔍 Navigation Debug Info:');
    console.log('📍 Current path:', location.pathname);
    console.log('👤 User:', user);
    console.log('🏢 Is Owner:', isOwner);
    console.log('🖼️ Logo loaded:', logoLoaded);
    console.log('📱 Mobile menu open:', isMobileMenuOpen);
  }, [location.pathname, user, isOwner, logoLoaded, isMobileMenuOpen]);

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

  const toggleMobileMenu = () => {
    console.log(' Mobile menu toggle clicked, current state:', isMobileMenuOpen);
    setIsMobileMenuOpen(!isMobileMenuOpen);
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

  const navItems = isOwner ? ownerNavItems : customerNavItems;

  return (
    <>
      {/* Navigation wrapper with iOS-specific top padding */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm ${
        isIOS ? 'pt-12' : 'pt-0' // Add padding top only for iOS to account for status bar
      }`}>
        <nav className={`mx-auto px-4 ${
          isIOS ? 'h-16' : 'h-14' // Slightly taller for iOS
        }`}>
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="logos/Logo1-Trans-new.png"
                alt="Eddys Members"
                className="h-8 w-auto"
                style={{ 
                  maxWidth: '120px',
                  minHeight: '24px'
                }}
                onError={(e) => {
                  console.log('❌ Navigation logo failed to load from:', e.target.src);
                  if (e.target.src.includes('Logo1-Trans-new.png')) {
                    e.target.src = 'logos/Logo1-Trans.png';
                  } else if (e.target.src.includes('Logo1-Trans.png')) {
                    e.target.src = 'logos/Logo-Trans.png';
                  } else {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline';
                  }
                }}
                onLoad={(e) => {
                  console.log('✅ Navigation logo loaded successfully from:', e.target.src);
                  setLogoLoaded(true);
                }}
              />
            </Link>

            {/* Hamburger menu button - positioned lower on iOS */}
            <button
              onClick={toggleMobileMenu}
              className={`md:hidden p-2 rounded-lg text-brand-burgundy ${
                isIOS ? 'mt-6' : 'mt-0' // Move button down on iOS
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Mobile menu panel */}
            {isMobileMenuOpen && (
              <div className={`fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md shadow-lg ${
                isIOS ? 'mt-28' : 'mt-14' // Position below status bar on iOS
              }`}>
                {/* Menu content */}
                <div className={`space-y-4 ${
                  isIOS ? 'px-4 py-6' : 'py-4'
                }`}>
                  {/* Menu items with conditional touch targets */}
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-4 font-medium transition-colors rounded-lg touch-manipulation active:bg-brand-burgundy/10 ${
                        isIOS ? 'text-base py-3 px-4' : 'text-sm py-2 px-3'
                      } ${
                        location.pathname === item.path 
                          ? 'text-brand-gold bg-brand-gold/10' 
                          : 'text-brand-burgundy/70 hover:text-brand-gold hover:bg-brand-burgundy/5'
                      }`}
                      onClick={() => {
                        console.log('📱 Mobile menu item clicked:', item.name);
                        setIsMobileMenuOpen(false);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        console.log('📱 Mobile menu item touched:', item.name);
                        setIsMobileMenuOpen(false);
                      }}
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        minHeight: isIOS ? '44px' : '36px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <item.icon className={isIOS ? "h-5 w-5" : "h-4 w-4"} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  {user ? (
                    <div className="pt-3 sm:pt-4 border-t border-brand-burgundy/10 space-y-3 sm:space-y-4">
                      <Link
                        to={isOwner ? "/venue-owner/dashboard" : "/profile"}
                        className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5 touch-manipulation"
                        onClick={() => {
                          console.log('📱 Profile clicked');
                          setIsMobileMenuOpen(false);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          console.log('📱 Profile touched');
                          setIsMobileMenuOpen(false);
                        }}
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>{isOwner ? "Dashboard" : "Profile"}</span>
                      </Link>
                      <Link
                        to={isOwner ? "/venue-owner/settings" : "/settings"}
                        className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5 touch-manipulation"
                        onClick={() => {
                          console.log('📱 Settings clicked');
                          setIsMobileMenuOpen(false);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          console.log('📱 Settings touched');
                          setIsMobileMenuOpen(false);
                        }}
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          console.log(' Logout clicked');
                          handleLogout();
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          console.log(' Logout touched');
                          handleLogout();
                        }}
                        className="flex items-center space-x-3 text-sm font-medium text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 w-full text-left touch-manipulation"
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 sm:pt-4 border-t border-brand-burgundy/10">
                      <Link
                        to={isOwner ? "/venue-owner/login" : "/profile"}
                        className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5 touch-manipulation"
                        onClick={() => {
                          console.log('📱 Sign in clicked');
                          setIsMobileMenuOpen(false);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          console.log('📱 Sign in touched');
                          setIsMobileMenuOpen(false);
                        }}
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>{isOwner ? "Venue Login" : "Sign In"}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
      
      {/* Add spacing below navigation to prevent content overlap */}
      <div className={isIOS ? 'h-28' : 'h-14'} />
    </>
  );
};

export default Navigation; 