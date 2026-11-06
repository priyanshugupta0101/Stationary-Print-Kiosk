import type { PrintJob, UploadedFileMeta, CustomerPrintSettings, PricingBreakdown } from '../src/types.ts';
import { getDemoShop, resetDemoShop } from './shopsStore.ts';

export interface DemoFinancials {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayJobsCount: number;
  totalSimulatedJobs: number;
  totalSimulatedRevenue: number;
  onlineUpiRevenue: number;
  cashRevenue: number;
  onlineUpiPercentage: number;
  bwPagesPrinted: number;
  colorPagesPrinted: number;
  spiralBindingsCount: number;
  stapledSetsCount: number;
  estimatedConsumablesCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageOrderValue: number;
  hourlyRush: {
    hour: string;
    orders: number;
    revenue: number;
  }[];
}

const DEFAULT_DEMO_FINANCIALS: DemoFinancials = {
  todayRevenue: 3840,
  yesterdayRevenue: 2950,
  todayJobsCount: 38,
  totalSimulatedJobs: 142,
  totalSimulatedRevenue: 24650,
  onlineUpiRevenue: 2890,
  cashRevenue: 950,
  onlineUpiPercentage: 75.3,
  bwPagesPrinted: 1842,
  colorPagesPrinted: 318,
  spiralBindingsCount: 24,
  stapledSetsCount: 45,
  estimatedConsumablesCost: 1114,
  grossProfit: 2726,
  grossMarginPercent: 71.0,
  averageOrderValue: 101.05,
  hourlyRush: [
    { hour: '09:00 AM', orders: 3, revenue: 210 },
    { hour: '10:00 AM', orders: 6, revenue: 540 },
    { hour: '11:00 AM', orders: 11, revenue: 1120 }, // Morning rush peak
    { hour: '12:00 PM', orders: 8, revenue: 760 },
    { hour: '01:00 PM', orders: 4, revenue: 380 },
    { hour: '02:00 PM', orders: 5, revenue: 490 },
    { hour: '03:00 PM', orders: 7, revenue: 670 },
    { hour: '04:00 PM', orders: 12, revenue: 1240 }, // Evening rush peak
    { hour: '05:00 PM', orders: 9, revenue: 880 },
    { hour: '06:00 PM', orders: 6, revenue: 560 },
  ],
};

const makeDemoFile = (id: string, name: string, pageCount: number, size: number): UploadedFileMeta => ({
  id,
  originalName: name,
  mimeType: 'application/pdf',
  size,
  storedFilename: `${id}_${name}`,
  pageCount,
  url: '#',
  downloadUrl: '#',
});

const makeDemoPricing = (
  totalPages: number,
  copies: number,
  baseRatePerPage: number,
  bindingFee: number
): PricingBreakdown => {
  const subtotal = totalPages * copies * baseRatePerPage;
  return {
    currency: '₹',
    baseRatePerPage,
    totalPages,
    copies,
    paperMultiplier: 1.0,
    duplexMultiplier: 1.0,
    bindingFee,
    subtotal,
    totalPrice: Math.round(subtotal + bindingFee),
  };
};

const DEFAULT_DEMO_JOBS: PrintJob[] = [
  {
    id: 'demo_job_1',
    otp: '4821',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Aarav Sharma (B.Tech Final Year)',
    customerPhone: '+91 98765 11223',
    status: 'pending',
    paymentStatus: 'paid',
    paymentMethod: 'online_gpay',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_1', 'BTech_Project_Final_Report_v4.pdf', 48, 3450000)],
    settings: {
      copies: 2,
      colorMode: 'bw',
      paperSize: 'A4',
      duplex: 'double',
      binding: 'spiral',
      estimatedPagesPerDoc: 48,
      notes: 'Please bind with transparent plastic sheet on front & dark card back.',
    },
    pricing: makeDemoPricing(48, 2, 2, 30),
  },
  {
    id: 'demo_job_2',
    otp: '7392',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Pooja Verma (Architecture Dept)',
    customerPhone: '+91 98222 55441',
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_2', 'Elevation_Designs_A3_Render.pdf', 6, 8900000)],
    settings: {
      copies: 1,
      colorMode: 'color',
      paperSize: 'A3',
      duplex: 'single',
      binding: 'none',
      estimatedPagesPerDoc: 6,
      notes: 'Need high-density color on 120gsm paper. Waiting at counter.',
    },
    pricing: makeDemoPricing(6, 1, 10, 0),
  },
  {
    id: 'demo_job_3',
    otp: '1054',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Dr. K. Raman (Faculty Physics)',
    customerPhone: '+91 98333 77889',
    status: 'pending',
    paymentStatus: 'paid',
    paymentMethod: 'online_phonepe',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_3', 'Quantum_Optics_Unit3_Notes.pdf', 16, 1800000)],
    settings: {
      copies: 3,
      colorMode: 'bw',
      paperSize: 'A4',
      duplex: 'double',
      binding: 'staple',
      estimatedPagesPerDoc: 16,
      notes: 'Corner staple top left. 3 separate bundles for tutorial session.',
    },
    pricing: makeDemoPricing(16, 3, 2, 5),
  },
  {
    id: 'demo_job_4',
    otp: '6310',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Meera Iyer (Biotech M.Sc)',
    customerPhone: '+91 98444 33221',
    status: 'printed',
    paymentStatus: 'paid',
    paymentMethod: 'online_paytm',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_4', 'Microbiology_Culture_Charts.pdf', 12, 4200000)],
    settings: {
      copies: 1,
      colorMode: 'color',
      paperSize: 'A4',
      duplex: 'single',
      binding: 'none',
      estimatedPagesPerDoc: 12,
      notes: 'Full color diagrams. Already printed, currently placed in pickup tray #2.',
    },
    pricing: makeDemoPricing(12, 1, 10, 0),
  },
  {
    id: 'demo_job_5',
    otp: '8549',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Rohan Gupta (Campus Resident)',
    customerPhone: '+91 98555 99887',
    status: 'printed',
    paymentStatus: 'unpaid',
    paymentMethod: 'counter',
    createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_5', 'Aadhar_Passport_Visa_Application.pdf', 5, 950000)],
    settings: {
      copies: 2,
      colorMode: 'bw',
      paperSize: 'A4',
      duplex: 'single',
      binding: 'staple',
      estimatedPagesPerDoc: 5,
      notes: 'Ready for customer pickup. Collect ₹25 cash upon delivery.',
    },
    pricing: makeDemoPricing(5, 2, 2, 5),
  },
  {
    id: 'demo_job_6',
    otp: '3190',
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: 'Sneha Kulkarni',
    customerPhone: '+91 98666 44332',
    status: 'collected',
    paymentStatus: 'paid',
    paymentMethod: 'counter',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    files: [makeDemoFile('f_demo_6', 'Internship_Offer_Letter_NDA.pdf', 4, 620000)],
    settings: {
      copies: 1,
      colorMode: 'bw',
      paperSize: 'A4',
      duplex: 'single',
      binding: 'none',
      estimatedPagesPerDoc: 4,
      notes: 'Order collected and settled at 10:15 AM.',
    },
    pricing: makeDemoPricing(4, 1, 2, 0),
  },
];

