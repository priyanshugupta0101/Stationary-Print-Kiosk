import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { ShopTenant, ShopSettings, PrintJob } from '../src/types.ts';
import { applyTrialCalculations } from './shopsStore.ts';

// Load config from firebase-applet-config.json
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Failed to load firebase-applet-config.json:', e);
}

const app = initializeApp(firebaseConfig);
export const firestoreDb: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || 'ai-studio-stationeryprints-ccfd860d-7fee-47ff-8708-acd7ab43ef59'
);

console.log(
  '🔥 Real Cloud Firestore connected with Database ID:',
  firebaseConfig.firestoreDatabaseId || 'ai-studio-stationeryprints-ccfd860d-7fee-47ff-8708-acd7ab43ef59'
);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;
export type OperationType = (typeof OperationType)[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// In-memory cache for ultra-fast local reads with background cloud synchronization
let cachedFirestoreShops: ShopTenant[] | null = null;
let isInitialized = false;

export function getCachedFirestoreShops(): ShopTenant[] | null {
  return cachedFirestoreShops;
}

export async function initFirestoreData(): Promise<void> {
  if (isInitialized) return;
  try {
    const shopsSnap = await getDocs(collection(firestoreDb, 'shops'));
    const shops: ShopTenant[] = [];
    shopsSnap.forEach((docSnap) => {
      const data = docSnap.data() as ShopTenant;
      shops.push(applyTrialCalculations(data));
    });

    cachedFirestoreShops = shops;
    isInitialized = true;
    console.log(`✅ Loaded ${shops.length} persistent shops from real Firestore database!`);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'shops');
    cachedFirestoreShops = [];
  }
}

// -------------------------------------------------------------
// SHOPS IN FIRESTORE
// -------------------------------------------------------------

export async function getPersistentShops(): Promise<ShopTenant[]> {
  try {
    const shopsSnap = await getDocs(collection(firestoreDb, 'shops'));
    const shops: ShopTenant[] = [];
    shopsSnap.forEach((docSnap) => {
      const data = docSnap.data() as ShopTenant;
      shops.push(applyTrialCalculations(data));
    });

    // Sort by createdAt desc
    shops.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    cachedFirestoreShops = shops;
    return shops;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'shops');
    return cachedFirestoreShops || [];
  }
}

export async function getPersistentShopBySlugOrId(slugOrId: string): Promise<ShopTenant | null> {
  if (!slugOrId) return null;
  const clean = slugOrId.trim().toLowerCase();

  // Try memory cache first for instant sub-millisecond response
  if (cachedFirestoreShops) {
    const found = cachedFirestoreShops.find(
      (s) => s.slug.toLowerCase() === clean || s.id.toLowerCase() === clean
    );
    if (found) return applyTrialCalculations(found);
  }

  try {
    // Direct ID doc get
    const docRef = doc(firestoreDb, 'shops', clean);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return applyTrialCalculations(snap.data() as ShopTenant);
    }

    // Query by slug
    const q = query(collection(firestoreDb, 'shops'), where('slug', '==', clean), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return applyTrialCalculations(querySnap.docs[0].data() as ShopTenant);
    }

    // Comprehensive fallback: scan all persistent shops case-insensitively
    const all = await getPersistentShops();
    const found = all.find(
      (s) =>
        (s.slug && s.slug.toLowerCase() === clean) ||
        (s.id && s.id.toLowerCase() === clean)
    );
    if (found) return applyTrialCalculations(found);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `shops/${clean}`);
  }

  return null;
}

export async function savePersistentShop(shop: ShopTenant): Promise<void> {
  try {
    const cleanShop = applyTrialCalculations(shop);
    const sanitized = JSON.parse(JSON.stringify(cleanShop));
    const docRef = doc(firestoreDb, 'shops', cleanShop.id);
    await setDoc(docRef, sanitized, { merge: true });

    // Update in-memory cache
    if (cachedFirestoreShops) {
      const idx = cachedFirestoreShops.findIndex((s) => s.id === cleanShop.id);
      if (idx >= 0) {
        cachedFirestoreShops[idx] = cleanShop;
      } else {
        cachedFirestoreShops.unshift(cleanShop);
      }
    } else {
      cachedFirestoreShops = [cleanShop];
    }
    console.log(`💾 Saved shop "${cleanShop.name}" (${cleanShop.slug}) permanently to Firestore!`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `shops/${shop.id}`);
  }
}

export async function deletePersistentShop(slugOrId: string): Promise<boolean> {
  try {
    const shop = await getPersistentShopBySlugOrId(slugOrId);
    if (!shop) return false;

    await deleteDoc(doc(firestoreDb, 'shops', shop.id));

    if (cachedFirestoreShops) {
      cachedFirestoreShops = cachedFirestoreShops.filter((s) => s.id !== shop.id && s.slug !== shop.slug);
    }
    console.log(`🗑️ Deleted shop "${shop.name}" from Firestore`);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `shops/${slugOrId}`);
    return false;
  }
}

