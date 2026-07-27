import { PrismaClient } from '@prisma/client';
import EmailService from '../services/emailService';

const prisma = new PrismaClient();

async function viewLocalEmailLogs() {
  console.log('================================================================');
  console.log('📋 LOCAL DATABASE (`polwel_training`) EMAIL LOGS INSPECTION');
  console.log('Target recipient: kukuhlumajang@gmail.com');
  console.log('================================================================\n');

  // Trigger a test email send in local mode
  console.log('📨 Sending a live test password reset email via EmailService...');
  const sendResult = await EmailService.sendPasswordResetEmail(
    'kukuhlumajang@gmail.com',
    'Kukuh',
    'http://localhost:8080/reset-password?token=local_test_token_12345'
  );
  console.log('  Send Result:', sendResult ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n🔍 Fetching latest 15 records from `email_logs` table in local MySQL DB:\n');

  const logs = await prisma.emailLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
  });

  if (logs.length === 0) {
    console.log('No email logs found in database.');
  } else {
    console.log(`Found ${logs.length} records in ` + '`email_logs`' + ` table:\n`);
    logs.forEach((log, index) => {
      console.log(`[Record #${index + 1}]`);
      console.log(`  ├─ ID:             ${log.id}`);
      console.log(`  ├─ Email Type:     ${log.emailType}`);
      console.log(`  ├─ Recipient:      ${log.recipient}`);
      console.log(`  ├─ Subject:        ${log.subject}`);
      console.log(`  ├─ Status:         ${log.status}`);
      console.log(`  ├─ Provider:       ${log.provider}`);
      console.log(`  ├─ Error Category: ${log.errorCategory || 'N/A'}`);
      console.log(`  ├─ Error Message:  ${log.errorMessage || 'None'}`);
      console.log(`  ├─ SMTP Response:  ${log.smtpResponse || 'None'}`);
      console.log(`  ├─ Message ID:     ${log.messageId || 'None'}`);
      console.log(`  └─ Created At:     ${log.createdAt.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`);
      console.log('----------------------------------------------------------------');
    });
  }

  await prisma.$disconnect();
}

viewLocalEmailLogs().catch((err) => {
  console.error('❌ Error viewing email logs:', err);
  process.exit(1);
});
