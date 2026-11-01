/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppNavView } from './components/Header';
import { CustomerUploadView } from './components/CustomerUploadView';
import { CustomerCodeResult } from './components/CustomerCodeResult';
import { DirectSendView } from './components/DirectSendView';
import { OwnerNavHeader } from './components/OwnerNavHeader';
import { OwnerDeskView } from './components/OwnerDeskView';
import { OwnerHistoryView } from './components/OwnerHistoryView';
import { OwnerAnalyticsView } from './components/OwnerAnalyticsView';
import { OwnerSettingsView } from './components/OwnerSettingsView';
import { SuperAdminView } from './components/superAdmin/SuperAdminView';
import { ServiceSuspendedView } from './components/ServiceSuspendedView';
import { TrialExpiredView } from './components/TrialExpiredView';
import { ShopSettings, PrintJob } from './types';
import { saveRecentCustomerJob } from './utils/customerJobsStorage';
import { soundEffects } from './utils/soundEffects';
import { Lock, AlertCircle, X, ArrowRight, Store, ShieldCheck, AlertOctagon, Clock, Volume2, VolumeX, Sparkles, Zap } from 'lucide-react';

export default function App() {
  // Support active shop slug (from ?shop= query param or default empty)
  const initialShopSlug = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('shop') || ''
    : '';

  const [activeShopSlug, setActiveShopSlug] = useState<string>(initialShopSlug);
  const [currentView, setCurrentView] = useState<AppNavView>('upload');
  const [customerStage, setCustomerStage] = useState<'upload' | 'code'>('upload');
  const [activeCustomerJob, setActiveCustomerJob] = useState<PrintJob | null>(null);

  // Owner state: dedicated pages for different tasks
  const [ownerSubTab, setOwnerSubTab] = useState<'desk' | 'history' | 'analytics' | 'settings'>('desk');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(false);

  // Default Clean Shop Settings for COPY platform
  const DEFAULT_INITIAL_SETTINGS: ShopSettings = {
    shopName: 'COPY',
    tagline: 'High-Speed Document Printing & Counter Desk',
    currency: '₹',
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    a3Multiplier: 2,
    doubleSidedDiscountPercent: 10,
    stapleFee: 5,
    spiralFee: 30,
    ownerPin: '',
    contactPhone: '',
    contactEmail: '',
    whatsappNumber: '',
    shopAddress: '',
    enableOnlinePayments: false,
    upiId: '',
    upiPayeeName: 'COPY',
    hasPin: false,
  };

  // Shop Settings & Queue Count
  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_INITIAL_SETTINGS);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Dark / Light Theme Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('copy_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Sound FX State
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundEffects.isMuted());

  const handleToggleSound = () => {
    const nextMuted = soundEffects.toggleMute();
    setIsSoundMuted(nextMuted);
    if (!nextMuted) {
      soundEffects.playOptionTick();
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      try {
        localStorage.setItem('copy_theme', theme);
      } catch (e) {}
    }
  }, [theme]);

  const handleToggleTheme = () => {
    // Add temporary transition class for smooth color morphing across all DOM elements
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transition');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 450);

      if ('startViewTransition' in document) {
        // Modern browser smooth root view transition
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
        });
        return;
      }
    }
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load shop settings from server for activeShopSlug with local cache fallback
  const fetchSettings = async (targetSlug = activeShopSlug) => {
    try {
      const url = targetSlug ? `/api/settings?shop=${encodeURIComponent(targetSlug)}` : '/api/settings';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Sanitize any lingering legacy branding
        if (data.shopName && data.shopName.toLowerCase().includes('royal')) {
          data.shopName = 'COPY';
        }
        setShopSettings(data);
        if (data.shopSlug && !targetSlug) {
          setActiveShopSlug(data.shopSlug);
        }
        try {
          localStorage.setItem(`copy_print_shop_settings_${targetSlug || 'default'}`, JSON.stringify(data));
        } catch (e) {}
        return;
      }
    } catch (e) {
      console.warn('Could not load settings from server:', e);
    }

    // LocalStorage fallback for offline / published environments
    try {
      const cached =
        localStorage.getItem(`copy_print_shop_settings_${targetSlug || 'default'}`) ||
        localStorage.getItem('copy_print_shop_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.shopName && parsed.shopName.toLowerCase().includes('royal')) {
          parsed.shopName = 'COPY';
        }
        setShopSettings(parsed);
      }
    } catch (e) {}
  };

  const fetchPendingCount = async (targetSlug = activeShopSlug) => {
    try {
      const url = targetSlug
        ? `/api/jobs?status=pending&shop=${encodeURIComponent(targetSlug)}`
        : '/api/jobs?status=pending';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setPendingQueueCount(data.jobs.length);
        }
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    // Purge any stale legacy cached items from older sessions
    if (typeof window !== 'undefined') {
      try {
        const legacyKeys = [
          'royal_print_shop_settings',
          'royal_print_shop_settings_default',
          'royal_print_recent_jobs',
          'print_shop_theme',
        ];
        legacyKeys.forEach((k) => localStorage.removeItem(k));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('royal') || key.includes('stationery_print'))) {
            localStorage.removeItem(key);
          }
        }
        const currentCached = localStorage.getItem('copy_print_shop_settings');
        if (currentCached && currentCached.includes('Royal')) {
          localStorage.removeItem('copy_print_shop_settings');
        }
      } catch (e) {}
    }

    fetchSettings(activeShopSlug);
    fetchPendingCount(activeShopSlug);
    const interval = setInterval(() => fetchPendingCount(activeShopSlug), 8000);

    // Support query parameters for direct links
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlShop = params.get('shop');
      if (urlShop && urlShop !== activeShopSlug) {
        setActiveShopSlug(urlShop);
      }

      const mode = params.get('mode');
      if (mode === 'super-admin') {
        setCurrentView('super-admin');
      } else if (mode === 'owner') {
        setShowPinModal(true);
      } else if (mode === 'direct-send' || mode === 'whatsapp' || mode === 'email') {
        setCurrentView('direct-send');
      } else if (mode === 'upload' || mode === 'customer') {
        setCurrentView('upload');
      }
    }

    return () => clearInterval(interval);
  }, [activeShopSlug]);

  const handleSelectView = (view: AppNavView) => {
    if (view === 'upload') {
      setCustomerStage('upload');
    }
    if (view === 'owner') {
      if (shopSettings?.status === 'suspended' || shopSettings?.isSuspended) {
        setShowPinModal(false);
        setCurrentView('owner');
        return;
      }
      if (!isOwnerUnlocked) {
        setShowPinModal(true);
        setPinError(null);
        return;
      }
    }
    setCurrentView(view);
  };

  const handleOwnerLogout = () => {
    setIsOwnerUnlocked(false);
    setCurrentView('upload');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('mode')) {
        url.searchParams.delete('mode');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const cleanPin = pinInput.trim();
    if (!cleanPin) return;

    try {
      const res = await fetch(`/api/settings/verify-pin${activeShopSlug ? `?shop=${encodeURIComponent(activeShopSlug)}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-slug': activeShopSlug,
        },
        body: JSON.stringify({ pin: cleanPin, shopSlug: activeShopSlug }),
      });

      const data = await res.json();

      // Check if user entered Super Admin numeric master PIN 145214 or server returned Super Admin redirect
      if (data.isSuperAdmin || data.redirect === 'super-admin' || cleanPin === '145214' || cleanPin === 'PRINT145214') {
        setShowPinModal(false);
        setPinInput('');
        setPinError(null);
        setIsSuperAdminAuthenticated(true);
        setCurrentView('super-admin');
        return;
      }

      // Check if 4-day or 7-day free trial has auto-expired
      if (data.isTrialExpired || data.shopStatus === 'trial_expired') {
        setIsOwnerUnlocked(false);
        setShowPinModal(false);
        setCurrentView('owner');
        if (shopSettings) {
          setShopSettings({
            ...shopSettings,
            isTrial: true,
            isTrialExpired: true,
            trialDurationDays: data.trialDurationDays || shopSettings.trialDurationDays || 7,
            daysLeftInTrial: 0,
          });
        }
        return;
      }

      // Check if service was stopped/disabled by Super Admin
      if (res.status === 403 || data.isSuspended || data.shopStatus === 'suspended') {
        setIsOwnerUnlocked(false);
        setShowPinModal(false);
        setCurrentView('owner');
        if (shopSettings) {
          setShopSettings({
            ...shopSettings,
            status: 'suspended',
            isSuspended: true,
            suspensionReason:
              data.suspensionReason || data.error || 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE',
          });
        }
        return;
      }

      if (res.ok && data.success) {
        setIsOwnerUnlocked(true);
        setShowPinModal(false);
        setCurrentView('owner');
        setPinInput('');

        const effectiveSlug = data.shopSlug || data.settings?.shopSlug || activeShopSlug;
        if (effectiveSlug) {
          setActiveShopSlug(effectiveSlug);
          if (typeof window !== 'undefined' && window.history?.pushState) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('shop', effectiveSlug);
            window.history.pushState({}, '', newUrl.toString());
          }
          fetchPendingCount(effectiveSlug);
        }

        if (data.settings) {
          setShopSettings(data.settings);
          try {
            localStorage.setItem(`copy_print_shop_settings_${effectiveSlug || 'default'}`, JSON.stringify(data.settings));
          } catch (e) {}
        }
        return;
      }

      // Server returned error
      setPinError(
        data.error ||
        `Incorrect Operator PIN. Please enter your authentic assigned shop PIN.`
      );
    } catch (err: any) {
      if (cleanPin === '145214' || cleanPin === 'PRINT145214') {
        setShowPinModal(false);
        setPinInput('');
        setPinError(null);
        setIsSuperAdminAuthenticated(true);
        setCurrentView('super-admin');
        return;
      }

      // Offline fallback: check cached settings
      let cachedPin: string | null = null;
      try {
        const cached =
          localStorage.getItem(`copy_print_shop_settings_${activeShopSlug}`) ||
          localStorage.getItem('copy_print_shop_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.ownerPin) {
            cachedPin = String(parsed.ownerPin).trim();
          }
        }
      } catch (e) {}

      if (cachedPin && cleanPin === cachedPin) {
        setIsOwnerUnlocked(true);
        setShowPinModal(false);
        setCurrentView('owner');
        setPinInput('');
      } else {
        setPinError('Incorrect Operator PIN. Please enter your authentic assigned shop PIN.');
      }
    }
  };

  const handleJobCreated = (job: PrintJob) => {
    saveRecentCustomerJob(job);
    setActiveCustomerJob(job);
    setCustomerStage('code');
    fetchPendingCount();
  };

  const handleLookupCode = async (otpCode: string) => {
    try {
      const res = await fetch(`/api/jobs/lookup/${otpCode}`);
      const data = await res.json();
      if (res.ok && data.success && data.job) {
        saveRecentCustomerJob(data.job);
        setActiveCustomerJob(data.job);
        setCustomerStage('code');
      } else {
        setToastMessage({
          text: `No print job found with code ${otpCode}. Please verify your 4-digit code.`,
          type: 'error',
        });
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (e) {
      setToastMessage({
        text: 'Error searching for code. Please verify network connection.',
        type: 'error',
      });
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:bg-yellow-400/30 dark:selection:text-yellow-200 transition-colors duration-200">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        shopSettings={shopSettings}
        pendingCount={pendingQueueCount}
        onLogout={handleOwnerLogout}
        onQuickTrack={handleLookupCode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'super-admin' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <SuperAdminView
              initialAuthenticated={isSuperAdminAuthenticated}
              onNavigateToCustomer={(slug) => {
                setActiveShopSlug(slug);
                setCurrentView('upload');
                setCustomerStage('upload');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('shop', slug);
                  url.searchParams.delete('mode');
                  window.history.replaceState({}, '', url.pathname + url.search);
                }
              }}
              onNavigateToOwner={(slug) => {
                setActiveShopSlug(slug);
                setIsOwnerUnlocked(true);
                setCurrentView('owner');
                setOwnerSubTab('desk');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('shop', slug);
                  url.searchParams.set('mode', 'owner');
                  window.history.replaceState({}, '', url.pathname + url.search);
                }
              }}
            />
          </div>
        ) : currentView === 'upload' ? (
          customerStage === 'upload' ? (
            <CustomerUploadView
              shopSettings={shopSettings}
              onJobCreated={handleJobCreated}
              onLookupCode={handleLookupCode}
              onNavigateToDirectSend={() => setCurrentView('direct-send')}
            />
          ) : (
            activeCustomerJob && (
              <CustomerCodeResult
                job={activeCustomerJob}
                shopSettings={shopSettings}
                onReset={() => {
                  setActiveCustomerJob(null);
                  setCustomerStage('upload');
                }}
              />
            )
          )
        ) : currentView === 'direct-send' ? (
          <DirectSendView
            shopSettings={shopSettings}
            onBackToUpload={() => {
              setCurrentView('upload');
              setCustomerStage('upload');
            }}
          />
        ) : currentView === 'owner' && shopSettings?.isTrialExpired ? (
          <TrialExpiredView
            shopSettings={shopSettings}
            shopSlug={activeShopSlug}
            onBackToCustomer={() => {
              setCurrentView('upload');
              setCustomerStage('upload');
            }}
            onOpenSuperAdmin={() => setCurrentView('super-admin')}
          />
        ) : currentView === 'owner' && (shopSettings?.status === 'suspended' || shopSettings?.isSuspended) ? (
          <ServiceSuspendedView
            shopSettings={shopSettings}
            shopSlug={activeShopSlug}
            onRefresh={() => fetchSettings(activeShopSlug)}
            onBackToCustomer={() => {
              setCurrentView('upload');
              setCustomerStage('upload');
            }}
            onOpenSuperAdmin={() => setCurrentView('super-admin')}
          />
        ) : (
          /* Owner Portal: Distinct Pages for Each Task */
          <div>
            <OwnerNavHeader
              activeTab={ownerSubTab}
              onSelectTab={setOwnerSubTab}
              pendingCount={pendingQueueCount}
              onLogout={handleOwnerLogout}
            />

            {/* Task 1: Live Counter Desk */}
            {ownerSubTab === 'desk' && (
              <OwnerDeskView
                shopSettings={shopSettings}
                onRefreshSettings={fetchSettings}
              />
            )}

            {/* Task 2: Order History & Archive */}
            {ownerSubTab === 'history' && (
              <OwnerHistoryView shopSettings={shopSettings} />
            )}

            {/* Task 3: Income & Financial Analytics */}
            {ownerSubTab === 'analytics' && (
              <OwnerAnalyticsView shopSettings={shopSettings} />
            )}

            {/* Task 4: Shop Pricing & SQLite DB Settings */}
            {ownerSubTab === 'settings' && (
              <OwnerSettingsView
                shopSettings={shopSettings}
                onSettingsUpdated={(updated) => setShopSettings(updated)}
              />
            )}
          </div>
        )}
      </main>

      {/* Modern Owner PIN Authentication Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center text-slate-900 dark:text-slate-100 transition-colors">
            <button
              type="button"
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-yellow-400 block mb-1">
              COPY Desk Terminal
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              {activeShopSlug && shopSettings?.shopName && shopSettings.shopName !== 'COPY'
                ? `${shopSettings.shopName} Login`
                : 'Shop Operator Login'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Enter your shop's assigned PIN to unlock your counter console, view customer print orders, and manage desk operations.
            </p>

            {shopSettings?.isTrialExpired && (
              <div className="p-3 mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs text-left shadow-xs">
                <div className="flex items-center space-x-1.5 font-black uppercase text-amber-900 dark:text-amber-300 mb-1">
                  <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>YOUR FREE TRIAL SESSION IS EXPIRED</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  Your 7-day free trial session is expired. If you love the service, contact with the admin to activate your subscription!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setCurrentView('owner');
                  }}
                  className="mt-2.5 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Contact Super Admin
                </button>
              </div>
            )}

            {(shopSettings?.status === 'suspended' || shopSettings?.isSuspended) && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 text-xs text-left shadow-xs">
                <div className="flex items-center space-x-1.5 font-black uppercase text-rose-900 dark:text-rose-300 mb-1">
                  <AlertOctagon className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                  <span>THE SUPER ADMIN HAS STOPPED YOUR SERVICE</span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                  This shop is currently deactivated. Logging into the counter desk is prohibited until restored by Super Admin.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setCurrentView('owner');
                  }}
                  className="mt-2.5 w-full py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  View Service Stopped Notice
                </button>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                id="owner-pin-modal-input"
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full text-center text-3xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 rounded-2xl py-3 text-slate-900 dark:text-slate-100 tracking-[0.3em] outline-none transition-all shadow-inner"
              />

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium text-left space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <span className="leading-snug">{pinError}</span>
                  </div>
                  {pinError.includes('Super Admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        setCurrentView('super-admin');
                      }}
                      className="w-full mt-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Open Super Admin Panel
                    </button>
                  )}
                </div>
              )}

              <button
                id="unlock-owner-desk-btn"
                type="submit"
                disabled={pinInput.length < 4 || pinInput.length > 6}
                className="w-full py-3.5 rounded-2xl bg-slate-950 dark:bg-yellow-400 hover:bg-slate-900 dark:hover:bg-yellow-300 disabled:opacity-40 text-white dark:text-slate-950 font-bold text-xs shadow-md shadow-slate-950/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Unlock Counter Console</span>
                <ArrowRight className="w-4 h-4 text-indigo-400 dark:text-slate-950" />
              </button>

              <div className="pt-1 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Protected operator terminal • Use assigned shop PIN</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Minimalist Studio Footer with Store Owner Access */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className={`font-bold transition-all ${theme === 'dark' ? 'brand-neon-glow' : 'text-slate-800 dark:text-yellow-400'}`}>
              {shopSettings?.shopName || 'COPY'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              High-Speed Document Hub
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <button
              id="footer-store-owner-btn"
              type="button"
              onClick={() => {
                setPinError(null);
                setPinInput('');
                setShowPinModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer font-bold border border-slate-200 dark:border-slate-700"
              title="Store Owner Login (Desk Console & Super Admin)"
            >
              <Store className="w-3.5 h-3.5 text-indigo-500 dark:text-yellow-400" />
              <span>Store Owner</span>
            </button>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Live System Active</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-auto px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-xs font-bold ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                : 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
