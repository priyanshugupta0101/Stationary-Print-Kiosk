import fs from 'fs';
import path from 'path';
import {
  savePersistentJob,
  lookupPersistentJob,
  getPersistentJobById as getFirestoreJobById,
  listPersistentJobs,
  updatePersistentJobStatus,
  deletePersistentJob,
  firestoreDb,
} from '../../server/firestoreDb.ts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CloudPrintJob {
  id: string;
  otp: string;
  shopId?: string;
  shopSlug?: string;
  customerName: string;
  customerPhone?: string;
  files: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storedFilename: string;
    pageCount: number;
    url: string;
    downloadUrl: string;
  }>;
  settings: any;
  pricing: any;
  status: 'pending' | 'received' | 'printed' | 'collected' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: string;
  createdAt: string;
  printedAt?: string;
  notes?: string;
}

export const DEFAULT_SHOP_SETTINGS = {
  shopName: 'COPY',
  tagline: 'High-Speed Document Printing & Counter Desk',
  currency: '₹',
  bwPricePerPage: 2,
  colorPricePerPage: 10,
  a3Multiplier: 2.0,
  duplexDiscountPercent: 10,
  stapleFee: 5,
  spiralFee: 30,
  ownerPin: '',
  contactPhone: '',
  contactEmail: '',
  whatsappNumber: '',
  shopAddress: '',
  enableOnlinePayments: false,
  upiId: '',
  upiPayeeName: 'COPY',
};

// 1. Get Shop Settings from Firestore
export async function getShopSettings(): Promise<any> {
  try {
    const docRef = doc(firestoreDb, 'super_admin_config', 'default_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    // Seed default if not existing
    await setDoc(docRef, DEFAULT_SHOP_SETTINGS, { merge: true });
    return DEFAULT_SHOP_SETTINGS;
  } catch (err) {
    console.warn('Failed to get shop settings from Firestore, returning defaults:', err);
    return DEFAULT_SHOP_SETTINGS;
  }
}

// 2. Save Shop Settings to Firestore
export async function updateShopSettings(newSettings: any): Promise<any> {
  const current = await getShopSettings();
  const merged = { ...current, ...newSettings };
  try {
    const docRef = doc(firestoreDb, 'super_admin_config', 'default_settings');
    await setDoc(docRef, merged, { merge: true });
    return merged;
  } catch (err) {
    console.error('Failed to update shop settings in Firestore:', err);
    return merged;
  }
}

// 3. Create Print Job (Saved permanently in Firestore!)
export async function createCloudPrintJob(jobData: {
  id: string;
  otp: string;
  customerName: string;
  customerPhone?: string;
  files: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storedFilename: string;
    pageCount: number;
    filePath?: string;
  }>;
  settings: any;
  pricing: any;
  notes?: string;
}): Promise<CloudPrintJob> {
  const nowIso = new Date().toISOString();

  const storedFilesMeta = jobData.files.map((f) => ({
    id: f.id,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    storedFilename: f.storedFilename,
    pageCount: f.pageCount,
    url: `/api/files/${f.id}`,
    downloadUrl: `/api/files/${f.id}/download`,
  }));

  const cloudJob: CloudPrintJob = {
    id: jobData.id,
    otp: String(jobData.otp),
    shopId: jobData.settings?.shopId,
    shopSlug: jobData.settings?.shopSlug,
    customerName: jobData.customerName || 'Customer',
    customerPhone: jobData.customerPhone || '',
    files: storedFilesMeta,
    settings: jobData.settings,
    pricing: jobData.pricing,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: nowIso,
    notes: jobData.notes || '',
  };

  // Save to Real Firestore Database
  await savePersistentJob(cloudJob);
  return cloudJob;
}

// 4. Lookup Print Job by OTP (Clean 4-digit code, ID, or Phone) from Firestore
export async function lookupCloudPrintJob(target: string): Promise<CloudPrintJob | null> {
  try {
    const job = await lookupPersistentJob(target);
    return job as CloudPrintJob | null;
  } catch (err) {
    console.error('Error looking up job in Firestore:', err);
    return null;
  }
}

// 5. Get Job By ID from Firestore
export async function getCloudPrintJobById(jobId: string): Promise<CloudPrintJob | null> {
  try {
    const job = await getFirestoreJobById(jobId);
    return job as CloudPrintJob | null;
  } catch (err) {
    console.error('Error fetching job by ID in Firestore:', err);
    return null;
  }
}

// 6. List Print Jobs from Firestore (Filters: active, pending, search)
export async function listCloudPrintJobs(
  statusFilter?: string,
  searchQuery?: string
): Promise<CloudPrintJob[]> {
  try {
    const jobs = await listPersistentJobs(statusFilter, searchQuery);
    return jobs as CloudPrintJob[];
  } catch (err) {
    console.error('Error listing jobs from Firestore:', err);
    return [];
  }
}

// 7. Update Job Status / Payment Status in Firestore
export async function updateCloudPrintJobStatus(
  jobId: string,
  updates: { status?: string; paymentStatus?: string; notes?: string; paymentMethod?: string }
): Promise<CloudPrintJob | null> {
  try {
    const updated = await updatePersistentJobStatus(jobId, updates);
    return updated as CloudPrintJob | null;
  } catch (err) {
    console.error('Error updating job status in Firestore:', err);
    return null;
  }
}

// 8. Delete Job from Firestore
export async function deleteCloudPrintJob(jobId: string): Promise<boolean> {
  try {
    return await deletePersistentJob(jobId);
  } catch (err) {
    console.error('Error deleting job from Firestore:', err);
    return false;
  }
}

// 9. Fetch File Record
export async function getCloudFile(fileId: string): Promise<{
  id: string;
  originalName: string;
  mimeType: string;
  storedFilename: string;
  dataBase64?: string | null;
} | null> {
  try {
    const allJobs = await listPersistentJobs();
    for (const j of allJobs) {
      if (j.files && Array.isArray(j.files)) {
        const found = j.files.find((f: any) => f.id === fileId);
        if (found) {
          return {
            id: found.id,
            originalName: found.originalName,
            mimeType: found.mimeType,
            storedFilename: found.storedFilename,
            dataBase64: null,
          };
        }
      }
    }
  } catch (err) {
    console.error('Error fetching file metadata:', err);
  }
  return null;
}
