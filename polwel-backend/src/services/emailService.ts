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
  tls?: {
    rejectUnauthorized: boolean;
  };
}

class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      // Use SMTP configuration from environment variables
      const config: EmailConfig = {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_ENCRYPTION === 'SSL',
        auth: {
          user: process.env.MAIL_USERNAME || '',
          pass: process.env.MAIL_PASSWORD || ''
        },
        tls: {
          rejectUnauthorized: false
        }
      };

      // For development, create a test account if SMTP not configured
      if (!config.auth.user || !config.auth.pass) {
        console.log('⚠️  SMTP not configured, emails will be logged to console only');
        console.log('📧 To enable emails, set MAIL_USERNAME and MAIL_PASSWORD in .env file');
        return null;
      }

      console.log('📧 Initializing email service with:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user?.substring(0, 3) + '***' // Only show first 3 chars for security
      });

      this.transporter = nodemailer.createTransport(config as any);
    }
    return this.transporter;
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async sendTrainerSetupEmail(
    email: string,
    name: string,
    setupUrl: string
  ): Promise<boolean> {
  const transporter = this.getTransporter();
  const expiryMinutes = parseInt(process.env.MFA_CODE_EXPIRY_MINUTES || '10', 10);

  const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Trainer Account Setup',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Welcome to POLWEL!</h1>
              <h2>Complete Your Trainer Account Setup</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Welcome to the POLWEL Training Management System! Click the button below to complete your setup:</p>
              <div style="text-align: center;">
                <a href="${setupUrl}" class="button">Complete Trainer Setup</a>
              </div>
              <p>Best regards,<br><strong>POLWEL Training System Team</strong></p>
            </div>
            <div class="footer">
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
        console.log(`Trainer setup email sent to ${email}`);
        return true;
      } else {
        console.log('=== TRAINER SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending trainer setup email:', error);
      return false;
    }
  }

  static async sendCoordinatorSetupEmail(
    email: string,
    name: string,
    setupUrl: string,
    organizationName: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Training Coordinator Setup',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Welcome to POLWEL!</h1>
              <h2>Complete Your Training Coordinator Setup</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Welcome to the POLWEL Training Management System! You've been added as a Training Coordinator for <strong>${organizationName}</strong>.</p>
              <div style="text-align: center;">
                <a href="${setupUrl}" class="button">Complete Coordinator Setup</a>
              </div>
              <p>Best regards,<br><strong>POLWEL Training System Team</strong></p>
            </div>
            <div class="footer">
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
        console.log(`Coordinator setup email sent to ${email}`);
        return true;
      } else {
        console.log('=== COORDINATOR SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Organization: ${organizationName}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending coordinator setup email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'POLWEL - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #b91c1c; }
            .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>We received a request to reset your password for your POLWEL account. Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <div class="warning">
                <strong>⚠️ Security Note:</strong> This link will expire in 1 hour for security purposes. If you didn't request this password reset, please ignore this email.
              </div>
              <p>Best regards,<br><strong>POLWEL Security Team</strong></p>
            </div>
            <div class="footer">
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
        console.log('=== PASSWORD RESET EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=============================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  static async sendMfaCodeEmail(
    email: string,
    name: string | null,
    code: string,
    expiresAt: Date
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    const friendlyName = name?.trim() ? name : email;
    const formattedExpiry = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(expiresAt);
    const expiryMinutes = Math.max(
      1,
      Math.round((expiresAt.getTime() - Date.now()) / 60000)
    );

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'POLWEL Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f3f4f6; padding: 0; margin: 0; }
            .container { max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
            .title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 12px; }
            .subtitle { font-size: 16px; color: #4b5563; margin-bottom: 24px; }
            .code { font-size: 36px; letter-spacing: 12px; font-weight: 700; text-align: center; color: #2563eb; background: #eff6ff; padding: 18px 24px; border-radius: 12px; border: 1px solid #bfdbfe; }
            .footer { margin-top: 28px; font-size: 13px; color: #6b7280; }
            .warning { margin-top: 20px; padding: 16px; border-radius: 12px; background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; font-size: 13px; }
          </style>
        </head>
        <body>
          <div style="padding: 32px 16px; background: #f3f4f6;">
            <div class="container">
              <div class="title">Verify your login</div>
              <div class="subtitle">Hi ${friendlyName}, use the code below to complete your sign in to the POLWEL Training Management System.</div>
              <div class="code">${code}</div>
              <div class="subtitle" style="margin-top: 28px;">This code will expire at <strong>${formattedExpiry}</strong>. Enter it on the sign-in page within the next ${expiryMinutes} minutes.</div>
              <div class="warning">If you didn’t request this code, please secure your account immediately by resetting your password.</div>
              <div class="footer">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      if (transporter) {
        await transporter.sendMail(mailOptions);
        console.log(`MFA code email sent to ${email}`);
        return true;
      } else {
        console.log('=== MFA CODE EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Recipient: ${friendlyName}`);
        console.log(`Code: ${code}`);
        console.log(`Expires At: ${formattedExpiry}`);
        console.log('========================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending MFA code email:', error);
      return false;
    }
  }

  static async sendUserSetupEmail(
    email: string,
    name: string,
    setupUrl: string
  ): Promise<boolean> {
    // This is an alias for sendPolwelUserSetupEmail for backward compatibility
    return this.sendPolwelUserSetupEmail(email, name, setupUrl);
  }

  static async sendPolwelUserSetupEmail(
    email: string,
    name: string,
    setupUrl: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Account Setup',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Welcome to POLWEL!</h1>
              <h2>Complete Your Account Setup</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Welcome to the POLWEL Training Management System! Click the button below to complete your setup:</p>
              <div style="text-align: center;">
                <a href="${setupUrl}" class="button">Complete Account Setup</a>
              </div>
              <p>Best regards,<br><strong>POLWEL Training System Team</strong></p>
            </div>
            <div class="footer">
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
        console.log(`POLWEL user setup email sent to ${email}`);
        return true;
      } else {
        console.log('=== POLWEL USER SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        return true;
      }
    } catch (error) {
      console.error('Error sending POLWEL user setup email:', error);
      return false;
    }
  }

  static async sendTrainerAssignmentEmail(
    email: string,
    name: string,
    courseRunDetails: {
      course?: string;
      serialNumber?: string;
      startDate?: string | null;
      endDate?: string | null;
      venue?: string | null;
    },
    baseFee: number,
    additionalCost: number,
    ccEmails?: string[] | null,
    additionalBody?: string | null
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    const transporter = this.getTransporter();

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);

    const formatDate = (d?: string | null) => {
      if (!d) return 'TBD';
      try {
        const dt = new Date(d);
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(dt);
      } catch {
        return String(d);
      }
    };

    const total = baseFee + (additionalCost || 0);

    const body = `Dear ${name},\n\nYou have been assigned as a trainer for the following course run:\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Serial Number: ${courseRunDetails.serialNumber || ''}\n- Start Date: ${formatDate(courseRunDetails.startDate)}\n- End Date: ${formatDate(courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}\n\nYour Compensation:\n- Base Fee: ${formatCurrency(baseFee)}\n${additionalCost > 0 ? `- Additional Cost: ${formatCurrency(additionalCost)}\n` : ''}- Total: ${formatCurrency(total)}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Please confirm your availability for this course run.\n\nBest regards,\nPolwel Training Team`;

    const mailOptions: any = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `Trainer Assignment: ${courseRunDetails.serialNumber || ''}`,
      text: body,
    };

    if (ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0) {
      mailOptions.cc = ccEmails.join(', ');
    }

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — trainer assignment email would be:');
        console.log('To:', email);
        console.log('CC:', ccEmails);
        console.log('Subject:', mailOptions.subject);
        console.log('Body:', body);
        return { success: false, error: 'SMTP not configured' };
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`(EmailService) Trainer assignment email sent to ${email}:`, info?.messageId || info);
      return { success: true, info };
    } catch (err) {
      console.error('(EmailService) Failed to send trainer assignment email:', (err as any)?.message || err);
      return { success: false, error: (err as any)?.message || String(err) };
    }
  }
}

export default EmailService;