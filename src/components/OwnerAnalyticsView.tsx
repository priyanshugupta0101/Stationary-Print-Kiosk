import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Wallet,
  Crown,
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { AnalyticsSummary, ShopSettings, PrintJob } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OwnerAnalyticsViewProps {
  shopSettings: ShopSettings | null;
}

export const OwnerAnalyticsView: React.FC<OwnerAnalyticsViewProps> = ({ shopSettings }) => {
  const [serverData, setServerData] = useState<AnalyticsSummary | null>(null);
  const [firestoreJobs, setFirestoreJobs] = useState<PrintJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'cash'>('all');

  const activeShopSlug =
    shopSettings?.shopSlug ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : '') ||
    '';

  // Fetch from server API
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const url = activeShopSlug ? `/api/analytics?shop=${encodeURIComponent(activeShopSlug)}` : '/api/analytics';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.analytics) {
          setServerData(json.analytics);
        }
      }
    } catch (e) {
      console.warn('Analytics server fetch notice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time synchronization directly from Cloud Firestore print_jobs
  useEffect(() => {
    fetchAnalytics();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        collection(db, 'print_jobs'),
        (snapshot) => {
          const jobs: PrintJob[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as PrintJob;
            if (data && (data.id || data.otp)) {
              jobs.push({ ...data, id: data.id || docSnap.id });
            }
          });
          setFirestoreJobs(jobs);
          // Also trigger server sync in background
          fetchAnalytics();
        },
        (err) => {
          console.warn('Firestore analytics sync error:', err);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore analytics listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeShopSlug]);

  // Compute live, accurate analytics from live Firestore documents with timezone resilience
  const computedData = useMemo(() => {
    const cleanSlug = (activeShopSlug || '').trim().toLowerCase();
    const cleanNorm = cleanSlug.replace(/[^a-z0-9]/g, '');

    // Filter jobs for this shop (or include all if counter is universal / single shop)
    const filteredJobs = firestoreJobs.filter((j) => {
      if (j.status === 'cancelled') return false;
      if (!cleanSlug) return true;

      const sSlug = (j.shopSlug || j.settings?.shopSlug || '').toLowerCase();
      const sId = (j.shopId || j.settings?.shopId || '').toLowerCase();
      const sSlugNorm = sSlug.replace(/[^a-z0-9]/g, '');
      const sIdNorm = sId.replace(/[^a-z0-9]/g, '');

      if (sSlug === cleanSlug || sId === cleanSlug) return true;
      if (cleanNorm && (sSlugNorm === cleanNorm || sIdNorm === cleanNorm)) return true;
      // If job has no shop attached yet, treat as belonging to current active counter
      if (!sSlug && !sId) return true;

      return false;
    });

    const now = new Date();
    const localTodayStr = now.toLocaleDateString();
    const isoTodayStr = now.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Initialize daily breakdown for the past 7 days
    const dailyMap = new Map<
      string,
      { date: string; dateObj: Date; revenue: number; jobs: number; onlineRevenue: number; offlineRevenue: number }
    >();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, {
        date: key,
        dateObj: d,
        revenue: 0,
        jobs: 0,
        onlineRevenue: 0,
        offlineRevenue: 0,
      });
    }

    let totalRevenue = 0;
    let todayRevenue = 0;
    let thisWeekRevenue = 0;
    let todayJobs = 0;
    let totalPagesPrinted = 0;
    let bwRevenue = 0;
    let colorRevenue = 0;
    let unpaidTotal = 0;

    let onlineRevenue = 0;
    let offlineRevenue = 0;
    let todayOnlineRevenue = 0;
    let todayOfflineRevenue = 0;
    let onlineJobsCount = 0;
    let offlineJobsCount = 0;

    const recentPayments: Array<{
      id: string;
      otp: string;
      customerName: string;
      amount: number;
      paymentMethod: 'online' | 'offline';
      methodDetail: string;
      time: string;
      colorMode: string;
      copies: number;
      status: string;
    }> = [];

    for (const job of filteredJobs) {
      const price = Number(job.pricing?.totalPrice) || 0;
      const status = job.status;
      const paymentStatus = job.paymentStatus || (status === 'collected' ? 'paid' : 'unpaid');
      const colorMode = job.settings?.colorMode || 'bw';
      const copies = Number(job.settings?.copies) || 1;
      const totalPages = Number(job.pricing?.totalPages) || (job.files?.length || 1);

      // Date comparison (both local and ISO strings to prevent 0-value timezone traps)
      const jobDate = job.createdAt ? new Date(job.createdAt) : new Date();
      const jobIsoDate = jobDate.toISOString().split('T')[0];
      const isToday =
        jobIsoDate === isoTodayStr ||
        jobDate.toLocaleDateString() === localTodayStr;

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

      // Add to gross revenue
      totalRevenue += price;

      if (paymentStatus === 'unpaid') {
        unpaidTotal += price;
      } else {
        // Recorded payment
        if (isOnline) {
          onlineRevenue += price;
          onlineJobsCount++;
          if (isToday) {
            todayOnlineRevenue += price;
          }
        } else {
          offlineRevenue += price;
          offlineJobsCount++;
          if (isToday) {
            todayOfflineRevenue += price;
          }
        }

        recentPayments.push({
          id: job.id,
          otp: job.otp,
          customerName: job.customerName || 'Walk-in Customer',
          amount: Math.round(price * 100) / 100,
          paymentMethod: isOnline ? 'online' : 'offline',
          methodDetail: isOnline
            ? (method.includes('gpay') || notes.includes('gpay') ? 'Google Pay (UPI)' : 'Online UPI QR')
            : 'Cash at Counter',
          time: job.createdAt || new Date().toISOString(),
          colorMode,
          copies,
          status,
        });
      }

      if (isToday) {
        todayRevenue += price;
        todayJobs++;
      }

      if (jobDate >= sevenDaysAgo) {
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

      if (dailyMap.has(jobIsoDate)) {
        const item = dailyMap.get(jobIsoDate)!;
        item.revenue += price;
        item.jobs += 1;
        if (paymentStatus !== 'unpaid') {
          if (isOnline) {
            item.onlineRevenue += price;
          } else {
            item.offlineRevenue += price;
          }
        }
      }
    }

    recentPayments.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const dailyRevenue = Array.from(dailyMap.values()).map((item) => ({
      date: item.date,
      revenue: Math.round(item.revenue * 100) / 100,
      jobs: item.jobs,
      onlineRevenue: Math.round(item.onlineRevenue * 100) / 100,
      offlineRevenue: Math.round(item.offlineRevenue * 100) / 100,
    }));

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
      totalJobs: filteredJobs.length,
      todayJobs,
      totalPagesPrinted,
      bwRevenue: Math.round(bwRevenue * 100) / 100,
      colorRevenue: Math.round(colorRevenue * 100) / 100,
      unpaidTotal: Math.round(unpaidTotal * 100) / 100,
      onlineRevenue: Math.round(onlineRevenue * 100) / 100,
      offlineRevenue: Math.round(offlineRevenue * 100) / 100,
      todayOnlineRevenue: Math.round(todayOnlineRevenue * 100) / 100,
      todayOfflineRevenue: Math.round(todayOfflineRevenue * 100) / 100,
      onlineJobsCount,
      offlineJobsCount,
      dailyRevenue,
      recentPayments: recentPayments.slice(0, 30),
    };
  }, [firestoreJobs, activeShopSlug]);

  // Dual-source merge: Prefer live computed data if non-zero, else fall back to server data
  const data: AnalyticsSummary = useMemo(() => {
    if (computedData && (computedData.totalJobs > 0 || computedData.totalRevenue > 0)) {
      return {
        ...computedData,
        recentPayments: computedData.recentPayments,
      } as any;
    }
    if (serverData) {
      return serverData;
    }
    return computedData as any;
  }, [computedData, serverData]);

  const currency = shopSettings?.currency || '₹';

  // Calculate percentage of color vs bw revenue
  const totalColorAndBw = (data?.colorRevenue || 0) + (data?.bwRevenue || 0);
  const colorPercent =
    totalColorAndBw > 0
      ? Math.round(((data?.colorRevenue || 0) / totalColorAndBw) * 100)
      : 50;
  const bwPercent = totalColorAndBw > 0 ? 100 - colorPercent : 50;

  // Calculate percentage of online vs offline collection
  const totalCollected = (data?.onlineRevenue || 0) + (data?.offlineRevenue || 0);
  const onlinePercent =
    totalCollected > 0
      ? Math.round(((data?.onlineRevenue || 0) / totalCollected) * 100)
      : 50;
  const offlinePercent = totalCollected > 0 ? 100 - onlinePercent : 50;

  const maxDailyRevenue = Math.max(1, ...(data?.dailyRevenue?.map((d) => d.revenue) || [1]));

  // Filtered recent transaction receipts
  const filteredRecentPayments = useMemo(() => {
    const list = data?.recentPayments || [];
    return list.filter((p) => {
      if (paymentFilter === 'online' && p.paymentMethod !== 'online') return false;
      if (paymentFilter === 'cash' && p.paymentMethod !== 'offline') return false;
      if (ledgerSearch.trim()) {
        const query = ledgerSearch.toLowerCase().trim();
        const otpMatch = p.otp?.toLowerCase().includes(query);
        const nameMatch = p.customerName?.toLowerCase().includes(query);
        const detailMatch = p.methodDetail?.toLowerCase().includes(query);
        return otpMatch || nameMatch || detailMatch;
      }
      return true;
    });
  }, [data?.recentPayments, paymentFilter, ledgerSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wide mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Accounting &amp; Live Financial Ledger</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Insights &amp; Revenue Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily income reports, UPI vs Cash collection audits, and physical sheet usage calculated from Cloud Firestore
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Accounting</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Today's Income
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 truncate">
            {currency}{(data?.todayRevenue || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center flex-wrap">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mr-1">{data?.todayJobs || 0}</span> orders fulfilled today
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              7-Day Income
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 truncate">
            {currency}{(data?.thisWeekRevenue || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 truncate">Last 7 operational days</div>
        </div>

        {/* Total Lifetime Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              All-Time Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 truncate">
            {currency}{(data?.totalRevenue || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 truncate">
            From <span className="font-bold text-slate-700 dark:text-slate-300">{data?.totalJobs || 0}</span> lifetime jobs
          </div>
        </div>

        {/* Counter Dues / Unpaid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Counter Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 truncate">
            {currency}{(data?.unpaidTotal || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 truncate">Awaiting customer collection</div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Revenue Trend */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Daily Income Performance (Past 7 Days)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Daily collection receipts aggregated from completed print desk orders
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-yellow-400" />
              <span>Revenue</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="h-60 sm:h-64 flex items-end justify-between gap-2 pt-8 pb-4 min-w-[320px]">
              {data?.dailyRevenue?.map((day) => {
                const heightPercent =
                  maxDailyRevenue > 0
                    ? Math.max(day.revenue > 0 ? 14 : 6, (day.revenue / maxDailyRevenue) * 100)
                    : 6;
                const dateObj = new Date(day.date);
                const dayName = isNaN(dateObj.getTime())
                  ? 'Day'
                  : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateNumber = isNaN(dateObj.getTime())
                  ? day.date
                  : dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group">
                    {/* Tooltip value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 pointer-events-none whitespace-nowrap shadow-md z-10">
                      {currency}{day.revenue.toFixed(2)} • {day.jobs} {day.jobs === 1 ? 'order' : 'orders'}
                    </div>

                    {/* Bar container */}
                    <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col justify-end h-36 sm:h-44 p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          day.revenue > 0
                            ? 'bg-indigo-600 dark:bg-yellow-400 group-hover:bg-indigo-500 dark:group-hover:bg-yellow-300'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    </div>

                    {/* Date label */}
                    <div className="mt-2 text-center">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 block">{dayName}</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 block">{dateNumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment Collection & Print Mode Split */}
        <div className="lg:col-span-4 space-y-6">
          {/* Online vs Cash Payment Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs transition-colors">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Collection by Payment Mode</span>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Audit Verified
              </span>
            </h3>

            {/* Ratio visual bar */}
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-4">
              <div
                style={{ width: `${onlinePercent}%` }}
                className="bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                title={`Online UPI: ${onlinePercent}%`}
              />
              <div
                style={{ width: `${offlinePercent}%` }}
                className="bg-amber-600 dark:bg-amber-500 transition-all duration-500"
                title={`Cash at Counter: ${offlinePercent}%`}
              />
            </div>

            <div className="space-y-2.5">
              {/* Online (UPI / GPay / QR) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Online UPI / GPay
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Direct QR &amp; Gateway</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    {currency}{(data?.onlineRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">({onlinePercent}%)</span>
                </div>
              </div>

              {/* Cash at Counter */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Cash at Counter
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Physical Cash Handover</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                    {currency}{(data?.offlineRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">({offlinePercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Print Mode Split & Paper Sheets */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs transition-colors space-y-4">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Media &amp; Print Consumption
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Black &amp; White</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {currency}{(data?.bwRevenue || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{bwPercent}% share</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-yellow-400 block mb-1">Full Color</span>
                <span className="text-sm font-black text-indigo-700 dark:text-yellow-400">
                  {currency}{(data?.colorRevenue || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-indigo-500 dark:text-slate-400 block mt-0.5">{colorPercent}% share</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-yellow-400 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Physical Paper Counter</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {(data?.totalPagesPrinted || 0).toLocaleString()} Sheets
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Receipts & Completed Payments Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Payment History Ledger
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                ({filteredRecentPayments.length} transactions)
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Customer Payment Receipts &amp; Counter Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every completed order and payment collection with OTP, customer, payment method, and exact timestamp
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search OTP or customer..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-44 sm:w-52"
              />
            </div>

            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPaymentFilter('online')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                UPI Online
              </button>
              <button
                type="button"
                onClick={() => setPaymentFilter('cash')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'cash'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredRecentPayments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No transactions found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Fulfill customer print jobs at the Counter Desk to record live receipts in this accounting ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Order OTP</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Print Specs</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecentPayments.map((p) => {
                  const dateStr = p.time ? new Date(p.time).toLocaleString() : 'Recent';
                  const isOnline = p.paymentMethod === 'online';

                  return (
                    <tr key={p.id || p.otp} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* OTP */}
                      <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {p.otp || '----'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {p.customerName || 'Walk-in Customer'}
                      </td>

                      {/* Print Specs */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <span className="capitalize">{p.colorMode === 'color' ? 'Full Color' : 'B&W'}</span>
                        <span className="text-slate-400 text-[10px] ml-1">({p.copies} {p.copies === 1 ? 'copy' : 'copies'})</span>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isOnline
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isOnline ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                          <span>{p.methodDetail || (isOnline ? 'Online UPI' : 'Cash')}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right font-black text-sm text-slate-900 dark:text-slate-100">
                        {currency}{p.amount.toFixed(2)}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-3 text-right text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
