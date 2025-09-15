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
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safely get auth context with error handling
  let user = null;
  let signOut = () => {};
  let loading = false;
  
  try {
    const auth = useAuth();
    user = auth?.user || null;
    signOut = auth?.signOut || (() => {});
    loading = auth?.loading || false;
  } catch (error) {
    console.warn('Auth context not available:', error);
  }
  
  const isOwner = location.pathname.includes('/venue-owner');
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show nav when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsNavVisible(true);
      } else {
        setIsNavVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Force the mobile menu to close when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      setIsMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMobileMenu = () => {
    console.log('📱 Mobile menu toggle clicked, current state:', isMobileMenuOpen);
    setIsMobileMenuOpen(prev => !prev);
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
      {/* Safe area spacer for iOS */}
      {isIOS && <div className="h-8 bg-white" />}

      {/* Main navigation */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-transform duration-300 ${
        isIOS ? 'mt-8' : 'mt-0'
      } ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <nav className="mx-auto px-4 h-12">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="/logos/Logo1-Trans-new.png"
                alt="Eddys Members"
                className="h-6 w-auto"
                style={{ maxWidth: '100px' }}
                onError={(e) => {
                  console.log('❌ Navigation logo failed to load from:', e.target.src);
                  if (e.target.src.includes('Logo1-Trans-new.png')) {
                    e.target.src = '/logos/Logo1-Trans.png';
                  } else if (e.target.src.includes('Logo1-Trans.png')) {
                    e.target.src = '/logos/Logo-Trans.png';
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 text-xs font-medium transition-colors
                    ${location.pathname === item.path 
                      ? 'text-brand-gold' 
                      : 'text-brand-burgundy/70 hover:text-brand-gold'
                    }`}
                >
                  <item.icon className="h-3 w-3" />
                  <span>{item.name}</span>
                </Link>
              ))}
              {!isOwner && (
                <Link
                  to="/profile"
                  className={`flex items-center space-x-1 text-xs font-medium transition-colors
                    ${location.pathname === '/profile' 
                      ? 'text-brand-gold' 
                      : 'text-brand-burgundy/70 hover:text-brand-gold'
                    }`}
                >
                  <User className="h-3 w-3" />
                  <span>Profile</span>
                </Link>
              )}
            </div>

            {/* Desktop User Menu - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-6 w-6 rounded-full">
                      <User className="h-3 w-3" />
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
                    <Button variant="outline" size="sm" className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 text-xs px-2 py-1">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button - Only visible on mobile */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden flex items-center justify-center w-8 h-8 text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-colors"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-brand-burgundy/5 text-brand-burgundy"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              ))}
              
              {user ? (
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <Link
                    to={isOwner ? "/venue-owner/dashboard" : "/profile"}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-brand-burgundy/5 text-brand-burgundy"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium text-sm">{isOwner ? "Dashboard" : "Profile"}</span>
                  </Link>
                  <Link
                    to={isOwner ? "/venue-owner/settings" : "/settings"}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-brand-burgundy/5 text-brand-burgundy"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="font-medium text-sm">Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-red-50 w-full text-left text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium text-sm">Log out</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-200">
                  <Link
                    to={isOwner ? "/venue-owner/login" : "/profile"}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-brand-burgundy/5 text-brand-burgundy"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium text-sm">{isOwner ? "Venue Login" : "Sign In"}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content spacer */}
      <div className={isIOS ? 'h-20' : 'h-12'} />
    </>
  );
};

export default Navigation;