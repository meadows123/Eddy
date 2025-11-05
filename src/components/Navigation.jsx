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

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, loading } = useAuth();
  const isOwner = location.pathname.includes('/venue-owner');


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
    // My Bookings is conditionally shown in the navigation rendering, not in the array definition
  ];

  const ownerNavItems = [
    { name: 'Dashboard', path: '/venue-owner/dashboard', icon: Home },
    { name: 'Bookings', path: '/venue-owner/bookings', icon: Calendar },
    { name: 'Tables', path: '/venue-owner/tables', icon: Building2 },
    { name: 'Analytics', path: '/venue-owner/analytics', icon: Settings },
  ];

  const navItems = isOwner ? ownerNavItems : customerNavItems;

  return (
    <nav className="bg-white border-b border-brand-burgundy/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/logos/Logo1-Trans-new.png"
              alt="Eddys Members"
              className="h-6 w-auto object-contain sm:h-8 md:h-10"
              style={{ maxWidth: '120px', minHeight: '24px' }}
              onError={(e) => {
                if (e.target.src.includes('Logo1-Trans-new.png')) {
                  e.target.src = '/logos/Logo1-Trans.png';
                } else if (e.target.src.includes('Logo1-Trans.png')) {
                  e.target.src = '/logos/Logo-Trans.png';
                } else {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline';
                }
              }}
              onLoad={() => {
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
            {/* Conditionally show My Bookings for authenticated customers */}
            {!isOwner && user && (
              <Link
                to="/bookings"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors
                  ${location.pathname === '/bookings' 
                    ? 'text-brand-gold' 
                    : 'text-brand-burgundy/70 hover:text-brand-gold'
                  }`}
              >
                <Calendar className="h-4 w-4" />
                <span>My Bookings</span>
              </Link>
            )}
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
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            ) : user ? (
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

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-brand-burgundy"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand-burgundy/10">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 text-sm font-medium transition-colors py-2 px-3 rounded-lg
                    ${location.pathname === item.path 
                      ? 'text-brand-gold bg-brand-gold/10' 
                      : 'text-brand-burgundy/70 hover:text-brand-gold hover:bg-brand-burgundy/5'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              {/* Conditionally show My Bookings for authenticated customers */}
              {!isOwner && user && (
                <Link
                  to="/bookings"
                  className={`flex items-center space-x-3 text-sm font-medium transition-colors py-2 px-3 rounded-lg
                    ${location.pathname === '/bookings' 
                      ? 'text-brand-gold bg-brand-gold/10' 
                      : 'text-brand-burgundy/70 hover:text-brand-gold hover:bg-brand-burgundy/5'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Calendar className="h-4 w-4" />
                  <span>My Bookings</span>
                </Link>
              )}
              {loading ? (
                <div className="pt-3 sm:pt-4 border-t border-brand-burgundy/10 space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-3 py-2 px-3">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ) : user ? (
                <div className="pt-3 sm:pt-4 border-t border-brand-burgundy/10 space-y-3 sm:space-y-4">
                  <Link
                    to={isOwner ? "/venue-owner/dashboard" : "/profile"}
                    className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{isOwner ? "Dashboard" : "Profile"}</span>
                  </Link>
                  <Link
                    to={isOwner ? "/venue-owner/settings" : "/settings"}
                    className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 text-sm font-medium text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 sm:pt-4 border-t border-brand-burgundy/10">
                  <Link
                    to={isOwner ? "/venue-owner/login" : "/profile"}
                    className="flex items-center space-x-3 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold py-2 px-3 rounded-lg hover:bg-brand-burgundy/5"
                    onClick={() => setIsMobileMenuOpen(false)}
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