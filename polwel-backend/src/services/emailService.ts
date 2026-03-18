import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import type { SentMessageInfo, Transport, TransportOptions } from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';
import { POLWEL_LOGO_BASE64_DATA_URI } from '../assets/logoBase64';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool?: boolean;
  maxConnections?: number;
  socketTimeout?: number;
  greetingTimeout?: number;
  connectionTimeout?: number;
  tls?: {
    rejectUnauthorized: boolean;
    minVersion?: string;
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
              isInline: !!(attachment as any).cid,
              ...((attachment as any).cid && { contentId: (attachment as any).cid }),
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

  // Get logo URL for use in emails (last-resort fallback when base64 encoding is unavailable)
  private static getLogoUrl(): string {
    if (this.logoUrl) return this.logoUrl;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    // Encode the space in the filename so the URL is valid in all email clients
    this.logoUrl = `${frontendUrl}/images/POLWEL%20Logo_Horizontal.png`;
    console.log('📷 Using logo URL fallback:', this.logoUrl);
    return this.logoUrl;
  }

  // Detect when the SMTP host is Microsoft Office 365 / Outlook
  private static isOutlookSmtp(): boolean {
    const host = (process.env.MAIL_HOST || '').toLowerCase();
    return host.includes('office365.com') || host.includes('outlook.com') || host.includes('hotmail.com');
  }

  // Detect if the service is running in Graph API (production) mode
  private static isGraphApiMode(): boolean {
    return process.env.NODE_ENV === 'Production' &&
      !!(process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET &&
         process.env.GRAPH_TENANT_ID && process.env.GRAPH_MAIL_FROM_ADDRESS);
  }

  // Return logo as base64 data URI.
  // Uses the embedded constant (POLWEL_LOGO_BASE64_DATA_URI) which is compiled into the
  // bundle — completely independent of the file system. This guarantees the logo always
  // renders in production (Graph API / Outlook) where the PNG file is not deployed.
  // Falls back to reading from disk (dev convenience) then URL if the constant is empty.
  private static getLogoBase64Src(): string {
    if (POLWEL_LOGO_BASE64_DATA_URI) {
      return POLWEL_LOGO_BASE64_DATA_URI;
    }
    // Disk fallback (development only — file may not exist in production)
    const logoPath = this.getLogoPath();
    if (logoPath) {
      try {
        const ext = path.extname(logoPath).toLowerCase();
        const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        const b64 = fs.readFileSync(logoPath).toString('base64');
        return `data:${mime};base64,${b64}`;
      } catch {
        // fall through
      }
    }
    return this.getLogoUrl();
  }

  // Get logo attachment for email (CID approach - works in SMTP clients).
  // Returns null in Graph API mode because the logo is embedded directly as a base64
  // data URI in getLogoSrc(), so no separate attachment is needed.
  private static getLogoAttachment(): any | null {
    if (this.isGraphApiMode()) {
      return null; // Logo is embedded as base64 data URI in HTML; no attachment needed
    }
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

  // Get logo as Mailjet InlinedAttachment object (for REST API path)
  private static getLogoMailjetInline(): { ContentType: string; Filename: string; Base64Content: string; ContentID: string } | null {
    const logoPath = this.getLogoPath();
    if (!logoPath) return null;
    try {
      const ext = path.extname(logoPath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      const b64 = fs.readFileSync(logoPath).toString('base64');
      return { ContentType: mime, Filename: 'polwel-logo.png', Base64Content: b64, ContentID: 'polwellogo' };
    } catch {
      return null;
    }
  }

  // Get logo source for use in HTML img tag.
  //
  // Strategy by transport:
  //   • Graph API / Outlook (production): HTTPS URL from FRONTEND_URL.
  //     Outlook's Exchange Online security policy strips data: URIs and unresolvable CID
  //     references from img src attributes, making the image disappear. A public HTTPS URL
  //     is the only reliable option for Outlook-delivered emails.
  //   • SMTP (dev/local): CID inline attachment resolved by nodemailer.
  private static getLogoSrc(): string {
    if (this.isGraphApiMode()) {
      // Use the production public URL — Outlook loads this without stripping it.
      const frontendUrl = (process.env.FRONTEND_URL || 'https://tms.polwel.org.sg').replace(/\/$/, '');
      return `${frontendUrl}/images/POLWEL%20Logo_Horizontal.png`;
    }
    return 'cid:polwellogo';
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

  /**
   * Send via Mailjet REST API (v3.1) — used when SMTP host is Mailjet.
   * More reliable for large attachments; returns proper HTTP error codes.
   */
  private static async sendViaMailjetApi(opts: {
    to: string | string[];
    cc?: string[];
    from: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
    inlinedAttachments?: Array<{ ContentType: string; Filename: string; Base64Content: string; ContentID: string }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey    = process.env.MAIL_USERNAME || '';
    const apiSecret = process.env.MAIL_PASSWORD || '';
    const fromEmail = process.env.MAIL_FROM_ADDRESS || opts.from;
    const fromName  = process.env.MAIL_FROM_NAME   || 'POLWEL Training System';

    const toList = (Array.isArray(opts.to) ? opts.to : [opts.to]).map(e => ({ Email: e }));
    const ccList = (opts.cc || []).map(e => ({ Email: e }));

    const message: any = {
      From:    { Email: fromEmail, Name: fromName },
      To:      toList,
      Subject: opts.subject,
      HTMLPart: opts.html,
      ...(opts.text ? { TextPart: opts.text } : {}),
      ...(ccList.length ? { Cc: ccList } : {}),
    };

    if (opts.inlinedAttachments && opts.inlinedAttachments.length > 0) {
      message.InlinedAttachments = opts.inlinedAttachments;
      console.log(`🖼️  Mailjet REST API: ${opts.inlinedAttachments.length} inlined attachment(s) (logo CID)`);
    }

    if (opts.attachments && opts.attachments.length > 0) {
      message.Attachments = opts.attachments.map(att => ({
        ContentType: att.contentType || 'application/octet-stream',
        Filename:    att.filename,
        Base64Content: att.content.toString('base64'),
      }));
      const totalMB = opts.attachments.reduce((s, a) => s + a.content.length, 0) / 1024 / 1024;
      console.log(`📎 Mailjet REST API: ${opts.attachments.length} attachment(s), total ${totalMB.toFixed(2)} MB`);
    }

    try {
      const res = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
        },
        body: JSON.stringify({ Messages: [message] }),
      });

      const body = await res.json() as any;

      if (!res.ok) {
        const errDetail = JSON.stringify(body);
        console.error(`❌ Mailjet REST API error ${res.status}: ${errDetail}`);
        return { success: false, error: `Mailjet API ${res.status}: ${errDetail}` };
      }

      const msg = body?.Messages?.[0];
      if (msg?.Status !== 'success') {
        const errDetail = JSON.stringify(msg);
        console.error(`❌ Mailjet delivery status not success: ${errDetail}`);
        return { success: false, error: errDetail };
      }

      const msgId = msg?.To?.[0]?.MessageID || msg?.To?.[0]?.MessageUUID || 'unknown';
      console.log(`✅ Mailjet REST API sent. MessageID: ${msgId}`);
      return { success: true, messageId: String(msgId) };
    } catch (err: any) {
      console.error('❌ Mailjet REST API fetch error:', err?.message);
      return { success: false, error: err?.message };
    }
  }

  /** Returns true when the current SMTP config points to Mailjet */
  private static isMailjetSmtp(): boolean {
    return (process.env.MAIL_HOST || '').toLowerCase().includes('mailjet');
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
      const smtpHost = process.env.MAIL_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.MAIL_PORT || '587');
      const encryption = process.env.MAIL_ENCRYPTION || (smtpPort === 465 ? 'SSL' : 'STARTTLS');
      const isSSL = encryption === 'SSL';
      const isSTARTTLS = encryption !== 'SSL';
      const isOutlook = this.isOutlookSmtp();

      // Office 365 / Outlook requires STARTTLS on port 587 with requireTLS.
      // Gmail supports both SSL on 465 and STARTTLS on 587.
      const config: EmailConfig = {
        host: smtpHost,
        port: smtpPort,
        secure: isSSL, // true only for direct SSL (port 465)
        auth: {
          user: process.env.MAIL_USERNAME || '',
          pass: process.env.MAIL_PASSWORD || ''
        },
        pool: false,
        maxConnections: 1,
        socketTimeout: 120000,
        greetingTimeout: 15000,
        connectionTimeout: 30000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        // Office 365 needs requireTLS so nodemailer upgrades the connection via STARTTLS
        ...(isOutlook && { requireTLS: true } as any),
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

      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log(`║ 📧 EMAIL SERVICE INITIALIZATION - ${isOutlook ? 'OUTLOOK/OFFICE 365' : 'SMTP'}           ║`);
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('🔧 SMTP Configuration:');
      console.log('   ├─ Host:', config.host);
      console.log('   ├─ Port:', config.port);
      console.log('   ├─ Mode:', isOutlook ? '🔵 Office 365 / Outlook (requireTLS + STARTTLS)' : isSSL ? '🔒 SSL' : '🔓 STARTTLS');
      console.log('   ├─ Username:', config.auth.user);
      console.log('   ├─ Password:', config.auth.pass ? '***SET*** (length: ' + config.auth.pass.length + ')' : '❌ NOT SET');
      console.log('   ├─ From Address:', this.mailFromAddress);
      console.log('   └─ Logo:', 'Embedded base64 (no file dependency)');
      console.log('');

      this.transporter = nodemailer.createTransport(config as any);
      this.isInitialized = true;
      
      console.log('✅ Transporter created successfully');
      console.log('🔄 Verifying SMTP connection...');
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('╔════════════════════════════════════════════════════════════════╗');
          console.error('║ ❌ SMTP CONNECTION VERIFICATION FAILED                        ║');
          console.error('╚════════════════════════════════════════════════════════════════╝');
          console.error('Error Message:', error.message);
          console.error('Error Code:', (error as any).code);
          console.error('Error Command:', (error as any).command);
          console.error('Response:', (error as any).response);
          console.error('Full Error:', error);
          console.error('════════════════════════════════════════════════════════════════');
        } else {
          console.log('╔════════════════════════════════════════════════════════════════╗');
          console.log('║ ✅ SMTP CONNECTION VERIFIED SUCCESSFULLY                      ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #1f2937 !important; font-family: Arial, sans-serif;">Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280 !important; font-family: Arial, sans-serif;">Complete Your Trainer Account Setup</p>
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
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Trainer setup email sent to ${email}`);
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
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
      console.error('❌ Error sending trainer setup email:');
      console.error('   Recipient:', email);
      console.error('   Error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && (error as any).code) {
        console.error('   Error Code:', (error as any).code);
      }
      if (error instanceof Error && (error as any).response) {
        console.error('   SMTP Response:', (error as any).response);
      }
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #1f2937 !important; font-family: Arial, sans-serif;">Welcome to POLWEL!</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280 !important; font-family: Arial, sans-serif;">Complete Your Training Coordinator Setup</p>
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
                        <p style="margin: 0; font-size: 12px; color: #94a3b8 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management System. All rights reserved.</p>
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #1f2937 !important; font-family: Arial, sans-serif;">Password Reset Request</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280 !important; font-family: Arial, sans-serif;">POLWEL Training Management System</p>
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
                        <p style="margin: 0; font-size: 12px; color: #94a3b8 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management System. All rights reserved.</p>
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
                      <td bgcolor="#ffffff" style="padding: 32px 24px; background-color: #ffffff !important; text-align: center; border-bottom: 2px solid #f3f4f6;">
                        <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Secure your login</h1>
                        <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #6b7280 !important; font-family: Arial, sans-serif !important;">POLWEL Training Management System</p>
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
                    <!-- Footer: autogenerated note only (no full POLWEL footer for OTP emails) -->
                    <tr>
                      <td style="padding: 20px 28px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;" bgcolor="#f9fafb">
                        <p style="margin: 0; font-size: 12px; color: #6b7280; font-family: Arial, sans-serif;">This is an autogenerated email. No reply is required.</p>
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
                      <td bgcolor="#ffffff" style="padding: 32px 24px; background-color: #ffffff !important; text-align: center; border-bottom: 2px solid #f3f4f6;">
                        <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Welcome to POLWEL!</h1>
                        <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #6b7280 !important; font-family: Arial, sans-serif !important;">Complete Your Account Setup</p>
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
      trainerRemarks?: string | null;
    },
    baseFee: number,
    ccEmails?: string[] | null,
    additionalBody?: string | null,
    attachments?: any[] | null,
    recipientType?: 'trainer' | 'partner'
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    const isPartner = recipientType === 'partner';

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);

    // Compare only the date portion (YYYY-MM-DD) to detect same-day courses
    const isSameDay = (d1?: string | null, d2?: string | null): boolean => {
      if (!d1 || !d2) return false;
      return d1.substring(0, 10) === d2.substring(0, 10);
    };

    const formatDate = (d?: string | null) => {
      if (!d) return 'TBD';
      try {
        const dt = new Date(d);
        // Format as: Friday, 20 February 2026
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
                  <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none;" /></div>
                          <h1 style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Training Assignment & Course Confirmation</h1>
                          <p style="margin: 0; color: #6b7280 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${courseRunDetails.course || 'Training Course'}</p>
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
                          <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear ${name},</p>
                          <p style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            ${isPartner
                              ? `Please refer to the attached documents and the details below regarding the upcoming course for your reference.`
                              : `Please refer to the attached documents and details for the upcoming course.`}
                          </p>
                          <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            Participants enrolled in the course run have also been disseminated with the relevant materials.
                          </p>

                          <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details – The course details are as follows:</p>

                          <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border: 1px solid #d1d5db; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Course Name &amp; Run Code</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                ${courseRunDetails.course || 'N/A'}
                                ${courseRunDetails.serialNumber ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280 !important; font-family: Arial, sans-serif !important;">Run Code: ${courseRunDetails.serialNumber}</span>` : ''}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Day &amp; Date</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatDate(courseRunDetails.startDate)}${!isSameDay(courseRunDetails.startDate, courseRunDetails.endDate) ? ' to ' + formatDate(courseRunDetails.endDate) : ''}</td>
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
                            <tr>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Note</td>
                              <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
                              </td>
                            </tr>
                          </table>

                          ${!isPartner && baseFee > 0 ? `
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                            <tr>
                              <td style="padding: 16px; background-color: #f9fafb !important; border: 1px solid #e5e7eb;" bgcolor="#f9fafb">
                                <p style="margin: 0 0 8px 0; color: #374151 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Professional Fees:</p>
                                <p style="margin: 0; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatCurrency(baseFee)}/run</p>
                                ${courseRunDetails.trainerRemarks ? `<p style="margin: 8px 0 0 0; color: #4b5563 !important; font-size: 13px; font-family: Arial, sans-serif !important;"><strong>Remarks:</strong> ${courseRunDetails.trainerRemarks}</p>` : ''}
                              </td>
                            </tr>
                          </table>
                          ` : ''}

                          ${additionalBody ? `
                          <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Additional Information</p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 16px; background-color: #f9fafb !important; border: 1px solid #e5e7eb;" bgcolor="#f9fafb">
                                <div style="color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalBody}</div>
                              </td>
                            </tr>
                          </table>
                          ` : ''}

                          <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                            Thank you.
                          </p>

                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0 0 0;">
                            <tr>
                              <td style="padding: 16px; background-color: #f8fafc !important; border-left: 4px solid #6b7280;" bgcolor="#f8fafc">
                                <p style="margin: 0 0 12px 0; color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                  If you are interested to know or register for our other course offerings, please refer to the link &amp; QR code below:
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
      subject: `Training Assignment & Course Confirmation: ${courseRunDetails.serialNumber || courseRunDetails.course || 'POLWEL'}`,
      text: textBody,
      html,
      attachments: logoAttachment ? [logoAttachment] : [],
    };

    if (ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0) {
      mailOptions.cc = ccEmails.join(', ');
    }

    // Preload all file attachments as buffers for reliable sending
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          if (fs.existsSync(attachment.path)) {
            const fileStats = fs.statSync(attachment.path);
            console.log(`(EmailService) Trainer attachment: ${attachment.originalName || attachment.filename} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
            const fileBuffer = fs.readFileSync(attachment.path);
            mailOptions.attachments.push({
              filename: attachment.originalName || attachment.filename,
              content: fileBuffer,
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
        console.log('To:', email, '| Subject:', mailOptions.subject);
        return { success: false, error: 'SMTP not configured' };
      }

      // Use Mailjet REST API for attachment emails (avoids silent SMTP rejection of large/flagged files)
      const hasCustomAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (hasCustomAttachments && this.isMailjetSmtp()) {
        console.log('🚀 Using Mailjet REST API for trainer email with attachments...');
        // Only pass file attachments (buffers) — logo is passed as InlinedAttachment separately
        const apiAttachments = (mailOptions.attachments || [])
          .filter((a: any) => Buffer.isBuffer(a.content))
          .map((a: any) => ({ filename: a.filename, content: a.content as Buffer, contentType: a.contentType || 'application/octet-stream' }));
        const logoInline = this.getLogoMailjetInline();

        const result = await this.sendViaMailjetApi({
          to: email,
          from: this.mailFromAddress,
          subject: mailOptions.subject,
          html: mailOptions.html,
          attachments: apiAttachments,
          ...(logoInline ? { inlinedAttachments: [logoInline] } : {}),
          ...(ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0 ? { cc: ccEmails } : {}),
        });
        if (!result.success) {
          console.error('❌ Mailjet REST API failed for trainer email:', result.error);
        }
        return result;
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
    /** e.g. "3 Days" — used in the email subject line instead of the start date */
    courseDuration?: string | null;
    /** Course run remarks to display in the Note field */
    remarks?: string | null;
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
      courseDuration,
      remarks,
    } = params;

    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    // Returns true when both dates fall on the same calendar day (ignores time)
    const isSameDayLocal = (d1?: Date, d2?: Date): boolean => {
      if (!d1 || !d2) return false;
      return d1.toISOString().substring(0, 10) === d2.toISOString().substring(0, 10);
    };

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
        const regDate = new Date(start.getTime() - 15 * 60 * 1000);
        const regTime = regDate.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
        return `${startTime} to ${endTime} hrs <em>(Registration starts at ${regTime})</em>`;
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

    // Subject: prefer "(3 Days)" style; fall back to start date if no duration given
    const subjectSuffix = courseDuration
      ? courseDuration
      : formatDateForSubject(startDate);
    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: `Course Confirmation: ${courseTitle}${subjectSuffix ? ` (${subjectSuffix})` : ''}`,
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Course Confirmation</h1>
                             
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
                              <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear Learners,</p>
                              <p style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Thank you for registering for  <b>${courseTitle}</b>.
                              </p>
                              <p style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                The course details are as follows:
                              </p>
                              
                              <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details – The course details are as follows:</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border: 1px solid #d1d5db; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Course Name</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    ${courseTitle}
                                    
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Day &amp; Date</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatDateWithDay(startDate)}${!isSameDayLocal(startDate, endDate) && endDate ? ' to ' + formatDateWithDay(endDate) : ''}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Time</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatTime(startDate, endDate)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Venue</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    ${venueName || specifiedLocation || 'To be confirmed'} <br>
                                    ${venueAddress ? `<span style="display: block; margin-top: 12px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">${venueAddress}</span>` : ''}
                                    ${specifiedLocation && venueName ? `<span style="display: block; margin-top: 12px; font-size: 13px; color: #6b7280 !important; line-height: 1.5; font-family: Arial, sans-serif !important;">Specified Location: ${specifiedLocation}</span>` : ''}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Note</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    ${remarks || 'For any queries pertaining to the workshop, please contact the training coordinator.'}
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
                              <div style="color: #6b7280 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                              For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #4b5563 !important; text-decoration: none;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
                              </div>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Thank you.
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

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      // Logo CID attachment already added above — push file attachments alongside it
      console.log(`📎 Processing ${attachments.length} attachment(s)...`);
      let totalAttachmentBytes = 0;
      for (const attachment of attachments) {
        try {
          if (fs.existsSync(attachment.path)) {
            const fileStats = fs.statSync(attachment.path);
            totalAttachmentBytes += fileStats.size;
            const fileBuffer = fs.readFileSync(attachment.path);
            mailOptions.attachments.push({
              filename: attachment.originalName || attachment.filename,
              content: fileBuffer,
            });
            console.log(`   ✅ ${attachment.originalName || attachment.filename} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
          } else {
            console.warn(`   ❌ Attachment file not found: ${attachment.path}`);
          }
        } catch (fileErr) {
          console.warn('   ⚠️ Error adding attachment:', (fileErr as any)?.message);
        }
      }
      console.log(`📎 Total attachment size: ${(totalAttachmentBytes / 1024 / 1024).toFixed(2)} MB`);
    }

    try {
      if (!transporter) {
        console.error('╔════════════════════════════════════════════════════════════════╗');
        console.error('║ ❌ SMTP TRANSPORTER NOT CONFIGURED                            ║');
        console.error('╚════════════════════════════════════════════════════════════════╝');
        console.error('Email would be sent to:', email);
        console.error('Course:', courseTitle);
        console.error('Configure SMTP in .env file with:');
        console.error('  - MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD');
        console.error('════════════════════════════════════════════════════════════════');
        return false;
      }

      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║ 📧 SENDING COURSE CONFIRMATION EMAIL - DETAILED LOG           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('📬 To:', email, '| Course:', courseTitle);
      console.log('   Subject:', mailOptions.subject);
      if (ccRecipients) console.log('   CC:', ccRecipients.join(', '));
      console.log('   Attachments:', mailOptions.attachments?.length || 0, 'file(s)');

      // ── Mailjet REST API path (used when attachments are present) ──────────
      // REST API gives proper HTTP rejection codes; SMTP silently queues then
      // bounces large / flagged attachments without notifying the sender.
      const hasCustomAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (hasCustomAttachments && this.isMailjetSmtp()) {
        console.log('🚀 Using Mailjet REST API for email with attachments...');

        // Logo uses CID (inline attachment) — pass it as InlinedAttachments to Mailjet so cid:polwellogo resolves
        const apiAttachments = (mailOptions.attachments || [])
          .filter((a: any) => Buffer.isBuffer(a.content))
          .map((a: any) => ({
            filename:    a.filename,
            content:     a.content as Buffer,
            contentType: a.contentType || 'application/octet-stream',
          }));
        const logoInline = this.getLogoMailjetInline();

        const result = await this.sendViaMailjetApi({
          to:          email,
          from:        this.mailFromAddress,
          subject:     mailOptions.subject,
          html:        mailOptions.html as string,
          attachments: apiAttachments,
          ...(logoInline ? { inlinedAttachments: [logoInline] } : {}),
          ...(ccRecipients ? { cc: ccRecipients } : {}),
        });

        if (!result.success) {
          console.error('❌ Mailjet REST API failed:', result.error);
          return false;
        }
        console.log('✅ Mailjet REST API success. MessageID:', result.messageId);
        return true;
      }

      // ── Standard SMTP path (no attachments, or non-Mailjet SMTP) ──────────
      console.log('🔄 Sending via SMTP...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║ ✅ EMAIL SENT SUCCESSFULLY - SMTP RESPONSE                    ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('📨 Email sent to:', email);
      console.log('   ├─ Message ID:', info.messageId);
      console.log('   ├─ Response:', info.response);
      console.log('   ├─ Accepted:', JSON.stringify(info.accepted));
      console.log('   └─ Rejected:', JSON.stringify(info.rejected));
      
      if (info.rejected && info.rejected.length > 0) {
        console.error('⚠️  Email rejected by server:', info.rejected);
        return false;
      }
      return true;
    } catch (error) {
      console.error('╔════════════════════════════════════════════════════════════════╗');
      console.error('║ ❌ FAILED TO SEND EMAIL - ERROR DETAILS                       ║');
      console.error('╚════════════════════════════════════════════════════════════════╝');
      console.error('Failed to send email to:', email);
      console.error('Error Message:', (error as any)?.message);
      console.error('Error Code:', (error as any)?.code);
      console.error('Error Response:', (error as any)?.response);
      console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('════════════════════════════════════════════════════════════════');
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
    /** Optional next run date text to include in the email, e.g. "15 April 2026" */
    nextRunDate?: string | null;
    /** Optional additional notes to include below the course details table */
    additionalNotes?: string | null;
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
      nextRunDate,
      additionalNotes,
    } = params;

    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    const formatDate = (date?: Date) => {
      if (!date) return 'To be confirmed';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for cancellation email:', error);
        return date.toISOString();
      }
    };

    const formatDateForSubject = (date?: Date) => {
      if (!date) return '';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      } catch {
        return '';
      }
    };

    const isSameDay = (d1?: Date, d2?: Date): boolean => {
      if (!d1 || !d2) return false;
      return d1.toISOString().substring(0, 10) === d2.toISOString().substring(0, 10);
    };

    const formatTime = () => '0900 to 1700 hrs';

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject: `Course Cancellation: ${courseTitle}${formatDateForSubject(startDate) ? ` (${formatDateForSubject(startDate)})` : ''}`,
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Course Cancellation Notice</h1>
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
                              <p style="margin: 0 0 16px 0; color: #4b5563 !important; font-size: 14px; font-family: Arial, sans-serif !important;">Dear ${learnerName || 'Participant'},</p>
                              <p style="margin: 0 0 24px 0; color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We regret to inform you that the following course has been cancelled due to ${cancellationReason || 'unforeseen circumstances'}.
                              </p>

                              <p style="margin: 24px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details – The course details are as follows:</p>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border: 1px solid #d1d5db; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; width: 30%; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Course Name</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">
                                    ${courseTitle}
                                    
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Day &amp; Date</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatDate(startDate)}${!isSameDay(startDate, endDate) && endDate ? ' to ' + formatDate(endDate) : ''}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Time</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${formatTime()}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Venue</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${venueName || 'TBD'}</td>
                                </tr>
                                
                              </table>

                              ${additionalNotes ? `
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f8fafc !important; border-left: 4px solid #6b7280;" bgcolor="#f8fafc">
                                    <div style="color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalNotes}</div>
                                  </td>
                                </tr>
                              </table>` : ''}

                              <p style="margin: 24px 0 8px 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We apologize for any inconvenience caused and appreciate your understanding. We hope to see you at our upcoming programmes.
                              </p>
                              <p style="margin: 8px 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Do visit our website to view our courses - <a href="https://polwel.org.sg/courses/" style="color: #3b82f6 !important; text-decoration: underline; font-family: Arial, sans-serif !important;">Courses | POLWEL Co-operative Society Limited</a>
                              </p>
                              <p style="margin: 8px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #3b82f6 !important; text-decoration: underline; font-family: Arial, sans-serif !important;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
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
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none;" /></div>
                              <h1 style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif !important;">Congratulations!</h1>
                              <p style="margin: 0; color: #6b7280 !important; font-size: 14px; font-family: Arial, sans-serif !important;">You've Successfully Completed the Course</p>
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
                                Thank you.
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

  /**
   * Send a "course completed" notification email to a trainer or partner.
   * Used when billing is finalized and the course run transitions to COMPLETED.
   */
  static async sendTrainerCourseCompletionEmail(params: {
    email: string;
    recipientName: string;
    courseTitle: string;
    courseCode?: string;
    serialNumber?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<boolean> {
    const { email, recipientName, courseTitle, courseCode, serialNumber, startDate, endDate } = params;
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    const formatDateFull = (d: Date) =>
      d.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isSameDay = (a: Date, b: Date) => a.toISOString().substring(0, 10) === b.toISOString().substring(0, 10);
    const dateRange = startDate
      ? (endDate && !isSameDay(startDate, endDate)
          ? `${formatDateFull(startDate)} – ${formatDateFull(endDate)}`
          : formatDateFull(startDate))
      : null;

    const footerHtml = this.getEmailFooter();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Course Completed – ${courseTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e3a5f;padding:24px 32px;text-align:center;">
            <img src="${logoSrc}" alt="POLWEL Logo" height="50" style="height:50px;display:block;margin:0 auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;">Dear ${recipientName},</p>
            <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">
              We are pleased to inform you that the following course run has been <strong>completed</strong> and billing has been finalised.
            </p>
            <!-- Course details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <tr style="background-color:#f9fafb;">
                <td style="padding:12px 16px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Course</td>
                <td style="padding:12px 16px;color:#1f2937;font-size:14px;border-bottom:1px solid #e5e7eb;">${courseTitle}${courseCode ? ` (${courseCode})` : ''}</td>
              </tr>
              ${serialNumber ? `<tr><td style="padding:12px 16px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Serial No.</td><td style="padding:12px 16px;color:#1f2937;font-size:14px;border-bottom:1px solid #e5e7eb;">${serialNumber}</td></tr>` : ''}
              ${dateRange ? `<tr><td style="padding:12px 16px;font-weight:600;color:#374151;font-size:14px;">Date</td><td style="padding:12px 16px;color:#1f2937;font-size:14px;">${dateRange}</td></tr>` : ''}
            </table>
            <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">
              If you have any questions, please contact us at <a href="mailto:pdcs@polwel.org.sg" style="color:#1e3a5f;">pdcs@polwel.org.sg</a>.
            </p>
            <p style="margin:0;font-size:14px;color:#374151;">Best regards,<br/><strong>POLWEL Training Team</strong></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr><td>${footerHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const inlinedAttachments = this.isMailjetSmtp() ? (this.getLogoMailjetInline() ? [this.getLogoMailjetInline()!] : []) : [];
    const mailOptions: any = {
      from: `"POLWEL Training" <${this.mailFromAddress}>`,
      to: email,
      subject: `Course Completed: ${courseTitle}`,
      html,
      text: `Dear ${recipientName},\n\nThe course "${courseTitle}" has been completed and billing finalised.\n\nBest regards,\nPOLWEL Training Team`,
    };

    if (!this.isGraphApiMode()) {
      const logoAttachmentData = logoAttachment;
      if (logoAttachmentData) {
        mailOptions.attachments = [logoAttachmentData];
      }
    }

    try {
      if (this.isMailjetSmtp()) {
        const result = await this.sendViaMailjetApi({
          to: email,
          from: this.mailFromAddress,
          subject: mailOptions.subject,
          html,
          text: mailOptions.text,
          inlinedAttachments,
        });
        return result.success;
      }
      const t = this.getTransporter();
      if (!t) throw new Error('Email transporter not available');
      await t.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send trainer course completion email:', error);
      return false;
    }
  }

  /**
   * Send waiver pending notification email to admins/staff with waiver approve permission.
   * Triggered when a learner submits a waiver request.
   */
  /**
   * Send email notification to users with course-run.approve permission when a course run
   * is moved to CONFIRMED_PENDING_TA_APPROVAL (i.e. pending trainer assignment review).
   */
  static async sendCourseRunTAApprovalEmail(params: {
    adminEmail: string;
    adminName: string;
    courseTitle: string;
    courseCode?: string | null;
    serialNumber?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    reviewUrl: string;
  }): Promise<boolean> {
    const { adminEmail, adminName, courseTitle, courseCode, serialNumber, startDate, endDate, reviewUrl } = params;
    const t = this.getTransporter();
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const displayCode = serialNumber || courseCode || '—';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="margin:0!important;padding:0!important;background-color:#0f172a!important;font-family:Arial,sans-serif!important;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f172a;" bgcolor="#0f172a">
            <tr><td align="center" style="padding:32px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;" bgcolor="#ffffff">
                <!-- Header -->
                <tr>
                  <td style="padding:32px 28px 24px;background-color:#ffffff;border-bottom:2px solid #f3f4f6;" align="center">
                    <div style="margin-bottom:12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display:block;height:48px;width:117px;max-width:117px;" /></div>
                    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1f2937;font-family:Arial,sans-serif;">POLWEL Training Management System</h1>
                    <p style="margin:4px 0 0 0;font-size:14px;color:#2563eb;font-weight:600;font-family:Arial,sans-serif;">📋 Course Run Pending Trainer Assignment Approval</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px 28px;background-color:#ffffff;">
                    <p style="font-size:16px;margin:0 0 16px 0;color:#1f2937;font-family:Arial,sans-serif;">Dear ${adminName},</p>
                    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
                      A course run has been confirmed and is now awaiting your review of the trainer assignment before proceeding.
                    </p>
                    <!-- Details table -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                      <tr style="background-color:#f9fafb;">
                        <td style="padding:14px 16px;font-size:13px;color:#6b7280;font-weight:600;font-family:Arial,sans-serif;width:40%;border-bottom:1px solid #e5e7eb;">Course Title</td>
                        <td style="padding:14px 16px;font-size:14px;color:#1f2937;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px solid #e5e7eb;">${courseTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;color:#6b7280;font-weight:600;font-family:Arial,sans-serif;background-color:#f9fafb;border-bottom:1px solid #e5e7eb;">Run Code</td>
                        <td style="padding:14px 16px;font-size:14px;color:#1f2937;font-family:Arial,sans-serif;border-bottom:1px solid #e5e7eb;">${displayCode}</td>
                      </tr>
                      ${startDate ? `
                      <tr style="background-color:#f9fafb;">
                        <td style="padding:14px 16px;font-size:13px;color:#6b7280;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px solid #e5e7eb;">Start Date</td>
                        <td style="padding:14px 16px;font-size:14px;color:#1f2937;font-family:Arial,sans-serif;border-bottom:1px solid #e5e7eb;">${fmt(startDate)}</td>
                      </tr>` : ''}
                      ${endDate ? `
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;color:#6b7280;font-weight:600;font-family:Arial,sans-serif;background-color:#f9fafb;">End Date</td>
                        <td style="padding:14px 16px;font-size:14px;color:#1f2937;font-family:Arial,sans-serif;">${fmt(endDate)}</td>
                      </tr>` : ''}
                    </table>
                    <!-- CTA -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
                      <tr>
                        <td align="center" style="padding:20px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
                          <p style="margin:0 0 16px 0;font-size:14px;color:#1e40af;font-family:Arial,sans-serif;">Review the trainer assignment and approve or reject it in the TMS portal.</p>
                          <a href="${reviewUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff!important;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;font-family:Arial,sans-serif;">Review Course Run</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;line-height:1.6;font-family:Arial,sans-serif;">
                      This is an automated notification from the POLWEL Training Management System.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                ${this.getEmailFooter()}
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `;

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: adminEmail,
      subject: `[Action Required] Course Run Pending TA Approval – ${displayCode}: ${courseTitle}`,
      html,
      attachments: logoAttachment ? [logoAttachment] : [],
    };

    try {
      if (this.isGraphApiMode()) {
        const t2 = this.getTransporter();
        if (!t2) { console.log(`(EmailService) Graph transport unavailable — TA approval notice to ${adminEmail} skipped`); return false; }
        await t2.sendMail(mailOptions);
      } else if (this.isMailjetSmtp()) {
        const mjOpts: { to: string; from: string; subject: string; html: string; attachments?: { filename: string; content: Buffer; contentType?: string }[] } = {
          to: adminEmail,
          from: this.mailFromAddress,
          subject: mailOptions.subject as string,
          html,
        };
        if (logoAttachment) mjOpts.attachments = [logoAttachment as { filename: string; content: Buffer; contentType?: string }];
        const result = await this.sendViaMailjetApi(mjOpts);
        return result.success;
      } else {
        if (!t) { console.log(`(EmailService) SMTP not configured — TA approval notice to ${adminEmail} skipped`); return false; }
        if (logoAttachment) mailOptions.attachments = [logoAttachment];
        await t.sendMail(mailOptions);
      }
      console.log(`✅ TA approval notice sent to ${adminEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send TA approval notice to ${adminEmail}:`, error);
      return false;
    }
  }

  static async sendWaiverPendingNotificationEmail(params: {
    adminEmail: string;
    adminName: string;
    learnerName: string;
    courseName: string;
    serialNumber: string;
    submissionDate: Date;
    reason: string;
    waiverRequestUrl: string;
  }): Promise<boolean> {
    const { adminEmail, adminName, learnerName, courseName, serialNumber, submissionDate, reason, waiverRequestUrl } = params;
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();
    const logoAttachment = this.getLogoAttachment();

    const formatDate = (d: Date) => d.toLocaleDateString('en-SG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const truncate = (str: string, max: number) => str.length > max ? str.slice(0, max) + '...' : str;

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: adminEmail,
      subject: `Waiver Request Pending Review – ${learnerName} (${serialNumber || courseName})`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Waiver Request Notification</title>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;" bgcolor="#0f172a">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none;" /></div>
                        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1f2937 !important; font-family: Arial, sans-serif;">POLWEL Training Management System</h1>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #dc2626 !important; font-weight: 600; font-family: Arial, sans-serif;">⚠ Waiver Request Pending Review</p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px; background-color: #ffffff;" bgcolor="#ffffff">
                        <p style="font-size: 16px; margin: 0 0 16px 0; color: #1f2937 !important; font-family: Arial, sans-serif;">Dear ${adminName},</p>
                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151 !important; line-height: 1.7; font-family: Arial, sans-serif;">
                          A new waiver request has been submitted and requires your review. Please find the details below:
                        </p>

                        <!-- Waiver Details Table -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                          <tr style="background-color: #f9fafb;">
                            <td style="padding: 14px 16px; font-size: 13px; color: #6b7280; font-weight: 600; font-family: Arial, sans-serif; width: 40%; border-bottom: 1px solid #e5e7eb;" bgcolor="#f9fafb">Learner Name</td>
                            <td style="padding: 14px 16px; font-size: 14px; color: #1f2937; font-weight: 600; font-family: Arial, sans-serif; border-bottom: 1px solid #e5e7eb;">${learnerName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 14px 16px; font-size: 13px; color: #6b7280; font-weight: 600; font-family: Arial, sans-serif; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;" bgcolor="#f9fafb">Course Name</td>
                            <td style="padding: 14px 16px; font-size: 14px; color: #1f2937; font-family: Arial, sans-serif; border-bottom: 1px solid #e5e7eb;">${courseName}</td>
                          </tr>
                          <tr style="background-color: #f9fafb;">
                            <td style="padding: 14px 16px; font-size: 13px; color: #6b7280; font-weight: 600; font-family: Arial, sans-serif; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;" bgcolor="#f9fafb">Run Code</td>
                            <td style="padding: 14px 16px; font-size: 14px; color: #1f2937; font-family: Arial, sans-serif; border-bottom: 1px solid #e5e7eb;">${serialNumber || '–'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 14px 16px; font-size: 13px; color: #6b7280; font-weight: 600; font-family: Arial, sans-serif; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;" bgcolor="#f9fafb">Submission Date</td>
                            <td style="padding: 14px 16px; font-size: 14px; color: #1f2937; font-family: Arial, sans-serif; border-bottom: 1px solid #e5e7eb;">${formatDate(submissionDate)}</td>
                          </tr>
                          <tr style="background-color: #f9fafb;">
                            <td style="padding: 14px 16px; font-size: 13px; color: #6b7280; font-weight: 600; font-family: Arial, sans-serif; background-color: #f9fafb; vertical-align: top;" bgcolor="#f9fafb">Reason</td>
                            <td style="padding: 14px 16px; font-size: 14px; color: #374151; font-family: Arial, sans-serif; line-height: 1.6;">${truncate(reason, 300)}</td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td align="center" style="padding: 20px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;" bgcolor="#fef3c7">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #92400e; font-family: Arial, sans-serif;">Review and take action on this waiver request in the TMS portal.</p>
                              <a href="${waiverRequestUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; font-family: Arial, sans-serif;" bgcolor="#dc2626">Review Waiver Request</a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280 !important; line-height: 1.6; font-family: Arial, sans-serif;">
                          This is an automated notification from the POLWEL Training Management System.
                        </p>
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
        console.log(`(EmailService) SMTP not configured — waiver notification to ${adminEmail} skipped`);
        return false;
      }
      await transporter.sendMail(mailOptions);
      console.log(`✅ Waiver notification sent to ${adminEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send waiver notification to ${adminEmail}:`, error);
      return false;
    }
  }
}

export default EmailService;