// -------------------------------------------------------------
// PRINT JOBS IN FIRESTORE
// -------------------------------------------------------------

export async function savePersistentJob(job: any): Promise<void> {
  try {
    const docRef = doc(firestoreDb, 'print_jobs', job.id);
    // Sanitize any undefined fields for clean Firestore write
    const sanitized = JSON.parse(JSON.stringify(job));
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`💾 Saved print order OTP [${job.otp}] (ID: ${job.id}) permanently to Firestore!`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `print_jobs/${job.id}`);
  }
}

export async function lookupPersistentJob(otpOrIdOrPhone: string): Promise<any | null> {
  const clean = otpOrIdOrPhone.trim();
  const numericOnly = clean.replace(/\D/g, '');

  try {
    // 1. Try direct ID lookup
    const directDoc = await getDoc(doc(firestoreDb, 'print_jobs', clean));
    if (directDoc.exists()) {
      return directDoc.data();
    }

    // 2. Query by OTP
    const otpToSearch = numericOnly || clean;
    const qOtp = query(
      collection(firestoreDb, 'print_jobs'),
      where('otp', '==', otpToSearch),
      limit(5)
    );
    const snapOtp = await getDocs(qOtp);
    if (!snapOtp.empty) {
      // Sort active jobs (pending, received) to top, then newest
      const list = snapOtp.docs.map((d) => d.data());
      list.sort((a, b) => {
        const isAActive = a.status === 'pending' || a.status === 'received';
        const isBActive = b.status === 'pending' || b.status === 'received';
        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      return list[0];
    }

    // 3. Query by customerPhone if phone provided
    if (clean.length >= 8) {
      const qPhone = query(
        collection(firestoreDb, 'print_jobs'),
        where('customerPhone', '==', clean),
        limit(5)
      );
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        return snapPhone.docs[0].data();
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `print_jobs/lookup/${clean}`);
  }

  return null;
}

export async function getPersistentJobById(jobId: string): Promise<any | null> {
  try {
    const docRef = doc(firestoreDb, 'print_jobs', jobId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `print_jobs/${jobId}`);
  }
  return null;
}

export async function listPersistentJobs(
  statusFilter?: string,
  searchQuery?: string,
  shopFilter?: string
): Promise<any[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, 'print_jobs'));
    let jobs: any[] = [];
    snap.forEach((d) => {
      jobs.push(d.data());
    });

    // Sort newest first
    jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Filter by shop
    if (shopFilter && shopFilter !== 'all') {
      const cleanShop = shopFilter.trim().toLowerCase();
      jobs = jobs.filter((j) => {
        const sSlug = (j.shopSlug || (j.settings && j.settings.shopSlug) || '').toLowerCase();
        const sId = (j.shopId || (j.settings && j.settings.shopId) || '').toLowerCase();
        return sSlug === cleanShop || sId === cleanShop;
      });
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active') {
        jobs = jobs.filter((j) => j.status === 'pending' || j.status === 'received');
      } else if (statusFilter.includes(',')) {
        const parts = statusFilter.split(',').map((s) => s.trim().toLowerCase());
        jobs = jobs.filter((j) => parts.includes(String(j.status || '').toLowerCase()));
      } else {
        const cleanStatus = statusFilter.trim().toLowerCase();
        jobs = jobs.filter((j) => String(j.status || '').toLowerCase() === cleanStatus);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      jobs = jobs.filter((j) => {
        const nameMatch = (j.customerName || '').toLowerCase().includes(q);
        const otpMatch = String(j.otp || '').includes(q);
        const phoneMatch = (j.customerPhone || '').includes(q);
        const fileMatch =
          j.files && Array.isArray(j.files) && j.files.some((f: any) => (f.originalName || '').toLowerCase().includes(q));
        return nameMatch || otpMatch || phoneMatch || fileMatch;
      });
    }

    return jobs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'print_jobs');
    return [];
  }
}

