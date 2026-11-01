import { pgTable, serial, text, timestamp, varchar, integer, bigint } from 'drizzle-orm/pg-core';

// Firebase Auth / Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Print Jobs table (Real-time Cloud SQL synchronization across all customer & owner devices)
export const printJobs = pgTable('print_jobs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  otp: varchar('otp', { length: 16 }).notNull(),
  customerName: text('customer_name').notNull().default('Customer'),
  customerPhone: text('customer_phone'),
  filesJson: text('files_json').notNull(), // JSON string of UploadedFileMeta[]
  settingsJson: text('settings_json').notNull(), // JSON string of CustomerPrintSettings
  pricingJson: text('pricing_json').notNull(), // JSON string of PricingBreakdown
  status: varchar('status', { length: 64 }).notNull().default('pending'),
  paymentStatus: varchar('payment_status', { length: 64 }).notNull().default('unpaid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  printedAt: timestamp('printed_at', { withTimezone: true }),
  notes: text('notes'),
});

// Job files table (allows multi-device preview/download via base64 or stored files)
export const jobFiles = pgTable('job_files', {
  id: varchar('id', { length: 255 }).primaryKey(),
  jobId: varchar('job_id', { length: 255 }).notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  pageCount: integer('page_count').notNull().default(1),
  storedFilename: text('stored_filename').notNull(),
  dataBase64: text('data_base64'),
});

// Shop Settings table
export const shopSettingsTable = pgTable('shop_settings', {
  id: varchar('id', { length: 255 }).primaryKey(),
  dataJson: text('data_json').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
