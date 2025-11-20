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
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #bfdbfe; color: #1e3a8a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #93c5fd; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
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
                        <h1>🎯 Welcome to POLWEL!</h1>
                        <p>Complete Your Trainer Account Setup</p>
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
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@polwel.org'}" style="color:#60a5fa; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@polwel.org'}</a>.</div>
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
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #bfdbfe; color: #1e3a8a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #93c5fd; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .org-badge { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin: 12px 0; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .footer { padding: 24px 28px 30px; text-align: center; font-size: 12px; color: #94a3b8; background: #0f172a; }
              .support { margin-top: 18px; font-size: 12px; color: rgba(226,232,240,0.92); }
              @media (max-width: 600px) {
                .outer { margin: 0 12px; }
                .content { padding: 28px 22px; }
              }
            </meta>
          </head>
          <body>
            <table role="presentation" cellspacing="0" cellpadding="0" class="wrapper">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" class="outer">
                    <tr>
                      <td class="header">
                        <h1>📋 Welcome to POLWEL!</h1>
                        <p>Complete Your Training Coordinator Setup</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Hello ${name},</p>
                        <p class="meta">Welcome to the POLWEL Training Management System! You've been added as a Training Coordinator for:</p>
                        <div style="text-align: center;">
                          <span class="org-badge">🏢 ${organizationName}</span>
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
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@polwel.org'}" style="color:#60a5fa; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@polwel.org'}</a>.</div>
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
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#dc2626 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #991b1b, #7f1d1d); color: #fef2f2; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; }
              .header p { margin: 4px 0 0; font-size: 14px; color: rgba(254,242,242,0.85); }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #fee2e2; border: 1px solid #fecaca; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #bfdbfe; color: #dc2626; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #93c5fd; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; font-weight: 600; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #dc2626; color: #fef2f2; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .warning { margin: 24px 0 0; padding: 18px 22px; border-radius: 12px; background: #fef3c7; border: 1px solid #fbbf24; font-size: 13px; color: #92400e; line-height: 1.6; }
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
                        <h1>🔒 Password Reset Request</h1>
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
                        <div class="warning">⚠️ <strong>Didn&#39;t request this?</strong> If you didn&#39;t request a password reset, please ignore this email or contact our support team immediately to secure your account. Your current password remains unchanged.</div>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@polwel.org'}" style="color:#60a5fa; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@polwel.org'}</a>.</div>
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
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .code-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .code-label { text-transform: uppercase; font-size: 13px; letter-spacing: 2.2px; color: #2563eb; font-weight: 600; margin-bottom: 12px; }
              .code { font-size: 38px; letter-spacing: 12px; font-weight: 700; color: #1e40af; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
              .warning { margin: 24px 0 0; padding: 18px 22px; border-radius: 12px; background: #fef3c7; border: 1px solid #fbbf24; font-size: 13px; color: #9a3412; line-height: 1.6; }
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
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@polwel.org'}" style="color:#60a5fa; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@polwel.org'}</a>.</div>
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
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .button-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .button { display: inline-block; background-color: #bfdbfe; color: #1e3a8a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #93c5fd; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .checklist { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; }
              .checklist p { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
              .checklist ul { padding: 0; margin: 0; list-style: none; }
              .checklist li { display: flex; align-items: flex-start; font-size: 13px; color: #475569; margin-bottom: 10px; }
              .checklist span { display: inline-block; min-width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; color: #f8fafc; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; margin-right: 10px; }
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
                        <h1>👤 Welcome to POLWEL!</h1>
                        <p>Complete Your Account Setup</p>
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
                        &copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.
                        <div class="support">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@polwel.org'}" style="color:#60a5fa; text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@polwel.org'}</a>.</div>
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

    const textBody = `Dear ${name},\n\nYou have been assigned as a trainer for the following course run:\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Course Serial Number: ${courseRunDetails.serialNumber || ''}\n- Start Date: ${formatDate(courseRunDetails.startDate)}\n- End Date: ${formatDate(courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}\n\nYour Compensation:\n- Base Fee: ${formatCurrency(baseFee)}\n${additionalCost > 0 ? `- Additional Cost: ${formatCurrency(additionalCost)}\n` : ''}- Total: ${formatCurrency(total)}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Please confirm your availability for this course run.\n\nBest regards,\nPolwel Training Team`;

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trainer Assignment Notification</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { width: 100%; background-color: #f5f5f5; padding: 40px 20px; }
          .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
          .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
          .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
          .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
          .content { padding: 32px 24px; color: #333333; }
          .greeting { font-size: 16px; color: #1f2937; margin-bottom: 16px; font-weight: 500; }
          .intro-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
          .section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 16px 0; display: flex; align-items: center; }
          .info-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .info-row { display: table; width: 100%; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; padding-bottom: 0; }
          .info-row:first-child { padding-top: 0; }
          .info-label { display: table-cell; font-size: 13px; color: #6b7280; font-weight: 500; width: 35%; vertical-align: top; padding-right: 12px; }
          .info-value { display: table-cell; font-size: 14px; color: #1f2937; font-weight: 400; vertical-align: top; }
          .fee-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .fee-row { display: table; width: 100%; padding: 8px 0; }
          .fee-row.total { border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 8px; }
          .fee-label { display: table-cell; font-size: 14px; color: #1e40af; font-weight: 500; }
          .fee-value { display: table-cell; font-size: 16px; color: #1e40af; font-weight: 600; text-align: right; }
          .fee-row.total .fee-value { font-size: 20px; color: #2563eb; }
          .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
          .signature { margin-top: 24px; font-size: 14px; color: #1f2937; }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .footer-text { margin: 4px 0; }
          @media only screen and (max-width: 600px) {
            .email-container { padding: 20px 10px; }
            .content { padding: 24px 16px; }
            .header { padding: 24px 16px; }
            .info-row { display: block; padding: 8px 0; }
            .info-label { display: block; width: 100%; margin-bottom: 4px; }
            .info-value { display: block; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-wrapper">
            <div class="header">
              <div class="header-icon">✉️</div>
              <div class="header-title">Trainer Assignment Notification</div>
              <div class="header-subtitle">Your Course Assignment Details</div>
            </div>
            <div class="content">
              <div class="greeting">Hello ${name},</div>
              <div class="intro-text">
                You have been assigned as a trainer for an upcoming course run. Please find the details below:
              </div>
              
              <div class="section-title">Trainer Information</div>
              <div class="info-box">
                <div class="info-row">
                  <div class="info-label">Trainer Name:</div>
                  <div class="info-value">${name}</div>
                </div>
              </div>

              <div class="section-title">Course Run Details</div>
              <div class="info-box">
                <div class="info-row">
                  <div class="info-label">Course Name:</div>
                  <div class="info-value">${courseRunDetails.course || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Date:</div>
                  <div class="info-value">${formatDate(courseRunDetails.startDate)} - ${formatDate(courseRunDetails.endDate)}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Time:</div>
                  <div class="info-value">9:00 AM - 5:00 PM</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Venue:</div>
                  <div class="info-value">${courseRunDetails.venue || 'TBD'}</div>
                </div>
              </div>

              <div class="section-title">Trainer Fees</div>
              <div class="fee-box">
                <div class="fee-row">
                  <div class="fee-label">Quoted Fee:</div>
                  <div class="fee-value">${formatCurrency(total)}</div>
                </div>
                <div class="fee-row">
                  <div class="fee-label">Payment Terms:</div>
                  <div class="fee-value" style="font-size: 13px; font-weight: 400;">Payment within 30 days upon course completion</div>
                </div>
              </div>

              <div class="closing-text">
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
    additionalNotes?: string;
    cc?: string[] | string | null;
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
      additionalNotes,
      cc,
    } = params;

    const transporter = this.getTransporter();

    const formatDate = (date?: Date) => {
      if (!date) return 'To be confirmed';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for learner confirmation email:', error);
        return date.toISOString();
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

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org',
      to: email,
      subject: `POLWEL Course Confirmation – ${courseTitle}`,
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
              .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
              .header-icon { width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 24px; }
              .header-title { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; color: #ffffff; }
              .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400; }
              .content { padding: 32px 24px; color: #333333; }
              .greeting { font-size: 14px; color: #4b5563; margin-bottom: 16px; }
              .intro-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
              .course-title { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 16px; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .details-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
              .details-table td:first-child { background-color: #f9fafb; font-weight: 500; color: #6b7280; width: 30%; }
              .details-table td:last-child { color: #1f2937; }
              .details-table tr:last-child td { border-bottom: none; }
              .info-box { background-color: #fef9c3; border-left: 4px solid #facc15; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-title { font-weight: 600; color: #854d0e; margin-bottom: 8px; font-size: 14px; }
              .info-box-content { color: #713f12; font-size: 13px; line-height: 1.6; }
              .info-box-blue { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-blue-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 14px; }
              .info-box-blue-content { color: #1e3a8a; font-size: 13px; line-height: 1.6; }
              .closing-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 24px; }
              .signature { margin-top: 16px; font-size: 14px; color: #2563eb; font-weight: 500; }
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
                  <div class="header-icon">📋</div>
                  <div class="header-title">Course Confirmation</div>
                  <div class="header-subtitle">Registration Confirmed</div>
                </div>
                <div class="content">
                  <div class="greeting">Dear Participants,</div>
                  <div class="intro-text">
                    Thank you for registering for <strong>${courseTitle}</strong>.
                  </div>
                  <div class="intro-text">The course details are as follows:</div>
                  
                  <table class="details-table">
                    <tr>
                      <td>Day & Date</td>
                      <td>${formatDate(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' - ' + formatDate(endDate) : ''}</td>
                    </tr>
                    <tr>
                      <td>Time</td>
                      <td>0900 to 1700 (Registration starts at 0845)<br/><span style="font-size: 12px; color: #6b7280;">15 minutes before start time</span></td>
                    </tr>
                    <tr>
                      <td>Venue</td>
                      <td>${venueName || 'To be confirmed'}</td>
                    </tr>
                  </table>

                  ${additionalNotes ? `
                  <div class="info-box">
                    <div class="info-box-content">${additionalNotes}</div>
                  </div>
                  ` : ''}

                  <div class="info-box-blue">
                    <div class="info-box-blue-title">Note</div>
                    <div class="info-box-blue-content">
                      For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org" style="color: #2563eb; text-decoration: none;">pdcs@polwel.org</a> or call us at <a href="tel:67184870" style="color: #2563eb; text-decoration: none;">6718 4870</a> or <a href="tel:64319973" style="color: #2563eb; text-decoration: none;">6431 9973</a>.<br/><br/>
                      In the event that you are unable to attend, we kindly ask that you inform the PDCS team at your earliest opportunity.
                    </div>
                  </div>

                  <div class="closing-text">
                    We hope that you will find this programme an enriching experience for your personal and professional development!
                  </div>
                  <div class="closing-text">Thank you.</div>
                  <div class="signature">Sylrain Binte Saifi</div>
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
        console.log('(EmailService) SMTP not configured — learner confirmation email would be:');
          console.log('To:', email);
        console.log('Course:', courseTitle);
        console.log('Serial:', serialNumber);
        console.log('Start:', formatDate(startDate));
        console.log('End:', formatDate(endDate));
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
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
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
              .alert-box { background-color: #fef3c3; border-left: 4px solid #facc15; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .alert-box-title { font-weight: 600; color: #854d0e; margin-bottom: 8px; font-size: 14px; }
              .alert-box-content { color: #713f12; font-size: 13px; line-height: 1.6; }
              .alert-box-content ul { margin: 8px 0 0 0; padding-left: 20px; }
              .alert-box-content li { margin: 4px 0; }
              .alternative-section { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 20px 0; border-radius: 8px; }
              .alternative-title { font-weight: 600; color: #166534; margin-bottom: 8px; font-size: 14px; }
              .alternative-content { color: #15803d; font-size: 13px; line-height: 1.6; }
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
                  <div class="header-icon">⚠️</div>
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
                      For any queries or to discuss alternative training options, please contact PDCS at <a href="mailto:pdcs@polwel.org" style="color: #15803d; text-decoration: none;">pdcs@polwel.org</a> or call us at <a href="tel:67184870" style="color: #15803d; text-decoration: none;">6718 4870</a> or <a href="tel:64319973" style="color: #15803d; text-decoration: none;">6431 9973</a>.
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
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
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
              .certificate-box { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #10b981; padding: 24px; margin: 24px 0; border-radius: 12px; text-align: center; }
              .certificate-icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .certificate-title { font-size: 16px; font-weight: 600; color: #065f46; margin-bottom: 8px; }
              .certificate-subtitle { font-size: 13px; color: #047857; margin-bottom: 16px; }
              .download-button { display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 8px; transition: background-color 0.3s; }
              .download-button:hover { background-color: #059669; }
              .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .info-box-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 14px; }
              .info-box-content { color: #1e3a8a; font-size: 13px; line-height: 1.6; }
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
                  <div class="header-icon">🎓</div>
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
                  <div class="closing-text" style="margin-top: 16px;">
                    For any queries regarding your certificate, please contact PDCS at <a href="mailto:pdcs@polwel.org" style="color: #2563eb; text-decoration: none;">pdcs@polwel.org</a> or call us at <a href="tel:67184870" style="color: #2563eb; text-decoration: none;">6718 4870</a> or <a href="tel:64319973" style="color: #2563eb; text-decoration: none;">6431 9973</a>.
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