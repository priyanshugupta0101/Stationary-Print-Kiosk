import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { AnalyticsSummary, ShopSettings } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OwnerAnalyticsViewProps {
  shopSettings: ShopSettings | null;
}

export const OwnerAnalyticsView: React.FC<OwnerAnalyticsViewProps> = ({ shopSettings }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const shopSlugParam = shopSettings?.shopSlug || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : '') || '';
      const url = shopSlugParam ? `/api/analytics?shop=${encodeURIComponent(shopSlugParam)}` : '/api/analytics';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.analytics);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(collection(db, 'print_jobs'), () => {
        fetchAnalytics();
      });
    } catch (e) {
      console.warn('Could not attach Firestore analytics listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [shopSettings?.shopSlug]);

  const currency = shopSettings?.currency || '₹';

  // Calculate percentage of color vs bw revenue
  const totalColorAndBw = (data?.colorRevenue || 0) + (data?.bwRevenue || 0);
  const colorPercent =
    totalColorAndBw > 0
      ? Math.round(((data?.colorRevenue || 0) / totalColorAndBw) * 100)
      : 50;
  const bwPercent = totalColorAndBw > 0 ? 100 - colorPercent : 50;

  const maxDailyRevenue = Math.max(1, ...(data?.dailyRevenue.map((d) => d.revenue) || [1]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-yellow-400 text-xs font-extrabold uppercase tracking-wide mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Accounting Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Revenue &amp; Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily income reports, sheet counters, and collection audits calculated from SQLite database
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Accounting</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
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
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mr-1">{data?.todayJobs || 0}</span> orders today
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
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
            From <span className="font-bold text-slate-700 dark:text-slate-300">{data?.totalJobs || 0}</span> jobs
          </div>
        </div>

        {/* Unpaid Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
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
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 truncate">Awaiting payment</div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Revenue Trend */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Daily Income Performance (Past 7 Days)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily collection receipts generated automatically</p>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="h-60 sm:h-64 flex items-end justify-between gap-2 pt-8 pb-4 min-w-[320px]">
              {data?.dailyRevenue.map((day) => {
                const heightPercent =
                  maxDailyRevenue > 0 ? Math.max(8, (day.revenue / maxDailyRevenue) * 100) : 8;
                const dateObj = new Date(day.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateNumber = dateObj.toLocaleDateString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                });

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group">
                    {/* Tooltip value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 pointer-events-none whitespace-nowrap shadow-xs">
                      {currency}{day.revenue.toFixed(2)} ({day.jobs} jobs)
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[44px] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col justify-end h-36 sm:h-44 p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-indigo-600 dark:bg-yellow-400 group-hover:bg-indigo-500 dark:group-hover:bg-yellow-300 rounded-lg transition-all duration-300"
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

        {/* Color vs B/W Breakdown & Sheets Printed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Print Mode Split */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              Revenue by Print Mode
            </h3>

            {/* Visual ratio bar */}
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-4">
              <div
                style={{ width: `${bwPercent}%` }}
                className="bg-slate-800 dark:bg-slate-600 transition-all duration-500"
                title={`B/W: ${bwPercent}%`}
              />
              <div
                style={{ width: `${colorPercent}%` }}
                className="bg-indigo-600 dark:bg-yellow-400 transition-all duration-500"
                title={`Color: ${colorPercent}%`}
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-slate-800 dark:bg-slate-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Black &amp; White</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {currency}{(data?.bwRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">({bwPercent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-yellow-400" />
                  <span className="text-xs font-bold text-indigo-700 dark:text-yellow-400">Full Color</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-700 dark:text-yellow-400">
                    {currency}{(data?.colorRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">({colorPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paper Sheets Counter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Total Physical Paper
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {(data?.totalPagesPrinted || 0).toLocaleString()} Sheets
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Automatic sheet counter tracks physical paper usage across all completed orders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
