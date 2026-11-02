export interface UploadedFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  storedFilename: string;
  pageCount: number;
  url: string;
  downloadUrl: string;
}

export type ColorMode = 'bw' | 'color';
export type PaperSize = 'A4' | 'A3' | 'Letter' | 'Legal';
export type DuplexMode = 'single' | 'double';
export type BindingOption = 'none' | 'staple' | 'spiral';
export type OrientationOption = 'portrait' | 'landscape'; // Vertical (portrait) or Horizontal (landscape)
export type ScaleOption = 'fit' | 'original'; // Fit to paper or Original size
export type JobStatus = 'pending' | 'received' | 'printed' | 'collected' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'counter' | 'online_gpay' | 'online_phonepe' | 'online_paytm' | 'online_upi';

export interface CustomerPrintSettings {
  copies: number;
  colorMode: ColorMode;
  paperSize: PaperSize;
  duplex: DuplexMode;
  binding: BindingOption;
  orientation?: OrientationOption;
  scale?: ScaleOption;
  estimatedPagesPerDoc: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  shopSlug?: string;
  shopId?: string;
}

export type PrintSettings = CustomerPrintSettings;

export interface PricingBreakdown {
  currency: string;
  baseRatePerPage: number;
  totalPages: number;
  copies: number;
  paperMultiplier: number;
  duplexMultiplier: number;
  bindingFee: number;
  subtotal: number;
  totalPrice: number;
}

export interface PrintJob {
  id: string;
  otp: string;
  shopId?: string;
  shopSlug?: string;
  customerName: string;
  customerPhone?: string;
  files: UploadedFileMeta[];
  settings: CustomerPrintSettings;
  pricing: PricingBreakdown;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  printedAt?: string;
  notes?: string;
}

export interface ShopSettings {
  shopId?: string;
  shopSlug?: string;
  shopName: string;
  tagline: string;
  currency: string;
  bwPricePerPage: number;
  colorPricePerPage: number;
  a3Multiplier: number;
  doubleSidedDiscountPercent: number; // e.g. 10% off for 2nd side
  stapleFee: number;
  spiralFee: number;
  ownerPin: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  shopAddress?: string;
  enableOnlinePayments?: boolean; // Toggle for GPay / UPI online payments
  upiId?: string; // VPA e.g. copyprint@okhdfcbank
  upiPayeeName?: string; // Payee/Merchant name shown in GPay
  upiAccountType?: 'personal' | 'merchant'; // 'personal' (FamPay/P2P) or 'merchant' (Business current account)
  customQrCodeUrl?: string; // Optional custom QR code image
  status?: ShopStatus;
  isSuspended?: boolean;
  suspensionReason?: string;
  hasPin?: boolean;
  // 7-Day Free Trial Configuration & State
  isTrial?: boolean;
  trialStartDate?: string;
  trialDurationDays?: number;
  trialEndsAt?: string;
  isTrialExpired?: boolean;
  daysLeftInTrial?: number;
  hoursLeftInTrial?: number;
  contactAdmin?: {
    name: string;
    phone: string;
    email: string;
    whatsappNumber: string;
    serviceProviderTitle?: string;
    customNote?: string;
  };
}

export type ShopPlan = 'four_day_trial' | 'free_trial' | 'starter' | 'pro' | 'enterprise';
export type ShopStatus = 'active' | 'trial' | 'suspended';
export type PrintExecutionMode = 'automatic' | 'manual';

export interface ShopTenant {
  id: string;
  slug: string; // URL-safe slug e.g. "metro-xerox"
  name: string;
  ownerName: string;
  tagline: string;
  phone: string;
  email: string;
  whatsappNumber?: string;
  address: string;
  status: ShopStatus;
  suspensionReason?: string;
  plan: ShopPlan;
  createdAt: string;
  lastActiveAt?: string;
  totalJobsCount?: number;
  totalRevenue?: number;
  // 7-Day Free Trial Configuration & State
  isTrial?: boolean;
  trialStartDate?: string;
  trialDurationDays?: number;
  trialEndsAt?: string;
  isTrialExpired?: boolean;
  daysLeftInTrial?: number;
  hoursLeftInTrial?: number;
  settings: ShopSettings;
}

export interface SuperAdminStats {
  totalShops: number;
  activeShops: number;
  trialShops: number;
  expiredTrialShops: number;
  totalPlatformJobs: number;
  totalPlatformRevenue: number;
  totalPrintedPages: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  todayRevenue: number;
  thisWeekRevenue: number;
  totalJobs: number;
  todayJobs: number;
  totalPagesPrinted: number;
  bwRevenue: number;
  colorRevenue: number;
  unpaidTotal: number;
  // Online Income (UPI / GPay / PhonePe / QR) vs Offline Income (Cash at Counter)
  onlineRevenue: number;
  offlineRevenue: number;
  todayOnlineRevenue: number;
  todayOfflineRevenue: number;
  onlineJobsCount: number;
  offlineJobsCount: number;
  todayOnlineJobs: number;
  todayOfflineJobs: number;
  dailyRevenue: {
    date: string;
    revenue: number;
    jobs: number;
    onlineRevenue?: number;
    offlineRevenue?: number;
  }[];
  recentPayments?: {
    id: string;
    otp: string;
    customerName: string;
    amount: number;
    paymentMethod: 'online' | 'offline';
    methodDetail: string;
    time: string;
    colorMode: string;
    copies: number;
  }[];
}
