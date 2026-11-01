import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Store,
  MapPin,
  Sparkles,
  Zap,
  ArrowLeft,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  Printer,
  Smartphone,
} from 'lucide-react';
import { ShopSettings } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface DirectSendViewProps {
  shopSettings: ShopSettings | null;
  onBackToUpload: () => void;
}

export const DirectSendView: React.FC<DirectSendViewProps> = ({
  shopSettings,
  onBackToUpload,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const rawPhone =
    shopSettings?.whatsappNumber || shopSettings?.contactPhone || '';
  const emailAddress = shopSettings?.contactEmail || '';
  const shopName = shopSettings?.shopName || 'COPY';
  const currency = shopSettings?.currency || '₹';
  const bwRate = shopSettings?.bwPricePerPage ?? 2;
  const colorRate = shopSettings?.colorPricePerPage ?? 10;
  const address =
    shopSettings?.shopAddress || 'Store Counter';

  // Clean phone number for wa.me link: keep only digits
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${shopName}! I would like to print documents. I'm attaching my files here.\n\nPrint Details:\n• Copies: 1\n• Color: Black & White / Color\n• Paper: A4\n• Single or Double-sided: \n• Customer Name: `
  )}`;

  const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
    `Print Request - Document Attachment (${shopName})`
  )}&body=${encodeURIComponent(
    `Hello ${shopName},\n\nPlease find attached the documents I need printed.\n\nMy Print Specifications:\n• Number of Copies: 1\n• Color Mode: (Black & White / Color)\n• Paper Size: A4\n• Print Sides: Single-sided / Double-sided\n• Additional Finishing: (None / Staple / Spiral)\n• Customer Name: \n• Phone Number: \n\nPlease let me know once ready for pickup!\nThank you.`
  )}`;

  const handleCopy = (text: string, type: 'phone' | 'email') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    soundEffects.playCopyPing();
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back to Web Upload link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToUpload}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-yellow-400 transition-colors cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Web Upload</span>
        </button>

        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
          Operator Active • Receiving Files
        </span>
      </div>

      {/* Hero Heading */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-indigo-700 dark:text-yellow-400 text-xs font-bold mb-3 shadow-2xs">
          <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
          <span>Direct Dispatch &amp; Backup Channels</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Send Documents via WhatsApp or Email
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 font-medium">
          If your web upload is stuck, slow, or you prefer mobile chat, click below to open
          our WhatsApp chat or compose an email directly with your files.
        </p>
      </div>

      {/* Main Two Channels: WhatsApp & Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10">
        {/* Channel 1: WhatsApp */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-50 dark:bg-emerald-950/20 rounded-full -z-0 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                Instant Chat &amp; Attach
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              WhatsApp Print Dispatch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Send PDFs, Word documents, or photos directly to our counter phone number.
            </p>

            {/* Displayed Phone Number Pill */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                  Shop WhatsApp Number
                </span>
                <span className="text-base sm:text-lg font-mono font-extrabold text-slate-900 dark:text-slate-100">
                  {rawPhone}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(rawPhone, 'phone')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Copy phone number"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-step checklist */}
            <div className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Click the button below to open WhatsApp chat.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Attach your files and state your required copy count / color.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Collect your fresh prints at counter #{address ? '' : '1'}.</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="relative z-10 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open WhatsApp &amp; Send Files</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </a>
          </div>
        </div>

        {/* Channel 2: Email */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 hover:border-indigo-500/60 dark:border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 dark:bg-indigo-950/20 rounded-full -z-0 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 px-2.5 py-1 rounded-full">
                Full Attachment Support
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              Email Print Dispatch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Perfect for heavy PDFs, thesis files, design portfolios, or bulk documents up to 25MB.
            </p>

            {/* Displayed Email Pill */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                  Shop Email Address
                </span>
                <span className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {emailAddress}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(emailAddress, 'email')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                title="Copy email address"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                    <span className="text-indigo-700 dark:text-yellow-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-step checklist */}
            <div className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Click the button below to launch your default email app.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Attach your document files and enter your name and phone number.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Our desk operator will print upon receiving your email.</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="relative z-10 pt-2">
            <a
              href={mailtoUrl}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <Mail className="w-4 h-4" />
              <span>Send Email with Attachments</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Counter Location & Rates Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Counter Desk Location
              </h3>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{shopName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{address}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Current Print Rates
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  B/W: {currency}{bwRate}/page
                </span>
                <span className="text-xs font-bold text-indigo-700 dark:text-yellow-400 bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-slate-700">
                  Color: {currency}{colorRate}/page
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Stapling {currency}{shopSettings?.stapleFee ?? 5} • Spiral {currency}{shopSettings?.spiralFee ?? 30}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Print Guarantee
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                High-speed laser printing on premium 75/80 GSM bond paper. High contrast text &amp; vibrant full-color graphics.
              </p>
              <button
                type="button"
                onClick={onBackToUpload}
                className="mt-2 text-xs font-bold text-indigo-600 dark:text-yellow-400 hover:text-indigo-800 dark:hover:text-yellow-300 underline cursor-pointer inline-flex items-center space-x-1"
              >
                <span>Or use the web upload portal instead</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
