import React, { useState } from 'react';
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Database,
  Sparkles,
  X,
  Lock,
  Layers,
  Store,
  ShieldAlert,
} from 'lucide-react';
import { ShopTenant } from '../../types';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops: ShopTenant[];
  onResetComplete: (message: string) => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  shops,
  onResetComplete,
}) => {
  const [resetScope, setResetScope] = useState<'all_jobs' | 'specific_shop' | 'master_purge'>('all_jobs');
  const [selectedShopSlug, setSelectedShopSlug] = useState<string>(shops[0]?.slug || '');
  const [adminPin, setAdminPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = adminPin.trim();
    if (!cleanPin) {
      setError('Please enter your Super Admin Key to authorize this database reset.');
      return;
    }

    setIsSubmitting(true);
    try {
      let resetTestJobs = true;
      let resetTestShops = false;
      let shopSlugOrId: string | undefined = undefined;

      if (resetScope === 'all_jobs') {
        resetTestJobs = true;
        resetTestShops = false;
      } else if (resetScope === 'specific_shop') {
        resetTestJobs = true;
        resetTestShops = false;
        shopSlugOrId = selectedShopSlug;
      } else if (resetScope === 'master_purge') {
        resetTestJobs = true;
        resetTestShops = true;
      }

      const res = await fetch('/api/super-admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: cleanPin,
          resetTestJobs,
          resetTestShops,
          shopSlugOrId,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (res.ok && data?.success) {
        onResetComplete(
          data.message ||
            `Database successfully reset! Removed ${data.deletedJobsCount || 0} test orders. Your system is ready for real shops.`
        );
        onClose();
      } else {
        setError(data?.error || 'Failed to reset test data. Please verify your Super Admin Key.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while attempting database reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                Reset Testing & Demo Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Purge test orders & tasks before onboarding real shops
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Connected to <strong>Persistent Cloud Firestore</strong>: Changes persist across redeploys & studio updates.
          </span>
        </div>

        <form onSubmit={handleReset} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          {/* Scope Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Choose What To Reset
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Clear All Test Orders */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  resetScope === 'all_jobs'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500/60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_scope"
                  checked={resetScope === 'all_jobs'}
                  onChange={() => setResetScope('all_jobs')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Clear All Test Print Orders & Tasks</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deletes all demo/testing orders and resets order counters & revenue back to ₹0. Keeps your created shops, QR standees, and price configurations intact.
                  </p>
                </div>
              </label>

              {/* Option 2: Clear Specific Shop */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  resetScope === 'specific_shop'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500/60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_scope"
                  checked={resetScope === 'specific_shop'}
                  onChange={() => setResetScope('specific_shop')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1 w-full">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    Clear Test Orders For Specific Shop
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Resets queue and jobs count for only one selected shop counter.
                  </p>
                  {resetScope === 'specific_shop' && (
                    <select
                      value={selectedShopSlug}
                      onChange={(e) => setSelectedShopSlug(e.target.value)}
                      className="mt-2 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {shops.map((s) => (
                        <option key={s.id} value={s.slug}>
                          {s.name} ({s.slug})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              {/* Option 3: Master Clean Slate */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  resetScope === 'master_purge'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-500/60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_scope"
                  checked={resetScope === 'master_purge'}
                  onChange={() => setResetScope('master_purge')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Complete Platform Purge (All Test Shops & Jobs)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Removes all test orders AND deletes all test shops from Firestore. Leaves a completely fresh slate ready for adding authentic client shops.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Admin Security PIN */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Super Admin Key Authorization <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter Super Admin Key (e.g. PRINT145214)"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Default Super Admin Master Key: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">PRINT145214</code>
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-sm font-semibold rounded-xl text-white transition flex items-center gap-2 shadow-lg disabled:opacity-50 ${
                resetScope === 'master_purge'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Purging Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {resetScope === 'master_purge' ? 'Purge All Database Data' : 'Reset Test Orders Now'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
