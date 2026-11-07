import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Store,
  Sparkles,
  QrCode,
  Smartphone,
  Play,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  FileText,
  Lock,
  KeyRound,
  ArrowRight,
  MessageCircle,
  BarChart3,
  Power,
  PowerOff,
  AlertTriangle,
  Zap,
  FileDown,
  Clock,
  Hourglass,
  Calendar,
  RotateCcw,
  Database,
  PhoneCall,
  Mail,
  Headphones,
} from 'lucide-react';
import { ShopTenant, SuperAdminStats } from '../../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CounterStandeeModal } from './CounterStandeeModal';
import { EditShopModal } from './EditShopModal';
import { ManageSubscriptionModal } from './ManageSubscriptionModal';
import { ShopGeneratorWizard } from './ShopGeneratorWizard';
import { LiveDemoShowcase } from './LiveDemoShowcase';
import { DemoModeSandbox } from './DemoModeSandbox';
import { ResetDataModal } from './ResetDataModal';
import { generateAndDownloadShopReportPdf } from '../../utils/shopReportPdf';
import { calculateTrialRemaining } from '../../utils/trialHelper';

interface SuperAdminViewProps {
  onNavigateToCustomer: (shopSlug: string) => void;
  onNavigateToOwner: (shopSlug: string) => void;
  initialAuthenticated?: boolean;
}

