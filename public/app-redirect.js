/**
 * App Redirect Script
 * Tries to open the mobile app first, then falls back to web app
 */

(function() {
  'use strict';

  // Only run on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check if we're already in the app (Capacitor)
  const isInApp = window.Capacitor || window.cordova || window.ionic;

  // Only redirect if:
  // 1. User is on mobile
  // 2. Not already in the app
  // 3. This is the first visit (not a redirect)
  const shouldRedirect = isMobile && !isInApp && !sessionStorage.getItem('appRedirectAttempted');

  if (shouldRedirect) {
    // Mark that we've attempted redirect to prevent loops
    sessionStorage.setItem('appRedirectAttempted', 'true');
    
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    
    // Android Intent URL
    const androidIntent = `intent://oneeddy.com${currentPath}#Intent;scheme=https;package=com.oneeddy.members;end`;
    
    // iOS Custom URL Scheme
    const iosScheme = `com.oneeddy.members://${currentPath}`;
    
    // Universal Link (works for both iOS and Android if properly configured)
    const universalLink = `https://oneeddy.com${currentPath}`;
    
    // Detect platform
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let appUrl = universalLink;
    if (isAndroid) {
      appUrl = androidIntent;
    } else if (isIOS) {
      appUrl = iosScheme;
    }
    
    // Try to open the app
    const timeout = setTimeout(function() {
      // App didn't open, clear the flag so user can navigate normally
      sessionStorage.removeItem('appRedirectAttempted');
    }, 2500);
    
    // Create hidden iframe to attempt app launch (iOS)
    if (isIOS) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = iosScheme;
      document.body.appendChild(iframe);
      
      setTimeout(function() {
        document.body.removeChild(iframe);
        clearTimeout(timeout);
      }, 2000);
    } else if (isAndroid) {
      // For Android, try window.location first
      window.location = appUrl;
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
  }
})();

