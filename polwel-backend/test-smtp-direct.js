#!/usr/bin/env node
/**
 * STANDALONE SMTP TEST - Bypasses all application code
 * Tests SMTP services directly to verify they work
 */

const nodemailer = require('nodemailer');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     🔧 DIRECT SMTP TEST - BYPASSING APPLICATION CODE          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// Test recipient
const TEST_EMAIL = 'kukuhthewow@gmail.com';

// SMTP Configurations to test
const SMTP_CONFIGS = [
  {
    name: 'OTGSMTP (Direct SMTP Service)',
    config: {
      host: 'mail.otgsmtp.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'polwel@otgsmtp.com',
        pass: '1q2w3e4r5!!!'
      }
    },
    from: 'polwel@otgsmtp.com',
    priority: 1
  },
  {
    name: 'Mailjet SMTP',
    config: {
      host: 'in-v3.mailjet.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: '2ec681a88779802cbda385f4a0971039',
        pass: 'bb77350e7dc5f6d112ec8d7b5771acf0'
      }
    },
    from: 'polwel@otgsmtp.com',
    priority: 2
  }
];

async function testSMTP(smtpConfig) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🧪 Testing: ${smtpConfig.name}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Configuration:');
  console.log('  Host:', smtpConfig.config.host);
  console.log('  Port:', smtpConfig.config.port);
  console.log('  Secure:', smtpConfig.config.secure);
  console.log('  User:', smtpConfig.config.auth.user);
  console.log('  From:', smtpConfig.from);
  console.log('');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport(smtpConfig.config);
    
    // Test connection
    console.log('🔄 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully!');
    console.log('');

    // Send test email
    console.log('📧 Sending test email...');
    const timestamp = new Date().toLocaleString();
    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: TEST_EMAIL,
      subject: `✅ DIRECT SMTP TEST - ${smtpConfig.name} - ${timestamp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">✅ Email Test Successful!</h2>
          <p><strong>SMTP Service:</strong> ${smtpConfig.name}</p>
          <p><strong>Host:</strong> ${smtpConfig.config.host}</p>
          <p><strong>Port:</strong> ${smtpConfig.config.port}</p>
          <p><strong>Sender:</strong> ${smtpConfig.from}</p>
          <p><strong>Recipient:</strong> ${TEST_EMAIL}</p>
          <p><strong>Time:</strong> ${timestamp}</p>
          <hr>
          <p style="color: #666;">This email was sent by a direct SMTP test script, bypassing the application code to verify the SMTP service works correctly.</p>
        </div>
      `,
      text: `Email Test Successful!\n\nSMTP Service: ${smtpConfig.name}\nHost: ${smtpConfig.config.host}\nPort: ${smtpConfig.config.port}\nSender: ${smtpConfig.from}\nRecipient: ${TEST_EMAIL}\nTime: ${timestamp}`
    });

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ EMAIL SENT SUCCESSFULLY                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('📨 Response Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('  Accepted:', JSON.stringify(info.accepted));
    console.log('  Rejected:', JSON.stringify(info.rejected));
    console.log('');
    
    return {
      success: true,
      name: smtpConfig.name,
      messageId: info.messageId,
      response: info.response
    };

  } catch (error) {
    console.error('╔════════════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ TEST FAILED                              ║');
    console.error('╚════════════════════════════════════════════════════════════════╝');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Command:', error.command);
    console.error('');
    
    return {
      success: false,
      name: smtpConfig.name,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🎯 Testing all SMTP services...');
  console.log('📧 Test recipient: ' + TEST_EMAIL);
  console.log('');

  const results = [];
  
  // Test each SMTP config
  for (const smtpConfig of SMTP_CONFIGS) {
    const result = await testSMTP(smtpConfig);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                          📊 TEST SUMMARY                          ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   ✓ ${r.name}`);
      console.log(`     Message ID: ${r.messageId}`);
    });
  }
  console.log('');

  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => {
      console.log(`   ✗ ${r.name}: ${r.error}`);
    });
  }
  console.log('');

  if (successful.length > 0) {
    const best = successful[0];
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🎉 RECOMMENDATION: Use ' + best.name);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ This SMTP service is working and should be configured in .env');
    console.log('');
    console.log('📧 CHECK YOUR EMAIL NOW:');
    console.log('1. Open Gmail: kukuhthewow@gmail.com');
    console.log('2. Search for: from:polwel@otgsmtp.com');
    console.log('3. OR check: All Mail, Promotions, Updates, Spam');
    console.log('4. Look for subject: "DIRECT SMTP TEST"');
    console.log('');
    console.log('⏰ Email should arrive within 1-2 minutes');
  } else {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('❌ ALL SMTP SERVICES FAILED');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Possible issues:');
    console.log('- Invalid SMTP credentials');
    console.log('- Firewall blocking SMTP ports (587, 465)');
    console.log('- Network connectivity issues');
    console.log('- SMTP service temporarily down');
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
