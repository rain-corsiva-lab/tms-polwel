// Verify email URL resolution
console.log('🔍 Verifying EMAIL_FRONTEND_URL configuration...\n');

// Load environment variables from .env
require('dotenv').config({ override: true });

const EMAIL_FRONTEND_URL = process.env.EMAIL_FRONTEND_URL || 'https://tms.polwel.org.sg';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

console.log('📋 Environment Variables:');
console.log(`   FRONTEND_URL: ${FRONTEND_URL}`);
console.log(`   EMAIL_FRONTEND_URL: ${EMAIL_FRONTEND_URL}`);

// Simulate what the email service does
const emailFrontendUrl = (EMAIL_FRONTEND_URL || 'https://tms.polwel.org.sg').replace(/\/$/, '');

const linkedinUrl = emailFrontendUrl + '/images/icons8-linkedin.svg';
const youtubeUrl = emailFrontendUrl + '/images/icons8-youtube.svg';
const logoUrl = emailFrontendUrl + '/images/POLWEL Logo_Horizontal.png';

console.log('\n✅ Generated URLs for emails:');
console.log(`   LinkedIn: ${linkedinUrl}`);
console.log(`   YouTube:  ${youtubeUrl}`);
console.log(`   Logo:     ${logoUrl}`);

// Verify the URLs are accessible
const http = require('http');
const https = require('https');

async function verifyUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
      res.resume(); // Consume response data
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(2000);
    req.end();
  });
}

async function testUrls() {
  console.log('\n🔗 Testing URL accessibility...');
  
  const results = {
    linkedin: await verifyUrl(linkedinUrl),
    youtube: await verifyUrl(youtubeUrl),
    logo: await verifyUrl(logoUrl)
  };
  
  console.log(`   LinkedIn: ${results.linkedin ? '✅ Accessible' : '❌ Not accessible'}`);
  console.log(`   YouTube:  ${results.youtube ? '✅ Accessible' : '❌ Not accessible'}`);
  console.log(`   Logo:     ${results.logo ? '✅ Accessible' : '❌ Not accessible'}`);
  
  if (linkedinUrl.includes('localhost') || linkedinUrl.includes('127.0.0.1')) {
    console.log('\n⚠️  Using localhost URLs. Frontend server must be running on port 8080!');
  }
}

testUrls().then(() => {
  console.log('\n✨ Email URL configuration verification complete!');
}).catch(err => {
  console.error('Error during verification:', err);
});
