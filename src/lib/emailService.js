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
  const isDevelopment = import.meta.env.DEV;
  
  // For live servers with proper email configuration,
  // we should use the real email service unless explicitly in development
  const shouldUseEmailService = !isDevelopment;
  
  console.log('Email service check:', {
    isDevelopment,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    shouldUseEmailService
  });
  
  // Use email service if not in development mode
  // Since you have credentials on your live server, this should work
  return shouldUseEmailService;
}; 