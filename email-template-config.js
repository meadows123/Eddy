// EmailJS Template Configuration for VIP Club
// This file contains EmailJS template IDs for custom emails (non-Supabase)

// EmailJS Service Configuration
export const EMAILJS_CONFIG = {
    // Your EmailJS public key
    PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY',
    
    // Your EmailJS service ID
    SERVICE_ID: process.env.EMAILJS_SERVICE_ID || 'YOUR_EMAILJS_SERVICE_ID',
    
    // Admin email for venue applications
    ADMIN_EMAIL: process.env.VIP_ADMIN_EMAIL || 'info@oneeddy.com',
    
    // Support and booking emails
    SUPPORT_EMAIL: process.env.VIP_SUPPORT_EMAIL || 'info@oneeddy.com',
    BOOKING_EMAIL: process.env.VIP_BOOKING_EMAIL || 'info@oneeddy.com',
};

// EmailJS Template IDs (only for custom emails, not Supabase auth emails)
export const EMAIL_TEMPLATES = {
    // Venue Owner Request Templates (sent to admin)
    VENUE_OWNER_REQUEST: {
        FULL: process.env.EMAILJS_VENUE_OWNER_REQUEST_TEMPLATE || 'venue_owner_request_template',
        SIMPLE: process.env.EMAILJS_VENUE_OWNER_REQUEST_SIMPLE || 'venue_owner_request_simple_template',
    },
    
    // Booking Confirmation Templates (sent to users)
    BOOKING_CONFIRMATION: {
        FULL: process.env.EMAILJS_BOOKING_CONFIRMATION_TEMPLATE || 'booking_confirmation_template',
        SIMPLE: process.env.EMAILJS_BOOKING_CONFIRMATION_SIMPLE || 'booking_confirmation_simple_template',
    },
};

// Email Subject Templates
export const EMAIL_SUBJECTS = {
    VENUE_OWNER_REQUEST: '🏢 New VIP Club Venue Application - {{ownerName}} ({{venueName}})',
    BOOKING_CONFIRMATION: '🎉 Booking Confirmed - {{venueName}} | {{bookingDate}} at {{bookingTime}}',
};

// Email Template Selection Helper
export class EmailTemplateSelector {
    /**
     * Get the appropriate template ID based on user preference or email client compatibility
     * @param {string} templateType - The type of template ('VENUE_OWNER_REQUEST' or 'BOOKING_CONFIRMATION')
     * @param {boolean} useSimple - Whether to use the simple table-based template for better compatibility
     * @returns {string} The template ID to use
     */
    static getTemplateId(templateType, useSimple = false) {
        const templateGroup = EMAIL_TEMPLATES[templateType];
        
        if (!templateGroup) {
            throw new Error(`Unknown template type: ${templateType}`);
        }
        
        return useSimple ? templateGroup.SIMPLE : templateGroup.FULL;
    }
    
    /**
     * Get email subject for a template type
     * @param {string} templateType - The template type
     * @returns {string} The email subject template
     */
    static getSubject(templateType) {
        return EMAIL_SUBJECTS[templateType] || 'VIP Club Notification';
    }
    
    /**
     * Detect if simple template should be used based on user agent or preference
     * @param {string} userAgent - The user agent string (optional)
     * @param {boolean} forceSimple - Force simple template usage
     * @returns {boolean} Whether to use simple template
     */
    static shouldUseSimple(userAgent = '', forceSimple = false) {
        if (forceSimple) return true;
        
        // Check for email clients that prefer simple templates
        const simpleClients = [
            'outlook',
            'hotmail',
            'gmail-mobile',
            'yahoo-mobile'
        ];
        
        const lowerUserAgent = userAgent.toLowerCase();
        return simpleClients.some(client => lowerUserAgent.includes(client));
    }
}

// EmailJS Service Helper Functions
export const EmailService = {
    /**
     * Initialize EmailJS with configuration
     */
    init() {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
            console.log('EmailJS initialized successfully');
        } else {
            console.error('EmailJS library not loaded');
        }
    },
    
    /**
     * Send venue owner request notification to admin
     * @param {Object} applicationData - The venue application data
     * @param {boolean} useSimple - Whether to use simple template
     * @returns {Promise} EmailJS send result
     */
    async sendVenueOwnerRequest(applicationData, useSimple = false) {
        const templateId = EmailTemplateSelector.getTemplateId('VENUE_OWNER_REQUEST', useSimple);
        
        const templateParams = {
            ...applicationData,
            to_email: EMAILJS_CONFIG.ADMIN_EMAIL,
        };
        
        return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, templateId, templateParams);
    },
    
    /**
     * Send booking confirmation to customer
     * @param {Object} bookingData - The booking confirmation data
     * @param {boolean} useSimple - Whether to use simple template
     * @returns {Promise} EmailJS send result
     */
    async sendBookingConfirmation(bookingData, useSimple = false) {
        const templateId = EmailTemplateSelector.getTemplateId('BOOKING_CONFIRMATION', useSimple);
        
        const templateParams = {
            ...bookingData,
            to_email: bookingData.customerEmail,
        };
        
        return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, templateId, templateParams);
    },
    
    /**
     * Send any custom email using template ID
     * @param {string} templateId - The EmailJS template ID
     * @param {Object} templateParams - The template parameters
     * @returns {Promise} EmailJS send result
     */
    async sendCustomEmail(templateId, templateParams) {
        return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, templateId, templateParams);
    },
};

// Default export for easy importing
export default {
    EMAILJS_CONFIG,
    EMAIL_TEMPLATES,
    EMAIL_SUBJECTS,
    EmailTemplateSelector,
    EmailService,
}; 