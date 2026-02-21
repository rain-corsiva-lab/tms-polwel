const nodemailer = require('nodemailer');

async function testCourseEmail() {
  console.log('📧 Testing Course Confirmation Email Simulation...\n');
  
  // Same configuration as emailService
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'phuongtestwordpress@gmail.com',
      pass: 'osvttyfchgykhpel'
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    debug: true,
    logger: true
  });

  console.log('🔍 Verifying connection...');
  await transporter.verify();
  console.log('✅ Connection verified\n');

  console.log('📨 Sending course confirmation email simulation...');
  const mailOptions = {
    from: 'phuongtestwordpress@gmail.com', // Match emailService
    to: 'kukuhthewow@gmail.com',
    subject: 'Course Confirmation — Growth Mindset Developments (04 May 2026)',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; background-color: #0f172a;">
          <table width="100%" bgcolor="#0f172a">
            <tr>
              <td align="center" style="padding: 32px 16px;">
                <table width="560" bgcolor="#ffffff">
                  <tr>
                    <td style="padding: 32px 28px; background-color: #1f2937;">
                      <h1 style="color: #ffffff; font-size: 20px;">Course Confirmation</h1>
                      <p style="color: #e5e7eb; font-size: 14px;">Registration Confirmed</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 28px;">
                      <p style="color: #4b5563;">Dear Participants,</p>
                      <p style="color: #1f2937;">Please refer to the details below regarding the upcoming course, <strong>Growth Mindset Developments</strong>.</p>
                      
                      <table border="1" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 12px; background-color: #f9fafb;">Day & Date</td>
                          <td style="padding: 12px;">Sunday, 4 May 2026</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9fafb;">Time</td>
                          <td style="padding: 12px;">1000 to 1600 hrs</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9fafb;">Venue</td>
                          <td style="padding: 12px;">POLWEL Training Room</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9fafb;">Note</td>
                          <td style="padding: 12px;">For any queries, contact PDCS at pdcs@polwel.org.sg</td>
                        </tr>
                      </table>
                      
                      <table style="margin: 20px 0;">
                        <tr>
                          <td style="padding: 16px; background-color: #f3f4f6;">
                            <p style="margin: 0; font-weight: 600;">Withdrawal Policy</p>
                            <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                              • <strong>More than 10 working days:</strong> 0% chargeable<br/>
                              • <strong>Within 10 working days:</strong> 50% chargeable<br/>
                              • <strong>Absence on course day:</strong> 100% chargeable
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 0 0;">Thank you.</p>
                      <p style="margin: 12px 0 0 0;">Regards,</p>
                      <p style="margin: 16px 0 0 0;">
                        <strong>Professional Development & Career Services Division</strong><br/>
                        POLWEL Co-operative Society Limited<br/>
                        Main: (65) 6235 6428 (Option 4)
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 28px; background-color: #ffffff; border-top: 2px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                        © 2026 POLWEL Co-operative Society Limited. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Course email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    if (info.rejected && info.rejected.length > 0) {
      console.log('   ⚠️ WARNING: Some recipients were rejected by Gmail!');
    }
    
    console.log('\n✅ TEST PASSED');
    console.log('📧 Check kukuhthewow@gmail.com:');
    console.log('   1. Primary inbox');
    console.log('   2. Promotions tab');
    console.log('   3. Updates tab');
    console.log('   4. Spam folder');
    console.log('   5. All Mail (search for: from:phuongtestwordpress@gmail.com)');
  } catch (error) {
    console.error('❌ Failed to send:', error.message);
    console.error('   Code:', error.code);
    console.error('   Response:', error.response);
    throw error;
  }
}

testCourseEmail().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
