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
