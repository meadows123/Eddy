// Fallback email service for development
export const sendEmailFallback = async (emailData) => {
  // Simulate email sending in development
  console.log('📧 Email would be sent:');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Template:', emailData.template);
  console.log('Data:', emailData.data);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return success for development
  return { success: true, message: 'Email simulated successfully' };
};

export const isEmailServiceAvailable = () => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  return !isDevelopment; // Only use real email service in production
}; 