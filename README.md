# Bulk Invoice Generator

A standalone full-stack web application designed for Chartered Accountants (CAs) to billing multiple clients with a small set of fixed monthly invoice amounts. Generates professional PDF invoices and packages them into a single downloadable `.zip` file in one click.

---

## Technical Stack

- **Backend**: Node.js + Express + TypeScript
- **ORM/DB**: PostgreSQL with Prisma ORM
- **PDF Generation**: Puppeteer (Headless rendering of HTML/CSS template to A4 size)
- **Bulk Archiving**: `archiver` streams files directly to ZIP
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Authentication**: JWT-based session with Bcrypt password hashing
- **OS Compatibility**: Windows-friendly (fully compatible with PowerShell)

---

## Directory Structure

```
shaik and reddy/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/          # Database configuration (Prisma wrapper)
│   │   ├── controllers/     # Route logic handlers (Auth, Client, Category, Invoice)
│   │   ├── middleware/      # Authentication validation
│   │   ├── routes/          # REST Endpoint declarations
│   │   ├── services/        # Puppeteer PDF & Atomic sequence allocation
│   │   ├── templates/       # HTML/CSS invoice design file
│   │   ├── utils/           # Number-to-Words Indian system converter
│   │   └── index.ts         # Server boot script
│   ├── prisma/               # Schema, migrations, and seed script
│   └── .env                  # Port, JWT secret, Database URI
├── frontend/                 # React client SPA (scaffolded via Vite)
│   ├── src/
│   │   ├── components/      # Navigation sidebar layout
│   │   ├── context/         # Auth session provider
│   │   ├── pages/           # Client/Category CRUD, Generation view, History audit
│   │   ├── utils/           # Axios-like Fetch wrapper & download handler
│   │   ├── App.tsx          # Router and tab shell
│   │   └── index.css        # Tailwind styles config
│   └── vite.config.ts        # Vite configuration
└── README.md                 # Main Documentation
```

---

## Setup & Running the Application

### 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- **Node.js** (v18+)
- **npm** (v9+)
- **PostgreSQL Database** running on port 5432

### 2. Configure Environment Variables
Copy `.env.example` in `/backend` to `.env`:
```powershell
cp backend/.env.example backend/.env
```
Ensure the `DATABASE_URL` matches your local database settings (the seed script has configured PostgreSQL with the default password `1234`).
```ini
PORT=5000
DATABASE_URL="postgresql://postgres:1234@localhost:5432/bulk_invoice_db?schema=public"
JWT_SECRET="ca-admin-super-secret-key-2026"
JWT_EXPIRES_IN="7d"
```

### 3. Run Database Migrations & Seed
Navigate to the `backend/` directory, run migrations to set up the database tables, and run the seed script to populate default data:
```powershell
cd backend
# Generate client and run database migration
npx prisma migrate dev --name init

# Seed default admin user, pricing categories, and clients
npx prisma db seed
```

**Seeded Admin Account Credentials:**
- **Email**: `admin@ca.com`
- **Password**: `admin123`

### 4. Start Development Servers

To run the application locally, you need to launch both the backend API and the frontend client.

#### Start Backend API
From the `/backend` folder:
```powershell
npm run dev
# Server will run on http://localhost:5000
```

#### Start Frontend Client
Open a second PowerShell window, navigate to `/frontend`, and run:
```powershell
cd frontend
npm run dev
# Client dashboard will run on http://localhost:3000
```
Open **`http://localhost:3000`** in your browser and sign in using the admin credentials!

---

## Non-Functional Architecture Highlights

### 1. Invoice Numbering Concurrency Safety
Invoice numbering follows the Indian CA standard: `INV/{FinancialYear}/{Sequence}` (e.g. `INV/2026-27/0001`). 
- When generating invoices in bulk, numbers are reserved **atomically inside a database transaction** using `InvoiceSequence`.
- This ensures that if another administrator triggers bulk invoice generation concurrently, or if multiple instances of the service run, there are **absolutely zero gaps or collisions** in the invoice sequence.

### 2. Invoice State Preservation
When an invoice is generated, the client's information (Name, GSTIN, Address, and total amount billed) is duplicated directly into a text snapshot in the `GeneratedInvoice` table. This preserves audit trail authenticity: even if the client's record is updated or deactivated later, the generated invoice record remains static and legally sound.
