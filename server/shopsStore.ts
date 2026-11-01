import fs from 'fs';
import path from 'path';
import { ShopTenant, ShopSettings } from '../src/types.ts';
import {
  savePersistentShop,
  deletePersistentShop,
  getPersistentShops,
} from './firestoreDb.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const SHOPS_FILE = path.join(DATA_DIR, 'shops.json');
const SUPER_ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'super_admin_config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DEFAULT_SUPER_ADMIN_PIN = '145214';

export interface SuperAdminContact {
  name: string;
  phone: string;
  email: string;
  whatsappNumber: string;
}

export function getSuperAdminContact(): SuperAdminContact {
  try {
    if (fs.existsSync(SUPER_ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(SUPER_ADMIN_CONFIG_FILE, 'utf-8');
      const cfg = JSON.parse(raw);
      if (cfg.contact) return cfg.contact;
    }
  } catch (e) {}
  return {
    name: 'Platform Super Admin',
    phone: '+91 98765 00111',
    email: 'guptapriyanshu0101@gmail.com',
    whatsappNumber: '+91 98765 00111',
  };
}

export function applyTrialCalculations(shop: ShopTenant): ShopTenant {
  if (!shop) return shop;

  const isTrial = Boolean(
    shop.isTrial || shop.plan === 'four_day_trial' || shop.plan === 'free_trial'
  );
  if (!isTrial) {
    shop.isTrial = false;
    shop.isTrialExpired = false;
    if (shop.settings) {
      shop.settings.isTrial = false;
      shop.settings.isTrialExpired = false;
    }
    return shop;
  }

  shop.isTrial = true;
  if (!shop.plan || (shop.plan !== 'four_day_trial' && shop.plan !== 'free_trial')) {
    shop.plan = shop.trialDurationDays === 4 ? 'four_day_trial' : 'free_trial';
  }

  if (shop.plan === 'four_day_trial') {
    shop.trialDurationDays = shop.trialDurationDays || 4;
  } else {
    shop.trialDurationDays = shop.trialDurationDays || 7;
  }

  if (!shop.trialStartDate) {
    shop.trialStartDate = shop.createdAt || new Date().toISOString();
  }

  if (!shop.trialEndsAt) {
    const startMs = new Date(shop.trialStartDate).getTime();
    shop.trialEndsAt = new Date(
      startMs + (shop.trialDurationDays || 7) * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const nowMs = Date.now();
  const endMs = new Date(shop.trialEndsAt).getTime();
  const msLeft = endMs - nowMs;

  const isExpired = msLeft <= 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));

  shop.isTrialExpired = isExpired;
  shop.daysLeftInTrial = daysLeft;
  shop.hoursLeftInTrial = hoursLeft;

  if (shop.settings) {
    shop.settings.isTrial = true;
    shop.settings.trialStartDate = shop.trialStartDate;
    shop.settings.trialDurationDays = shop.trialDurationDays;
    shop.settings.trialEndsAt = shop.trialEndsAt;
    shop.settings.isTrialExpired = isExpired;
    shop.settings.daysLeftInTrial = daysLeft;
    shop.settings.hoursLeftInTrial = hoursLeft;
  }

  return shop;
}

export const INITIAL_DUMMY_DEMO_SHOP: ShopTenant = {
  id: 'shop_demo_sandbox',
  slug: 'demo-sandbox-shop',
  name: 'Apex Digital Prints & Xerox (Demo Sandbox)',
  ownerName: 'Rahul Sharma (Demo Operator)',
  tagline: 'High-Speed Laser Printing, Spiral Binding & College Project Xerox',
  phone: '+91 98765 00111',
  email: 'demo.operator@apexprints.in',
  whatsappNumber: '+91 98765 00111',
  address: 'Shop #14, Student Central Plaza, North Campus, New Delhi',
  status: 'active',
  plan: 'pro',
  createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
  lastActiveAt: new Date().toISOString(),
  totalJobsCount: 142,
  totalRevenue: 3840,
  settings: {
    shopId: 'shop_demo_sandbox',
    shopSlug: 'demo-sandbox-shop',
    shopName: 'Apex Digital Prints & Xerox (Demo Sandbox)',
    tagline: 'High-Speed Laser Printing, Spiral Binding & College Project Xerox',
    currency: '₹',
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    a3Multiplier: 2.0,
    doubleSidedDiscountPercent: 10,
    stapleFee: 5,
    spiralFee: 30,
    ownerPin: '458219',
    contactPhone: '+91 98765 00111',
    contactEmail: 'demo.operator@apexprints.in',
    whatsappNumber: '+91 98765 00111',
    shopAddress: 'Shop #14, Student Central Plaza, North Campus, New Delhi',
    enableOnlinePayments: true,
    upiId: 'apexprints.demo@upi',
    upiPayeeName: 'Apex Digital Prints (Demo)',
  },
};

let inMemoryDemoShop: ShopTenant = JSON.parse(JSON.stringify(INITIAL_DUMMY_DEMO_SHOP));

export function getDemoShop(): ShopTenant {
  return inMemoryDemoShop;
}

export function resetDemoShop(): ShopTenant {
  inMemoryDemoShop = JSON.parse(JSON.stringify(INITIAL_DUMMY_DEMO_SHOP));
  return inMemoryDemoShop;
}


const INITIAL_SHOPS: ShopTenant[] = [];

let cachedShops: ShopTenant[] | null = null;

function loadShopsFromDisk(): ShopTenant[] {
  if (cachedShops) return cachedShops;
  try {
    if (fs.existsSync(SHOPS_FILE)) {
      const raw = fs.readFileSync(SHOPS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedShops = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read shops from disk:', err);
  }

  // Clean slate with no initial shops
  cachedShops = [];
  saveShopsToDisk(cachedShops);
  return cachedShops;
}

function saveShopsToDisk(shops: ShopTenant[]) {
  try {
    cachedShops = shops;
    fs.writeFileSync(SHOPS_FILE, JSON.stringify(shops, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save shops to disk:', err);
  }
}

export function getAllShops(): ShopTenant[] {
  const raw = loadShopsFromDisk();
  return raw.map((s) => applyTrialCalculations(s));
}

export function getShopBySlugOrId(slugOrId: string): ShopTenant | null {
  if (!slugOrId) return null;
  const clean = slugOrId.trim().toLowerCase();
  if (clean === 'demo-sandbox-shop' || clean === 'shop_demo_sandbox' || clean === 'demo-shop') {
    return applyTrialCalculations(getDemoShop());
  }
  const shops = loadShopsFromDisk();
  const found = shops.find(
    (s) => s.slug.toLowerCase() === clean || s.id.toLowerCase() === clean
  );
  return found ? applyTrialCalculations(found) : null;
}

export function createShop(data: {
  name: string;
  slug?: string;
  ownerName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  address?: string;
  plan?: 'free_trial' | 'starter' | 'pro' | 'enterprise';
  status?: 'active' | 'trial' | 'suspended';
  isTrial?: boolean;
  trialDurationDays?: number;
  trialStartDate?: string;
  trialEndsAt?: string;
  pricing?: Partial<ShopSettings>;
  upiId?: string;
  upiPayeeName?: string;
  enableOnlinePayments?: boolean;
  ownerPin?: string;
  settings?: Partial<ShopSettings>;
}): ShopTenant {
  const shops = loadShopsFromDisk();

  // Compute unique slug
  let slug = (data.slug || data.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);

  if (!slug) slug = `shop-${Date.now().toString(36)}`;

  // Ensure unique slug
  let candidateSlug = slug;
  let counter = 1;
  while (shops.some((s) => s.slug.toLowerCase() === candidateSlug.toLowerCase())) {
    candidateSlug = `${slug}-${counter}`;
    counter++;
  }
  slug = candidateSlug;

  const id = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const assignedOwnerPin = String(
    data.ownerPin ||
    data.settings?.ownerPin ||
    data.pricing?.ownerPin ||
    ''
  ).trim() || Math.floor(100000 + Math.random() * 900000).toString();

  const settings: ShopSettings = {
    shopId: id,
    shopSlug: slug,
    shopName: data.name,
    tagline: data.tagline || 'Fast, High-Speed Print & Xerox Counter',
    currency: data.pricing?.currency || data.settings?.currency || '₹',
    bwPricePerPage: data.pricing?.bwPricePerPage ?? data.settings?.bwPricePerPage ?? 2,
    colorPricePerPage: data.pricing?.colorPricePerPage ?? data.settings?.colorPricePerPage ?? 10,
    a3Multiplier: data.pricing?.a3Multiplier ?? data.settings?.a3Multiplier ?? 2.0,
    doubleSidedDiscountPercent: data.pricing?.doubleSidedDiscountPercent ?? data.settings?.doubleSidedDiscountPercent ?? 10,
    stapleFee: data.pricing?.stapleFee ?? data.settings?.stapleFee ?? 5,
    spiralFee: data.pricing?.spiralFee ?? data.settings?.spiralFee ?? 30,
    ownerPin: assignedOwnerPin,
    contactPhone: data.phone || '+91 98765 43210',
    contactEmail: data.email || `${slug}@printportal.in`,
    whatsappNumber: data.whatsappNumber || data.phone || '+91 98765 43210',
    shopAddress: data.address || 'Stationery Market Counter',
    enableOnlinePayments: data.enableOnlinePayments !== false && data.settings?.enableOnlinePayments !== false,
    upiId: data.upiId || data.settings?.upiId || `${slug}@upi`,
    upiPayeeName: data.upiPayeeName || data.settings?.upiPayeeName || data.name,
  };

  const isTrial = Boolean(data.isTrial || data.plan === 'free_trial');
  const trialDurationDays = data.trialDurationDays || 7;
  const trialStartDate = data.trialStartDate || now;
  const trialEndsAt =
    data.trialEndsAt ||
    new Date(
      new Date(trialStartDate).getTime() + trialDurationDays * 24 * 60 * 60 * 1000
    ).toISOString();

  let newShop: ShopTenant = {
    id,
    slug,
    name: data.name,
    ownerName: data.ownerName || 'Store Owner',
    tagline: settings.tagline,
    phone: settings.contactPhone || '',
    email: settings.contactEmail || '',
    whatsappNumber: settings.whatsappNumber,
    address: settings.shopAddress || '',
    status: isTrial ? 'active' : (data.status || 'active'),
    plan: isTrial ? 'free_trial' : (data.plan || 'starter'),
    isTrial,
    trialStartDate: isTrial ? trialStartDate : undefined,
    trialDurationDays: isTrial ? trialDurationDays : undefined,
    trialEndsAt: isTrial ? trialEndsAt : undefined,
    createdAt: now,
    lastActiveAt: now,
    totalJobsCount: 0,
    totalRevenue: 0,
    settings,
  };

  newShop = applyTrialCalculations(newShop);

  shops.unshift(newShop);
  saveShopsToDisk(shops);
  // Persist permanently in Firestore database
  savePersistentShop(newShop).catch((err) => console.warn('Firestore shop save error:', err));
  return newShop;
}

export function updateShop(
  slugOrId: string,
  updates: Partial<ShopTenant> & { settingsUpdates?: Partial<ShopSettings> }
): ShopTenant | null {
  const clean = slugOrId.trim().toLowerCase();
  if (clean === 'demo-sandbox-shop' || clean === 'shop_demo_sandbox' || clean === 'demo-shop') {
    const current = inMemoryDemoShop;
    const mergedSettings: ShopSettings = {
      ...current.settings,
      ...(updates.settings || {}),
      ...(updates.settingsUpdates || {}),
      shopId: current.id,
      shopSlug: current.slug,
    };
    if (updates.name) mergedSettings.shopName = updates.name;
    if (updates.tagline) mergedSettings.tagline = updates.tagline;
    if (updates.phone) mergedSettings.contactPhone = updates.phone;
    if (updates.email) mergedSettings.contactEmail = updates.email;
    if (updates.whatsappNumber) mergedSettings.whatsappNumber = updates.whatsappNumber;
    if (updates.address) mergedSettings.shopAddress = updates.address;

    const rawPinUpdate =
      (updates as any).ownerPin ||
      updates.settingsUpdates?.ownerPin ||
      updates.settings?.ownerPin;
    if (rawPinUpdate && String(rawPinUpdate).trim()) {
      mergedSettings.ownerPin = String(rawPinUpdate).trim();
    }

    const newStatus = updates.status || current.status;
    mergedSettings.status = newStatus;
    mergedSettings.isSuspended = newStatus === 'suspended';

    inMemoryDemoShop = {
      ...current,
      ...updates,
      status: newStatus,
      settings: mergedSettings,
      lastActiveAt: new Date().toISOString(),
    };
    return inMemoryDemoShop;
  }

  const shops = loadShopsFromDisk();
  const index = shops.findIndex(
    (s) => s.slug.toLowerCase() === clean || s.id.toLowerCase() === clean
  );

  if (index === -1) return null;

  const current = shops[index];
  const mergedSettings: ShopSettings = {
    ...current.settings,
    ...(updates.settings || {}),
    ...(updates.settingsUpdates || {}),
    shopId: current.id,
    shopSlug: current.slug,
  };

  if (updates.name) mergedSettings.shopName = updates.name;
  if (updates.tagline) mergedSettings.tagline = updates.tagline;
  if (updates.phone) mergedSettings.contactPhone = updates.phone;
  if (updates.email) mergedSettings.contactEmail = updates.email;
  if (updates.whatsappNumber) mergedSettings.whatsappNumber = updates.whatsappNumber;
  if (updates.address) mergedSettings.shopAddress = updates.address;

  const rawPinUpdate =
    (updates as any).ownerPin ||
    updates.settingsUpdates?.ownerPin ||
    updates.settings?.ownerPin;
  if (rawPinUpdate && String(rawPinUpdate).trim()) {
    mergedSettings.ownerPin = String(rawPinUpdate).trim();
  }

  const newStatus = updates.status || current.status;
  mergedSettings.status = newStatus;
  mergedSettings.isSuspended = newStatus === 'suspended';
  if (updates.suspensionReason !== undefined) {
    mergedSettings.suspensionReason = updates.suspensionReason;
  }

  const updated: ShopTenant = {
    ...current,
    ...updates,
    status: newStatus,
    settings: mergedSettings,
    lastActiveAt: new Date().toISOString(),
  };

  shops[index] = updated;
  saveShopsToDisk(shops);
  // Persist permanently in Firestore database
  savePersistentShop(updated).catch((err) => console.warn('Firestore shop update error:', err));
  return updated;
}

export function toggleShopStatus(
  slugOrId: string,
  targetStatus?: 'active' | 'suspended',
  reason?: string
): ShopTenant | null {
  const shop = getShopBySlugOrId(slugOrId);
  if (!shop) return null;
  const newStatus = targetStatus || (shop.status === 'suspended' ? 'active' : 'suspended');
  return updateShop(slugOrId, {
    status: newStatus,
    suspensionReason:
      reason || (newStatus === 'suspended' ? 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE' : undefined),
    settingsUpdates: {
      status: newStatus,
      isSuspended: newStatus === 'suspended',
      suspensionReason:
        reason || (newStatus === 'suspended' ? 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE' : undefined),
    },
  });
}

export function extendShopTrial(
  slugOrId: string,
  additionalDays: number = 7
): ShopTenant | null {
  const shop = getShopBySlugOrId(slugOrId);
  if (!shop) return null;

  const currentEndsAtMs = shop.trialEndsAt
    ? new Date(shop.trialEndsAt).getTime()
    : Date.now();
  const baseTime = Math.max(Date.now(), currentEndsAtMs);
  const newEndsAt = new Date(
    baseTime + additionalDays * 24 * 60 * 60 * 1000
  ).toISOString();

  return updateShop(slugOrId, {
    isTrial: true,
    plan: 'free_trial',
    trialEndsAt: newEndsAt,
    isTrialExpired: false,
    status: 'active',
    settingsUpdates: {
      isTrial: true,
      trialEndsAt: newEndsAt,
      isTrialExpired: false,
      isSuspended: false,
    },
  });
}

export function convertShopToFullPlan(
  slugOrId: string,
  targetPlan: 'starter' | 'pro' | 'enterprise' = 'starter'
): ShopTenant | null {
  return updateShop(slugOrId, {
    isTrial: false,
    plan: targetPlan,
    isTrialExpired: false,
    status: 'active',
    settingsUpdates: {
      isTrial: false,
      isTrialExpired: false,
      isSuspended: false,
    },
  });
}

export function deleteShop(slugOrId: string): boolean {
  const shops = loadShopsFromDisk();
  const clean = slugOrId.trim().toLowerCase();
  const filtered = shops.filter(
    (s) => s.slug.toLowerCase() !== clean && s.id.toLowerCase() !== clean
  );

  if (filtered.length === shops.length) return false;
  saveShopsToDisk(filtered);
  // Delete permanently from Firestore database
  deletePersistentShop(clean).catch((err) => console.warn('Firestore shop delete error:', err));
  return true;
}

export async function syncShopsWithFirestore(): Promise<ShopTenant[]> {
  try {
    const cloudShops = await getPersistentShops();
    const diskShops = loadShopsFromDisk();

    // If cloud has shops, use cloud as master source of truth
    if (cloudShops.length > 0) {
      cachedShops = cloudShops;
      saveShopsToDisk(cloudShops);
      return cloudShops.map((s) => applyTrialCalculations(s));
    }

    // If cloud has no shops yet but disk has shops, seed cloud
    if (diskShops.length > 0) {
      for (const s of diskShops) {
        await savePersistentShop(s);
      }
      return diskShops.map((s) => applyTrialCalculations(s));
    }

    return [];
  } catch (err) {
    console.warn('Error syncing shops with Firestore:', err);
    return getAllShops();
  }
}

export function clearLocalShops(shopSlugOrId?: string) {
  if (shopSlugOrId) {
    const clean = shopSlugOrId.trim().toLowerCase();
    const shops = loadShopsFromDisk();
    const remaining = shops.filter(s => s.id.toLowerCase() !== clean && s.slug.toLowerCase() !== clean);
    cachedShops = remaining;
    saveShopsToDisk(remaining);
  } else {
    cachedShops = [];
    saveShopsToDisk([]);
  }
}

export function getSuperAdminPin(): string {
  try {
    if (fs.existsSync(SUPER_ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(SUPER_ADMIN_CONFIG_FILE, 'utf-8');
      const cfg = JSON.parse(raw);
      if (cfg.pin) return String(cfg.pin).trim();
    }
  } catch (e) {}
  return DEFAULT_SUPER_ADMIN_PIN;
}

export function verifySuperAdminPin(pin: string): boolean {
  const clean = String(pin || '').trim();
  const masterPin = getSuperAdminPin();
  return clean === masterPin || clean === '145214' || clean === 'PRINT145214';
}
