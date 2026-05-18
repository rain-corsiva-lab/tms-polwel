import puppeteer from 'puppeteer';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';

interface CertificateData {
  learnerName: string;
  courseName: string;
  duration: number;
  durationType: string;
  startDate?: Date;
  endDate: Date;
  courseCode?: string;
}

// Helper function to find image paths
function findImagePath(filename: string): string | null {
  const possiblePaths = [
    path.join(__dirname, '../../public/images', filename),
    path.join(process.cwd(), 'public/images', filename),
    path.join(process.cwd(), '../public/images', filename),
  ];
  
  return possiblePaths.find(p => fs.existsSync(p)) || null;
}

// Helper function to convert image to base64
function imageToBase64(imagePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    if (ext === '.gif') mimeType = 'image/gif';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`Error converting image to base64: ${error}`);
    return '';
  }
}

/**
 * Resolve the Chrome/Chromium executable path to use for Puppeteer.
 *
 * Priority:
 *   1. PUPPETEER_EXECUTABLE_PATH env var  (set this on production if needed)
 *   2. Common system Chrome/Chromium paths on Linux
 *   3. undefined → Puppeteer uses its bundled Chrome (may need system libs)
 */
function resolveChromiumExecutablePath(): string | undefined {
  // 1. Explicit override via env var
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`[CertService] Using Chrome from PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Auto-detect from common system paths
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/local/bin/chromium',
    '/snap/bin/chromium',
  ];

  const found = candidates.find(p => {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });

  if (found) {
    console.log(`[CertService] Auto-detected system Chrome: ${found}`);
    return found;
  }

  // 3. Fall back to Puppeteer bundled Chrome
  console.log('[CertService] No system Chrome found, using Puppeteer bundled Chrome');
  return undefined;
}


const regularFontPath = path.join(__dirname, './cert-fonts/calibri.ttf');
const boldFontPath = path.join(__dirname, './cert-fonts/calibrib.ttf');
const bitterFontPath = path.join(__dirname, './cert-fonts/Bitter-Regular.ttf');
const bookAntiquaFontPath = path.join(__dirname, './cert-fonts/bookantiqua.ttf');

let fontRegularBase64 = '';
let fontBoldBase64 = '';
let fontBitterBase64 = '';
let fontBookAntiquaBase64 = '';

try {
  fontRegularBase64 = `data:font/ttf;base64,${fs.readFileSync(regularFontPath).toString('base64')}`;
  fontBoldBase64 = `data:font/ttf;base64,${fs.readFileSync(boldFontPath).toString('base64')}`;
  fontBitterBase64 = `data:font/ttf;base64,${fs.readFileSync(bitterFontPath).toString('base64')}`;
  fontBookAntiquaBase64 = `data:font/ttf;base64,${fs.readFileSync(bookAntiquaFontPath).toString('base64')}`;
} catch (error) {
  console.error("Critical: Could not load font file", error);
}

// Generate HTML from template
export function generateCertificateHTML(data: CertificateData): string {
  // Format duration with hyphen and proper singular/plural form
  // e.g. duration=1 → "1-day" / "1-hour"; duration=2 → "2-days" / "2-hours"
  const durationNum = Number(data.duration);
  // Normalise to the base singular form ("day" or "hour")
  const baseType = data.durationType.toLowerCase().trim().replace(/s$/, '');
  const durationTypeFormatted = durationNum === 1 ? baseType : baseType + 's';

  const durationText = `${data.duration}-${durationTypeFormatted}`.trim();
  
  // Format date — single day: "28 APRIL 2026"; multi-day: "28 APRIL - 29 APRIL 2026"
  const startDateObj = data.startDate instanceof Date ? data.startDate : undefined;
  // Course datetimes are stored as wall-clock UTC; compare UTC calendar components
  const isSameDay = startDateObj &&
    startDateObj.getUTCDate() === data.endDate.getUTCDate() &&
    startDateObj.getUTCMonth() === data.endDate.getUTCMonth() &&
    startDateObj.getUTCFullYear() === data.endDate.getUTCFullYear();
  const formattedEndDate = (startDateObj && !isSameDay)
    ? `${startDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).toUpperCase()} - ${data.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}`
    : data.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();

  const logoPath = findImagePath('cert-logo.png');
  const signaturePath = findImagePath('polwel-signature.png');

  // Convert images to base64 for reliable display
  const logoUrl = logoPath ? imageToBase64(logoPath) : '';
  const signatureUrl = signaturePath ? imageToBase64(signaturePath) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate</title>
  <style>
    @font-face {
      font-family: 'Calibri';
      src: url('${fontRegularBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Calibri';
      src: url('${fontBoldBase64}') format('truetype');
      font-weight: bold;
      font-style: normal;
    }
    @font-face {
      font-family: 'Bitter';
      src: url('${fontBitterBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Book Antiqua';
      src: url('${fontBookAntiquaBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    @page {
      size: Letter landscape;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 11in;
      height: 8.5in;
      position: relative;
      font-family: 'Calibri', 'Arial', sans-serif;
      background: white;
      overflow: hidden;
    }
    
    .certificate-container {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 30px;
    }
    
    .border-outer {
      position: absolute;
      top: 40px;
      left: 50px;
      right: 50px;
      bottom: 40px;
      border: 10px solid #252c63;
      z-index: 1;
    }
    
    .content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 50px;
      z-index: 10;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    
    .logo-icon {
      width: 220px;
      height: auto;
      object-fit: contain;
    }
    
    .main-title {
      font-size: 24pt;
      font-weight: bold;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 10px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    
    .awarded-to {
      font-size: 15pt;
      font-weight: normal;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 0;
    }
    
    .learner-name {
      font-family: 'Book Antiqua', serif;
      font-size: 38pt;
      font-weight: 300;
      color: #252c63;
      text-align: center;
      margin-top: 20px;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    
    .course-completion {
      font-size: 14pt;
      font-weight: normal;
      color: #595959;
      text-align: center;
      margin-top: 0;
      margin-bottom: 0;
    }
    
    .course-name {
      font-size: 22pt;
      font-weight: bold;
      color: #252c63;
      text-align: center;
      margin-top: 25px;
      margin-bottom: 25px;
      max-width: 90%;
      line-height: 1.3;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      // min-height: 80px;
    }
    
    .date {
      font-size: 14pt;
      font-weight: normal;
      color: #595959;
      text-align: center;
      margin-top: 0;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .signature-section {
      margin-top: 10px;
      margin-bottom: 10px;
      text-align: center;
      width: 100%;
    }
    
    .signature-image {
      height: 70px;
      object-fit: contain;
      display: block;
      margin: 0 auto 4px;
    }
    
    .signature-line {
      width: 380px;
      height: 1px;
      background-color: #252c63;
      margin: 6px auto 4px;
    }
    
    .signature-name {
      font-size: 14pt;
      font-weight: bold;
      color: #252c63;
      margin-top: 0;
      margin-bottom: 1px;
    }
    
    .signature-title {
      font-size: 13pt;
      font-weight: normal;
      color: #595959;
      margin-top: 0;
      margin-bottom: 1px;
    }
    
    .signature-org {
      font-size: 13pt;
      font-weight: normal;
      color: #595959;
      margin-top: 0;
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="border-outer"></div>
    
    <div class="content">
      <div class="logo-section">
        ${logoUrl ? `<img src="${logoUrl}" alt="POLWEL Logo" class="logo-icon" />` : ''}
      </div>
      
      <div class="main-title">CERTIFICATE OF PARTICIPATION</div>
      
      <div class="awarded-to">Awarded to</div>
      
      <div class="learner-name">${escapeHtml(data.learnerName)}</div>
      
      <div class="course-completion">
        Having successfully completed the ${escapeHtml(durationText)} course
      </div>
      
      <div class="course-name">${escapeHtml(data.courseName.toUpperCase())}</div>
      
      <div class="date">${escapeHtml(formattedEndDate)}</div>
      
      <div class="signature-section">
        ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" class="signature-image" style="margin-bottom: 8px;" />` : ''}
        <div class="signature-line"></div>
        <div class="signature-name">Keeve Chan</div>
        <div class="signature-title">Chief Executive Officer</div>
        <div class="signature-org">POLWEL Co-operative Society Limited</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// Shared Chrome launch configuration used by both single-PDF and bulk-ZIP functions
