// Test script for venue owner email chain
// Run this in the browser console to test all venue owner emails

console.log('🧪 Testing Venue Owner Email Chain...');

// Test data
const testData = {
  email: 'test@example.com', // Replace with your test email
  ownerName: 'Test Owner',
  contactName: 'Test Contact',
  phone: '+234 123 456 7890',
  venueName: 'Test Venue',
  venueType: 'Restaurant',
  venueAddress: '123 Test Street',
  venueCity: 'Lagos'
};

// Import the email service functions
import { 
  sendVenueOwnerApplicationApproved,
  sendVenueOwnerRegistrationComplete,
  sendVenueOwnerPasswordReset,
  sendVenueOwnerEmailConfirmation,
  notifyAdminOfVenueOwnerRegistration,
  testVenueOwnerEmails
} from './src/lib/venueOwnerEmailService.js';

// Test all emails
async function testAllVenueOwnerEmails() {
  console.log('🔄 Starting comprehensive venue owner email test...');
  
  try {
    // Test 1: Application Approved Email
    console.log('📧 Test 1: Application Approved Email');
    await sendVenueOwnerApplicationApproved(testData);
    console.log('✅ Application approved email sent successfully');
    
    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Registration Complete Email
    console.log('📧 Test 2: Registration Complete Email');
    await sendVenueOwnerRegistrationComplete(testData);
    console.log('✅ Registration complete email sent successfully');
    
    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Password Reset Email
    console.log('📧 Test 3: Password Reset Email');
    await sendVenueOwnerPasswordReset(testData);
    console.log('✅ Password reset email sent successfully');
    
    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Email Confirmation Email
    console.log('📧 Test 4: Email Confirmation Email');
    await sendVenueOwnerEmailConfirmation(testData);
    console.log('✅ Email confirmation sent successfully');
    
    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Admin Notification Email
    console.log('📧 Test 5: Admin Notification Email');
    await notifyAdminOfVenueOwnerRegistration(testData);
    console.log('✅ Admin notification sent successfully');
    
    console.log('🎉 All venue owner email tests completed successfully!');
    console.log('📧 Check your email inbox for the test emails');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      name: error.name
    });
  }
}

// Test individual email types
async function testIndividualEmails() {
  console.log('🔄 Testing individual email types...');
  
  try {
    // Test application approved
    console.log('📧 Testing application approved email...');
    await sendVenueOwnerApplicationApproved(testData);
    console.log('✅ Application approved email test successful');
    
  } catch (error) {
    console.error('❌ Application approved email test failed:', error);
  }
  
  try {
    // Test registration complete
    console.log('📧 Testing registration complete email...');
    await sendVenueOwnerRegistrationComplete(testData);
    console.log('✅ Registration complete email test successful');
    
  } catch (error) {
    console.error('❌ Registration complete email test failed:', error);
  }
  
  try {
    // Test password reset
    console.log('📧 Testing password reset email...');
    await sendVenueOwnerPasswordReset(testData);
    console.log('✅ Password reset email test successful');
    
  } catch (error) {
    console.error('❌ Password reset email test failed:', error);
  }
  
  try {
    // Test email confirmation
    console.log('📧 Testing email confirmation...');
    await sendVenueOwnerEmailConfirmation(testData);
    console.log('✅ Email confirmation test successful');
    
  } catch (error) {
    console.error('❌ Email confirmation test failed:', error);
  }
  
  try {
    // Test admin notification
    console.log('📧 Testing admin notification...');
    await notifyAdminOfVenueOwnerRegistration(testData);
    console.log('✅ Admin notification test successful');
    
  } catch (error) {
    console.error('❌ Admin notification test failed:', error);
  }
}

// Quick test function
async function quickTest() {
  console.log('🔄 Quick venue owner email test...');
  
  try {
    const result = await testVenueOwnerEmails(testData.email);
    if (result.success) {
      console.log('✅ Quick test successful!');
    } else {
      console.error('❌ Quick test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Quick test error:', error);
  }
}

// Make functions available globally
window.testAllVenueOwnerEmails = testAllVenueOwnerEmails;
window.testIndividualEmails = testIndividualEmails;
window.quickTest = quickTest;
window.testVenueOwnerData = testData;

console.log('📋 Available test functions:');
console.log('  - testAllVenueOwnerEmails() - Test all email types');
console.log('  - testIndividualEmails() - Test each email type individually');
console.log('  - quickTest() - Quick test using built-in function');
console.log('  - testVenueOwnerData - Test data object (modify email before testing)');
console.log('');
console.log('💡 To test with your email, update testVenueOwnerData.email before running tests'); 