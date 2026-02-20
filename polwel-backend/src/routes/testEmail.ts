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

    // Simple test email
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
