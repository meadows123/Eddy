// Phone number validation - Accepts only 10-20 digits with optional +, spaces, hyphens, and parentheses
export const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  // Remove all non-digit characters except the leading + sign
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it has between 10-20 digits (including country code)
  const digitCount = cleaned.replace(/\D/g, '').length;
  return digitCount >= 10 && digitCount <= 20;
};

// Sanitize phone input - only allow digits, +, spaces, hyphens, and parentheses
export const sanitizePhoneInput = (value) => {
  return value.replace(/[^\d\+\s\-\(\)]/g, '');
};

// Get only the digits from a phone number
export const getPhoneDigits = (phone) => {
  return phone.replace(/\D/g, '');
};

export const validateCheckoutForm = (formData, isAuthenticated = false) => {
  const errors = {};
  
  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  }
  
  if (!formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email is invalid';
  }
  
  if (!formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhoneNumber(formData.phone)) {
    errors.phone = 'Phone number must contain 10-20 digits';
  }
  
  // Only validate password for non-authenticated users
  if (!isAuthenticated) {
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
  }
  
  if (!formData.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the terms';
  }
  
  return errors;
}; 