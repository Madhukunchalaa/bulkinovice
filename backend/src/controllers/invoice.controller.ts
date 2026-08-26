import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { prisma } from '../config/db.js';
import { allocateSequenceNumbers } from '../services/sequence.service.js';
import { generateInvoicePdfsBatch, InvoiceData } from '../services/pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory is absolute and exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads/invoices');

/**
 * Helper to ensure a string is a safe Windows filename (removes slashes)
 */
function makeSafeFilename(invoiceNumber: string): string {
  return invoiceNumber.replace(/\//g, '-');
}

/**
 * Formats a number with leading zeros
 */
function padNumber(num: number, size: number = 4): string {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

/**
 * Fetch logs of all generated invoices with searching and filtering
 */
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, startDate, endDate, categoryId } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { clientName: { contains: String(search), mode: 'insensitive' } },
        { clientGstin: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.generatedAt = {};
      if (startDate) {
        where.generatedAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.generatedAt.lte = end;
      }
    }

    if (categoryId) {
      const catId = parseInt(String(categoryId));
      if (!isNaN(catId)) {
        where.client = {
          invoiceCategoryId: catId,
        };
      }
    }

    const invoices = await prisma.generatedInvoice.findMany({
      where,
      include: {
        client: {
          include: {
            invoiceCategory: true
          }
        }
      },
      orderBy: { generatedAt: 'desc' },
    });

    res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoice history' });
  }
};

/**
 * Core endpoint: Bulk generate and ZIP invoices for active clients
 */
export const generateInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.body;

    // 1. Fetch matching active clients
    const clientFilter: any = { active: true };
    if (categoryId) {
      const catId = parseInt(categoryId);
      if (!isNaN(catId)) {
        clientFilter.invoiceCategoryId = catId;
      }
    }

    const clients = await prisma.client.findMany({
      where: clientFilter,
      include: {
        invoiceCategory: true,
      },
    });

    if (clients.length === 0) {
      res.status(400).json({ error: 'No active clients found matching the selection.' });
      return;
    }

    // 2. Determine sequence block
    const invoiceDate = new Date();
    const startSequence = await allocateSequenceNumbers(clients.length);

    // Formatted date string for invoice rendering (e.g. 01 Aug 2026)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayStr = String(invoiceDate.getDate()).padStart(2, '0');
    const monthStr = months[invoiceDate.getMonth()];
    const formattedDate = `${dayStr} ${monthStr} ${invoiceDate.getFullYear()}`;

    // Calculate previous month reference text dynamically (e.g. "Professional charges for the month of July 2026")
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const refDate = new Date(invoiceDate);
    refDate.setMonth(refDate.getMonth() - 1);
    const referenceText = `Professional charges for the month of ${fullMonths[refDate.getMonth()]} ${refDate.getFullYear()}`;

    // 3. Prepare generation inputs & DB insert payloads
    const batchInputs: { data: InvoiceData; outputPath: string }[] = [];
    const dbPayloads: any[] = [];

    clients.forEach((client, index) => {
      const sequenceNumber = startSequence + index;
      const invoiceNumber = `INV-${sequenceNumber}`;
      const safeFilename = `${makeSafeFilename(invoiceNumber)}.pdf`;
      const outputPath = path.join(UPLOADS_DIR, safeFilename);

      // Struct for Puppeteer HTML template renderer
      const invoiceData: InvoiceData = {
        invoiceNumber,
        invoiceDate: formattedDate,
        dueDate: formattedDate, // Due date is set as the same date (Due on receipt)
        reference: referenceText,
        clientName: client.name,
        clientAddress: client.address || '',
        clientGstin: client.gstin || undefined,
        clientEmail: client.email || undefined,
        clientPhone: client.phone || undefined,
        categoryLabel: client.itemDescription || client.invoiceCategory.label,
        amount: Number(client.invoiceCategory.amount),
      };

      batchInputs.push({
        data: invoiceData,
        outputPath,
      });

      // Struct for Prisma DB log
      dbPayloads.push({
        clientId: client.id,
        clientName: client.name,
        clientGstin: client.gstin || null,
        clientAddress: client.address || null,
        invoiceNumber,
        amount: client.invoiceCategory.amount,
        generatedAt: invoiceDate,
        pdfPath: safeFilename, // Store relative filename for portability
      });
    });

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 4. Run Puppeteer batch rendering
    console.log(`Starting Puppeteer batch generation of ${batchInputs.length} PDFs...`);
    await generateInvoicePdfsBatch(batchInputs);
    console.log('Batch PDF generation complete.');

    // 5. Save all records in the database in a transaction
    await prisma.$transaction(
      dbPayloads.map((payload) =>
        prisma.generatedInvoice.create({
          data: payload,
        })
      )
    );
    console.log('Invoice records saved to database.');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoices_batch_${Date.now()}.zip`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('ZIP compilation error:', err);
      res.status(500).send({ error: 'Failed to compile ZIP archive' });
    });

    archive.pipe(res);

    batchInputs.forEach((item) => {
      const filename = path.basename(item.outputPath);
      archive.file(item.outputPath, { name: filename });
    });

    await archive.finalize();
    console.log('ZIP response streamed successfully.');

  } catch (error: any) {
    console.error('Invoice generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'An error occurred during invoice generation' });
    }
  }
};

/**
 * Endpoint to download a single PDF invoice by DB record ID
 */
export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const invoice = await prisma.generatedInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice record not found' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, invoice.pdfPath);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Physical PDF file not found on disk' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${invoice.pdfPath}`
    );
    
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
};
