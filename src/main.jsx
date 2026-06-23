import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css'; // Temporarily disabled - install mapbox-gl package to enable
import './lib/testLocationOverride'; // Load test location override utility

// FORCE LOG AT APP STARTUP
console.log('🔥 APP STARTUP - MAIN.JSX LOADED');
console.log('Current URL:', window.location.href);
console.log('Timestamp:', new Date().toISOString());

// Global Paystack callback detection - runs before React loads
(function() {
  // Check Capacitor launch URL immediately (if app was opened via deep link)
  // Use dynamic import to avoid require() error in browser
  if (typeof window !== 'undefined' && window.Capacitor) {
    // Use dynamic import instead of require
    import('@capacitor/app').then(({ App }) => {
      App.getLaunchUrl().then(({ url }) => {
        if (url) {
          console.log('📱 CAPACITOR LAUNCH URL DETECTED:', url);
          
          if (url.includes('/paystack-callback') || url.includes('/split-payment-callback') || url.includes('/credit-purchase-callback')) {
            let callbackType = 'paystack';
            if (url.includes('/split-payment-callback')) callbackType = 'split-payment';
            else if (url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
            console.log(`🔄 GLOBAL: ${callbackType} callback detected in launch URL!`);
            // Extract the path and query from the URL
            try {
              const urlObj = new URL(url);
              const callbackPath = urlObj.pathname + urlObj.search;
              console.log('🔄 Storing callback path:', callbackPath);
              sessionStorage.setItem('paystack_callback_path', callbackPath);
              sessionStorage.setItem('paystack_callback_url', url);
              
              // Extract reference for logging
              const reference = urlObj.searchParams.get('reference') || urlObj.searchParams.get('trxref');
              if (reference) {
                sessionStorage.setItem('paystack_callback_reference', reference);
              }
            } catch (e) {
              console.error('Error parsing launch URL:', e);
              // Fallback: try to extract path manually
              const match = url.match(/\/(?:paystack|split-payment|credit-purchase)-callback[^?#]*(\?[^#]*)?/);
              if (match) {
                sessionStorage.setItem('paystack_callback_path', match[0]);
                sessionStorage.setItem('paystack_callback_url', url);
              }
            }
          }
        }
      }).catch(() => {
        // No launch URL - that's fine, continue with normal check
        console.log('📱 No launch URL detected');
      });
      
      // Also listen for app URL open events (when app is already running)
      App.addListener('appUrlOpen', (data) => {
        console.log('📱 APP URL OPEN EVENT:', data.url);
        if (data.url && (data.url.includes('/paystack-callback') || data.url.includes('/split-payment-callback') || data.url.includes('/credit-purchase-callback'))) {
          let callbackType = 'paystack';
          if (data.url.includes('/split-payment-callback')) callbackType = 'split-payment';
          else if (data.url.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
          console.log(`🔄 GLOBAL: ${callbackType} callback detected in appUrlOpen event!`);
          try {
            const urlObj = new URL(data.url);
            const callbackPath = urlObj.pathname + urlObj.search;
            sessionStorage.setItem('paystack_callback_path', callbackPath);
            sessionStorage.setItem('paystack_callback_url', data.url);
            
            const reference = urlObj.searchParams.get('reference') || urlObj.searchParams.get('trxref');
            if (reference) {
              sessionStorage.setItem('paystack_callback_reference', reference);
            }
          } catch (e) {
            console.error('Error parsing appUrlOpen URL:', e);
          }
        }
      });
    }).catch((error) => {
      console.warn('Could not load Capacitor App module:', error);
      // Continue without Capacitor checks
    });
  }
  
  const checkForPaystackCallback = () => {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    // Check if URL contains Paystack callback parameters
    const hasReference = search.includes('reference=') || search.includes('trxref=');
    const isCallbackPath = pathname.includes('/paystack-callback') || pathname.includes('/split-payment-callback') || pathname.includes('/credit-purchase-callback');
    
    // Only log if we're not spamming (reduce interval or only log when something changes)
    const lastUrl = sessionStorage.getItem('last_checked_url');
    if (lastUrl !== url) {
      console.log('🔍 Global callback check:', {
        url,
        pathname,
        search,
        hasReference,
        isCallbackPath
      });
      sessionStorage.setItem('last_checked_url', url);
    }
    
    // If we have a reference parameter but we're NOT on the callback page, we need to navigate
    if (hasReference && !isCallbackPath) {
      let callbackType = 'paystack';
      if (pathname.includes('/split-payment-callback')) callbackType = 'split-payment';
      else if (pathname.includes('/credit-purchase-callback')) callbackType = 'credit-purchase';
      console.log(`🔄 GLOBAL: Detected ${callbackType} callback parameters in window.location, will navigate when React loads`);
      // Store in sessionStorage so React can pick it up
      const params = new URLSearchParams(search);
      const reference = params.get('reference') || params.get('trxref');
      sessionStorage.setItem('paystack_callback_reference', reference || '');
      sessionStorage.setItem('paystack_callback_url', url);
      sessionStorage.setItem('paystack_callback_path', pathname + search);
    }
  };
  
  // Check immediately
  checkForPaystackCallback();
  
  // Check periodically but less frequently (every 2 seconds instead of 1)
  setInterval(checkForPaystackCallback, 2000);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);