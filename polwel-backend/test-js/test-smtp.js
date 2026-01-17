// Simple SMTP test script
const nodemailer = require('nodemailer');
require('dotenv').config();

const encryption = process.env.MAIL_ENCRYPTION || 'TLS';
const isSSL = encryption === 'SSL';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: isSSL,  // true for SSL (465), false for STARTTLS (587)
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
    ...(encryption === 'STARTTLS' && {
      minVersion: 'TLSv1.2'
    })
  }
});

// Test connection
console.log('\n🧪 Testing SMTP Configuration...\n');
console.log('Settings:');
console.log('  Host:', process.env.MAIL_HOST);
console.log('  Port:', process.env.MAIL_PORT);
console.log('  Encryption:', encryption);
console.log('  Secure:', isSSL);
console.log('  Username:', process.env.MAIL_USERNAME?.substring(0, 5) + '***');
console.log('');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection FAILED');
    console.error('');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    console.error('');
    console.error('⚠️  IMPORTANT: Outlook 365 requires App Password authentication');
    console.error('   Visit: https://account.microsoft.com/account/manage-my-microsoft-account');
    console.error('   Go to: Security > App passwords');
    console.error('   Use the 16-character app password instead of your account password');
    console.error('');
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection SUCCESSFUL!\n');
    
    // Now try sending a test email
    console.log('📧 Sending test email...\n');
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS,
      to: process.env.MAIL_FROM_ADDRESS,  // Send to self for testing
      subject: 'POLWEL SMTP Test - Connection Verified',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; margin-top: 0;">✅ POLWEL SMTP Test Successful</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                This test email confirms that your Outlook 365 SMTP configuration is working correctly.
              </p>
              <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold;">Configuration Status: ACTIVE</p>
                <p style="margin: 5px 0 0 0; color: #558b2f; font-size: 14px;">SMTP emails are now enabled for the POLWEL Training System</p>
              </div>
              <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Sent from: ${process.env.MAIL_FROM_ADDRESS}<br>
                Server: ${process.env.MAIL_HOST}:${process.env.MAIL_PORT}<br>
                Encryption: ${encryption}
              </p>
            </div>
          </body>
        </html>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Email sending FAILED');
        console.error('');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Full error:', err);
        process.exit(1);
      } else {
        console.log('✅ Email sent SUCCESSFULLY!');
        console.log('');
        console.log('Details:');
        console.log('  Message ID:', info.messageId);
        console.log('  Response:', info.response);
        console.log('');
        console.log('✅ All SMTP tests passed! Emails are working correctly.');
        console.log('');
        process.exit(0);
      }
    });
  }
});

// Set timeout to avoid hanging
setTimeout(() => {
  console.error('❌ Test timed out after 30 seconds');
  process.exit(1);
}, 30000);
