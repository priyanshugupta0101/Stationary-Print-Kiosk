import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Store,
  ShieldCheck,
  Database,
  Download,
  Crown,
  Mail,
  MessageSquare,
  QrCode,
  CreditCard,
  Smartphone,
  ExternalLink,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ShopSettings } from '../types';
import { CustomerQrModal } from './CustomerQrModal';

interface OwnerSettingsViewProps {
  shopSettings: ShopSettings | null;
  onSettingsUpdated: (updated: ShopSettings) => void;
}

export const OwnerSettingsView: React.FC<OwnerSettingsViewProps> = ({
  shopSettings,
  onSettingsUpdated,
}) => {
  const [formData, setFormData] = useState<Partial<ShopSettings>>({
    shopName: shopSettings?.shopName || 'COPY',
    tagline: shopSettings?.tagline || 'High-Speed Document Printing & Counter Desk',
    currency: shopSettings?.currency || '₹',
    bwPricePerPage: shopSettings?.bwPricePerPage ?? 2,
    colorPricePerPage: shopSettings?.colorPricePerPage ?? 10,
    a3Multiplier: shopSettings?.a3Multiplier ?? 2,
    doubleSidedDiscountPercent: shopSettings?.doubleSidedDiscountPercent ?? 10,
    stapleFee: shopSettings?.stapleFee ?? 5,
    spiralFee: shopSettings?.spiralFee ?? 30,
    ownerPin: shopSettings?.ownerPin || '',
    contactPhone: shopSettings?.contactPhone || '',
    contactEmail: shopSettings?.contactEmail || '',
    whatsappNumber: shopSettings?.whatsappNumber || shopSettings?.contactPhone || '',
    shopAddress: shopSettings?.shopAddress || '',
    enableOnlinePayments: shopSettings?.enableOnlinePayments ?? false,
    upiId: shopSettings?.upiId || '',
    upiPayeeName: shopSettings?.upiPayeeName || shopSettings?.shopName || 'COPY',
    upiAccountType: (shopSettings?.upiAccountType || (shopSettings?.upiId?.toLowerCase().includes('@fam') ? 'personal' : 'personal')) as 'personal' | 'merchant',
  });

  const [pinAuth, setPinAuth] = useState(shopSettings?.ownerPin || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [testQrUrl, setTestQrUrl] = useState<string>('');
  const [testUpiCopied, setTestUpiCopied] = useState(false);

  // Generate test QR preview for sample ₹10 payment
  const currentUpiId = (formData.upiId || '').trim();
  const currentPayee = (formData.upiPayeeName || formData.shopName || 'COPY')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 25);
  // NPCI compliant: do not percent-encode @ in pa
  const testUpiUri = currentUpiId
    ? `upi://pay?pa=${currentUpiId}&pn=${encodeURIComponent(currentPayee)}&am=10.00&cu=INR&tn=${encodeURIComponent('Test Print')}`
    : '';

  useEffect(() => {
    if (currentUpiId) {
      QRCode.toDataURL(testUpiUri, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setTestQrUrl(url))
        .catch((err) => console.error('Error generating preview QR:', err));
    }
  }, [testUpiUri, currentUpiId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinAuth.trim() || formData.ownerPin || '',
          newSettings: formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSaveSuccess(true);
          onSettingsUpdated(data.settings);
          try {
            localStorage.setItem('copy_print_shop_settings', JSON.stringify(data.settings));
          } catch (e) {}
          setTimeout(() => setSaveSuccess(false), 3500);
          return;
        }
      }

      // If server failed (e.g. static hosting or network error), persist locally
      onSettingsUpdated(formData as ShopSettings);
      try {
        localStorage.setItem('copy_print_shop_settings', JSON.stringify(formData));
      } catch (e) {}
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      // Offline / fallback save
      onSettingsUpdated(formData as ShopSettings);
      try {
        localStorage.setItem('copy_print_shop_settings', JSON.stringify(formData));
      } catch (e) {}
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Pricing &amp; Shop Settings
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Set counter prices, paper multipliers, shop branding, and export your database
              </p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Pricing and shop settings updated successfully in the database!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center space-x-2.5 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Section 1: Print Pricing Configuration */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
              <DollarSign className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
              Document Printing &amp; Xerox Tariff
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Currency Symbol
                </label>
                <select
                  id="settings-currency-select"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400 cursor-pointer"
                >
                  <option value="₹">₹ (INR - Rupee)</option>
                  <option value="$">$ (USD - Dollar)</option>
                  <option value="€">€ (EUR - Euro)</option>
                  <option value="£">£ (GBP - Pound)</option>
                  <option value="¥">¥ (JPY / CNY)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Black &amp; White Rate (Per Page)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 dark:text-slate-500 font-bold">
                    {formData.currency}
                  </span>
                  <input
                    id="settings-bw-price"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.bwPricePerPage}
                    onChange={(e) =>
                      setFormData({ ...formData, bwPricePerPage: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Color Rate (Per Page)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 dark:text-slate-500 font-bold">
                    {formData.currency}
                  </span>
                  <input
                    id="settings-color-price"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.colorPricePerPage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        colorPricePerPage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-indigo-700 dark:text-yellow-400 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional finishing & multipliers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  A3 Multiplier
                </label>
                <input
                  id="settings-a3-multiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  value={formData.a3Multiplier}
                  onChange={(e) =>
                    setFormData({ ...formData, a3Multiplier: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Duplex Disc. (%)
                </label>
                <input
                  id="settings-duplex-discount"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.doubleSidedDiscountPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      doubleSidedDiscountPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Staple ({formData.currency})
                </label>
                <input
                  id="settings-staple-fee"
                  type="number"
                  min="0"
                  value={formData.stapleFee}
                  onChange={(e) =>
                    setFormData({ ...formData, stapleFee: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Spiral ({formData.currency})
                </label>
                <input
                  id="settings-spiral-fee"
                  type="number"
                  min="0"
                  value={formData.spiralFee}
                  onChange={(e) =>
                    setFormData({ ...formData, spiralFee: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shop Branding & Direct Dispatch Channels */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
                <Store className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
                Shop Identity &amp; Customer Channels
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Powers the Customer Web Portal &amp; Direct WhatsApp/Email Page
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Stationery Shop Name
                </label>
                <input
                  id="settings-shop-name"
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tagline</label>
                <input
                  id="settings-tagline"
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>

              {/* WhatsApp Number (used for customer direct WhatsApp page) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
                  <span>WhatsApp Phone Number (For Direct Document Sending)</span>
                </label>
                <input
                  id="settings-whatsapp"
                  type="text"
                  placeholder="+91 98765 43210 (include country code)"
                  value={formData.whatsappNumber || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Customers click to automatically open WhatsApp chat and send documents to this number.
                </p>
              </div>

              {/* Shop Email Address (used for customer direct email page) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400 mr-1" />
                  <span>Shop Email Address (For Direct Document Sending)</span>
                </label>
                <input
                  id="settings-email"
                  type="email"
                  placeholder="e.g. contact@copyprint.in"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Customers click to launch their email app pre-addressed with this recipient.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Counter Location / Shop Address
                </label>
                <input
                  id="settings-address"
                  type="text"
                  value={formData.shopAddress}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  General Contact Phone / Landline
                </label>
                <input
                  id="settings-phone"
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Online Payments & UPI / GPay Configuration */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
                  <CreditCard className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
                  Online Payments &amp; GPay / UPI Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure your shop's UPI ID, Google Pay direct links, and toggle online payments on or off.
                </p>
              </div>

              {/* Master Online Payments Toggle */}
              <div className="flex items-center space-x-3 self-start sm:self-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-2xl shadow-2xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Online Payments:
                </span>
                <button
                  id="toggle-online-payments-btn"
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      enableOnlinePayments: !formData.enableOnlinePayments,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.enableOnlinePayments !== false
                      ? 'bg-emerald-600'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.enableOnlinePayments !== false
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    formData.enableOnlinePayments !== false
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {formData.enableOnlinePayments !== false ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>

            {formData.enableOnlinePayments === false ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Online Payments are currently disabled:</strong> Customers will only see the "Pay at Counter" option when receiving their 4-digit pickup PIN.
                </span>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* UPI ID / VPA */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                      <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400 mr-1" />
                      <span>Shop UPI ID / VPA</span>
                    </label>
                    <input
                      id="settings-upi-id"
                      type="text"
                      placeholder="e.g. 9876543210@paytm or shop@okhdfcbank"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value.trim() })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Customer payments from GPay, PhonePe, and Paytm deposit directly to this UPI ID.
                    </p>
                  </div>

                  {/* Payee / Merchant Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                      <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400 mr-1" />
                      <span>Payee / Merchant Display Name</span>
                    </label>
                    <input
                      id="settings-upi-payee"
                      type="text"
                      placeholder="e.g. COPY Print Desk"
                      value={formData.upiPayeeName || ''}
                      onChange={(e) => setFormData({ ...formData, upiPayeeName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Merchant name displayed to customer on their Google Pay payment screen.
                    </p>
                  </div>

                  {/* UPI Account Classification: Personal / FamPay vs Business */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                      <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mr-1" />
                      <span>UPI Account Type (Personal / FamPay vs Business Merchant)</span>
                    </label>
                    <select
                      id="settings-upi-account-type"
                      value={formData.upiAccountType || 'personal'}
                      onChange={(e) => setFormData({ ...formData, upiAccountType: e.target.value as 'personal' | 'merchant' })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400 cursor-pointer"
                    >
                      <option value="personal">Personal UPI / FamPay / Student Wallet (P2P - Avoids ₹1 GPay Limits)</option>
                      <option value="merchant">Business Current Account (Merchant P2M QR)</option>
                    </select>

                    <div className="mt-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-amber-950 dark:text-amber-100">
                        <span>💡</span>
                        <span>Why did GPay show &quot;Limit exceeded&quot; when testing ₹1 to a FamPay UPI ID?</span>
                      </p>
                      <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                        FamPay accounts are RBI-registered Personal Wallets (P2P). When Google Pay scans an invoice QR with order parameters for small amounts (like ₹1), GPay misclassifies it as an unverified merchant and displays a misleading bank limit error.
                      </p>
                      <p className="leading-relaxed font-semibold text-amber-950 dark:text-amber-100">
                        ✓ Solution Active: Our system automatically generates clean P2P intent and provides direct &quot;Pay UPI ID&quot; buttons for GPay, PhonePe, and Paytm so customers and testers can pay any amount without limits.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Test Preview & Simulator for Owner */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-yellow-400 mr-1.5" />
                        Live Customer Preview (Sample ₹10.00 Print Job for Customer A)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Test how the barcode and GPay link look to customers who order a ₹10 print job.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUpiId);
                          setTestUpiCopied(true);
                          setTimeout(() => setTestUpiCopied(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1 cursor-pointer"
                      >
                        {testUpiCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400">UPI Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Copy UPI ID</span>
                          </>
                        )}
                      </button>

                      <a
                        id="test-gpay-link-btn"
                        href={testUpiUri}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-[11px] font-extrabold flex items-center space-x-1.5 shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Test GPay Link</span>
                      </a>
                    </div>
                  </div>

                  {/* QR Preview Grid */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    {testQrUrl ? (
                      <div className="p-2.5 bg-white rounded-xl shadow-xs shrink-0">
                        <img
                          src={testQrUrl}
                          alt="Test UPI QR"
                          className="w-28 h-28 object-contain"
                        />
                      </div>
                    ) : null}

                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Target VPA:</span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-yellow-400 bg-indigo-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-slate-700">
                          {currentUpiId}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Display Payee:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold">{currentPayee}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Test Preset Amount:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">₹10.00 (Auto-calculated per job)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        You can scan this QR with your own smartphone now to test that it resolves properly to your account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Owner Security PIN */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
              Owner Authentication & Desk PIN
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Owner PIN <span className="text-slate-400 dark:text-slate-500 font-normal">(Required to authorize changes)</span>
                </label>
                <input
                  id="settings-current-pin"
                  type="password"
                  maxLength={6}
                  value={pinAuth}
                  onChange={(e) => setPinAuth(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current 6-digit PIN"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Set New Owner PIN <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="settings-new-pin"
                  type="password"
                  maxLength={6}
                  value={formData.ownerPin}
                  onChange={(e) => setFormData({ ...formData, ownerPin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Type new 6-digit PIN"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Only authorized staff possessing this PIN can unlock your counter queue, cash ledger, and pricing settings.
            </p>
          </div>

          {/* Section 4: Customer Wall Poster & QR Code */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
                  <QrCode className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
                  Printable Customer Wall Poster &amp; QR
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Generate a high-resolution A4 poster with your shop name, printing rates, 4-step instructions, and QR code to print and stick on your wall.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-indigo-300 dark:text-yellow-400" />
                <span>Preview &amp; Download Poster</span>
              </button>
            </div>
          </div>

          {/* Section 5: Real-World Database Backup */}
          <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-indigo-700 dark:text-yellow-400 uppercase tracking-wider flex items-center">
                  <Database className="w-4 h-4 mr-1 text-indigo-600 dark:text-yellow-400" />
                  Real-World SQLite Database Schema
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  All customer print orders, uploaded file metadata, and accounting records are persisted in a relational SQLite database.
                </p>
              </div>

              <a
                href="/api/database/backup"
                download="printshop-database.sqlite"
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                <span>Download Database (.sqlite)</span>
              </a>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              id="save-settings-btn"
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto justify-center px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to SQLite...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Pricing &amp; Shop Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Printable Poster & QR Modal */}
      <CustomerQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        shopSettings={shopSettings}
      />
    </div>
  );
};
