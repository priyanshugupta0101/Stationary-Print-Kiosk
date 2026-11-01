import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;
let isPostgresAvailable = false;

export function getPostgresPool(): Pool | null {
  if (pool) return pool;

  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    try {
      pool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      isPostgresAvailable = true;
      return pool;
    } catch (e) {
      console.warn('PostgreSQL initialization failed, using local fallback:', e);
      pool = null;
      isPostgresAvailable = false;
      return null;
    }
  }
  return null;
}

export function isCloudSqlConnected(): boolean {
  return isPostgresAvailable && pool !== null;
}

export async function initPostgresDatabase(): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;

  try {
    const check = await p.query('SELECT count(*) FROM print_jobs');
    console.log('Connected to Cloud SQL PostgreSQL! Active jobs in cloud DB:', check.rows[0].count);
    isPostgresAvailable = true;
    return true;
  } catch (err) {
    console.error('Failed to connect to Cloud SQL PostgreSQL:', err);
    isPostgresAvailable = false;
    return false;
  }
}

export interface PgJobFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  storedFilename: string;
  pageCount: number;
  url: string;
  downloadUrl: string;
  dataBase64?: string;
}

export interface PgPrintJob {
  id: string;
  otp: string;
  customerName: string;
  customerPhone?: string;
  files: PgJobFile[];
  settings: {
    copies: number;
    colorMode: 'bw' | 'color';
    paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
    duplex: 'single' | 'double';
    binding: 'none' | 'staple' | 'spiral';
    estimatedPagesPerDoc: number;
    notes?: string;
  };
  pricing: {
    currency: string;
    baseRatePerPage: number;
    totalPages: number;
    copies: number;
    paperMultiplier: number;
    duplexMultiplier: number;
    bindingFee: number;
    subtotal: number;
    totalPrice: number;
  };
  status: 'pending' | 'received' | 'printed' | 'collected' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
  createdAt: string;
  printedAt?: string;
  notes?: string;
}

// Convert PostgreSQL row + file rows to frontend format
function formatPgJob(jobRow: any, fileRows: any[]): PgPrintJob {
  const files: PgJobFile[] = fileRows.map((f: any) => ({
    id: f.id,
    originalName: f.original_name,
    mimeType: f.mime_type,
    size: Number(f.size || f.size_bytes || 0),
    storedFilename: f.stored_filename || '',
    pageCount: Number(f.page_count || 1),
    url: `/api/files/${f.id}`,
    downloadUrl: `/api/files/${f.id}/download`,
  }));

  const copies = Number(jobRow.copies || 1);
  const paperSize = (jobRow.paper_size || 'A4') as 'A4' | 'A3' | 'Letter' | 'Legal';
  const duplex = (jobRow.duplex || 'single') as 'single' | 'double';
  const binding = (jobRow.binding || 'none') as 'none' | 'staple' | 'spiral';

  return {
    id: jobRow.id,
    otp: String(jobRow.otp),
    customerName: jobRow.customer_name || 'Customer',
    customerPhone: jobRow.customer_phone || '',
    files,
    settings: {
      copies,
      colorMode: jobRow.color_mode === 'color' ? 'color' : 'bw',
      paperSize,
      duplex,
      binding,
      estimatedPagesPerDoc: Number(jobRow.estimated_pages_per_doc || 1),
      notes: jobRow.notes || '',
    },
    pricing: {
      currency: jobRow.currency || '₹',
      baseRatePerPage: Number(jobRow.unit_price || 2),
      totalPages: Number(jobRow.total_pages || 1),
      copies,
      paperMultiplier: paperSize === 'A3' ? 2.0 : 1.0,
      duplexMultiplier: duplex === 'double' ? 0.9 : 1.0,
      bindingFee: Number(jobRow.binding_fee || 0),
      subtotal: Number(jobRow.subtotal || 2),
      totalPrice: Number(jobRow.total_price || 2),
    },
    status: jobRow.status || 'pending',
    paymentStatus: jobRow.payment_status || 'unpaid',
    createdAt: new Date(jobRow.created_at).toISOString(),
    printedAt: jobRow.printed_at ? new Date(jobRow.printed_at).toISOString() : undefined,
    notes: jobRow.notes || '',
  };
}

