#!/bin/bash
echo "=================================================="
echo "Gmail Email Finder Script"
echo "=================================================="
echo ""
echo "Checking if emails from phuongtestwordpress@gmail.com are in your Gmail..."
echo ""
echo "Please manually check these Gmail locations:"
echo ""
echo "1. 📥 INBOX - Check primary inbox"
echo "2. 🔍 SEARCH - Type in Gmail search: from:phuongtestwordpress@gmail.com"
echo "3. 📧 ALL MAIL - Click 'All Mail' in left sidebar"
echo "4. 📣 PROMOTIONS - Check 'Promotions' tab at top of inbox"
echo "5. 📰 UPDATES - Check 'Updates' tab at top of inbox"
echo "6. 🗑️  SPAM - Check 'Spam' folder in left sidebar"
echo ""
echo "Subject lines to look for:"
echo "  - 'Course Confirmation — Test Course - Email Diagnostic'"
echo "  - 'Course Confirmation — Growth Mindset Developments'"
echo ""
echo "=================================================="
echo "Technical Verification:"
echo "=================================================="
echo ""
echo "Testing SMTP connection..."
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'phuongtestwordpress@gmail.com',
    pass: 'osvttyfchgykhpel'
  },
  tls: { rejectUnauthorized: false }
});

async function test() {
  try {
    await transporter.verify();
    console.log('✅ SMTP Connection: VERIFIED');
    
    const info = await transporter.sendMail({
      from: 'phuongtestwordpress@gmail.com',
      to: 'kukuhthewow@gmail.com',
      subject: 'Test Email - ' + new Date().toLocaleString(),
      html: '<h1>Test Email</h1><p>If you see this, emails ARE working!</p><p>Sent at: ' + new Date().toLocaleString() + '</p>'
    });
    
    console.log('✅ Email Sent: SUCCESS');
    console.log('   Message ID:', info.messageId);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    if (info.rejected && info.rejected.length > 0) {
      console.log('❌ Gmail REJECTED the email!');
      console.log('   Rejected recipients:', info.rejected);
    } else {
      console.log('');
      console.log('🎉 EMAIL WAS ACCEPTED BY GMAIL!');
      console.log('');
      console.log('The email was successfully delivered to Gmail servers.');
      console.log('If you cannot find it in kukuhthewow@gmail.com:');
      console.log('');
      console.log('1. Gmail is filtering it (check Promotions, Updates, All Mail)');
      console.log('2. Search for: from:phuongtestwordpress@gmail.com');
      console.log('3. Check Spam folder');
      console.log('4. Gmail AI may be auto-archiving test emails');
      console.log('');
      console.log('💡 SOLUTION: Use a professional email sender like pdcs@polwel.org.sg');
      console.log('   instead of phuongtestwordpress@gmail.com for better deliverability.');
    }
  } catch (err) {
    console.log('❌ SMTP Error:', err.message);
    console.log('   Code:', err.code);
  }
}
test();
"
