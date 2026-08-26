import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import numberToWords from '../utils/numberToWords.js';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  reference: string;
  clientName: string;
  clientAddress: string;
  clientGstin?: string;
  clientEmail?: string;
  clientPhone?: string;
  categoryLabel: string;
  amount: number;
}

export function createInvoicePdfStream(data: InvoiceData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // --- Colors ---
      const primaryColor = '#2563EB'; // Blue
      const darkColor = '#1E293B';    // Slate Dark
      const textMuted = '#475569';    // Slate Gray
      const lightBg = '#F8FAFC';      // Light slate

      // --- Header ---
      doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold').text('SHAIK & REDDY ASSOCIATES', 40, 40);
      doc.fillColor(textMuted).fontSize(10).font('Helvetica').text('Chartered Accountants', 40, 65);
      doc.fontSize(9).text('Tax & Financial Advisory Services', 40, 78);

      // Tax Invoice Title
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', 380, 40, { align: 'right' });
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(`Invoice #: ${data.invoiceNumber}`, 380, 65, { align: 'right' });
      doc.font('Helvetica').fillColor(textMuted).text(`Date: ${data.invoiceDate}`, 380, 78, { align: 'right' });

      // Line Separator
      doc.moveTo(40, 100).lineTo(555, 100).strokeColor('#E2E8F0').lineWidth(1.5).stroke();

      // --- Bill To Section ---
      doc.rect(40, 115, 515, 85).fill(lightBg).strokeColor('#E2E8F0').lineWidth(1).stroke();

      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('BILL TO:', 55, 125);
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(data.clientName, 55, 140);
      
      let clientDetailY = 155;
      if (data.clientAddress) {
        doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(data.clientAddress, 55, clientDetailY, { width: 480 });
        clientDetailY += 14;
      }
      if (data.clientGstin) {
        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(`GSTIN: ${data.clientGstin}`, 55, clientDetailY);
      }

      // --- Particulars / Service Reference ---
      const refY = 215;
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text('Particulars / Reference:', 40, refY);
      doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(data.reference || 'Professional Charges', 40, refY + 14);

      // --- Table Header ---
      const tableTop = 250;
      doc.rect(40, tableTop, 515, 25).fill(darkColor);

      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('S.NO', 50, tableTop + 7, { width: 40 });
      doc.text('DESCRIPTION OF SERVICES', 100, tableTop + 7, { width: 330 });
      doc.text('AMOUNT (INR)', 430, tableTop + 7, { width: 110, align: 'right' });

      // --- Table Row ---
      const rowY = tableTop + 35;
      const formattedAmount = `Rs. ${Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      doc.fillColor(darkColor).fontSize(10).font('Helvetica');
      doc.text('1', 50, rowY, { width: 40 });
      doc.font('Helvetica-Bold').text(data.categoryLabel.toUpperCase(), 100, rowY, { width: 330 });
      doc.font('Helvetica').text(formattedAmount, 430, rowY, { width: 110, align: 'right' });

      // Row divider
      doc.moveTo(40, rowY + 30).lineTo(555, rowY + 30).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // --- Total & Words ---
      const totalY = rowY + 45;
      doc.rect(40, totalY, 515, 35).fill(lightBg).strokeColor('#E2E8F0').lineWidth(1).stroke();

      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('TOTAL AMOUNT:', 50, totalY + 10);
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(formattedAmount, 410, totalY + 8, { width: 130, align: 'right' });

      // Amount in Words
      const wordsY = totalY + 45;
      const amountWordsText = numberToWords(data.amount);
      doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold').text('Amount in Words:', 40, wordsY);
      doc.fillColor(darkColor).fontSize(9).font('Helvetica').text(amountWordsText, 130, wordsY);

      // --- Bank Details ---
      const bankY = wordsY + 35;
      doc.rect(40, bankY, 300, 90).fill('#FFFFFF').strokeColor('#CBD5E1').lineWidth(1).stroke();

      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('BANK DETAILS FOR PAYMENT', 50, bankY + 10);
      doc.fillColor(textMuted).fontSize(9).font('Helvetica');
      doc.text(`Bank Name: ${process.env.BANK_NAME || 'HDFC Bank'}`, 50, bankY + 28);
      doc.text(`Account No: ${process.env.BANK_ACCOUNT_NO || '50200012345678'}`, 50, bankY + 42);
      doc.text(`IFSC Code: ${process.env.BANK_IFSC || 'HDFC0001234'}`, 50, bankY + 56);
      doc.text(`Branch: ${process.env.BANK_BRANCH || 'BAHDURPALLY'}`, 50, bankY + 70);

      // --- Signature Block ---
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text('For SHAIK & REDDY ASSOCIATES', 360, bankY + 20, { align: 'right' });
      doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('(Authorized Signatory)', 360, bankY + 70, { align: 'right' });

      // Footer line
      doc.moveTo(40, 800).lineTo(555, 800).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('This is a computer-generated tax invoice and does not require a physical signature.', 40, 808, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateInvoicePdf(data: InvoiceData, outputPath: string): Promise<void> {
  return createInvoicePdfStream(data, outputPath);
}

export async function generateInvoicePdfsBatch(
  batch: { data: InvoiceData; outputPath: string }[]
): Promise<void> {
  for (const item of batch) {
    await createInvoicePdfStream(item.data, item.outputPath);
  }
}
