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