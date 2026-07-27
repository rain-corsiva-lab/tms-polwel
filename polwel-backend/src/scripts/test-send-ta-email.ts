import { PrismaClient } from '@prisma/client';
import EmailService from '../services/emailService';

const prisma = new PrismaClient();

async function sendTestTaEmail() {
  console.log('================================================================');
  console.log('📧 DISPATCHING TEST TRAINER ASSIGNMENT (TA) EMAIL');
  console.log('Target recipient: kukuhlumajang@gmail.com');
  console.log('================================================================\n');

  const courseRunDetails = {
    course: 'Security Management Course',
    serialNumber: 'SMC-100826',
    startDate: '2026-08-10T09:00:00.000Z',
    endDate: '2026-08-12T17:00:00.000Z',
    venue: 'POLWEL Training Centre, Room 302',
    venueAddress: '10 Anson Road, International Plaza #20-15, Singapore 079903',
    trainerRemarks: 'Please bring your laptop and trainer manual.',
  };

  console.log('Sending TA Email with course details:');
  console.log(' - Course Name:', courseRunDetails.course);
  console.log(' - Dates:', '10 Aug 2026 - 12 Aug 2026');

  const result = await EmailService.sendTrainerAssignmentEmail(
    'kukuhlumajang@gmail.com',
    'Kukuh Tri',
    courseRunDetails,
    1500, // base fee
    null, // cc
    'This is a test notification for the updated TA Email subject line structure.'
  );

  console.log('\nSend Result:', result);

  console.log('\n🔍 Fetching latest record from `email_logs` database table:\n');

  const latestLog = await prisma.emailLog.findFirst({
    where: { recipient: 'kukuhlumajang@gmail.com' },
    orderBy: { createdAt: 'desc' },
  });

  if (latestLog) {
    console.log('Latest Email Log Entry:');
    console.log(' ├─ Log ID:        ', latestLog.id);
    console.log(' ├─ Email Type:    ', latestLog.emailType);
    console.log(' ├─ Recipient:     ', latestLog.recipient);
    console.log(' ├─ Subject:       ', latestLog.subject);
    console.log(' ├─ Status:        ', latestLog.status);
    console.log(' ├─ Provider:      ', latestLog.provider);
    console.log(' ├─ Message ID:    ', latestLog.messageId || 'N/A');
    console.log(' └─ Created At:    ', latestLog.createdAt.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }));
  } else {
    console.log('No log found for recipient.');
  }

  await prisma.$disconnect();
}

sendTestTaEmail().catch((err) => {
  console.error('❌ Error sending TA email:', err);
  process.exit(1);
});
