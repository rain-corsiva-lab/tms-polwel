const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const EmailService = require('./dist/services/emailService').default;

async function testEmailSending() {
  console.log('Testing password reset email sending...\n');
  
  const testEmail = 'pdcs_tms@polwel.org.sg';
  const testName = 'Test User';
  const testResetUrl = 'http://localhost:8080/reset-password/abc123def456ghi789jkl012mnopqrstuv';
  
  console.log('Sending password reset email to:', testEmail);
  console.log('Reset URL:', testResetUrl);
  console.log('');
  
  try {
    const result = await EmailService.sendPasswordResetEmail(
      testEmail,
      testName,
      testResetUrl
    );
    
    if (result) {
      console.log('✅ Password reset email sent successfully!');
      process.exit(0);
    } else {
      console.error('❌ Email service returned false');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

testEmailSending();
