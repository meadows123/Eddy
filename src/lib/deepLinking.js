// Deep linking utilities for Eddys Members app
// Handles app-to-web fallback for all email links

// App scheme and universal link configuration
const APP_CONFIG = {
  // iOS App Store ID (replace with your actual ID when you have one)
  iosAppStoreId: 'YOUR_IOS_APP_STORE_ID',
  
  // Android package name (this should match your actual package name)
  androidPackageName: 'com.oneeddy.members', // Updated to match your actual package
  
  // App scheme for deep linking (should match your AndroidManifest.xml)
  appScheme: 'oneeddy://',
  
  // Universal link domain (your actual domain)
  universalLinkDomain: 'https://oneeddy.com',
  
  // Web fallback URLs
  webUrls: {
    signup: '/signup',
    login: '/login',
    profile: '/profile',
    bookings: '/bookings',
    venues: '/venues',
    venueOwner: '/venue-owner',
    admin: '/admin',
    checkout: '/checkout',
    splitPayment: '/split-payment',
    loyalty: '/loyalty',
    settings: '/settings'
  }
};

/**
 * Generate simple deep link that tries app first, then falls back to web
 * @param {string} path - The path within the app
 * @param {Object} params - Query parameters to pass
 * @returns {string} - Deep link URL
 */
export function generateSimpleDeepLink(path, params = {}) {
  // Build query string from params
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create app deep link
  const appDeepLink = `${APP_CONFIG.appScheme}${path}${queryString ? `?${queryString}` : ''}`;
  
  // Create web fallback URL
  const webUrl = `${APP_CONFIG.universalLinkDomain}${path}${queryString ? `?${queryString}` : ''}`;
  
  return {
    appDeepLink,
    webUrl,
    // Return the app deep link - the fallback logic will be in the email template
    deepLink: appDeepLink
  };
}

/**
 * Generate email-specific deep links
 */
export const emailDeepLinks = {
  // User signup confirmation
  signupConfirmation: (token) => generateSimpleDeepLink('confirm', { token }),
  
  // User login
  userLogin: () => generateSimpleDeepLink('login'),
  
  // User profile
  userProfile: () => generateSimpleDeepLink('profile'),
  
  // User bookings
  userBookings: () => generateSimpleDeepLink('bookings'),
  
  // Venue detail
  venueDetail: (venueId) => generateSimpleDeepLink('venue', { id: venueId }),
  
  // Venue owner login
  venueOwnerLogin: () => generateSimpleDeepLink('venue-owner/login'),
  
  // Venue owner dashboard
  venueOwnerDashboard: () => generateSimpleDeepLink('venue-owner/dashboard'),
  
  // Venue owner settings
  venueOwnerSettings: () => generateSimpleDeepLink('venue-owner/settings'),
  
  // Admin dashboard
  adminDashboard: () => generateSimpleDeepLink('admin/dashboard'),
  
  // Checkout
  checkout: (bookingId) => generateSimpleDeepLink('checkout', { bookingId }),
  
  // Split payment
  splitPayment: (paymentId) => generateSimpleDeepLink('split-payment', { id: paymentId }),
  
  // General app open
  openApp: () => generateSimpleDeepLink('home'),
  
  // Web fallback for when app isn't available
  webFallback: (path, params = {}) => {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    return `${APP_CONFIG.universalLinkDomain}${path}${queryString ? `?${queryString}` : ''}`;
  }
};

/**
 * Generate HTML button with deep linking for email templates
 * @param {string} text - Button text
 * @param {string} deepLinkPath - App path
 * @param {Object} params - Query parameters
 * @param {string} fallbackPath - Web fallback path
 * @returns {string} - HTML button with deep linking
 */
export function generateEmailButton(text, deepLinkPath, params = {}, fallbackPath = null) {
  const { appDeepLink, webUrl } = generateSimpleDeepLink(deepLinkPath, params);
  
  return `
    <a href="${appDeepLink}" class="confirm-button" id="deepLinkButton" style="
      display: inline-block;
      background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
      color: #FFF5E6;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 16px;
      letter-spacing: 1px;
      transition: all 0.3s ease;
      box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3);
      border: 2px solid #FFD700;
    ">
      ${text}
    </a>
    
    <script>
    // Deep linking logic for email templates
    (function() {
      const button = document.getElementById('deepLinkButton');
      const webFallbackUrl = '${webUrl}';
      
      function tryOpenMobileApp() {
        // Check if we're on mobile
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          console.log('📱 Mobile detected, trying mobile app...');
          
          // Try to open mobile app
          const mobileAppUrl = '${appDeepLink}';
          console.log(' Attempting to open:', mobileAppUrl);
          
          // Use window.open to try the deep link
          const appWindow = window.open(mobileAppUrl, '_self');
          
          // Set timeout to redirect to web app if mobile app doesn't open
          setTimeout(function() {
            console.log('⏰ Mobile app didn\'t open, redirecting to web app');
            window.location.href = webFallbackUrl;
          }, 2000);
          
        } else {
          // On desktop, go directly to web app
          console.log('💻 Desktop detected, going to web app');
          window.location.href = webFallbackUrl;
        }
      }
      
      // Add click event
      button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Button clicked, starting deep link process...');
        tryOpenMobileApp();
      });
    })();
    </script>
  `;
}

/**
 * Generate fallback link text for emails
 * @param {string} path - Web path
 * @param {Object} params - Query parameters
 * @returns {string} - Fallback link text
 */
export function generateFallbackLink(path, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const webUrl = `${APP_CONFIG.universalLinkDomain}${path}${queryString ? `?${queryString}` : ''}`;
  
  return `
    <p style="color: #666; font-size: 12px; margin-top: 15px; text-align: center;">
      Having trouble with the app? <a href="${webUrl}" style="color: #8B1538; text-decoration: underline;">Open in browser</a>
    </p>
  `;
}

/**
 * Generate complete email footer with app download links
 */
export function generateEmailFooter() {
  return `
    <div style="margin-top: 30px; padding: 20px; background-color: #f8f8f8; border-radius: 8px; text-align: center;">
      <h3 style="color: #8B1538; margin-bottom: 15px;">Get the Eddys Members App</h3>
      <p style="color: #666; margin-bottom: 15px; font-size: 14px;">
        Download our mobile app for the best experience
      </p>
      <div style="margin-bottom: 15px;">
        <a href="https://apps.apple.com/app/id${APP_CONFIG.iosAppStoreId}" 
           style="display: inline-block; margin: 0 10px; text-decoration: none;">
          <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" 
               alt="Download on the App Store" style="height: 40px;">
        </a>
        <a href="https://play.google.com/store/apps/details?id=${APP_CONFIG.androidPackageName}" 
           style="display: inline-block; margin: 0 10px; text-decoration: none;">
          <img src="https://play.google.com/intl/en_us/badges/static/images/badge_web_generic.png" 
               alt="Get it on Google Play" style="height: 40px;">
        </a>
      </div>
      <p style="color: #999; font-size: 12px; margin: 0;">
        Or visit <a href="${APP_CONFIG.universalLinkDomain}" style="color: #8B1538;">${APP_CONFIG.universalLinkDomain}</a>
      </p>
    </div>
  `;
}

export default {
  generateSimpleDeepLink,
  emailDeepLinks,
  generateEmailButton,
  generateFallbackLink,
  generateEmailFooter,
  APP_CONFIG
}; 