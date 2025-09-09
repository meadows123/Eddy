import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { Capacitor } from '@capacitor/core';

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
    <nav className="bg-white border-b border-brand-burgundy/10 relative">
      <div className="container mx-auto px-4">
        <div className={`flex justify-between items-center ${
          isIOS ? 'h-16 sm:h-18 md:h-20' : 'h-14 sm:h-16'
        }`}>
          {/* Logo with conditional sizing */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="logos/Logo1-Trans-new.png"
              alt="Eddys Members"
              className={`w-auto object-contain ${
                isIOS ? 'h-8 sm:h-10 md:h-12' : 'h-6 sm:h-8 md:h-10'
              }`}
              style={{ 
                maxWidth: isIOS ? '140px' : '120px', 
                minHeight: isIOS ? '32px' : '24px' 
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 text-sm font-medium transition-colors
                  ${location.pathname === item.path 
                    ? 'text-brand-gold' 
                    : 'text-brand-burgundy/70 hover:text-brand-gold'
                  }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            ))}
            {/* Add Profile link to desktop navigation for customers */}
            {!isOwner && (
              <Link
                to="/profile"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors
                  ${location.pathname === '/profile' 
                    ? 'text-brand-gold' 
                    : 'text-brand-burgundy/70 hover:text-brand-gold'
                  }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link to={isOwner ? "/venue-owner/dashboard" : "/profile"} className="flex items-center w-full">
                      <User className="mr-2 h-4 w-4" />
                      {isOwner ? "Dashboard" : "Profile"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={isOwner ? "/venue-owner/settings" : "/settings"} className="flex items-center w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/profile">
                  <Button variant="outline" size="sm" className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger button with conditional styling */}
          <button
            className={`md:hidden text-brand-burgundy touch-manipulation active:bg-brand-burgundy/10 rounded-lg transition-colors ${
              isIOS ? 'p-3' : 'p-2'
            }`}
            onClick={toggleMobileMenu}
            onTouchStart={(e) => {
              e.preventDefault();
              toggleMobileMenu();
            }}
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              minWidth: isIOS ? '44px' : '36px',
              minHeight: isIOS ? '44px' : '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className={isIOS ? "h-6 w-6" : "h-5 w-5 sm:h-6 sm:w-6"} />
            ) : (
              <Menu className={isIOS ? "h-6 w-6" : "h-5 w-5 sm:h-6 sm:w-6"} />
            )}
          </button>
        </div>

        {/* Mobile menu with conditional styling */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden bg-white border-t border-brand-burgundy/10 shadow-lg"
            style={{
              position: 'relative',
              zIndex: 9999,
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              marginTop: isIOS ? '8px' : '0px',
              borderRadius: isIOS ? '0 0 12px 12px' : '0'
            }}
          >
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
  );
};

export default Navigation; 