// Lookup job by OTP (or ID / Phone)
export async function pgLookupJob(otpOrParam: string): Promise<PgPrintJob | null> {
  const p = getPostgresPool();
  if (!p) return null;

  const raw = otpOrParam.trim();
  const cleanOtp = raw.replace(/\D/g, '');
  const searchOtp = cleanOtp || raw;

  const res = await p.query(
    `SELECT * FROM print_jobs 
     WHERE otp = $1 OR TRIM(otp) = $1 OR id = $2 OR customer_phone = $2
     ORDER BY CASE WHEN status = 'pending' THEN 0 WHEN status = 'received' THEN 1 ELSE 2 END, created_at DESC 
     LIMIT 1`,
    [searchOtp, raw]
  );

  if (res.rows.length === 0) return null;

  const jobRow = res.rows[0];
  const fileRes = await p.query('SELECT * FROM job_files WHERE job_id = $1 ORDER BY uploaded_at ASC', [jobRow.id]);

  return formatPgJob(jobRow, fileRes.rows);
}

// Get all jobs
export async function pgGetJobs(status?: string, search?: string): Promise<PgPrintJob[] | null> {
  const p = getPostgresPool();
  if (!p) return null;

  let query = 'SELECT * FROM print_jobs';
  const params: any[] = [];
  const whereClauses: string[] = [];

  if (status && status !== 'all') {
    if (status === 'active') {
      whereClauses.push("status IN ('pending', 'received')");
    } else if (status.includes(',')) {
      const parts = status.split(',').map((s) => s.trim()).filter(Boolean);
      const placeholders = parts.map((_, i) => `$${params.length + i + 1}`).join(',');
      whereClauses.push(`status IN (${placeholders})`);
      params.push(...parts);
    } else {
      params.push(status);
      whereClauses.push(`status = $${params.length}`);
    }
  }

  if (search) {
    const q = `%${search.trim()}%`;
    params.push(q);
    const idx = params.length;
    whereClauses.push(`(otp LIKE $${idx} OR customer_name ILIKE $${idx} OR customer_phone LIKE $${idx})`);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const res = await p.query(query, params);
  if (res.rows.length === 0) return [];

  const jobIds = res.rows.map((r) => r.id);
  const filesRes = await p.query(
    `SELECT * FROM job_files WHERE job_id = ANY($1::varchar[]) ORDER BY uploaded_at ASC`,
    [jobIds]
  );

  const filesByJobId = new Map<string, any[]>();
  for (const f of filesRes.rows) {
    if (!filesByJobId.has(f.job_id)) filesByJobId.set(f.job_id, []);
    filesByJobId.get(f.job_id)!.push(f);
  }

  return res.rows.map((r) => formatPgJob(r, filesByJobId.get(r.id) || []));
}

// Save job into PostgreSQL
export async function pgSaveJob(
  job: PgPrintJob,
  filesWithData: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storedFilename: string;
    pageCount: number;
    dataBase64?: string;
  }>
): Promise<void> {
  const p = getPostgresPool();
  if (!p) return;

  await p.query(
    `INSERT INTO print_jobs (
      id, otp, customer_name, customer_phone, status, payment_status,
      copies, color_mode, paper_size, duplex, binding,
      estimated_pages_per_doc, total_pages, unit_price, subtotal,
      binding_fee, total_price, currency, notes, created_at, printed_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21
    ) ON CONFLICT (id) DO UPDATE SET
      otp = EXCLUDED.otp,
      customer_name = EXCLUDED.customer_name,
      customer_phone = EXCLUDED.customer_phone,
      status = EXCLUDED.status,
      payment_status = EXCLUDED.payment_status,
      printed_at = EXCLUDED.printed_at,
      notes = EXCLUDED.notes`,
    [
      job.id,
      job.otp,
      job.customerName,
      job.customerPhone || '',
      job.status,
      job.paymentStatus,
      job.settings.copies,
      job.settings.colorMode,
      job.settings.paperSize,
      job.settings.duplex,
      job.settings.binding,
      job.settings.estimatedPagesPerDoc,
      job.pricing.totalPages,
      job.pricing.baseRatePerPage,
      job.pricing.subtotal,
      job.pricing.bindingFee,
      job.pricing.totalPrice,
      job.pricing.currency,
      job.notes || '',
      job.createdAt,
      job.printedAt || null,
    ]
  );

  for (const f of filesWithData) {
    await p.query(
      `INSERT INTO job_files (
        id, job_id, original_name, mime_type, size, stored_filename, page_count, data_base64, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        original_name = EXCLUDED.original_name,
        stored_filename = EXCLUDED.stored_filename,
        data_base64 = COALESCE(EXCLUDED.data_base64, job_files.data_base64)`,
      [
        f.id,
        job.id,
        f.originalName,
        f.mimeType,
        f.size,
        f.storedFilename,
        f.pageCount || 1,
        f.dataBase64 || null,
      ]
    );
  }
}

