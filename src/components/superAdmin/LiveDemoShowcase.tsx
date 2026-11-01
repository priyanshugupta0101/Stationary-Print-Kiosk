import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Store,
  Play,
  Sparkles,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Printer,
  Clock,
  ArrowRight,
  Shield,
  FileText,
  Volume2,
  DollarSign,
} from 'lucide-react';
import { ShopTenant, PrintJob } from '../../types';

interface LiveDemoShowcaseProps {
  shops: ShopTenant[];
  activeShop: ShopTenant;
  onSelectShop: (shop: ShopTenant) => void;
  onLaunchCustomerView: (shopSlug: string) => void;
  onLaunchOwnerView: (shopSlug: string) => void;
}

export const LiveDemoShowcase: React.FC<LiveDemoShowcaseProps> = ({
  shops,
  activeShop,
  onSelectShop,
  onLaunchCustomerView,
  onLaunchOwnerView,
}) => {
  const [demoJobs, setDemoJobs] = useState<PrintJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccessMessage, setSeedSuccessMessage] = useState<string | null>(null);

  // Simulated Customer form state inside demo mobile frame
  const [custName, setCustName] = useState('Ananya Sen (Student)');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(2);
  const [pages, setPages] = useState(12);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState<string | null>(null);

  const fetchShopJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/jobs?shop=${activeShop.slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setDemoJobs(data.jobs);
        }
      }
    } catch (e) {
      console.warn('Error fetching demo jobs:', e);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchShopJobs();
  }, [activeShop.slug]);

  const handleSeedOrders = async () => {
    setSeeding(true);
    setSeedSuccessMessage(null);
    try {
      const res = await fetch(`/api/super-admin/shops/${activeShop.slug}/seed-demo`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeedSuccessMessage(`Generated ${data.jobs?.length || 3} realistic orders!`);
        fetchShopJobs();
        setTimeout(() => setSeedSuccessMessage(null), 3000);
      }
    } catch (e) {
      console.warn('Error seeding orders:', e);
    } finally {
      setSeeding(false);
    }
  };

  // Simulate instant customer submission inside the demo frame
  const handleSimulateCustomerOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTest(true);
    setLastGeneratedOtp(null);

    const formData = new FormData();
    // Create a tiny simulated text/pdf file
    const sampleBlob = new Blob(
      [`Sample project print document for ${activeShop.name}`],
      { type: 'application/pdf' }
    );
    formData.append('files', sampleBlob, `${custName.split(' ')[0]}_Assignment.pdf`);

    const printSettings = {
      copies,
      colorMode,
      paperSize: 'A4',
      duplex: 'double',
      binding: 'staple',
      estimatedPagesPerDoc: pages,
      notes: 'Demo test order via Showcase Simulator',
    };

    formData.append('settings', JSON.stringify(printSettings));
    formData.append('customerName', custName);
    formData.append('customerPhone', '+91 98765 00000');

    try {
      const res = await fetch(`/api/upload?shop=${activeShop.slug}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastGeneratedOtp(data.otp);
        fetchShopJobs();
      }
    } catch (err) {
      console.warn('Test submission error:', err);
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleQuickStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchShopJobs();
    } catch (e) {
      console.warn('Status change error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Interactive Sales Pitch & Working Simulator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Live Customer & Shopkeeper Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Demonstrate the full end-to-end workflow to prospective stationery & Xerox shop owners.
            Show them how student uploads appear instantly on their counter screen!
          </p>
        </div>

        {/* Shop Selector & Seed Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-indigo-200 mb-1">
              Active Shop System
            </label>
            <select
              value={activeShop.slug}
              onChange={(e) => {
                const s = shops.find((sh) => sh.slug === e.target.value);
                if (s) onSelectShop(s);
              }}
              className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white outline-none cursor-pointer"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.slug} className="bg-slate-900 text-white">
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSeedOrders}
              disabled={seeding}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{seeding ? 'Injecting Orders...' : 'Seed 3 Demo Orders'}</span>
            </button>

            <button
              type="button"
              onClick={fetchShopJobs}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loadingJobs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {seedSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedSuccessMessage}</span>
        </div>
      )}

      {/* Quick 1-Click Launchers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onLaunchCustomerView(activeShop.slug)}
          className="p-4 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                Launch Full Customer Upload Portal
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                Experience what students & customers see when scanning {activeShop.name}'s QR
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onLaunchOwnerView(activeShop.slug)}
          className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                Launch Shop Owner Counter Desk
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Unlock counter desk with PIN {activeShop.settings.ownerPin || 'Assigned PIN'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* DUAL-SCREEN SIDE-BY-SIDE SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Customer Phone Simulation (4 cols on desktop) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-4 sm:p-5 flex flex-col transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Customer Mobile Kiosk
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {activeShop.name}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Scanned via QR
            </span>
          </div>

          {/* Mini Interactive Upload Form */}
          <form onSubmit={handleSimulateCustomerOrder} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Color Mode</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setColorMode('bw')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      colorMode === 'bw'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    B&W
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      colorMode === 'color'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Color
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Copies</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Pages per Doc</label>
              <input
                type="number"
                min="1"
                max="100"
                value={pages}
                onChange={(e) => setPages(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={submittingTest}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submittingTest ? 'Uploading & Generating Code...' : 'Simulate Customer Submit'}</span>
            </button>
          </form>

          {/* Generated Code Display */}
          {lastGeneratedOtp && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 rounded-2xl text-center animate-in zoom-in-95">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                Pickup Token Generated!
              </span>
              <div className="text-3xl font-black tracking-widest text-slate-950 dark:text-slate-100 my-1 font-mono">
                {lastGeneratedOtp}
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                ⚡ Check the right screen: It is now live in the Shopkeeper's Counter Desk!
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Shopkeeper Counter Screen (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-4 sm:p-5 text-white flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Shopkeeper Live Counter Desk
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeShop.name} • {demoJobs.length} Orders in Queue
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400">Live Listening</span>
            </div>
          </div>

          {/* Active Jobs in Counter Desk */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {demoJobs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No active print orders yet.</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  Click "Seed 3 Demo Orders" or simulate a customer order on the left!
                </p>
              </div>
            ) : (
              demoJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-amber-200">TOKEN</span>
                      <span className="text-base font-black font-mono tracking-tight text-amber-300">
                        {job.otp}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white">{job.customerName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            job.settings.colorMode === 'color'
                              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {job.settings.colorMode === 'color' ? 'Color' : 'B&W'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {job.settings.copies} {job.settings.copies > 1 ? 'copies' : 'copy'} • {job.pricing?.totalPages || 1} pgs
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                        {job.files?.[0]?.originalName || 'Document.pdf'}
                      </p>

                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-400">
                          {job.pricing?.currency || '₹'}{job.pricing?.totalPrice || 0}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            job.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {job.paymentStatus === 'paid' ? '✓ PAID ONLINE' : '• UNPAID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Counter Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {job.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(job.id, 'printed')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        1-Click Print
                      </button>
                    )}
                    {job.status === 'printed' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(job.id, 'collected')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Mark Collected
                      </button>
                    )}
                    {job.status === 'collected' && (
                      <span className="text-[11px] text-slate-500 font-bold">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
