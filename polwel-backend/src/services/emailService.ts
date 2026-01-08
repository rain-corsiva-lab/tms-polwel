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
  private static isInitialized: boolean = false;

  private static getTransporter() {
    if (!this.isInitialized) {
      // Use SMTP configuration from environment variables
      const encryption = process.env.MAIL_ENCRYPTION || 'TLS';
      const isSSL = encryption === 'SSL';
      const isSTARTTLS = encryption === 'STARTTLS';
      
      const config: EmailConfig = {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: isSSL, // true for SSL (port 465), false for STARTTLS (port 587)
        auth: {
          user: process.env.MAIL_USERNAME || '',
          pass: process.env.MAIL_PASSWORD || ''
        },
        tls: {
          rejectUnauthorized: false,
          // For STARTTLS, we need to explicitly set ciphers if using older OpenSSL
          ...(isSTARTTLS && {
            minVersion: 'TLSv1.2'
          })
        }
      };

      // For development, create a test account if SMTP not configured
      if (!config.auth.user || !config.auth.pass) {
        console.log('⚠️  SMTP not configured, emails will be logged to console only');
        console.log('📧 To enable emails, set MAIL_USERNAME and MAIL_PASSWORD in .env file');
        this.isInitialized = true;
        return null;
      }

      console.log('📧 Initializing email service with:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        encryption: encryption,
        user: config.auth.user?.substring(0, 3) + '***' // Only show first 3 chars for security
      });

      this.transporter = nodemailer.createTransport(config as any);
      this.isInitialized = true;
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ SMTP connection verification failed:', error.message);
          console.error('   Code:', (error as any).code);
          console.error('   Details:', (error as any).response);
        } else {
          console.log('✅ SMTP connection verified successfully');
        }
      });
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

  const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Trainer Account Setup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>POLWEL Trainer Setup</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#525252 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1f2937, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #f3f4f6; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #e5e7eb; color: #1f2937; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #d1d5db; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #525252; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
              }
            </style>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff !important;">&#127919; Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #f3f4f6 !important;">Complete Your Trainer Account Setup</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hello ${name},</p>
                        <p class="meta">Welcome to the POLWEL Training Management System! We're excited to have you join our team of trainers. Click the button below to complete your account setup and get started.</p>
                        <div class="button-card">
                          <a href="${setupUrl}" class="button">Complete Trainer Setup</a>
                        </div>
                        <div class="checklist">
                          <p>What's next:</p>
                          <ul>
                            <li><span>1</span><div>Create a secure password for your account.</div></li>
                            <li><span>2</span><div>Set up your profile and verify your details.</div></li>
                            <li><span>3</span><div>Start managing your training sessions.</div></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        <span style="color: #94a3b8 !important;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</span>
                        <div class="support" style="margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92) !important;">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color:#9ca3af !important; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a>.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>POLWEL Coordinator Setup</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#525252 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1f2937, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #f3f4f6; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #e5e7eb; color: #1f2937; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #d1d5db; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .org-badge { display: inline-block; background: #f8fafc; border: 1px solid #e5e7eb; color: #374151; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin: 12px 0; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #525252; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
              }
            </style>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff !important;">&#128203; Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #f3f4f6 !important;">Complete Your Training Coordinator Setup</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hello ${name},</p>
                        <p class="meta">Welcome to the POLWEL Training Management System! You've been added as a Training Coordinator for:</p>
                        <div style="text-align: center;">
                          <span class="org-badge">&#127970; ${organizationName}</span>
                        </div>
                        <div class="button-card">
                          <a href="${setupUrl}" class="button">Complete Coordinator Setup</a>
                        </div>
                        <div class="checklist">
                          <p>Your coordinator access includes:</p>
                          <ul>
                            <li><span>1</span><div>Manage training bookings and course runs.</div></li>
                            <li><span>2</span><div>Coordinate learner enrollments and attendance.</div></li>
                            <li><span>3</span><div>Access organization-specific reports and data.</div></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        <span style="color: #94a3b8 !important;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</span>
                        <div class="support" style="margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92) !important;">Need help? Email <a href="mailto:pdcs@polwel.org.sg" style="color:#9ca3af !important; text-decoration:none;">pdcs@polwel.org.sg</a>.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>POLWEL Password Reset</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#374151 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1f2937, #111827); color: #f8fafc; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; }
              .header p { margin: 4px 0 0; font-size: 14px; color: rgba(254,242,242,0.85); }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #e5e7eb; color: #374151; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #d1d5db; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; font-weight: 600; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #374151; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .warning { margin: 24px 0 0; padding: 18px 22px; border-radius: 12px; background: #f3f4f6; border: 1px solid #9ca3af; font-size: 13px; color: #6b7280; line-height: 1.6; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
              }
            </style>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1>&#128274; Password Reset Request</h1>
                        <p>POLWEL Training Management System</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hello ${name},</p>
                        <p class="meta">We received a request to reset your password for your POLWEL account. Click the button below to create a new password. This link will expire in <strong>1 hour</strong> for security purposes.</p>
                        <div class="button-card">
                          <a href="${resetUrl}" class="button">Reset Your Password</a>
                        </div>
                        <div class="checklist">
                          <p>Security guidelines:</p>
                          <ul>
                            <li><span>1</span><div>Only click this button if you requested a password reset.</div></li>
                            <li><span>2</span><div>Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers.</div></li>
                            <li><span>3</span><div>Never share your password with anyone. POLWEL will never ask for it.</div></li>
                          </ul>
                        </div>
                        <div class="warning">&#9888; <strong>Didn&#39;t request this?</strong> If you didn&#39;t request a password reset, please ignore this email or contact our support team immediately to secure your account. Your current password remains unchanged.</div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color:#9ca3af; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a>.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    try {
      if (transporter) {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}. Message ID: ${result.messageId}`);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error sending password reset email to', email);
      console.error('Error details:', errorMessage);
      console.error('Full error:', error);
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
      subject: 'Your POLWEL security code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>POLWEL Security Code</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#525252 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1f2937, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #f3f4f6; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .code-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .code-label { text-transform: uppercase; font-size: 13px; letter-spacing: 2.2px; color: #4b5563; font-weight: 600; margin-bottom: 12px; }
              .code { font-size: 38px; letter-spacing: 12px; font-weight: 700; color: #374151; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #525252; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .warning { margin: 24px 0 0; padding: 18px 22px; border-radius: 12px; background: #f3f4f6; border: 1px solid #9ca3af; font-size: 13px; color: #6b7280; line-height: 1.6; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
                .code { letter-spacing: 10px; font-size: 32px; }
              }
            </style>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1>Secure your login</h1>
                        <p>POLWEL Training Management System</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hi ${friendlyName},</p>
                        <p class="meta">Use the one-time security code below to complete your sign in. The code expires at <strong>${formattedExpiry}</strong> (${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'} remaining).</p>
                        <div class="code-card">
                          <div class="code-label">One-time security code</div>
                          <div class="code">${code}</div>
                        </div>
                        <div class="checklist">
                          <p>Next steps:</p>
                          <ul>
                            <li><span>1</span><div>Enter the code on the verification screen as soon as possible.</div></li>
                            <li><span>2</span><div>Make sure you are signing in from a trusted device and network.</div></li>
                            <li><span>3</span><div>Do not share this code with anyone. POLWEL will never ask you for it.</div></li>
                          </ul>
                        </div>
                        <div class="warning">Didn&#39;t request this code? Reset your password immediately or contact the POLWEL support team so we can help secure your account.</div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color:#9ca3af; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a>.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>POLWEL Account Setup</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#525252 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1f2937, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #f3f4f6; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #e5e7eb; color: #1f2937; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #d1d5db; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #525252; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
              }
            </style>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff !important;">👤 Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #f3f4f6 !important;">Complete Your Account Setup</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hello ${name},</p>
                        <p class="meta">Welcome to the POLWEL Training Management System! We're excited to have you on board. Click the button below to complete your account setup and start using the platform.</p>
                        <div class="button-card">
                          <a href="${setupUrl}" class="button">Complete Account Setup</a>
                        </div>
                        <div class="checklist">
                          <p>Getting started:</p>
                          <ul>
                            <li><span>1</span><div>Set up your account password securely.</div></li>
                            <li><span>2</span><div>Complete your profile information.</div></li>
                            <li><span>3</span><div>Access all platform features based on your role.</div></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        <span style="color: #94a3b8 !important;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</span>
                        <div class="support" style="margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92) !important;">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color:#9ca3af !important; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a>.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
      venueAddress?: string | null;
    },
    baseFee: number,
    additionalCost: number,
    ccEmails?: string[] | null,
    additionalBody?: string | null,
    attachments?: any[] | null
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    const transporter = this.getTransporter();

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);

    const formatDate = (d?: string | null) => {
      if (!d) return 'TBD';
      try {
        const dt = new Date(d);
        // Format as: Friday, 19 December 2025
        return new Intl.DateTimeFormat('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(dt);
      } catch {
        return String(d);
      }
    };

    const formatTime = (start?: string | null, end?: string | null) => {
      if (!start || !end) return '0900 to 1700 hrs';
      try {
        const startDt = new Date(start);
        const endDt = new Date(end);
        const startTime = startDt.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
        const endTime = endDt.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
        return `${startTime} to ${endTime} hrs`;
      } catch {
        return '0900 to 1700 hrs';
      }
    };

    const professionalFees = baseFee + (additionalCost || 0);

    const textBody = `Dear ${name},\n\nPlease refer to the attached documents and details below for the upcoming course:\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Day & Date: ${formatDate(courseRunDetails.startDate)}${courseRunDetails.endDate && courseRunDetails.startDate !== courseRunDetails.endDate ? ' to ' + formatDate(courseRunDetails.endDate) : ''}\n- Time: ${formatTime(courseRunDetails.startDate, courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}${courseRunDetails.venueAddress ? '\n  ' + courseRunDetails.venueAddress : ''}\n\nYour Professional Fees: ${formatCurrency(professionalFees)}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Thank you.\n\nRegards,\n\nProfessional Development & Career Services Division\nPOLWEL Co-operative Society Limited\nMain: (65) 6235 6428 (Option 4) | www.polwel.org.sg | #POLWELCares\nStay connected with POLWEL on and view our professional development courses on HRP!`;

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Training Assignment & Course Confirmation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { width: 100%; background-color: #f5f5f5; padding: 40px 20px; }
          .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4b5563 0%, #374151 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
          .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
          .an1 {
            vertical-align: middle;
            place-self: center;
            position: relative;
            left: 10px;
          }
          .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
          .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
          .content { padding: 32px 24px; color: #333333; }
          .greeting { font-size: 14px; color: #4b5563; margin-bottom: 16px; }
          .intro-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
          .section-title { font-size: 15px; font-weight: 600; color: #1f2937; margin: 20px 0 12px 0; }
          .course-table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; margin-bottom: 20px; }
          .course-table td { padding: 12px 16px; border: 1px solid #d1d5db; font-size: 14px; vertical-align: top; }
          .course-table td:first-child { background-color: #f9fafb; font-weight: 500; color: #374151; width: 30%; }
          .course-table td:last-child { color: #1f2937; }
          .venue-address { display: block; margin-top: 4px; font-size: 13px; color: #6b7280; line-height: 1.5; }
          .fee-box { background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .fee-label { font-size: 14px; color: #374151; font-weight: 500; margin-bottom: 8px; }
          .fee-value { font-size: 18px; color: #1f2937; font-weight: 600; }
          .additional-section { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .additional-content { font-size: 14px; color: #1f2937; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; }
          .additional-content img { max-width: 100% !important; height: auto !important; display: block; margin: 12px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
          .additional-content p { margin: 8px 0; line-height: 1.6; }
          .additional-content strong { font-weight: 600; color: #1f2937; }
          .additional-content em { font-style: italic; }
          .additional-content u { text-decoration: underline; }
          .additional-content ul, .additional-content ol { margin: 8px 0; padding-left: 24px; }
          .additional-content li { margin: 4px 0; line-height: 1.5; }
          .additional-content a { color: #3b82f6; text-decoration: underline; }
          .additional-content blockquote { border-left: 4px solid #d1d5db; padding-left: 16px; margin: 12px 0; color: #6b7280; font-style: italic; }
          .additional-content pre { background-color: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; }
          .additional-content code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 13px; }
          .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
          .signature { margin-top: 16px; font-size: 14px; color: #4b5563; line-height: 1.8; }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .footer-text { margin: 4px 0; }
          @media only screen and (max-width: 600px) {
            .email-container { padding: 20px 10px; }
            .content { padding: 24px 16px; }
            .header { padding: 24px 16px; }
            .course-table td:first-child { width: 40%; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-wrapper">
              <div class="header">
              <div class="header-icon an1">📧</div>
              <div class="header-title">Training Assignment & Course Confirmation</div>
              <div class="header-subtitle">${courseRunDetails.course || 'Training Course'}</div>
            </div>
            <div class="content">
              <div class="greeting">Hi ${name},</div>
              <div class="intro-text">
                Please refer to the attached documents and details below for the upcoming course <strong>${courseRunDetails.course || 'N/A'}</strong>:
              </div>
              
              <div class="section-title">Course details – The course details are as follows:</div>
              <table class="course-table">
                <tr>
                  <td>Day & Date</td>
                  <td>${formatDate(courseRunDetails.startDate)}${courseRunDetails.endDate && courseRunDetails.startDate !== courseRunDetails.endDate ? ' to ' + formatDate(courseRunDetails.endDate) : ''}</td>
                </tr>
                <tr>
                  <td>Time</td>
                  <td>${formatTime(courseRunDetails.startDate, courseRunDetails.endDate)}</td>
                </tr>
                <tr>
                  <td>Venue</td>
                  <td>
                    ${courseRunDetails.venue || 'TBD'}
                    ${courseRunDetails.venueAddress ? `<span class="venue-address">${courseRunDetails.venueAddress}</span>` : ''}
                  </td>
                </tr>
              </table>

              <div class="fee-box">
                <div class="fee-label">Professional Fees:</div>
                <div class="fee-value">${formatCurrency(professionalFees)}</div>
              </div>

              ${additionalBody ? `
              <div class="section-title">Additional Information</div>
              <div class="additional-section">
                <div class="additional-content">${additionalBody}</div>
              </div>
              ` : ''}

              <div class="closing-text">
                Thank you.
              </div>
              <div class="closing-text" style="margin-top: 12px;">
                Regards,
              </div>
              <div class="signature">
                <strong>Professional Development & Career Services Division</strong><br/>
                POLWEL Co-operative Society Limited<br/>
                Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                Stay connected with POLWEL on and view our professional development courses on HRP!
              </div>
            </div>
            <div class="footer">
              <div class="footer-text">© ${new Date().getFullYear()} POLWEL. All rights reserved.</div>
            </div>
          </div>
        </div>
      </body>
    </html>`;

    const mailOptions: any = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `Trainer Assignment: ${courseRunDetails.serialNumber || ''}`,
      text: textBody,
      html,
    };

    if (ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0) {
      mailOptions.cc = ccEmails.join(', ');
    }

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const fs = require('fs');
      const path = require('path');
      
      mailOptions.attachments = [];
      
      for (const attachment of attachments) {
        try {
          // Check if file exists
          if (fs.existsSync(attachment.path)) {
            mailOptions.attachments.push({
              filename: attachment.originalName || attachment.filename,
              path: attachment.path,
            });
          } else {
            console.warn(`Attachment file not found: ${attachment.path}`);
          }
        } catch (fileErr) {
          console.warn('Error adding attachment:', (fileErr as any)?.message);
        }
      }
    }

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — trainer assignment email would be:');
        console.log('To:', email);
        console.log('CC:', ccEmails);
        console.log('Subject:', mailOptions.subject);
        console.log('Body (text):', textBody);
        console.log('Body (html):', html ? '(html content)' : undefined);
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

  static async sendLearnerCourseConfirmationEmail(params: {
    email: string;
    learnerName: string;
    courseTitle: string;
    courseCode?: string;
    serialNumber?: string;
    startDate?: Date;
    endDate?: Date;
    venueName?: string;
    venueAddress?: string;
    additionalNotes?: string;
    cc?: string[] | string | null;
    attachments?: any[] | null;
  }): Promise<boolean> {
    const {
      email,
      learnerName,
      courseTitle,
      courseCode,
      serialNumber,
      startDate,
      endDate,
      venueName,
      venueAddress,
      additionalNotes,
      cc,
      attachments,
    } = params;

    const transporter = this.getTransporter();

    const formatDateWithDay = (date?: Date) => {
      if (!date) return 'To be confirmed';
      try {
        // Format as: Friday, 19 December 2025
        return new Intl.DateTimeFormat('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for learner confirmation email:', error);
        return date.toISOString();
      }
    };

    const formatDateForSubject = (date?: Date) => {
      if (!date) return '';
      try {
        // Format as: 25 December 2025
        return new Intl.DateTimeFormat('en-SG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      } catch (error) {
        return '';
      }
    };

    const formatTime = (start?: Date, end?: Date) => {
      if (!start || !end) return '0900 to 1700 hrs';
      try {
        const startTime = start.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
        const endTime = end.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
        return `${startTime} to ${endTime} hrs`;
      } catch (error) {
        return '0900 to 1700 hrs';
      }
    };

    const normalizeCc = () => {
      if (!cc) return undefined;
      if (Array.isArray(cc)) {
        const cleaned = cc.map((item) => item?.trim()).filter(Boolean);
        return cleaned.length > 0 ? cleaned : undefined;
      }
      if (typeof cc === 'string') {
        const cleaned = cc
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean);
        return cleaned.length > 0 ? cleaned : undefined;
      }
      return undefined;
    };

    const ccRecipients = normalizeCc();

    const subjectDate = formatDateForSubject(startDate);
    const mailOptions: any = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `Course Confirmation — ${courseTitle}${subjectDate ? ` (${subjectDate})` : ''}`,
      ...(ccRecipients ? { cc: ccRecipients } : {}),
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Course Confirmation</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .email-container { width: 100%; background-color: #f5f5f5; padding: 40px 20px; }
              .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #4b5563 0%, #374151 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
              .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
              .an1 {
                vertical-align: middle;
                place-self: center;
                position: relative;
                left: 10px;
              }
              .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
              .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
              .content { padding: 32px 24px; color: #333333; }
              .greeting { font-size: 14px; color: #4b5563; margin-bottom: 16px; }
              .intro-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
              .section-title { font-size: 15px; font-weight: 600; color: #1f2937; margin: 20px 0 12px 0; }
              .course-table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; margin-bottom: 20px; }
              .course-table td { padding: 12px 16px; border: 1px solid #d1d5db; font-size: 14px; vertical-align: top; }
              .course-table td:first-child { background-color: #f9fafb; font-weight: 500; color: #374151; width: 30%; }
              .course-table td:last-child { color: #1f2937; }
              .venue-address { display: block; margin-top: 4px; font-size: 13px; color: #6b7280; line-height: 1.5; }
              .info-box { background-color: #f3f4f6; border-left: 4px solid #d1d5db; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-title { font-weight: 600; color: #4b5563; margin-bottom: 8px; font-size: 14px; }
              .info-box-content { color: #6b7280; font-size: 13px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; }
              .info-box-content img { max-width: 100% !important; height: auto !important; display: block; margin: 12px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
              .info-box-content p { margin: 8px 0; line-height: 1.6; }
              .info-box-content strong { font-weight: 600; color: #374151; }
              .info-box-content em { font-style: italic; }
              .info-box-content u { text-decoration: underline; }
              .info-box-content ul, .info-box-content ol { margin: 8px 0; padding-left: 24px; }
              .info-box-content li { margin: 4px 0; line-height: 1.5; }
              .info-box-content a { color: #3b82f6; text-decoration: underline; }
              .info-box-content blockquote { border-left: 4px solid #d1d5db; padding-left: 16px; margin: 12px 0; color: #6b7280; font-style: italic; }
              .info-box-content pre { background-color: #f9fafb; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 12px; }
              .info-box-content code { background-color: #f9fafb; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
              .info-box-blue { background-color: #f8fafc; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-blue-title { font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px; }
              .info-box-blue-content { color: #1f2937; font-size: 13px; line-height: 1.6; }
              .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
              .signature { margin-top: 16px; font-size: 14px; color: #4b5563; line-height: 1.8; }
              .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
              .footer-text { margin: 4px 0; }
              @media only screen and (max-width: 600px) {
                .email-container { padding: 20px 10px; }
                .content { padding: 24px 16px; }
                .header { padding: 24px 16px; }
                .course-table td:first-child { width: 40%; }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-wrapper">
                  <div class="header">
                    <div class="header-icon an1">📋</div>
                  <div class="header-title">Course Confirmation</div>
                  <div class="header-subtitle">Registration Confirmed</div>
                </div>
                <div class="content">
                  <div class="greeting">Dear Participants,</div>
                  <div class="intro-text">
                    Please refer to the attached documents and details below for the upcoming course <strong>${courseTitle}</strong>:
                  </div>
                  
                  <div class="section-title">Course details – The course details are as follows:</div>
                  <table class="course-table">
                    <tr>
                      <td>Day & Date</td>
                      <td>${formatDateWithDay(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' to ' + formatDateWithDay(endDate) : ''}</td>
                    </tr>
                    <tr>
                      <td>Time</td>
                      <td>${formatTime(startDate, endDate)}</td>
                    </tr>
                    <tr>
                      <td>Venue</td>
                      <td>
                        ${venueName || 'To be confirmed'}
                        ${venueAddress ? `<span class="venue-address">${venueAddress}</span>` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td>Note</td>
                      <td>
                        For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #4b5563; text-decoration: none;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
                      </td>
                    </tr>
                  </table>

                  ${additionalNotes ? `
                  <div class="info-box">
                    <div class="info-box-content">${additionalNotes}</div>
                  </div>
                  ` : ''}

                  <div class="closing-text">
                    Thank you.
                  </div>
                  <div class="closing-text" style="margin-top: 12px;">
                    Regards,
                  </div>
                  <div class="signature">
                    <strong>Professional Development & Career Services Division</strong><br/>
                    POLWEL Co-operative Society Limited<br/>
                    Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                    Stay connected with POLWEL on and view our professional development courses on HRP!
                  </div>
                </div>
                <div class="footer">
                  <div class="footer-text">© ${new Date().getFullYear()} POLWEL. All rights reserved.</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const fs = require('fs');
      mailOptions.attachments = [];

      for (const attachment of attachments) {
        try {
          // Check if file exists
          if (fs.existsSync(attachment.path)) {
            mailOptions.attachments.push({
              filename: attachment.originalName || attachment.filename,
              path: attachment.path,
            });
          } else {
            console.warn(`Attachment file not found: ${attachment.path}`);
          }
        } catch (fileErr) {
          console.warn('Error adding attachment:', (fileErr as any)?.message);
        }
      }
    }

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — learner confirmation email would be:');
          console.log('To:', email);
        console.log('Course:', courseTitle);
        console.log('Serial:', serialNumber);
        console.log('Start:', formatDateWithDay(startDate));
        console.log('End:', formatDateWithDay(endDate));
        console.log('Venue:', venueName);
        if (ccRecipients) {
          console.log('CC:', ccRecipients);
          }
        return true;
      }

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send learner confirmation email:', error);
      return false;
    }
  }

  static async sendCourseCancellationEmail(params: {
    email: string;
    learnerName: string;
    courseTitle: string;
    courseCode?: string;
    serialNumber?: string;
    startDate?: Date;
    endDate?: Date;
    venueName?: string;
    cancellationReason?: string;
  }): Promise<boolean> {
    const {
      email,
      learnerName,
      courseTitle,
      courseCode,
      serialNumber,
      startDate,
      endDate,
      venueName,
      cancellationReason,
    } = params;

    const transporter = this.getTransporter();

    const formatDate = (date?: Date) => {
      if (!date) return 'To be confirmed';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for cancellation email:', error);
        return date.toISOString();
      }
    };

    const formatTime = () => {
      return '9:00 AM - 5:00 PM';
    };

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `Course Cancellation Notice - ${courseTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Course Cancellation Notice</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .email-container { width: 100%; background-color: #f5f5f5; padding: 40px 20px; }
              .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #374151 0%, #374151 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
              .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
              .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
              .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
              .content { padding: 32px 24px; color: #333333; }
              .greeting { font-size: 14px; color: #4b5563; margin-bottom: 16px; }
              .intro-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
              .section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 12px 0; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
              .details-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
              .details-table td:first-child { font-weight: 500; color: #6b7280; width: 30%; }
              .details-table td:last-child { color: #1f2937; }
              .details-table tr:last-child td { border-bottom: none; }
              .alert-box { background-color: #f3f4f6; border-left: 4px solid #d1d5db; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .alert-box-title { font-weight: 600; color: #4b5563; margin-bottom: 8px; font-size: 14px; }
              .alert-box-content { color: #6b7280; font-size: 13px; line-height: 1.6; }
              .alert-box-content ul { margin: 8px 0 0 0; padding-left: 20px; }
              .alert-box-content li { margin: 4px 0; }
              .alternative-section { background-color: #f8fafc; border: 1px solid #d1d5db; padding: 16px; margin: 20px 0; border-radius: 8px; }
              .alternative-title { font-weight: 600; color: #4b5563; margin-bottom: 8px; font-size: 14px; }
              .alternative-content { color: #4b5563; font-size: 13px; line-height: 1.6; }
              .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
              .signature { margin-top: 16px; font-size: 14px; color: #1f2937; font-weight: 500; }
              .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
              .footer-text { margin: 4px 0; }
              @media only screen and (max-width: 600px) {
                .email-container { padding: 20px 10px; }
                .content { padding: 24px 16px; }
                .header { padding: 24px 16px; }
                .details-table td:first-child { width: 40%; }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-wrapper">
                <div class="header">
                  <div class="header-icon an1">⚠️</div>
                  <div class="header-title">Course Cancellation Notice</div>
                  <div class="header-subtitle">Important Update Regarding Your Course</div>
                </div>
                <div class="content">
                  <div class="greeting">Dear Participants,</div>
                  <div class="intro-text">
                    We regret to inform you that the following course has been <strong>cancelled</strong> due to ${cancellationReason || 'unforeseen circumstances'}.
                  </div>
                  
                  <div class="section-title">Cancelled Course Details</div>
                  <table class="details-table">
                    <tr>
                      <td>Course Name:</td>
                      <td>${courseTitle}</td>
                    </tr>
                    <tr>
                      <td>Date:</td>
                      <td>${formatDate(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' - ' + formatDate(endDate) : ''}</td>
                    </tr>
                    <tr>
                      <td>Time:</td>
                      <td>${formatTime()}</td>
                    </tr>
                    <tr>
                      <td>Venue:</td>
                      <td>${venueName || 'TBD'}</td>
                    </tr>
                  </table>

                  <div class="alert-box">
                    <div class="alert-box-title">Important Information</div>
                    <div class="alert-box-content">
                      <ul>
                        <li>All registrations for this course have been cancelled</li>
                        <li>No further action is required from you at this time</li>
                        <li>If applicable, refunds will be processed within 14 working days</li>
                      </ul>
                    </div>
                  </div>

                  <div class="alternative-section">
                    <div class="alternative-title">Alternative Options</div>
                    <div class="alternative-content">
                      We will notify you once a new course run has been scheduled. In the meantime, you may wish to explore other available courses on our training calendar.<br/><br/>
                      For any queries or to discuss alternative training options, please contact PDCS at <a href="mailto:pdcs@polwel.org" style="color: #4b5563; text-decoration: none;">pdcs@polwel.org</a> or call us at <a href="tel:67184870" style="color: #4b5563; text-decoration: none;">6718 4870</a> or <a href="tel:64319973" style="color: #4b5563; text-decoration: none;">6431 9973</a>.
                    </div>
                  </div>

                  <div class="closing-text">
                    We sincerely apologize for any inconvenience this may cause. We understand the importance of this training to your professional development and appreciate your understanding.
                  </div>
                  <div class="closing-text">
                    Thank you for your understanding and continued support. We look forward to serving you in future training programmes.
                  </div>
                  <div class="closing-text" style="margin-top: 16px;">
                    Best regards,<br/>
                    <strong>POLWEL Training System Team</strong>
                  </div>
                </div>
                <div class="footer">
                  <div class="footer-text">© ${new Date().getFullYear()} POLWEL. All rights reserved.</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — cancellation email would be sent to:', email);
        return true;
      }

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send course cancellation email:', error);
      return false;
    }
  }

  static async sendCourseCompletionEmail(params: {
    email: string;
    learnerName: string;
    courseTitle: string;
    courseCode?: string;
    startDate?: Date;
    endDate?: Date;
    trainerName?: string;
    completionDate?: Date;
    certificateDownloadUrl: string;
  }): Promise<boolean> {
    const {
      email,
      learnerName,
      courseTitle,
      courseCode,
      startDate,
      endDate,
      trainerName,
      completionDate,
      certificateDownloadUrl,
    } = params;

    const transporter = this.getTransporter();

    const formatDate = (date?: Date) => {
      if (!date) return 'N/A';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for completion email:', error);
        return date.toISOString();
      }
    };

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `Congratulations! Certificate of Completion - ${courseTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Course Completion</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .email-container { width: 100%; background-color: #f5f5f5; padding: 40px 20px; }
              .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6b7280 0%, #525252 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
              .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
              .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
              .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
              .content { padding: 32px 24px; color: #333333; }
              .greeting { font-size: 14px; color: #4b5563; margin-bottom: 16px; }
              .intro-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
              .section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 12px 0; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
              .details-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
              .details-table td:first-child { font-weight: 500; color: #6b7280; width: 35%; }
              .details-table td:last-child { color: #1f2937; }
              .details-table tr:last-child td { border-bottom: none; }
              .certificate-box { background: linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%); border: 2px solid #6b7280; padding: 24px; margin: 24px 0; border-radius: 12px; text-align: center; }
              .certificate-icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .certificate-title { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px; }
              .certificate-subtitle { font-size: 13px; color: #525252; margin-bottom: 16px; }
              .download-button { display: inline-block; background-color: #6b7280; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 8px; transition: background-color 0.3s; }
              .download-button:hover { background-color: #525252; }
              .info-box { background-color: #f8fafc; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-title { font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px; }
              .info-box-content { color: #1f2937; font-size: 13px; line-height: 1.6; }
              .info-box-content ul { margin: 8px 0 0 0; padding-left: 20px; }
              .info-box-content li { margin: 4px 0; }
              .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
              .signature { margin-top: 16px; font-size: 14px; color: #1f2937; font-weight: 500; }
              .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
              .footer-text { margin: 4px 0; }
              @media only screen and (max-width: 600px) {
                .email-container { padding: 20px 10px; }
                .content { padding: 24px 16px; }
                .header { padding: 24px 16px; }
                .details-table td:first-child { width: 40%; }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-wrapper">
                <div class="header">
                  <div class="header-icon an1">🎓</div>
                  <div class="header-title">Congratulations!</div>
                  <div class="header-subtitle">You've Successfully Completed the Course</div>
                </div>
                <div class="content">
                  <div class="greeting">Dear ${learnerName},</div>
                  <div class="intro-text">
                    Congratulations on successfully completing the course! We are pleased to present you with your Certificate of Completion.
                  </div>
                  
                  <div class="section-title">Course Completed</div>
                  <table class="details-table">
                    <tr>
                      <td>Course Name:</td>
                      <td>${courseTitle}</td>
                    </tr>
                    <tr>
                      <td>Date:</td>
                      <td>${formatDate(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' - ' + formatDate(endDate) : ''}</td>
                    </tr>
                    ${trainerName ? `<tr>
                      <td>Trainer:</td>
                      <td>${trainerName}</td>
                    </tr>` : ''}
                    <tr>
                      <td>Completion Date:</td>
                      <td>${formatDate(completionDate || endDate)}</td>
                    </tr>
                  </table>

                  <div class="certificate-box">
                    <div class="certificate-icon">🏆</div>
                    <div class="certificate-title">Certificate of Completion</div>
                    <div class="certificate-subtitle">Awarded to: ${learnerName}</div>
                    <a href="${certificateDownloadUrl}" class="download-button">⬇ Download Certificate</a>
                  </div>

                  <div class="info-box">
                    <div class="info-box-title">Certificate Information</div>
                    <div class="info-box-content">
                      <ul>
                        <li>Your certificate is digitally signed and verified</li>
                        <li>Please keep a copy for your professional records</li>
                        <li>This certificate can be used for CPD (Continuing Professional Development) credits</li>
                      </ul>
                    </div>
                  </div>

                  <div class="closing-text">
                    We hope that you found this programme enriching and valuable for your personal and professional development!
                  </div>
                  <div class="closing-text">
                    We look forward to welcoming you to future training programmes!
                  </div>
                  
                  <div class="closing-text" style="margin-top: 20px;">
                    Thank you.
                  </div>
                  <div class="closing-text" style="margin-top: 16px;">
                    Regards,
                  </div>
                  
                  <div class="signature">
                    <strong>Professional Development & Career Services Division</strong><br/>
                    POLWEL Co-operative Society Limited<br/>
                    Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                    Stay connected with POLWEL on <a href="https://www.facebook.com/polwelsg" style="color: #4b5563; text-decoration: none;">Facebook</a> and view our professional development courses on <a href="https://hrp.gov.sg/" style="color: #4b5563; text-decoration: none;">HRP</a>!
                  </div>
                </div>
                <div class="footer">
                  <div class="footer-text">© ${new Date().getFullYear()} POLWEL. All rights reserved.</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — completion email would be sent to:', email);
        return true;
      }

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send course completion email:', error);
      return false;
    }
  }
}

export default EmailService;