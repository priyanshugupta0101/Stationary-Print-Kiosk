import React, { useState } from 'react';
import {
  Sparkles,
  Store,
  CreditCard,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { ShopTenant, ShopPlan } from '../../types';

interface ShopGeneratorWizardProps {
  onShopCreated: (newShop: ShopTenant) => void;
  onCancel: () => void;
}

export const ShopGeneratorWizard: React.FC<ShopGeneratorWizardProps> = ({
  onShopCreated,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('High-Speed Document Printing & Quick Counter Pickup');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [plan, setPlan] = useState<ShopPlan>('free_trial');
  const [isTrial, setIsTrial] = useState(true);
  const [trialDays, setTrialDays] = useState(7);

  // Rates
  const [currency, setCurrency] = useState('₹');
  const [bwPrice, setBwPrice] = useState(2);
  const [colorPrice, setColorPrice] = useState(10);
  const [a3Multiplier, setA3Multiplier] = useState(2);
  const [duplexDiscount, setDuplexDiscount] = useState(10);
  const [spiralFee, setSpiralFee] = useState(30);
  const [stapleFee, setStapleFee] = useState(5);

  // Online UPI & QR
  const [enableOnlinePayments, setEnableOnlinePayments] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');

  // Security - Fresh unique PIN for each generated shop
  const [ownerPin, setOwnerPin] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-slugify shop name as user types
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(val));
    }
    if (!upiPayeeName || upiPayeeName === name) {
      setUpiPayeeName(val);
    }
  };

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .slice(0, 30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a shop name');
      return;
    }
    if (!slug.trim()) {
      setError('Please enter a unique URL slug');
      return;
    }
    if (!ownerPin.trim() || ownerPin.trim().length < 4) {
      setError('Please provide a secure 4 to 6 digit Operator PIN for this shop');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      ownerName: ownerName.trim(),
      tagline: tagline.trim(),
      phone: phone.trim(),
      whatsappNumber: (whatsappNumber || phone).trim(),
      email: email.trim(),
      address: address.trim(),
      plan: isTrial ? (trialDays === 4 ? 'four_day_trial' : 'free_trial') : plan,
      isTrial,
      trialDays: isTrial ? Number(trialDays) || 4 : undefined,
      ownerPin: ownerPin.trim(),
      settings: {
        shopName: name.trim(),
        tagline: tagline.trim(),
        currency: currency.trim() || '₹',
        bwPricePerPage: Number(bwPrice) || 2,
        colorPricePerPage: Number(colorPrice) || 10,
        a3Multiplier: Number(a3Multiplier) || 2,
        doubleSidedDiscountPercent: Number(duplexDiscount) || 10,
        spiralFee: Number(spiralFee) || 30,
        stapleFee: Number(stapleFee) || 5,
        enableOnlinePayments,
        upiId: upiId.trim(),
        upiPayeeName: (upiPayeeName || name).trim(),
        ownerPin: ownerPin.trim(),
        contactPhone: phone.trim(),
        contactEmail: email.trim(),
        whatsappNumber: (whatsappNumber || phone).trim(),
        shopAddress: address.trim(),
      },
    };

    try {
      const res = await fetch('/api/super-admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.shop) {
        onShopCreated(data.shop);
      } else {
        setError(data.error || 'Failed to generate shop system');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while provisioning shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-transparent dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              Provision New Printing Shop System
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Set up basic shop data, custom pricing, online UPI QR, and generate instant links
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Shop Identity */}
        <div>
          <div className="flex items-center space-x-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
              1
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Shop Identity & Counter Location
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shop / Stationery Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Xerox & Digital Prints"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unique URL Slug * (e.g. ?shop=slug)
              </label>
              <div className="flex items-center">
                <span className="px-2.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-mono rounded-l-xl">
                  /shop=
                </span>
                <input
                  type="text"
                  required
                  placeholder="apex-xerox"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-r-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tagline / Banner Headline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Owner / Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Counter Phone)
              </label>
              <input
                type="text"
                placeholder="+91 98200 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Number for Delivery
              </label>
              <input
                type="text"
                placeholder="+91 98200 12345"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="contact@apexprint.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Physical Shop Address (Prints on Counter Standee)
              </label>
              <input
                type="text"
                placeholder="e.g. Shop #4, University Main Gate, North Campus"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Print Pricing Matrix */}
        <div>
          <div className="flex items-center space-x-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
              2
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Print Pricing & Rate Engine
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">B&W Rate / Pg</label>
              <input
                type="number"
                step="0.5"
                value={bwPrice}
                onChange={(e) => setBwPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Color Rate / Pg</label>
              <input
                type="number"
                step="0.5"
                value={colorPrice}
                onChange={(e) => setColorPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">A3 Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={a3Multiplier}
                onChange={(e) => setA3Multiplier(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duplex Discount %</label>
              <input
                type="number"
                value={duplexDiscount}
                onChange={(e) => setDuplexDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Spiral Binding</label>
              <input
                type="number"
                value={spiralFee}
                onChange={(e) => setSpiralFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staple Fee</label>
              <input
                type="number"
                value={stapleFee}
                onChange={(e) => setStapleFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Shop Owner Security & Login PIN */}
        <div>
          <div className="flex items-center space-x-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center justify-center">
              3
            </div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Shop Owner Counter Login PIN
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Exclusive Login Credential
              </span>
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-950 dark:text-amber-300 mb-0.5">
                  Assigned 4–6 Digit Operator PIN *
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  The shopkeeper can <strong className="text-slate-800 dark:text-slate-200">ONLY</strong> log in using this specific PIN.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.floor(100000 + Math.random() * 900000).toString();
                    setOwnerPin(rnd);
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Generate New PIN</span>
                </button>
              </div>
            </div>

            <div className="max-w-xs">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 583921"
                  className="w-full px-4 py-2.5 text-base font-mono font-black tracking-widest text-center border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-amber-100 focus:border-indigo-600 focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mt-1 font-medium">
                🔒 Custom PIN set for this shop ({ownerPin || 'none'}).
              </p>
            </div>
          </div>
        </div>

        {/* Step 4: Online UPI & QR Code Payments */}
        <div>
          <div className="flex items-center space-x-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
              4
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Online Payments (UPI & QR Code)
            </h4>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOnlinePayments}
                onChange={(e) => setEnableOnlinePayments(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-600"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Enable UPI / GPay / PhonePe QR Code Online Payment for this Shop
              </span>
            </label>

            {enableOnlinePayments && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shopkeeper UPI ID / VPA *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. apexprint@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Direct payment goes directly to the shopkeeper's bank account with zero platform commission!
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payee Name (displayed in payment app)
                  </label>
                  <input
                    type="text"
                    placeholder="Apex Xerox Center"
                    value={upiPayeeName}
                    onChange={(e) => setUpiPayeeName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 5: 7-Day Free Trial System & Plan Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
              5
            </div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                7-Day Free Trial System & Auto-Expire
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Recommended for New Customer Onboarding
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: 7-Day Free Trial */}
            <div
              onClick={() => {
                setIsTrial(true);
                setPlan('free_trial');
              }}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                isTrial
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⭐</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    7-Day Free Trial System
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Auto-Expire Active
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3 font-medium">
                Active for 7 days. When the trial ends, shop owner login will automatically pause and display contact admin prompt. Super Admin tracks remaining days.
              </p>

              {isTrial && (
                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200">Trial Duration:</span>
                  <select
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 text-xs font-bold border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 outline-none"
                  >
                    <option value={4}>4 Days (4-Day Free Plan)</option>
                    <option value={7}>7 Days (Standard 7-Day Trial)</option>
                    <option value={14}>14 Days (Extended Trial)</option>
                    <option value={30}>30 Days (Pilot Partner)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Option 2: Full Subscription Plan */}
            <div
              onClick={() => {
                setIsTrial(false);
                if (plan === 'free_trial') setPlan('starter');
              }}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                !isTrial
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🚀</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    Full Paid Commercial Plan
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Permanent Access
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3 font-medium">
                Unlimited commercial access with continuous daily operation without trial auto-expiry.
              </p>

              {!isTrial && (
                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200">Plan Tier:</span>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as ShopPlan)}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 text-xs font-bold border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 outline-none"
                  >
                    <optgroup label="Permanent / Lifetime Plans">
                      <option value="starter">Permanent Starter Plan</option>
                      <option value="pro">Permanent Pro Plan (High Volume)</option>
                      <option value="enterprise">Permanent Enterprise (Campus Hub)</option>
                      <option value="permanent">Permanent All-Inclusive</option>
                    </optgroup>
                    <optgroup label="Monthly Subscription Plans">
                      <option value="monthly_starter">Monthly Starter (₹499/mo)</option>
                      <option value="monthly_pro">Monthly Pro (₹999/mo)</option>
                      <option value="monthly_enterprise">Monthly Enterprise (₹2,499/mo)</option>
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit & Generate Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Provisioning Shop...' : 'Generate & Deploy Shop System'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
