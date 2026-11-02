import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Crown,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Wifi,
  Sliders,
  RotateCw,
  Settings2,
  Zap,
  SlidersHorizontal,
  Edit3,
} from 'lucide-react';
import { PrintJob, ShopSettings, UploadedFileMeta, PrintExecutionMode } from '../types';
import { FileViewerModal } from './FileViewerModal';
import { CustomerQrModal } from './CustomerQrModal';
import { triggerSystemPrint, triggerAutoPrint, AutoPrintOptions } from '../utils/printHelper';
import { soundEffects } from '../utils/soundEffects';

interface OwnerDeskViewProps {
  shopSettings: ShopSettings | null;
  onRefreshSettings: () => void;
}

export const OwnerDeskView: React.FC<OwnerDeskViewProps> = ({
  shopSettings,
}) => {
  const [otpInput, setOtpInput] = useState('');
  const [activeJob, setActiveJob] = useState<PrintJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Print execution mode: Automatic vs Manual
  const [printMode, setPrintMode] = useState<PrintExecutionMode>('automatic');

  // Pre-configured Machine Print Settings (For Automatic Direct Print)
  const [autoSettings, setAutoSettings] = useState<{
    orientation: 'portrait' | 'landscape';
    scale: 'fit' | 'original';
    colorMode: 'bw' | 'color';
    paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
    rotation: number;
    copies: number;
  }>({
    orientation: 'portrait',
    scale: 'fit',
    colorMode: 'bw',
    paperSize: 'A4',
    rotation: 0,
    copies: 1,
  });

  // QR Code Modal for two-device / customer mobile upload
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Queue of waiting customer jobs
  const [pendingQueue, setPendingQueue] = useState<PrintJob[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);

  // Document preview modal
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const currentCounterUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Fetch pending / active counter queue
  const fetchQueue = async () => {
    setIsQueueLoading(true);
    try {
      const shopSlugParam = shopSettings?.shopSlug || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : '') || '';
      const fetchUrl = shopSlugParam ? `/api/jobs?status=active&shop=${encodeURIComponent(shopSlugParam)}` : '/api/jobs?status=active';
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.jobs)) {
        setPendingQueue(data.jobs);
      }
    } catch (err) {
      console.warn('Queue fetch error:', err);
    } finally {
      setIsQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch job by OTP
  const handleLookupOtp = async (codeToLookup?: string) => {
    const raw = codeToLookup !== undefined ? codeToLookup : otpInput;
    const code = raw.replace(/\D/g, '').slice(0, 4);

    if (!code || code.length !== 4) {
      setErrorMsg('Please enter a valid 4-digit numeric code.');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setActionSuccess(null);

    try {
      let foundJob: PrintJob | null = null;

      // 1. Check local server endpoint
      const res = await fetch(`/api/jobs/lookup/${code}`);
      const data = await res.json();

      if (res.ok && data.success && data.job) {
        foundJob = data.job;
      } else {
        // 2. Peer domain fallback if running in AI Studio (e.g. ais-dev vs ais-pre)
        if (typeof window !== 'undefined') {
          let peerHost = '';
          if (window.location.hostname.includes('ais-dev')) {
            peerHost = window.location.hostname.replace('ais-dev', 'ais-pre');
          } else if (window.location.hostname.includes('ais-pre')) {
            peerHost = window.location.hostname.replace('ais-pre', 'ais-dev');
          }

          if (peerHost) {
            try {
              const peerRes = await fetch(`https://${peerHost}/api/jobs/lookup/${code}`, {
                credentials: 'omit',
              });
              if (peerRes.ok) {
                const peerData = await peerRes.json();
                if (peerData.success && peerData.job) {
                  foundJob = peerData.job;
                  // Sync to local server so current database stores it
                  await fetch('/api/jobs/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(peerData.job),
                  });
                  setActionSuccess(`Job synced from peer server for OTP ${code}!`);
                }
              }
            } catch (peerErr) {
              // Ignore peer error and handle below
            }
          }
        }
      }

      if (!foundJob) {
        throw new Error(
          data?.error ||
            `No active print job found for OTP ${code}. Verify the customer uploaded documents using: ${currentCounterUrl}`
        );
      }

      setActiveJob(foundJob);
      setOtpInput(code);

      // Auto mark as 'received' (operator actively looking at it)
      if (foundJob.status === 'pending') {
        updateJobStatus(foundJob.id, 'received', false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Job lookup failed');
      setActiveJob(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy counter direct URL
  const handleCopyCounterLink = () => {
    if (!currentCounterUrl) return;
    navigator.clipboard.writeText(currentCounterUrl);
    soundEffects.playCopyPing();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Update status (e.g. printed, paid, collected)
  const updateJobStatus = async (
    jobId: string,
    status: PrintJob['status'],
    showNotification = true
  ) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.job) {
        soundEffects.playStatusChange(status);
        setActiveJob(data.job);
        fetchQueue();
        if (showNotification) {
          setActionSuccess(`Job marked as "${status.toUpperCase()}".`);
          setTimeout(() => setActionSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to update status: ' + err.message);
    }
  };

  // Update payment status (paid / unpaid)
  const togglePayment = async (jobId: string, current: 'paid' | 'unpaid') => {
    const nextStatus = current === 'paid' ? 'unpaid' : 'paid';
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.job) {
        if (nextStatus === 'paid') {
          soundEffects.playPaymentSuccess();
        } else {
          soundEffects.playOptionTick();
        }
        setActiveJob(data.job);
        fetchQueue();
        setActionSuccess(`Payment updated to ${nextStatus.toUpperCase()}`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg('Failed to update payment: ' + err.message);
    }
  };

  // Dedicated atomic handler for Mark as Printed
  const handleMarkAsPrinted = async () => {
    if (!activeJob) return;
    setIsFulfilling(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/jobs/${activeJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'printed' }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.job) {
        soundEffects.playStatusChange('printed');
        setActiveJob(data.job);
        fetchQueue();
        setActionSuccess(`✓ Order OTP ${data.job.otp} marked as PRINTED!`);
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        throw new Error(data?.error || 'Failed to update job status');
      }
    } catch (err: any) {
      setErrorMsg('Could not mark as printed: ' + err.message);
    } finally {
      setIsFulfilling(false);
    }
  };

  // Dedicated atomic handler for Complete & Deliver
  const handleCompleteAndDeliver = async () => {
    if (!activeJob) return;
    setIsFulfilling(true);
    setErrorMsg(null);
    try {
      const isAlreadyPaid = activeJob.paymentStatus === 'paid';
      const res = await fetch(`/api/jobs/${activeJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'collected',
          paymentStatus: 'paid',
          paymentMethod: isAlreadyPaid ? (activeJob.paymentMethod || 'online_gpay') : 'counter',
          notes: activeJob.notes || 'Completed, paid and delivered to customer at counter desk',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.job) {
        soundEffects.playPaymentSuccess();
        setActiveJob(data.job);
        fetchQueue();
        setActionSuccess(`🎉 Order OTP ${data.job.otp} COMPLETED & DELIVERED!`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        throw new Error(data?.error || 'Failed to complete order');
      }
    } catch (err: any) {
      setErrorMsg('Could not deliver order: ' + err.message);
    } finally {
      setIsFulfilling(false);
    }
  };

  // Sync autoSettings with active customer job
  useEffect(() => {
    if (activeJob) {
      setAutoSettings({
        orientation: activeJob.settings?.orientation || 'portrait',
        scale: activeJob.settings?.scale || 'fit',
        colorMode: activeJob.settings?.colorMode || 'bw',
        paperSize: (activeJob.settings?.paperSize as any) || 'A4',
        rotation: 0,
        copies: activeJob.settings?.copies || 1,
      });
    }
  }, [activeJob?.id]);

  // Print single file: Automatic (Direct machine output) vs Manual (OS settings)
  const handlePrintFile = async (file: UploadedFileMeta) => {
    if (printMode === 'automatic') {
      setActionSuccess(`⚡ Auto-Printing ${file.originalName} with pre-set machine layout (${autoSettings.paperSize} ${autoSettings.orientation})...`);
      await triggerAutoPrint(file.url, file.originalName, file.mimeType, autoSettings);
      soundEffects.playPaymentSuccess();
      if (activeJob) {
        updateJobStatus(activeJob.id, 'printed');
      }
      setTimeout(() => setActionSuccess(null), 3500);
    } else {
      triggerSystemPrint(file.url, file.originalName, file.mimeType);
      setActionSuccess(`Opening manual system print settings for ${file.originalName}`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Print all documents in the job
  const handlePrintAll = async () => {
    if (!activeJob || activeJob.files.length === 0) return;
    if (printMode === 'automatic') {
      setActionSuccess(`⚡ Auto-Printing all ${activeJob.files.length} documents directly...`);
      for (let i = 0; i < activeJob.files.length; i++) {
        const file = activeJob.files[i];
        await triggerAutoPrint(file.url, file.originalName, file.mimeType, autoSettings);
      }
      soundEffects.playPaymentSuccess();
      updateJobStatus(activeJob.id, 'printed');
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      activeJob.files.forEach((file, index) => {
        setTimeout(() => {
          triggerSystemPrint(file.url, file.originalName, file.mimeType);
        }, index * 800);
      });
      setActionSuccess(`Opening system print dialogs for all ${activeJob.files.length} documents...`);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const currency = shopSettings?.currency || '₹';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Top OTP Terminal & Counter Portal Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-yellow-400 bg-indigo-50 dark:bg-yellow-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-yellow-800/80">
                Live Counter Terminal
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                Ready for Pickup
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Enter Customer 4-Digit OTP
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type the 4-digit code provided by the customer to pull up their print job directly
            </p>
          </div>

          {/* Quick Counter Link & QR Poster Trigger */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyCounterLink}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
              title="Copy customer upload URL"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.open(currentCounterUrl, '_blank')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
              title="Open customer upload portal in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Open Kiosk</span>
            </button>

            <button
              id="show-qr-poster-btn"
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              title="Show QR code and printable poster"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-300 dark:text-yellow-400" />
              <span>Show QR</span>
            </button>
          </div>
        </div>

        {/* 4-Digit OTP Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookupOtp();
          }}
          className="mt-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                ref={otpInputRef}
                id="owner-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={otpInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setOtpInput(cleaned);
                  if (cleaned.length === 4) {
                    handleLookupOtp(cleaned);
                  }
                }}
                placeholder="Enter 4-digit OTP (e.g. 1234)"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 rounded-2xl py-3.5 px-4 text-center sm:text-left text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-[0.2em] outline-none transition-all shadow-inner"
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                id="fetch-job-btn"
                type="submit"
                disabled={isLoading || otpInput.replace(/\D/g, '').length !== 4}
                className="flex-1 sm:flex-initial py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Fetch Customer Job</span>
                  </>
                )}
              </button>

              {otpInput && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput('');
                    setErrorMsg(null);
                    otpInputRef.current?.focus();
                  }}
                  className="px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </form>
      </div>

      {/* 1. DIRECTLY SHOW CUSTOMER PRINTING JOB AT FIRST */}
      {activeJob && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-yellow-400 rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 mb-8 relative overflow-hidden transition-colors">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500" />

          {/* Job Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-3 py-1 rounded-xl text-sm font-black bg-indigo-600 dark:bg-yellow-400 text-white dark:text-slate-950 tracking-widest shadow-xs">
                  OTP: {activeJob.otp}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-yellow-400 bg-indigo-50 dark:bg-yellow-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-yellow-800/80">
                  Active Customer Print Job
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
                {activeJob.customerName || 'Counter Customer'}
              </h2>
              <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                {activeJob.customerPhone && <span>Phone: {activeJob.customerPhone}</span>}
                <span>
                  Received:{' '}
                  {new Date(activeJob.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 self-start sm:self-auto shrink-0">
              {/* Status Badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                  activeJob.status === 'printed'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : activeJob.status === 'collected'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {activeJob.status}
              </span>

              {/* Payment Badge */}
              <button
                type="button"
                onClick={() => togglePayment(activeJob.id, activeJob.paymentStatus)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  activeJob.paymentStatus === 'paid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                }`}
              >
                {activeJob.paymentStatus === 'paid'
                  ? (activeJob.paymentMethod?.includes('online') || activeJob.notes?.toLowerCase().includes('gpay') || activeJob.notes?.toLowerCase().includes('online')
                    ? 'PAID ONLINE (GPay / UPI) ✓'
                    : 'PAID ✓')
                  : 'UNPAID • Pay at Counter'}
              </button>
            </div>
          </div>

          {/* Print Specifications Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Color Mode
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold ${
                  activeJob.settings.colorMode === 'color' ? 'text-indigo-600 dark:text-yellow-400' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {activeJob.settings.colorMode === 'color' ? 'Full Color' : 'Black & White'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Copies / Sets
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeJob.settings.copies} Copy{activeJob.settings.copies > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Size &amp; Duplex
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeJob.settings.paperSize} •{' '}
                {activeJob.settings.duplex === 'double' ? 'Double' : 'Single'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Orientation &amp; Scale
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {activeJob.settings.orientation === 'landscape' ? 'Horizontal' : 'Vertical'} •{' '}
                {activeJob.settings.scale === 'original' ? 'Original' : 'Fit'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Total Price
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {currency}{activeJob.pricing.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {activeJob.notes && (
            <div className="p-3 bg-indigo-50/40 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs">
              <span className="font-extrabold text-indigo-700 dark:text-yellow-400">Customer Instructions: </span>
              <span className="text-slate-700 dark:text-slate-300">{activeJob.notes}</span>
            </div>
          )}

          {/* Print Mode Selector & Pre-Print Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Print Execution Mode
                </h4>
              </div>

              {/* Toggle: Automatic vs Manual */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setPrintMode('automatic')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    printMode === 'automatic'
                      ? 'bg-indigo-600 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 dark:text-slate-950" />
                  <span>Automatic (Auto Print)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('manual')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    printMode === 'manual'
                      ? 'bg-indigo-600 dark:bg-yellow-400 text-white dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Manual (OS Dialog &amp; Edit)</span>
                </button>
              </div>
            </div>

            {/* When Automatic Mode is Selected */}
            {printMode === 'automatic' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Machine Pre-Set Layout (Direct Output to Printer):
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Prints directly according to selected settings without re-selecting in OS dialog!
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {/* Orientation */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Orientation</span>
                    <select
                      value={autoSettings.orientation}
                      onChange={(e) => setAutoSettings({ ...autoSettings, orientation: e.target.value as any })}
                      className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs"
                    >
                      <option value="portrait">Vertical (Portrait)</option>
                      <option value="landscape">Horizontal (Landscape)</option>
                    </select>
                  </div>

                  {/* Fit to Size / Scale */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Scale / Sizing</span>
                    <select
                      value={autoSettings.scale}
                      onChange={(e) => setAutoSettings({ ...autoSettings, scale: e.target.value as any })}
                      className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs"
                    >
                      <option value="fit">Fit to Paper Size</option>
                      <option value="original">Original (100%)</option>
                    </select>
                  </div>

                  {/* Color Mode */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Color Mode</span>
                    <select
                      value={autoSettings.colorMode}
                      onChange={(e) => setAutoSettings({ ...autoSettings, colorMode: e.target.value as any })}
                      className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs"
                    >
                      <option value="bw">Black &amp; White (Grayscale)</option>
                      <option value="color">Full Color</option>
                    </select>
                  </div>

                  {/* Paper Size */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Paper Size</span>
                    <select
                      value={autoSettings.paperSize}
                      onChange={(e) => setAutoSettings({ ...autoSettings, paperSize: e.target.value as any })}
                      className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs"
                    >
                      <option value="A4">A4 Standard</option>
                      <option value="A3">A3 Large</option>
                      <option value="Legal">Legal</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>

                  {/* Rotation */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">Rotation</span>
                    <select
                      value={autoSettings.rotation}
                      onChange={(e) => setAutoSettings({ ...autoSettings, rotation: Number(e.target.value) })}
                      className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs"
                    >
                      <option value={0}>0° (Normal)</option>
                      <option value={90}>90° (Clockwise)</option>
                      <option value={180}>180° (Invert)</option>
                      <option value={270}>270° (Counter)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* When Manual Mode is Selected */
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Manual Print &amp; External Edit Mode Active</span>
                </span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  When you click <strong>PRINT</strong> below, the full operating system print dialog will open. You can choose any printer device, configure margins, or click <strong>Download</strong> to edit the document in Photoshop, Word, or Canva before printing.
                </p>
              </div>
            )}
          </div>

          {/* Uploaded Files Section */}
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center">
                <FileText className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-yellow-400" />
                Customer Documents ({activeJob.files.length})
              </h3>

              {activeJob.files.length > 1 && (
                <button
                  id="owner-print-all-btn"
                  type="button"
                  onClick={handlePrintAll}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all cursor-pointer self-start xs:self-auto ${
                    printMode === 'automatic'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  {printMode === 'automatic' ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                      <span>⚡ Auto Print All ({activeJob.files.length})</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5 text-indigo-300 dark:text-yellow-400" />
                      <span>🖨️ System Print All ({activeJob.files.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {activeJob.files.map((file, idx) => (
                <div
                  key={file.id || idx}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 truncate min-w-0 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{file.originalName}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.mimeType || 'Document'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:space-x-2 shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                      <span>Preview</span>
                    </button>

                    <a
                      id={`owner-download-file-${idx}`}
                      href={file.downloadUrl}
                      download={file.originalName}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center space-x-1 shadow-2xs"
                      title="Download document to desktop for editing"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Download</span>
                    </a>

                    <button
                      id={`owner-print-file-${idx}`}
                      type="button"
                      onClick={() => handlePrintFile(file)}
                      className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        printMode === 'automatic'
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title={printMode === 'automatic' ? 'Auto Print directly to machine' : 'Open system print dialog'}
                    >
                      {printMode === 'automatic' ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-yellow-300" />
                          <span>AUTO PRINT</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-3.5 h-3.5" />
                          <span>PRINT</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Fulfillment Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAsPrinted}
                disabled={isFulfilling || activeJob.status === 'printed' || activeJob.status === 'collected'}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/80 border border-indigo-200 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className={`w-4 h-4 ${isFulfilling ? 'animate-spin' : ''}`} />
                <span>
                  {isFulfilling
                    ? 'Updating...'
                    : activeJob.status === 'printed'
                    ? 'Printed ✓'
                    : 'Mark as Printed'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCompleteAndDeliver}
                disabled={isFulfilling || activeJob.status === 'collected'}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 text-emerald-200 ${isFulfilling ? 'animate-pulse' : ''}`} />
                <span>
                  {isFulfilling
                    ? 'Delivering...'
                    : activeJob.status === 'collected'
                    ? 'Delivered & Complete ✓'
                    : 'Complete & Deliver'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveJob(null);
                setOtpInput('');
                otpInputRef.current?.focus();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-center cursor-pointer transition-colors"
            >
              Close / Clear Job
            </button>
          </div>
        </div>
      )}

      {/* 2. THEN AFTER THAT SHOW THE WAITING QUEUE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Waiting Counter Queue ({pendingQueue.length})
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
              • Click any customer below to load their print job directly at the top
            </span>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${isQueueLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-slate-400 dark:text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Printer className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">No customers currently waiting in the queue.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              When a customer uploads documents from their phone or laptop, their 4-digit code and documents will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingQueue.map((qJob) => {
              const isCurrentActive = activeJob?.id === qJob.id;
              return (
                <div
                  key={qJob.id}
                  onClick={() => {
                    setActiveJob(qJob);
                    setOtpInput(qJob.otp);
                    updateJobStatus(qJob.id, 'received', false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isCurrentActive
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-yellow-400 ring-2 ring-indigo-500/30 shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-slate-600 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-black text-base flex items-center justify-center shadow-xs shrink-0 tracking-wider">
                        {qJob.otp}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {qJob.customerName || 'Counter Customer'}
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(qJob.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                        qJob.settings.colorMode === 'color'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {qJob.settings.colorMode === 'color' ? 'Color' : 'B/W'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {qJob.files.length} doc{qJob.files.length > 1 ? 's' : ''} • {qJob.settings.copies} copy
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                      {currency}{qJob.pricing.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-browser Document Viewer Modal */}
      {previewFile && (
        <FileViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Two-Device / Mobile Customer Upload QR Modal */}
      <CustomerQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        shopName={shopSettings?.shopName}
        shopSettings={shopSettings}
      />
    </div>
  );
};