function buildLaunchOptions() {
  const executablePath = resolveChromiumExecutablePath();
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-accelerated-2d-canvas',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--no-zygote',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--safebrowsing-disable-auto-update',
  ];
  return { headless: true as const, args, ...(executablePath ? { executablePath } : {}) };
}

// Render one certificate PDF using an already-open browser (no launch/close overhead)
async function renderCertificatePage(browser: Awaited<ReturnType<typeof puppeteer.launch>>, data: CertificateData): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    // The certificate HTML is fully self-contained (all fonts/images are base64-embedded).
    // Use 'domcontentloaded' — 'networkidle0' waits up to 30s for network silence
    // which causes timeouts on production servers with no outbound internet access.
    page.setDefaultNavigationTimeout(120000); // 2 min safety cap
    await page.setContent(generateCertificateHTML(data), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const pdf = await page.pdf({
      format: 'Letter',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function buildCertificatePDFBuffer(data: CertificateData): Promise<Buffer> {
  const browser = await puppeteer.launch(buildLaunchOptions());
  try {
    return await renderCertificatePage(browser, data);
  } catch (error) {
    throw new Error(`Failed to generate certificate PDF: ${error}`);
  } finally {
    await browser.close();
  }
}

export async function buildCertificatesZipBuffer(certificates: CertificateData[]): Promise<Buffer> {
  // Launch Chrome ONCE and reuse for all PDFs — avoids N × browser-launch overhead
  // which would otherwise cause gateway timeouts for classes with many learners.
  const browser = await puppeteer.launch(buildLaunchOptions());

  return new Promise<Buffer>(async (resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passThrough.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (error) => {
      const maybeError = error as NodeJS.ErrnoException;
      if (maybeError?.code !== 'ENOENT') reject(error as Error);
    });

    const finalizePromise = new Promise<void>((resolveFinalize, rejectFinalize) => {
      passThrough.on('end', resolveFinalize);
      passThrough.on('close', resolveFinalize);
      passThrough.on('error', rejectFinalize);
    });

    archive.pipe(passThrough);

    try {
      for (const certData of certificates) {
        const pdfBuffer = await renderCertificatePage(browser, certData);
        const learnerSlug = certData.learnerName.replace(/[^a-z0-9]+/gi, '_') || 'Learner';
        const codeSlug = certData.courseCode?.replace(/[^a-z0-9]+/gi, '_');
        const filename = `Certificate_${learnerSlug}${codeSlug ? `_${codeSlug}` : ''}.pdf`;
        archive.append(pdfBuffer, { name: filename });
      }

      await archive.finalize();
      await finalizePromise;
      resolve(Buffer.concat(chunks));
    } catch (error) {
      reject(error as Error);
    } finally {
      await browser.close();
    }
  });
}

export type { CertificateData };
