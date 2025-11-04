/**
 * Security validation utilities to prevent SQL injection and other attacks
 */

/**
 * Sanitizes search queries to prevent SQL injection
 * @param {string} query - The search query to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string} - Sanitized query safe for database use
 */
export const sanitizeSearchQuery = (query, maxLength = 100) => {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = query.trim();

  // Remove potentially dangerous characters but keep alphanumeric, spaces, @, ., -, and common name characters
  // This allows for names like "O'Connor", "Jean-Pierre", "Mary-Jane", etc.
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s@.-'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]/g, '');

  // Limit length to prevent abuse
  sanitized = sanitized.substring(0, maxLength);

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
};

/**
 * Validates UUID format
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid UUID format
 */
export const validateUUID = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone number format (basic validation)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Allow international phone numbers with +, digits, spaces, hyphens, parentheses
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Rate limiting utility
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  isAllowed(key, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false; // Rate limited
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
