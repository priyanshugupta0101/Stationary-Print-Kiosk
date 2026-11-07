import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDbToDisk, getDbFilePath, clearAllDbJobs } from './server/db.ts';
import {
  getShopSettings,
  updateShopSettings,
  createCloudPrintJob,
  lookupCloudPrintJob,
  getCloudPrintJobById,
  listCloudPrintJobs,
  updateCloudPrintJobStatus,
  deleteCloudPrintJob,
  getCloudFile,
  type CloudPrintJob,
  DEFAULT_SHOP_SETTINGS,
} from './src/db/cloudSqlDb.ts';
import {
  getAllShops,
  getShopBySlugOrId,
  getShopBySlugOrIdAsync,
  createShop,
  updateShop,
  updateShopPin,
  toggleShopStatus,
  extendShopTrial,
  convertShopToFullPlan,
  updateShopSubscription,
  getSuperAdminContact,
  updateSuperAdminContact,
  deleteShop,
  verifySuperAdminPin,
  DEFAULT_SUPER_ADMIN_PIN,
  syncShopsWithFirestore,
  clearLocalShops,
} from './server/shopsStore.ts';
import {
  resetFirestoreTestData,
  initFirestoreData,
  getPersistentShops,
  getPersistentShopBySlugOrId,
  updatePersistentJobStatus,
  lookupPersistentJob,
} from './server/firestoreDb.ts';
import {
  getDemoModeState,
  resetDemoModeState,
  addDemoJob,
  updateDemoJobStatus,
} from './server/demoModeStore.ts';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface StoredFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  storedFilename: string;
  pageCount: number;
  url: string;
  downloadUrl: string;
}

