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
              How to reactivate your shop system
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To restore service, resolve subscription status, or clear compliance holds, please reach out to the Super Admin platform team directly:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="tel:+919876543210"
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-slate-800 dark:text-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-yellow-400 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Admin Helpline</span>
                  <span className="font-bold font-mono">+91 98765 43210</span>
                </div>
              </a>

              <a
                href="mailto:support@printportal.in"
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-slate-800 dark:text-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Admin Support</span>
                  <span className="font-bold">support@printportal.in</span>
                </div>
              </a>
            </div>
          </div>

          {checkedMessage && (
            <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold text-center animate-fade-in flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{checkedMessage}</span>
            </div>
          )}

          {/* Actions */}
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

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onBackToCustomer}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Customer Counter</span>
              </button>

              {onOpenSuperAdmin && (
                <button
                  type="button"
                  onClick={onOpenSuperAdmin}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2.5 text-xs font-bold text-indigo-600 dark:text-yellow-400 hover:text-indigo-800 dark:hover:text-yellow-300 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Super Admin Master Portal"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Super Admin Hub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