export type SuperAdminTab = 'shops' | 'generate' | 'standee' | 'demo' | 'analytics' | 'demo_sandbox' | 'helpline';

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  onNavigateToCustomer,
  onNavigateToOwner,
  initialAuthenticated = false,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialAuthenticated));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('shops');

  // Demo Mode Sandbox Toggle (Simulate pre-configured dummy shop without affecting real shops)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('super_admin_demo_mode') === 'true';
    }
    return false;
  });

  const handleToggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('super_admin_demo_mode', enabled ? 'true' : 'false');
    }
    if (enabled) {
      setActiveTab('demo_sandbox');
      showToast('✨ Demo Sandbox Mode activated! Simulating Apex Digital Prints dummy shop.');
    } else {
      if (activeTab === 'demo_sandbox') {
        setActiveTab('shops');
      }
      showToast('Demo Mode disabled. Returned to live production shops.');
    }
  };

  // Multi-shop data
  const [shops, setShops] = useState<ShopTenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');

  // Modals & Selected Shop
  const [selectedShopForStandee, setSelectedShopForStandee] = useState<ShopTenant | null>(null);
  const [selectedShopForEdit, setSelectedShopForEdit] = useState<ShopTenant | null>(null);
  const [selectedShopForSubscription, setSelectedShopForSubscription] = useState<ShopTenant | null>(null);
  const [activeDemoShop, setActiveDemoShop] = useState<ShopTenant | null>(null);
  const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);

  // Free trial & Report operations
  const [downloadingReportSlug, setDownloadingReportSlug] = useState<string | null>(null);
  const [extendingTrialSlug, setExtendingTrialSlug] = useState<string | null>(null);
  const [convertingPlanSlug, setConvertingPlanSlug] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Platform Provider Helpline & Support Details
  const [contactData, setContactData] = useState({
    name: 'Priyanshu Gupta',
    phone: '+91 98765 00111',
    email: 'guptapriyanshu0101@gmail.com',
    whatsappNumber: '+91 98765 00111',
    serviceProviderTitle: 'Platform Service Provider & Super Admin',
    customNote: 'Please contact the service provider to renew your shop subscription, extend your free trial, or reactivate your kiosk services.',
  });
  const [savingContact, setSavingContact] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const loadContactData = async () => {
    try {
      const res = await fetch('/api/super-admin/contact');
      if (res.ok) {
        const data = await res.json();
        if (data.contact) {
          setContactData({
            name: data.contact.name || '',
            phone: data.contact.phone || '',
            email: data.contact.email || '',
            whatsappNumber: data.contact.whatsappNumber || '',
            serviceProviderTitle: data.contact.serviceProviderTitle || 'Platform Service Provider & Super Admin',
            customNote: data.contact.customNote || '',
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load contact data:', e);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await fetch('/api/super-admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: '145214',
          ...contactData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Helpline & Service Provider support details updated and saved successfully!');
      } else {
        showToast(data.error || 'Failed to save contact details');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving contact details');
    } finally {
      setSavingContact(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadShops();
    loadStats();
    loadContactData();

    // Real-time synchronization across multiple devices via Cloud Firestore
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        collection(db, 'shops'),
        (snapshot) => {
          const liveShops: ShopTenant[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ShopTenant;
            if (data && (data.id || data.slug || docSnap.id)) {
              const trialCalc = calculateTrialRemaining(data);
              liveShops.push({
                ...data,
                id: data.id || docSnap.id,
                slug: data.slug || docSnap.id,
                daysLeftInTrial: trialCalc.daysLeft,
                hoursLeftInTrial: trialCalc.hoursLeft,
                isTrialExpired: trialCalc.isTrialExpired,
              });
            }
          });
          if (liveShops.length > 0) {
            liveShops.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setShops(liveShops);
          }
        },
        (error) => {
          console.warn('Real-time Firestore sync error in SuperAdmin:', error);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated]);

  // Verify Super Admin PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const clean = pinInput.trim();
    if (!clean) return;

    setVerifying(true);
    try {
      const res = await fetch('/api/super-admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        loadShops();
        loadStats();
      } else {
        setPinError(data.error || 'Incorrect Super Admin PIN.');
      }
    } catch (err: any) {
      // Local fallback for offline/preview
      if (clean === '145214' || clean === 'PRINT145214') {
        setIsAuthenticated(true);
        loadShops();
        loadStats();
      } else {
        setPinError('Incorrect Super Admin PIN.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const loadShops = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/shops');
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (res.ok && data?.success && Array.isArray(data.shops)) {
        const mapped = data.shops.map((s: ShopTenant) => {
          const trialCalc = calculateTrialRemaining(s);
          return {
            ...s,
            daysLeftInTrial: trialCalc.daysLeft,
            hoursLeftInTrial: trialCalc.hoursLeft,
            isTrialExpired: trialCalc.isTrialExpired,
          };
        });
        setShops(mapped);
        if (mapped.length > 0 && !activeDemoShop) {
          setActiveDemoShop(mapped[0]);
        }
      }
    } catch (e) {
      console.warn('Error fetching shops:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/super-admin/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.warn('Error fetching super admin stats:', e);
    }
  };


  const handleSeedOrders = async (shopSlug: string) => {
    try {
      const res = await fetch(`/api/super-admin/shops/${shopSlug}/seed-demo`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Seeded ${data.jobs?.length || 3} demo orders into ${shopSlug}!`);
        loadShops();
        loadStats();
      }
    } catch (e) {
      showToast('Error generating demo orders');
    }
  };

  const [togglingShopSlug, setTogglingShopSlug] = useState<string | null>(null);

  const handleToggleShopStatus = async (
    shopSlug: string,
    targetStatus: 'active' | 'suspended',
    shopName: string
  ) => {
    setTogglingShopSlug(shopSlug);
    try {
      const res = await fetch(`/api/super-admin/shops/${encodeURIComponent(shopSlug)}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.shop) {
        setShops((prev) => prev.map((s) => (s.slug === shopSlug ? data.shop : s)));
        const msg =
          targetStatus === 'suspended'
            ? `⛔ Service for "${shopName}" is now STOPPED. Owner will see "THE SUPER ADMIN HAS STOPPED YOUR SERVICE" upon login.`
            : `✅ Service for "${shopName}" has been REACTIVATED successfully.`;
        showToast(msg);
        loadStats();
      } else {
        showToast(data.error || 'Failed to toggle shop status');
      }
    } catch (e: any) {
      showToast('Network error toggling status');
    } finally {
      setTogglingShopSlug(null);
    }
  };

  const handleDeleteShop = async (shopSlug: string, shopName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${shopName}" (${shopSlug})? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/shops/${shopSlug}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Shop "${shopName}" deleted`);
        loadShops();
        loadStats();
      }
    } catch (e) {
      showToast('Error deleting shop');
    }
  };

  const handleShopCreated = (newShop: ShopTenant) => {
    setShops((prev) => [newShop, ...prev]);
    setActiveDemoShop(newShop);
    showToast(`🎉 Shop "${newShop.name}" system generated successfully!`);
    loadStats();
    // Open standee kit immediately for convenience
    setSelectedShopForStandee(newShop);
    setActiveTab('shops');
  };

  const handleShopSaved = (updatedShop: ShopTenant) => {
    setShops((prev) => prev.map((s) => (s.id === updatedShop.id ? updatedShop : s)));
    if (activeDemoShop?.id === updatedShop.id) {
      setActiveDemoShop(updatedShop);
    }
    showToast(`Saved updates for ${updatedShop.name}`);
  };

  // Download Comprehensive Shop Performance & Audit Report in PDF format
  const handleDownloadReport = async (shop: ShopTenant) => {
    try {
      setDownloadingReportSlug(shop.slug);
      showToast(`Generating audit report PDF for "${shop.name}"...`);

      const res = await fetch(`/api/super-admin/shops/${shop.slug}/report-data`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch report metrics');
      }

      await generateAndDownloadShopReportPdf(data.report);
      showToast(`✅ Audit & Analysis PDF downloaded for "${shop.name}"!`);
    } catch (err: any) {
      console.error('PDF Report error:', err);
      showToast(`Error creating PDF: ${err.message || 'Check console'}`);
    } finally {
      setDownloadingReportSlug(null);
    }
  };

  // Extend 7-Day Free Trial
  const handleExtendTrial = async (shopSlug: string, shopName: string, days = 7) => {
    try {
      setExtendingTrialSlug(shopSlug);
      const res = await fetch(`/api/super-admin/shops/${shopSlug}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShops((prev) => prev.map((s) => (s.slug === shopSlug ? data.shop : s)));
        showToast(`✨ Extended 7-day trial for "${shopName}"! ${data.shop.daysLeftInTrial} days remaining.`);
      } else {
        showToast(data.error || 'Failed to extend trial');
      }
    } catch (e: any) {
      showToast('Error extending trial');
    } finally {
      setExtendingTrialSlug(null);
    }
  };

  // Convert Trial to Permanent Commercial Subscription
  const handleConvertPlan = async (shopSlug: string, shopName: string, plan = 'starter') => {
    try {
      setConvertingPlanSlug(shopSlug);
      const res = await fetch(`/api/super-admin/shops/${shopSlug}/convert-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShops((prev) => prev.map((s) => (s.slug === shopSlug ? data.shop : s)));
        showToast(`🚀 Upgraded "${shopName}" to full ${plan.toUpperCase()} plan!`);
      } else {
        showToast(data.error || 'Failed to upgrade plan');
      }
    } catch (e: any) {
      showToast('Error upgrading plan');
    } finally {
      setConvertingPlanSlug(null);
    }
  };

  // Filter shops by search and status
  const filteredShops = shops.filter((shop) => {
    const isTrial = Boolean(shop.isTrial || shop.plan === 'free_trial' || shop.status === 'trial');
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'trial' ? isTrial : shop.status === statusFilter);

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      shop.name.toLowerCase().includes(query) ||
      shop.slug.toLowerCase().includes(query) ||
      shop.ownerName.toLowerCase().includes(query) ||
      shop.phone.includes(query) ||
      shop.address.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  // PIN AUTHENTICATION SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-center transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-950 via-purple-900 to-indigo-700 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-950/20">
            <ShieldCheck className="w-8 h-8 text-amber-300" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Super Admin Control Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Multi-Tenant SaaS Management &amp; Stationery Fleet Provisioning
          </p>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            {pinError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-850 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300 font-bold text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-left">
                Master Super Admin PIN
              </label>
              <input
                type="password"
                required
                placeholder="Enter Super Admin PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-widest border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-600 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !pinInput}
              className="w-full py-3 bg-purple-900 hover:bg-purple-800 dark:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-lg shadow-purple-900/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-4 h-4 text-amber-300" />
              <span>{verifying ? 'Authenticating...' : 'Unlock Super Admin Panel'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN SUPER ADMIN SUITE
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Platform Statistics Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black border border-purple-400/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>SUPER ADMIN PLATFORM MANAGER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Stationery & Print Shop SaaS Fleet
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-medium">
              Generate independent self-service printing systems for Xerox & stationery shops,
              configure custom pricing & UPI payment QR codes, deliver acrylic counter standees, and
              pitch live with the working demo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Demo Mode Toggle Switch */}
            <div
              className={`flex items-center space-x-3 px-4 py-2 rounded-2xl border transition-all ${
                isDemoMode
                  ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                  : 'bg-white/10 border-white/15'
              }`}
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${isDemoMode ? 'text-emerald-300' : 'text-white'}`}>
                    Demo Mode
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">
                  {isDemoMode ? 'Simulating Dummy Shop' : 'Live Fleet Production'}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDemoMode}
                onClick={() => handleToggleDemoMode(!isDemoMode)}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDemoMode ? 'bg-emerald-500 shadow-sm' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={isDemoMode ? 'Turn Demo Mode OFF' : 'Turn Demo Mode ON'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isDemoMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Generate New Shop System</span>
            </button>

            <button
              type="button"
              onClick={() => setIsResetDataModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-black rounded-2xl border border-rose-500/40 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
              title="Reset test orders or tasks before approaching real shops"
            >
              <RotateCcw className="w-4 h-4 text-rose-200" />
              <span>Reset Test Data</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadShops();
                loadStats();
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors cursor-pointer"
              title="Refresh Fleet Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Statistics Cards Bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Customer Shops</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats?.totalShops ?? shops.length}
            </p>
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {stats?.activeShops ?? shops.filter((s) => s.status === 'active').length} Active Commercial
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400">7-Day Free Trials</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
              {shops.filter((s) => (s.isTrial || s.plan === 'free_trial' || s.status === 'trial') && !s.isTrialExpired).length}
            </p>
            <p className="text-[10px] text-slate-300 font-medium mt-0.5">
              {shops.filter((s) => (s.isTrial || s.plan === 'free_trial' || s.status === 'trial') && s.isTrialExpired).length} Expired • Auto-paused
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Print Orders</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats?.totalJobs ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Across all shops</p>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Platform Turnover</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              ₹{stats?.totalRevenue ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gross document volume</p>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400">Online UPI Adoption</p>
            <p className="text-xl sm:text-2xl font-black text-sky-300 mt-0.5">
              {shops.filter((s) => s.settings.enableOnlinePayments && s.settings.upiId).length} /{' '}
              {shops.length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Direct UPI QR enabled</p>
          </div>
        </div>
      </div>

      {/* Administrative Security & Real Database Persistence Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Persistent Database:</span>
          </div>
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Cloud Firestore: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">100% Persistent across publishes &amp; studio updates</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsResetDataModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer border border-rose-200 dark:border-rose-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Testing Orders / Tasks</span>
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            🔒 Shop owners log in with assigned PIN.
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('shops')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'shops'
              ? 'bg-slate-950 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Customer Shops Fleet ({shops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'generate'
              ? 'bg-slate-950 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Generate New Shop System</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('demo');
            if (!activeDemoShop && shops.length > 0) setActiveDemoShop(shops[0]);
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'demo'
              ? 'bg-slate-950 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-current" />
          <span>Interactive Live Demo Showcase</span>
        </button>

        {/* Demo Mode Sandbox Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('demo_sandbox')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'demo_sandbox'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md ring-2 ring-emerald-400/40'
              : isDemoMode
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 font-black'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Zap className={`w-4 h-4 ${isDemoMode ? 'text-amber-400 fill-current' : 'text-emerald-600 dark:text-emerald-400'}`} />
          <span>Demo Sandbox (Dummy Shop)</span>
          {isDemoMode && (
            <span className="bg-emerald-500 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-black animate-pulse">
              Live
            </span>
          )}
        </button>

        {/* Helpline & Support Desk Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('helpline');
            loadContactData();
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'helpline'
              ? 'bg-slate-950 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Headphones className="w-4 h-4 text-sky-500" />
          <span>Helpline & Support Desk</span>
        </button>
      </div>

      {/* Demo Mode Active Notification Banner */}
      {isDemoMode && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-emerald-950 to-slate-900 rounded-3xl border border-emerald-500/40 shadow-lg text-white">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs sm:text-sm font-black text-emerald-300">
                  Demo Mode Simulation Active
                </h4>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  Apex Digital Prints
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Simulating live orders, dynamic queues, and sample financials in an isolated sandbox. Real customer shops remain untouched.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeTab !== 'demo_sandbox' && (
              <button
                type="button"
                onClick={() => setActiveTab('demo_sandbox')}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Open Sandbox Desk</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleToggleDemoMode(false)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Exit Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: SHOPS FLEET DIRECTORY */}
      {activeTab === 'shops' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shops by name, slug, owner, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-600 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 outline-none cursor-pointer transition-colors"
              >
                <option value="all">All Status ({shops.length})</option>
                <option value="active">Active Only</option>
                <option value="trial">Trial Only</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Shops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map((shop) => {
              const trialInfo = calculateTrialRemaining(shop);
              const isTrialModel = Boolean(shop.isTrial || shop.plan === 'four_day_trial' || shop.plan === 'free_trial' || shop.status === 'trial');
              const customerLink = `${baseUrl}/?shop=${shop.slug}`;
              const ownerDeskLink = `${baseUrl}/?shop=${shop.slug}&mode=owner`;

              return (
                <div
                  key={shop.id}
                  className={`rounded-3xl border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between ${
                    shop.status === 'suspended'
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-2 ring-rose-200/50 dark:ring-rose-900/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Top Row: Title & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {shop.name}
                          </h3>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mt-1">
                          /{shop.slug}
                        </span>
                      </div>

                      {shop.status === 'suspended' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shrink-0 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                          ⛔ SERVICE STOPPED
                        </span>
                      ) : isTrialModel ? (
                        trialInfo.isTrialExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shrink-0 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping mr-1" />
                            {shop.plan === 'four_day_trial' ? '4-DAY PLAN EXPIRED' : 'TRIAL EXPIRED'} (0d Left)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shrink-0 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 mr-1" />
                            {shop.plan === 'four_day_trial' ? '4-DAY PLAN' : '7-DAY TRIAL'}: {trialInfo.daysLeft}D LEFT
                          </span>
                        )
                      ) : shop.plan?.startsWith('monthly_') ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shrink-0 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          MONTHLY {shop.plan.replace('monthly_', '').toUpperCase()}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          PERMANENT {shop.plan ? `(${shop.plan.toUpperCase()})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Suspension Banner when Disabled */}
                    {shop.status === 'suspended' && (
                      <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 mb-3 flex items-center justify-between text-rose-900 dark:text-rose-200">
                        <div className="flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-tight">
                            Service Stopped by Super Admin
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold font-mono bg-rose-200/80 dark:bg-rose-900/80 px-1.5 py-0.5 rounded text-rose-950 dark:text-rose-100">
                          Desk Blocked
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3 font-medium">
                      {shop.tagline || 'High-Speed Document Printing'}
                    </p>

                    {/* Owner & Contact */}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl mb-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{shop.ownerName}</span>
                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                          {shop.phone}
                        </span>
                      </div>
                      {shop.address && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{shop.address}</p>
                      )}
                    </div>

                    {/* Owner Desk Login PIN Row */}
                    <div className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 mb-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-900 dark:text-amber-300">
                            Owner PIN:
                          </span>
                          <span className="font-mono font-black text-xs text-amber-950 dark:text-amber-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                            {shop.settings?.ownerPin || (shop as any).ownerPin || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-800 dark:text-yellow-400 border border-indigo-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md">
                          Assigned PIN
                        </span>

                        {(shop.settings?.ownerPin || (shop as any).ownerPin) && (
                          <button
                            type="button"
                            onClick={() => handleCopy(shop.settings?.ownerPin || (shop as any).ownerPin, `pin-${shop.id}`)}
                            className="p-1 rounded-md bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-slate-600 cursor-pointer"
                            title="Copy Owner PIN"
                          >
                            {copiedId === `pin-${shop.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rates & Payment Status */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">
                          Rates
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          B&amp;W {shop.settings.currency}{shop.settings.bwPricePerPage} • Color{' '}
                          {shop.settings.currency}{shop.settings.colorPricePerPage}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/80">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">
                          Online UPI
                        </span>
                        <span className="font-bold font-mono text-emerald-950 dark:text-emerald-200 truncate block">
                          {shop.settings.enableOnlinePayments && shop.settings.upiId
                            ? shop.settings.upiId
                            : 'Cash Only'}
                        </span>
                      </div>
                    </div>

                    {/* Subscription & Plan System Management Block */}
                    {isTrialModel ? (
                      <div
                        className={`p-3.5 rounded-2xl mb-3 border transition-all ${
                          trialInfo.isTrialExpired
                            ? 'bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 shadow-xs'
                            : 'bg-gradient-to-br from-indigo-50/80 to-purple-50/60 dark:from-indigo-950/50 dark:to-purple-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <Clock
                              className={`w-3.5 h-3.5 ${
                                trialInfo.isTrialExpired ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-yellow-400'
                              }`}
                            />
                            <span className="text-[11px] font-black uppercase tracking-tight">
                              {shop.plan === 'four_day_trial' ? '4-Day Free Plan System' : '7-Day Free Trial System'}
                            </span>
                          </div>
                          {trialInfo.isTrialExpired ? (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-600 text-white rounded-full">
                              Expired
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-extrabold text-indigo-700 dark:text-yellow-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-slate-700 shadow-2xs">
                              {trialInfo.daysLeft} Days Left
                            </span>
                          )}
                        </div>

                        {trialInfo.isTrialExpired ? (
                          <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-200 mb-2.5 leading-snug">
                            <span className="font-bold block text-rose-950 dark:text-rose-100 mb-0.5">
                              ⚠️ Auto-Expired: Desk Access Blocked
                            </span>
                            When shop owner logs in, screen displays:{' '}
                            <span className="italic font-bold text-rose-950 dark:text-rose-100">
                              {shop.plan === 'four_day_trial'
                                ? '"Your four-day free plan has ended. Contact the super admin"'
                                : '"Your free trial session is expire if you love the service contact with the admin"'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1 mb-2.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                              <span>Auto-expires after {shop.plan === 'four_day_trial' ? 4 : 7} days</span>
                              <span>{Math.max(0, shop.daysLeftInTrial ?? (shop.plan === 'four_day_trial' ? 4 : 7))} days remaining</span>
                            </div>
                            <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-yellow-400 dark:to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(8, (((shop.plan === 'four_day_trial' ? 4 : 7) - (shop.daysLeftInTrial ?? (shop.plan === 'four_day_trial' ? 4 : 7))) / (shop.plan === 'four_day_trial' ? 4 : 7)) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Super Admin Quick Subscription Controls */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleExtendTrial(shop.slug, shop.name, shop.plan === 'four_day_trial' ? 4 : 7)}
                            disabled={extendingTrialSlug === shop.slug}
                            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-800 dark:text-yellow-400 text-[10px] font-extrabold rounded-lg border border-indigo-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            title={`Add extra days to this shop's trial session`}
                          >
                            <Hourglass
                              className={`w-3 h-3 text-indigo-600 dark:text-yellow-400 ${
                                extendingTrialSlug === shop.slug ? 'animate-spin' : ''
                              }`}
                            />
                            <span>
                              {extendingTrialSlug === shop.slug ? 'Extending...' : `+${shop.plan === 'four_day_trial' ? 4 : 7} Days`}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedShopForSubscription(shop)}
                            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 dark:from-yellow-500 dark:to-amber-500 text-white dark:text-slate-950 text-[10px] font-extrabold rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="Manage and switch subscription model (Trial, Monthly, Permanent)"
                          >
                            <Zap className="w-3 h-3 text-amber-300 dark:text-slate-950" />
                            <span>Change Plan</span>
                          </button>
                        </div>
                      </div>
                    ) : shop.plan?.startsWith('monthly_') ? (
                      <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 mb-3 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span className="text-[11px] font-black uppercase text-purple-900 dark:text-purple-200">
                              Monthly: {shop.plan.replace('monthly_', '').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-700">
                            Monthly Recurring
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedShopForSubscription(shop)}
                          className="w-full py-1 text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-yellow-400 hover:underline flex items-center justify-center space-x-1"
                        >
                          <span>Manage Monthly Renewal &amp; Tier →</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 mb-3 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                              Plan: {(shop.plan || 'Permanent').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Lifetime Active
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedShopForSubscription(shop)}
                          className="w-full py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-yellow-400 hover:underline flex items-center justify-center space-x-1"
                        >
                          <span>Modify Subscription Model →</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Primary Subscription Management Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedShopForSubscription(shop)}
                      className="w-full flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/60 dark:hover:to-indigo-900/60 text-purple-800 dark:text-yellow-400 border border-purple-200 dark:border-purple-800 text-xs font-black rounded-xl transition-all cursor-pointer shadow-2xs"
                      title="Manage subscription model: 4-day trial, 7-day trial, monthly recurring, or permanent lifetime plan"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-yellow-400" />
                      <span>Manage Subscription &amp; Plan</span>
                    </button>
                    {/* Master System Operational Toggle: Enable / Disable Service */}
                    {shop.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleShopStatus(shop.slug, 'active', shop.name)}
                        disabled={togglingShopSlug === shop.slug}
                        className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Reactivate shop system and restore owner desk login"
                      >
                        <Power className={`w-3.5 h-3.5 ${togglingShopSlug === shop.slug ? 'animate-spin' : ''}`} />
                        <span>{togglingShopSlug === shop.slug ? 'Enabling Service...' : 'ENABLE SYSTEM (RESTORE SERVICE)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleShopStatus(shop.slug, 'suspended', shop.name)}
                        disabled={togglingShopSlug === shop.slug}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="Disable shop system (owner will see 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE')"
                      >
                        <PowerOff className={`w-3.5 h-3.5 text-rose-600 dark:text-rose-400 ${togglingShopSlug === shop.slug ? 'animate-spin' : ''}`} />
                        <span>{togglingShopSlug === shop.slug ? 'Disabling Service...' : 'Disable System (Stop Service)'}</span>
                      </button>
                    )}

                    {/* Official Shop Report Download Button (PDF) */}
                    <button
                      type="button"
                      onClick={() => handleDownloadReport(shop)}
                      disabled={downloadingReportSlug === shop.slug}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-800 dark:via-indigo-950 dark:to-slate-800 hover:from-slate-800 hover:to-indigo-900 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Download comprehensive performance audit, print analytics, and ledger in publication PDF format"
                    >
                      <FileDown
                        className={`w-3.5 h-3.5 text-amber-300 ${
                          downloadingReportSlug === shop.slug ? 'animate-bounce' : ''
                        }`}
                      />
                      <span>
                        {downloadingReportSlug === shop.slug
                          ? 'Generating Audit PDF...'
                          : 'Download Shop Report (PDF)'}
                      </span>
                    </button>

                    {/* Primary Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedShopForStandee(shop)}
                        className="flex items-center justify-center space-x-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Standee &amp; QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDemoShop(shop);
                          setActiveTab('demo');
                        }}
                        className="flex items-center justify-center space-x-1.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span>Live Demo</span>
                      </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => handleSeedOrders(shop.slug)}
                        className="text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 font-bold flex items-center space-x-1 cursor-pointer"
                        title="Inject 3 realistic mock orders for presentation"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Seed Orders</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setSelectedShopForEdit(shop)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Shop Settings"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShop(shop.slug, shop.name)}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Shop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {shops.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-yellow-400">
                <Store className="w-8 h-8" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">No Shops in Super Admin Panel</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
                All pre-seeded demo shops and orders have been removed. Ready for onboarding.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Generate First Shop</span>
              </button>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 transition-colors">
              <Store className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No shops match your search</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try clearing your search query or generate a new shop system.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: GENERATE NEW SHOP WIZARD */}
      {activeTab === 'generate' && (
        <ShopGeneratorWizard
          onShopCreated={handleShopCreated}
          onCancel={() => setActiveTab('shops')}
        />
      )}

      {/* TAB 3: LIVE DEMO SHOWCASE */}
      {activeTab === 'demo' && activeDemoShop && (
        <LiveDemoShowcase
          shops={shops}
          activeShop={activeDemoShop}
          onSelectShop={(s) => setActiveDemoShop(s)}
          onLaunchCustomerView={(slug) => onNavigateToCustomer(slug)}
          onLaunchOwnerView={(slug) => onNavigateToOwner(slug)}
        />
      )}

      {/* TAB 4: DEMO MODE SANDBOX (DUMMY SHOP SIMULATION) */}
      {activeTab === 'demo_sandbox' && (
        <DemoModeSandbox
          onLaunchCustomerView={(slug) => onNavigateToCustomer(slug)}
          onLaunchOwnerView={(slug) => onNavigateToOwner(slug)}
          onExitDemoMode={() => handleToggleDemoMode(false)}
        />
      )}

      {/* TAB 5: HELPLINE & SERVICE PROVIDER SUPPORT MANAGEMENT */}
      {activeTab === 'helpline' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl border border-indigo-500/30 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
                  <Headphones className="w-6 h-6 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Service Provider Helpline & Support Desk</span>
                    <span className="text-[10px] bg-sky-500/20 border border-sky-400/40 text-sky-200 px-2 py-0.5 rounded-full font-mono uppercase">
                      Live Broadcast
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Configure your official helpline contact information. Whenever you disable or suspend a store, or when an owner's 4-day or 7-day free plan ends, these details are dynamically shown on their screen with one-tap Call, WhatsApp, and Email buttons.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadContactData}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Contact Form */}
            <form onSubmit={handleSaveContact} className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Helpline Credentials & Details</span>
                </h4>
                <span className="text-[11px] text-slate-400">Authenticated as Super Admin</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Provider / Admin Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactData.name}
                  onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                  placeholder="e.g. Priyanshu Gupta"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Title / Designation
                </label>
                <input
                  type="text"
                  value={contactData.serviceProviderTitle}
                  onChange={(e) => setContactData({ ...contactData, serviceProviderTitle: e.target.value })}
                  placeholder="e.g. Platform Service Provider & Super Admin"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Helpline Number *
                  </label>
                  <div className="relative">
                    <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={contactData.phone}
                      onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                      placeholder="+91 98765 00111"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number (with country code) *
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={contactData.whatsappNumber}
                      onChange={(e) => setContactData({ ...contactData, whatsappNumber: e.target.value })}
                      placeholder="+91 98765 00111"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Support Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    placeholder="guptapriyanshu0101@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Notice / Guidance for Suspended Stores
                </label>
                <textarea
                  rows={3}
                  value={contactData.customNote}
                  onChange={(e) => setContactData({ ...contactData, customNote: e.target.value })}
                  placeholder="Explain instructions to the store owner on how to reactivate or upgrade..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  Updates take effect instantly in Firestore and disk cache.
                </p>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                >
                  {savingContact ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Save Helpline Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Preview Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-white mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Store Owner Screen Preview</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                  This is exactly how disabled or trial-ended store owners will view your contact information:
                </p>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {contactData.name || 'Platform Service Provider'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {contactData.serviceProviderTitle || 'Super Admin'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Official Support
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold">{contactData.phone || '+91 98765 00111'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold">{contactData.whatsappNumber || '+91 98765 00111'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 truncate">
                      <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="font-semibold truncate">{contactData.email || 'support@copyprint.in'}</span>
                    </div>
                  </div>

                  {contactData.customNote && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                      {contactData.customNote}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-xl text-center shadow-xs">
                      WhatsApp Provider
                    </div>
                    <div className="py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-xl text-center shadow-xs">
                      Call Provider
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Counter Standee Modal */}
      {selectedShopForStandee && (
        <CounterStandeeModal
          shop={selectedShopForStandee}
          isOpen={true}
          onClose={() => setSelectedShopForStandee(null)}
          baseUrl={baseUrl}
        />
      )}

      {/* Edit Shop Modal */}
      {selectedShopForEdit && (
        <EditShopModal
          shop={selectedShopForEdit}
          isOpen={true}
          onClose={() => setSelectedShopForEdit(null)}
          onSaved={handleShopSaved}
        />
      )}

      {/* Manage Client Subscription & Plan Model Modal */}
      {selectedShopForSubscription && (
        <ManageSubscriptionModal
          shop={selectedShopForSubscription}
          isOpen={true}
          onClose={() => setSelectedShopForSubscription(null)}
          onUpdated={(updatedShop) => {
            setShops((prev) => prev.map((s) => (s.slug === updatedShop.slug ? updatedShop : s)));
            showToast(`✓ Subscription model updated for "${updatedShop.name}"!`);
          }}
        />
      )}

      {/* Reset Testing & Demo Data Modal */}
      <ResetDataModal
        isOpen={isResetDataModalOpen}
        onClose={() => setIsResetDataModalOpen(false)}
        shops={shops}
        onResetComplete={(msg) => {
          showToast(msg);
          loadShops();
          loadStats();
        }}
      />
    </div>
  );
};
