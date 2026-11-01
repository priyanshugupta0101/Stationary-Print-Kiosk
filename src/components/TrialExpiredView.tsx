import React from 'react';
import {
  Clock,
  Sparkles,
  MessageSquare,
  PhoneCall,
  Mail,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface TrialExpiredViewProps {
  shopSettings: ShopSettings | null;
  shopSlug: string;
  onBackToCustomer: () => void;
  onOpenSuperAdmin?: () => void;
}

export const TrialExpiredView: React.FC<TrialExpiredViewProps> = ({
  shopSettings,
  shopSlug,
  onBackToCustomer,
  onOpenSuperAdmin,
}) => {
  const shopName = shopSettings?.shopName || 'Your Shop';
  const adminPhone = '+91 98765 00111';
  const adminEmail = 'guptapriyanshu0101@gmail.com';

  const trialDays =
    shopSettings?.trialDurationDays === 4 || (shopSettings as any)?.plan === 'four_day_trial'
      ? 4
      : 7;
  const is4Day = trialDays === 4;

  const whatsappMessage = encodeURIComponent(
    `Hello Super Admin! My shop "${shopName}" (${shopSlug}) has completed its ${is4Day ? '4-Day Free Plan' : '7-Day Free Trial'} on COPY Kiosk. We love the service and want to activate our subscription plan!`
  );
  const whatsappUrl = `https://wa.me/919876500111?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent(`COPY Kiosk Plan Activation: ${shopName}`);
  const emailBody = encodeURIComponent(
    `Hi Super Admin,\n\nOur ${is4Day ? '4-day free plan has ended' : '7-day free trial has expired'} for "${shopName}" (${shopSlug}). We really love the kiosk service and would like to subscribe to continue accepting prints.\n\nThank you!`
  );
  const emailUrl = `mailto:${adminEmail}?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div id="trial-expired-view" className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-900/5">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl overflow-hidden">
        {/* Top Celebration & Upgrade Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-600 px-6 py-7 sm:py-9 text-white text-center relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 mb-4 shadow-inner">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-200 animate-pulse" />
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span className="text-[11px] font-black uppercase tracking-widest bg-black/25 text-amber-100 px-3 py-1 rounded-full border border-white/20">
              {is4Day ? '4-Day Free Plan Concluded' : '7-Day Free Trial Concluded'}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-tight text-white drop-shadow-sm">
            {is4Day ? 'YOUR FOUR-DAY FREE PLAN HAS ENDED' : 'YOUR FREE TRIAL SESSION IS EXPIRED'}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-amber-100 max-w-lg mx-auto font-medium leading-relaxed">
            {is4Day
              ? 'Your four-day free plan has ended. Contact the super admin to activate your subscription plan for '
              : 'If you love the service, contact with the admin to activate your subscription plan for '}
            <strong className="text-white font-bold underline decoration-yellow-300">{shopName}</strong>!
          </p>
        </div>

        {/* Action Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Friendly Status Notice */}
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Continue accepting contactless prints without interruption</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {is4Day
                ? 'Your 4 days of complimentary access to the COPY Operator Desk have concluded. Contact the super admin to activate your full plan, unlimited customer jobs, and digital UPI revenue collections.'
                : 'Your 7 days of complimentary access to the COPY Operator Desk, customer direct send, and automatic queue management have finished. Upgrade today to unlock permanent access, unlimited customer jobs, and digital UPI revenue collections.'}
            </p>
          </div>

          {/* Contact Methods Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contact Admin to Activate Your Shop
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* WhatsApp */}
              <a
                id="contact-whatsapp-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all text-emerald-900 dark:text-emerald-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">WhatsApp Admin</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Quick Activation</span>
              </a>

              {/* Phone Call */}
              <a
                id="contact-phone-btn"
                href={`tel:${adminPhone}`}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all text-indigo-900 dark:text-indigo-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Call Support</span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">{adminPhone}</span>
              </a>

              {/* Email */}
              <a
                id="contact-email-btn"
                href={emailUrl}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800 dark:text-slate-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Email Admin</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-[140px]">
                  {adminEmail}
                </span>
              </a>
            </div>
          </div>

          {/* Benefits Reassurance */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/20">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              What you get with full activation:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited customer print uploads</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Permanent Operator Desk login</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Custom pricing & UPI QR counter code</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Priority Super Admin assistance</span>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              id="back-to-kiosk-btn"
              type="button"
              onClick={onBackToCustomer}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customer Upload Kiosk</span>
            </button>

            {onOpenSuperAdmin && (
              <button
                id="open-super-admin-btn"
                type="button"
                onClick={onOpenSuperAdmin}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin Hub</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
