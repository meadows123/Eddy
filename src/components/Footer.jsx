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
                src="/logos/Logo1-Trans.png"
                alt="Eddys Members"
                className="h-12 w-auto object-contain"
                style={{ maxWidth: '180px', minHeight: '48px' }}
                onError={(e) => {
                  // Try alternative logos in build order
                  if (e.target.src.includes('Logo1-Trans.png')) {
                    e.target.src = '/logos/Logo-Trans.png';
                  } else if (e.target.src.includes('Logo-Trans.png')) {
                    e.target.src = '/logos/Logo1-Trans-new.png';
                  } else {
                    // Show text fallback if all logos fail
                    e.target.style.display = 'none';
                  }
                }}
                onLoad={() => {
                  // Logo loaded successfully
                }}
              />
            </div>
            <p className="text-brand-cream/80 mb-4">
              Your premier destination for exclusive venue bookings.
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
              <li><Link to="/faq" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">For Venues</h4>
            <ul className="space-y-2">
              <li><Link to="/venue-owner/login" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Venue Login</Link></li>
              <li><Link to="/venue-owner/register" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Join as Partner</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contact Info</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:info@oneeddy.com" className="text-brand-cream/80 hover:text-white transition-colors">
                  info@oneeddy.com
                </a>
              </li>
              <li><Link to="/contact" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/privacy" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" onClick={handleLinkClick} className="text-brand-cream/80 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-brand-cream/10 mt-8 pt-8 text-center">
          <p className="text-brand-cream/80">&copy; {currentYear} Eddys Members. All rights reserved. Built in memory of Eddy.</p>
          <p className="mt-2 text-brand-cream/80">
            Developed by{' '}
            <a
              href="https://www.conxiea.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-brand-gold transition-colors underline font-semibold"
            >
              Conxiea
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;