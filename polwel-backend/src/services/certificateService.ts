import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
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

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

function writeCertificateContent(doc: PDFKit.PDFDocument, data: CertificateData): void {
  const centerX = PAGE_WIDTH / 2;
  const durationText = `${data.duration} ${data.durationType}`.trim();

  doc.strokeColor('#1e3a8a').lineWidth(8).rect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60).stroke();
  doc.strokeColor('#1e3a8a').lineWidth(2).rect(40, 40, PAGE_WIDTH - 80, PAGE_HEIGHT - 80).stroke();

  // Try multiple possible paths for the logo
  const possibleLogoPaths = [
    path.join(__dirname, '../../public/images/logoPolwel.png'),
    path.join(process.cwd(), 'public/images/logoPolwel.png'),
    path.join(process.cwd(), '../public/images/logoPolwel.png'),
  ];
  
  const logoPath = possibleLogoPaths.find(p => fs.existsSync(p));
  if (logoPath) {
    doc.image(logoPath, centerX - 45, 65, { width: 90 });
  }

  doc
    .fontSize(38)
    .font('Helvetica-Bold')
    .fillColor('#1e3a8a')
    .text('CERTIFICATE OF PARTICIPATION', 50, 165, { align: 'center', width: PAGE_WIDTH - 100 });

  doc
    .fontSize(17)
    .font('Helvetica')
    .fillColor('#333333')
    .text('Awarded to', 50, 235, { align: 'center', width: PAGE_WIDTH - 100 });

  doc
    .fontSize(34)
    .font('Helvetica-Bold')
    .fillColor('#1e3a8a')
    .text(data.learnerName, 50, 275, { align: 'center', width: PAGE_WIDTH - 100 });

  doc
    .fontSize(15)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`Having successfully completed the ${durationText} course`, 50, 335, {
      align: 'center',
      width: PAGE_WIDTH - 100,
    });

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#1e3a8a')
    .text(data.courseName, 50, 365, { align: 'center', width: PAGE_WIDTH - 100 });

  const formattedEndDate = data.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc
    .fontSize(15)
    .font('Helvetica')
    .fillColor('#333333')
    .text('Completed on', 50, 410, {
      align: 'center',
      width: PAGE_WIDTH - 100,
    });

  doc
    .fontSize(13)
    .font('Helvetica')
    .fillColor('#666666')
    .text(formattedEndDate, 50, 430, {
      align: 'center',
      width: PAGE_WIDTH - 100,
    });

  const signatureY = 465;
  
  // Try multiple possible paths for the signature
  const possibleSignaturePaths = [
    path.join(__dirname, '../../public/images/polwel-signature.png'),
    path.join(process.cwd(), 'public/images/polwel-signature.png'),
    path.join(process.cwd(), '../public/images/polwel-signature.png'),
  ];
  
  const signaturePath = possibleSignaturePaths.find(p => fs.existsSync(p));
  if (signaturePath) {
    doc.image(signaturePath, centerX - 65, signatureY - 10, { width: 130, height: 45 });
  } else {
    doc.moveTo(centerX - 80, signatureY + 20).lineTo(centerX + 80, signatureY + 20).strokeColor('#333333').lineWidth(1.5).stroke();
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Keeve Chan', centerX - 80, signatureY - 5, {
        align: 'center',
        width: 160,
      });
  }

  doc.moveTo(centerX - 100, signatureY + 35).lineTo(centerX + 100, signatureY + 35).strokeColor('#333333').lineWidth(1).stroke();

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#1f2937')
    .text('Keeve Chan', 50, signatureY + 42, { align: 'center', width: PAGE_WIDTH - 100 });

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#4b5563')
    .text('Chief Executive Officer', 50, signatureY + 60, { align: 'center', width: PAGE_WIDTH - 100 });

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#4b5563')
    .text('POLWEL Co-operative Society Limited', 50, signatureY + 75, {
      align: 'center',
      width: PAGE_WIDTH - 100,
    });
}

export async function buildCertificatePDFBuffer(data: CertificateData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);
    doc.on('error', reject);

    doc.pipe(passThrough);
    writeCertificateContent(doc, data);
    doc.end();
  });
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
