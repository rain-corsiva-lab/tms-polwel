/**
 * Test: send 5 MB zip via Mailjet REST API (v3.1)
 */
const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const LARGE_ZIP = fs.readdirSync(path.join(__dirname, 'uploads/email-attachments'))
  .map(f => ({ name: f, size: fs.statSync(path.join(__dirname, 'uploads/email-attachments', f)).size }))
  .filter(f => f.name.endsWith('.zip') && f.size > 4 * 1024 * 1024)
  .sort((a, b) => b.size - a.size)[0];

if (!LARGE_ZIP) { console.error('No large zip found'); process.exit(1); }

const zipPath    = path.join(__dirname, 'uploads/email-attachments', LARGE_ZIP.name);
const fileBuffer = fs.readFileSync(zipPath);

const apiKey    = process.env.MAIL_USERNAME;
const apiSecret = process.env.MAIL_PASSWORD;
const fromEmail = process.env.MAIL_FROM_ADDRESS;
const toEmail   = 'kukuhthewow@gmail.com';

console.log(`\n📎 File: ${LARGE_ZIP.name} (${(LARGE_ZIP.size/1024/1024).toFixed(2)} MB)`);
console.log(`📧 Mailjet REST API: ${apiKey?.slice(0,8)}... → ${toEmail}`);
console.log(`📬 From: ${fromEmail}\n`);

const payload = {
  Messages: [{
    From: { Email: fromEmail, Name: 'POLWEL Training System' },
    To:   [{ Email: toEmail }],
    Subject: `[TEST REST API] Large attachment ${(LARGE_ZIP.size/1024/1024).toFixed(2)} MB - ${new Date().toISOString()}`,
    TextPart: `Test email via Mailjet REST API with ${(LARGE_ZIP.size/1024/1024).toFixed(2)} MB zip.`,
    Attachments: [{
      ContentType:   'application/zip',
      Filename:      'test-course-materials.zip',
      Base64Content: fileBuffer.toString('base64'),
    }]
  }]
};

const payloadSize = JSON.stringify(payload).length;
console.log(`📊 JSON payload size: ${(payloadSize/1024/1024).toFixed(2)} MB`);
console.log('🚀 Sending via Mailjet REST API...');
console.log('⏱  Started:', new Date().toISOString());
const start = Date.now();

fetch('https://api.mailjet.com/v3.1/send', {
  method: 'POST',
  headers: {
    'Content-Type':  'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
  },
  body: JSON.stringify(payload),
}).then(async res => {
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const body = await res.json();

  console.log(`\n⏱  Finished: ${new Date().toISOString()} (${elapsed}s)`);
  console.log(`📡 HTTP Status: ${res.status}`);
  console.log('📨 Response:', JSON.stringify(body, null, 2));

  if (res.ok && body?.Messages?.[0]?.Status === 'success') {
    const msgId = body.Messages[0].To?.[0]?.MessageID;
    console.log(`\n✅ SUCCESS! MessageID: ${msgId}`);
    console.log(`📬 Check inbox at: ${toEmail} — should arrive within 30 seconds`);
  } else {
    console.error('\n❌ FAILED:', JSON.stringify(body));
    process.exit(1);
  }
}).catch(err => {
  console.error('\n❌ Fetch error:', err.message);
  process.exit(1);
});
