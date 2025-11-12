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
        <title>POLWEL Trainer Assignment</title>
        <style>
          body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
          .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%); padding: 32px 16px; }
          .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
          .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
          .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
          .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
          .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
          .details-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bfdbfe; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #1e40af; font-size: 14px; }
          .detail-value { color: #1f2937; font-size: 14px; }
          .comp-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; margin: 24px 0; }
          .comp-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .comp-label { font-weight: 600; color: #1e40af; font-size: 14px; }
          .comp-value { color: #1f2937; font-size: 16px; font-weight: 700; }
          .total-row { border-top: 2px solid #1d4ed8; padding-top: 12px; margin-top: 12px; }
          .total-value { font-size: 20px; color: #1d4ed8; }
          .note-card { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; margin: 24px 0; }
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
                    <h1>📚 Trainer Assignment</h1>
                    <p>POLWEL Training Management System</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <p class="greeting">Hello ${name},</p>
                    <p class="meta">You have been assigned as a trainer for the following course run. Please review the details below and confirm your availability.</p>
                    
                    <div class="details-card">
                      <div style="font-weight: 700; color: #1e40af; margin-bottom: 12px; font-size: 15px;">📋 Course Run Details</div>
                      <div class="detail-row">
                        <span class="detail-label">Course:</span>
                        <span class="detail-value">${courseRunDetails.course || 'N/A'}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Course Serial Number:</span>
                        <span class="detail-value">${courseRunDetails.serialNumber || '—'}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Start Date:</span>
                        <span class="detail-value">${formatDate(courseRunDetails.startDate)}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">End Date:</span>
                        <span class="detail-value">${formatDate(courseRunDetails.endDate)}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Venue:</span>
                        <span class="detail-value">${courseRunDetails.venue || 'TBD'}</span>
                      </div>
                    </div>

                    <div class="comp-card">
                      <div style="font-weight: 700; color: #1e40af; margin-bottom: 12px; font-size: 15px;">💰 Your Compensation</div>
                      <div class="comp-row">
                        <span class="comp-label">Base Fee:</span>
                        <span class="comp-value">${formatCurrency(baseFee)}</span>
                      </div>
                      ${additionalCost > 0 ? `<div class="comp-row"><span class="comp-label">Additional Cost:</span><span class="comp-value">${formatCurrency(additionalCost)}</span></div>` : ''}
                      <div class="comp-row total-row">
                        <span class="comp-label">Total Amount:</span>
                        <span class="total-value">${formatCurrency(total)}</span>
                      </div>
                    </div>

                    ${additionalBody ? `<div class="note-card"><div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">📝 Additional Notes</div><div style="color: #475569; font-size: 14px; line-height: 1.6;">${additionalBody}</div></div>` : ''}

                    <p class="meta" style="margin-top: 24px;">Please confirm your availability by replying to this email or contacting your training coordinator. If you have any questions, feel free to reach out.</p>
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
            <title>POLWEL Course Confirmation</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
              .wrapper { width: 100%; table-layout: fixed; background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%); padding: 32px 16px; }
              .outer { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 55px rgba(15,23,42,0.22); }
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #ffffff; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; color: #ffffff; }
              .header p { margin: 4px 0 0; font-size: 14px; color: #dbeafe; }
              .content { padding: 32px 28px; }
              .greeting { font-size: 16px; margin: 0 0 16px; color: #1f2937; }
              .meta { margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.7; }
              .details-card { background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 14px; padding: 24px; margin: 24px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bfdbfe; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { font-weight: 600; color: #1e3a8a; font-size: 14px; }
              .detail-value { color: #1f2937; font-size: 14px; }
              .note-card { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
              .note-card .note-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
              .note-card .note-text { color: #475569; font-size: 14px; line-height: 1.6; }
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
                        <h1>✅ Course Confirmation</h1>
                        <p>${courseTitle}${courseCode ? ` (${courseCode})` : ''}</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <p class="greeting">Dear ${learnerName || 'Participant'},</p>
                        <p class="meta">This is to confirm your registration for <strong>${courseTitle}</strong>. We're excited to have you join this course run. Please find the details below and mark your calendar accordingly.</p>
                        
                        <div class="details-card">
                          <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 12px; font-size: 15px;">📋 Course Run Details</div>
                          <div class="detail-row">
                            <span class="detail-label">Course Serial Number:</span>
                            <span class="detail-value">${serialNumber || '—'}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Start Date:</span>
                            <span class="detail-value">${formatDate(startDate)}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">End Date:</span>
                            <span class="detail-value">${formatDate(endDate)}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Venue/Platform:</span>
                            <span class="detail-value">${venueName || 'Venue to be advised'}</span>
                          </div>
                        </div>

                        ${additionalNotes ? `<div class="note-card"><div class="note-title">📝 Additional Notes:</div><div class="note-text">${additionalNotes}</div></div>` : ''}

                        <p class="meta" style="margin-top: 24px;">If you have any questions or need to make changes to your registration, please contact your training coordinator or reply to this email.</p>
                        <p class="meta">We look forward to your participation!</p>
                        <p class="meta">Warm regards,<br /><strong>POLWEL Training Team</strong></p>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer">
                        This email was sent automatically by the POLWEL Training Management System.
                        <div style="margin-top: 12px;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</div>
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
}

export default EmailService;