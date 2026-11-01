import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Wifi,
  Download,
  Printer,
  FileText,
  FileCheck,
  Layers,
  ArrowRight,
  Store,
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ShopSettings } from '../types';
import {
  generatePosterDataUrl,
  downloadImage,
  printPosterWindow,
} from '../utils/posterGenerator';

interface CustomerQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopSettings?: ShopSettings | null;
}

export const CustomerQrModal: React.FC<CustomerQrModalProps> = ({
  isOpen,
  onClose,
  shopName,
  shopSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'poster' | 'raw-qr'>('poster');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedOwner, setCopiedOwner] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const customerUrl = rawOrigin;
  const ownerUrl = `${customerUrl}?mode=owner`;

  const effectiveShopName = shopSettings?.shopName || shopName || 'COPY';
  const currency = shopSettings?.currency || '₹';
  const bwRate = shopSettings?.bwPricePerPage ?? 2;
  const colorRate = shopSettings?.colorPricePerPage ?? 10;
  const whatsappNum = shopSettings?.whatsappNumber || shopSettings?.contactPhone || '';
  const contactEmail = shopSettings?.contactEmail || '';

  useEffect(() => {
    if (isOpen && customerUrl) {
      QRCode.toDataURL(customerUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen, customerUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!customerUrl) return;
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyOwner = () => {
    if (!ownerUrl) return;
    navigator.clipboard.writeText(ownerUrl);
    setCopiedOwner(true);
    setTimeout(() => setCopiedOwner(false), 2500);
  };

  // 1. Download Printable Wall Poster
  const handleDownloadPoster = async () => {
    if (!qrDataUrl) return;
    try {
      setIsGenerating(true);
      const posterDataUrl = await generatePosterDataUrl({
        shopName: effectiveShopName,
        tagline: shopSettings?.tagline,
        shopAddress: shopSettings?.shopAddress,
        contactPhone: shopSettings?.contactPhone,
        contactEmail: shopSettings?.contactEmail,
        whatsappNumber: shopSettings?.whatsappNumber,
        currency,
        bwPricePerPage: bwRate,
        colorPricePerPage: colorRate,
        qrDataUrl,
        customerUrl,
      });

      const cleanFilename = `${effectiveShopName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-wall-poster.png`;
      downloadImage(posterDataUrl, cleanFilename);

      setDownloadSuccess('Wall poster downloaded! Ready to print & stick on the wall.');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to generate poster:', err);
      setErrorMessage('Could not generate poster: ' + (err.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Direct Print Wall Poster
  const handlePrintPoster = async () => {
    if (!qrDataUrl) return;
    try {
      setIsGenerating(true);
      const posterDataUrl = await generatePosterDataUrl({
        shopName: effectiveShopName,
        tagline: shopSettings?.tagline,
        shopAddress: shopSettings?.shopAddress,
        contactPhone: shopSettings?.contactPhone,
        contactEmail: shopSettings?.contactEmail,
        whatsappNumber: shopSettings?.whatsappNumber,
        currency,
        bwPricePerPage: bwRate,
        colorPricePerPage: colorRate,
        qrDataUrl,
        customerUrl,
      });

      printPosterWindow(posterDataUrl, effectiveShopName);
    } catch (err: any) {
      console.error('Failed to print poster:', err);
      setErrorMessage('Could not launch print window: ' + (err.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Download QR code only
  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const cleanFilename = `${effectiveShopName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-qr-code.png`;
    downloadImage(qrDataUrl, cleanFilename);
    setDownloadSuccess('QR code image downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[94vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Customer Upload QR &amp; Wall Poster
                </h3>
                <span className="hidden xs:inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Ready to Print
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Download a poster with instructions to stick on your shop wall or counter
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs & Quick Download Bar */}
        <div className="px-4 sm:px-6 pt-3 pb-3 bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('poster')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'poster'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Printable Wall Poster</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw-qr')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'raw-qr'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-yellow-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>On-Screen QR &amp; Links</span>
            </button>
          </div>

          {/* Action Buttons: Download Poster & Print Poster */}
          <div className="flex items-center space-x-2">
            <button
              id="download-wall-poster-btn"
              type="button"
              disabled={isGenerating || !qrDataUrl}
              onClick={handleDownloadPoster}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Download Poster (PNG)'}</span>
            </button>

            <button
              id="print-wall-poster-btn"
              type="button"
              disabled={isGenerating || !qrDataUrl}
              onClick={handlePrintPoster}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              title="Print directly to your connected printer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300 dark:text-yellow-400" />
              <span>Print Poster</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-xl flex items-center space-x-2 animate-in fade-in">
            <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer" onClick={() => setErrorMessage(null)} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-950/40">
          {activeTab === 'poster' ? (
            /* Printable Wall Poster Live Preview */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Wall Poster Preview (Ready for A4 / Letter Print)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDownloadQrOnly}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-yellow-400 underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download QR Only</span>
                  </button>
                </div>
              </div>

              {/* The Visual Poster Card */}
              <div
                id="printable-poster-mockup"
                className="bg-white border-4 border-slate-900 rounded-3xl shadow-xl p-6 sm:p-8 max-w-xl mx-auto relative text-slate-900 overflow-hidden"
              >
                {/* 1. Top Center: Stationery Shop Name (Clean, Bold, No Clutter) */}
                <div className="text-center mb-6 pt-2">
                  <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-2">
                    Self-Service Document Printing
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                    {effectiveShopName}
                  </h2>
                  <div className="w-16 h-1 bg-indigo-600 rounded-full mx-auto mt-2.5" />
                </div>

                {/* 2. Central Main QR Code Stage */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center mb-6 shadow-inner">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-0.5">
                    SCAN TO PRINT
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Point your phone camera or Google Lens at this code
                  </p>

                  <div className="inline-block p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md relative group">
                    {/* Cool Viewfinder Corner Brackets */}
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 border-t-4 border-l-4 border-indigo-600 rounded-tl-sm" />
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 border-t-4 border-r-4 border-indigo-600 rounded-tr-sm" />
                    <div className="absolute bottom-1.5 left-1.5 w-5 h-5 border-b-4 border-l-4 border-indigo-600 rounded-bl-sm" />
                    <div className="absolute bottom-1.5 right-1.5 w-5 h-5 border-b-4 border-r-4 border-indigo-600 rounded-br-sm" />

                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Customer Upload QR"
                        className="w-48 h-48 sm:w-60 sm:h-60 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center text-xs text-slate-400">
                        Loading QR code...
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5">
                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                      Portal: {customerUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>

                {/* 3. Steps Directly Below QR */}
                <div className="mb-6">
                  <div className="text-center mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      How It Works
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Step 1 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-700 border border-sky-300 flex items-center justify-center text-xs font-black shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Scan QR Code</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Open phone camera &amp; tap the banner link.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-300 flex items-center justify-center text-xs font-black shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Upload Documents</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Pick PDF, Word, images &amp; pick B/W or Color.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Get 4-Digit Code</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Instant 4-digit pickup code shown on phone.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center text-xs font-black shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Collect at Counter</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Share code with desk operator to print.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Bottom: Printing Rates & Price Details */}
                <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 text-white shadow-md">
                  <div className="text-center mb-3">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                      ⚡ Printing Rates (A4 Laser Quality)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* B/W Rate Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Black &amp; White
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-white">
                        {currency}{bwRate}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase">
                        per single page
                      </span>
                    </div>

                    {/* Color Rate Card */}
                    <div className="bg-indigo-950 border border-indigo-900 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-0.5">
                        Color Print
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-indigo-200">
                        {currency}{colorRate}
                      </div>
                      <span className="text-[9px] font-semibold text-indigo-400 uppercase">
                        per single page
                      </span>
                    </div>
                  </div>

                  <div className="text-center mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    Fast • Private • Secure — Printed instantly at the desk
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* On-Screen Raw QR & Quick Links View */
            <div className="space-y-5 max-w-md mx-auto py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-yellow-400 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Direct Screen QR Code
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Point customer's phone camera directly at this screen to upload files
                </p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Customer Upload QR Code"
                    className="w-52 h-52 sm:w-64 sm:h-64 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 bg-white p-3"
                  />
                ) : (
                  <div className="w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center text-xs text-slate-400">
                    Generating counter QR...
                  </div>
                )}
                <div className="mt-3 flex items-center space-x-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Real-Time Two-Device Connection Ready</span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQrOnly}
                  className="mt-3 text-xs font-bold text-indigo-600 dark:text-yellow-400 hover:text-indigo-800 dark:hover:text-yellow-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR Image PNG</span>
                </button>
              </div>

              {/* Counter URL Link Box */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Customer Upload Link (Phone A)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-yellow-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Customer Link
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={customerUrl}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-400 dark:text-yellow-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Owner Desk Link (Phone B)
                    </label>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      Counter Console
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={ownerUrl}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyOwner}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedOwner ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>High-resolution 300-DPI poster image suitable for wall mounting</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => window.open(customerUrl, '_blank')}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Customer Tab</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none py-2 px-5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
