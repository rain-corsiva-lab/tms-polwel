/**
 * Test script to debug POLWEL logo in emails
 * This will test logo loading and send a test email
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Test logo loading
function testLogoLoading() {
  console.log('\n🔍 TESTING LOGO LOADING\n');
  console.log('='.repeat(60));
  
  const possiblePaths = [
    '/home/kukuh/webprojects/polwel/public/images/POLWEL Logo_Horizontal.png',
    path.join(__dirname, '../public/images/POLWEL Logo_Horizontal.png'),
    path.join(__dirname, '../../public/images/POLWEL Logo_Horizontal.png'),
    path.join(process.cwd(), '../public/images/POLWEL Logo_Horizontal.png'),
    path.join(process.cwd(), 'public/images/POLWEL Logo_Horizontal.png'),
  ];
  
  console.log('Current directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('');
  
  let logoBase64 = '';
  
  for (const p of possiblePaths) {
    const exists = fs.existsSync(p);
    console.log(`${exists ? '✅' : '❌'} ${p}`);
    if (exists && !logoBase64) {
      const imageBuffer = fs.readFileSync(p);
      logoBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      console.log(`\n✅ Successfully loaded logo from: ${p}`);
      console.log(`   File size: ${imageBuffer.length} bytes`);
      console.log(`   Base64 length: ${logoBase64.length} characters`);
      console.log(`   Base64 preview: ${logoBase64.substring(0, 100)}...`);
    }
  }
  
  if (!logoBase64) {
    console.error('\n❌ Logo not found in any expected location!');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    logoBase64 = `${frontendUrl}/images/POLWEL Logo_Horizontal.png`;
    console.log(`⚠️  Using fallback URL: ${logoBase64}`);
  }
  
  console.log('='.repeat(60));
  return logoBase64;
}

// Test email sending
async function testEmailSending(logoBase64) {
  console.log('\n📧 TESTING EMAIL SENDING\n');
  console.log('='.repeat(60));
  
  // Load email configuration from .env
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  
  console.log('Email configuration:');
  console.log('  MAIL_HOST:', process.env.MAIL_HOST || 'NOT SET');
  console.log('  MAIL_PORT:', process.env.MAIL_PORT || 'NOT SET');
  console.log('  MAIL_USER:', process.env.MAIL_USER || 'NOT SET');
  console.log('  MAIL_FROM_ADDRESS:', process.env.MAIL_FROM_ADDRESS || 'NOT SET');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  console.log('');
  
  // Create transporter
  let transporter;
  
  if (process.env.NODE_ENV === 'Production') {
    console.log('Production mode - checking Graph API config...');
    const graphClientId = process.env.GRAPH_CLIENT_ID;
    const graphClientSecret = process.env.GRAPH_CLIENT_SECRET;
    const graphTenantId = process.env.GRAPH_TENANT_ID;
    const graphFromEmail = process.env.GRAPH_MAIL_FROM_ADDRESS;
    
    if (graphClientId && graphClientSecret && graphTenantId && graphFromEmail) {
      console.log('⚠️  Graph API configured but test script uses SMTP for simplicity');
      console.log('   Falling back to SMTP for this test');
    }
  }
  
  // Use SMTP for testing
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ SMTP transporter created');
  } else {
    console.log('⚠️  Email credentials not configured');
    console.log('   Skipping email send test');
    console.log('   Set MAIL_HOST, MAIL_USER, MAIL_PASSWORD in .env to test');
    console.log('='.repeat(60));
    return;
  }
  
  // Test email HTML
  const testHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>POLWEL Logo Test</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #0f172a; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
          <h1 style="color: #1f2937; margin-bottom: 20px;">POLWEL Logo Test Email</h1>
          
          <div style="border: 2px solid #e5e7eb; padding: 20px; margin: 20px 0; text-align: center; background-color: #f9fafb;">
            <p style="margin: 0 0 15px 0; color: #374151;"><strong>Logo with base64/URL src:</strong></p>
            <img src="${logoBase64}" alt="POLWEL Logo" style="height: 60px; width: auto; display: inline-block;" />
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">Debug Information:</h3>
            <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
              <li><strong>Logo source type:</strong> ${logoBase64.startsWith('data:image') ? 'Base64 inline' : 'URL'}</li>
              <li><strong>Source length:</strong> ${logoBase64.length} characters</li>
              <li><strong>First 100 chars:</strong> ${logoBase64.substring(0, 100)}...</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            If you can see the POLWEL logo above, the email logo implementation is working correctly!
          </p>
        </div>
      </body>
    </html>
  `;
  
  const mailOptions = {
    from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
    to: process.env.TEST_EMAIL || process.env.MAIL_USER, // Send to self
    subject: 'POLWEL Logo Test - ' + new Date().toLocaleString(),
    html: testHtml,
  };
  
  console.log('\nSending test email to:', mailOptions.to);
  console.log('From:', mailOptions.from);
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('\n✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 Check your inbox at:', mailOptions.to);
    console.log('   Subject: "POLWEL Logo Test"');
  } catch (error) {
    console.error('\n❌ Failed to send test email:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
  }
  
  console.log('='.repeat(60));
}

// Run tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('POLWEL EMAIL LOGO DEBUG TEST');
  console.log('='.repeat(60));
  
  const logoBase64 = testLogoLoading();
  await testEmailSending(logoBase64);
  
  console.log('\n✅ Test completed!\n');
}

runTests().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
