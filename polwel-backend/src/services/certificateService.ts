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

// Generate HTML from template
export function generateCertificateHTML(data: CertificateData): string {
  const durationText = `${data.duration} ${data.durationType}`.trim();
  
  const formattedEndDate = data.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

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
    @page {
      size: A4 landscape;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 297mm;
      height: 210mm;
      position: relative;
      font-family: 'Helvetica', 'Arial', sans-serif;
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
      top: 30px;
      left: 30px;
      right: 30px;
      bottom: 30px;
      border: 8px solid #252c63;
      z-index: 1;
    }
    
    .content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 30px 50px;
      z-index: 10;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    
    .logo-icon {
      width: 240px;
      height: auto;
      object-fit: contain;
    }
    
    .main-title {
      font-size: 26pt;
      font-weight: bold;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    
    .awarded-to {
      font-size: 16pt;
      font-weight: normal;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 24px;
    }
    
    .learner-name {
      font-size: 30pt;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 25px;
      text-transform: uppercase;
    }
    
    .course-completion {
      font-size: 16pt;
      font-weight: normal;
      color: #595959;
      text-align: center;
      margin-top: 0;
      margin-bottom: 8px;
    }
    
    .course-name {
      font-size: 26pt;
      font-weight: bold;
      color: #252c63;
      text-align: center;
      margin-top: 0;
      margin-bottom: 25px;
      max-width: 85%;
      line-height: 1.4;
      text-transform: uppercase;
    }
    
    .date {
      font-size: 16pt;
      font-weight: normal;
      color: #595959;
      text-align: center;
      margin-top: 0;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    
    .signature-section {
      margin-top: auto;
      margin-bottom: 20px;
      text-align: center;
      width: 100%;
    }
    
    .signature-image {
      // width: 100px;
      height: 80px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    
    .signature-line {
      width: 480px;
      height: 1px;
      background-color: #252c63;
      margin: 10px auto 6px;
    }
    
    .signature-name {
      font-size: 16pt;
      font-weight: bold;
      color: #252c63;
      margin-top: 0;
      margin-bottom: 8px;
    }
    
    .signature-title {
      font-size: 16pt;
      font-weight: normal;
      color: #595959;
      margin-top: 0;
      margin-bottom: 6px;
    }
    
    .signature-org {
      font-size: 16pt;
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
      
      <div class="course-name">${escapeHtml(data.courseName)}</div>
      
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

export async function buildCertificatePDFBuffer(data: CertificateData): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    const html = generateCertificateHTML(data);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(`Failed to generate certificate PDF: ${error}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function buildCertificatesZipBuffer(certificates: CertificateData[]): Promise<Buffer> {
  return new Promise<Buffer>(async (resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passThrough.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (error) => {
      const maybeError = error as NodeJS.ErrnoException;
      if (maybeError?.code === 'ENOENT') {
        return;
      }
      reject(error as Error);
    });

    const finalizePromise = new Promise<void>((resolveFinalize, rejectFinalize) => {
      passThrough.on('end', resolveFinalize);
      passThrough.on('close', resolveFinalize);
      passThrough.on('error', rejectFinalize);
    });

    archive.pipe(passThrough);

    try {
      for (const certData of certificates) {
        const pdfBuffer = await buildCertificatePDFBuffer(certData);
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
    }
  });
}

export type { CertificateData };
