import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  MessageCircle,
  Mail,
  Search,
  LogOut,
  Menu,
  X,
  Phone,
  Copy,
  Check,
  ChevronDown,
  Compass,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ShopSettings } from '../types';
import { soundEffects } from '../utils/soundEffects';

export type AppNavView = 'upload' | 'direct-send' | 'owner' | 'super-admin';

interface HeaderProps {
  currentView: AppNavView;
  onSelectView: (view: AppNavView) => void;
  shopSettings: ShopSettings | null;
  pendingCount: number;
  onLogout?: () => void;
  onQuickTrack?: (code: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  shopSettings,
  pendingCount,
  onLogout,
  onQuickTrack,
  theme = 'light',
  onToggleTheme,
}) => {
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [modalTrackCode, setModalTrackCode] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSelect = (view: AppNavView) => {
    soundEffects.playButtonClick();
    onSelectView(view);
    setIsMenuOpen(false);
  };

  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCodeInput.replace(/\D/g, '').slice(0, 4);
    if (clean.length === 4 && onQuickTrack) {
      soundEffects.playSearchDing();
      onQuickTrack(clean);
      setQuickCodeInput('');
      setIsMenuOpen(false);
    }
  };

  const handleModalTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = modalTrackCode.replace(/\D/g, '').slice(0, 4);
    if (clean.length === 4 && onQuickTrack) {
      soundEffects.playSearchDing();
      onQuickTrack(clean);
      setModalTrackCode('');
      setIsTrackModalOpen(false);
      setIsMenuOpen(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    soundEffects.playCopyPing();
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shopName = shopSettings?.shopName || 'COPY';
  const rawWhatsApp = shopSettings?.whatsappNumber || shopSettings?.contactPhone || '+91 98765 00111';
  const cleanWhatsAppNumber = rawWhatsApp.replace(/\D/g, '');
  const email = shopSettings?.contactEmail || 'guptapriyanshu0101@gmail.com';
  const phone = shopSettings?.contactPhone || '+91 98765 00111';
  const address = shopSettings?.shopAddress || 'Central Campus Counter Desk';

  const whatsappMessage = encodeURIComponent(
    `Hello ${shopName}! I have a question regarding my print order on the COPY Kiosk.`
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber || '919876500111'}?text=${whatsappMessage}`;
  const emailUrl = `mailto:${email}?subject=${encodeURIComponent(`Print Order Inquiry - ${shopName}`)}&body=${encodeURIComponent(`Hi ${shopName},\n\nI need assistance with a print order.\n\nThank you!`)}`;

  return (
    <>
      {/* Top Banner with Distinctive Slate-Navy & Indigo Aesthetic */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-indigo-900/50 shadow-md relative transition-colors duration-200">
        {/* Subtle accent highlight line at the very top */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
            {/* Left: Brand Identity & Live Status */}
            <div
              className="flex items-center cursor-pointer group shrink-0"
              onClick={() => handleSelect('upload')}
              title="Return to Customer Upload Kiosk"
            >
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white dark:text-yellow-400 group-hover:text-yellow-300 transition-colors truncate max-w-[160px] xs:max-w-[210px] sm:max-w-none">
                    {shopName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                    Live Desk
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs font-medium">
                  {shopSettings?.tagline || 'High-Speed Document Printing & Counter Kiosk'}
                </p>
              </div>
            </div>

            {/* Center / Right: Interactive Menu + Quick Track + Theme Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Top Banner Menu Dropdown Trigger */}
              <div className="relative" ref={menuRef}>
                <button
                  id="top-banner-menu-btn"
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    isMenuOpen
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 hover:text-white border-slate-700/80 shadow-xs'
                  }`}
                  aria-expanded={isMenuOpen}
                  aria-label="Navigation Menu"
                >
                  <Menu className="w-4 h-4 text-amber-300" />
                  <span className="hidden xs:inline">Menu</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isMenuOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Floating Menu Popover */}
                {isMenuOpen && (
                  <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Quick Navigation &amp; Help
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Option 1: Upload Kiosk */}
                      <button
                        type="button"
                        onClick={() => {
                          handleSelect('upload');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          currentView === 'upload'
                            ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200 hover:text-white'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Upload Kiosk</span>
                            <span className="text-[10px] font-semibold text-emerald-400">Instant</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Upload documents &amp; configure printing
                          </p>
                        </div>
                      </button>

                      {/* Option 2: WhatsApp & Email Support */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsContactModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>WhatsApp &amp; Email</span>
                            <span className="text-[10px] font-semibold text-amber-300">Support</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Chat on WhatsApp or email the shop
                          </p>
                        </div>
                      </button>

                      {/* Option 3: Track Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsTrackModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Search className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Track Order Status</span>
                            <span className="text-[10px] font-semibold text-indigo-300">4-Digit</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Track live status with your 4-digit code
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Shop Contact Footer in Menu */}
                    <div className="mt-2 pt-2 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Counter: {cleanWhatsAppNumber || 'Available'}</span>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center space-x-1"
                      >
                        <span>Chat</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Track Input Bar (Desktop) */}
              {onQuickTrack && currentView !== 'owner' && (
                <form
                  onSubmit={handleQuickTrackSubmit}
                  className="hidden md:flex items-center max-w-[190px] xl:max-w-xs w-full relative"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={4}
                    value={quickCodeInput}
                    onChange={(e) => setQuickCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Track 4-digit code..."
                    className="w-full pl-8 pr-13 py-1.5 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 text-xs font-semibold text-white placeholder-slate-400 rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={quickCodeInput.length !== 4}
                    className="absolute right-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Track
                  </button>
                </form>
              )}

              {/* Theme Toggle Button */}
              {onToggleTheme && (
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              )}

              {/* Exit/Logout Button for Operator & Admin views */}
              {(currentView === 'owner' || currentView === 'super-admin') && (
                <div className="flex items-center space-x-1.5 pl-1 sm:pl-2 border-l border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSelect('upload')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    title="Switch to Customer Kiosk"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Customer Kiosk</span>
                  </button>
                  {onLogout && (
                    <button
                      id="header-logout-btn"
                      type="button"
                      onClick={onLogout}
                      className="flex items-center space-x-1 p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 border border-transparent hover:border-rose-900 transition-colors cursor-pointer text-xs font-bold"
                      title="Lock & Exit Panel"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Exit</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* WhatsApp & Email Support Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-slate-900 dark:text-slate-100">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Shop Support &amp; Counter Help
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
              Contact <strong className="text-slate-900 dark:text-slate-100">{shopName}</strong> directly via WhatsApp or Email for instant assistance with your printouts.
            </p>

            <div className="space-y-3">
              {/* WhatsApp Direct Action */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-emerald-900 dark:text-emerald-300">
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp Chat</span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-400 truncate mt-0.5">
                    {rawWhatsApp}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyText(rawWhatsApp, 'whatsapp')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-emerald-200 dark:border-slate-700 transition-colors cursor-pointer text-xs"
                    title="Copy WhatsApp number"
                  >
                    {copiedField === 'whatsapp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1"
                  >
                    <span>Chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Email Direct Action */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-indigo-900 dark:text-indigo-300">
                    <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Email Support</span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-indigo-800 dark:text-indigo-400 truncate mt-0.5">
                    {email}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyText(email, 'email')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-slate-700 transition-colors cursor-pointer text-xs"
                    title="Copy Email Address"
                  >
                    {copiedField === 'email' ? (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={emailUrl}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1"
                  >
                    <span>Email</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Counter Phone Calling */}
              {phone && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 dark:text-slate-200">
                      <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>Counter Phone</span>
                    </div>
                    <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                      {phone}
                    </p>
                  </div>
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    Call Desk
                  </a>
                </div>
              )}
            </div>

            {address && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Location:</span>
                <span>{address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Track Order Status Modal */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center text-slate-900 dark:text-slate-100">
            <button
              type="button"
              onClick={() => setIsTrackModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
              Order Tracker
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-1">
              Track Your Print Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Enter the 4-digit code generated when you uploaded your files to view live progress and pickup ticket.
            </p>

            <form onSubmit={handleModalTrackSubmit} className="space-y-4">
              <input
                type="text"
                maxLength={4}
                autoFocus
                value={modalTrackCode}
                onChange={(e) => setModalTrackCode(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit code"
                className="w-full text-center text-3xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-2xl py-3 text-slate-900 dark:text-slate-100 tracking-[0.3em] outline-none transition-all shadow-inner"
              />

              <button
                type="submit"
                disabled={modalTrackCode.length !== 4}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 disabled:opacity-40 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Check Live Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
