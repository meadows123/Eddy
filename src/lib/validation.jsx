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
  
  if (!formData.cardNumber.trim()) {
    errors.cardNumber = 'Card number is required';
  } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
    errors.cardNumber = 'Card number must be 16 digits';
  }
  
  if (!formData.expiryDate.trim()) {
    errors.expiryDate = 'Expiry date is required';
  } else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(formData.expiryDate)) {
    errors.expiryDate = 'Format must be MM/YY';
  }
  
  if (!formData.cvv.trim()) {
    errors.cvv = 'CVV is required';
  } else if (!/^\d{3,4}$/.test(formData.cvv)) {
    errors.cvv = 'CVV must be 3 or 4 digits';
  }
  
  if (!formData.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the terms';
  }
  
  return errors;
};