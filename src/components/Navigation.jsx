import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isOwner = location.pathname.includes('/venue-owner');

  const customerNavItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Venues', path: '/venues', icon: Building2 },
    { name: 'My Bookings', path: '/bookings', icon: Calendar },
    { name: 'Profile', path: '/profile', icon: User },
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
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/logos/Logo1-Trans-big.png"
              alt="VIP Club"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                console.log('❌ Logo failed to load from:', e.target.src);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="flex items-center space-x-2" style={{ display: 'none' }}>
              <div className="h-8 w-8 bg-gradient-to-br from-brand-burgundy to-brand-gold rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-heading text-brand-burgundy font-bold">VIP Club</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
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
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
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
                  <Link to="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <button className="flex items-center w-full text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-brand-burgundy"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand-burgundy/10">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors
                    ${location.pathname === item.path 
                      ? 'text-brand-gold' 
                      : 'text-brand-burgundy/70 hover:text-brand-gold'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <div className="pt-4 border-t border-brand-burgundy/10">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center space-x-2 text-sm font-medium text-brand-burgundy/70 hover:text-brand-gold mt-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
                <button
                  className="flex items-center space-x-2 text-sm font-medium text-red-600 mt-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 