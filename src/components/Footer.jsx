import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useScrollToTop } from '@/lib/useScrollToTop';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const scrollToTop = useScrollToTop();

  const handleLinkClick = () => {
    scrollToTop();
  };

  return (
    <footer className="bg-brand-burgundy text-brand-cream py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <img
                src="/images/logos/Logo1-Trans.png"
                alt="VIP Club"
                className="h-8 w-auto"
              />
              <h3 className="text-xl font-heading font-bold text-white" style={{ display: 'none' }}>
                VIP Club
              </h3>
            </div>
            <p className="text-brand-cream/80 mb-4">
              Your premier destination for exclusive venue bookings in Lagos.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/eddy.members?igsh=aXZmNXBocTE2Mmxx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-cream/80 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-cream/80 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.10z"/>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/venues" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Venues</Link></li>
              <li><Link to="/about" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">For Venues</h4>
            <ul className="space-y-2">
              <li><Link to="/venue-owner/login" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/venue-owner/register" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/faq" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-brand-cream/10 mt-8 pt-8 text-center text-brand-cream/60">
          <p>&copy; {currentYear} VIP Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;