let inMemoryDemoJobs: PrintJob[] = JSON.parse(JSON.stringify(DEFAULT_DEMO_JOBS));
let inMemoryDemoFinancials: DemoFinancials = JSON.parse(JSON.stringify(DEFAULT_DEMO_FINANCIALS));

export function getDemoModeState() {
  return {
    isDemoMode: true,
    shop: getDemoShop(),
    jobs: inMemoryDemoJobs,
    financials: inMemoryDemoFinancials,
  };
}

export function resetDemoModeState() {
  resetDemoShop();
  inMemoryDemoJobs = JSON.parse(JSON.stringify(DEFAULT_DEMO_JOBS));
  inMemoryDemoFinancials = JSON.parse(JSON.stringify(DEFAULT_DEMO_FINANCIALS));
  return getDemoModeState();
}

export function addDemoJob(jobData: Partial<PrintJob>): PrintJob {
  const otp = jobData.otp || Math.floor(1000 + Math.random() * 9000).toString();
  const id = jobData.id || `demo_job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const pages = jobData.settings?.estimatedPagesPerDoc || 10;
  const copies = jobData.settings?.copies || 1;
  const colorMode = jobData.settings?.colorMode || 'bw';
  const baseRate = colorMode === 'color' ? 10 : 2;
  const bindingFee = jobData.settings?.binding === 'spiral' ? 30 : jobData.settings?.binding === 'staple' ? 5 : 0;

  const newJob: PrintJob = {
    id,
    otp,
    shopSlug: 'demo-sandbox-shop',
    shopId: 'shop_demo_sandbox',
    customerName: jobData.customerName || 'Demo Student',
    customerPhone: jobData.customerPhone || '+91 98765 00000',
    status: (jobData.status as any) || 'pending',
    paymentStatus: (jobData.paymentStatus as any) || 'paid',
    paymentMethod: jobData.paymentMethod || 'online_gpay',
    createdAt: new Date().toISOString(),
    files: (jobData.files && jobData.files.length > 0)
      ? jobData.files
      : [makeDemoFile(`f_${id}`, 'Simulated_Document.pdf', pages, 1500000)],
    settings: {
      copies,
      colorMode,
      paperSize: jobData.settings?.paperSize || 'A4',
      duplex: jobData.settings?.duplex || 'single',
      binding: jobData.settings?.binding || 'none',
      estimatedPagesPerDoc: pages,
      notes: jobData.settings?.notes || 'Simulated order via Demo Mode',
    },
    pricing: jobData.pricing || makeDemoPricing(pages, copies, baseRate, bindingFee),
  };

  // Prepend to top of queue
  inMemoryDemoJobs = [newJob, ...inMemoryDemoJobs];

  // Update sample financial stats
  inMemoryDemoFinancials.todayJobsCount += 1;
  inMemoryDemoFinancials.totalSimulatedJobs += 1;
  const addedPrice = newJob.pricing?.totalPrice || 20;
  inMemoryDemoFinancials.todayRevenue += addedPrice;
  inMemoryDemoFinancials.totalSimulatedRevenue += addedPrice;
  if (newJob.paymentStatus === 'paid') {
    inMemoryDemoFinancials.onlineUpiRevenue += addedPrice;
  } else {
    inMemoryDemoFinancials.cashRevenue += addedPrice;
  }
  if (colorMode === 'color') {
    inMemoryDemoFinancials.colorPagesPrinted += pages * copies;
  } else {
    inMemoryDemoFinancials.bwPagesPrinted += pages * copies;
  }

  return newJob;
}

export function updateDemoJobStatus(
  jobIdOrOtp: string,
  updates: { status?: 'pending' | 'printed' | 'collected'; paymentStatus?: 'paid' | 'unpaid' }
): PrintJob | null {
  const clean = jobIdOrOtp.trim().toLowerCase();
  const index = inMemoryDemoJobs.findIndex(
    (j) => j.id.toLowerCase() === clean || j.otp === clean
  );
  if (index === -1) return null;

  const current = inMemoryDemoJobs[index];
  const updated: PrintJob = {
    ...current,
    status: updates.status || current.status,
    paymentStatus: updates.paymentStatus || current.paymentStatus,
  };
  inMemoryDemoJobs[index] = updated;
  return updated;
}
