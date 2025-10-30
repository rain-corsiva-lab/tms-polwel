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
              .button { display: inline-block; background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 12px 0; }
              .button:hover { background-color: #b91c1c; }
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
              .header { padding: 32px 28px 24px; background: radial-gradient(circle at top, #1e3a8a, #0f172a); color: #e0f2fe; text-align: left; }
              .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; }
              .header p { margin: 4px 0 0; font-size: 14px; color: rgba(240,253,250,0.85); }
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

    const textBody = `Dear ${name},\n\nYou have been assigned as a trainer for the following course run:\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Serial Number: ${courseRunDetails.serialNumber || ''}\n- Start Date: ${formatDate(courseRunDetails.startDate)}\n- End Date: ${formatDate(courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}\n\nYour Compensation:\n- Base Fee: ${formatCurrency(baseFee)}\n${additionalCost > 0 ? `- Additional Cost: ${formatCurrency(additionalCost)}\n` : ''}- Total: ${formatCurrency(total)}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Please confirm your availability for this course run.\n\nBest regards,\nPolwel Training Team`;

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background:#f3f4f6; margin:0; padding:24px; color:#111827 }
          .card { max-width:680px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 12px 40px rgba(2,6,23,0.08) }
          .header { background:linear-gradient(90deg,#2563eb,#3b82f6); color:#fff; padding:28px } 
          .header h1 { margin:0; font-size:20px }
          .inner { padding:28px }
          .section { margin-bottom:18px }
          .label { font-size:12px; text-transform:uppercase; color:#475569; letter-spacing:0.06em; margin-bottom:6px }
          .value { font-size:15px; color:#0f172a }
          .details { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-top:8px }
          .comp { background:#f8fafc; border:1px solid #e6eefb; padding:16px; border-radius:8px }
          .comp .amount { font-weight:700; color:#0f172a; font-size:18px }
          .cta { display:inline-block; background:#10b981; color:#fff; padding:12px 18px; border-radius:8px; text-decoration:none; font-weight:600 }
          .note { font-size:13px; color:#475569 }
          .footer { background:#f9fafb; padding:18px; text-align:center; font-size:12px; color:#94a3b8 }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Polwel Training - Trainer Assignment</h1>
          </div>
          <div class="inner">
            <div class="section">
              <p class="note">Hello <strong>${name}</strong>,</p>
              <p class="note">You have been assigned as a trainer for the following course run. Please review the details and confirm your availability by replying to this email or contacting the organiser.</p>
            </div>

            <div class="section">
              <div class="label">Course Run Details</div>
              <div class="details">
                <div>
                  <div class="value"><strong>Course</strong></div>
                  <div class="note">${courseRunDetails.course || 'N/A'}</div>
                </div>
                <div>
                  <div class="value"><strong>Serial</strong></div>
                  <div class="note">${courseRunDetails.serialNumber || '—'}</div>
                </div>
                <div>
                  <div class="value"><strong>Start</strong></div>
                  <div class="note">${formatDate(courseRunDetails.startDate)}</div>
                </div>
                <div>
                  <div class="value"><strong>End</strong></div>
                  <div class="note">${formatDate(courseRunDetails.endDate)}</div>
                </div>
                <div>
                  <div class="value"><strong>Venue</strong></div>
                  <div class="note">${courseRunDetails.venue || 'TBD'}</div>
                </div>
              </div>
            </div>

            <div class="section comp">
              <div class="label">Compensation</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div class="note">Base Fee</div>
                  <div class="value">${formatCurrency(baseFee)}</div>
                  ${additionalCost > 0 ? `<div class="note" style="margin-top:6px">Additional Cost</div><div class="value">${formatCurrency(additionalCost)}</div>` : ''}
                </div>
                <div style="text-align:right">
                  <div class="note">Total</div>
                  <div class="amount">${formatCurrency(total)}</div>
                </div>
              </div>
            </div>

            ${additionalBody ? `<div class="section"><div class="label">Additional Notes</div><div class="note">${additionalBody}</div></div>` : ''}

            <div class="section" style="margin-top:12px">
              <a href="mailto:${email}?subject=Confirm%20Availability%20for%20${encodeURIComponent(courseRunDetails.serialNumber || '')}" class="cta">Confirm Availability</a>
            </div>

            <div class="section">
              <p class="note">If you have any questions, reply to this email or contact your training coordinator.</p>
            </div>
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} POLWEL Training. All rights reserved.</div>
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
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #111827; }
              .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); overflow: hidden; }
              .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; padding: 32px 28px; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 28px; }
              .content p { margin: 0 0 16px; line-height: 1.6; }
              .details { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 24px 0; background-color: #f9fafb; }
              .details h2 { margin: 0 0 16px; font-size: 18px; color: #1f2937; }
              .details dl { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 24px; }
              .details dt { font-weight: 600; font-size: 13px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.08em; }
              .details dd { margin: 4px 0 0; font-size: 15px; color: #1f2937; }
              .footer { padding: 24px 28px; background: #f9fafb; font-size: 13px; color: #6b7280; }
              .cta { margin-top: 12px; display: inline-block; padding: 12px 18px; background: #2563eb; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>Course Confirmation</h1>
                <p style="margin: 6px 0 0; font-size: 16px; opacity: 0.9;">${courseTitle}</p>
              </div>
              <div class="content">
                <p>Dear ${learnerName || 'Participant'},</p>
                <p>
                  This is to confirm your registration for <strong>${courseTitle}</strong>${courseCode ? ` (${courseCode})` : ''}.
                  Please find the course run details below. We look forward to your participation.
                </p>

                <div class="details">
                  <h2>Course Run Details</h2>
                  <dl>
                    <div>
                      <dt>Serial Number</dt>
                      <dd>${serialNumber || '—'}</dd>
                    </div>
                    <div>
                      <dt>Start</dt>
                      <dd>${formatDate(startDate)}</dd>
                    </div>
                    <div>
                      <dt>End</dt>
                      <dd>${formatDate(endDate)}</dd>
                    </div>
                    <div>
                      <dt>Venue / Platform</dt>
                      <dd>${venueName || 'Venue to be advised'}</dd>
                    </div>
                  </dl>
                </div>

                ${additionalNotes ? `<p style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 10px; color: #92400e;">
                  <strong>Additional Notes:</strong><br />${additionalNotes}
                </p>` : ''}

                <p style="margin-top: 24px;">If you have any questions, kindly reach out to your training coordinator or reply to this email.</p>
                <p>Warm regards,<br /><strong>POLWEL Training Team</strong></p>
              </div>
              <div class="footer">
                <p>This email was sent automatically by the POLWEL Training Management System.</p>
                <p>&copy; ${new Date().getFullYear()} POLWEL. All rights reserved.</p>
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
}

export default EmailService;