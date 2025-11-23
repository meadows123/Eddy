// URL utilities for sharing and deep linking
// Ensures production URLs are used instead of localhost

/**
 * Get the correct base URL for the application
 * Uses production URL in production, localhost in development
 */
export const getBaseUrl = () => {
  // Check if we're in development
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    // In development, use localhost
    return window.location.origin;
  }
  
  // In production, use the configured production URL
  return 'https://oneeddy.com';
};

/**
 * Get the full URL for a given path
 * @param {string} path - The path to append to the base URL
 * @returns {string} - The full URL
 */
export const getFullUrl = (path) => {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Copy a URL to clipboard with proper URL handling
 * @param {string} url - The URL to copy
 * @param {Function} toast - Toast function for success message
 */
export const copyUrlToClipboard = async (url, toast) => {
  try {
    await navigator.clipboard.writeText(url);
    if (toast) {
      toast({
        title: "Link copied!",
        description: "Link has been copied to clipboard",
      });
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    if (toast) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  }
};

/**
 * Share a URL using native sharing if available, otherwise copy to clipboard
 * @param {Object} shareData - The share data object
 * @param {string} shareData.title - The title
 * @param {string} shareData.text - The text description
 * @param {string} shareData.url - The URL to share
 * @param {Function} toast - Toast function for fallback message
 */
export const shareUrl = async (shareData, toast) => {
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback to copying URL to clipboard
      await copyUrlToClipboard(shareData.url, toast);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing:', error);
      // Fallback to copying URL to clipboard
      await copyUrlToClipboard(shareData.url, toast);
    }
  }
};

/**
 * Get the callback URL for Paystack redirects
 * Returns HTTPS URL (Paystack requires HTTPS) - the callback page will handle app redirect
 * @param {string} path - The callback path (e.g., '/paystack-callback')
 * @param {Object} params - Query parameters to include
 * @returns {string} The callback URL
 */
export const getPaystackCallbackUrl = (path = '/paystack-callback', params = {}) => {
  // Build query string from params
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const query = queryString ? `?${queryString}` : '';
  
  // Always use production URL for Paystack callbacks (required for deep linking in mobile apps)
  // Paystack requires HTTPS, and the app must be configured to handle https://oneeddy.com URLs
  // In mobile apps, window.location.hostname is 'localhost', but we need the production URL
  // so Android/iOS can intercept it via App Links
  const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
  const baseUrl = isInApp ? 'https://oneeddy.com' : getBaseUrl();
  
  console.log('🔗 Generating Paystack callback URL:', {
    isInApp,
    baseUrl,
    path,
    fullUrl: `${baseUrl}${path}${query}`
  });
  
  return `${baseUrl}${path}${query}`;
};

/**
 * Redirect to mobile app if we're in a mobile browser
 * @param {string} path - The path to redirect to in the app
 * @param {Object} params - Query parameters to include
 * @returns {boolean} True if redirect was attempted, false otherwise
 */
export const redirectToMobileApp = (path = '/paystack-callback', params = {}) => {
  // Only redirect if we're on mobile but NOT already in the app
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isInApp = typeof window !== 'undefined' && (window.Capacitor || window.cordova || window.ionic);
  
  if (!isMobile || isInApp) {
    return false; // Don't redirect if not mobile or already in app
  }
  
  // Build query string
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const query = queryString ? `?${queryString}` : '';
  
  // Build app deep link URL
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const appUrl = `com.oneeddy.members://${cleanPath}${query}`;
  
  // Try to open the app
  try {
    // For iOS, try using iframe method
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    } else {
      // For Android, use window.location
      window.location.href = appUrl;
    }
    return true;
  } catch (error) {
    console.error('Error redirecting to app:', error);
    return false;
  }
};
