/**
 * App Redirect Script
 * Tries to open the mobile app first, then falls back to web app
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  function initAppRedirect() {
    try {
      // Only run on mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Check if we're already in the app (Capacitor)
      const isInApp = window.Capacitor || window.cordova || window.ionic;

      // Only redirect if:
      // 1. User is on mobile
      // 2. Not already in the app
      // 3. This is the first visit (not a redirect)
      // 4. DOM is ready (document.body exists)
      const shouldRedirect = isMobile && !isInApp && !sessionStorage.getItem('appRedirectAttempted') && document.body;

      if (!shouldRedirect) {
        return;
      }

      // Mark that we've attempted redirect to prevent loops
      sessionStorage.setItem('appRedirectAttempted', 'true');
      
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      
      // Android Intent URL - use universal link instead for better compatibility
      const androidIntent = `intent://oneeddy.com${currentPath}#Intent;scheme=https;package=com.oneeddy.members;end`;
      
      // iOS Custom URL Scheme
      const iosScheme = `com.oneeddy.members://${currentPath}`;
      
      // Universal Link (works for both iOS and Android if properly configured)
      const universalLink = `https://oneeddy.com${currentPath}`;
      
      // Detect platform
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // Try to open the app with error handling
      const timeout = setTimeout(function() {
        // App didn't open, clear the flag so user can navigate normally
        sessionStorage.removeItem('appRedirectAttempted');
      }, 2500);
      
      // Create hidden iframe to attempt app launch (iOS)
      if (isIOS && document.body) {
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = 'none';
          iframe.src = iosScheme;
          
          if (document.body) {
            document.body.appendChild(iframe);
            
            setTimeout(function() {
              if (iframe && iframe.parentNode === document.body) {
                document.body.removeChild(iframe);
              }
              clearTimeout(timeout);
            }, 2000);
          }
        } catch (e) {
          // Silently fail - user will continue on web
          console.debug('App redirect failed:', e);
          clearTimeout(timeout);
          sessionStorage.removeItem('appRedirectAttempted');
        }
      } else if (isAndroid) {
        // For Android, use universal link first, then fallback to intent
        // Universal links are more reliable and don't cause errors if app isn't installed
        try {
          // Try universal link first (better for web compatibility)
          window.location.href = universalLink;
          
          // If app is installed, it will intercept. Otherwise, web app loads normally
          setTimeout(function() {
            clearTimeout(timeout);
            sessionStorage.removeItem('appRedirectAttempted');
          }, 1000);
        } catch (e) {
          // Silently fail - user will continue on web
          console.debug('App redirect failed:', e);
          clearTimeout(timeout);
          sessionStorage.removeItem('appRedirectAttempted');
        }
      }
      
      // Fallback: If app doesn't open, user continues on web
      window.addEventListener('blur', function() {
        clearTimeout(timeout);
      }, { once: true });
      
      window.addEventListener('focus', function() {
        clearTimeout(timeout);
        // If we're still focused after trying to open app, it didn't work
        // User will continue on web app
        sessionStorage.removeItem('appRedirectAttempted');
      }, { once: true });
    } catch (error) {
      // Silently handle any errors - don't break the page
      console.debug('App redirect error:', error);
      sessionStorage.removeItem('appRedirectAttempted');
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppRedirect);
  } else {
    // DOM is already ready
    initAppRedirect();
  }
})();

