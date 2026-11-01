import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  ExternalLink,
  Printer,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Plus,
  BarChart3,
  Smartphone,
  ShieldCheck,
  Zap,
  Check,
  Layers,
  FileText,
  CreditCard,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { ShopTenant, PrintJob } from '../../types';

interface DemoFinancials {
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

interface DemoModeSandboxProps {
  onLaunchCustomerView: (shopSlug: string) => void;
  onLaunchOwnerView: (shopSlug: string) => void;
  onExitDemoMode?: () => void;
}

export const DemoModeSandbox: React.FC<DemoModeSandboxProps> = ({
  onLaunchCustomerView,
  onLaunchOwnerView,
  onExitDemoMode,
}) => {
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [simulatingOrder, setSimulatingOrder] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Demo Sandbox State
  const [dummyShop, setDummyShop] = useState<ShopTenant | null>(null);
  const [demoJobs, setDemoJobs] = useState<PrintJob[]>([]);
  const [financials, setFinancials] = useState<DemoFinancials | null>(null);
  const [activeQueueTab, setActiveQueueTab] = useState<'all' | 'pending' | 'printed' | 'collected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Order Simulator Form State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simName, setSimName] = useState('Ananya Sen (Computer Science)');
  const [simPhone, setSimPhone] = useState('+91 98765 44321');
  const [simDocName, setSimDocName] = useState('Machine_Learning_Project_Synopsis.pdf');
  const [simPages, setSimPages] = useState(18);
  const [simCopies, setSimCopies] = useState(2);
  const [simColorMode, setSimColorMode] = useState<'bw' | 'color'>('bw');
  const [simDuplex, setSimDuplex] = useState<'single' | 'double'>('double');
  const [simBinding, setSimBinding] = useState<'none' | 'staple' | 'spiral'>('spiral');
  const [simPaymentMethod, setSimPaymentMethod] = useState<'online_gpay' | 'counter'>('online_gpay');

  const fetchDemoState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/demo-mode');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDummyShop(data.shop);
          setDemoJobs(data.jobs || []);
          setFinancials(data.financials || null);
        }
      }
    } catch (err) {
      console.warn('Failed to load demo mode state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoState();
  }, []);

  const handleResetDemoState = async () => {
    if (!confirm('Reset Demo Sandbox to initial state? All simulated jobs and sample counters will revert.')) {
      return;
    }
    try {
      setResetting(true);
      const res = await fetch('/api/super-admin/demo-mode/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDummyShop(data.shop);
          setDemoJobs(data.jobs || []);
          setFinancials(data.financials || null);
          setActionSuccess('Demo Sandbox successfully reset to default simulated state!');
          setTimeout(() => setActionSuccess(null), 3500);
        }
      }
    } catch (e) {
      console.warn('Error resetting demo state:', e);
    } finally {
      setResetting(false);
    }
  };

  const handleCreateSimulatedJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimulatingOrder(true);
      const baseRate = simColorMode === 'color' ? 10 : 2;
      const bindingFee = simBinding === 'spiral' ? 30 : simBinding === 'staple' ? 5 : 0;
      const subtotal = simPages * simCopies * baseRate;
      const totalPrice = subtotal + bindingFee;

      const payload = {
        customerName: simName,
        customerPhone: simPhone,
        status: 'pending',
        paymentStatus: simPaymentMethod === 'counter' ? 'unpaid' : 'paid',
        paymentMethod: simPaymentMethod,
        settings: {
          copies: simCopies,
          colorMode: simColorMode,
          paperSize: 'A4',
          duplex: simDuplex,
          binding: simBinding,
          estimatedPagesPerDoc: simPages,
          notes: `Simulated Demo Order • ${simDocName}`,
        },
        pricing: {
          currency: '₹',
          baseRatePerPage: baseRate,
          totalPages: simPages,
          copies: simCopies,
          paperMultiplier: 1.0,
          duplexMultiplier: 1.0,
          bindingFee,
          subtotal,
          totalPrice,
        },
        files: [
          {
            id: `f_sim_${Date.now()}`,
            originalName: simDocName,
            mimeType: 'application/pdf',
            size: Math.round(simPages * 125000),
            storedFilename: `sim_${simDocName}`,
            pageCount: simPages,
            url: '#',
            downloadUrl: '#',
          },
        ],
      };

      const res = await fetch('/api/super-admin/demo-mode/simulate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDemoJobs(data.jobs || []);
          setFinancials(data.financials || null);
          setShowSimulateModal(false);
          setActionSuccess(`Simulated job created with OTP #${data.job?.otp || '----'}!`);
          setTimeout(() => setActionSuccess(null), 4000);
        }
      }
    } catch (err) {
      console.warn('Error simulating job:', err);
    } finally {
      setSimulatingOrder(false);
    }
  };

  const handleUpdateJobStatus = async (
    jobId: string,
    newStatus: 'pending' | 'printed' | 'collected',
    paymentStatus?: 'paid' | 'unpaid'
  ) => {
    try {
      const payload: any = { status: newStatus };
      if (paymentStatus) payload.paymentStatus = paymentStatus;

      const res = await fetch(`/api/super-admin/demo-mode/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          setDemoJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, ...data.job } : j))
          );
          setActionSuccess(`Job #${data.job.otp} updated to "${newStatus.toUpperCase()}"!`);
          setTimeout(() => setActionSuccess(null), 3000);
        }
      }
    } catch (err) {
      console.warn('Error updating demo job:', err);
    }
  };

  // Filter jobs for queue
  const filteredJobs = demoJobs.filter((job) => {
    if (activeQueueTab !== 'all' && job.status !== activeQueueTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = job.customerName.toLowerCase().includes(q);
      const matchOtp = job.otp.includes(q);
      const matchFiles = job.files.some((f) => f.originalName.toLowerCase().includes(q));
      return matchName || matchOtp || matchFiles;
    }
    return true;
  });

  const pendingCount = demoJobs.filter((j) => j.status === 'pending').length;
  const printedCount = demoJobs.filter((j) => j.status === 'printed').length;
  const collectedCount = demoJobs.filter((j) => j.status === 'collected').length;

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionSuccess && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Demo Sandbox Top Control Deck */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop decorative */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-400/40 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>LIVE DEMO SANDBOX ACTIVE</span>
              <span className="bg-emerald-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-black">
                SAFE SIMULATION
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{dummyShop?.name || 'Apex Digital Prints & Xerox (Demo Sandbox)'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl font-medium leading-relaxed">
              Experience the platform as a real customer & shopkeeper with pre-configured active job
              queues, live pickup OTPs, and sample financial analytics. Real shop settings and
              database remain 100% untouched.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-semibold text-emerald-200/90">
              <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                No real shop settings modified
              </span>
              <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Simulated UPI ID: apexprints.demo@upi
              </span>
              <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                Operator PIN: <strong className="text-white">{dummyShop?.settings?.ownerPin || '458219'}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Simulate Customer Order</span>
            </button>

            <button
              type="button"
              onClick={() => dummyShop && onLaunchCustomerView(dummyShop.slug)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/10 transition-colors cursor-pointer"
              title="Open customer self-service kiosk for this demo shop"
            >
              <Smartphone className="w-4 h-4 text-emerald-300" />
              <span>Launch Customer Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => dummyShop && onLaunchOwnerView(dummyShop.slug)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/10 transition-colors cursor-pointer"
              title={`Open shopkeeper queue with PIN ${dummyShop?.settings?.ownerPin || '458219'}`}
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Launch Counter Desk</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleResetDemoState}
              disabled={resetting}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold rounded-2xl border border-red-500/30 transition-colors cursor-pointer"
              title="Revert demo queue and financials to default sample"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset Demo</span>
            </button>

            {onExitDemoMode && (
              <button
                type="button"
                onClick={onExitDemoMode}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Exit Demo Mode
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SAMPLE FINANCIAL DATA ANALYTICS CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide uppercase">
              Simulated Financial Performance (Sample Analytics)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Updates in real-time as jobs progress
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Today's Simulated Revenue */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Today's Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{financials?.todayRevenue.toLocaleString() || '3,840'}
            </div>
            <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+30.1% vs yesterday (₹{financials?.yesterdayRevenue || '2,950'})</span>
            </div>
          </div>

          {/* UPI vs Cash Ratio */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Direct UPI Adoption</span>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-950 dark:text-indigo-200">
              {financials?.onlineUpiPercentage || 75.3}%
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${financials?.onlineUpiPercentage || 75.3}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                <span>UPI: ₹{financials?.onlineUpiRevenue || 2890}</span>
                <span>Cash: ₹{financials?.cashRevenue || 950}</span>
              </div>
            </div>
          </div>

          {/* Consumables & Gross Profit */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Profit Margin</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {financials?.grossMarginPercent || 71.0}%
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Profit: <strong className="text-slate-900 dark:text-slate-100 font-bold">₹{financials?.grossProfit || 2726}</strong> (Toner/Paper: ₹{financials?.estimatedConsumablesCost || 1114})
            </div>
          </div>

          {/* Document Volumes */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Simulated Volume</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {((financials?.bwPagesPrinted || 0) + (financials?.colorPagesPrinted || 0)).toLocaleString()} <span className="text-xs font-bold text-slate-400">Pages</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
              <span>B&W: {financials?.bwPagesPrinted || 1842}</span>
              <span>Color: {financials?.colorPagesPrinted || 318}</span>
              <span>Binding: {financials?.spiralBindingsCount || 24}</span>
            </div>
          </div>
        </div>

        {/* Hourly Rush Pattern Mini Bar Visualizer */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Peak Campus Rush Hours (Simulated Demand Distribution)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">
              Morning peak: 11 AM (Tutorial prep) • Evening peak: 4 PM (Project submissions)
            </span>
          </div>

          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 items-end h-20 pt-2 border-b border-slate-800 pb-2">
            {(financials?.hourlyRush || []).map((slot, idx) => {
              const heightPercent = Math.min(100, Math.max(15, (slot.orders / 14) * 100));
              const isPeak = slot.orders >= 10;
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <div
                    className={`w-full rounded-t transition-all duration-300 relative ${
                      isPeak
                        ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                        : 'bg-emerald-600/70 hover:bg-emerald-500'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap pointer-events-none z-20">
                      {slot.orders} orders (₹{slot.revenue})
                    </div>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-1 tracking-tighter truncate w-full text-center">
                    {slot.hour.replace(':00', '')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ACTIVE JOB QUEUES INTERACTIVE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Live Simulation Job Queue
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {demoJobs.length} Orders Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Simulate dispatching prints, collecting payments, and customer pickup handoffs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search OTP, customer, or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={fetchDemoState}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Queue Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveQueueTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeQueueTab === 'all'
                ? 'bg-slate-900 dark:bg-slate-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            All Jobs ({demoJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeQueueTab === 'pending'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            Pending Queue ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab('printed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeQueueTab === 'printed'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            Ready for Pickup ({printedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab('collected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeQueueTab === 'collected'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            Collected & Settled ({collectedCount})
          </button>
        </div>

        {/* Job Cards List */}
        {filteredJobs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold">No simulated jobs in this view</p>
            <button
              type="button"
              onClick={() => setShowSimulateModal(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              + Simulate a customer print order now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const isPending = job.status === 'pending';
              const isPrinted = job.status === 'printed';
              const isCollected = job.status === 'collected';
              const isPaid = job.paymentStatus === 'paid';

              return (
                <div
                  key={job.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-sm'
                      : isPrinted
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 opacity-80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: OTP Token & Customer Info */}
                    <div className="flex items-start space-x-3.5">
                      <div className="flex flex-col items-center justify-center bg-slate-900 dark:bg-slate-800 text-white rounded-xl px-3 py-2 min-w-[70px] shadow-sm border border-transparent dark:border-slate-700">
                        <span className="text-[9px] uppercase font-bold text-slate-400">OTP</span>
                        <span className="text-lg font-black tracking-wider text-amber-300">
                          {job.otp}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {job.customerName}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {job.customerPhone}
                          </span>
                        </div>

                        {/* Document & Specs Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            {job.files[0]?.originalName || 'Document.pdf'}
                          </span>
                          <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                            {job.files[0]?.pageCount || 1} Pages • {job.settings.copies} {job.settings.copies > 1 ? 'Copies' : 'Copy'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                              job.settings.colorMode === 'color'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {job.settings.colorMode.toUpperCase()}
                          </span>
                          {job.settings.binding !== 'none' && (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md font-bold uppercase text-[10px]">
                              {job.settings.binding} Binding
                            </span>
                          )}
                        </div>

                        {job.settings.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 inline-block">
                            "{job.settings.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Price & Interactive Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
                      {/* Price & Payment Status */}
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 dark:text-slate-100">
                          ₹{job.pricing?.totalPrice || 20}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              PAID ({job.paymentMethod?.includes('gpay') ? 'GPay' : job.paymentMethod?.includes('online') ? 'UPI QR' : 'Counter'})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobStatus(job.id, job.status as any, 'paid')}
                              className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
                              title="Click to mark cash received at counter"
                            >
                              <Wallet className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              UNPAID (Collect ₹{job.pricing?.totalPrice})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* State Transition Actions */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleUpdateJobStatus(job.id, 'printed')}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print & Ready</span>
                          </button>
                        )}

                        {isPrinted && (
                          <button
                            type="button"
                            onClick={() => handleUpdateJobStatus(job.id, 'collected', 'paid')}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Handover & Collect</span>
                          </button>
                        )}

                        {isCollected && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: QUICK SIMULATE CUSTOMER ORDER */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Simulate New Customer Print Submission
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSimulatedJob} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Name & College Role
                </label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Document Filename
                  </label>
                  <input
                    type="text"
                    required
                    value={simDocName}
                    onChange={(e) => setSimDocName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Page Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={simPages}
                    onChange={(e) => setSimPages(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Color Mode
                  </label>
                  <select
                    value={simColorMode}
                    onChange={(e) => setSimColorMode(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none font-medium"
                  >
                    <option value="bw">B&W (₹2/pg)</option>
                    <option value="color">Full Color (₹10/pg)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={simCopies}
                    onChange={(e) => setSimCopies(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Finishing
                  </label>
                  <select
                    value={simBinding}
                    onChange={(e) => setSimBinding(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none font-medium"
                  >
                    <option value="none">None</option>
                    <option value="staple">Corner Staple (+₹5)</option>
                    <option value="spiral">Spiral Binding (+₹30)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Simulation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                      simPaymentMethod === 'online_gpay'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={simPaymentMethod === 'online_gpay'}
                      onChange={() => setSimPaymentMethod('online_gpay')}
                      className="text-emerald-600"
                    />
                    <span>Paid Online via UPI QR</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                      simPaymentMethod === 'counter'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={simPaymentMethod === 'counter'}
                      onChange={() => setSimPaymentMethod('counter')}
                      className="text-amber-600"
                    />
                    <span>Pay Cash at Counter</span>
                  </label>
                </div>
              </div>

              {/* Estimated Total Calculation */}
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  Estimated Simulated Order Value:
                </span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  ₹
                  {simPages * simCopies * (simColorMode === 'color' ? 10 : 2) +
                    (simBinding === 'spiral' ? 30 : simBinding === 'staple' ? 5 : 0)}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulatingOrder}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{simulatingOrder ? 'Injecting Order...' : 'Inject into Demo Queue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
