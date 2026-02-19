import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import type { SentMessageInfo, Transport, TransportOptions } from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';

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

interface AzureTransportOptions extends TransportOptions {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  fromEmail: string;
  saveToSentItems?: boolean;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Custom Nodemailer Transport for Microsoft Graph API
 * Based on: https://dev.to/gevik/sending-emails-via-outlook-with-nodemailer-and-microsoft-graph-b74
 */
class AzureTransport implements Transport<SentMessageInfo> {
  name: string;
  version: string;

  private config: AzureTransportOptions;
  private graphEndpoint: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  public constructor(config: AzureTransportOptions) {
    this.name = 'Azure';
    this.version = '0.1';
    this.config = config;
    this.graphEndpoint = 'https://graph.microsoft.com';
  }

  /**
   * Check if the access token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return true;
    // Refresh 5 minutes before expiry
    return Date.now() > this.tokenExpiresAt - 300000;
  }

  /**
   * Get an access token from Azure AD using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && !this.isTokenExpired()) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: `${this.graphEndpoint}/.default`,
      grant_type: 'client_credentials',
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as AccessTokenResponse;
      this.accessToken = data.access_token;
      // Set expiry time (subtract 5 minutes for safety)
      this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('❌ Error acquiring Azure AD token:', error);
      throw new Error('Could not retrieve an access token.');
    }
  }

  /**
   * Send an email using Microsoft Graph API
   */
  public async send(
    mail: MailMessage<SentMessageInfo>,
    callback: (err: Error | null, info: SentMessageInfo | null) => void
  ): Promise<void> {
    try {
      const mailData = mail.data || {};
      const { subject, from, to, text, html, cc, bcc, attachments = [] } = mailData;      

      if (!from || !to) {
        throw new Error("Missing 'from' or 'to' email address.");
      }

      const accessToken = await this.getAccessToken();

      // Prepare recipients
      const toRecipients = Array.isArray(to)
        ? to.map((recipient) => ({ emailAddress: { address: recipient } }))
        : [{ emailAddress: { address: to } }];

      const message: any = {
        message: {
          subject: subject || '',
          // Note: Do NOT include 'from' field when using Client Credentials flow
          // Graph API will automatically use the email from the URL endpoint
          toRecipients: toRecipients,
          body: {
            content: html || text || '',
            contentType: html ? 'HTML' : 'Text',
          },
        },
        saveToSentItems: this.config.saveToSentItems ?? true,
      };

      // Add CC if provided
      if (cc) {
        const ccRecipients = Array.isArray(cc)
          ? cc.map((recipient) => ({ emailAddress: { address: recipient } }))
          : [{ emailAddress: { address: cc } }];
        message.message.ccRecipients = ccRecipients;
      }

      // Add BCC if provided
      if (bcc) {
        const bccRecipients = Array.isArray(bcc)
          ? bcc.map((recipient) => ({ emailAddress: { address: recipient } }))
          : [{ emailAddress: { address: bcc } }];
        message.message.bccRecipients = bccRecipients;
      }

      // Add attachments if provided
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        message.message.attachments = [];

        for (const attachment of attachments) {
          try {
            let contentBytes: string;
            let contentType: string = attachment.contentType || 'application/octet-stream';
            let name: string = attachment.filename || 'attachment';

            // Handle different attachment formats
            if (attachment.path) {
              // File path - read file and convert to base64
              const fs = require('fs');
              const fileContent = fs.readFileSync(attachment.path);
              contentBytes = fileContent.toString('base64');
              if (!attachment.contentType) {
                const path = require('path');
                const ext = path.extname(attachment.path).toLowerCase();
                // Basic content type detection
                if (ext === '.pdf') contentType = 'application/pdf';
                else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';
                else if (ext === '.xls' || ext === '.xlsx') contentType = 'application/vnd.ms-excel';
                else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                else if (ext === '.png') contentType = 'image/png';
              }
            } else if (attachment.content) {
              // Direct content
              if (typeof attachment.content === 'string') {
                // Assume base64 if it's a string
                contentBytes = attachment.content;
              } else if (Buffer.isBuffer(attachment.content)) {
                // Buffer - convert to base64
                contentBytes = attachment.content.toString('base64');
              } else {
                // Try to convert to Buffer
                try {
                  const buffer = Buffer.from(attachment.content as any);
                  contentBytes = buffer.toString('base64');
                } catch (buffErr) {
                  console.warn('Cannot convert attachment content to buffer:', (buffErr as any)?.message);
                  continue;
                }
              }
            } else {
              console.warn('Skipping attachment: no path or content provided');
              continue;
            }

            message.message.attachments.push({
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: name,
              contentBytes: contentBytes,
              contentType: contentType,
            });
          } catch (attErr) {
            console.warn('Error processing attachment:', (attErr as any)?.message || attErr);
          }
        }
      }

      // Send email via Graph API
      // Use fromEmail from config, or fallback to mail.from
      // Extract email string from Address object if needed
      let senderEmail: string;
      if (this.config.fromEmail) {
        senderEmail = this.config.fromEmail;
      } else if (typeof from === 'string') {
        senderEmail = from;
      } else if (from && typeof from === 'object' && 'address' in from) {
        senderEmail = (from as any).address;
      } else {
        throw new Error('Cannot determine sender email address');
      }
      const graphUrl = `${this.graphEndpoint}/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

      const response = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email. Status: ${response.status} - ${errorText}`);
      }

