import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Printer,
  ArrowLeft,
  Check,
  CreditCard,
  Store,
  QrCode,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { PrintJob, ShopSettings } from '../types';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateRecentJobPaymentStatus } from '../utils/customerJobsStorage';
import { soundEffects } from '../utils/soundEffects';

interface CustomerCodeResultProps {
  job: PrintJob;
  shopSettings: ShopSettings | null;
  onReset: () => void;
}

export const CustomerCodeResult: React.FC<CustomerCodeResultProps> = ({
  job,
  shopSettings,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Payment mode state: 'counter' (pay at counter) or 'online' (GPay / UPI / QR)
  const isOnlineEnabled = shopSettings?.enableOnlinePayments !== false;
  const isInitiallyPaid = job.paymentStatus === 'paid';
  
  const [paymentMode, setPaymentMode] = useState<'counter' | 'online'>(
    isInitiallyPaid ? 'online' : 'counter'
  );
  const [isPaid, setIsPaid] = useState(isInitiallyPaid);
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState<string>(() => {
    if (job.paymentMethod) return job.paymentMethod;
    if (isInitiallyPaid) {
      const notes = (job.notes || '').toLowerCase();
      if (notes.includes('cash') || notes.includes('offline') || notes.includes('counter')) return 'counter';
      return 'online_gpay';
    }
    return '';
  });
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(
    isInitiallyPaid ? 'Payment Confirmed' : null
  );
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Explicit calculation of payment method flags
  const activeMethod = String(confirmedPaymentMethod || job.paymentMethod || '');
  const activeNotes = (job.notes || '').toLowerCase();
  const isCashPayment =
    activeMethod === 'counter' ||
    activeMethod.includes('cash') ||
    activeNotes.includes('cash') ||
    activeNotes.includes('offline');
  const isOnlinePayment =
    !isCashPayment && (
      activeMethod.includes('online') ||
      activeMethod.includes('upi') ||
      activeMethod.includes('gpay') ||
      activeNotes.includes('online') ||
      activeNotes.includes('gpay') ||
      activeNotes.includes('upi') ||
      isPaid
    );

  const currency = shopSettings?.currency || job.pricing?.currency || '₹';
  const totalPrice = job.pricing?.totalPrice || 10;
  const formattedPrice = totalPrice.toFixed(2);

  const shopName = shopSettings?.shopName || 'COPY';
  const upiId = (shopSettings?.upiId || '').trim();
  const hasOnlinePayments = Boolean(shopSettings?.enableOnlinePayments !== false && upiId);
  const payeeName = (shopSettings?.upiPayeeName || shopName || 'Print Shop')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 25);

  // Detect if this is a personal wallet (like FamPay / teenage wallet / personal VPA)
  const isFamPayOrPersonal =
    upiId.toLowerCase().includes('@fam') ||
    upiId.toLowerCase().includes('@fampay') ||
    shopSettings?.upiAccountType === 'personal';

  const [upiQrMode, setUpiQrMode] = useState<'exact' | 'universal'>(
    isFamPayOrPersonal ? 'universal' : 'exact'
  );
  const [utrNumber, setUtrNumber] = useState('');
  const [showUtrField, setShowUtrField] = useState(false);

  // NPCI Compliant UPI URIs:
  // IMPORTANT: The @ symbol in 'pa' MUST NOT be percent-encoded to %40!
  // For Personal / FamPay accounts: Omit 'tn=' merchant parameter to avoid GPay's
  // "Can't do payments. Transaction limit exceeded" false merchant error!
  const exactAmountUpiUri = upiId
    ? isFamPayOrPersonal
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${formattedPrice}&cu=INR`
      : `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${formattedPrice}&cu=INR&tn=${encodeURIComponent(`Order ${job.otp}`)}`
    : '';

  // Universal P2P QR: Without fixed amount or merchant flags.
  // Google Pay and FamPay treat this as a standard peer-to-peer wallet transfer,
  // bypassing dynamic merchant limit blocks on personal/teen wallets!
  const universalP2pUpiUri = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&cu=INR`
    : '';

  const activeUpiUri = upiQrMode === 'exact' ? exactAmountUpiUri : universalP2pUpiUri;

  // Play triumphant 4-digit OTP slip generation fanfare sound on mount
  useEffect(() => {
    soundEffects.playOtpSlipSuccess();
  }, [job.otp]);

  // Generate dynamic payment QR barcode for this specific customer job
  useEffect(() => {
    if (paymentMode === 'online' && activeUpiUri) {
      QRCode.toDataURL(activeUpiUri, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR:', err));
    }
  }, [paymentMode, activeUpiUri]);

  // Listen for real-time updates from Owner Desk on another device
  useEffect(() => {
    if (!job.id) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(db, 'print_jobs', job.id), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PrintJob;
          if (data.paymentStatus === 'paid') {
            setIsPaid(true);
            const method = data.paymentMethod || 'online_gpay';
            setConfirmedPaymentMethod(method);
            const isCash = method === 'counter' || String(method).includes('cash') || (data.notes || '').toLowerCase().includes('cash');
            setPaymentSuccessMsg(
              isCash
                ? `Payment confirmed in Cash at Counter!`
                : `Payment confirmed via GPay / UPI!`
            );
            updateRecentJobPaymentStatus(job.id, 'paid', method);
            updateRecentJobPaymentStatus(job.otp, 'paid', method);
          }
        }
      });
    } catch (e) {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [job.id]);

  const copyCode = () => {
    navigator.clipboard.writeText(job.otp);
    soundEffects.playCopyPing();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    soundEffects.playCopyPing();
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Direct GPay Launch Handler
  const handleLaunchGPay = (e: React.MouseEvent) => {
    window.location.href = activeUpiUri || exactAmountUpiUri;
  };

  // Confirm Online Payment
  const handleConfirmOnlinePaid = async () => {
    setIsConfirmingPayment(true);
    const onlineNotes = `Paid online ₹${formattedPrice} via GPay/UPI (${new Date().toLocaleTimeString()})${utrNumber.trim() ? ` [UTR: ${utrNumber.trim()}]` : ''}`;
    setConfirmedPaymentMethod('online_gpay');
    setIsPaid(true);
    setPaymentSuccessMsg(`Payment of ${currency}${formattedPrice} confirmed via GPay / UPI!`);
    soundEffects.playPaymentSuccess();
    updateRecentJobPaymentStatus(job.id, 'paid', 'online_gpay');
    updateRecentJobPaymentStatus(job.otp, 'paid', 'online_gpay');

    // Confetti effect
    try {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    // Direct Firestore update
    try {
      await updateDoc(doc(db, 'print_jobs', job.id), {
        paymentStatus: 'paid',
        paymentMethod: 'online_gpay',
        notes: onlineNotes,
      });
    } catch (fsErr) {
      console.warn('Direct firestore payment update:', fsErr);
    }

    // Server API update
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: 'online_gpay',
          notes: onlineNotes,
        }),
      });
    } catch (err) {
      console.warn('Server payment update notice:', err);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Confirm Cash Payment at Counter
  const handleConfirmCashPaid = async () => {
    setIsConfirmingPayment(true);
    const cashNotes = `Paid in Cash at Counter (${currency}${formattedPrice}) (${new Date().toLocaleTimeString()})`;
    setConfirmedPaymentMethod('counter');
    setIsPaid(true);
    setPaymentSuccessMsg(`Payment of ${currency}${formattedPrice} recorded in Cash at Counter!`);
    soundEffects.playPaymentSuccess();
    updateRecentJobPaymentStatus(job.id, 'paid', 'counter');
    updateRecentJobPaymentStatus(job.otp, 'paid', 'counter');

    // Direct Firestore update
    try {
      await updateDoc(doc(db, 'print_jobs', job.id), {
        paymentStatus: 'paid',
        paymentMethod: 'counter',
        notes: cashNotes,
      });
    } catch (fsErr) {
      console.warn('Direct firestore cash payment update:', fsErr);
    }

    // Server API update
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: 'counter',
          notes: cashNotes,
        }),
      });
    } catch (err) {
      console.warn('Server cash payment notice:', err);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Live print track: all steps automatically ticked with green checkmarks
  const trackingSteps = [
    { label: 'Queued', sub: 'Transferred' },
    { label: 'Reviewing', sub: 'Verified' },
    { label: 'Printing', sub: 'Processed' },
    { label: 'Ready', sub: 'Counter Pickup' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Modern Digital Ticket Card */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative transition-colors"
      >
        {/* Top Emerald Banner */}
        <div className="h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 dark:from-emerald-400 dark:via-teal-400 dark:to-yellow-400" />

        {/* Ticket Header */}
        <div className="p-6 sm:p-8 text-center pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 block mb-1">
            Order Confirmed &amp; Ready
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Digital Print Pass
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Show this 4-digit code at the counter for immediate collection
          </p>
        </div>

        {/* 4-Digit OTP Hero Box */}
        <div className="p-6 sm:p-8 bg-slate-50/80 dark:bg-slate-950/40 text-center border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-400 block mb-3">
            Counter Pickup Code
          </span>

          <div className="flex items-center justify-center space-x-2.5 sm:space-x-3.5 mb-4">
            {job.otp.split('').map((digit, i) => (
              <div
                key={i}
                className="w-14 h-18 sm:w-18 sm:h-22 bg-white dark:bg-slate-800 border-2 border-indigo-600/50 dark:border-yellow-400/60 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black text-slate-900 dark:text-yellow-300 shadow-md shrink-0 select-all"
              >
                {digit}
              </div>
            ))}
          </div>

          <button
            id="copy-otp-btn"
            type="button"
            onClick={copyCode}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                <span>Copy 4-Digit Code</span>
              </>
            )}
          </button>
        </div>

        {/* Perforated Divider */}
        <div className="relative flex items-center justify-center my-0 px-4">
          <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-800" />
          <div className="absolute left-0 -ml-4 w-8 h-8 rounded-full bg-[var(--bg-canvas)] border-r border-slate-200 dark:border-slate-800" />
          <div className="absolute right-0 -mr-4 w-8 h-8 rounded-full bg-[var(--bg-canvas)] border-l border-slate-200 dark:border-slate-800" />
        </div>

        {/* Live Print Track: Automatically all ticked green to ready directly */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Live Print Track:
            </span>
            <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Ready Directly
            </span>
          </div>

          {/* Progress Steps with 100% completed green bar */}
          <div className="relative">
            {/* Connecting Green Line */}
            <div className="absolute top-4 left-6 right-6 h-1 bg-emerald-500 rounded-full -z-0" />

            <div className="grid grid-cols-4 gap-2 text-center relative z-10">
              {trackingSteps.map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm ring-4 ring-emerald-100 dark:ring-emerald-950/60">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 block leading-tight">
                    {step.label}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 hidden sm:block font-medium">
                    {step.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Banner */}
          <div className="mt-5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>All steps completed — Document is Ready Directly for Counter Pickup!</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAYMENT OPTIONS SECTION (Pay at Counter vs Online GPay / UPI Barcode) */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  Select Payment Option
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Print Amount:{' '}
                  <strong className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">
                    {currency}{formattedPrice}
                  </strong>
                </span>
              </div>

              {isPaid ? (
                <span className={`inline-flex items-center text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs ${
                  isCashPayment
                    ? 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800'
                    : 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {isCashPayment
                    ? `PAID CASH AT COUNTER (${currency}${formattedPrice})`
                    : `PAID DIGITALLY ONLINE (${currency}${formattedPrice})`}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  Job PIN: {job.otp}
                </span>
              )}
            </div>

            {/* If Already Paid: Show exact payment mode receipt banner */}
            {isPaid ? (
              <div className="space-y-3">
                {isCashPayment ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
                        <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span className="font-black text-sm sm:text-base">Payment Mode: Cash (Paid at Counter)</span>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                        Cash Settled ✓
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                      You made the payment of <strong className="font-black">{currency}{formattedPrice}</strong> in cash at the store counter. Your cash payment was received and recorded at the counter desk.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-black text-sm sm:text-base">Payment Mode: Digital Online Payment</span>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                        Digitally Paid ✓
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-100 font-medium leading-relaxed">
                      You made the payment of <strong className="font-black">{currency}{formattedPrice}</strong> digitally via online UPI / Google Pay. Your online transaction has been recorded and confirmed.
                    </p>
                  </div>
                )}
              </div>
            ) : hasOnlinePayments ? (
              /* If Unpaid and online enabled: Show Cash vs Online Options */
              <div className="space-y-4">
                {/* 2-Option Selector: Pay at Counter vs Online Payment */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {/* Option 1: Pay at Counter */}
                  <button
                    id="payment-mode-counter-btn"
                    type="button"
                    onClick={() => setPaymentMode('counter')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMode === 'counter'
                        ? 'border-indigo-600 dark:border-yellow-400 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-indigo-100 dark:ring-yellow-950'
                        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-850/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          paymentMode === 'counter'
                            ? 'bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Store className="w-4 h-4" />
                      </div>
                      {paymentMode === 'counter' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-yellow-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block leading-tight">
                        Cash at Counter
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Pay in cash upon pickup
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Online Payment (GPay / UPI) */}
                  <button
                    id="payment-mode-online-btn"
                    type="button"
                    onClick={() => setPaymentMode('online')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      paymentMode === 'online'
                        ? 'border-emerald-600 dark:border-emerald-400 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-950'
                        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-850/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          paymentMode === 'online'
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Digital • UPI
                      </span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block leading-tight">
                        Digital / Online
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        GPay barcode &amp; UPI
                      </span>
                    </div>
                  </button>
                </div>

                {/* Sub-view: When customer selects PAY AT COUNTER */}
                {paymentMode === 'counter' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-start space-x-2.5">
                      <Store className="w-4 h-4 text-indigo-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          Selected: Cash Payment at Counter
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Show your 4-digit code <strong className="text-slate-900 dark:text-slate-100 font-black">{job.otp}</strong> at the
                          counter desk and pay <strong className="text-slate-900 dark:text-slate-100">{currency}{formattedPrice}</strong> in
                          cash when receiving your physical prints.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isConfirmingPayment}
                      onClick={handleConfirmCashPaid}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isConfirmingPayment ? 'Recording...' : `I Have Paid in Cash at Counter (${currency}{formattedPrice})`}</span>
                    </button>
                  </motion.div>
                )}

                {/* Sub-view: When customer selects ONLINE MODE */}
                {paymentMode === 'online' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Pre-set Amount Hero Header */}
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          ₹
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block leading-none">
                            Pre-Set Amount
                          </span>
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {currency}{formattedPrice}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Pay to Shop:</span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[150px] block">
                          {payeeName}
                        </span>
                      </div>
                    </div>

                    {/* UPI Payment Fix & Step-by-Step Instructions Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/80 space-y-3 text-left shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-black text-amber-900 dark:text-amber-200">
                          <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Direct Payment Guide &amp; Fix</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-600">
                          Amount: {currency}{formattedPrice}
                        </span>
                      </div>

                      {/* Step 1: Copy UPI ID Method */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
                          Method 1: Pay directly to UPI ID (Fastest)
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-slate-100 truncate select-all">
                            {upiId}
                          </div>
                          <button
                            type="button"
                            onClick={copyUpiId}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-yellow-500 dark:hover:bg-yellow-400 dark:text-slate-950 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedUpi ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy UPI</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium">
                          <strong>Instruction:</strong> Copy the UPI ID above ➔ Open Google Pay / PhonePe / Paytm ➔ Tap <strong>&quot;Pay UPI ID&quot;</strong> ➔ Paste <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold">{upiId}</code> ➔ Enter exact amount <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{currency}{formattedPrice}</strong> and pay.
                        </p>
                      </div>

                      {/* Step 2: Screenshot QR Method */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1.5">
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
                          Method 2: Pay via QR Screenshot
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium">
                          <strong>Instruction:</strong> Take a <strong>screenshot</strong> of the QR code below ➔ Open Google Pay / PhonePe scanner ➔ Tap the <strong>gallery/photo icon</strong> ➔ Select the screenshot ➔ Pay <strong>{currency}{formattedPrice}</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Direct Payment App Links (1-Click payment launch) */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                        Or Launch UPI App Directly:
                      </label>

                      {/* Primary GPay Deep Link Button */}
                      <a
                        id="customer-pay-gpay-btn"
                        href={activeUpiUri || exactAmountUpiUri}
                        onClick={(e) => {
                          soundEffects.playOptionTick();
                          handleLaunchGPay(e);
                        }}
                        className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 rounded-2xl bg-slate-950 dark:bg-yellow-400 hover:bg-slate-900 dark:hover:bg-yellow-300 active:scale-98 text-white dark:text-slate-950 text-sm font-black shadow-md shadow-slate-900/20 dark:shadow-yellow-950/40 transition-all cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-slate-950 text-xs font-black shadow-xs">
                          G
                        </div>
                        <span>Pay {currency}{formattedPrice} with Google Pay</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-900 ml-1" />
                      </a>

                      {/* Secondary App Links: PhonePe / Paytm / Any UPI App */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <a
                          id="customer-pay-phonepe-btn"
                          href={activeUpiUri || exactAmountUpiUri}
                          onClick={() => soundEffects.playOptionTick()}
                          className="flex items-center justify-center py-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold transition-all text-center"
                        >
                          <span>PhonePe</span>
                        </a>

                        <a
                          id="customer-pay-paytm-btn"
                          href={activeUpiUri || exactAmountUpiUri}
                          onClick={() => soundEffects.playOptionTick()}
                          className="flex items-center justify-center py-2 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-extrabold transition-all text-center"
                        >
                          <span>Paytm</span>
                        </a>

                        <a
                          id="customer-pay-anyupi-btn"
                          href={activeUpiUri || exactAmountUpiUri}
                          onClick={() => soundEffects.playOptionTick()}
                          className="flex items-center justify-center py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold transition-all text-center"
                        >
                          <span>Any UPI</span>
                        </a>
                      </div>
                    </div>

                    {/* Dynamic UPI Barcode / QR Code Stage */}
                    <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center shadow-2xs space-y-3">
                      <div className="flex items-center justify-center space-x-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
                        <QrCode className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                        <span>Scan &amp; Pay UPI Barcode</span>
                      </div>

                      {/* QR Type Switcher: Pre-filled Amount vs Universal P2P (FamPay Friendly) */}
                      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playOptionTick();
                            setUpiQrMode('exact');
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            upiQrMode === 'exact'
                              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span>Exact {currency}{formattedPrice} QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playOptionTick();
                            setUpiQrMode('universal');
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                            upiQrMode === 'universal'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Universal P2P (FamPay Safe)</span>
                        </button>
                      </div>

                      {/* Barcode Frame */}
                      <div className="inline-block p-3.5 bg-white rounded-2xl shadow-sm relative group border-2 border-slate-900 dark:border-slate-600">
                        {/* Viewfinder corner guides */}
                        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-600 dark:border-yellow-400" />
                        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-600 dark:border-yellow-400" />
                        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-600 dark:border-yellow-400" />
                        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-600 dark:border-yellow-400" />

                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="Preset UPI Barcode"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                            Loading QR Code...
                          </div>
                        )}
                      </div>

                      {/* Preset UPI Details & Copy Button */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                          <span className="text-slate-400 dark:text-slate-400">UPI ID:</span>
                          <span className="select-all font-black">{upiId}</span>
                        </div>

                        <button
                          type="button"
                          onClick={copyUpiId}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                              <span>Copy UPI ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Optional UTR / Reference ID Field toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setShowUtrField(!showUtrField)}
                          className="text-[11px] font-bold text-indigo-600 dark:text-yellow-400 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <span>{showUtrField ? 'Hide Reference ID' : '+ Add UPI Reference / UTR Number (Optional)'}</span>
                        </button>
                      </div>

                      {showUtrField && (
                        <div className="animate-in fade-in duration-150">
                          <input
                            type="text"
                            maxLength={16}
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                            placeholder="Enter 12-digit UPI UTR / Ref ID (e.g. 423589123456)"
                            className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* "I Have Paid Online" Action Button */}
                    <div className="pt-1">
                      {isPaid ? (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-center space-x-2 shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            {paymentSuccessMsg || `Payment of ${currency}${formattedPrice} Recorded!`}
                          </span>
                        </div>
                      ) : (
                        <button
                          id="confirm-online-payment-btn"
                          type="button"
                          disabled={isConfirmingPayment}
                          onClick={handleConfirmOnlinePaid}
                          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          {isConfirmingPayment ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Confirming Payment...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>I Have Paid Online (Confirm {currency}{formattedPrice})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Online Payments disabled by Shop Owner */
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-start space-x-2.5">
                <Store className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Payment Method: Pay at Counter
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Please pay <strong className="text-slate-900 dark:text-slate-100">{currency}{formattedPrice}</strong> at the
                    desk in cash or card when collecting your printouts.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Voucher Box */}
        <div className="px-6 sm:px-8 pb-6 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                {shopSettings?.shopName || 'COPY'}
              </span>
              <span className="text-slate-400 dark:text-slate-400 text-[11px]">
                {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Customer:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{job.customerName || 'Counter Customer'}</span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Documents ({job.files.length}):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] text-right">
                {job.files.map((f) => f.originalName).join(', ')}
              </span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Specifications:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                {job.settings.copies} Copy • {job.settings.colorMode === 'color' ? 'Full Color' : 'B/W'} • {job.settings.paperSize} • {job.settings.duplex === 'double' ? 'Double-Sided' : 'Single'}
              </span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Orientation & Scale:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                {job.settings.orientation === 'landscape' ? 'Horizontal (Landscape)' : 'Vertical (Portrait)'} • {job.settings.scale === 'original' ? 'Original Size' : 'Fit to Paper'}
              </span>
            </div>

            {job.settings.binding !== 'none' && (
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Finishing:</span>
                <span className="font-semibold text-indigo-700 dark:text-yellow-400 capitalize text-right">{job.settings.binding}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 dark:text-slate-100">Total Price:</span>
              <div className="text-right">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {currency}{formattedPrice}
                </span>
                {isPaid && (
                  <span className={`text-[10px] font-black block ${
                    isCashPayment
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isCashPayment ? 'PAID IN CASH AT COUNTER ✓' : 'PAID DIGITALLY ONLINE ✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            id="back-to-upload-btn"
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Upload Another Document</span>
          </button>

          <button
            id="print-customer-slip-btn"
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-yellow-400 dark:hover:bg-yellow-300 dark:text-slate-950 font-black hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-950/20 dark:shadow-yellow-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt Slip</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
