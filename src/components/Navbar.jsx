import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Home, Compass, MapPin, CalendarDays, UserCircle, Wine } from 'lucide-react'; // Wine for brand icon
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/home', icon: <Home className="h-4 w-4 mr-1" /> },
    { name: 'Venues', path: '/venues', icon: <MapPin className="h-4 w-4 mr-1" /> },
    { name: 'Explore', path: '/explore', icon: <Compass className="h-4 w-4 mr-1" /> },
    { name: 'Events', path: '/events', icon: <CalendarDays className="h-4 w-4 mr-1" /> },
    { name: 'Profile', path: '/profile', icon: <UserCircle className="h-4 w-4 mr-1" /> },
    // { name: 'Admin', path: '/admin', icon: <ShieldCheck className="h-4 w-4 mr-1" /> }, // Admin link removed for now
  ];

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-burgundy/20 bg-brand-cream/90 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/70">
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.img
            src="/logos/Logo1-Trans.png"
            alt="Eddy Members"
            className="h-12 w-auto object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            onLoad={() => console.log('✅ Navbar logo loaded successfully')}
            onError={(e) => {
              console.log('❌ Navbar logo failed to load from:', e.target.src);
              // Try alternative logos in build order
              if (e.target.src.includes('Logo1-Trans.png')) {
                e.target.src = '/logos/Logo-Trans.png';
              } else if (e.target.src.includes('Logo-Trans.png')) {
                e.target.src = '/logos/Logo1-Trans-new.png';
              } else {
                // Show text fallback if all logos fail
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
          <motion.div
            className="flex items-center gap-2"
            style={{ display: 'none' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-10 w-10 bg-gradient-to-br from-brand-burgundy to-brand-gold rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-brand-burgundy">
              VIP Club
            </span>
          </motion.div>
        </Link>

        <nav className="hidden md:flex items-center gap-x-6 lg:gap-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-secondary flex items-center ${
                location.pathname === link.path // Simplified active state check
                  ? 'text-secondary font-semibold'
                  : 'text-primary/80 hover:text-secondary'
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
           <Button asChild size="sm" className="bg-[#5B0202] text-white hover:bg-[#5B0202]/90 transition-opacity rounded-full px-6 py-2.5">
            <Link to="/venues">Book Now</Link>
          </Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary hover:text-secondary"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-0 right-0 bg-background border-b border-primary/20 p-4 md:hidden shadow-lg"
          >
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-base font-medium transition-colors hover:text-secondary flex items-center py-2 ${
                    location.pathname === link.path
                      ? 'text-secondary font-semibold'
                      : 'text-primary/80 hover:text-secondary'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
              <Button asChild size="sm" className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-opacity rounded-full py-3">
                <Link to="/venues" onClick={() => setIsOpen(false)}>Book Now</Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Navbar;