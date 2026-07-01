import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import type { SentMessageInfo, Transport, TransportOptions } from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';
import { POLWEL_LOGO_BASE64_DATA_URI } from '../assets/logoBase64';
import {
  createEmailLog,
  markEmailSent,
  markEmailFailed,
  markEmailRetrying,
  EMAIL_TYPES,
  EMAIL_PROVIDERS,
  classifyError,
  extractStack,
  extractSmtpResponse,
} from './emailLogService';
import {
  enqueueEmailRetry,
  type RetryContext,
  serializePayload,
} from './emailQueueService';

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
  private static get mailFromAddress(): string {
    return this.isGraphApiMode()
      ? process.env.GRAPH_MAIL_FROM_ADDRESS || 'noreply@polwel.org'
      : process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org';
  }
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

  // Detect if the service is running in Graph API (production or explicit dev) mode
  private static isGraphApiMode(): boolean {
    const hasGraphCreds = !!(
      process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET &&
      process.env.GRAPH_TENANT_ID &&
      process.env.GRAPH_MAIL_FROM_ADDRESS
    );
    if (!hasGraphCreds) return false;

    return (
      process.env.NODE_ENV === 'Production' ||
      process.env.MAIL_MAILER === 'outlook' ||
      process.env.MAIL_MAILER === 'graph' ||
      process.env.MAIL_MAILER === 'microsoft'
    );
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

  /** Logo src for browser iframe preview — never `cid:` (embeds base64 or public URL). */
  static getLogoSrcForWebPreview(): string {
    return this.getLogoBase64Src();
  }

  /**
   * Get all email media attachments (logo only, social icons are now embedded as data URIs).
   * Used by SMTP transport for all email types.
   */
  private static getEmailMediaAttachments(): any[] {
    const attachments: any[] = [];
    
    // Always try to provide logo attachment (returns null in Graph API mode where base64 is used)
    const logoAttachment = this.getLogoAttachment();
    if (logoAttachment) {
      attachments.push(logoAttachment);
      console.log('📎 Logo attachment added');
    }
    
    // Social icons are now embedded as base64 data URIs in the HTML, no attachments needed
    console.log('📎 Social icons: Embedded as data URIs (no attachments)');
    console.log('📎 Total attachments for email:', attachments.length);
    
    return attachments;
  }

  // Get LinkedIn and YouTube icons as inline attachments (CID approach - SVG format for smaller size and perfect scaling)
  private static getSocialIconAttachments(): Array<{ filename: string; path: string; cid: string }> {
    const attachments: Array<{ filename: string; path: string; cid: string }> = [];
    const imagesDir = path.join(__dirname, '../../public/images');
    
    console.log('🔍 Looking for social icon SVGs in:', imagesDir);
    
    const linkedinPath = path.join(imagesDir, 'icons8-linkedin.svg');
    const youtubePath = path.join(imagesDir, 'icons8-youtube.svg');
    
    if (fs.existsSync(linkedinPath)) {
      console.log('✅ LinkedIn SVG found:', linkedinPath);
      attachments.push({ filename: 'icons8-linkedin.svg', path: linkedinPath, cid: 'linkedin-icon' });
    } else {
      console.log('❌ LinkedIn SVG NOT found:', linkedinPath);
    }
    
    if (fs.existsSync(youtubePath)) {
      console.log('✅ YouTube SVG found:', youtubePath);
      attachments.push({ filename: 'icons8-youtube.svg', path: youtubePath, cid: 'youtube-icon' });
    } else {
      console.log('❌ YouTube SVG NOT found:', youtubePath);
    }
    
    console.log('📎 Total social icon attachments:', attachments.length);
    
    return attachments;
  }

  /**
   * Get all email media as Mailjet inline attachments (logo only).
   * Used by Mailjet REST API transport for all email types.
   * Social icons are now embedded as data URIs in the HTML instead of attachments.
   */
  private static getEmailMediaMailjetInline(): Array<{ ContentType: string; Filename: string; Base64Content: string; ContentID: string }> {
    const inlined: Array<{ ContentType: string; Filename: string; Base64Content: string; ContentID: string }> = [];
    
    const logoInline = this.getLogoMailjetInline();
    if (logoInline) {
      inlined.push(logoInline);
      console.log('🖼️  Mailjet: Logo inline attachment added');
    }
    
    // Social icons are now embedded as data URIs - no attachments needed
    console.log('🖼️  Mailjet: Social icons embedded as data URIs');
    
    return inlined;
  }

  // Get social icons as Mailjet inline attachments (for REST API path - SVG format)
  private static getSocialIconsMailjetInline(): Array<{ ContentType: string; Filename: string; Base64Content: string; ContentID: string }> {
    const inlined: Array<{ ContentType: string; Filename: string; Base64Content: string; ContentID: string }> = [];
    const imagesDir = path.join(__dirname, '../../public/images');
    
    const linkedinPath = path.join(imagesDir, 'icons8-linkedin.svg');
    const youtubePath = path.join(imagesDir, 'icons8-youtube.svg');
    
    try {
      if (fs.existsSync(linkedinPath)) {
        const b64 = fs.readFileSync(linkedinPath).toString('base64');
        inlined.push({
          ContentType: 'image/svg+xml',
          Filename: 'icons8-linkedin.svg',
          Base64Content: b64,
          ContentID: 'linkedin-icon'
        });
      }
      if (fs.existsSync(youtubePath)) {
        const b64 = fs.readFileSync(youtubePath).toString('base64');
        inlined.push({
          ContentType: 'image/svg+xml',
          Filename: 'icons8-youtube.svg',
          Base64Content: b64,
          ContentID: 'youtube-icon'
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not load social icons as inline attachments:', error);
    }
    
    return inlined;
  }

  // Get standardized email footer HTML
  // Get LinkedIn icon as HTTPS URL — PNG format for broadest email client support
  // SVG is NOT supported in Outlook Classic (desktop) on Mac/Windows, causing broken icon display.
  // CRITICAL: For emails, ALWAYS use the public domain, never localhost
  private static getLinkedInIconUrl(): string {
    // Use EMAIL_FRONTEND_URL for emails (always public domain), never FRONTEND_URL (local dev)
    const emailFrontendUrl = (process.env.EMAIL_FRONTEND_URL || 'https://tms.polwel.org.sg').replace(/\/$/, '');
    return emailFrontendUrl + '/images/icons8-linkedin-50.png';
  }

  // Get YouTube icon as HTTPS URL — PNG format for broadest email client support
  // SVG is NOT supported in Outlook Classic (desktop) on Mac/Windows, causing broken icon display.
  // CRITICAL: For emails, ALWAYS use the public domain, never localhost
  private static getYouTubeIconUrl(): string {
    // Use EMAIL_FRONTEND_URL for emails (always public domain), never FRONTEND_URL (local dev)
    const emailFrontendUrl = (process.env.EMAIL_FRONTEND_URL || 'https://tms.polwel.org.sg').replace(/\/$/, '');
    return emailFrontendUrl + '/images/icons8-youtube-50.png';
  }

  // Get QR code image source.
  // Returns an HTTPS URL to the QR code image from the public domain.
  // Gmail and other email clients strip data: URIs from img src, so we must use a public HTTPS URL.
  // The QR code file is served from /public/images/qr-polwel-go-course.jpg on the frontend server.
  private static getQrCodeSrc(): string {
    // Use EMAIL_FRONTEND_URL for email (external access), fallback to https://tms.polwel.org.sg if not set
    const baseUrl = (process.env.EMAIL_FRONTEND_URL || 'https://tms.polwel.org.sg').replace(/\/$/, '');
    const qrImageUrl = `${baseUrl}/images/qr-polwel-go-course.jpg`;
    console.log(`✓ QR Code URL: ${qrImageUrl}`);
    return qrImageUrl;
  }

  private static getEmailFooter(): string {
    // Use HTTPS URLs for social icons - works reliably with Mailjet SMTP and all email clients
    const linkedinIconSrc = this.getLinkedInIconUrl();
    const youtubeIconSrc = this.getYouTubeIconUrl();
    
    console.log('📧 FOOTER GENERATION START');
    console.log('   LinkedIn URL:', linkedinIconSrc);
    console.log('   YouTube URL:', youtubeIconSrc);
    
    // Build footer with direct string concatenation to avoid template issues
    let footer = '<tr><td style="padding: 32px 28px; background-color: #ffffff; border-top: 2px solid #e5e7eb;" bgcolor="#ffffff">';
    footer += '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">';
    
    // Regards
    footer += '<tr><td style="padding-bottom: 8px;"><p style="margin: 0; font-size: 14px; color: #1f2937 !important; font-family: Arial, sans-serif;">Regards,</p></td></tr>';
    
    // Organization Name
    footer += '<tr><td style="padding-bottom: 2px;"><p style="margin: 0; font-size: 13px; font-weight: 600; color: #1f2937 !important; font-family: Arial, sans-serif;">Professional Development &amp; Career Services Division</p></td></tr>';
    
    footer += '<tr><td style="padding-bottom: 12px;"><p style="margin: 0; font-size: 13px; color: #1f2937 !important; font-family: Arial, sans-serif;">POLWEL Co-operative Society Limited</p></td></tr>';
    
    // Contact Info
    footer += '<tr><td style="padding-bottom: 12px;"><p style="margin: 0; font-size: 12px; color: #374151 !important; line-height: 1.6; font-family: Arial, sans-serif;">Main: (65) 6235 6428 (Option 4) |&#160;<a href="https://www.polwel.org.sg" style="color: #374151 !important; text-decoration: underline;">www.polwel.org.sg</a>&#160;|&#160;<span style="color: #374151 !important; font-weight: 600;">#POLWEL</span><span style="color: #2bc425 !important; font-weight: 600;">Cares</span></p></td></tr>';
    
    // Social Media & HRPI with icon images
    footer += '<tr><td style="padding-bottom: 16px;"><p style="margin: 0; font-size: 12px; color: #f97316 !important; font-family: Arial, sans-serif; font-style: italic; line-height: 2;">';
    footer += 'Stay connected with POLWEL on&#160;';
    footer += '<a href="https://www.linkedin.com/company/polwelco-op/" target="_blank" style="display: inline-block; text-decoration: none; vertical-align: middle;">';
    footer += '<img src="' + linkedinIconSrc + '" alt="LinkedIn" width="20" height="20" style="display: inline-block; vertical-align: middle; border: 0; margin-bottom : 9px;" />';
    footer += '</a>&#160;';
    footer += '<a href="https://www.youtube.com/@POLWELCo-Op" target="_blank" style="display: inline-block; text-decoration: none; vertical-align: middle;">';
    footer += '<img src="' + youtubeIconSrc + '" alt="YouTube" width="20" height="20" style="display: inline-block; vertical-align: middle; border: 0; margin-bottom : 6px;" />';
    footer += '</a>&#160;and view our professional development courses on HRPI';
    footer += '</p></td></tr>';
    
    // Warning
    footer += '<tr><td style="padding: 16px 0 0 0; border-top: 1px solid #e5e7eb;">';
    footer += '<p style="margin: 0; font-size: 10px; color: #1f2937 !important; font-family: Arial, sans-serif; line-height: 1.5;">';
    footer += '<strong style="font-weight: 700;">WARNING:</strong> Privileged and/or confidential information may be contained in this email. If you are not the intended addressee, you are hereby notified that you have received this transmittal in error and you must not review, copy, distribute or take any action in reliance on the information contained herein. Please notify the sender immediately if you receive this in error and immediately delete this message and all its attachments.';
    footer += '</p></td></tr>';
    
    footer += '</table></td></tr>';
    
    console.log('📧 FOOTER GENERATION END');
    console.log('   Footer HTML length:', footer.length);
    console.log('   Contains LinkedIn URL:', footer.includes(linkedinIconSrc) ? '✅' : '❌');
    console.log('   Contains YouTube URL:', footer.includes(youtubeIconSrc) ? '✅' : '❌');
    
    return footer;
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
      if (this.isGraphApiMode()) {
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

  /**
   * Returns the EMAIL_PROVIDERS string for the currently active transport.
   * Used to populate the `provider` column in email_logs.
   */
  private static getProviderName(): string {
    if (this.isGraphApiMode()) return EMAIL_PROVIDERS.GRAPH_API;
    if (this.isMailjetSmtp())   return EMAIL_PROVIDERS.MAILJET;
    if (!this.transporter)      return EMAIL_PROVIDERS.NONE;
    return EMAIL_PROVIDERS.SMTP;
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async sendTrainerSetupEmail(
    email: string,
    name: string,
    setupUrl: string,
    _ctx?: RetryContext,
  ): Promise<boolean> {
  const transporter = this.getTransporter();
  const logoSrc = this.getLogoSrc();

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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f3f4f6;" bgcolor="#f3f4f6">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
      attachments: this.getEmailMediaAttachments(),
    };
    
    // Log the content to verify footer is in final HTML
    console.log('📧 FINAL EMAIL HTML CHECK:');
    console.log('   Contains footer comment:', mailOptions.html.includes('<!-- Footer -->'));
    console.log('   Contains LinkedIn img:', mailOptions.html.includes('linkedin'));
    console.log('   Contains YouTube img:', mailOptions.html.includes('youtube'));
    
    // Check footer section in final HTML
    const footerStart = mailOptions.html.indexOf('<!-- Footer -->');
    if (footerStart > 0) {
      const footerContent = mailOptions.html.substring(footerStart, Math.min(footerStart + 600, mailOptions.html.length));
      console.log('📧 Footer section (first 600 chars):\n', footerContent);
    }

    // Create the log ONCE before send attempt (fixes double-log bug)
    const _trainerSetupLogId = await createEmailLog({
      emailType: EMAIL_TYPES.TRAINER_SETUP,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (transporter) {
        console.log('📨 Attempting to send trainer setup email via transporter');
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Trainer setup email sent to ${email}`);
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        await markEmailSent(_trainerSetupLogId, info.messageId, 1, {
          smtpResponse: info.response,
        }).catch(() => {});
        return true;
      } else {
        console.log('=== TRAINER SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        await markEmailSent(_trainerSetupLogId, undefined, 1).catch(() => {});
        return true;
      }
    } catch (error) {
      const _errMsg = error instanceof Error ? error.message : String(error);
      await markEmailFailed(_trainerSetupLogId, _errMsg, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('❌ CRITICAL: Failed to send trainer setup email');
      console.error('   Recipient:', email);
      console.error('   Error Type:', error?.constructor?.name);
      console.error('   Error Message:', _errMsg);
      if ((error as any)?.code)     console.error('   Error Code:',     (error as any).code);
      if ((error as any)?.response) console.error('   SMTP Response:',  (error as any).response);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.TRAINER_SETUP,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, setupUrl }),
        }).catch(() => {});
      }
      return false;
    }
  }

  static async sendCoordinatorSetupEmail(
    email: string,
    name: string,
    setupUrl: string,
    organizationName: string,
    _ctx?: RetryContext,
  ): Promise<boolean> {
    // Controlled by env var ENABLE_TC_ONBOARDING_EMAIL.
    // Set to 'true' to re-enable; any other value (or absent) keeps it disabled.
    if (process.env.ENABLE_TC_ONBOARDING_EMAIL !== 'true') {
      console.log(`[EmailService] TC onboarding email skipped (ENABLE_TC_ONBOARDING_EMAIL != true) for: ${email}`);
      return true;
    }

    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();

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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f3f4f6;" bgcolor="#f3f4f6">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                      <td style="padding: 24px 28px 30px; text-align: center; background-color: #f3f4f6;" bgcolor="#f3f4f6">
                        <p style="margin: 0; font-size: 12px; color: #6b7280 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management System. All rights reserved.</p>
                        <p style="margin: 18px 0 0 0; font-size: 12px; color: #6b7280 !important; font-family: Arial, sans-serif;">Need help? Email <a href="mailto:pdcs@polwel.org.sg" style="color: #2563eb !important; text-decoration: none;">pdcs@polwel.org.sg</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: this.getEmailMediaAttachments(),
    };
    const _coordLogId = await createEmailLog({
      emailType: EMAIL_TYPES.COORDINATOR_SETUP,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);
    try {
      if (transporter) {
        const _cInfo = await transporter.sendMail(mailOptions);
        console.log(`Coordinator setup email sent to ${email}`);
        await markEmailSent(_coordLogId, _cInfo?.messageId, 1, {
          smtpResponse: _cInfo?.response,
        }).catch(() => {});
        return true;
      } else {
        console.log('=== COORDINATOR SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Organization: ${organizationName}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        await markEmailSent(_coordLogId, undefined, 1).catch(() => {});
        return true;
      }
    } catch (error) {
      const _cErr = error instanceof Error ? error.message : String(error);
      await markEmailFailed(_coordLogId, _cErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Error sending coordinator setup email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.COORDINATOR_SETUP,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, setupUrl, organizationName }),
        }).catch(() => {});
      }
      return false;
    }
  }

  static async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
    _ctx?: RetryContext,
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();

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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f3f4f6;" bgcolor="#f3f4f6">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                      <td style="padding: 24px 28px 30px; text-align: center; background-color: #f3f4f6;" bgcolor="#f3f4f6">
                        <p style="margin: 0; font-size: 12px; color: #6b7280 !important; font-family: Arial, sans-serif;">&copy; ${new Date().getFullYear()} POLWEL Training Management System. All rights reserved.</p>
                        <p style="margin: 18px 0 0 0; font-size: 12px; color: #6b7280 !important; font-family: Arial, sans-serif;">Need help? Email <a href="mailto:${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}" style="color: #2563eb !important; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'pdcs@polwel.org.sg'}</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: this.getEmailMediaAttachments(),
    };
    const _pwLogId = await createEmailLog({
      emailType: EMAIL_TYPES.PASSWORD_RESET,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);
    try {
      if (transporter) {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}. Message ID: ${result.messageId}`);
        await markEmailSent(_pwLogId, result.messageId, 1, { smtpResponse: result.response }).catch(() => {});
        return true;
      } else {
        console.log('=== PASSWORD RESET EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=============================================');
        await markEmailSent(_pwLogId, undefined, 1).catch(() => {});
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await markEmailFailed(_pwLogId, errorMessage, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('❌ Error sending password reset email to', email);
      console.error('Error details:', errorMessage);
      console.error('Full error:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.PASSWORD_RESET,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, resetUrl }),
        }).catch(() => {});
      }
      return false;
    }
  }

  static async sendMfaCodeEmail(
    email: string,
    name: string | null,
    code: string,
    expiresAt: Date,
    _ctx?: RetryContext,
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();

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
                        <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
      attachments: this.getEmailMediaAttachments(),
    };

    const _mfaLogId = await createEmailLog({
      emailType: EMAIL_TYPES.MFA_CODE,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (transporter) {
        const _mInfo = await transporter.sendMail(mailOptions);
        console.log(`MFA code email sent to ${email}`);
        await markEmailSent(_mfaLogId, _mInfo?.messageId, 1, { smtpResponse: _mInfo?.response }).catch(() => {});
        return true;
      } else {
        console.log('=== MFA CODE EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Recipient: ${friendlyName}`);
        console.log(`Code: ${code}`);
        console.log(`Expires At: ${formattedExpiry}`);
        console.log('========================================');
        await markEmailSent(_mfaLogId, undefined, 1).catch(() => {});
        return true;
      }
    } catch (error) {
      const _mfaErr = error instanceof Error ? error.message : String(error);
      await markEmailFailed(_mfaLogId, _mfaErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Error sending MFA code email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.MFA_CODE,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, code, expiresAt }),
        }).catch(() => {});
      }
      return false;
    }
  }

  static async sendUserSetupEmail(
    email: string,
    name: string,
    setupUrl: string,
    _ctx?: RetryContext,
  ): Promise<boolean> {
    // This is an alias for sendPolwelUserSetupEmail for backward compatibility
    return this.sendPolwelUserSetupEmail(email, name, setupUrl, _ctx);
  }

  static async sendPolwelUserSetupEmail(
    email: string,
    name: string,
    setupUrl: string,
    _ctx?: RetryContext,
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();

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
                        <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
      attachments: this.getEmailMediaAttachments(),
    };
    const _polwelLogId = await createEmailLog({
      emailType: EMAIL_TYPES.POLWEL_USER_SETUP,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);
    try {
      if (transporter) {
        const _pInfo = await transporter.sendMail(mailOptions);
        console.log(`POLWEL user setup email sent to ${email}`);
        await markEmailSent(_polwelLogId, _pInfo?.messageId, 1, { smtpResponse: _pInfo?.response }).catch(() => {});
        return true;
      } else {
        console.log('=== POLWEL USER SETUP EMAIL (Development Mode) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Setup URL: ${setupUrl}`);
        console.log('=============================================');
        await markEmailSent(_polwelLogId, undefined, 1).catch(() => {});
        return true;
      }
    } catch (error) {
      const _pErr = error instanceof Error ? error.message : String(error);
      await markEmailFailed(_polwelLogId, _pErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Error sending POLWEL user setup email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.POLWEL_USER_SETUP,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, setupUrl }),
        }).catch(() => {});
      }
      return false;
    }
  }

  /**
   * Same HTML + subject + plain text as trainer/partner assignment email (single source of truth).
   * Pass `logoSrc` from getLogoSrcForWebPreview() for browser iframe preview.
   */
  static buildTrainerAssignmentEmailHtml(
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
    additionalBody?: string | null,
    recipientType?: 'trainer' | 'partner',
    options?: { logoSrc?: string },
  ): { html: string; subject: string; textBody: string } {
    const logoSrc = options?.logoSrc ?? this.getLogoSrc();
    const isPartner = recipientType === 'partner';

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);

    const isSameDay = (d1?: string | null, d2?: string | null): boolean => {
      if (!d1 || !d2) return false;
      return d1.substring(0, 10) === d2.substring(0, 10);
    };

    const formatDate = (d?: string | null) => {
      if (!d) return 'TBD';
      try {
        const dt = new Date(d);
        return new Intl.DateTimeFormat('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Singapore',
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
        const startTime = startDt.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).replace(':', '');
        const endTime = endDt.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).replace(':', '');
        return `${startTime} to ${endTime} hrs`;
      } catch {
        return '0900 to 1700 hrs';
      }
    };

    const textBody = `Dear ${name},\n\nPlease refer to the attached documents and the details below regarding the upcoming course, ${courseRunDetails.course || 'N/A'}, for your organisation's reference.\n\nCourse Run Details:\n- Course: ${courseRunDetails.course || 'N/A'}\n- Day & Date: ${formatDate(courseRunDetails.startDate)}${courseRunDetails.endDate && courseRunDetails.startDate !== courseRunDetails.endDate ? ' to ' + formatDate(courseRunDetails.endDate) : ''}\n- Time: ${formatTime(courseRunDetails.startDate, courseRunDetails.endDate)}\n- Venue: ${courseRunDetails.venue || 'TBD'}${courseRunDetails.venueAddress ? '\n  ' + courseRunDetails.venueAddress : ''}\n\n${additionalBody ? additionalBody + '\n\n' : ''}Thank you.\n\nRegards,\n\nProfessional Development & Career Services Division\nPOLWEL Co-operative Society Limited\nMain: (65) 6235 6428 (Option 4) | www.polwel.org.sg | #POLWELCares\nStay connected with POLWEL on and view our professional development courses on HRP!`;

    const subject = `Training Assignment & Course Confirmation: ${courseRunDetails.serialNumber || courseRunDetails.course || 'POLWEL'}`;

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
      <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f3f4f6" style="background-color: #f3f4f6 !important;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                         

                          <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details :</p>

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
                          
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 16px; background-color: #f9fafb !important; border: 1px solid #e5e7eb;" bgcolor="#f9fafb">
                              <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Additional Information</p>
                                <div style="color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalBody}</div>
                              </td>
                            </tr>
                          </table>
                          ` : ''}

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
    </html>`;

    return { html, subject, textBody };
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
    recipientType?: 'trainer' | 'partner',
    _ctx?: RetryContext,
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    const transporter = this.getTransporter();

    const { html, subject, textBody } = this.buildTrainerAssignmentEmailHtml(
      name,
      courseRunDetails,
      baseFee,
      additionalBody,
      recipientType,
      { logoSrc: this.getLogoSrc() },
    );

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject,
      text: textBody,
      html,
      attachments: this.getEmailMediaAttachments(),
    };

    if (ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0) {
      // mailOptions.cc = ccEmails.join(', ');
      mailOptions.cc = ccEmails;
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

    const _taLogId = await createEmailLog({
      emailType: EMAIL_TYPES.TRAINER_ASSIGNMENT,
      recipient:  email,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(ccEmails && ccEmails.length > 0 ? { cc: ccEmails.join(', ') } : {}),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — trainer assignment email would be:');
        console.log('To:', email, '| Subject:', mailOptions.subject);
        await markEmailFailed(_taLogId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        return { success: false, error: 'SMTP not configured' };
      }

      // Use Mailjet REST API for attachment emails (avoids silent SMTP rejection of large/flagged files)
      const hasCustomAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (hasCustomAttachments && this.isMailjetSmtp()) {
        console.log('🚀 Using Mailjet REST API for trainer email with attachments...');
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
          await markEmailFailed(_taLogId, result.error, undefined, 1, {
            errorCategory: 'MAILJET_ERROR',
            provider: EMAIL_PROVIDERS.MAILJET,
          }).catch(() => {});
        } else {
          await markEmailSent(_taLogId, result.messageId, 1).catch(() => {});
        }
        return result;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`(EmailService) Trainer assignment email sent to ${email}:`, info?.messageId || info);
      await markEmailSent(_taLogId, info?.messageId, 1, { smtpResponse: info?.response }).catch(() => {});
      return { success: true, info };
    } catch (err) {
      const _taErr = (err as any)?.message || String(err);
      await markEmailFailed(_taLogId, _taErr, (err as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(err),
        errorStack:    extractStack(err),
        errorCategory: classifyError(err),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('(EmailService) Failed to send trainer assignment email:', _taErr || err);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.TRAINER_ASSIGNMENT,
          recipient: email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ email, name, courseRunDetails, baseFee, ccEmails, additionalBody, attachments, recipientType }),
        }).catch(() => {});
      }
      return { success: false, error: _taErr };
    }
  }

  /**
   * Builds the same HTML + subject as the learner course confirmation email (single source of truth).
   * Use `logoSrc` override for browser preview (e.g. base64 via getLogoSrcForWebPreview); sending uses getLogoSrc().
   */
  static buildLearnerCourseConfirmationEmailHtml(
    params: {
      courseTitle: string;
      courseCode?: string;
      serialNumber?: string;
      startDate?: Date;
      endDate?: Date;
      venueName?: string;
      venueAddress?: string;
      specifiedLocation?: string;
      additionalNotes?: string;
      courseDuration?: string | null;
      remarks?: string | null;
    },
    options?: { logoSrc?: string },
  ): { html: string; subject: string } {
    const {
      courseTitle,
      startDate,
      endDate,
      venueName,
      venueAddress,
      specifiedLocation,
      additionalNotes,
      courseDuration,
      remarks,
    } = params;

    const logoSrc = options?.logoSrc ?? this.getLogoSrc();

    const isSameDayLocal = (d1?: Date, d2?: Date): boolean => {
      if (!d1 || !d2) return false;
      const opts = { timeZone: 'Asia/Singapore' } as const;
      return d1.toLocaleDateString('en-CA', opts) === d2.toLocaleDateString('en-CA', opts);
    };

    const formatDateWithDay = (date?: Date) => {
      if (!date) return 'To be confirmed';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Singapore',
        }).format(date);
      } catch (error) {
        console.warn('Failed to format date for learner confirmation email:', error);
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
          timeZone: 'Asia/Singapore',
        }).format(date);
      } catch (error) {
        return '';
      }
    };

    const formatDateRangeForSubject = (start?: Date, end?: Date) => {
      if (!start) return '';
      const startStr = formatDateForSubject(start);
      if (!end || isSameDayLocal(start, end)) {
        return startStr;
      }
      const endStr = formatDateForSubject(end);
      return `${startStr} - ${endStr}`;
    };

    const formatTime = (start?: Date, end?: Date) => {
      if (!start || !end) return '0900 to 1700 hrs';
      try {
        const startTime = start.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).replace(':', '');
        const endTime = end.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).replace(':', '');
        const regDate = new Date(start.getTime() - 15 * 60 * 1000);
        const regTime = regDate.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).replace(':', '');
        return `${startTime} to ${endTime} hrs <em>(Registration starts at ${regTime})</em>`;
      } catch (error) {
        return '0900 to 1700 hrs';
      }
    };

    const subjectSuffix = formatDateRangeForSubject(startDate, endDate);
    const subject = `Course Confirmation: ${courseTitle}${subjectSuffix ? ` (${subjectSuffix})` : ''}`;

    const html = `
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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f3f4f6" style="background-color: #f3f4f6 !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                              
                              <p style="margin: 20px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details :</p>
                              
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
                                  <p style="margin: 0 0 8px 0; color: #4b5563 !important; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif !important;">Additional Information</p>
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
                                      Please note that photos and/or videos may be taken by POLWEL staff during the course/workshop for publicity purposes. You can find our <a href="https://polwel.org.sg/privacy-policy/" style="color: #4b5563 !important; text-decoration: none;">Privacy Policy here</a>. All images and/or videos captured will remain the property of POLWEL.
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
      `;

    return { html, subject };
  }

  static async sendLearnerCourseConfirmationEmail(params: {
    /** Single recipient or array of recipients (grouped email). */
    email: string | string[];
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
    /** Optional: log which course run this email belongs to */
    courseRunId?: string;
  }, _ctx?: RetryContext): Promise<boolean> {
    const { email, learnerName, courseTitle, courseCode, serialNumber, startDate, endDate, venueName, venueAddress, specifiedLocation, additionalNotes, cc, attachments, courseDuration, remarks, courseRunId } = params;

    const transporter = this.getTransporter();

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

    const { html, subject } = this.buildLearnerCourseConfirmationEmailHtml(
      {
        courseTitle,
        ...(courseCode !== undefined ? { courseCode } : {}),
        ...(serialNumber !== undefined ? { serialNumber } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(venueName !== undefined ? { venueName } : {}),
        ...(venueAddress !== undefined ? { venueAddress } : {}),
        ...(specifiedLocation !== undefined ? { specifiedLocation } : {}),
        ...(additionalNotes !== undefined ? { additionalNotes } : {}),
        ...(courseDuration !== undefined && courseDuration !== null ? { courseDuration } : {}),
        ...(remarks !== undefined && remarks !== null ? { remarks } : {}),
      },
      { logoSrc: this.getLogoSrc() },
    );

    const mailOptions: any = {
      from: this.mailFromAddress,
      to:  email,
      // to: Array.isArray(email) ? email.join(', ') : email,
      subject,
      ...(ccRecipients ? { cc: ccRecipients } : {}),
      html,
      attachments: this.getEmailMediaAttachments(),
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

    const _confLogId = await createEmailLog({
      emailType:   EMAIL_TYPES.COURSE_CONFIRMATION,
      recipient:   Array.isArray(email) ? email.join(', ') : email,
      subject:     mailOptions.subject,
      provider:    this.getProviderName(),
      ...(ccRecipients ? { cc: ccRecipients.join(', ') } : {}),
      ...(params.courseRunId ? { courseRunId: params.courseRunId } : {}),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

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
        await markEmailFailed(_confLogId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        return false;
      }

      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║ 📧 SENDING COURSE CONFIRMATION EMAIL - DETAILED LOG           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('📬 To:', Array.isArray(email) ? email.join(', ') : email, '| Course:', courseTitle);
      console.log('   Subject:', mailOptions.subject);
      if (ccRecipients) console.log('   CC:', ccRecipients.join(', '));
      console.log('   Attachments:', mailOptions.attachments?.length || 0, 'file(s)');

      // ── Mailjet REST API path ──────────────────────────────────────────────
      const hasCustomAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (hasCustomAttachments && this.isMailjetSmtp()) {
        console.log('🚀 Using Mailjet REST API for email with attachments...');
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
          await markEmailFailed(_confLogId, result.error, undefined, 1, {
            errorCategory: 'MAILJET_ERROR',
            provider: EMAIL_PROVIDERS.MAILJET,
          }).catch(() => {});
          return false;
        }
        console.log('✅ Mailjet REST API success. MessageID:', result.messageId);
        await markEmailSent(_confLogId, result.messageId, 1).catch(() => {});
        return true;
      }

      // ── Standard SMTP path ────────────────────────────────────────────────
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
        await markEmailFailed(_confLogId, `Rejected: ${JSON.stringify(info.rejected)}`, 'SMTP_REJECTED', 1, {
          smtpResponse:  info.response,
          errorCategory: 'INVALID_RECIPIENT',
        }).catch(() => {});
        return false;
      }
      await markEmailSent(_confLogId, info.messageId, 1, { smtpResponse: info.response }).catch(() => {});
      return true;
    } catch (error) {
      const _confErr = (error as any)?.message || String(error);
      await markEmailFailed(_confLogId, _confErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('╔════════════════════════════════════════════════════════════════╗');
      console.error('║ ❌ FAILED TO SEND EMAIL - ERROR DETAILS                       ║');
      console.error('╚════════════════════════════════════════════════════════════════╝');
      console.error('Failed to send email to:', email);
      console.error('Error Message:', (error as any)?.message);
      console.error('Error Code:', (error as any)?.code);
      console.error('Error Response:', (error as any)?.response);
      console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('════════════════════════════════════════════════════════════════');
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.COURSE_CONFIRMATION,
          recipient: Array.isArray(email) ? email.join(', ') : email,
          subject:   mailOptions.subject,
          payload:   serializePayload({ ...params }),
          courseRunId: params.courseRunId,
        }).catch(() => {});
      }
      return false;
    }
  }

  static buildCourseCancellationEmailHtml(
    params: {
      learnerName: string;
      courseTitle: string;
      courseCode?: string;
      serialNumber?: string;
      startDate?: Date;
      endDate?: Date;
      venueName?: string;
      cancellationReason?: string;
      nextRunDate?: string | null;
      additionalNotes?: string | null;
      /** When 'trainer', the apology/visit-website/contact-PDCS section is omitted. */
      recipientType?: 'learner' | 'trainer';
    },
    options?: { logoSrc?: string },
  ): { html: string; subject: string } {
    const {
      learnerName,
      courseTitle,
      startDate,
      endDate,
      venueName,
      cancellationReason,
      nextRunDate,
      additionalNotes,
      recipientType,
    } = params;

    const isTrainer = recipientType === 'trainer';
    const logoSrc = options?.logoSrc ?? this.getLogoSrc();

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

    const startDateStr = formatDateForSubject(startDate);
    const endDateStr = formatDateForSubject(endDate);
    const dateRange = startDateStr
      ? (endDateStr && !isSameDay(startDate, endDate) ? `${startDateStr} - ${endDateStr}` : startDateStr)
      : '';
    const subject = `Course Cancellation: ${courseTitle}${dateRange ? ` (${dateRange})` : ''}`;

    const html = `
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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f3f4f6" style="background-color: #f3f4f6 !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                                ${isTrainer
                                  ? 'We regret to inform you that the following course has been cancelled.'
                                  : `We regret to inform you that the following course has been cancelled due to ${cancellationReason || 'unforeseen circumstances'}.`
                                }
                              </p>

                              <p style="margin: 24px 0 12px 0; color: #1f2937 !important; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif !important;">Course details :</p>

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
                                ${
                                  !isTrainer && nextRunDate && String(nextRunDate).trim()
                                    ? `<tr>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; background-color: #f9fafb !important; color: #374151 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Next session</td>
                                  <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;">${String(nextRunDate).trim()}</td>
                                </tr>`
                                    : ''
                                }
                                
                              </table>

                              ${!isTrainer && additionalNotes ? `
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f8fafc !important; border-left: 4px solid #6b7280;" bgcolor="#f8fafc">
                                    <div style="color: #1f2937 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">${additionalNotes}</div>
                                  </td>
                                </tr>
                              </table>` : ''}

                              ${!isTrainer ? `
                              <p style="margin: 24px 0 8px 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We apologize for any inconvenience caused and appreciate your understanding. We hope to see you at our upcoming programmes.
                              </p>
                              <p style="margin: 8px 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                Do visit our website to view our courses - <a href="https://polwel.org.sg/courses/" style="color: #3b82f6 !important; text-decoration: underline; font-family: Arial, sans-serif !important;">Courses | POLWEL Co-operative Society Limited</a>
                              </p>
                              <p style="margin: 8px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                For any queries pertaining to the workshop, please contact PDCS at <a href="mailto:pdcs@polwel.org.sg" style="color: #3b82f6 !important; text-decoration: underline; font-family: Arial, sans-serif !important;">pdcs@polwel.org.sg</a> or call us at 6235 6428 (Option 4).
                              </p>` : ''}
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
      `;

    return { html, subject };
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
    nextRunDate?: string | null;
    additionalNotes?: string | null;
    attachments?: Array<{ path: string; originalName?: string; filename?: string }>;
    /** Optional CC recipients (e.g. Training Coordinators). */
    cc?: string[];
    /** 'trainer' removes the learner-specific apology/website/contact section. */
    recipientType?: 'learner' | 'trainer';
  }, _ctx?: RetryContext): Promise<boolean> {
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
      attachments,
      cc,
      recipientType,
    } = params;

    const transporter = this.getTransporter();

    const { html, subject } = this.buildCourseCancellationEmailHtml(
      {
        learnerName,
        courseTitle,
        ...(courseCode !== undefined ? { courseCode } : {}),
        ...(serialNumber !== undefined ? { serialNumber } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(venueName !== undefined ? { venueName } : {}),
        ...(cancellationReason !== undefined ? { cancellationReason } : {}),
        ...(nextRunDate !== undefined && nextRunDate !== null ? { nextRunDate } : {}),
        ...(additionalNotes !== undefined && additionalNotes !== null ? { additionalNotes } : {}),
        ...(recipientType !== undefined ? { recipientType } : {}),
      },
      { logoSrc: this.getLogoSrc() },
    );

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject,
      html,
      attachments: this.getEmailMediaAttachments(),
      ...(cc && cc.length > 0 ? { cc } : {}),
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          if (fs.existsSync(attachment.path)) {
            const fileBuffer = fs.readFileSync(attachment.path);
            mailOptions.attachments.push({
              filename: attachment.originalName || attachment.filename,
              content: fileBuffer,
            });
          } else {
            console.warn(`(EmailService) Cancellation attachment not found: ${attachment.path}`);
          }
        } catch (fileErr) {
          console.warn('(EmailService) Error adding cancellation attachment:', (fileErr as any)?.message);
        }
      }
    }

    const _cancelLogId = await createEmailLog({
      emailType: EMAIL_TYPES.COURSE_CANCELLATION,
      recipient:  email,
      subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — cancellation email would be sent to:', email);
        await markEmailFailed(_cancelLogId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        return false;
      }

      const hasCustomAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (hasCustomAttachments && this.isMailjetSmtp()) {
        const apiAttachments = (mailOptions.attachments || [])
          .filter((a: any) => Buffer.isBuffer(a.content))
          .map((a: any) => ({
            filename: a.filename,
            content: a.content as Buffer,
            contentType: a.contentType || 'application/octet-stream',
          }));
        const logoInline = this.getLogoMailjetInline();

        const result = await this.sendViaMailjetApi({
          to: email,
          from: this.mailFromAddress,
          subject: mailOptions.subject,
          html: mailOptions.html as string,
          attachments: apiAttachments,
          ...(cc && cc.length > 0 ? { cc } : {}),
          ...(logoInline ? { inlinedAttachments: [logoInline] } : {}),
        });
        if (!result.success) {
          console.error('(EmailService) Mailjet REST failed for cancellation email:', result.error);
          await markEmailFailed(_cancelLogId, result.error, undefined, 1, {
            errorCategory: 'MAILJET_ERROR',
            provider: EMAIL_PROVIDERS.MAILJET,
          }).catch(() => {});
        } else {
          await markEmailSent(_cancelLogId, result.messageId, 1).catch(() => {});
        }
        return result.success;
      }

      const _cancelInfo = await transporter.sendMail(mailOptions);
      await markEmailSent(_cancelLogId, _cancelInfo?.messageId, 1, { smtpResponse: _cancelInfo?.response }).catch(() => {});
      return true;
    } catch (error) {
      const _cancelErr = (error as any)?.message || String(error);
      await markEmailFailed(_cancelLogId, _cancelErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Failed to send course cancellation email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.COURSE_CANCELLATION,
          recipient: email,
          subject,
          payload:   serializePayload({ ...params }),
        }).catch(() => {});
      }
      return false;
    }
  }

  /**
   * Same source of truth used for both sending and browser iframe preview.
   * Pass `logoSrc` option with getLogoSrcForWebPreview() when rendering for preview.
   */
  static buildCourseCompletionEmailHtml(
    params: {
      learnerName: string;
      courseTitle: string;
      courseCode?: string;
      startDate?: Date;
      endDate?: Date;
      trainerName?: string;
      completionDate?: Date;
    },
    options?: { logoSrc?: string },
  ): { html: string; subject: string } {
    const { learnerName, courseTitle, courseCode, startDate, endDate, trainerName } = params;
    const logoSrc = options?.logoSrc ?? this.getLogoSrc();

    const formatDate = (date?: Date) => {
      if (!date) return 'N/A';
      try {
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Singapore',
        }).format(date);
      } catch (error) {
        return date.toISOString();
      }
    };

    const isSameCalendarDay = (a?: Date, b?: Date) => {
      if (!a || !b) return false;
      const SGT = { timeZone: 'Asia/Singapore' };
      return a.toLocaleDateString('en-CA', SGT) === b.toLocaleDateString('en-CA', SGT);
    };

    // Build date string for subject: "19 Mar 2026" or "19 Mar 2026 - 20 Mar 2026"
    const dateStr = startDate
      ? (endDate && !isSameCalendarDay(startDate, endDate)
          ? `${formatDate(startDate)} - ${formatDate(endDate)}`
          : formatDate(startDate))
      : '';

    const subject = dateStr
      ? `Congratulations! Certificate of Completion - ${courseTitle} | ${dateStr}`
      : `Congratulations! Certificate of Completion - ${courseTitle}`;

    const html = `
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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f3f4f6" style="background-color: #f3f4f6 !important;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" bgcolor="#ffffff" style="max-width: 560px; background-color: #ffffff !important;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff !important; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="margin-bottom: 12px; text-align: center;"><img src="${logoSrc}" alt="POLWEL Logo" width="103" height="42" border="0" style="display: block; height: 42px; width: 103px; max-width: 103px; border: 0; outline: none; margin: 0 auto;" /></div>
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
                                  <td style="padding: 12px 16px; ${trainerName ? 'border-bottom: 1px solid #e5e7eb; ' : ''}color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Date:</td>
                                  <td style="padding: 12px 16px; ${trainerName ? 'border-bottom: 1px solid #e5e7eb; ' : ''}color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${formatDate(startDate)}${endDate && !isSameCalendarDay(startDate, endDate) ? ' - ' + formatDate(endDate) : ''}</td>
                                </tr>
                                ${trainerName ? `<tr>
                                  <td style="padding: 12px 16px; color: #6b7280 !important; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">Trainer:</td>
                                  <td style="padding: 12px 16px; color: #1f2937 !important; font-size: 14px; font-family: Arial, sans-serif !important;" bgcolor="#f9fafb">${trainerName}</td>
                                </tr>` : ''}
                              </table>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                                <tr>
                                  <td style="padding: 24px; background-color: #f3f4f6 !important; border: 2px solid #6b7280; text-align: center;" bgcolor="#f3f4f6" align="center">
                                    <div style="font-size: 40px; margin-bottom: 16px;">🏆</div>
                                    <p style="margin: 0 0 8px 0; color: #1f2937 !important; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif !important;">Certificate of Completion</p>
                                    <p style="margin: 0 0 12px 0; color: #525252 !important; font-size: 13px; font-family: Arial, sans-serif !important;">Awarded to: ${learnerName}</p>
                                    <p style="margin: 0; color: #374151 !important; font-size: 13px; font-family: Arial, sans-serif !important; font-style: italic;">Your Certificate is attached to this email as a PDF.</p>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 24px 0 0 0; color: #4b5563 !important; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif !important;">
                                We hope that you found this programme enriching and valuable for your personal and professional development!
                              </p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                  <td style="padding: 16px; background-color: #f8fafc !important; border-left: 4px solid #6b7280; text-align: center;" bgcolor="#f8fafc" align="center">
                                    <p style="margin: 0 0 12px 0; color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important; text-align: center;">
                                      If you are interested to know or register for our other course offerings, please refer to the link &amp; QR code below:
                                    </p>
                                    <!-- Outlook-safe table layout for vertical stacking -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 16px auto 0 auto;">
                                      <tr>
                                        <td align="center" style="padding-bottom: 12px;">
                                          <a href="https://polwel.org.sg/courses/" style="color: #3b82f6 !important; font-size: 14px; text-decoration: underline; font-family: Arial, sans-serif !important;">https://polwel.org.sg/courses/</a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td align="center">
                                          <img src="${this.getQrCodeSrc()}" alt="POLWEL Courses QR Code" width="150" height="150" style="display: block; width: 150px; height: 150px; border: 0;" />
                                        </td>
                                      </tr>
                                    </table>
                                    <p style="margin: 12px 0 0 0; color: #4b5563 !important; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif !important; text-align: center;">
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
    `;

    return { html, subject };
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
    certificatePdfBuffer?: Buffer;
    certificateFilename?: string;
  }, _ctx?: RetryContext): Promise<boolean> {
    const { email, learnerName, certificatePdfBuffer, certificateFilename } = params;

    const transporter = this.getTransporter();

    const { html, subject } = this.buildCourseCompletionEmailHtml(params);

    // Build attachments: SMTP logo media + optional certificate PDF
    const mediaAttachments = this.isGraphApiMode() ? [] : this.getEmailMediaAttachments();
    const allAttachments: any[] = [...mediaAttachments];
    if (certificatePdfBuffer) {
      const safeName = (params.learnerName || 'Learner').replace(/[^a-z0-9]+/gi, '_');
      const pdfFilename = certificateFilename || `Certificate_${safeName}.pdf`;
      allAttachments.push({ filename: pdfFilename, content: certificatePdfBuffer, contentType: 'application/pdf' });
    }

    const mailOptions: any = {
      from: this.mailFromAddress,
      to: email,
      subject,
      headers: {
        'X-Mailjet-TrackClick': '0',
        'X-Mailjet-TrackOpen': '0',
      },
      html,
      attachments: allAttachments,
    };

    const _compLogId = await createEmailLog({
      emailType: EMAIL_TYPES.COURSE_COMPLETION,
      recipient:  email,
      subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (!transporter) {
        console.log('(EmailService) SMTP not configured — completion email would be sent to:', email);
        await markEmailFailed(_compLogId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        return false;
      }

      if (this.isMailjetSmtp()) {
        const inlined = this.isGraphApiMode() ? [] : (this.getLogoMailjetInline() ? [this.getLogoMailjetInline()!] : []);
        const mjAttachments = certificatePdfBuffer
          ? [{ filename: certificateFilename || `Certificate_${(learnerName || 'Learner').replace(/[^a-z0-9]+/gi, '_')}.pdf`, content: certificatePdfBuffer, contentType: 'application/pdf' as const }]
          : undefined;
        const result = await this.sendViaMailjetApi({
          to: email,
          from: this.mailFromAddress,
          subject,
          html,
          inlinedAttachments: inlined,
          ...(mjAttachments ? { attachments: mjAttachments } : {}),
        });
        if (result.success) {
          await markEmailSent(_compLogId, result.messageId, 1).catch(() => {});
        } else {
          await markEmailFailed(_compLogId, result.error, undefined, 1, {
            errorCategory: 'MAILJET_ERROR',
            provider: EMAIL_PROVIDERS.MAILJET,
          }).catch(() => {});
        }
        return result.success;
      }

      const _compInfo = await transporter.sendMail(mailOptions);
      await markEmailSent(_compLogId, _compInfo?.messageId, 1, { smtpResponse: _compInfo?.response }).catch(() => {});
      return true;
    } catch (error) {
      const _compErr = (error as any)?.message || String(error);
      await markEmailFailed(_compLogId, _compErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Failed to send course completion email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.COURSE_COMPLETION,
          recipient: email,
          subject,
          payload:   serializePayload({ ...params }),
        }).catch(() => {});
      }
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
  }, _ctx?: RetryContext): Promise<boolean> {
    const { email, recipientName, courseTitle, courseCode, serialNumber, startDate, endDate } = params;
    const logoSrc = this.getLogoSrc();

    const SGT = { timeZone: 'Asia/Singapore' } as const;
    const formatDateFull = (d: Date) =>
      d.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...SGT });
    const isSameDay = (a: Date, b: Date) => a.toLocaleDateString('en-CA', SGT) === b.toLocaleDateString('en-CA', SGT);
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
        ${footerHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const inlinedAttachments = this.isMailjetSmtp() ? this.getEmailMediaMailjetInline() : [];
    const mailOptions: any = {
      from: `"POLWEL Training" <${this.mailFromAddress}>`,
      to: email,
      subject: `Course Completed: ${courseTitle}`,
      html,
      text: `Dear ${recipientName},\n\nThe course "${courseTitle}" has been completed and billing finalised.\n\nBest regards,\nPOLWEL Training Team`,
    };

    if (!this.isGraphApiMode()) {
      mailOptions.attachments = this.getEmailMediaAttachments();
    }

    const _trainerCompLogId = await createEmailLog({
      emailType: EMAIL_TYPES.TRAINER_COMPLETION,
      recipient:  email,
      subject:    `Course Completed: ${courseTitle}`,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

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
        if (result.success) {
          await markEmailSent(_trainerCompLogId, result.messageId, 1).catch(() => {});
        } else {
          await markEmailFailed(_trainerCompLogId, result.error, undefined, 1, {
            errorCategory: 'MAILJET_ERROR',
            provider: EMAIL_PROVIDERS.MAILJET,
          }).catch(() => {});
        }
        return result.success;
      }
      const t = this.getTransporter();
      if (!t) {
        await markEmailFailed(_trainerCompLogId, 'Email transporter not available', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        throw new Error('Email transporter not available');
      }
      const _tcInfo = await t.sendMail(mailOptions);
      await markEmailSent(_trainerCompLogId, _tcInfo?.messageId, 1, { smtpResponse: _tcInfo?.response }).catch(() => {});
      return true;
    } catch (error) {
      const _tcErr = (error as any)?.message || String(error);
      await markEmailFailed(_trainerCompLogId, _tcErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error('Failed to send trainer course completion email:', error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.TRAINER_COMPLETION,
          recipient: email,
          subject:   `Course Completed: ${courseTitle}`,
          payload:   serializePayload({ ...params }),
        }).catch(() => {});
      }
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
  }, _ctx?: RetryContext): Promise<boolean> {
    const { adminEmail, adminName, courseTitle, courseCode, serialNumber, startDate, endDate, reviewUrl } = params;
    const t = this.getTransporter();
    const logoSrc = this.getLogoSrc();

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const displayCode = serialNumber || courseCode || '—';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="margin:0!important;padding:0!important;background-color:#f3f4f6!important;font-family:Arial,sans-serif!important;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;" bgcolor="#f3f4f6">
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
      attachments: this.getEmailMediaAttachments(),
    };

    const _taApprovalLogId = await createEmailLog({
      emailType: EMAIL_TYPES.TA_APPROVAL,
      recipient:  adminEmail,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    const MAX_ATTEMPTS = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (this.isGraphApiMode()) {
          const t2 = this.getTransporter();
          if (!t2) {
            console.log(`(EmailService) Graph transport unavailable — TA approval notice to ${adminEmail} skipped`);
            await markEmailFailed(_taApprovalLogId, 'Graph transport unavailable', 'NO_TRANSPORTER', attempt, {
              errorCategory: 'CONFIG_ERROR',
              provider: EMAIL_PROVIDERS.NONE,
            }).catch(() => {});
            return false;
          }
          await t2.sendMail(mailOptions);
        } else if (this.isMailjetSmtp()) {
          const result = await this.sendViaMailjetApi({
            to: adminEmail,
            from: this.mailFromAddress,
            subject: mailOptions.subject as string,
            html,
            inlinedAttachments: this.getEmailMediaMailjetInline(),
          });
          if (!result.success) throw new Error(result.error || 'Mailjet send failed');
        } else {
          if (!t) {
            console.log(`(EmailService) SMTP not configured — TA approval notice to ${adminEmail} skipped`);
            await markEmailFailed(_taApprovalLogId, 'SMTP not configured', 'NO_TRANSPORTER', attempt, {
              errorCategory: 'CONFIG_ERROR',
              provider: EMAIL_PROVIDERS.NONE,
            }).catch(() => {});
            return false;
          }
          await t.sendMail(mailOptions);
        }
        console.log(`✅ TA approval notice sent to ${adminEmail} (attempt ${attempt})`);
        await markEmailSent(_taApprovalLogId, undefined, attempt).catch(() => {});
        return true;
      } catch (error) {
        lastError = error;
        const errMsg = (error as any)?.message || String(error);
        console.error(`❌ Failed to send TA approval notice to ${adminEmail} (attempt ${attempt}/${MAX_ATTEMPTS}):`, errMsg);

        if (attempt < MAX_ATTEMPTS) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
          await markEmailRetrying(_taApprovalLogId, attempt, errMsg, {
            provider: this.getProviderName(),
          }).catch(() => {});
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    await markEmailFailed(_taApprovalLogId, lastError?.message || String(lastError), lastError?.code, MAX_ATTEMPTS, {
      smtpResponse:  extractSmtpResponse(lastError),
      errorStack:    extractStack(lastError),
      errorCategory: classifyError(lastError),
      provider:      this.getProviderName(),
    }).catch(() => {});
    if (!_ctx?.retryQueueId) {
      enqueueEmailRetry({
        emailType: EMAIL_TYPES.TA_APPROVAL,
        recipient: adminEmail,
        subject:   mailOptions.subject,
        payload:   serializePayload({ ...params }),
      }).catch(() => {});
    }
    return false;
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
  }, _ctx?: RetryContext): Promise<boolean> {
    const { adminEmail, adminName, learnerName, courseName, serialNumber, submissionDate, reason, waiverRequestUrl } = params;
    const transporter = this.getTransporter();
    const logoSrc = this.getLogoSrc();

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
          <body style="margin: 0 !important; padding: 0 !important; background-color: #f3f4f6 !important; font-family: Arial, sans-serif !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;" bgcolor="#f3f4f6">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff;" bgcolor="#ffffff">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 28px 24px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;" bgcolor="#ffffff" align="center">
                        <div style="text-align: center; margin-bottom: 12px;"><img src="${logoSrc}" alt="POLWEL Logo" width="117" height="48" border="0" style="display: block; height: 48px; width: 117px; max-width: 117px; border: 0; outline: none; margin: 0 auto;" /></div>
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
      attachments: this.getEmailMediaAttachments(),
    };

    const _waiverLogId = await createEmailLog({
      emailType: EMAIL_TYPES.WAIVER_NOTIFICATION,
      recipient:  adminEmail,
      subject:    mailOptions.subject,
      provider:   this.getProviderName(),
      ...(_ctx?.retryQueueId ? { retryQueueId: _ctx.retryQueueId } : {}),
    }).catch(() => null);

    try {
      if (!transporter) {
        console.log(`(EmailService) SMTP not configured — waiver notification to ${adminEmail} skipped`);
        await markEmailFailed(_waiverLogId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
          errorCategory: 'CONFIG_ERROR',
          provider: EMAIL_PROVIDERS.NONE,
        }).catch(() => {});
        return false;
      }
      const _wvInfo = await transporter.sendMail(mailOptions);
      await markEmailSent(_waiverLogId, _wvInfo?.messageId, 1, { smtpResponse: _wvInfo?.response }).catch(() => {});
      console.log(`✅ Waiver notification sent to ${adminEmail}`);
      return true;
    } catch (error) {
      const _wvErr = (error as any)?.message || String(error);
      await markEmailFailed(_waiverLogId, _wvErr, (error as any)?.code, 1, {
        smtpResponse:  extractSmtpResponse(error),
        errorStack:    extractStack(error),
        errorCategory: classifyError(error),
        provider:      this.getProviderName(),
      }).catch(() => {});
      console.error(`❌ Failed to send waiver notification to ${adminEmail}:`, error);
      if (!_ctx?.retryQueueId) {
        enqueueEmailRetry({
          emailType: EMAIL_TYPES.WAIVER_NOTIFICATION,
          recipient: adminEmail,
          subject:   mailOptions.subject,
          payload:   serializePayload({ ...params }),
        }).catch(() => {});
      }
      return false;
    }
  }
}

export default EmailService;