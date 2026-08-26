import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with updated schema...');

  // 1. Clean existing records
  await prisma.generatedInvoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.invoiceCategory.deleteMany();
  await prisma.invoiceSequence.deleteMany();
  await prisma.admin.deleteMany();

  // 2. Create Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@ca.com',
      password: hashedPassword,
    },
  });
  console.log(`Seeded admin user: ${admin.email}`);

  // 3. Create Invoice Categories with default descriptions
  const standardCat = await prisma.invoiceCategory.create({
    data: { 
      label: 'Standard', 
      amount: 1000.00,
      defaultItemDescription: 'BOOK KEEPING AND ACCOUNTING SERVICES'
    },
  });
  const premiumCat = await prisma.invoiceCategory.create({
    data: { 
      label: 'Premium', 
      amount: 2500.00,
      defaultItemDescription: 'BOOK KEEPING AND MONTHLY GST FILING'
    },
  });
  const enterpriseCat = await prisma.invoiceCategory.create({
    data: { 
      label: 'Enterprise', 
      amount: 5000.00,
      defaultItemDescription: 'AUDITING AND COMPLIANCE SERVICES'
    },
  });
  console.log('Seeded invoice categories');

  // 4. Create Clients with custom descriptions
  const clientsData = [
    {
      name: 'Shaik Technology Solutions',
      gstin: '37AAAAA1111A1Z1',
      address: 'Plot 42, Sector 2, Tech Park, Visakhapatnam, AP, 530003',
      email: 'finance@shaiktech.com',
      phone: '9876543210',
      invoiceCategoryId: premiumCat.id,
      itemDescription: premiumCat.defaultItemDescription,
      active: true,
    },
    {
      name: 'Reddy Builders & Developers',
      gstin: '36BBBBB2222B2Z2',
      address: 'Suite 101, Reddy Towers, Madhapur, Hyderabad, TS, 500081',
      email: 'billing@reddybuilders.com',
      phone: '8765432109',
      invoiceCategoryId: enterpriseCat.id,
      itemDescription: enterpriseCat.defaultItemDescription,
      active: true,
    },
    {
      name: 'Aditya CA & Consulting Services',
      gstin: '37CCCCC3333C3Z3',
      address: 'Door 10-3-5, Dwarka Nagar, Rajahmundry, AP, 533101',
      email: 'contact@adityaconsulting.com',
      phone: '7654321098',
      invoiceCategoryId: standardCat.id,
      itemDescription: standardCat.defaultItemDescription,
      active: true,
    },
    {
      name: 'Old Inactive Business Ltd',
      gstin: '37DDDDD4444D4Z4',
      address: 'Old Factory Road, Guntur, AP, 522001',
      email: 'info@oldbusiness.com',
      phone: '6543210987',
      invoiceCategoryId: standardCat.id,
      itemDescription: standardCat.defaultItemDescription,
      active: false,
    },
  ];

  for (const client of clientsData) {
    await prisma.client.create({ data: client });
  }
  console.log('Seeded sample clients');

  // 5. Seed single sequential seed number (using STARTING_INVOICE_NUMBER from .env)
  const envSeed = process.env.STARTING_INVOICE_NUMBER;
  const seedValue = envSeed ? parseInt(envSeed, 10) : 112;

  await prisma.invoiceSequence.create({
    data: {
      nextValue: isNaN(seedValue) ? 112 : seedValue,
    }
  });
  console.log(`Seeded invoice sequence starting value: ${seedValue}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
