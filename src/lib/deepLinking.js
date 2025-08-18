// Deep linking utilities for Eddys Members app
// Handles app-to-web fallback for all email links

// App scheme and universal link configuration
const APP_CONFIG = {
  // iOS App Store ID (replace with your actual ID)
  iosAppStoreId: 'YOUR_IOS_APP_STORE_ID',
  
  // Android package name (replace with your actual package name)
  androidPackageName: 'com.oneeddy.app',
  
  // App scheme for deep linking
  appScheme: 'oneeddy://',
  
  // Universal link domain (your domain that handles app links)
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
 * Generate deep link URL that tries app first, then falls back to web
 * @param {string} path - The path within the app (e.g., 'bookings', 'profile')
 * @param {Object} params - Query parameters to pass
 * @param {string} fallbackPath - Web fallback path (optional)
 * @returns {string} - Deep link URL
 */
export function generateDeepLink(path, params = {}, fallbackPath = null) {
  const webPath = fallbackPath || path;
  const webUrl = `${APP_CONFIG.universalLinkDomain}${webPath}`;
  
  // Build query string from params
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const webUrlWithParams = queryString ? `${webUrl}?${queryString}` : webUrl;
  
  // Create app deep link
  const appDeepLink = `${APP_CONFIG.appScheme}${path}${queryString ? `?${queryString}` : ''}`;
  
  // Return universal link that will try app first, then web
  return `${APP_CONFIG.universalLinkDomain}/app-redirect?path=${encodeURIComponent(path)}&params=${encodeURIComponent(JSON.stringify(params))}&fallback=${encodeURIComponent(webUrlWithParams)}`;
}

/**
 * Generate email-specific deep links
 */
export const emailDeepLinks = {
  // User signup confirmation
  signupConfirmation: (email) => generateDeepLink('signup/confirm', { email }),
  
  // User login
  userLogin: () => generateDeepLink('login'),
  
  // User profile
  userProfile: () => generateDeepLink('profile'),
  
  // User bookings
  userBookings: () => generateDeepLink('bookings'),
  
  // Venue detail
  venueDetail: (venueId) => generateDeepLink('venue', { id: venueId }),
  
  // Venue owner login
  venueOwnerLogin: () => generateDeepLink('venue-owner/login'),
  
  // Venue owner dashboard
  venueOwnerDashboard: () => generateDeepLink('venue-owner/dashboard'),
  
  // Venue owner settings
  venueOwnerSettings: () => generateDeepLink('venue-owner/settings'),
  
  // Admin dashboard
  adminDashboard: () => generateDeepLink('admin/dashboard'),
  
  // Checkout
  checkout: (bookingId) => generateDeepLink('checkout', { bookingId }),
  
  // Split payment
  splitPayment: (paymentId) => generateDeepLink('split-payment', { id: paymentId }),
  
  // Loyalty program
  loyalty: () => generateDeepLink('loyalty'),
  
  // General app open
  openApp: () => generateDeepLink('home'),
  
  // Web fallback for when app isn't available
  webFallback: (path, params = {}) => {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    return `${APP_CONFIG.universalLinkDomain}${path}${queryString ? `?${queryString}` : ''}`;
  }
};

/**
 * Generate smart button HTML for emails
 * @param {string} text - Button text
 * @param {string} deepLinkPath - App path
 * @param {Object} params - Query parameters
 * @param {string} fallbackPath - Web fallback path
 * @param {string} buttonStyle - CSS styles for the button
 * @returns {string} - HTML button with deep linking
 */
export function generateSmartButton(text, deepLinkPath, params = {}, fallbackPath = null, buttonStyle = '') {
  const deepLink = emailDeepLinks[deepLinkPath] ? 
    emailDeepLinks[deepLinkPath](params) : 
    generateDeepLink(deepLinkPath, params, fallbackPath);
  
  const defaultStyle = `
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #8B1538 0%, #D4AF37 100%);
    color: white;
    text-decoration: none;
    border-radius: 25px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 15px rgba(139, 21, 56, 0.3);
    transition: all 0.3s ease;
  `;
  
  const finalStyle = buttonStyle || defaultStyle;
  
  return `
    <a href="${deepLink}" style="${finalStyle}">
      ${text}
    </a>
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
  generateDeepLink,
  emailDeepLinks,
  generateSmartButton,
  generateFallbackLink,
  generateEmailFooter,
  APP_CONFIG
}; 