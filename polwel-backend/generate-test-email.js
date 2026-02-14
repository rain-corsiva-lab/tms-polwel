/**
 * Generate and save email HTML with logo to inspect
 */

const fs = require('fs');
const path = require('path');

// Load logo as base64
function loadLogo() {
  const logoPath = '/home/kukuh/webprojects/polwel/public/images/POLWEL Logo_Horizontal.png';
  const imageBuffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

// Generate email HTML
function generateTestEmail(logoBase64) {
  const name = 'Test Trainer';
  const setupUrl = 'http://localhost:8080/trainer-setup/test-token-123';
  
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>POLWEL Trainer Setup</title>
  </head>
  <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #0f172a;" bgcolor="#0f172a">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 28px 24px; background-color: #1f2937;" bgcolor="#1f2937">
                <div style="text-align: center; margin-bottom: 16px;"><img src="${logoBase64}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff !important;">Welcome to POLWEL!</h1>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #f3f4f6 !important;">Complete Your Trainer Account Setup</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 16px 0; color: #1f2937 !important;">Hello ${name},</p>
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151 !important; line-height: 1.7;">Welcome to the POLWEL Training Management System! We're excited to have you join our team of trainers.</p>
                
                <div style="border: 3px solid #3b82f6; padding: 20px; margin: 20px 0; background-color: #eff6ff; border-radius: 8px;">
                  <h3 style="margin: 0 0 10px 0; color: #1e40af;">✅ Logo Test Status</h3>
                  <p style="margin: 5px 0; font-size: 14px; color: #1e293b;">
                    <strong>Logo Source Type:</strong> ${logoBase64.startsWith('data:image') ? 'Base64 Inline ✅' : 'URL ⚠️'}
                  </p>
                  <p style="margin: 5px 0; font-size: 14px; color: #1e293b;">
                    <strong>Source Length:</strong> ${logoBase64.length} characters
                  </p>
                  <p style="margin: 5px 0; font-size: 14px; color: #1e293b;">
                    <strong>First 80 chars:</strong> <code style="background: #f1f5f9; padding: 2px 4px; font-size: 11px;">${logoBase64.substring(0, 80)}...</code>
                  </p>
                </div>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                  <tr>
                    <td style="padding: 24px; background-color: #f8fafc; border: 1px solid #e5e7eb;" align="center">
                      <a href="${setupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;" bgcolor="#3b82f6">Complete Trainer Setup</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 24px 28px 30px; text-align: center; background-color: #0f172a;" bgcolor="#0f172a">
                <p style="margin: 0; font-size: 12px; color: #94a3b8 !important;">&copy; 2026 POLWEL Training Management. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

console.log('\n🔍 GENERATING EMAIL HTML WITH LOGO TEST\n');
console.log('='.repeat(70));

try {
  const logoBase64 = loadLogo();
  console.log('✅ Logo loaded successfully');
  console.log('   Length:', logoBase64.length, 'characters');
  console.log('   Type:', logoBase64.startsWith('data:image/png;base64,') ? 'Base64 PNG' : 'Other');
  
  const html = generateTestEmail(logoBase64);
  const outputPath = path.join(__dirname, 'test-email-output.html');
  
  fs.writeFileSync(outputPath, html);
  console.log('\n✅ Email HTML saved to:', outputPath);
  console.log('   File size:', Math.round(html.length / 1024), 'KB');
  console.log('\n📖 To test:');
  console.log('   1. Open the file in a web browser');
  console.log('   2. Check if the POLWEL logo displays in the header');
  console.log('   3. The blue box shows logo debugging info');
  console.log('\n💡 If logo displays in browser, the email logo implementation is correct!');
  console.log('='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ Error:', error.message);
}
