import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'printshop.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: Database | null = null;

const DEFAULT_SETTINGS = {
  shop_name: 'COPY',
  tagline: 'High-Speed Document Printing & Counter Print Desk',
  currency: '₹',
  bw_price_per_page: 2.0,
  color_price_per_page: 10.0,
  a3_multiplier: 2.0,
  duplex_discount_percent: 10.0,
  staple_fee: 5.0,
  spiral_fee: 30.0,
  owner_pin: '',
  contact_phone: '',
  shop_address: '',
  upi_id: '',
};

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize schema with standard relational tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL,
      tagline TEXT,
      currency TEXT NOT NULL DEFAULT '₹',
      bw_price_per_page REAL NOT NULL DEFAULT 2.0,
      color_price_per_page REAL NOT NULL DEFAULT 10.0,
      a3_multiplier REAL NOT NULL DEFAULT 2.0,
      duplex_discount_percent REAL NOT NULL DEFAULT 10.0,
      staple_fee REAL NOT NULL DEFAULT 5.0,
      spiral_fee REAL NOT NULL DEFAULT 30.0,
      owner_pin TEXT NOT NULL DEFAULT '',
      contact_phone TEXT,
      shop_address TEXT,
      upi_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      copies INTEGER NOT NULL DEFAULT 1,
      color_mode TEXT NOT NULL DEFAULT 'bw',
      paper_size TEXT NOT NULL DEFAULT 'A4',
      duplex TEXT NOT NULL DEFAULT 'single',
      binding TEXT NOT NULL DEFAULT 'none',
      orientation TEXT NOT NULL DEFAULT 'portrait',
      scale TEXT NOT NULL DEFAULT 'fit',
      estimated_pages_per_doc INTEGER NOT NULL DEFAULT 1,
      total_pages INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      binding_fee REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT '₹',
      notes TEXT,
      created_at TEXT NOT NULL,
      printed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS job_files (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      stored_filename TEXT NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 1,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES print_jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_print_jobs_otp ON print_jobs(otp);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);
  `);

  try {
    dbInstance.run("ALTER TABLE print_jobs ADD COLUMN orientation TEXT DEFAULT 'portrait'");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE print_jobs ADD COLUMN scale TEXT DEFAULT 'fit'");
  } catch (e) {}

  // Seed default shop settings if none exist
  const existingSettings = dbInstance.exec("SELECT id FROM shop_settings WHERE id = 1");
  if (existingSettings.length === 0 || existingSettings[0].values.length === 0) {
    dbInstance.run(
      `INSERT INTO shop_settings (
        id, shop_name, tagline, currency, bw_price_per_page, color_price_per_page,
        a3_multiplier, duplex_discount_percent, staple_fee, spiral_fee,
        owner_pin, contact_phone, shop_address, upi_id, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        DEFAULT_SETTINGS.shop_name,
        DEFAULT_SETTINGS.tagline,
        DEFAULT_SETTINGS.currency,
        DEFAULT_SETTINGS.bw_price_per_page,
        DEFAULT_SETTINGS.color_price_per_page,
        DEFAULT_SETTINGS.a3_multiplier,
        DEFAULT_SETTINGS.duplex_discount_percent,
        DEFAULT_SETTINGS.staple_fee,
        DEFAULT_SETTINGS.spiral_fee,
        DEFAULT_SETTINGS.owner_pin,
        DEFAULT_SETTINGS.contact_phone,
        DEFAULT_SETTINGS.shop_address,
        DEFAULT_SETTINGS.upi_id,
        new Date().toISOString(),
      ]
    );
  }

  // Import existing jobs from data/print_jobs.json if present
  const JSON_JOBS_FILE = path.join(DATA_DIR, 'print_jobs.json');
  if (fs.existsSync(JSON_JOBS_FILE)) {
    try {
      const raw = fs.readFileSync(JSON_JOBS_FILE, 'utf-8');
      const jsonJobs = JSON.parse(raw);
      if (Array.isArray(jsonJobs)) {
        for (const j of jsonJobs) {
          if (!j.id || !j.otp) continue;
          const check = dbInstance.exec('SELECT id FROM print_jobs WHERE id = ?', [j.id]);
          if (check.length === 0 || check[0].values.length === 0) {
            dbInstance.run(
              `INSERT INTO print_jobs (
                id, otp, customer_name, customer_phone, status, payment_status,
                copies, color_mode, paper_size, duplex, binding,
                estimated_pages_per_doc, total_pages, unit_price, subtotal,
                binding_fee, total_price, currency, notes, created_at, printed_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                j.id,
                String(j.otp),
                j.customerName || 'Customer',
                j.customerPhone || '',
                j.status || 'pending',
                j.paymentStatus || 'unpaid',
                j.settings?.copies || 1,
                j.settings?.colorMode || 'bw',
                j.settings?.paperSize || 'A4',
                j.settings?.duplex || 'single',
                j.settings?.binding || 'none',
                j.settings?.estimatedPagesPerDoc || 1,
                j.pricing?.totalPages || 1,
                j.pricing?.baseRatePerPage || 2,
                j.pricing?.subtotal || 2,
                j.pricing?.bindingFee || 0,
                j.pricing?.totalPrice || 2,
                j.pricing?.currency || '₹',
                j.notes || '',
                j.createdAt || new Date().toISOString(),
                j.printedAt || null,
              ]
            );

            if (Array.isArray(j.files)) {
              for (const f of j.files) {
                dbInstance.run(
                  `INSERT INTO job_files (
                    id, job_id, original_name, mime_type, size_bytes, stored_filename, page_count, uploaded_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    f.id || `file_${Date.now()}`,
                    j.id,
                    f.originalName || 'document',
                    f.mimeType || 'application/octet-stream',
                    f.size || 0,
                    f.storedFilename || '',
                    f.pageCount || 1,
                    j.createdAt || new Date().toISOString(),
                  ]
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not migrate print_jobs.json:', e);
    }
  }

  saveDbToDisk();
  return dbInstance;
}

export function saveDbToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);

    // Also persist a JSON backup for durability across container restarts
    try {
      const jobsResult = dbInstance.exec('SELECT * FROM print_jobs ORDER BY created_at DESC');
      if (jobsResult.length > 0) {
        const cols = jobsResult[0].columns;
        const exportedJobs: any[] = [];
        for (const row of jobsResult[0].values) {
          const jobObj: any = {};
          cols.forEach((col, i) => {
            jobObj[col] = row[i];
          });
          const filesResult = dbInstance.exec('SELECT * FROM job_files WHERE job_id = ?', [jobObj.id]);
          const files: any[] = [];
          if (filesResult.length > 0) {
            const fCols = filesResult[0].columns;
            filesResult[0].values.forEach((fRow) => {
              const fObj: any = {};
              fCols.forEach((fc, idx) => {
                fObj[fc] = fRow[idx];
              });
              files.push({
                id: fObj.id,
                originalName: fObj.original_name,
                mimeType: fObj.mime_type,
                size: Number(fObj.size_bytes),
                storedFilename: fObj.stored_filename,
                pageCount: Number(fObj.page_count),
              });
            });
          }
          exportedJobs.push({
            id: jobObj.id,
            otp: String(jobObj.otp),
            customerName: jobObj.customer_name,
            customerPhone: jobObj.customer_phone,
            files,
            settings: {
              copies: Number(jobObj.copies),
              colorMode: jobObj.color_mode,
              paperSize: jobObj.paper_size,
              duplex: jobObj.duplex,
              binding: jobObj.binding,
              orientation: jobObj.orientation || 'portrait',
              scale: jobObj.scale || 'fit',
              estimatedPagesPerDoc: Number(jobObj.estimated_pages_per_doc),
              notes: jobObj.notes,
            },
            pricing: {
              currency: jobObj.currency,
              baseRatePerPage: Number(jobObj.unit_price),
              totalPages: Number(jobObj.total_pages),
              copies: Number(jobObj.copies),
              bindingFee: Number(jobObj.binding_fee),
              subtotal: Number(jobObj.subtotal),
              totalPrice: Number(jobObj.total_price),
            },
            status: jobObj.status,
            paymentStatus: jobObj.payment_status,
            createdAt: jobObj.created_at,
            printedAt: jobObj.printed_at,
            notes: jobObj.notes,
          });
        }
        const JSON_JOBS_FILE = path.join(DATA_DIR, 'print_jobs.json');
        fs.writeFileSync(JSON_JOBS_FILE, JSON.stringify(exportedJobs, null, 2));
      }
    } catch (jsonErr) {
      // non-blocking
    }
  } catch (err) {
    console.error('Error persisting database to disk:', err);
  }
}

export function getDbFilePath(): string {
  return DB_FILE;
}

export function clearAllDbJobs(): void {
  try {
    if (dbInstance) {
      dbInstance.run('DELETE FROM job_files');
      dbInstance.run('DELETE FROM print_jobs');
      saveDbToDisk();
    }
    const JSON_JOBS_FILE = path.join(DATA_DIR, 'print_jobs.json');
    if (fs.existsSync(JSON_JOBS_FILE)) {
      fs.writeFileSync(JSON_JOBS_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.warn('Error clearing all local DB jobs:', err);
  }
}
