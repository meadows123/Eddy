import React from 'react';
import { Link } from 'react-router-dom';
import { Wine, Facebook, Instagram, Twitter } from 'lucide-react'; // Wine for brand icon
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import FooterLogo from '/images/logos/Logo1-Trans.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-burgundy text-brand-cream py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <img 
                src={FooterLogo} 
                alt="VIP Club" 
                className="h-16 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
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
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-brand-cream/80 hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com" 
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
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/venues" className="text-brand-cream/80 hover:text-white">Venues</Link></li>
              <li><Link to="/about" className="text-brand-cream/80 hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="text-brand-cream/80 hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">For Venues</h4>
            <ul className="space-y-2">
              <li><Link to="/venue-owner/login" className="text-brand-cream/80 hover:text-white">Login</Link></li>
              <li><Link to="/venue-owner/register" className="text-brand-cream/80 hover:text-white">Register</Link></li>
              <li><Link to="/venue-owner/features" className="text-brand-cream/80 hover:text-white">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-brand-cream/80 hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-brand-cream/80 hover:text-white">Terms of Service</Link></li>
              <li><Link to="/faq" className="text-brand-cream/80 hover:text-white">FAQ</Link></li>
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