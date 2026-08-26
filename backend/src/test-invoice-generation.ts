import { prisma } from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target zip file in the conversation's scratch directory
const SCRATCH_ZIP_PATH = 'C:/Users/madte/.gemini/antigravity/brain/b906ead9-53e8-40c6-973b-6407e58e991d/scratch/test-invoices.zip';

async function runTest() {
  console.log('--- STARTING BULK INVOICE GENERATION INTEGRATION TEST ---');
  
  // 1. Log in
  console.log('Attempting login as admin@ca.com...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ca.com', password: 'admin123' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token } = (await loginRes.json()) as any;
  console.log('Login successful! Token acquired.');

  // 2. Trigger Bulk Generate and ZIP
  console.log('Requesting bulk invoice generation and ZIP download...');
  const genRes = await fetch('http://localhost:5000/api/invoices/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}) // all categories
  });

  if (!genRes.ok) {
    throw new Error(`Generation failed: ${genRes.status} ${await genRes.text()}`);
  }

  console.log('Generation request succeeded. Receiving ZIP file stream...');
  const arrayBuffer = await genRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure scratch directory exists
  const scratchDir = path.dirname(SCRATCH_ZIP_PATH);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  fs.writeFileSync(SCRATCH_ZIP_PATH, buffer);
  console.log(`Saved ZIP archive to scratch folder: ${SCRATCH_ZIP_PATH}`);
  console.log(`ZIP file size: ${buffer.length} bytes`);

  // 3. Verify Database Entries
  console.log('Checking database records...');
  const invoices = await prisma.generatedInvoice.findMany({
    orderBy: { invoiceNumber: 'asc' }
  });

  console.log(`Found ${invoices.length} invoices logged in database:`);
  for (const inv of invoices) {
    console.log(`- ${inv.invoiceNumber} | Client: ${inv.clientName} | Amount: ₹${inv.amount} | File: ${inv.pdfPath}`);
    // Assert physical PDF file exists
    const fullPdfPath = path.join(process.cwd(), 'uploads/invoices', inv.pdfPath);
    const fileExists = fs.existsSync(fullPdfPath);
    console.log(`  Physical PDF exists on disk: ${fileExists ? 'YES' : 'NO'} (${fullPdfPath})`);
    if (!fileExists) {
      throw new Error(`Physical PDF missing for ${inv.invoiceNumber}`);
    }
  }

  console.log('\n--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runTest()
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
