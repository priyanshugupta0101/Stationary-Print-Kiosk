import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Share2,
  ExternalLink,
  QrCode,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Store,
  CreditCard,
  MessageCircle,
} from 'lucide-react';
import { ShopTenant } from '../../types';
import { generateQrCodeDataUrl } from '../../utils/qrCodeGenerator';

interface CounterStandeeModalProps {
  shop: ShopTenant;
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
}

export const CounterStandeeModal: React.FC<CounterStandeeModalProps> = ({
  shop,
  isOpen,
  onClose,
  baseUrl,
}) => {
  const [customerQrDataUrl, setCustomerQrDataUrl] = useState<string>('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [copiedUploadLink, setCopiedUploadLink] = useState(false);
  const [copiedOwnerLink, setCopiedOwnerLink] = useState(false);
  const [copiedKitMessage, setCopiedKitMessage] = useState(false);
  const standeeRef = useRef<HTMLDivElement>(null);

  const customerUploadUrl = `${baseUrl}/?shop=${shop.slug}`;
  const ownerDeskUrl = `${baseUrl}/?shop=${shop.slug}&mode=owner`;

  // Build UPI URI if enabled
  const upiId = (shop.settings.upiId || '').trim();
  const payeeName = (shop.settings.upiPayeeName || shop.name || 'Print Shop')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 25);
  const upiPaymentUri = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&cu=INR`
    : '';

  useEffect(() => {
    if (!isOpen) return;

    // Generate Customer Upload QR
    generateQrCodeDataUrl(customerUploadUrl, { width: 400, margin: 2 }).then(
      (url) => setCustomerQrDataUrl(url)
    );

    // Generate UPI QR if UPI ID present
    if (upiPaymentUri) {
      generateQrCodeDataUrl(upiPaymentUri, { width: 300, margin: 2 }).then(
        (url) => setUpiQrDataUrl(url)
      );
    }
  }, [isOpen, customerUploadUrl, upiPaymentUri]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, type: 'upload' | 'owner' | 'kit') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'upload') {
        setCopiedUploadLink(true);
        setTimeout(() => setCopiedUploadLink(false), 2000);
      } else if (type === 'owner') {
        setCopiedOwnerLink(true);
        setTimeout(() => setCopiedOwnerLink(false), 2000);
      } else {
        setCopiedKitMessage(true);
        setTimeout(() => setCopiedKitMessage(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard error:', e);
    }
  };

  const welcomeMessage = `👋 Hello ${shop.ownerName || 'Partner'}!

🎉 Your digital Smart Print & Xerox System for *${shop.name}* is now LIVE & ACTIVE!

📄 *Customer Self-Service Upload Portal:*
${customerUploadUrl}
(Customers scan your counter QR to instantly upload PDFs & get a 4-digit pickup code)

🖥️ *Shop Owner Counter Desk:*
${ownerDeskUrl}
🔑 *Owner Counter PIN:* ${shop.settings.ownerPin || 'Not set (Configured in Super Admin)'}
(Open this on your counter PC/laptop to see live orders, audio chimes, and 1-click print)

💳 *Online Payment:* ${shop.settings.enableOnlinePayments && upiId ? `Configured with UPI (${upiId})` : 'Cash / Counter'}
📍 *Print Rates:* B&W ${shop.settings.currency}${shop.settings.bwPricePerPage}/pg • Color ${shop.settings.currency}${shop.settings.colorPricePerPage}/pg

Your printable high-resolution Counter QR Standee is ready for placement at your shop front desk. Let us know if you need any assistance!`;

  const handleShareWhatsApp = () => {
    const phone = (shop.whatsappNumber || shop.phone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') || phone.length > 10 ? phone : `91${phone}`;
    const url = `https://wa.me/${cleanPhone ? cleanPhone : ''}?text=${encodeURIComponent(welcomeMessage)}`;
    window.open(url, '_blank');
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const downloadQrCode = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  Shop Delivery & QR Standee Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {shop.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ready-to-deliver counter poster, customer QR codes, and owner credentials packet
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Delivery Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handlePrintStandee}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Counter Standee</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Deliver via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(welcomeMessage, 'kit')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer border border-transparent dark:border-slate-700"
            >
              {copiedKitMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKitMessage ? 'Packet Copied!' : 'Copy Welcome Packet'}</span>
            </button>
          </div>

          {/* Links & Credentials Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Upload Link Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center space-x-1.5">
                    <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Customer Upload URL (Direct Portal)</span>
                  </span>
                  <a
                    href={customerUploadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-2 rounded-xl border border-indigo-100/80 dark:border-slate-800 truncate">
                  {customerUploadUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(customerUploadUrl, 'upload')}
                className="mt-3 w-full py-2 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {copiedUploadLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUploadLink ? 'Link Copied!' : 'Copy Customer Portal Link'}</span>
              </button>
            </div>

            {/* Shop Owner Desk Link Card */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <Store className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Shop Owner Counter Desk</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    PIN: {shop.settings.ownerPin || 'Assigned in Super Admin'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 truncate">
                  {ownerDeskUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(ownerDeskUrl, 'owner')}
                className="mt-3 w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {copiedOwnerLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOwnerLink ? 'Desk Link Copied!' : 'Copy Owner Counter Desk URL'}</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE COUNTER STANDEE POSTER PREVIEW */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-4">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Printable Counter Standee Preview (Acrylic / A4 Poster)
              </span>
              {customerQrDataUrl && (
                <button
                  type="button"
                  onClick={() => downloadQrCode(customerQrDataUrl, `${shop.slug}-customer-qr.png`)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR PNG</span>
                </button>
              )}
            </div>

            {/* Standee Poster Canvas */}
            <div
              ref={standeeRef}
              id="printable-standee-card"
              className="bg-white rounded-2xl border-2 border-slate-900 p-6 sm:p-8 max-w-xl mx-auto shadow-md text-slate-900 flex flex-col items-center text-center relative"
            >
              {/* Top Branding Banner */}
              <div className="w-full pb-4 border-b-2 border-slate-900 mb-6">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 text-white text-[11px] font-black uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Self-Service Smart Print Desk</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                  {shop.name}
                </h2>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {shop.tagline || 'High-Speed Document Printing • Zero Wait Time'}
                </p>
                {shop.address && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{shop.address}</p>
                )}
              </div>

              {/* Main QR Code Section */}
              <div className="mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 block mb-2">
                  Scan to Upload Documents
                </span>
                <div className="p-3 bg-white border-4 border-slate-950 rounded-2xl inline-block shadow-lg">
                  {customerQrDataUrl ? (
                    <img
                      src={customerQrDataUrl}
                      alt="Customer Upload QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-100 animate-pulse text-xs text-slate-400">
                      Generating QR...
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-mono font-bold text-slate-600 mt-2">
                  {customerUploadUrl.replace('https://', '')}
                </p>
              </div>

              {/* 3 Simple Customer Steps */}
              <div className="w-full grid grid-cols-3 gap-2 my-4 py-4 border-y border-slate-200">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center mb-1">
                    1
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Scan QR Code</p>
                  <p className="text-[10px] text-slate-500">From any phone</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center mb-1">
                    2
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Upload File</p>
                  <p className="text-[10px] text-slate-500">Choose B&W/Color</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center mb-1">
                    3
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Get 4-Digit Token</p>
                  <p className="text-[10px] text-slate-500">Collect prints</p>
                </div>
              </div>

              {/* Rates & Online Payment Footer */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-left">
                {/* Print Rates */}
                <div className="bg-slate-100/90 px-3 py-2 rounded-xl w-full sm:w-auto">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Print Rates</p>
                  <p className="text-xs font-black text-slate-900">
                    B&W: {shop.settings.currency}{shop.settings.bwPricePerPage}/pg • Color: {shop.settings.currency}{shop.settings.colorPricePerPage}/pg
                  </p>
                </div>

                {/* UPI Online Payment if enabled */}
                {shop.settings.enableOnlinePayments && upiId && (
                  <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl w-full sm:w-auto">
                    <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-700">UPI / GPay Accepted</p>
                      <p className="text-xs font-mono font-bold text-emerald-950">{upiId}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
