import { PrismaClient } from '@prisma/client';
import EmailService from '../polwel-backend/src/services/emailService';
import {
  createEmailLog,
  markEmailFailed,
  markEmailSent,
  EMAIL_TYPES,
  EMAIL_PROVIDERS,
  EMAIL_ERROR_CATEGORIES,
  classifyError,
} from '../polwel-backend/src/services/emailLogService';

const prisma = new PrismaClient();

async function runEmailLoggingTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE EMAIL LOGGING & ERROR SUITE TEST');
  console.log('Target recipient: kukuhlumajang@gmail.com');
  console.log('================================================================\n');

  const targetRecipient = 'kukuhlumajang@gmail.com';

  // ---------------------------------------------------------------------------
  // Test 1: Invalid/Missing Recipient upfront handling
  // ---------------------------------------------------------------------------
  console.log('▶ Test 1: Invalid/Null Recipient Upfront Check...');
  const res1 = await (EmailService as any).executeSendEmail({
    emailType: EMAIL_TYPES.PASSWORD_RESET,
    recipient: '', // Empty recipient
    subject: 'Test Reset - Invalid Recipient',
    html: '<p>Test</p>',
  });
  console.log('  Result:', res1);

  // ---------------------------------------------------------------------------
  // Test 2: Simulated Domain Reputation / SPF / DKIM 554 5.7.1 Block
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 2: Domain Reputation / SPF / DKIM Block Simulation...');
  const logId2 = await createEmailLog({
    emailType: EMAIL_TYPES.COURSE_CONFIRMATION,
    recipient: targetRecipient,
    subject: 'Test - Domain Reputation Block',
    provider: EMAIL_PROVIDERS.SMTP,
  });

  const domainRepError = new Error('554 5.7.1 Sender address rejected: Access denied due to SPF policy / domain reputation violation');
  (domainRepError as any).code = '554';
  (domainRepError as any).response = '554 5.7.1 Spam policy rejection - DMARC verification failed';

  await markEmailFailed(logId2, domainRepError.message, '554', 1, {
    smtpResponse: (domainRepError as any).response,
    errorStack: domainRepError.stack,
    errorCategory: classifyError(domainRepError),
    provider: EMAIL_PROVIDERS.SMTP,
  });
  console.log('  Simulated & Logged Domain Reputation Block for log ID:', logId2);

  // ---------------------------------------------------------------------------
  // Test 3: Simulated SMTP Authentication Failure (EAUTH / 535)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 3: SMTP Auth Failure Simulation...');
  const logId3 = await createEmailLog({
    emailType: EMAIL_TYPES.MFA_CODE,
    recipient: targetRecipient,
    subject: 'Test - SMTP Auth Failure',
    provider: EMAIL_PROVIDERS.SMTP,
  });

  const authError = new Error('Invalid login: 535 5.7.8 Authentication credentials invalid');
  (authError as any).code = 'EAUTH';
  (authError as any).response = '535 5.7.8 Authentication failed';

  await markEmailFailed(logId3, authError.message, 'EAUTH', 1, {
    smtpResponse: (authError as any).response,
    errorStack: authError.stack,
    errorCategory: classifyError(authError),
    provider: EMAIL_PROVIDERS.SMTP,
  });
  console.log('  Simulated & Logged Auth Failure for log ID:', logId3);

  // ---------------------------------------------------------------------------
  // Test 4: Simulated Rate Limit / Throttle Error (429 / 451)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 4: Rate Limit / Throttle Simulation...');
  const logId4 = await createEmailLog({
    emailType: EMAIL_TYPES.TRAINER_ASSIGNMENT,
    recipient: targetRecipient,
    subject: 'Test - Rate Limit Throttling',
    provider: EMAIL_PROVIDERS.MAILJET,
  });

  const rateLimitErr = new Error('429 Too Many Requests: Sending rate limit exceeded for sending domain');
  (rateLimitErr as any).code = '429';

  await markEmailFailed(logId4, rateLimitErr.message, '429', 1, {
    smtpResponse: '429 Too Many Requests',
    errorStack: rateLimitErr.stack,
    errorCategory: classifyError(rateLimitErr),
    provider: EMAIL_PROVIDERS.MAILJET,
  });
  console.log('  Simulated & Logged Rate Limit for log ID:', logId4);

  // ---------------------------------------------------------------------------
  // Test 5: Simulated Network / Timeout Error (ECONNREFUSED / ETIMEDOUT)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 5: Network Timeout Simulation...');
  const logId5 = await createEmailLog({
    emailType: EMAIL_TYPES.WAIVER_NOTIFICATION,
    recipient: targetRecipient,
    subject: 'Test - Network Connection Timeout',
    provider: EMAIL_PROVIDERS.SMTP,
  });

  const timeoutErr = new Error('Connection timed out after 30000ms connecting to smtp.polwel.org.sg:587');
  (timeoutErr as any).code = 'ETIMEDOUT';

  await markEmailFailed(logId5, timeoutErr.message, 'ETIMEDOUT', 1, {
    smtpResponse: 'ETIMEDOUT Connection Timeout',
    errorStack: timeoutErr.stack,
    errorCategory: classifyError(timeoutErr),
    provider: EMAIL_PROVIDERS.SMTP,
  });
  console.log('  Simulated & Logged Network Timeout for log ID:', logId5);

  // ---------------------------------------------------------------------------
  // Test 6: Successful Outbound Email Dispatch
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 6: Successful Email Delivery to kukuhlumajang@gmail.com...');
  const res6 = await EmailService.sendPasswordResetEmail(
    targetRecipient,
    'Kukuh',
    'https://tms.polwel.org.sg/reset-password?token=test123456789'
  );
  console.log('  Result:', res6);

  // ---------------------------------------------------------------------------
  // Verify Database Logs
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 QUERYING DATABASE `email_logs` TO VERIFY ALL LOGGED ATTEMPTS');
  console.log('================================================================');

  const recentLogs = await prisma.emailLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${recentLogs.length} recent email log entries in database:\n`);
  recentLogs.forEach((log, idx) => {
    console.log(`[#${idx + 1}] ID: ${log.id}`);
    console.log(`     Type: ${log.emailType} | Recipient: ${log.recipient}`);
    console.log(`     Subject: ${log.subject}`);
    console.log(`     Status: ${log.status} | Provider: ${log.provider}`);
    console.log(`     Error Category: ${log.errorCategory || 'N/A'}`);
    console.log(`     Error Message: ${log.errorMessage || 'None'}`);
    console.log(`     SMTP Response: ${log.smtpResponse || 'None'}`);
    console.log(`     Created At: ${log.createdAt.toISOString()}`);
    console.log('----------------------------------------------------------------');
  });

  await prisma.$disconnect();
}

runEmailLoggingTestSuite().catch((err) => {
  console.error('❌ Test suite execution error:', err);
  process.exit(1);
});
