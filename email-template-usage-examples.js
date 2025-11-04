// VIP Club EmailJS Template Usage Examples
// This file demonstrates how to use the EmailJS template configuration
// Note: Supabase email templates are handled separately through api.js

import { EmailService } from './email-template-config.js';

// Initialize once
EmailService.init();

// Send venue application to admin
await EmailService.sendVenueOwnerRequest(applicationData);

// Send booking confirmation to customer  
await EmailService.sendBookingConfirmation(bookingData); 