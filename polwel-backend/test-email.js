const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('📧 Testing SMTP Configuration...\n');
  
  // Create transporter with current settings
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'phuongtestwordpress@gmail.com',
      pass: 'osvttyfchgykhpel'
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Enable debug output
    logger: true // Log to console
  });

  console.log('🔍 Step 1: Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully\n');
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    return;
  }

  console.log('📨 Step 2: Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: '"POLWEL Test" <phuongtestwordpress@gmail.com>',
      to: 'kukuhthewow@gmail.com',
      subject: 'Test Email - ' + new Date().toISOString(),
      text: 'This is a test email to verify SMTP is working correctly.',
      html: '<b>This is a test email</b><p>Sent at: ' + new Date().toISOString() + '</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    console.log('   Envelope:', JSON.stringify(info.envelope, null, 2));
    
    console.log('\n✅ TEST PASSED - Email was sent successfully!');
    console.log('⏰ Please check kukuhthewow@gmail.com inbox (may take 1-2 minutes)');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    console.error('   Response:', error.response);
    console.error('   Full error:', error);
  }
}

testEmail().catch(console.error);
