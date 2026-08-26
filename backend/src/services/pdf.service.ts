import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import numberToWords from '../utils/numberToWords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function resolveAssetPath(filename: string): string {
  const candidates = [
    path.join(process.cwd(), 'src/templates', filename),
    path.join(process.cwd(), 'backend/src/templates', filename),
    path.join(__dirname, '../templates', filename),
    path.join(__dirname, '../../src/templates', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

async function getBrowser() {
  if (process.platform === 'win32') {
    const fullPuppeteer = await import('puppeteer');
    return fullPuppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  const execPath = await chromium.executablePath();
  console.log('[PDF Service] Launching Chromium binary at:', execPath);

  return puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
    defaultViewport: (chromium as any).defaultViewport || null,
    executablePath: execPath,
    headless: (chromium as any).headless ?? true,
  });
}

// Simple template renderer (helper)
function renderTemplate(template: string, data: Record<string, string>): string {
  let rendered = template;
  
  // Handle conditional block: {{#KEY}}...{{/KEY}}
  const conditionalRegex = /\{\{#([A-Z_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  rendered = rendered.replace(conditionalRegex, (match, key, content) => {
    const val = data[key];
    if (val && val.trim() !== '') {
      return content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
    return '';
  });

  // Replace general tags: {{KEY}}
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return rendered;
}

/**
 * Renders HTML for a single invoice data input
 */
function getHtmlForInvoice(data: InvoiceData, templateContent: string): string {
  const formattedAmount = Number(data.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Load CA logo PNG from disk and convert to Base64
  const logoPath = resolveAssetPath('ca_logo.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }

  const templateData = {
    CLIENT_NAME: data.clientName,
    CLIENT_ADDRESS: data.clientAddress || 'N/A',
    CLIENT_GSTIN: data.clientGstin || '',
    CLIENT_EMAIL: data.clientEmail || '',
    CLIENT_PHONE: data.clientPhone || '',
    INVOICE_NUMBER: data.invoiceNumber,
    INVOICE_DATE: data.invoiceDate,
    DUE_DATE: data.dueDate,
    REFERENCE: data.reference,
    CATEGORY_LABEL: data.categoryLabel.toUpperCase(),
    AMOUNT: formattedAmount,
    TOTAL: formattedAmount,
    AMOUNT_WORDS: numberToWords(data.amount),
    CA_LOGO_BASE64: logoBase64,
    BANK_NAME: process.env.BANK_NAME || 'HDFC Bank',
    BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '',
    BANK_IFSC: process.env.BANK_IFSC || '',
    BANK_BRANCH: process.env.BANK_BRANCH || 'BAHDURPALLY'
  };

  return renderTemplate(templateContent, templateData);
}

/**
 * Generates a single PDF invoice (convenience wrapper)
 */
export async function generateInvoicePdf(data: InvoiceData, outputPath: string): Promise<void> {
  const templatePath = resolveAssetPath('invoice.template.html');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const html = getHtmlForInvoice(data, templateContent);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await getBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' as any });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true
    });
  } finally {
    await browser.close();
  }
}

/**
 * Generates a batch of PDF invoices using a single browser instance.
 * Highly optimized for bulk generating dozens or hundreds of invoices.
 */
export async function generateInvoicePdfsBatch(
  batch: { data: InvoiceData; outputPath: string }[]
): Promise<void> {
  if (batch.length === 0) return;

  const templatePath = resolveAssetPath('invoice.template.html');
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Launch browser once
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();

    for (const item of batch) {
      const html = getHtmlForInvoice(item.data, templateContent);

      const dir = path.dirname(item.outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Load HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' as any });
      
      // Print to PDF file
      await page.pdf({
        path: item.outputPath,
        format: 'A4',
        printBackground: true
      });
    }
  } finally {
    await browser.close();
  }
}
