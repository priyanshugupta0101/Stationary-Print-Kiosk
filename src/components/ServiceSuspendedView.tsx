import React, { useState } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  PhoneCall,
  Mail,
  RefreshCw,
  ArrowLeft,
  Lock,
  Store,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface ServiceSuspendedViewProps {
  shopSettings: ShopSettings | null;
  shopSlug: string;
  onRefresh: () => Promise<void> | void;
  onBackToCustomer: () => void;
  onOpenSuperAdmin?: () => void;
}

export const ServiceSuspendedView: React.FC<ServiceSuspendedViewProps> = ({
  shopSettings,
  shopSlug,
  onRefresh,
  onBackToCustomer,
  onOpenSuperAdmin,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [checkedMessage, setCheckedMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setRefreshing(true);
    setCheckedMessage(null);
    try {
      await onRefresh();
      // Re-query settings to verify
      const res = await fetch(`/api/settings?shop=${encodeURIComponent(shopSlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.isSuspended && data.status !== 'suspended') {
          setCheckedMessage('Service has been restored! Reloading...');
          setTimeout(() => {
            window.location.reload();
          }, 800);
          return;
        }
      }
      setCheckedMessage('System is still disabled by Super Admin.');
      setTimeout(() => setCheckedMessage(null), 3000);
    } catch (e) {
      setCheckedMessage('Unable to connect to server.');
    } finally {
      setRefreshing(false);
    }
  };

  const shopName = shopSettings?.shopName || 'This Shop';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 bg-slate-900/5 dark:bg-black/40">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-200 dark:border-rose-900/50 shadow-2xl overflow-hidden">
        {/* Top High-Impact Emergency Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-6 sm:py-8 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-inner">
            <AlertOctagon className="w-9 h-9 sm:w-11 sm:h-11 text-white animate-pulse" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-black/25 text-rose-100 border border-white/20 mb-2">
            Administrative Suspension Active
          </span>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-tight">
            THE SUPER ADMIN HAS STOPPED YOUR SERVICE
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-rose-100 max-w-lg mx-auto font-medium">
            System operations for <strong className="text-white underline font-bold">{shopName}</strong> have been suspended by the platform administrator.
          </p>
        </div>

        {/* Notice Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Details Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Enforcement Policy:</span>
              </span>
              <span className="font-mono font-black uppercase px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900/80 text-rose-950 dark:text-rose-100 text-[10px]">
                Access Prohibited
              </span>
            </div>

            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              Your Owner Desk login, customer print order processing, and token queue services are currently stopped. You cannot accept or print documents until the Super Admin reactivates your account.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/50 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Target Shop:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{shopName}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Shop Slug:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">/{shopSlug}</span>
              </div>
            </div>
          </div>

          {/* Resolution Guidance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Contact Service Provider to Reactivate
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To restore service, verify compliance, or renew your subscription, please contact the platform service provider directly:
            </p>

            {/* Service Provider Profile Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-yellow-400 text-white dark:text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {(shopSettings?.contactAdmin?.name || 'P')[0]}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-yellow-400 block">
                    {shopSettings?.contactAdmin?.serviceProviderTitle || 'Platform Service Provider'}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                    {shopSettings?.contactAdmin?.name || 'Platform Administrator'}
                  </span>
                </div>
              </div>

              {shopSettings?.contactAdmin?.customNote && (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-indigo-500 pl-2 py-0.5">
                  &ldquo;{shopSettings.contactAdmin.customNote}&rdquo;
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-indigo-100 dark:border-slate-700 text-xs">
                {/* Phone */}
                <a
                  href={`tel:${(shopSettings?.contactAdmin?.phone || '+919876500111').replace(/\s+/g, '')}`}
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200/80 dark:border-slate-700 transition-colors text-slate-900 dark:text-slate-100"
                >
                  <PhoneCall className="w-4 h-4 text-indigo-600 dark:text-yellow-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Call Admin</span>
                    <span className="font-bold font-mono text-[11px] truncate block">{shopSettings?.contactAdmin?.phone || '+91 98765 00111'}</span>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${(shopSettings?.contactAdmin?.whatsappNumber || '919876500111').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! My store "${shopName}" (${shopSlug}) is suspended on COPY Kiosk. Please assist with reactivation.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-emerald-200/80 dark:border-slate-700 transition-colors text-slate-900 dark:text-slate-100"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block font-bold uppercase">WhatsApp</span>
                    <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 truncate block">Chat Support</span>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${shopSettings?.contactAdmin?.email || 'guptapriyanshu0101@gmail.com'}?subject=${encodeURIComponent(`Store Reactivation Request: ${shopName} (${shopSlug})`)}`}
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-slate-800 border border-purple-200/80 dark:border-slate-700 transition-colors text-slate-900 dark:text-slate-100"
                >
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Email</span>
                    <span className="font-bold text-[11px] truncate block">{shopSettings?.contactAdmin?.email || 'guptapriyanshu0101@gmail.com'}</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {checkedMessage && (
            <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold text-center animate-fade-in flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{checkedMessage}</span>
            </div>
          )}

          {/* Actions (NO Super Admin Hub link visible) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={refreshing}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking with Server...' : 'Check If Service Restored'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToCustomer}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer Counter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
