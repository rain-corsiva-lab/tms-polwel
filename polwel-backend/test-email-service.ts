/**
 * Test the actual EmailService class to debug logo issue
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// We need to test the actual emailService
// Let's import and test it
async function testEmailService() {
  console.log('\n' + '='.repeat(70));
  console.log('TESTING ACTUAL EMAIL SERVICE - LOGO DEBUG');
  console.log('='.repeat(70));
  
  try {
    // Import the compiled emailService
    const EmailServiceModule = require('./dist/services/emailService');
    const EmailService = EmailServiceModule.default;
    
    console.log('\n📧 EmailService imported successfully');
    console.log('  Available static methods:', Object.getOwnPropertyNames(EmailService).filter(m => m.startsWith('send')));
    
    // Try to send a test trainer setup email
    const testEmail = process.env.TEST_EMAIL || process.env.MAIL_USER || 'test@example.com';
    const testName = 'Test Trainer';
    const testUrl = 'http://localhost:8080/trainer-setup/test-token-123';
    
    console.log('\n🔍 Test Parameters:');
    console.log('  To:', testEmail);
    console.log('  Name:', testName);
    console.log('  Setup URL:', testUrl);
    console.log('\n📤 Attempting to send test email...');
    console.log('  (Check console logs for logo loading messages)');
    console.log('-'.repeat(70));
    
    const result = await EmailService.sendTrainerSetupEmail(
      testEmail,
      testName,
      testUrl
    );
    
    console.log('-'.repeat(70));
    console.log('\n✅ Email send result:', result);
    
    if (result) {
      console.log('\n📬 SUCCESS! Check your email inbox at:', testEmail);
      console.log('   Look for subject: "Welcome to POLWEL - Complete Your Trainer Account Setup"');
      console.log('   Check if the POLWEL logo displays correctly in the email header');
    } else {
      console.log('\n⚠️  Email sending returned false (might be in development mode)');
      console.log('   Check the console output above for the email content preview');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR testing email service:');
    console.error(error);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETED');
  console.log('='.repeat(70) + '\n');
}

testEmailService();
