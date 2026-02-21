import { Router } from 'express';
import EmailService from '../services/emailService';

const router = Router();

/**
 * Test email endpoint - for debugging email configuration
 * POST /api/test-email
 */
router.post('/test-email', async (req, res) => {
  try {
    const { to, type } = req.body;
    const recipientEmail = to || 'kukuhthewow@gmail.com';
    
    console.log('='.repeat(80));
    console.log('📧 EMAIL TEST ENDPOINT CALLED');
    console.log('   Recipient:', recipientEmail);
    console.log('   Type:', type || 'simple');
    console.log('='.repeat(80));

    // Get transporter info
    const transporterInfo = (EmailService as any).getTransporter();
    console.log('🔍 Transporter status:', transporterInfo ? 'INITIALIZED' : 'NULL');
    
    if (!transporterInfo) {
      return res.status(500).json({
        success: false,
        error: 'Email transporter not configured',
        details: 'SMTP settings missing in environment variables'
      });
    }

    // Test course confirmation email (matches the actual flow)
    if (type === 'course') {
      console.log('📨 Sending COURSE CONFIRMATION email...');
      
      const result = await (EmailService as any).sendLearnerCourseConfirmationEmail({
        email: recipientEmail,
        learnerName: 'Test User',
        courseTitle: 'Test Course - Email Diagnostic',
        courseCode: 'TEST',
        serialNumber: 'TEST-001',
        startDate: new Date('2026-05-04T10:00:00'),
        endDate: new Date('2026-05-04T16:00:00'),
        venueName: 'POLWEL Training Room',
        venueAddress: '800 Lor 1 Toa Payoh, #04-04, Singapore 319042',
        additionalNotes: 'This is a test email to diagnose email delivery issues.',
        cc: null,
        attachments: null
      });

      console.log('📊 Email send result:', result);
      
      return res.json({
        success: result,
        message: result 
          ? 'Course confirmation email sent successfully' 
          : 'Failed to send course confirmation email',
        recipient: recipientEmail,
        type: 'course',
        timestamp: new Date().toISOString()
      });
    }

    // Test trainer assignment email
    if (type === 'trainer') {
      console.log('📨 Sending TRAINER ASSIGNMENT email...');
      const result = await (EmailService as any).sendTrainerAssignmentEmail(
        recipientEmail,
        'Celine Microsoft',
        {
          course: 'The Emotional-Intelligent Leader',
          serialNumber: 'TEL-200226',
          startDate: new Date('2026-02-20T10:00:00').toISOString(),
          endDate: new Date('2026-02-20T17:00:00').toISOString(),
          venue: 'Marriott Tangs',
          venueAddress: '317 Orchard Road, Singapore 238888',
          specifiedLocation: 'Orchid Ballroom',
        },
        1500,
        null,
        null,
        null,
        'trainer'
      );
      return res.json({ success: result.success, message: result.success ? 'Trainer email sent' : result.error, recipient: recipientEmail, type: 'trainer' });
    }

    // Test partner assignment email
    if (type === 'partner') {
      console.log('📨 Sending PARTNER ASSIGNMENT email...');
      const result = await (EmailService as any).sendTrainerAssignmentEmail(
        recipientEmail,
        'GlobalTech Training Partners',
        {
          course: 'The Emotional-Intelligent Leader',
          serialNumber: 'TEL-200226',
          startDate: new Date('2026-02-20T10:00:00').toISOString(),
          endDate: new Date('2026-02-20T17:00:00').toISOString(),
          venue: 'Marriott Tangs',
          venueAddress: '317 Orchard Road, Singapore 238888',
        },
        0,
        null,
        null,
        null,
        'partner'
      );
      return res.json({ success: result.success, message: result.success ? 'Partner email sent' : result.error, recipient: recipientEmail, type: 'partner' });
    }

    // Test course cancellation email
    if (type === 'cancellation') {
      console.log('📨 Sending COURSE CANCELLATION email...');
      const result = await (EmailService as any).sendCourseCancellationEmail({
        email: recipientEmail,
        learnerName: 'Test Learner',
        courseTitle: 'The Emotional-Intelligent Leader',
        serialNumber: 'TEL-200226',
        startDate: new Date('2026-02-20T09:00:00'),
        endDate: new Date('2026-02-20T17:00:00'),
        venueName: 'Marriott Tangs',
        cancellationReason: 'unforeseen circumstances',
      });
      return res.json({ success: result, message: result ? 'Cancellation email sent' : 'Failed to send', recipient: recipientEmail, type: 'cancellation' });
    }

    // Test waiver notification email
    if (type === 'waiver') {
      console.log('📨 Sending WAIVER NOTIFICATION email...');
      const result = await (EmailService as any).sendWaiverPendingNotificationEmail({
        adminEmail: recipientEmail,
        adminName: 'Admin User',
        learnerName: 'John Tan Wei Ming',
        courseName: 'The Emotional-Intelligent Leader',
        serialNumber: 'TEL-200226',
        submissionDate: new Date(),
        reason: 'Medical emergency – learner was hospitalised on the course date and unable to attend. Supporting medical certificate has been attached.',
        waiverRequestUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/waiver-requests`,
      });
      return res.json({ success: result, message: result ? 'Waiver notification sent' : 'Failed to send', recipient: recipientEmail, type: 'waiver' });
    }

    console.log('📨 Sending SIMPLE TEST email...');
    
    const result = await (EmailService as any).sendTrainerSetupEmail(
      recipientEmail,
      'Test User',
      'http://localhost:8080/test-link'
    );

    console.log('📊 Email send result:', result);

    return res.json({
      success: result,
      message: result ? 'Test email sent successfully' : 'Failed to send test email',
      recipient: recipientEmail,
      type: 'simple',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Email test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Email test failed',
      details: (error as Error).message
    });
  }
});

export default router;
