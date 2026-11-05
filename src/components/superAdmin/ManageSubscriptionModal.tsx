import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  Hourglass,
  Infinity as InfinityIcon,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { ShopTenant, ShopPlan, BillingCycle } from '../../types';

interface ManageSubscriptionModalProps {
  shop: ShopTenant;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedShop: ShopTenant) => void;
}

type ModelCategory = 'trial' | 'monthly' | 'permanent';

export const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  shop,
  isOpen,
  onClose,
  onUpdated,
}) => {
  // Determine initial category
  const initialCategory: ModelCategory =
    shop.isTrial || shop.plan === 'four_day_trial' || shop.plan === 'free_trial'
      ? 'trial'
      : shop.plan.startsWith('monthly_')
      ? 'monthly'
      : 'permanent';

  const [category, setCategory] = useState<ModelCategory>(initialCategory);
  const [selectedPlan, setSelectedPlan] = useState<ShopPlan>(shop.plan || 'starter');
  const [trialDays, setTrialDays] = useState<number>(
    shop.trialDurationDays === 4 || shop.plan === 'four_day_trial' ? 4 : 7
  );
  const [monthlyDays, setMonthlyDays] = useState<number>(30);
  const [resetStartDate, setResetStartDate] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlanName = String(shop.plan || 'starter').replace(/_/g, ' ').toUpperCase();
  const isCurrentlyTrial = Boolean(shop.isTrial || shop.plan === 'four_day_trial' || shop.plan === 'free_trial');

  const handleSelectTrialPlan = (plan: 'four_day_trial' | 'free_trial', days: number) => {
    setSelectedPlan(plan);
    setTrialDays(days);
  };

  const handleApplySubscription = async (overridePayload?: any) => {
    setUpdating(true);
    setError(null);
    setSuccessMsg(null);

    let payload: any = overridePayload;

    if (!payload) {
      if (category === 'trial') {
        payload = {
          plan: selectedPlan === 'four_day_trial' || selectedPlan === 'free_trial' ? selectedPlan : (trialDays === 4 ? 'four_day_trial' : 'free_trial'),
          isTrial: true,
          trialDurationDays: trialDays,
          trialDays,
          billingCycle: 'trial',
          resetStartDate,
        };
      } else if (category === 'monthly') {
        payload = {
          plan: selectedPlan.startsWith('monthly_') ? selectedPlan : `monthly_${selectedPlan}` as ShopPlan,
          isTrial: false,
          billingCycle: 'monthly',
          daysValid: monthlyDays,
        };
      } else {
        // Permanent / Lifetime
        payload = {
          plan: selectedPlan === 'four_day_trial' || selectedPlan === 'free_trial' ? 'starter' : selectedPlan,
          isTrial: false,
          billingCycle: 'lifetime',
        };
      }
    }

    try {
      const res = await fetch(`/api/super-admin/shops/${shop.slug}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.shop) {
        setSuccessMsg(`✓ Subscription updated to ${String(payload.plan).replace(/_/g, ' ').toUpperCase()} successfully!`);
        onUpdated(data.shop);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        throw new Error(data.error || 'Failed to update subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating subscription');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all my-8">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 block">
                Super Admin Subscription Management
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{shop.name}</span>
                <span className="text-xs font-mono font-normal text-indigo-300">/{shop.slug}</span>
              </h3>
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="mt-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-300 font-medium">Current Active Model:</span>
              <span className="font-black text-yellow-300 tracking-wide">
                {currentPlanName}
              </span>
            </div>
            <div>
              {isCurrentlyTrial ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400/20 text-amber-200 border border-amber-400/40">
                  {shop.isTrialExpired ? 'Expired Trial' : `${shop.daysLeftInTrial ?? 7} Days Left`}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400/20 text-emerald-200 border border-emerald-400/40">
                  Active Subscription
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs: Free Trial vs Monthly vs Permanent */}
        <div className="p-4 sm:p-6 space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Subscription Model Category
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setCategory('trial');
                  if (selectedPlan !== 'four_day_trial' && selectedPlan !== 'free_trial') {
                    setSelectedPlan('four_day_trial');
                  }
                }}
                className={`py-2 px-2 sm:px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  category === 'trial'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Free Trial</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('monthly');
                  setSelectedPlan('monthly_starter');
                }}
                className={`py-2 px-2 sm:px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  category === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Monthly Plan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('permanent');
                  setSelectedPlan('starter');
                }}
                className={`py-2 px-2 sm:px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  category === 'permanent'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <InfinityIcon className="w-3.5 h-3.5" />
                <span>Permanent</span>
              </button>
            </div>
          </div>

          {/* Model 1: Free Trial Details */}
          {category === 'trial' && (
            <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-200">
                  Choose Free Plan Duration
                </span>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-yellow-400">
                  Zero Upfront Charge
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 4-Day Free Plan Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTrialPlan('four_day_trial', 4)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedPlan === 'four_day_trial' && trialDays === 4
                      ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-yellow-400 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      4-Day Free Plan
                    </span>
                    {selectedPlan === 'four_day_trial' && trialDays === 4 && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Quick 4-day trial. When 4 days end, screen prompts owner to contact admin.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-yellow-300">
                    4 Days Active
                  </span>
                </button>

                {/* 7-Day Free Plan Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTrialPlan('free_trial', 7)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedPlan === 'free_trial' && trialDays === 7
                      ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-yellow-400 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      7-Day Free Plan
                    </span>
                    {selectedPlan === 'free_trial' && trialDays === 7 && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Standard 1-week full trial. Auto-pauses at day 7 with helpline prompt.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-yellow-300">
                    7 Days Active
                  </span>
                </button>
              </div>

              {/* Custom Trial Duration Input */}
              <div className="pt-2 flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Custom Trial Days</span>
                  <span className="text-[10px] text-slate-500">Need a 14 or 30-day extended trial?</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={trialDays}
                    onChange={(e) => setTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-center font-bold text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Days</span>
                </div>
              </div>

              {/* Reset Trial Start Date Checkbox */}
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={resetStartDate}
                  onChange={(e) => setResetStartDate(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Reset trial start date from today (starts full {trialDays} days countdown)</span>
              </label>
            </div>
          )}

          {/* Model 2: Monthly Subscription Details */}
          {category === 'monthly' && (
            <div className="space-y-3 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-900 dark:text-purple-200">
                  Select Monthly Tier
                </span>
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                  Monthly Recurring Model
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'monthly_starter' as ShopPlan,
                    name: 'Starter',
                    price: '₹499/mo',
                    sub: '100 jobs/day',
                  },
                  {
                    id: 'monthly_pro' as ShopPlan,
                    name: 'Pro Volume',
                    price: '₹999/mo',
                    sub: 'Auto-Print + PDF',
                  },
                  {
                    id: 'monthly_enterprise' as ShopPlan,
                    name: 'Enterprise',
                    price: '₹2,499/mo',
                    sub: 'Unlimited Volume',
                  },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedPlan(tier.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedPlan === tier.id
                        ? 'bg-white dark:bg-slate-800 border-purple-600 dark:border-yellow-400 shadow-md ring-2 ring-purple-500/20'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {tier.name}
                      </span>
                      {selectedPlan === tier.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <span className="block text-xs font-black text-purple-700 dark:text-yellow-300 mb-0.5">
                      {tier.price}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {tier.sub}
                    </span>
                  </button>
                ))}
              </div>

              {/* Monthly Subscription Validity Duration */}
              <div className="pt-2 flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Subscription Validity</span>
                  <span className="text-[10px] text-slate-500">Days until next billing renewal</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={monthlyDays}
                    onChange={(e) => setMonthlyDays(Math.max(1, parseInt(e.target.value) || 30))}
                    className="w-16 px-2 py-1 text-center font-bold text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Days</span>
                </div>
              </div>
            </div>
          )}

          {/* Model 3: Permanent / Lifetime Commercial License */}
          {category === 'permanent' && (
            <div className="space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200">
                  Select Permanent Commercial Tier
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>Never Expires</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'starter' as ShopPlan,
                    name: 'Permanent Starter',
                    sub: 'Single Counter Desk',
                  },
                  {
                    id: 'pro' as ShopPlan,
                    name: 'Permanent Pro',
                    sub: 'Auto-Print + Ledger',
                  },
                  {
                    id: 'enterprise' as ShopPlan,
                    name: 'Permanent Campus',
                    sub: 'Multi-Terminal Hub',
                  },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedPlan(tier.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedPlan === tier.id
                        ? 'bg-white dark:bg-slate-800 border-emerald-600 dark:border-yellow-400 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {tier.name}
                      </span>
                      {selectedPlan === tier.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {tier.sub}
                    </span>
                    <span className="inline-block mt-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Lifetime Active
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                ✓ Once converted to a permanent plan, all trial restrictions, countdown clocks, and expiration blocks are permanently lifted.
              </p>
            </div>
          )}

          {/* Quick Presets for Instant 1-Click Action */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Instant 1-Click Quick Adjustments
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  handleApplySubscription({
                    plan: 'four_day_trial',
                    isTrial: true,
                    trialDurationDays: 4,
                    trialDays: 4,
                    resetStartDate: true,
                  })
                }
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
              >
                Set 4-Day Trial
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  handleApplySubscription({
                    plan: 'free_trial',
                    isTrial: true,
                    trialDurationDays: 7,
                    trialDays: 7,
                    resetStartDate: true,
                  })
                }
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
              >
                Set 7-Day Trial
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  handleApplySubscription({
                    plan: 'monthly_starter',
                    isTrial: false,
                    billingCycle: 'monthly',
                    daysValid: 30,
                  })
                }
                className="py-1.5 px-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded-lg border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer text-center"
              >
                Set 30-Day Monthly
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  handleApplySubscription({
                    plan: 'starter',
                    isTrial: false,
                    billingCycle: 'lifetime',
                  })
                }
                className="py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer text-center"
              >
                Set Permanent
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleApplySubscription()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Zap className={`w-3.5 h-3.5 text-yellow-300 ${updating ? 'animate-spin' : ''}`} />
              <span>{updating ? 'Saving Changes...' : 'Save & Update Subscription Model'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