      // Graph API returns 202 Accepted on success (no body)
      const responseData = await response.text().catch(() => '');
      callback(null, {
        messageId: `graph-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        response: responseData || '202 Accepted',
      } as SentMessageInfo);
    } catch (error: any) {
      console.error('❌ Error sending email via Graph API:', error);
      callback(error, null);
    }
  }

  /**
   * Verify connection (required by Nodemailer Transport interface)
   */
  public verify(): Promise<true>;
  public verify(callback: (err: Error | null, success: true) => void): void;
  public verify(callback?: (err: Error | null, success: true) => void): void | Promise<true> {
    const verifyPromise = this.getAccessToken()
      .then(() => {
        return true as const;
      })
      .catch((error) => {
        throw error;
      });

    if (callback) {
      verifyPromise
        .then(() => {
          callback(null, true);
        })
        .catch((error) => {
          callback(error as Error, true);
        });
      return;
    }

    return verifyPromise;
  }

  /**
   * Close connection (required by Nodemailer Transport interface)
   */
  public close(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }
}

class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static isInitialized: boolean = false;
  private static mailFromAddress: string = process.env.NODE_ENV === "Production" ? process.env.GRAPH_MAIL_FROM_ADDRESS || 'noreply@polwel.org' : process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org';
  private static logoPath: string = '';
  private static logoUrl: string = '';

  // Get logo path for CID attachment (for SMTP)
  private static getLogoPath(): string | null {
    if (this.logoPath) return this.logoPath;
    
    try {
      const possiblePaths = [
        '/home/kukuh/webprojects/polwel/public/images/POLWEL Logo_Horizontal.png',
        path.join(__dirname, '../../../public/images/POLWEL Logo_Horizontal.png'),
        path.join(__dirname, '../../public/images/POLWEL Logo_Horizontal.png'),
        path.join(process.cwd(), '../public/images/POLWEL Logo_Horizontal.png'),
        path.join(process.cwd(), 'public/images/POLWEL Logo_Horizontal.png'),
      ];
      
      console.log('🔍 Searching for POLWEL logo file:');
      console.log('   Current directory:', process.cwd());
      console.log('   __dirname:', __dirname);
      
      for (const p of possiblePaths) {
        const exists = fs.existsSync(p);
        console.log(`   ${exists ? '✅' : '❌'} ${p}`);
        if (exists) {
          this.logoPath = p;
          console.log('✅ POLWEL logo file found at:', p);
          return this.logoPath;
        }
      }
      
      console.error('❌ POLWEL logo file not found in any location');
      return null;
    } catch (error) {
      console.error('❌ Error locating POLWEL logo:', error);
      return null;
    }
  }

  // Get logo URL for use in emails (fallback when CID attachment can't be used)
  private static getLogoUrl(): string {
    if (this.logoUrl) return this.logoUrl;
    
    // Try to get from environment variable first
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    this.logoUrl = `${frontendUrl}/images/POLWEL Logo_Horizontal.png`;
    console.log('📷 Using logo URL:', this.logoUrl);
    return this.logoUrl;
  }

  // Get logo attachment for email (CID approach - works in all email clients)
  private static getLogoAttachment(): any | null {
    const logoPath = this.getLogoPath();
    if (!logoPath) {
      console.warn('⚠️  Logo file not found, will use URL fallback in email');
      return null;
    }
    
    return {
      filename: 'polwel-logo.png',
      path: logoPath,
      cid: 'polwellogo' // Content-ID for referencing in email HTML
    };
  }

  // Get logo source for use in HTML img tag
  private static getLogoSrc(): string {
    // First try CID approach (if we have the file)
    const logoPath = this.getLogoPath();
    if (logoPath) {
      // For SMTP emails, we'll use CID and attach the file
      return 'cid:polwellogo';
    }
    
    // Fallback to external URL
    return this.getLogoUrl();
  }

  // Get standardized email footer HTML
  private static getEmailFooter(): string {
    return `
      <tr>
        <td style="padding: 32px 28px; background-color: #ffffff; border-top: 2px solid #e5e7eb;" bgcolor="#ffffff">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <!-- Regards -->
            <tr>
              <td style="padding-bottom: 8px;">
                <p style="margin: 0; font-size: 14px; color: #1f2937 !important; font-family: Arial, sans-serif;">Regards,</p>
              </td>
            </tr>
            <!-- Organization Name -->
            <tr>
              <td style="padding-bottom: 2px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1f2937 !important; font-family: Arial, sans-serif;">Professional Development & Career Services Division</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px;">
                <p style="margin: 0; font-size: 13px; color: #1f2937 !important; font-family: Arial, sans-serif;">POLWEL Co-operative Society Limited</p>
              </td>
            </tr>
            <!-- Contact Info -->
            <tr>
              <td style="padding-bottom: 8px;">
                <p style="margin: 0; font-size: 12px; color: #374151 !important; line-height: 1.6; font-family: Arial, sans-serif;">
                  Main: (65) 6235 6428 (Option 4) | 
                  <a href="https://www.polwel.org.sg" style="color: #3b82f6 !important; text-decoration: none;">www.polwel.org.sg</a> | 
                  <span style="color: #22c55e !important; font-weight: 600;">#POLWELCares</span>
                </p>
              </td>
            </tr>
            <!-- Social Media & HRPI -->
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #f97316 !important; font-family: Arial, sans-serif;">
                  <span style="font-style: italic;">Stay connected with POLWEL on 
                  <a href="https://www.linkedin.com/company/polwel" style="color: #0077b5 !important; text-decoration: none; font-weight: 600;">LinkedIn</a> and 
                  <a href="https://www.youtube.com/@polwelsg" style="color: #ff0000 !important; text-decoration: none; font-weight: 600;">YouTube</a> 
                  and view our professional development courses on HRPI</span>
                </p>
              </td>
            </tr>
            <!-- Warning -->
            <tr>
              <td style="padding: 16px 0 0 0; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 10px; color: #dc2626 !important; font-family: Arial, sans-serif; line-height: 1.5;">
                  <strong style="font-weight: 700;">WARNING:</strong> Privileged and/or confidential information may be contained in this email. If you are not the intended addressee, you are hereby notified that you have received this transmittal in error and you must not review, copy, distribute or take any action in reliance on the information contained herein. Please notify the sender immediately if you receive this in error and immediately delete this message and all its attachments.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  private static getTransporter() {
    if (!this.isInitialized) {
      // Check if Microsoft Graph API is configured      
      if (process.env.NODE_ENV === "Production") {
        const graphClientId = process.env.GRAPH_CLIENT_ID;
        const graphClientSecret = process.env.GRAPH_CLIENT_SECRET;
        const graphTenantId = process.env.GRAPH_TENANT_ID;
        const graphFromEmail = process.env.GRAPH_MAIL_FROM_ADDRESS;
  
        if (graphClientId && graphClientSecret && graphTenantId && graphFromEmail) {
          // Use Microsoft Graph API
          console.log('📧 Initializing email service with Microsoft Graph API');
          console.log('   Tenant ID:', graphTenantId.substring(0, 8) + '***');
          console.log('   Client ID:', graphClientId.substring(0, 8) + '***');
          console.log('   From Email:', graphFromEmail);
  
          const azureTransport = new AzureTransport({
            clientId: graphClientId,
            clientSecret: graphClientSecret,
            tenantId: graphTenantId,
            fromEmail: graphFromEmail,
            saveToSentItems: true,
          });
  
          this.transporter = nodemailer.createTransport(azureTransport);
          this.isInitialized = true;
  
          // Verify connection
          this.transporter.verify((error, success) => {
            if (error) {
              console.error('❌ Graph API connection verification failed:', error.message);
            } else {
              console.log('✅ Graph API connection verified successfully');
            }
          });
  
          return this.transporter;
        }
      }

      // Fallback to SMTP configuration
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
        console.log('⚠️  Email service not configured (neither Graph API nor SMTP)');
        console.log('📧 To enable emails, configure either:');
        console.log('   - Microsoft Graph API: GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID, GRAPH_MAIL_FROM_ADDRESS');
        console.log('   - SMTP: MAIL_USERNAME and MAIL_PASSWORD');
        this.isInitialized = true;
        return null;
      }

      console.log('📧 Initializing email service with SMTP:', {
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
  const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

  const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Trainer Account Setup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
            <title>POLWEL Trainer Setup</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #0f172a;" bgcolor="#0f172a">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937;" bgcolor="#1f2937">
                        <div style="text-align: center; margin-bottom: 16px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff !important; font-family: Arial, sans-serif;">Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #f3f4f6 !important; font-family: Arial, sans-serif;">Complete Your Trainer Account Setup</p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff;" bgcolor="#ffffff">
                        <p style="font-size: 16px; margin: 0 0 16px 0; color: #1f2937 !important; font-family: Arial, sans-serif;">Hello ${name},</p>
                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151 !important; line-height: 1.7; font-family: Arial, sans-serif;">Welcome to the POLWEL Training Management System! We're excited to have you join our team of trainers. Click the button below to complete your account setup and get started.</p>
                        <!-- Button Card -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px; background-color: #f8fafc; border: 1px solid #e5e7eb;" bgcolor="#f8fafc" align="center">
                              <a href="${setupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;" bgcolor="#3b82f6">Complete Trainer Setup</a>
                            </td>
                          </tr>
                        </table>
                        <!-- Checklist -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;" bgcolor="#f8fafc">
                          <tr>
                            <td style="padding: 20px 24px;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937 !important; font-weight: 600; font-family: Arial, sans-serif;">What's next:</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">1</span>
                                    Create a secure password for your account.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">2</span>
                                    Set up your profile and verify your details.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">3</span>
                                    Start managing your training sessions.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Training Coordinator Setup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
            <title>POLWEL Coordinator Setup</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #0f172a;" bgcolor="#0f172a">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937;" bgcolor="#1f2937">
                        <div style="text-align: center; margin-bottom: 16px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff !important; font-family: Arial, sans-serif;">Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #f3f4f6 !important; font-family: Arial, sans-serif;">Complete Your Training Coordinator Setup</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff;" bgcolor="#ffffff">
                        <p style="font-size: 16px; margin: 0 0 16px 0; color: #1f2937 !important; font-family: Arial, sans-serif;">Hello ${name},</p>
                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151 !important; line-height: 1.7; font-family: Arial, sans-serif;">Welcome to the POLWEL Training Management System! You've been added as a Training Coordinator for:</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 12px 0;">
                              <span style="display: inline-block; background-color: #f8fafc; border: 1px solid #e5e7eb; color: #374151 !important; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-family: Arial, sans-serif;" bgcolor="#f8fafc">🏢 ${organizationName}</span>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px; background-color: #f8fafc; border: 1px solid #e5e7eb;" bgcolor="#f8fafc" align="center">
                              <a href="${setupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;" bgcolor="#3b82f6">Complete Coordinator Setup</a>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;" bgcolor="#f8fafc">
                          <tr>
                            <td style="padding: 20px 24px;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937 !important; font-weight: 600; font-family: Arial, sans-serif;">Your coordinator access includes:</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">1</span>
                                    Manage training bookings and course runs.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">2</span>
                                    Coordinate learner enrollments and attendance.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #525252; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#525252">3</span>
                                    Access organization-specific reports and data.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 28px 30px; text-align: center; background-color: #0f172a;" bgcolor="#0f172a">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</p>
                        <p style="margin: 18px 0 0 0; font-size: 12px; color: #cbd5e1 !important; font-family: Arial, sans-serif;">Need help? Email <a href="mailto:pdcs@polwel.org.sg" style="color: #9ca3af !important; text-decoration: none;">pdcs@polwel.org.sg</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: 'POLWEL - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
            <title>POLWEL Password Reset</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #0f172a;" bgcolor="#0f172a">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937;" bgcolor="#1f2937">
                        <div style="text-align: center; margin-bottom: 16px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff !important; font-family: Arial, sans-serif;">Password Reset Request</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #f3f4f6 !important; font-family: Arial, sans-serif;">POLWEL Training Management System</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff;" bgcolor="#ffffff">
                        <p style="font-size: 16px; margin: 0 0 16px 0; color: #1f2937 !important; font-family: Arial, sans-serif;">Hello ${name},</p>
                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151 !important; line-height: 1.7; font-family: Arial, sans-serif;">We received a request to reset your password for your POLWEL account. Click the button below to create a new password. This link will expire in <strong style="color: #1f2937 !important;">1 hour</strong> for security purposes.</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px; background-color: #f8fafc; border: 1px solid #e5e7eb;" bgcolor="#f8fafc" align="center">
                              <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;" bgcolor="#3b82f6">Reset Your Password</a>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;" bgcolor="#f8fafc">
                          <tr>
                            <td style="padding: 20px 24px;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937 !important; font-weight: 600; font-family: Arial, sans-serif;">Security guidelines:</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #374151; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#374151">1</span>
                                    Only click this button if you requested a password reset.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #374151; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#374151">2</span>
                                    Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 5px 0; font-size: 13px; color: #475569 !important; font-family: Arial, sans-serif;">
                                    <span style="display: inline-block; min-width: 18px; height: 18px; background-color: #374151; color: #ffffff !important; font-weight: 700; font-size: 11px; line-height: 18px; text-align: center; border-radius: 50%; margin-right: 10px;" bgcolor="#374151">3</span>
                                    Never share your password with anyone. POLWEL will never ask for it.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: #fef3c7; border: 1px solid #fbbf24;" bgcolor="#fef3c7">
                          <tr>
                            <td style="padding: 18px 22px;">
                              <p style="margin: 0; font-size: 13px; color: #92400e !important; line-height: 1.6; font-family: Arial, sans-serif;">⚠️ <strong style="color: #78350f !important;">Didn't request this?</strong> If you didn't request a password reset, please ignore this email or contact our support team immediately to secure your account. Your current password remains unchanged.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 28px 30px; text-align: center; background-color: #0f172a;" bgcolor="#0f172a">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management. All rights reserved.</p>
                        <p style="margin: 18px 0 0 0; font-size: 12px; color: #cbd5e1 !important; font-family: Arial, sans-serif;">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color: #9ca3af !important; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

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

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: 'Your POLWEL security code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
            <title>POLWEL Security Code</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f5f5f5 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5 !important;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                      <td bgcolor="#1f2937" style="padding: 32px 24px; background-color: #1f2937 !important; text-align: center;">
                        <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1f2937" stroke="false" style="width:552px;height:auto;">
                        <v:textbox inset="0,0,0,0">
                        <![endif]-->
                        <div style="margin-bottom: 16px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                        <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #ffffff !important; font-family: Arial, sans-serif !important;">Secure your login</h1>
                        <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #e5e7eb !important; font-family: Arial, sans-serif !important;">POLWEL Training Management System</p>
                        <!--[if mso]>
                        </v:textbox>
                        </v:rect>
                        <![endif]-->
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td bgcolor="#ffffff" style="padding: 32px 24px; background-color: #ffffff !important;">
                        <p style="font-size: 16px !important; margin: 0 0 16px 0 !important; padding: 0 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Hi ${friendlyName},</p>
                        <p style="margin: 0 0 20px 0 !important; padding: 0 !important; font-size: 15px !important; color: #374151 !important; line-height: 1.7 !important; font-family: Arial, sans-serif !important;">Use the one-time security code below to complete your sign in. The code expires at <strong style="color: #1f2937 !important;">${formattedExpiry}</strong> (${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'} remaining).</p>
                        
                        <!-- Code Card -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td bgcolor="#f8fafc" style="background-color: #f8fafc !important; border: 2px solid #d1d5db; padding: 24px; text-align: center;">
                              <div style="text-transform: uppercase; font-size: 13px !important; letter-spacing: 2px; color: #4b5563 !important; font-weight: 600 !important; margin-bottom: 12px; font-family: Arial, sans-serif !important;">ONE-TIME SECURITY CODE</div>
                              <div style="font-size: 38px !important; letter-spacing: 12px; font-weight: 700 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">${code}</div>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Checklist -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                          <tr>
                            <td bgcolor="#f8fafc" style="padding: 20px 24px; background-color: #f8fafc !important; border: 1px solid #e5e7eb;">
                              <p style="margin: 0 0 12px 0 !important; padding: 0 !important; font-size: 15px !important; font-weight: 600 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Next steps:</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">1</span>
                                    Enter the code on the verification screen as soon as possible.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">2</span>
                                    Make sure you are signing in from a trusted device and network.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 0; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">3</span>
                                    Do not share this code with anyone. POLWEL will never ask you for it.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Warning -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0 0;">
                          <tr>
                            <td bgcolor="#f3f4f6" style="padding: 18px 22px; background-color: #f3f4f6 !important; border: 1px solid #d1d5db; font-size: 13px !important; color: #6b7280 !important; line-height: 1.6 !important; font-family: Arial, sans-serif !important;">
                              <strong style="color: #1f2937 !important;">Didn't request this code?</strong> Reset your password immediately or contact the POLWEL support team so we can help secure your account.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: 'Welcome to POLWEL - Complete Your Account Setup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
            <title>POLWEL Account Setup</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f5f5f5 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5 !important;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                      <td bgcolor="#1f2937" style="padding: 32px 24px; background-color: #1f2937 !important; text-align: center;">
                        <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1f2937" stroke="false" style="width:552px;height:auto;">
                        <v:textbox inset="0,0,0,0">
                        <![endif]-->
                        <div style="margin-bottom: 16px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 48px; width: auto;" /></div>
                        <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #ffffff !important; font-family: Arial, sans-serif !important;">Welcome to POLWEL!</h1>
                        <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #e5e7eb !important; font-family: Arial, sans-serif !important;">Complete Your Account Setup</p>
                        <!--[if mso]>
                        </v:textbox>
                        </v:rect>
                        <![endif]-->
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td bgcolor="#ffffff" style="padding: 32px 24px; background-color: #ffffff !important;">
                        <p style="font-size: 16px !important; margin: 0 0 16px 0 !important; padding: 0 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Hello ${name},</p>
                        <p style="margin: 0 0 20px 0 !important; padding: 0 !important; font-size: 15px !important; color: #374151 !important; font-family: Arial, sans-serif !important;">Welcome to the POLWEL Training Management System! We're excited to have you on board. Click the button below to complete your account setup and start using the platform.</p>
                        
                        <!-- Button Card -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td bgcolor="#f8fafc" style="background-color: #f8fafc !important; border: 1px solid #e5e7eb; padding: 24px; text-align: center;">
                              <a href="${setupUrl}" style="display: inline-block; background-color: #1f2937 !important; color: #ffffff !important; padding: 15px 30px; text-decoration: none; font-weight: 700 !important; font-size: 16px !important; font-family: Arial, sans-serif !important;">Complete Account Setup</a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Checklist -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                          <tr>
                            <td bgcolor="#f8fafc" style="padding: 20px 24px; background-color: #f8fafc !important; border: 1px solid #e5e7eb;">
                              <p style="margin: 0 0 12px 0 !important; padding: 0 !important; font-size: 15px !important; font-weight: 600 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Getting started:</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">1</span>
                                    Set up your account password securely.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">2</span>
                                    Complete your profile information.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 0; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">3</span>
                                    Access all platform features based on your role.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
      specifiedLocation?: string | null;
    },
    baseFee: number,
    ccEmails?: string[] | null,
    additionalBody?: string | null,
    attachments?: any[] | null
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

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

    const textBody = `Dear ${name},\n\nPlease refer to the attached documents and the details below regarding the upcoming course, ${courseRunDetails.course || 'N/A'}, for your organisation's reference.\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Day & Date: ${formatDate(courseRunDetails.startDate)}${courseRunDetails.endDate && courseRunDetails.startDate !== courseRunDetails.endDate ? ' to ' + formatDate(courseRunDetails.endDate) : ''}\n- Time: ${formatTime(courseRunDetails.startDate, courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}${courseRunDetails.venueAddress ? '\n  ' + courseRunDetails.venueAddress : ''}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Thank you.\n\nRegards,\n\nProfessional Development & Career Services Division\nPOLWEL Co-operative Society Limited\nMain: (65) 6235 6428 (Option 4) | www.polwel.org.sg | #POLWELCares\nStay connected with POLWEL on and view our professional development courses on HRP!`;

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Training Assignment & Course Confirmation</title>
        <!--[if mso]>
        <style type="text/css">
          table { border-collapse: collapse; }
          td { padding: 0; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#0f172a" style="background-color: #0f172a !important;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 28px 24px; background-color: #1f2937 !important;" bgcolor="#1f2937" align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 42px; width: auto;" /></div>
                          <h1 style="margin: 0 0 8px 0; color: #ffffff !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Training Assignment & Course Confirmation</h1>
                          <p style="margin: 0; color: #e5e7eb !important; font-size: 14px; font-family: Arial, sans-serif !important;">${courseRunDetails.course || 'Training Course'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 32px 28px; background-color: #ffffff !important;" bgcolor="#ffffff">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Hi ${name},</p>
                          <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            Please refer to the attached documents and the details below regarding the upcoming course, <strong>${courseRunDetails.course || 'N/A'}</strong>, for your organisation's reference.
                          </p>
                          
                          
                          <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details – The course details are as follows:</p>
                          
                          <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border: 1px solid #d1d5db; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Day & Date</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatDate(courseRunDetails.startDate)}${courseRunDetails.endDate && courseRunDetails.startDate !== courseRunDetails.endDate ? ' to ' + formatDate(courseRunDetails.endDate) : ''}</td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Time</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatTime(courseRunDetails.startDate, courseRunDetails.endDate)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Venue</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                ${courseRunDetails.venue || courseRunDetails.specifiedLocation || 'TBD'}
                                ${courseRunDetails.venueAddress ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">${courseRunDetails.venueAddress}</span>` : ''}
                                ${courseRunDetails.specifiedLocation && courseRunDetails.venue ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">Specified Location: ${courseRunDetails.specifiedLocation}</span>` : ''}
                              </td>
                            </tr>
                          </table>

                          ${additionalBody ? `
                          <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Additional Information</p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 16px; background-color: #f9fafb !important; border: 1px solid #e5e7eb; margin: 20px 0;" bgcolor="#f9fafb">
                                <div style="color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalBody}</div>
                              </td>
                            </tr>
                          </table>
                          ` : ''}

                          <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            Thank you.
                          </p>
                          <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            Regards,
                          </p>
                          <p style="margin: 16px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.8; font-family: Arial, sans-serif !important;">
                            <strong>Professional Development & Career Services Division</strong><br/>
                            POLWEL Co-operative Society Limited<br/>
                            Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                            Stay connected with POLWEL on and view our professional development courses on HRP!
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                ${this.getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    const mailOptions: any = {
      from: this.mailFromAddress,
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
      
      // Add logo attachment first if available
      if (logoAttachment) {
        mailOptions.attachments.push(logoAttachment);
      }
      
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
    } else if (logoAttachment) {
      // If no custom attachments but logo exists, add it
      mailOptions.attachments = [logoAttachment];
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
    specifiedLocation?: string;
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
      specifiedLocation,
      additionalNotes,
      cc,
      attachments,
    } = params;

    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

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
      from: this.mailFromAddress,
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
            <!--[if mso]>
            <style type="text/css">
              table { border-collapse: collapse; }
              td { padding: 0; }
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#0f172a" style="background-color: #0f172a !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937 !important;" bgcolor="#1f2937" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 42px; width: auto;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #ffffff !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Course Confirmation</h1>
                              <p style="margin: 0; color: #e5e7eb !important; font-size: 14px; font-family: Arial, sans-serif !important;">Registration Confirmed</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff !important;" bgcolor="#ffffff">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td>
                              <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear Participants,</p>
                              <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Please refer to the attached documents and the details below regarding the upcoming course, <strong>${courseTitle}</strong>, for your organisation's reference.
                              </p>
                              
                              
                              <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details – The course details are as follows:</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border: 1px solid #d1d5db; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Day & Date</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatDateWithDay(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' to ' + formatDateWithDay(endDate) : ''}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Time</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatTime(startDate, endDate)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Venue</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    ${venueName || specifiedLocation || 'To be confirmed'}
                                    ${venueAddress ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">${venueAddress}</span>` : ''}
                                    ${specifiedLocation && venueName ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">Specified Location: ${specifiedLocation}</span>` : ''}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Note</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
                                  </td>
                                </tr>
                              </table>

                              ${additionalNotes ? `
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f3f4f6 !important; border-left: 4px solid #d1d5db;" bgcolor="#f3f4f6">
                                    <div style="color: #6b7280 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalNotes}</div>
                                  </td>
                                </tr>
                              </table>
                              ` : ''}

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f3f4f6 !important; border-left: 4px solid #d1d5db;" bgcolor="#f3f4f6">
                                    <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Withdrawal Policy</p>
                                    <div style="color: #6b7280 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      • <strong>More than 10 working days before the course commencement date:</strong> 0% of the total course fees will be chargeable (i.e. 100% refundable)<br/><br/>
                                      • <strong>Within 10 working days before the course commencement date:</strong> 50% of the total course fees will be chargeable (i.e. 50% refundable)<br/><br/>
                                      • <strong>Absence on the day of the confirmed course:</strong> Will be deemed as no-show in which 100% of the total course fees will be chargeable (i.e. non-refundable).
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f3f4f6 !important; border-left: 4px solid #d1d5db;" bgcolor="#f3f4f6">
                                    <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Photos & Videography</p>
                                    <div style="color: #6b7280 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      Please note that photos and/or videos may be taken by POLWEL staff during the course/workshop for publicity purposes. You can find our <a href="https://polwel.org/privacy-policy" style="color: #4b5563 !important; text-decoration: none;">Privacy Policy here</a>. All images and/or videos captured will remain the property of POLWEL.
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Thank you.
                              </p>
                              <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Regards,
                              </p>
                              <p style="margin: 16px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.8; font-family: Arial, sans-serif !important;">
                                <strong>Professional Development & Career Services Division</strong><br/>
                                POLWEL Co-operative Society Limited<br/>
                                Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                                Stay connected with POLWEL on and view our professional development courses on HRP!
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const fs = require('fs');
      mailOptions.attachments = [];

      // Add logo attachment first if available
      if (logoAttachment) {
        mailOptions.attachments.push(logoAttachment);
      }

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
    } else if (logoAttachment) {
      // If no custom attachments but logo exists, add it
      mailOptions.attachments = [logoAttachment];
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

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

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: `Course Cancellation Notice - ${courseTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Course Cancellation Notice</title>
            <!--[if mso]>
            <style type="text/css">
              table { border-collapse: collapse; }
              td { padding: 0; }
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#0f172a" style="background-color: #0f172a !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937 !important;" bgcolor="#1f2937" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 42px; width: auto;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #ffffff !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Course Cancellation Notice</h1>
                              <p style="margin: 0; color: #e5e7eb !important; font-size: 14px; font-family: Arial, sans-serif !important;">Important Update Regarding Your Course</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff !important;" bgcolor="#ffffff">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td>
                              <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear Participants,</p>
                              <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We regret to inform you that the following course has been <strong>cancelled</strong> due to ${cancellationReason || 'unforeseen circumstances'}.
                              </p>
                              
                              <p style="margin: 24px 0 12px 0; color: #1f2937 !important; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif !important;">Cancelled Course Details</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb !important; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                                <tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Course Name:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${courseTitle}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Date:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${formatDate(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' - ' + formatDate(endDate) : ''}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Time:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${formatTime()}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Venue:</td>
                                  <td style="padding: 12px 16px; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${venueName || 'TBD'}</td>
                                </tr>
                              </table>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f3f4f6 !important; border-left: 4px solid #d1d5db;" bgcolor="#f3f4f6">
                                    <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Important Information</p>
                                    <div style="color: #6b7280 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      • All registrations for this course have been cancelled<br/>
                                      • No further action is required from you at this time<br/>
                                      • If applicable, refunds will be processed within 14 working days
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f8fafc !important; border: 1px solid #d1d5db;" bgcolor="#f8fafc">
                                    <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Alternative Options</p>
                                    <div style="color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      We will notify you once a new course run has been scheduled. In the meantime, you may wish to explore other available courses on our training calendar.<br/><br/>
                                      For any queries or to discuss alternative training options, please contact PDCS at <a href="mailto:pdcs@polwel.org" style="color: #4b5563 !important; text-decoration: none;">pdcs@polwel.org</a> or call us at <a href="tel:67184870" style="color: #4b5563 !important; text-decoration: none;">6718 4870</a> or <a href="tel:64319973" style="color: #4b5563 !important; text-decoration: none;">6431 9973</a>.
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We sincerely apologize for any inconvenience this may cause. We understand the importance of this training to your professional development and appreciate your understanding.
                              </p>
                              <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Thank you for your understanding and continued support. We look forward to serving you in future training programmes.
                              </p>
                              <p style="margin: 16px 0 0 0; color: #1f2937 !important; font-size: 14px; font-weight: 500; font-family: Arial, sans-serif !important;">
                                Best regards,<br/>
                                <strong>POLWEL Training System Team</strong>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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
    const logoSrc = this.getLogoSrc();
  const logoAttachment = this.getLogoAttachment();

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

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: `Congratulations! Certificate of Completion - ${courseTitle}`,
      headers: {
        'X-Mailjet-TrackClick': '0',
        'X-Mailjet-TrackOpen': '0',
      },
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Course Completion</title>
            <!--[if mso]>
            <style type="text/css">
              table { border-collapse: collapse; }
              td { padding: 0; }
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#0f172a" style="background-color: #0f172a !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #1f2937 !important;" bgcolor="#1f2937" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" style="height: 42px; width: auto;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #ffffff !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Congratulations!</h1>
                              <p style="margin: 0; color: #e5e7eb !important; font-size: 14px; font-family: Arial, sans-serif !important;">You've Successfully Completed the Course</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff !important;" bgcolor="#ffffff">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td>
                              <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear ${learnerName},</p>
                              <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Congratulations on successfully completing the course! We are pleased to present you with your Certificate of Completion.
                              </p>
                              
                              <p style="margin: 24px 0 12px 0; color: #1f2937 !important; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif !important;">Course Completed</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb !important; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                                <tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; width: 35%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Course Name:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${courseTitle}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Date:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${formatDate(startDate)}${endDate && startDate?.getTime() !== endDate?.getTime() ? ' - ' + formatDate(endDate) : ''}</td>
                                </tr>
                                ${trainerName ? `<tr>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Trainer:</td>
                                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${trainerName}</td>
                                </tr>` : ''}
                                <tr>
                                  <td style="padding: 12px 16px; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Completion Date:</td>
                                  <td style="padding: 12px 16px; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${formatDate(completionDate || endDate)}</td>
                                </tr>
                              </table>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                                <tr>
                                  <td style="padding: 24px; background-color: #f3f4f6 !important; border: 2px solid #6b7280; text-align: center;" bgcolor="#f3f4f6" align="center">
                                    <div style="font-size: 40px; margin-bottom: 16px;">🏆</div>
                                    <p style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif !important;">Certificate of Completion</p>
                                    <p style="margin: 0 0 16px 0; color: #525252 !important; font-size: 13px; font-family: Arial, sans-serif !important;">Awarded to: ${learnerName}</p>
                                    <a href="${certificateDownloadUrl}" style="display: inline-block; background-color: #6b7280 !important; color: #ffffff !important; padding: 12px 32px; text-decoration: none; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#6b7280">⬇ Download Certificate</a>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We hope that you found this programme enriching and valuable for your personal and professional development!
                              </p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f8fafc !important; border-left: 4px solid #6b7280;" bgcolor="#f8fafc">
                                    <p style="margin: 0 0 12px 0; color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      If you are interested to know or register for our other course offerings, please refer to the link & QR code below:
                                    </p>
                                    <div style="text-align: center; margin: 16px 0;">
                                      <a href="https://polwel.org.sg/courses/" style="color: #3b82f6 !important; font-size: 14px; text-decoration: underline; font-family: Arial, sans-serif !important; display: block; margin-bottom: 12px;">https://polwel.org.sg/courses/</a>
                                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://polwel.org.sg/courses/" alt="QR Code for Course Offerings" style="width: 150px; height: 150px; display: block; margin: 0 auto;" />
                                    </div>
                                    <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                      Once again, thank you for your support and hope to see you soon in our next workshop!
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We hope that you found this programme enriching and valuable for your personal and professional development!
                              </p>
                              <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We look forward to welcoming you to future training programmes!
                              </p>
                              
                              <p style="margin: 20px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Thank you.
                              </p>
                              <p style="margin: 16px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Regards,
                              </p>
                              
                              <p style="margin: 16px 0 0 0; color: #1f2937 !important; font-size: 14px; font-weight: 500; font-family: Arial, sans-serif !important;">
                                <strong>Professional Development & Career Services Division</strong><br/>
                                POLWEL Co-operative Society Limited<br/>
                                Main: (65) 6235 6428 (Option 4) | <a href="http://www.polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">www.polwel.org.sg</a> | #POLWELCares<br/>
                                Stay connected with POLWEL on <a href="https://www.facebook.com/polwelsg" style="color: #4b5563 !important; text-decoration: none;">Facebook</a> and view our professional development courses on <a href="https://hrp.gov.sg/" style="color: #4b5563 !important; text-decoration: none;">HRP</a>!
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    ${this.getEmailFooter()}
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : [],
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