// Update job status
export async function pgUpdateJobStatus(
  id: string,
  updates: { status?: string; paymentStatus?: string; notes?: string }
): Promise<PgPrintJob | null> {
  const p = getPostgresPool();
  if (!p) return null;

  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.status) {
    params.push(updates.status);
    setClauses.push(`status = $${params.length}`);
    if (updates.status === 'printed') {
      setClauses.push('printed_at = NOW()');
    }
  }

  if (updates.paymentStatus) {
    params.push(updates.paymentStatus);
    setClauses.push(`payment_status = $${params.length}`);
  }

  if (updates.notes !== undefined) {
    params.push(updates.notes);
    setClauses.push(`notes = $${params.length}`);
  }

  if (setClauses.length > 0) {
    params.push(id);
    await p.query(`UPDATE print_jobs SET ${setClauses.join(', ')} WHERE id = $${params.length}`, params);
  }

  const jobRes = await p.query('SELECT * FROM print_jobs WHERE id = $1', [id]);
  if (jobRes.rows.length === 0) return null;

  const fileRes = await p.query('SELECT * FROM job_files WHERE job_id = $1', [id]);
  return formatPgJob(jobRes.rows[0], fileRes.rows);
}

// Get file with base64 data for multi-container streaming
export async function pgGetFile(fileId: string): Promise<{
  id: string;
  originalName: string;
  mimeType: string;
  storedFilename: string;
  dataBase64?: string;
} | null> {
  const p = getPostgresPool();
  if (!p) return null;

  const res = await p.query('SELECT * FROM job_files WHERE id = $1', [fileId]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    storedFilename: row.stored_filename,
    dataBase64: row.data_base64 || undefined,
  };
}

// Shop Settings
export async function pgGetSettings(): Promise<any | null> {
  const p = getPostgresPool();
  if (!p) return null;

  try {
    const res = await p.query("SELECT data_json FROM shop_settings WHERE id = 'default'");
    if (res.rows.length > 0 && res.rows[0].data_json) {
      return JSON.parse(res.rows[0].data_json);
    }
  } catch (e) {
    console.warn('pgGetSettings error:', e);
  }
  return null;
}

export async function pgSaveSettings(settings: any): Promise<void> {
  const p = getPostgresPool();
  if (!p) return;

  await p.query(
    `INSERT INTO shop_settings (id, data_json, updated_at) 
     VALUES ('default', $1, NOW()) 
     ON CONFLICT (id) DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
    [JSON.stringify(settings)]
  );
}

// Delete job
export async function pgDeleteJob(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;

  await p.query('DELETE FROM job_files WHERE job_id = $1', [id]);
  await p.query('DELETE FROM print_jobs WHERE id = $1', [id]);
  return true;
}
