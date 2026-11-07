import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Search,
  ArrowRight,
  RefreshCw,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrintJob, ShopSettings } from '../types';
import {
  getRecentCustomerJobs,
  updateRecentJobStatuses,
  clearRecentCustomerJobs,
} from '../utils/customerJobsStorage';
import { soundEffects } from '../utils/soundEffects';

interface CustomerRecentJobsProps {
  shopSettings: ShopSettings | null;
  onSelectJob: (job: PrintJob) => void;
  onLookupCode?: (code: string) => void;
}

export const CustomerRecentJobs: React.FC<CustomerRecentJobsProps> = ({
  shopSettings,
  onSelectJob,
  onLookupCode,
}) => {
  const [jobs, setJobs] = useState<PrintJob[]>(() => getRecentCustomerJobs());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const currency = shopSettings?.currency || '₹';

  const refreshStatuses = async () => {
    const current = getRecentCustomerJobs();
    if (current.length === 0) return;

    setIsRefreshing(true);
    try {
      const otps = current.map((j) => j.otp).filter(Boolean);
      const ids = current.map((j) => j.id).filter(Boolean);

      const res = await fetch('/api/jobs/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otps, ids }),
      });

      if (res.ok) {
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {}
        if (data?.success && Array.isArray(data.jobs)) {
          const updated = updateRecentJobStatuses(data.jobs);
          setJobs(updated);
        }
      }
    } catch (err) {
      console.warn('Could not refresh recent job statuses:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (e: React.MouseEvent, otp: string) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(otp);
    }
    soundEffects.playCopyPing();
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2000);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.replace(/\D/g, '').slice(0, 4);
    if (clean.length === 4 && onLookupCode) {
      soundEffects.playSearchDing();
      onLookupCode(clean);
      setManualCode('');
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  if (jobs.length === 0) {
    return null;
  }

  const handleClearHistory = () => {
    clearRecentCustomerJobs();
    setJobs([]);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold text-sm shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Recent Print Jobs
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700">
                {jobs.length} job{jobs.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Orders placed from this browser — click to view pickup code and track status
            </p>
          </div>
        </div>

        {/* Action Controls & Manual Code Lookup */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={refreshStatuses}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh job statuses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-yellow-400' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Clear list from this device"
          >
            <span>Clear</span>
          </button>

          <form onSubmit={handleManualSearch} className="flex items-center space-x-1">
            <input
              type="text"
              maxLength={4}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Track other 4-digit code..."
              className="w-36 sm:w-44 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-center tracking-wider"
            />
            <button
              type="submit"
              disabled={manualCode.length !== 4}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Track
            </button>
          </form>
        </div>
      </div>

      {/* Jobs List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => {
              const fileCount = job.files?.length || 1;
              const fileName = job.files?.[0]?.originalName || 'Document';
              const copies = job.settings?.copies || 1;
              const isColor = job.settings?.colorMode === 'color';
              const isDouble = job.settings?.duplex === 'double';
              const isLandscape = job.settings?.orientation === 'landscape';
              const isOriginalScale = job.settings?.scale === 'original';
              const paper = job.settings?.paperSize || 'A4';
              const isPaid = job.paymentStatus === 'paid';

              return (
                <motion.div
                  key={job.id || job.otp}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors rounded-2xl px-2 sm:px-3 -mx-2 sm:-mx-3 cursor-pointer group"
                  onClick={() => onSelectJob(job)}
                >
                  {/* Left: Code & Core Info */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    {/* OTP Badge with Copy */}
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="px-3 py-1.5 rounded-xl bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 text-white font-black text-sm sm:text-base tracking-widest shadow-xs flex items-center space-x-1.5">
                        <span>{job.otp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, job.otp)}
                        className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-yellow-400 flex items-center space-x-0.5 cursor-pointer"
                        title="Copy OTP"
                      >
                        {copiedOtp === job.otp ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Job Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs">
                          {fileName} {fileCount > 1 ? `(+${fileCount - 1} more)` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          • {formatTimeAgo(job.createdAt)}
                        </span>
                      </div>

                      {/* Specifications Badges */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {paper}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            isColor
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isColor ? 'Color' : 'B&W'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {isDouble ? 'Double-Sided' : 'Single-Sided'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-yellow-950/50 text-indigo-700 dark:text-yellow-300 font-semibold">
                          {isLandscape ? 'Horizontal (Landscape)' : 'Vertical (Portrait)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {isOriginalScale ? 'Original Size' : 'Fit to Paper'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {copies} copy{copies > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & View Slip button */}
                  <div className="flex items-center justify-between md:justify-end space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="flex items-center md:justify-end space-x-1.5">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                          {currency}{job.pricing?.totalPrice?.toFixed(2) || '0.00'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isPaid
                              ? (job.paymentMethod?.includes('online') || job.notes?.toLowerCase().includes('online') || job.notes?.toLowerCase().includes('gpay'))
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isPaid
                            ? (job.paymentMethod?.includes('online') || job.notes?.toLowerCase().includes('online') || job.notes?.toLowerCase().includes('gpay')
                              ? 'Digital Paid ✓'
                              : 'Cash Paid ✓')
                            : 'Pay at Desk'}
                        </span>
                      </div>
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                        Ready Directly
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 group-hover:bg-indigo-600 dark:group-hover:bg-yellow-400 dark:group-hover:text-slate-950 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>View Slip</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
    </div>
  );
};
