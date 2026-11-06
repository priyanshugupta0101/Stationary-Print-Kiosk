import React, { useState } from 'react';
import { X, Save, Store, CreditCard, DollarSign, Shield, AlertCircle, KeyRound, RefreshCw } from 'lucide-react';
import { ShopTenant, ShopSettings, ShopStatus, ShopPlan } from '../../types';

interface EditShopModalProps {
  shop: ShopTenant;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedShop: ShopTenant) => void;
}

export const EditShopModal: React.FC<EditShopModalProps> = ({
  shop,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(shop.name);
  const [ownerName, setOwnerName] = useState(shop.ownerName);
  const [tagline, setTagline] = useState(shop.tagline);
  const [phone, setPhone] = useState(shop.phone);
  const [email, setEmail] = useState(shop.email);
  const [whatsappNumber, setWhatsappNumber] = useState(shop.whatsappNumber || shop.phone);
  const [address, setAddress] = useState(shop.address);
  const [status, setStatus] = useState<ShopStatus>(shop.status);
  const [plan, setPlan] = useState<ShopPlan>(shop.plan);

  // Pricing
  const [currency, setCurrency] = useState(shop.settings.currency || '₹');
  const [bwPrice, setBwPrice] = useState(shop.settings.bwPricePerPage ?? 2);
  const [colorPrice, setColorPrice] = useState(shop.settings.colorPricePerPage ?? 10);
  const [a3Multiplier, setA3Multiplier] = useState(shop.settings.a3Multiplier ?? 2);
  const [duplexDiscount, setDuplexDiscount] = useState(shop.settings.doubleSidedDiscountPercent ?? 10);
  const [spiralFee, setSpiralFee] = useState(shop.settings.spiralFee ?? 30);
  const [stapleFee, setStapleFee] = useState(shop.settings.stapleFee ?? 5);

  // Payments & Security
  const [enableOnlinePayments, setEnableOnlinePayments] = useState(shop.settings.enableOnlinePayments !== false);
  const [upiId, setUpiId] = useState(shop.settings.upiId || '');
  const [upiPayeeName, setUpiPayeeName] = useState(shop.settings.upiPayeeName || shop.name);
  const [ownerPin, setOwnerPin] = useState(shop.settings?.ownerPin || (shop as any).ownerPin || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = ownerPin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setError('Please assign a secure 4 to 6 digit Owner PIN for this shop');
      return;
    }

    setSaving(true);
    setError(null);

    const isTrialPlan = plan === 'four_day_trial' || plan === 'free_trial';
    const payload = {
      name,
      ownerName,
      tagline,
      phone,
      email,
      whatsappNumber,
      address,
      status,
      plan,
      isTrial: isTrialPlan,
      trialDurationDays: plan === 'four_day_trial' ? 4 : (plan === 'free_trial' ? 7 : undefined),
      billingCycle: isTrialPlan ? 'trial' : (plan.startsWith('monthly_') ? 'monthly' : 'lifetime'),
      ownerPin: cleanPin,
      settingsUpdates: {
        shopName: name,
        tagline,
        status,
        plan,
        isTrial: isTrialPlan,
        trialDurationDays: plan === 'four_day_trial' ? 4 : (plan === 'free_trial' ? 7 : undefined),
        isSuspended: status === 'suspended',
        suspensionReason: status === 'suspended' ? 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE' : undefined,
        currency,
        bwPricePerPage: Number(bwPrice) || 2,
        colorPricePerPage: Number(colorPrice) || 10,
        a3Multiplier: Number(a3Multiplier) || 2,
        doubleSidedDiscountPercent: Number(duplexDiscount) || 10,
        spiralFee: Number(spiralFee) || 30,
        stapleFee: Number(stapleFee) || 5,
        enableOnlinePayments,
        upiId: upiId.trim(),
        upiPayeeName: upiPayeeName.trim() || name,
        ownerPin: cleanPin,
        contactPhone: phone,
        contactEmail: email,
        whatsappNumber,
        shopAddress: address,
      },
    };

    const targetSlugOrId = encodeURIComponent((shop.slug || shop.id || '').trim());
    if (!targetSlugOrId) {
      setError('Invalid shop identifier');
      setSaving(false);
      return;
    }

    try {
      // 1. Send update request (supports PUT with fallback to POST)
      let res = await fetch(`/api/super-admin/shops/${targetSlugOrId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 405 || res.status === 404) {
        res = await fetch(`/api/super-admin/shops/${targetSlugOrId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn('Non-JSON response from update shop:', text);
      }

      if (res.ok && data?.success && data?.shop) {
        // Also ensure dedicated PIN sync
        try {
          await fetch(`/api/super-admin/shops/${targetSlugOrId}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerPin: cleanPin }),
          });
        } catch {
          // Non-blocking since main update succeeded
        }

        onSaved(data.shop);
        onClose();
        return;
      }

      // If main update failed, try dedicated PIN update before giving up
      const pinRes = await fetch(`/api/super-admin/shops/${targetSlugOrId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPin: cleanPin }),
      });
      const pinText = await pinRes.text();
      let pinData: any = null;
      try {
        pinData = JSON.parse(pinText);
      } catch {}

      if (pinRes.ok && pinData?.success && pinData?.shop) {
        onSaved(pinData.shop);
        onClose();
        return;
      }

      setError(data?.error || pinData?.error || 'Failed to save shop configuration. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Network error saving shop settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white dark:text-yellow-400 flex items-center justify-center shadow-sm border border-transparent dark:border-slate-700">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Edit Shop System Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Update rates, payment settings, and contact information for {shop.slug}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identity & Owner Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Store className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Shop Identity &amp; Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner / Contact Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address / Counter Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">System Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ShopStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="active">Active (Full Operation)</option>
                  <option value="trial">Trial Period</option>
                  <option value="suspended">Suspended / Stopped</option>
                </select>
                {status === 'suspended' && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <span>⛔</span>
                    <span>Owner will be blocked with &quot;THE SUPER ADMIN HAS STOPPED YOUR SERVICE&quot;</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SaaS Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as ShopPlan)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                >
                  <optgroup label="Free Trial Models">
                    <option value="four_day_trial">4-Day Free Plan</option>
                    <option value="free_trial">7-Day Free Plan</option>
                  </optgroup>
                  <optgroup label="Monthly Subscription Plans">
                    <option value="monthly_starter">Monthly Starter (₹499/mo)</option>
                    <option value="monthly_pro">Monthly Pro (₹999/mo)</option>
                    <option value="monthly_enterprise">Monthly Enterprise (₹2,499/mo)</option>
                  </optgroup>
                  <optgroup label="Permanent / Lifetime Plans">
                    <option value="starter">Permanent Starter (Lifetime)</option>
                    <option value="pro">Permanent Pro (Lifetime)</option>
                    <option value="enterprise">Permanent Enterprise (Lifetime)</option>
                    <option value="permanent">Permanent All-Inclusive (Lifetime)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing Matrix */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <DollarSign className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Print Pricing Engine</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">B&amp;W Rate</label>
                <input
                  type="number"
                  step="0.5"
                  value={bwPrice}
                  onChange={(e) => setBwPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Color Rate</label>
                <input
                  type="number"
                  step="0.5"
                  value={colorPrice}
                  onChange={(e) => setColorPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">A3 Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={a3Multiplier}
                  onChange={(e) => setA3Multiplier(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duplex Disc %</label>
                <input
                  type="number"
                  value={duplexDiscount}
                  onChange={(e) => setDuplexDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Spiral Fee</label>
                <input
                  type="number"
                  value={spiralFee}
                  onChange={(e) => setSpiralFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staple Fee</label>
                <input
                  type="number"
                  value={stapleFee}
                  onChange={(e) => setStapleFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Operator Security & Login PIN */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/90 dark:border-amber-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300 flex items-center space-x-1.5">
                <KeyRound className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Shop Owner Login PIN (Desk Access)</span>
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.floor(100000 + Math.random() * 900000).toString();
                    setOwnerPin(rnd);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Generate New PIN</span>
                </button>
              </div>
            </div>

            <div className="max-w-xs">
              <input
                type="text"
                maxLength={6}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-sm border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono font-black text-center tracking-widest text-slate-900 dark:text-amber-100"
              />
              <p className="text-[10px] text-amber-900/80 dark:text-amber-300/80 mt-1 font-medium">
                The shopkeeper can ONLY log in using this PIN.
              </p>
            </div>
          </div>

          {/* Section 4: Online Payment (UPI & QR) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>Online UPI Payment Gateway</span>
              </h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableOnlinePayments}
                  onChange={(e) => setEnableOnlinePayments(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable UPI Online Pay</span>
              </label>
            </div>

            {enableOnlinePayments && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/80">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">UPI ID / VPA *</label>
                  <input
                    type="text"
                    placeholder="e.g. shopname@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-emerald-200 dark:border-emerald-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">Payee Name in GPay/PhonePe</label>
                  <input
                    type="text"
                    value={upiPayeeName}
                    onChange={(e) => setUpiPayeeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-emerald-200 dark:border-emerald-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
