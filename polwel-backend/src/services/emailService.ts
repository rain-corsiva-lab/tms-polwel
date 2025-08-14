import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      // Use SMTP configuration from environment variables
      const config: EmailConfig = {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '465'),
        secure: process.env.MAIL_ENCRYPTION === 'SSL',
        auth: {
          user: process.env.MAIL_USERNAME || '',
          pass: process.env.MAIL_PASSWORD || ''
        }
      };

      // For development, create a test account if SMTP not configured
      if (!config.auth.user || !config.auth.pass) {
        console.log('SMTP not configured, password reset emails will be logged to console');
        return null;
      }

      this.transporter = nodemailer.createTransport(config);
    }
    return this.transporter;
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async sendPasswordResetEmail(
    email: string, 
    name: string, 
    resetToken: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8082'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Password Reset Request - POLWEL Training System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>POLWEL Training System</h1>
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              
              <p>We received a request to reset your password for the POLWEL Training System. If you made this request, please click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour for security reasons</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>For security, never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If you have any questions or need assistance, please contact our support team.</p>
              
              <p>Best regards,<br>POLWEL Training System Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} POLWEL. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      if (transporter) {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
        return true;
      } else {
        // In development mode, log the reset URL
        console.log('=== PASSWORD RESET EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`Token: ${resetToken}`);
        console.log('===============================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  static async sendUserSetupEmail(
    email: string,
    name: string,
    setupUrl: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Complete Your Account Setup - POLWEL Training System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #ea580c; }
            .highlight { background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .steps { background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .step { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .step:last-child { border-bottom: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to POLWEL!</h1>
              <h2>Complete Your Account Setup</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              
              <p>Welcome to the POLWEL Training Management System! Your account has been created and you're just one step away from accessing the platform.</p>
              
              <div class="highlight">
                <h3>📋 What's Next?</h3>
                <p>Click the button below to complete your account setup. You'll be asked to:</p>
                <div class="steps">
                  <div class="step">🔐 <strong>Set Your Password:</strong> Create a secure password for your account</div>
                  <div class="step">📋 <strong>Accept Terms:</strong> Review and accept our Terms & Conditions</div>
                  <div class="step">🔒 <strong>Privacy Policy:</strong> Review our Privacy Policy</div>
                  <div class="step">✅ <strong>Complete Setup:</strong> Finalize your account activation</div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${setupUrl}" class="button">🚀 Complete Account Setup</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace;">${setupUrl}</p>
              
              <div class="highlight">
                <strong>⚠️ Important Security Information:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This setup link will expire in <strong>24 hours</strong></li>
                  <li>For security, this link can only be used once</li>
                  <li>Keep your login credentials confidential</li>
                  <li>If you didn't expect this email, please contact your administrator</li>
                </ul>
              </div>
              
              <p>Once your setup is complete, you'll be able to access the POLWEL Training System with your new credentials.</p>
              
              <p>If you have any questions or need assistance, please contact our support team or your system administrator.</p>
              
              <p>Best regards,<br><strong>POLWEL Training System Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} POLWEL. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      if (transporter) {
        await transporter.sendMail(mailOptions);
        console.log(`User setup email sent to ${email}`);
        return true;
      } else {
        // In development mode, log the setup URL
        console.log('=== USER SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('==========================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending user setup email:', error);
      return false;
    }
  }
}

export default EmailService;