export async function updatePersistentJobStatus(
  jobId: string,
  updates: { status?: string; paymentStatus?: string; notes?: string; paymentMethod?: string }
): Promise<any | null> {
  const cleanId = String(jobId).trim();
  try {
    let docRef = doc(firestoreDb, 'print_jobs', cleanId);
    let snap = await getDoc(docRef);

    if (!snap.exists()) {
      // 1. Try query by otp
      const qOtp = query(collection(firestoreDb, 'print_jobs'), where('otp', '==', cleanId), limit(1));
      const otpSnap = await getDocs(qOtp);
      if (!otpSnap.empty) {
        docRef = otpSnap.docs[0].ref;
        snap = otpSnap.docs[0];
      } else {
        // 2. Try query by id field
        const qId = query(collection(firestoreDb, 'print_jobs'), where('id', '==', cleanId), limit(1));
        const idSnap = await getDocs(qId);
        if (!idSnap.empty) {
          docRef = idSnap.docs[0].ref;
          snap = idSnap.docs[0];
        } else {
          console.warn(`[Firestore] Job not found for update: "${cleanId}"`);
          return null;
        }
      }
    }

    const current = snap.data();
    const cleanUpdates: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        cleanUpdates[k] = v;
      }
    }

    const updatedData: any = {
      ...current,
      ...cleanUpdates,
    };

    if (cleanUpdates.status === 'printed' && !current.printedAt) {
      updatedData.printedAt = new Date().toISOString();
    }
    if (cleanUpdates.status === 'collected' && !current.collectedAt) {
      updatedData.collectedAt = new Date().toISOString();
    }

    const sanitized = JSON.parse(JSON.stringify(updatedData));
    await setDoc(docRef, sanitized, { merge: true });
    return sanitized;
  } catch (err: any) {
    console.error(`[updatePersistentJobStatus ERROR]`, err);
    handleFirestoreError(err, OperationType.UPDATE, `print_jobs/${cleanId}`);
    return null;
  }
}

export async function getPersistentSuperAdminContact(): Promise<any | null> {
  try {
    const docRef = doc(firestoreDb, 'super_admin_config', 'helpline');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'super_admin_config/helpline');
  }
  return null;
}

export async function savePersistentSuperAdminContact(contact: any): Promise<void> {
  try {
    const docRef = doc(firestoreDb, 'super_admin_config', 'helpline');
    await setDoc(docRef, contact, { merge: true });
    console.log('💾 Saved Super Admin Helpline & Support details to Firestore');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'super_admin_config/helpline');
  }
}

export async function deletePersistentJob(jobId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(firestoreDb, 'print_jobs', jobId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `print_jobs/${jobId}`);
    return false;
  }
}

// -------------------------------------------------------------
// RESET TEST / DEMO DATA (FOR SUPER ADMIN PANEL)
// -------------------------------------------------------------

export interface ResetOptions {
  resetTestJobs?: boolean;
  resetTestShops?: boolean;
  shopSlugOrId?: string; // Optional: Reset only for a specific shop
  resetCountersOnly?: boolean;
}

export interface ResetResult {
  success: boolean;
  deletedJobsCount: number;
  deletedShopsCount: number;
  message: string;
}

export async function resetFirestoreTestData(options: ResetOptions = {}): Promise<ResetResult> {
  const { resetTestJobs = true, resetTestShops = false, shopSlugOrId } = options;
  let deletedJobsCount = 0;
  let deletedShopsCount = 0;

  try {
    // 1. Delete print jobs
    if (resetTestJobs) {
      const jobsSnap = await getDocs(collection(firestoreDb, 'print_jobs'));
      const batch = writeBatch(firestoreDb);
      let batchCount = 0;

      for (const jobDoc of jobsSnap.docs) {
        const data = jobDoc.data();
        let shouldDelete = true;

        if (shopSlugOrId) {
          const sSlug = (data.shopSlug || (data.settings && data.settings.shopSlug) || '').toLowerCase();
          const sId = (data.shopId || (data.settings && data.settings.shopId) || '').toLowerCase();
          const target = shopSlugOrId.toLowerCase();
          shouldDelete = sSlug === target || sId === target;
        }

        if (shouldDelete) {
          batch.delete(jobDoc.ref);
          deletedJobsCount++;
          batchCount++;

          // Commit in batches of 400
          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      // Reset job counters on existing shops
      const shops = await getPersistentShops();
      for (const s of shops) {
        if (!shopSlugOrId || s.id === shopSlugOrId || s.slug === shopSlugOrId) {
          s.totalJobsCount = 0;
          s.totalRevenue = 0;
          await savePersistentShop(s);
        }
      }
    }

    // 2. Delete test shops if requested
    if (resetTestShops) {
      const shopsSnap = await getDocs(collection(firestoreDb, 'shops'));
      for (const sDoc of shopsSnap.docs) {
        const data = sDoc.data();
        // If shopSlugOrId is specified, only delete that one
        if (shopSlugOrId) {
          if (data.id === shopSlugOrId || data.slug === shopSlugOrId) {
            await deleteDoc(sDoc.ref);
            deletedShopsCount++;
          }
        } else {
          // Master reset: delete all testing shops
          await deleteDoc(sDoc.ref);
          deletedShopsCount++;
        }
      }
      cachedFirestoreShops = [];
    }

    const msg = `Successfully reset testing data! Removed ${deletedJobsCount} test orders and ${deletedShopsCount} test shops. Ready for approaching real shops!`;
    console.log(`🧹 ${msg}`);
    return {
      success: true,
      deletedJobsCount,
      deletedShopsCount,
      message: msg,
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.DELETE, 'reset_data');
    return {
      success: false,
      deletedJobsCount,
      deletedShopsCount,
      message: err.message || 'Failed to reset test data in Firestore',
    };
  }
}