interface StoredJobResult {
  id: string;
  otp: string;
  customerName: string;
  customerPhone?: string;
  files: StoredFileMeta[];
  settings: {
    copies: number;
    colorMode: 'bw' | 'color';
    paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
    duplex: 'single' | 'double';
    binding: 'none' | 'staple' | 'spiral';
    orientation?: 'portrait' | 'landscape';
    scale?: 'fit' | 'original';
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

// Multer storage for uploaded documents
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

export async function createExpressApp() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize Real Persistent Cloud Firestore & Synchronize Shops
  try {
    await initFirestoreData();
    await syncShopsWithFirestore();
  } catch (firestoreErr) {
    console.warn('Firestore initial sync warning:', firestoreErr);
  }

  // Initialize local fallback SQLite database
  let localDb: any = null;
  try {
    localDb = await getDb();
  } catch (err) {
    console.warn('Local SQLite initialization warning:', err);
  }

  // Enable CORS for cross-device support and multi-domain/peer access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', async (_req, res) => {
    res.json({
      status: 'ok',
      database: 'Cloud Firestore (Persistent Database: ai-studio-stationeryprints-ccfd860d-7fee-47ff-8708-acd7ab43ef59)',
      persistent: true,
      time: new Date().toISOString(),
    });
  });

  // Shop Settings Endpoints (Cloud SQL backed with multi-shop tenant support)
  app.get('/api/settings', async (req, res) => {
    try {
      const shopSlug = String(req.query.shop || req.headers['x-shop-slug'] || '').trim();
      const contactAdmin = getSuperAdminContact();

      if (shopSlug) {
        const tenant = await getShopBySlugOrIdAsync(shopSlug);
        if (tenant) {
          const { ownerPin, ...publicSettings } = tenant.settings;
          return res.json({
            ...publicSettings,
            shopName: tenant.settings?.shopName || tenant.name || 'COPY',
            shopId: tenant.id,
            shopSlug: tenant.slug,
            status: tenant.status,
            isSuspended: tenant.status === 'suspended',
            suspensionReason:
              tenant.suspensionReason ||
              (tenant.status === 'suspended' ? 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE' : undefined),
            isTrial: tenant.isTrial,
            isTrialExpired: tenant.isTrialExpired,
            daysLeftInTrial: tenant.daysLeftInTrial,
            hoursLeftInTrial: tenant.hoursLeftInTrial,
            trialEndsAt: tenant.trialEndsAt,
            hasPin: Boolean(ownerPin),
            contactAdmin,
          });
        }
      }

      // Default platform settings when no explicit shop is specified
      const settings = await getShopSettings();
      const { ownerPin, ...publicSettings } = settings;
      res.json({
        ...publicSettings,
        shopName: 'COPY',
        hasPin: Boolean(ownerPin),
        contactAdmin,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings/verify-pin', async (req, res) => {
    const { pin, shopSlug: bodyShopSlug } = req.body;
    const targetShopSlug = String(req.query.shop || bodyShopSlug || req.headers['x-shop-slug'] || '').trim();
    try {
      const cleanPin = String(pin || '').trim();

      // SUPER ADMIN REDIRECTION:
      // If entered master PIN 145214 (numeric) or configured super admin key, authorize and redirect to Super Admin panel
      if (cleanPin === '145214' || cleanPin === 'PRINT145214' || verifySuperAdminPin(cleanPin)) {
        return res.json({
          success: true,
          isSuperAdmin: true,
          redirect: 'super-admin',
          message: 'Super Admin master key authorized. Redirecting to Super Admin Console.',
        });
      }

      const allShops = await getPersistentShops();

      if (allShops.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No shops currently exist in the Super Admin panel. Please generate a shop first in Super Admin.',
        });
      }

      // Helper to cleanly extract configured owner PIN
      const getShopPin = (s: any) => String(s?.settings?.ownerPin || s?.ownerPin || '').trim();

      // 1. Try to find shop by targetShopSlug if specified
      let tenant = targetShopSlug ? await getShopBySlugOrIdAsync(targetShopSlug) : null;

      // 2. If targetShopSlug is not specified or doesn't match this PIN, search across all shops by PIN
      if (!tenant || getShopPin(tenant) !== cleanPin) {
        const pinMatch = allShops.find(
          (s) => getShopPin(s) === cleanPin
        );
        if (pinMatch) {
          tenant = pinMatch;
        }
      }

      // 3. If still no tenant and there's exactly 1 shop, fall back to that 1 shop
      if (!tenant && allShops.length === 1) {
        tenant = allShops[0];
      }

      if (!tenant) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect Operator PIN. No registered shop matches this PIN. Please enter your authentic shop PIN.',
        });
      }

      // Check if system is disabled/suspended for this shop
      if (tenant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          isSuspended: true,
          shopStatus: 'suspended',
          shopName: tenant.name,
          shopSlug: tenant.slug,
          error: 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE',
          message:
            'THE SUPER ADMIN HAS STOPPED YOUR SERVICE: Access to the owner desk, order processing, and printing operations for this shop has been disabled by the Super Admin.',
          suspensionReason:
            tenant.suspensionReason || 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE',
        });
      }

      const configuredPin = getShopPin(tenant);
      if (!configuredPin) {
        return res.status(400).json({
          success: false,
          error: `No Owner PIN configured for ${tenant.name}. Please set an Owner PIN in the Super Admin panel.`,
        });
      }

      // STRICT AUTHENTICATION:
      // Shop owners log in using their actual assigned PIN.
      const isValid = cleanPin === configuredPin;

      if (isValid) {
        // Check if 4-day or 7-day free trial has auto-expired
        if (tenant.isTrialExpired) {
          const contactAdmin = getSuperAdminContact();
          const trialDays = tenant.trialDurationDays || (tenant.plan === 'four_day_trial' ? 4 : 7);
          const trialMsg = trialDays === 4
            ? 'Your four-day free plan has ended. Contact the super admin to activate your subscription plan.'
            : 'Your 7-day free trial session is expired. If you love the service, contact with the admin to activate your subscription plan.';

          return res.status(403).json({
            success: false,
            isTrialExpired: true,
            isSuspended: false,
            trialDurationDays: trialDays,
            shopStatus: 'trial_expired',
            shopName: tenant.name,
            shopSlug: tenant.slug,
            daysLeftInTrial: 0,
            error: trialMsg,
            message: trialMsg,
            contactAdmin,
          });
        }

        const safeSettings = {
          ...DEFAULT_SHOP_SETTINGS,
          ...(tenant.settings || {}),
          ownerPin: configuredPin,
          shopSlug: tenant.slug,
          shopId: tenant.id,
          status: tenant.status,
          isSuspended: false,
          isTrial: tenant.isTrial,
          isTrialExpired: false,
          daysLeftInTrial: tenant.daysLeftInTrial,
          hoursLeftInTrial: tenant.hoursLeftInTrial,
          trialEndsAt: tenant.trialEndsAt,
        };
        res.json({
          success: true,
          shopSlug: tenant.slug,
          shopName: tenant.name,
          settings: safeSettings,
        });
      } else {
        res.status(401).json({
          success: false,
          error: `Incorrect Owner PIN for ${tenant.name}. Please enter the authentic PIN set for this shop.`,
        });
      }
    } catch (err: any) {
      console.error('Error in /api/settings/verify-pin:', err);
      res.status(500).json({ success: false, error: err.message || 'Authentication failed' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const { pin, newSettings, shopSlug: bodyShopSlug } = req.body;
    const targetShopSlug = String(req.query.shop || bodyShopSlug || req.headers['x-shop-slug'] || '').trim();

    try {
      const cleanPin = String(pin || '').trim();

      if (targetShopSlug) {
        const tenant = await getShopBySlugOrIdAsync(targetShopSlug);
        if (tenant) {
          const configuredPin = String(tenant.settings.ownerPin || '').trim();
          if (!configuredPin || cleanPin !== configuredPin) {
            return res.status(401).json({ error: 'Unauthorized. Invalid Owner PIN.' });
          }
          const updated = await updateShop(targetShopSlug, { settingsUpdates: newSettings });
          return res.json({ success: true, settings: updated?.settings || newSettings });
        }
      }

      let current: any = null;
      try {
        current = await getShopSettings();
      } catch (dbErr) {
        current = DEFAULT_SHOP_SETTINGS;
      }

      const configuredPin = String(current?.ownerPin || current?.owner_pin || '').trim();

      if (!configuredPin || cleanPin !== configuredPin) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Owner PIN.' });
      }

      const updated = await updateShopSettings(newSettings);

      // Synchronize with local SQLite as secondary fallback
      if (localDb) {
        try {
          localDb.run(
            `UPDATE shop_settings SET
              shop_name = ?, tagline = ?, currency = ?, bw_price_per_page = ?,
              color_price_per_page = ?, a3_multiplier = ?, duplex_discount_percent = ?,
              staple_fee = ?, spiral_fee = ?, contact_phone = ?, shop_address = ?,
              upi_id = ?, updated_at = ?
             WHERE id = 1`,
            [
              updated.shopName || '',
              updated.tagline || '',
              updated.currency || '₹',
              Number(updated.bwPricePerPage) || 2,
              Number(updated.colorPricePerPage) || 10,
              Number(updated.a3Multiplier) || 2,
              Number(updated.doubleSidedDiscountPercent) || 10,
              Number(updated.stapleFee) || 5,
              Number(updated.spiralFee) || 30,
              updated.contactPhone || '',
              updated.shopAddress || '',
              updated.upiId || '',
              new Date().toISOString(),
            ]
          );
          saveDbToDisk();
        } catch (localErr) {
          console.warn('Could not sync settings to local SQLite:', localErr);
        }
      }

      res.json({ success: true, settings: updated });
    } catch (err: any) {
      console.error('Error updating settings:', err);
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  // ==========================================
  // SUPER ADMIN MULTI-SHOP MANAGEMENT ROUTES
  // ==========================================
  app.post('/api/super-admin/verify-pin', (req, res) => {
    const { pin } = req.body;
    const isValid = verifySuperAdminPin(pin);
    if (isValid) {
      res.json({ success: true, message: 'Super Admin Access Authorized' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid Super Admin Key.' });
    }
  });

  app.get('/api/super-admin/shops', async (_req, res) => {
    try {
      const shops = await getPersistentShops();
      try {
        const allJobs = await listCloudPrintJobs('all');
        shops.forEach((shop) => {
          const shopJobs = allJobs.filter((j) => {
            const sSlug = (j.shopSlug || (j.settings && j.settings.shopSlug) || '').toLowerCase();
            const sId = (j.shopId || (j.settings && j.settings.shopId) || '').toLowerCase();
            return sSlug === shop.slug.toLowerCase() || sId === shop.id.toLowerCase();
          });
          shop.totalJobsCount = shopJobs.length;
          shop.totalRevenue = shopJobs.reduce(
            (acc, j) => acc + (Number(j.pricing?.totalPrice) || 0),
            0
          );
        });
      } catch (e) {
        // use fallback cached values
      }
      res.json({ success: true, shops });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch shops' });
    }
  });

  app.post('/api/super-admin/shops', async (req, res) => {
    try {
      const newShop = await createShop(req.body);
      res.status(201).json({ success: true, shop: newShop });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create shop' });
    }
  });

  app.get('/api/super-admin/shops/:slugOrId', async (req, res) => {
    const shop = await getShopBySlugOrIdAsync(req.params.slugOrId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ success: true, shop });
  });

  const handleUpdateShop = async (req: Request, res: Response) => {
    try {
      const rawSlug = String(req.params.slugOrId || '').trim();
      const slugOrId = decodeURIComponent(rawSlug);
      const updated = await updateShop(slugOrId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }
      res.json({ success: true, shop: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to update shop' });
    }
  };

  app.put('/api/super-admin/shops/:slugOrId', handleUpdateShop);
  app.post('/api/super-admin/shops/:slugOrId', handleUpdateShop);

  // Dedicated endpoint to update shop Owner PIN
  app.post('/api/super-admin/shops/:slugOrId/pin', async (req, res) => {
    try {
      const rawSlug = String(req.params.slugOrId || '').trim();
      const slugOrId = decodeURIComponent(rawSlug);
      const pin = String(req.body?.ownerPin || req.body?.pin || '').trim();
      if (!pin || pin.length < 4) {
        return res.status(400).json({ success: false, error: 'PIN must be at least 4 digits' });
      }
      const updated = await updateShopPin(slugOrId, pin);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }
      res.json({
        success: true,
        shop: updated,
        ownerPin: pin,
        message: `Owner PIN updated successfully for ${updated.name}`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to update PIN' });
    }
  });

  // Enable or Disable / Toggle Shop System Service (Super Admin Master Control)
  app.post('/api/super-admin/shops/:slugOrId/toggle-status', async (req, res) => {
    try {
      const { status, reason } = req.body || {};
      const updated = await toggleShopStatus(req.params.slugOrId, status, reason);
      if (!updated) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json({
        success: true,
        shop: updated,
        isSuspended: updated.status === 'suspended',
        message:
          updated.status === 'suspended'
            ? `Shop system for "${updated.name}" has been DISABLED / SERVICE STOPPED.`
            : `Shop system for "${updated.name}" has been ACTIVATED.`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to toggle shop status' });
    }
  });

  // Extend 7-Day Free Trial (e.g. +7 Days)
  app.post('/api/super-admin/shops/:slugOrId/extend-trial', async (req, res) => {
    try {
      const days = Number(req.body?.days) || 7;
      const updated = await extendShopTrial(req.params.slugOrId, days);
      if (!updated) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json({
        success: true,
        shop: updated,
        message: `Extended 7-day trial by ${days} days for "${updated.name}". Now active with ${updated.daysLeftInTrial} days remaining.`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to extend trial' });
    }
  });

  // Convert Trial to Full Active Subscription Plan
  app.post('/api/super-admin/shops/:slugOrId/convert-plan', async (req, res) => {
    try {
      const plan = req.body?.plan || 'starter';
      const updated = await convertShopToFullPlan(req.params.slugOrId, plan);
      if (!updated) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json({
        success: true,
        shop: updated,
        message: `Successfully upgraded "${updated.name}" to full ${plan.toUpperCase()} plan!`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to convert plan' });
    }
  });

  // Manage and update client subscription model anytime (Free trial, Monthly, Permanent)
  app.post('/api/super-admin/shops/:slugOrId/subscription', async (req, res) => {
    try {
      const {
        plan,
        isTrial,
        trialDurationDays,
        trialDays,
        billingCycle,
        subscriptionExpiresAt,
        daysValid,
        resetStartDate,
      } = req.body || {};

      if (!plan) {
        return res.status(400).json({ error: 'Missing required field: plan' });
      }

      const updated = await updateShopSubscription(req.params.slugOrId, {
        plan,
        isTrial,
        trialDurationDays: trialDurationDays || trialDays,
        billingCycle,
        subscriptionExpiresAt,
        daysValid,
        resetStartDate,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      res.json({
        success: true,
        shop: updated,
        message: `Subscription for "${updated.name}" updated to ${String(plan).replace('_', ' ').toUpperCase()} successfully!`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update subscription' });
    }
  });

  // Detailed Shop Analytics & Performance Report Data (for PDF Generation)
  app.get('/api/super-admin/shops/:slugOrId/report-data', async (req, res) => {
    try {
      const shop = await getShopBySlugOrIdAsync(req.params.slugOrId);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      let allJobs = await listCloudPrintJobs('all');
      const cleanSlug = shop.slug.toLowerCase();
      const cleanId = shop.id.toLowerCase();
      const shopJobs = allJobs.filter((j) => {
        const sSlug = (j.shopSlug || (j.settings && j.settings.shopSlug) || '').toLowerCase();
        const sId = (j.shopId || (j.settings && j.settings.shopId) || '').toLowerCase();
        return sSlug === cleanSlug || sId === cleanId;
      });

      let totalRevenue = 0;
      let totalPages = 0;
      let bwPages = 0;
      let bwRevenue = 0;
      let colorPages = 0;
      let colorRevenue = 0;
      let doubleSidedJobs = 0;
      let a3Jobs = 0;
      let stapleJobs = 0;
      let spiralJobs = 0;
      let cashRevenue = 0;
      let onlineRevenue = 0;
      let completedJobs = 0;
      let pendingJobs = 0;

      const hourlyDistribution: Record<string, number> = {};
      const customersSet = new Set<string>();

      shopJobs.forEach((job) => {
        const price = Number(job.pricing?.totalPrice) || 0;
        const pages = Number(job.pricing?.totalPages) || 1;
        const copies = Number(job.settings?.copies) || 1;
        const jobPages = pages * copies;
        const mode = job.settings?.colorMode || 'bw';
        const method = String(job.paymentMethod || '').toLowerCase();

        totalRevenue += price;
        totalPages += jobPages;

        if (mode === 'color') {
          colorPages += jobPages;
          colorRevenue += price;
        } else {
          bwPages += jobPages;
          bwRevenue += price;
        }

        if (job.settings?.doubleSided) doubleSidedJobs++;
        if (job.settings?.paperSize === 'a3') a3Jobs++;
        if (job.settings?.staple) stapleJobs++;
        if (job.settings?.spiral) spiralJobs++;

        if (method === 'upi' || method === 'online' || method === 'gpay' || method === 'qr') {
          onlineRevenue += price;
        } else {
          cashRevenue += price;
        }

        if (job.status === 'collected' || job.status === 'printed') {
          completedJobs++;
        } else if (job.status === 'pending' || job.status === 'received') {
          pendingJobs++;
        }

        if (job.customerName) customersSet.add(job.customerName.trim());

        if (job.createdAt) {
          const hour = new Date(job.createdAt).getHours();
          const hourKey = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
          hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;
        }
      });

      const avgOrderValue = shopJobs.length > 0 ? totalRevenue / shopJobs.length : 0;
      const recentJobs = shopJobs.slice(0, 25);

      res.json({
        success: true,
        report: {
          generatedAt: new Date().toISOString(),
          shop,
          summary: {
            totalJobs: shopJobs.length,
            completedJobs,
            pendingJobs,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalPages,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            uniqueCustomers: customersSet.size,
          },
          breakdown: {
            bw: { pages: bwPages, revenue: Math.round(bwRevenue * 100) / 100 },
            color: { pages: colorPages, revenue: Math.round(colorRevenue * 100) / 100 },
            doubleSidedJobs,
            a3Jobs,
            stapleJobs,
            spiralJobs,
            cashRevenue: Math.round(cashRevenue * 100) / 100,
            onlineRevenue: Math.round(onlineRevenue * 100) / 100,
          },
          hourlyDistribution,
          recentJobs,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to generate shop report' });
    }
  });

  app.delete('/api/super-admin/shops/:slugOrId', async (req, res) => {
    const success = await deleteShop(req.params.slugOrId);
    if (!success) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ success: true, message: 'Shop successfully deleted' });
  });

  // Seed realistic demo orders for any shop (for Live Showcases to prospective buyers)
  app.post('/api/super-admin/shops/:slugOrId/seed-demo', async (req, res) => {
    const { slugOrId } = req.params;
    const shop = await getShopBySlugOrIdAsync(slugOrId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const demoJobsToCreate = [
      {
        customerName: 'Aarav Sharma (Student)',
        customerPhone: '+91 98765 11223',
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        fileName: 'BTech_Project_Final_Report.pdf',
        pages: 28,
        copies: 2,
        colorMode: 'bw' as const,
        paperSize: 'A4' as const,
        duplex: 'double' as const,
        binding: 'spiral' as const,
        notes: 'Please bind with transparent plastic sheet on front & card back.',
        paymentStatus: 'paid' as const,
        paymentMethod: 'online_gpay',
      },
      {
        customerName: 'Pooja Verma (Architecture)',
        customerPhone: '+91 98222 55441',
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        fileName: 'Elevation_Designs_A3.pdf',
        pages: 6,
        copies: 1,
        colorMode: 'color' as const,
        paperSize: 'A3' as const,
        duplex: 'single' as const,
        binding: 'none' as const,
        notes: 'Need vibrant color prints on 120gsm paper. Ready in 15 mins.',
        paymentStatus: 'paid' as const,
        paymentMethod: 'online_phonepe',
      },
      {
        customerName: 'Vikram Mehta',
        customerPhone: '+91 98333 77889',
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        fileName: 'Rental_Agreement_Stamp.pdf',
        pages: 4,
        copies: 3,
        colorMode: 'bw' as const,
        paperSize: 'Legal' as const,
        duplex: 'single' as const,
        binding: 'staple' as const,
        notes: 'Corner staple top left. Customer waiting at counter.',
        paymentStatus: 'unpaid' as const,
        paymentMethod: undefined,
      },
    ];

    const created: any[] = [];
    for (const d of demoJobsToCreate) {
      const jobId = `job_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fileId = `file_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const pricing = calculatePricing(
        {
          copies: d.copies,
          colorMode: d.colorMode,
          paperSize: d.paperSize,
          duplex: d.duplex,
          binding: d.binding,
          estimatedPagesPerDoc: d.pages,
        },
        1,
        shop.settings,
        d.pages
      );

      const jobPayload = {
        id: jobId,
        otp: d.otp,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        files: [
          {
            id: fileId,
            originalName: d.fileName,
            mimeType: 'application/pdf',
            size: d.pages * 45000,
            storedFilename: `demo_${d.fileName}`,
            pageCount: d.pages,
            url: `/api/files/${fileId}`,
            downloadUrl: `/api/files/${fileId}/download`,
          },
        ],
        settings: {
          shopId: shop.id,
          shopSlug: shop.slug,
          copies: d.copies,
          colorMode: d.colorMode,
          paperSize: d.paperSize,
          duplex: d.duplex,
          binding: d.binding,
          orientation: 'portrait' as const,
          scale: 'fit' as const,
          estimatedPagesPerDoc: d.pages,
          notes: d.notes,
        },
        pricing,
        notes: d.notes,
      };

      try {
        const cloudJob = await createCloudPrintJob(jobPayload);
        if (d.paymentStatus === 'paid') {
          await updateCloudPrintJobStatus(jobId, {
            paymentStatus: 'paid',
            notes: `Paid online via ${d.paymentMethod?.replace('online_', '').toUpperCase()}`,
          });
        }
        created.push(cloudJob);
      } catch (e) {
        console.warn('Demo job warning:', e);
      }
    }

    res.json({
      success: true,
      message: `Successfully generated ${created.length} live demo orders for ${shop.name}!`,
      jobs: created,
    });
  });

  app.get('/api/super-admin/stats', async (_req, res) => {
    try {
      const shops = getAllShops();
      const allJobs = await listCloudPrintJobs('all');

      let totalRevenue = 0;
      let totalPages = 0;
      allJobs.forEach((j) => {
        totalRevenue += Number(j.pricing?.totalPrice) || 0;
        totalPages += (Number(j.pricing?.totalPages) || 1) * (Number(j.settings?.copies) || 1);
      });

      res.json({
        success: true,
        stats: {
          totalShops: shops.length,
          activeShops: shops.filter((s) => s.status === 'active' && !s.isTrialExpired).length,
          trialShops: shops.filter((s) => s.isTrial && !s.isTrialExpired).length,
          expiredTrialShops: shops.filter((s) => s.isTrial && s.isTrialExpired).length,
          totalPlatformJobs: allJobs.length,
          totalPlatformRevenue: Math.round(totalRevenue * 100) / 100,
          totalPrintedPages: totalPages,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch platform stats' });
    }
  });

  // Demo Sandbox Mode: Full live simulation endpoints (Zero impact on real shops)
  app.get('/api/super-admin/demo-mode', (_req, res) => {
    res.json({ success: true, ...getDemoModeState() });
  });

  app.post('/api/super-admin/demo-mode/reset', (_req, res) => {
    const state = resetDemoModeState();
    res.json({
      success: true,
      message: 'Demo Sandbox successfully reset to default simulated state',
      ...state,
    });
  });

  app.post('/api/super-admin/demo-mode/simulate-job', (req, res) => {
    const newJob = addDemoJob(req.body || {});
    res.json({
      success: true,
      message: 'New simulated order added to Demo Sandbox queue',
      job: newJob,
      ...getDemoModeState(),
    });
  });

  app.patch('/api/super-admin/demo-mode/jobs/:id', (req, res) => {
    const updated = updateDemoJobStatus(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Demo job not found' });
    }
    res.json({ success: true, job: updated });
  });

  // Reset Test & Demo Data in Real Firestore Database (for approaching real shops with a clean slate)
  app.post('/api/super-admin/reset-data', async (req, res) => {
    const { pin, resetTestJobs = true, resetTestShops = false, shopSlugOrId } = req.body || {};
    const isValid = verifySuperAdminPin(pin);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Invalid Super Admin Key.' });
    }

    try {
      const result = await resetFirestoreTestData({
        resetTestJobs: Boolean(resetTestJobs),
        resetTestShops: Boolean(resetTestShops),
        shopSlugOrId: shopSlugOrId ? String(shopSlugOrId).trim() : undefined,
      });

      if (resetTestJobs) {
        clearAllDbJobs();
      }

      if (resetTestShops) {
        clearLocalShops(shopSlugOrId ? String(shopSlugOrId).trim() : undefined);
      }

      // Synchronize in-memory and disk stores with fresh Firestore state
      await syncShopsWithFirestore();

      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('Reset test data error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to reset test data' });
    }
  });

  // Get Super Admin Helpline & Support details
  app.get('/api/super-admin/contact', (_req, res) => {
    try {
      const contact = getSuperAdminContact();
      res.json({ success: true, contact });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to get contact' });
    }
  });

  // Update Super Admin Helpline & Support details
  app.post('/api/super-admin/contact', (req, res) => {
    const { pin, name, phone, email, whatsappNumber, serviceProviderTitle, customNote } = req.body;
    if (pin && !verifySuperAdminPin(pin)) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Invalid Super Admin PIN.' });
    }
    try {
      const updated = updateSuperAdminContact({
        name,
        phone,
        email,
        whatsappNumber,
        serviceProviderTitle,
        customNote,
      });
      res.json({ success: true, contact: updated, message: 'Super admin contact details updated successfully!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to update contact' });
    }
  });

  // Download real-world database backup
  app.get('/api/database/backup', (_req, res) => {
    try {
      saveDbToDisk();
      const filePath = getDbFilePath();
      res.download(filePath, 'printshop-backup.sqlite');
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to parse page count of a PDF file using pdf-lib with structural fallback
  async function detectServerPdfPageCount(filePath: string): Promise<number> {
    try {
      const buffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
      return Math.max(1, pdfDoc.getPageCount());
    } catch (e) {
      try {
        const buffer = fs.readFileSync(filePath);
        const text = buffer.toString('latin1');
        const countMatch = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
        if (countMatch && countMatch[1]) {
          const parsed = parseInt(countMatch[1], 10);
          if (parsed > 0) return parsed;
        }
        const matches = text.match(/\/Type\s*\/Page\b/g);
        if (matches && matches.length > 0) return matches.length;
      } catch (err) {}
      return 1;
    }
  }

  // Calculate pricing based on current settings and actual page count
  function calculatePricing(
    settings: any,
    fileCount: number,
    shopConfig: any,
    overrideTotalPages?: number
  ) {
    const baseRate =
      settings.colorMode === 'color' ? shopConfig.colorPricePerPage : shopConfig.bwPricePerPage;

    const totalPages = overrideTotalPages && overrideTotalPages > 0
      ? overrideTotalPages
      : (settings.estimatedPagesPerDoc || 1) * Math.max(1, fileCount);
    const copies = Math.max(1, settings.copies || 1);

    const paperMult = settings.paperSize === 'A3' ? shopConfig.a3Multiplier : 1.0;
    const duplexMult =
      settings.duplex === 'double' ? 1 - shopConfig.doubleSidedDiscountPercent / 100 : 1.0;

    const perPageEffectiveRate = baseRate * paperMult * duplexMult;
    const printCost = totalPages * copies * perPageEffectiveRate;

    let bindingFee = 0;
    if (settings.binding === 'staple') {
      bindingFee = (shopConfig.stapleFee || 5) * copies;
    } else if (settings.binding === 'spiral') {
      bindingFee = (shopConfig.spiralFee || 30) * copies;
    }

    const rawTotal = printCost + bindingFee;
    const totalPrice = Math.round(rawTotal * 100) / 100;

    return {
      currency: shopConfig.currency || '₹',
      baseRatePerPage: baseRate,
      totalPages,
      copies,
      paperMultiplier: paperMult,
      duplexMultiplier: duplexMult,
      bindingFee,
      subtotal: Math.round(printCost * 100) / 100,
      totalPrice: Math.max(1, totalPrice),
    };
  }

  // Generate 4-digit unique OTP
  async function generateUniqueOtp(): Promise<string> {
    try {
      const activeJobs = await listCloudPrintJobs('active');
      const activeOtps = new Set<string>(activeJobs.map((j) => String(j.otp)));

      for (let i = 0; i < 1000; i++) {
        const num = Math.floor(1000 + Math.random() * 9000).toString();
        if (!activeOtps.has(num)) {
          return num;
        }
      }
    } catch (e) {
      console.warn('Error fetching active OTPs from Cloud SQL:', e);
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Document Upload Endpoint (Accepts both /api/upload and /api/jobs, supports 'files' or any form field)
  app.post(['/api/upload', '/api/upload/', '/api/jobs', '/api/jobs/'], upload.any(), async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Please select at least one document to upload.' });
      }

      let parsedSettings: any = {};
      try {
        parsedSettings = req.body.settings ? (typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings) : {};
      } catch (e) {
        parsedSettings = {};
      }

      const targetShopSlug = String(
        req.query.shop ||
        req.headers['x-shop-slug'] ||
        req.body.shopSlug ||
        parsedSettings.shopSlug ||
        parsedSettings.shopId ||
        ''
      ).trim();

      const tenantShop = targetShopSlug ? await getShopBySlugOrIdAsync(targetShopSlug) : null;
      if (tenantShop && tenantShop.status === 'suspended') {
        return res.status(403).json({
          error: 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE: Document uploads and printing are paused for this shop.',
          isSuspended: true,
          shopStatus: 'suspended',
        });
      }
      let shopConfig: any = tenantShop?.settings || {
        bwPricePerPage: 2,
        colorPricePerPage: 10,
        currency: '₹',
        a3Multiplier: 2,
        doubleSidedDiscountPercent: 10,
        stapleFee: 5,
        spiralFee: 30,
      };

      if (!tenantShop) {
        try {
          const fetched = await getShopSettings();
          if (fetched) shopConfig = fetched;
        } catch (settingsErr) {
          console.warn('Using default pricing settings:', settingsErr);
        }
      }

      const otp = await generateUniqueOtp();
      const customerName = (req.body.customerName || parsedSettings.customerName || 'Customer').trim();
      const customerPhone = (req.body.customerPhone || parsedSettings.customerPhone || '').trim();

      const printSettings = {
        shopId: tenantShop?.id || 'shop_copy_main',
        shopSlug: tenantShop?.slug || targetShopSlug || 'copy-main',
        copies: Number(parsedSettings.copies) || 1,
        colorMode: (parsedSettings.colorMode === 'color' ? 'color' : 'bw') as 'bw' | 'color',
        paperSize: (['A4', 'A3', 'Letter', 'Legal'].includes(parsedSettings.paperSize) ? parsedSettings.paperSize : 'A4') as 'A4' | 'A3' | 'Letter' | 'Legal',
        duplex: (parsedSettings.duplex === 'double' ? 'double' : 'single') as 'single' | 'double',
        binding: (['none', 'staple', 'spiral'].includes(parsedSettings.binding) ? parsedSettings.binding : 'none') as 'none' | 'staple' | 'spiral',
        orientation: (parsedSettings.orientation === 'landscape' ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
        scale: (parsedSettings.scale === 'original' ? 'original' : 'fit') as 'fit' | 'original',
        estimatedPagesPerDoc: Math.max(1, Number(parsedSettings.estimatedPagesPerDoc) || 1),
        notes: (parsedSettings.notes || req.body.notes || '').trim(),
      };

      // Prepare files metadata & calculate page count for each file (with automatic PDF page parsing)
      const jobFilesData = await Promise.all(
        files.map(async (f, idx) => {
          let pageCount = 1;
          const isPdf = f.mimetype === 'application/pdf' || f.originalname.toLowerCase().endsWith('.pdf');
          if (isPdf) {
            pageCount = await detectServerPdfPageCount(f.path);
          } else {
            pageCount = Math.max(1, Number(parsedSettings.estimatedPagesPerDoc) || 1);
          }

          return {
            id: `file_${Date.now()}_${idx}`,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            storedFilename: f.filename,
            pageCount,
            filePath: f.path,
            url: `/api/files/file_${Date.now()}_${idx}`,
            downloadUrl: `/api/files/file_${Date.now()}_${idx}/download`,
          };
        })
      );

      // Auto-calculated total pages across all uploaded documents
      const calculatedTotalPages = jobFilesData.reduce((acc, f) => acc + (f.pageCount || 1), 0);
      const pricing = calculatePricing(
        printSettings,
        files.length,
        shopConfig,
        calculatedTotalPages > 0 ? calculatedTotalPages : undefined
      );
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const nowIso = new Date().toISOString();

      // Store in Cloud SQL (PostgreSQL) with graceful fallback
      let cloudJob: any = null;
      try {
        cloudJob = await createCloudPrintJob({
          id: jobId,
          otp,
          customerName: customerName || 'Customer',
          customerPhone,
          files: jobFilesData,
          settings: printSettings,
          pricing,
          notes: printSettings.notes,
        });
      } catch (dbErr) {
        console.warn('Cloud SQL store warning, continuing with local persistence:', dbErr);
        cloudJob = {
          id: jobId,
          otp,
          shopId: printSettings.shopId,
          shopSlug: printSettings.shopSlug,
          customerName: customerName || 'Customer',
          customerPhone,
          files: jobFilesData,
          settings: printSettings,
          pricing,
          status: 'pending' as const,
          paymentStatus: 'unpaid' as const,
          createdAt: nowIso,
          notes: printSettings.notes,
        };
      }

      if (
        targetShopSlug === 'demo-sandbox-shop' ||
        targetShopSlug === 'demo-shop' ||
        targetShopSlug === 'shop_demo_sandbox'
      ) {
        addDemoJob(cloudJob);
      }

      // Synchronize with local SQLite as secondary fallback
      if (localDb) {
        try {
          localDb.run(
            `INSERT OR REPLACE INTO print_jobs (
              id, otp, customer_name, customer_phone, status, payment_status,
              copies, color_mode, paper_size, duplex, binding,
              estimated_pages_per_doc, total_pages, unit_price, subtotal,
              binding_fee, total_price, currency, notes, created_at
            ) VALUES (?, ?, ?, ?, 'pending', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              jobId,
              otp,
              customerName || 'Customer',
              customerPhone,
              printSettings.copies,
              printSettings.colorMode,
              printSettings.paperSize,
              printSettings.duplex,
              printSettings.binding,
              printSettings.estimatedPagesPerDoc,
              pricing.totalPages,
              pricing.baseRatePerPage,
              pricing.subtotal,
              pricing.bindingFee,
              pricing.totalPrice,
              pricing.currency,
              printSettings.notes,
              cloudJob.createdAt || nowIso,
            ]
          );

          for (const f of jobFilesData) {
            localDb.run(
              `INSERT OR REPLACE INTO job_files (
                id, job_id, original_name, mime_type, size_bytes, stored_filename, page_count, uploaded_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                f.id,
                jobId,
                f.originalName,
                f.mimeType,
                f.size,
                f.storedFilename,
                f.pageCount,
                cloudJob.createdAt || nowIso,
              ]
            );
          }
          saveDbToDisk();
        } catch (sqliteErr) {
          console.warn('SQLite secondary sync notice:', sqliteErr);
        }
      }

      return res.status(201).json({
        success: true,
        otp,
        job: cloudJob,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process document upload' });
    }
  });

  // Lookup job by 4-digit OTP (or ID / Phone) - Queries Cloud SQL PostgreSQL in Real-Time!
  app.get(['/api/jobs/lookup/:otp', '/api/jobs/lookup/:otp/'], async (req, res) => {
    const rawParam = req.params.otp.trim();
    const cleanOtp = rawParam.replace(/\D/g, '').trim();
    const targetOtp = cleanOtp || rawParam;

    try {
      // 1. Primary Lookup in Cloud SQL PostgreSQL / Firestore
      const cloudJob = await lookupCloudPrintJob(targetOtp);
      if (cloudJob) {
        return res.json({ success: true, job: cloudJob });
      }

      // 2. Secondary Lookup in local SQLite
      if (localDb) {
        const result = localDb.exec(
          `SELECT * FROM print_jobs WHERE otp = ? OR TRIM(otp) = ? OR id = ? OR customer_phone = ? ORDER BY CASE WHEN status = 'pending' THEN 0 WHEN status = 'received' THEN 1 ELSE 2 END, created_at DESC LIMIT 1`,
          [targetOtp, targetOtp, rawParam, rawParam]
        );

        if (result.length > 0 && result[0].values.length > 0) {
          const cols = result[0].columns;
          const vals = result[0].values[0];
          const jobObj: any = {};
          cols.forEach((col: string, i: number) => {
            jobObj[col] = vals[i];
          });

          const filesResult = localDb.exec('SELECT * FROM job_files WHERE job_id = ?', [jobObj.id]);
          const fileRows: any[] = [];
          if (filesResult.length > 0) {
            const fCols = filesResult[0].columns;
            filesResult[0].values.forEach((row: any[]) => {
              const fObj: any = {};
              fCols.forEach((fc: string, idx: number) => {
                fObj[fc] = row[idx];
              });
              fileRows.push({
                id: fObj.id,
                originalName: fObj.original_name,
                mimeType: fObj.mime_type,
                size: Number(fObj.size_bytes),
                storedFilename: fObj.stored_filename,
                pageCount: Number(fObj.page_count),
                url: `/api/files/${fObj.id}`,
                downloadUrl: `/api/files/${fObj.id}/download`,
              });
            });
          }

          const fallbackJob: StoredJobResult = {
            id: jobObj.id,
            otp: jobObj.otp,
            customerName: jobObj.customer_name || 'Customer',
            customerPhone: jobObj.customer_phone || '',
            files: fileRows,
            settings: {
              copies: Number(jobObj.copies),
              colorMode: jobObj.color_mode,
              paperSize: jobObj.paper_size,
              duplex: jobObj.duplex,
              binding: jobObj.binding,
              orientation: jobObj.orientation || 'portrait',
              scale: jobObj.scale || 'fit',
              estimatedPagesPerDoc: Number(jobObj.estimated_pages_per_doc),
              notes: jobObj.notes || '',
            },
            pricing: {
              currency: jobObj.currency,
              baseRatePerPage: Number(jobObj.unit_price),
              totalPages: Number(jobObj.total_pages),
              copies: Number(jobObj.copies),
              paperMultiplier: jobObj.paper_size === 'A3' ? 2.0 : 1.0,
              duplexMultiplier: jobObj.duplex === 'double' ? 0.9 : 1.0,
              bindingFee: Number(jobObj.binding_fee),
              subtotal: Number(jobObj.subtotal),
              totalPrice: Number(jobObj.total_price),
            },
            status: jobObj.status,
            paymentStatus: jobObj.payment_status,
            createdAt: jobObj.created_at,
            printedAt: jobObj.printed_at || undefined,
            notes: jobObj.notes || '',
          };

          // Synchronize to Cloud SQL so future queries hit Cloud SQL immediately
          createCloudPrintJob({
            id: fallbackJob.id,
            otp: fallbackJob.otp,
            customerName: fallbackJob.customerName,
            customerPhone: fallbackJob.customerPhone,
            files: fallbackJob.files,
            settings: fallbackJob.settings,
            pricing: fallbackJob.pricing,
            notes: fallbackJob.notes,
          }).catch(console.warn);

          return res.json({ success: true, job: fallbackJob });
        }
      }

      // Return clean JSON instead of 404 to avoid proxy/Cloud Run HTML error page interception
      return res.json({ success: false, job: null, error: `No active print job found for OTP ${targetOtp}` });
    } catch (err: any) {
      console.error('OTP lookup error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Lookup failed' });
    }
  });

  // Sync job endpoint (Cross-network sync to Cloud SQL)
  app.post('/api/jobs/sync', async (req, res) => {
    try {
      const job = req.body;
      if (!job || !job.id || !job.otp) {
        return res.status(400).json({ error: 'Invalid job payload for sync' });
      }

      const cloudJob = await createCloudPrintJob({
        id: job.id,
        otp: String(job.otp),
        customerName: job.customerName || 'Customer',
        customerPhone: job.customerPhone,
        files: job.files || [],
        settings: job.settings || {},
        pricing: job.pricing || {},
        notes: job.notes,
      });

      res.json({ success: true, synced: true, job: cloudJob });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Sync failed' });
    }
  });

  // Batch status lookup for customer recent jobs
  app.post('/api/jobs/batch-status', async (req, res) => {
    try {
      const { otps = [], ids = [] } = req.body;
      const otpSet = new Set((otps || []).map((o: any) => String(o).trim()));
      const idSet = new Set((ids || []).map((i: any) => String(i).trim()));

      if (otpSet.size === 0 && idSet.size === 0) {
        return res.json({ success: true, jobs: [] });
      }

      // Fetch all jobs and filter
      const allJobs = await listCloudPrintJobs();
      const matched = allJobs.filter(
        (j) => otpSet.has(String(j.otp)) || idSet.has(String(j.id))
      );

      return res.json({ success: true, jobs: matched });
    } catch (err: any) {
      console.warn('Batch status lookup error:', err);
      return res.status(500).json({ error: err.message || 'Batch lookup failed' });
    }
  });

  // Get all print jobs (Real-time Cloud SQL query with optional filters)
  app.get('/api/jobs', async (req, res) => {
    try {
      const { status, search, shop } = req.query;

      // Isolated Demo Sandbox Mode Queue Check
      if (shop) {
        const cleanShop = String(shop).trim().toLowerCase();
        if (
          cleanShop === 'demo-sandbox-shop' ||
          cleanShop === 'demo-shop' ||
          cleanShop === 'shop_demo_sandbox'
        ) {
          let demoJobs = getDemoModeState().jobs;
          if (status) {
            demoJobs = demoJobs.filter((j) => j.status === String(status));
          }
          if (search) {
            const s = String(search).toLowerCase();
            demoJobs = demoJobs.filter(
              (j) =>
                j.customerName.toLowerCase().includes(s) ||
                j.otp.includes(s) ||
                (j.files && j.files.some((f) => f.originalName.toLowerCase().includes(s)))
            );
          }
          return res.json({ success: true, jobs: demoJobs });
        }
      }

      let jobs = await listCloudPrintJobs(
        status ? String(status) : undefined,
        search ? String(search) : undefined
      );

      if (shop && String(shop) !== 'all') {
        const cleanShop = String(shop).trim().toLowerCase();
        jobs = jobs.filter((j) => {
          const sSlug = (j.shopSlug || (j.settings && j.settings.shopSlug) || '').toLowerCase();
          const sId = (j.shopId || (j.settings && j.settings.shopId) || '').toLowerCase();
          return sSlug === cleanShop || sId === cleanShop;
        });
      }

      res.json({ success: true, jobs });
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch jobs' });
    }
  });

  // Single job details
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await getCloudPrintJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch job' });
    }
  });

  // Update job status / payment status (Updates Cloud SQL PostgreSQL)
  app.patch('/api/jobs/:id', async (req, res) => {
    let { id } = req.params;
    const { status, paymentStatus, paymentMethod, notes } = req.body;

    try {
      // If updating a demo job
      if (id.startsWith('demo_') || getDemoModeState().jobs.some((j) => j.id === id || j.otp === id)) {
        const updatedDemo = updateDemoJobStatus(id, { status, paymentStatus });
        if (updatedDemo) {
          return res.json({ success: true, job: updatedDemo });
        }
      }

      // If 4-digit OTP provided instead of full UUID, resolve to job ID
      if (/^\d{4}$/.test(id)) {
        const found = await lookupCloudPrintJob(id);
        if (found) {
          id = found.id;
        }
      }

      let combinedNotes = notes;
      if (paymentMethod && (!combinedNotes || combinedNotes.trim() === '')) {
        if (paymentMethod.includes('online') || paymentMethod.includes('upi') || paymentMethod.includes('gpay')) {
          combinedNotes = `Paid online via ${paymentMethod === 'online_gpay' ? 'Google Pay (GPay)' : paymentMethod.replace('online_', '').toUpperCase()}`;
        } else {
          combinedNotes = 'Paid in Cash at Counter (Offline)';
        }
      }

      let updatedJob = await updatePersistentJobStatus(id, {
        status,
        paymentStatus,
        paymentMethod,
        notes: combinedNotes,
      });

      if (!updatedJob) {
        // Fallback lookup by id or otp
        const found = await lookupPersistentJob(id);
        if (found) {
          updatedJob = await updatePersistentJobStatus(found.id, {
            status,
            paymentStatus,
            paymentMethod,
            notes: combinedNotes,
          });
        }
      }

      if (!updatedJob) {
        return res.status(404).json({ error: 'Job not found', requestedId: id, body: req.body });
      }

      // Sync with local SQLite if present
      if (localDb) {
        try {
          const updates: string[] = [];
          const params: any[] = [];
          if (status) {
            updates.push('status = ?');
            params.push(status);
            if (status === 'printed') {
              updates.push('printed_at = ?');
              params.push(new Date().toISOString());
            }
          }
          if (paymentStatus) {
            updates.push('payment_status = ?');
            params.push(paymentStatus);
          }
          if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
          }
          if (updates.length > 0) {
            params.push(id);
            localDb.run(`UPDATE print_jobs SET ${updates.join(', ')} WHERE id = ?`, params);
            saveDbToDisk();
          }
        } catch (sqliteErr) {
          // ignore
        }
      }

      res.json({ success: true, job: updatedJob });
    } catch (err: any) {
      console.error('Error updating job:', err);
      res.status(500).json({ error: err.message || 'Failed to update job' });
    }
  });

  // Delete a job
  app.delete(['/api/jobs/:id', '/api/jobs/:id/'], async (req, res) => {
    const { id } = req.params;
    try {
      await deleteCloudPrintJob(id);

      if (localDb) {
        try {
          localDb.run('DELETE FROM job_files WHERE job_id = ?', [id]);
          localDb.run('DELETE FROM print_jobs WHERE id = ?', [id]);
          saveDbToDisk();
        } catch (e) {
          // ignore
        }
      }

      res.json({ success: true, message: 'Job deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete job' });
    }
  });

  // File serving / viewing (Cross-instance Cloud SQL fallback)
  app.get('/api/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    try {
      const fileRecord = await getCloudFile(fileId);
      if (!fileRecord) {
        return res.status(404).send('File not found in database');
      }

      const safeFilename = path.basename(fileRecord.storedFilename);
      const filePath = path.join(UPLOAD_DIR, safeFilename);

      // Check if file exists on local disk
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(fileRecord.originalName)}"`
        );
        return res.sendFile(filePath);
      }

      // If not on local disk (multi-device or restarted container), serve from Cloud SQL base64!
      if (fileRecord.dataBase64) {
        const fileBuffer = Buffer.from(fileRecord.dataBase64, 'base64');
        // Cache to local disk for fast subsequent reads
        try {
          fs.writeFileSync(filePath, fileBuffer);
        } catch (e) {
          // ignore write error
        }

        res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(fileRecord.originalName)}"`
        );
        return res.send(fileBuffer);
      }

      return res.status(404).send('File content unavailable');
    } catch (err: any) {
      console.error('Error serving file:', err);
      res.status(500).send('Internal file error');
    }
  });

  // File downloading (Cross-instance Cloud SQL fallback)
  app.get('/api/files/:fileId/download', async (req, res) => {
    const { fileId } = req.params;
    try {
      const fileRecord = await getCloudFile(fileId);
      if (!fileRecord) {
        return res.status(404).send('File not found in database');
      }

      const safeFilename = path.basename(fileRecord.storedFilename);
      const filePath = path.join(UPLOAD_DIR, safeFilename);

      if (fs.existsSync(filePath)) {
        return res.download(filePath, fileRecord.originalName);
      }

      if (fileRecord.dataBase64) {
        const fileBuffer = Buffer.from(fileRecord.dataBase64, 'base64');
        try {
          fs.writeFileSync(filePath, fileBuffer);
        } catch (e) {
          // ignore write error
        }

        res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`
        );
        return res.send(fileBuffer);
      }

      return res.status(404).send('File content unavailable');
    } catch (err: any) {
      res.status(500).send('Internal file download error');
    }
  });

  // Income & Analytics Endpoint (Real-time Cloud SQL calculations)
  app.get('/api/analytics', async (req, res) => {
    try {
      const { shop } = req.query;
      let allJobs = await listCloudPrintJobs('all');

      if (shop && String(shop) !== 'all') {
        const cleanShop = String(shop).trim().toLowerCase();
        allJobs = allJobs.filter((j) => {
          const sSlug = (j.shopSlug || (j.settings && j.settings.shopSlug) || '').toLowerCase();
          const sId = (j.shopId || (j.settings && j.settings.shopId) || '').toLowerCase();
          return sSlug === cleanShop || sId === cleanShop;
        });
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const weekStr = startOfWeek.toISOString().split('T')[0];

      let totalRevenue = 0;
      let todayRevenue = 0;
      let thisWeekRevenue = 0;
      let todayJobs = 0;
      let totalPagesPrinted = 0;
      let bwRevenue = 0;
      let colorRevenue = 0;
      let unpaidTotal = 0;

      // Online (UPI / GPay / QR) vs Offline (Cash at Counter) revenue tracking
      let onlineRevenue = 0;
      let offlineRevenue = 0;
      let todayOnlineRevenue = 0;
      let todayOfflineRevenue = 0;
      let onlineJobsCount = 0;
      let offlineJobsCount = 0;
      let todayOnlineJobs = 0;
      let todayOfflineJobs = 0;
      const recentPayments: any[] = [];

      const dailyMap = new Map<string, { revenue: number; jobs: number; onlineRevenue: number; offlineRevenue: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, { revenue: 0, jobs: 0, onlineRevenue: 0, offlineRevenue: 0 });
      }

      for (const job of allJobs) {
        if (job.status === 'cancelled') continue;

        const price = Number(job.pricing?.totalPrice) || 0;
        const status = job.status;
        const paymentStatus = job.paymentStatus;
        const colorMode = job.settings?.colorMode || 'bw';
        const copies = Number(job.settings?.copies) || 1;
        const totalPages = Number(job.pricing?.totalPages) || 1;
        const dateStr = (job.createdAt || '').split('T')[0];

        const method = String(job.paymentMethod || '').toLowerCase();
        const notes = String(job.notes || '').toLowerCase();
        const isOnline =
          method.includes('online') ||
          method.includes('upi') ||
          method.includes('gpay') ||
          method.includes('phonepe') ||
          method.includes('paytm') ||
          notes.includes('online') ||
          notes.includes('gpay') ||
          notes.includes('upi') ||
          notes.includes('phonepe') ||
          notes.includes('paytm');

        totalRevenue += price;
        if (paymentStatus === 'unpaid') {
          unpaidTotal += price;
        } else if (paymentStatus === 'paid') {
          if (isOnline) {
            onlineRevenue += price;
            onlineJobsCount++;
            if (dateStr === todayStr) {
              todayOnlineRevenue += price;
              todayOnlineJobs++;
            }
          } else {
            offlineRevenue += price;
            offlineJobsCount++;
            if (dateStr === todayStr) {
              todayOfflineRevenue += price;
              todayOfflineJobs++;
            }
          }

          recentPayments.push({
            id: job.id,
            otp: job.otp,
            customerName: job.customerName || 'Customer',
            amount: Math.round(price * 100) / 100,
            paymentMethod: isOnline ? 'online' : 'offline',
            methodDetail: isOnline ? (method.includes('gpay') || notes.includes('gpay') ? 'Google Pay (UPI)' : 'Online UPI') : 'Cash at Counter',
            time: job.createdAt,
            colorMode,
            copies,
          });
        }

        if (dateStr === todayStr) {
          todayRevenue += price;
          todayJobs++;
        }

        if (dateStr >= weekStr) {
          thisWeekRevenue += price;
        }

        if (colorMode === 'color') {
          colorRevenue += price;
        } else {
          bwRevenue += price;
        }

        if (status === 'printed' || status === 'collected') {
          totalPagesPrinted += totalPages * copies;
        }

        if (dailyMap.has(dateStr)) {
          const item = dailyMap.get(dateStr)!;
          item.revenue += price;
          item.jobs += 1;
          if (paymentStatus === 'paid') {
            if (isOnline) {
              item.onlineRevenue += price;
            } else {
              item.offlineRevenue += price;
            }
          }
        }
      }

      // Sort recent payments descending by time, keep top 15
      recentPayments.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
      const topRecentPayments = recentPayments.slice(0, 15);

      const dailyRevenue = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        jobs: data.jobs,
        onlineRevenue: Math.round(data.onlineRevenue * 100) / 100,
        offlineRevenue: Math.round(data.offlineRevenue * 100) / 100,
      }));

      res.json({
        success: true,
        analytics: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
          totalJobs: allJobs.length,
          todayJobs,
          totalPagesPrinted,
          bwRevenue: Math.round(bwRevenue * 100) / 100,
          colorRevenue: Math.round(colorRevenue * 100) / 100,
          unpaidTotal: Math.round(unpaidTotal * 100) / 100,
          // Online vs Offline Income
          onlineRevenue: Math.round(onlineRevenue * 100) / 100,
          offlineRevenue: Math.round(offlineRevenue * 100) / 100,
          todayOnlineRevenue: Math.round(todayOnlineRevenue * 100) / 100,
          todayOfflineRevenue: Math.round(todayOfflineRevenue * 100) / 100,
          onlineJobsCount,
          offlineJobsCount,
          todayOnlineJobs,
          todayOfflineJobs,
          dailyRevenue,
          recentPayments: topRecentPayments,
        },
      });
    } catch (err: any) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: err.message || 'Analytics failed' });
    }
  });

  // Guaranteed JSON 404 handler for any unmatched API route to prevent HTML fallthrough
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  return app;
}

export async function startServer() {
  const app = await createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite integration
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Print Shop Server running with Cloud SQL at http://localhost:${PORT}`);
    });
  }

  return app;
}

if (!process.env.VERCEL) {
  startServer();
}
