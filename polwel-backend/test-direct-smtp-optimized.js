#!/usr/bin/env node

/**
 * Direct SMTP Test - Bypasses all application code
 * Tests Gmail SMTP with optimized configuration
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 DIRECT GMAIL SMTP TEST - OPTIMIZED CONFIGURATION                ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('');

const timestamp = new Date().toISOString();

// Optimized Gmail SMTP configuration for instant delivery
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  },
  // CRITICAL: Disable pooling for immediate delivery
  pool: false,
  // Direct connection - no delays
  direct: false,
  // Aggressive timeouts for fast delivery
  socketTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  connectionTimeout: 10000, // 10 seconds
  // Force immediate send
  logger: true,
  debug: true,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

console.log('📧 SMTP Configuration:');
console.log('   Host:', 'smtp.gmail.com');
console.log('   Port:', 587);
console.log('   User:', process.env.MAIL_USERNAME);
console.log('   Pool:', false, '(Direct connection)');
console.log('   Timeout:', '10 seconds');
console.log('');

// Verify connection first
console.log('🔄 Verifying SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Connection verified successfully!');
    console.log('');
    console.log('📨 Sending test email...');
    console.log('⏱️  Start time:', new Date().toISOString());
    
    const startTime = Date.now();
    
    const mailOptions = {
      from: `"POLWEL Training System" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: 'kukuhthewow@gmail.com',
      subject: `⚡ DIRECT SMTP TEST - ${new Date().toLocaleTimeString()}`,
      html: `
        <h2>Direct SMTP Test</h2>
        <p><strong>This email was sent directly via nodemailer with optimized settings.</strong></p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
        <p>Expected delivery: Under 10 seconds</p>
        <hr>
        <p style="color: red;"><strong>If this arrives instantly, the issue is in the application code.</strong></p>
        <p style="color: green;"><strong>If this also takes hours, the issue is with Gmail itself.</strong></p>
      `,
      text: `Direct SMTP Test sent at ${new Date().toLocaleString()}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('⏱️  End time:', new Date().toISOString());
      console.log('⏱️  Duration:', duration, 'ms');
      console.log('');
      
      if (err) {
        console.error('╔══════════════════════════════════════════════════════════════════════╗');
        console.error('║  ❌ EMAIL SEND FAILED                                                ║');
        console.error('╚══════════════════════════════════════════════════════════════════════╝');
        console.error('Error:', err.message);
        console.error('Full error:', err);
        process.exit(1);
      } else {
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ EMAIL SENT SUCCESSFULLY                                          ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);
        console.log('Envelope:', JSON.stringify(info.envelope));
        console.log('');
        console.log('⏱️  SMTP accepted email in:', duration, 'ms');
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║  ⏰ NOW CHECK YOUR GMAIL                                             ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('Open Gmail and check:');
        console.log('  1. Primary Inbox');
        console.log('  2. Promotions tab');
        console.log('  3. All Mail folder');
        console.log('  4. Search: from:' + process.env.MAIL_USERNAME);
        console.log('');
        console.log('⏱️  Expected arrival: WITHIN 5-10 SECONDS');
        console.log('');
        console.log('If email arrives instantly:');
        console.log('  → Issue is in application code (we\'ll fix it)');
        console.log('');
        console.log('If email takes hours:');
        console.log('  → Gmail is throttling this sender');
        console.log('  → We need to use different sender or service');
        console.log('');
        
        // Close connection
        transporter.close();
        console.log('✅ SMTP connection closed');
      }
    });
  }
});
