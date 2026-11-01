import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  User,
  RefreshCw,
  Eye,
  Crown,
} from 'lucide-react';
import { PrintJob, ShopSettings, UploadedFileMeta } from '../types';
import { triggerSystemPrint } from '../utils/printHelper';
import { FileViewerModal } from './FileViewerModal';

interface OwnerHistoryViewProps {
  shopSettings: ShopSettings | null;
}

export const OwnerHistoryView: React.FC<OwnerHistoryViewProps> = ({ shopSettings }) => {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let url = `/api/jobs?`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      const shopSlugParam = shopSettings?.shopSlug || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : '') || '';
      if (shopSlugParam) url += `shop=${encodeURIComponent(shopSlugParam)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setJobs(data.jobs);
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleTogglePayment = async (jobId: string, currentStatus: string) => {
    const next = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: next }),
      });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to update payment:', err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this order and its uploaded documents from the database?')) {
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const currency = shopSettings?.currency || '₹';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs mb-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Order History &amp; Archives
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Search past customer print orders, verify payments, and reprint documents from the database
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search OTP, name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </form>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-initial bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Waiting (Pending)</option>
                <option value="received">In Progress</option>
                <option value="printed">Printed</option>
                <option value="collected">Delivered</option>
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Refresh order history"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600 dark:text-yellow-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs overflow-hidden transition-colors">
        {isLoading && jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-semibold">Loading database records...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">No Orders Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try clearing search filters.`
                : 'Customer orders and pickup codes will be archived here automatically.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards (<md) */}
            <div className="block md:hidden space-y-3.5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="font-black text-sm text-slate-900 dark:text-yellow-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-xl shadow-2xs tracking-wider">
                        {job.otp}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                          {job.customerName || 'Customer'}
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 block">
                          {new Date(job.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          • {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                        {currency}{job.pricing.totalPrice.toFixed(2)}
                      </span>
                      <div className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(job.id, job.paymentStatus)}
                          className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer ${
                            job.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {job.paymentStatus === 'paid' ? 'PAID ✓' : 'UNPAID'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                        job.settings.colorMode === 'color'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {job.settings.colorMode === 'color' ? 'Color' : 'B/W'}
                    </span>
                    <span className="truncate">
                      {job.settings.copies} set{job.settings.copies > 1 ? 's' : ''} • {job.settings.paperSize} • {job.settings.orientation === 'landscape' ? 'Horizontal' : 'Vertical'} • {job.settings.scale === 'original' ? 'Original' : 'Fit'} • {job.files.length} doc{job.files.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {job.notes && (
                    <p className="text-[11px] text-indigo-600 dark:text-yellow-400 italic truncate">
                      Note: {job.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${
                        job.status === 'printed'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-yellow-400 border-indigo-200 dark:border-indigo-800'
                          : job.status === 'collected'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {job.status}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {job.files.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewFile(job.files[0])}
                            className="p-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                            title="Preview first document"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                          </button>

                          <a
                            href={job.files[0].downloadUrl}
                            download={job.files[0].originalName}
                            className="p-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              triggerSystemPrint(
                                job.files[0].url,
                                job.files[0].originalName,
                                job.files[0].mimeType
                              )
                            }
                            className="p-1.5 rounded-xl bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 hover:bg-indigo-700 dark:hover:bg-yellow-300 text-white cursor-pointer font-bold"
                            title="Print document"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete from archive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Data Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 font-extrabold">
                    <th className="pb-3.5 pr-4">OTP &amp; Date</th>
                    <th className="pb-3.5 pr-4">Customer</th>
                    <th className="pb-3.5 pr-4">Specs &amp; Files</th>
                    <th className="pb-3.5 pr-4">Amount</th>
                    <th className="pb-3.5 pr-4">Status</th>
                    <th className="pb-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* OTP & Date */}
                      <td className="py-4 pr-4 align-top">
                        <div className="font-black text-sm text-slate-900 dark:text-yellow-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl inline-block shadow-2xs tracking-wider">
                          {job.otp}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-1">
                          {new Date(job.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          •{' '}
                          {new Date(job.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 pr-4 align-top">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{job.customerName || 'Customer'}</div>
                        {job.customerPhone && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-400">{job.customerPhone}</div>
                        )}
                        {job.notes && (
                          <div className="text-[11px] text-indigo-600 dark:text-yellow-400 italic truncate max-w-[180px]">
                            Note: {job.notes}
                          </div>
                        )}
                      </td>

                      {/* Specs & Files */}
                      <td className="py-4 pr-4 align-top">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              job.settings.colorMode === 'color'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {job.settings.colorMode === 'color' ? 'Color' : 'B/W'}
                          </span>
                          <span>
                            {job.settings.copies} copy{job.settings.copies > 1 ? 's' : ''} • {job.settings.paperSize}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-1 truncate max-w-[220px]">
                          {job.files.length} doc{job.files.length > 1 ? 's' : ''}:{' '}
                          {job.files.map((f) => f.originalName).join(', ')}
                        </div>
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-4 pr-4 align-top">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          {currency}{job.pricing.totalPrice.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(job.id, job.paymentStatus)}
                          className={`mt-1 inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                            job.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                          }`}
                          title="Click to toggle paid / unpaid"
                        >
                          {job.paymentStatus === 'paid' ? 'PAID ✓' : 'UNPAID'}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 pr-4 align-top">
                        <span
                          className={`inline-flex items-center text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${
                            job.status === 'printed'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-yellow-400 border-indigo-200 dark:border-indigo-800'
                              : job.status === 'collected'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right align-top space-x-1.5">
                        {job.files.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewFile(job.files[0])}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Preview first document"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
                            </button>

                            <a
                              href={job.files[0].downloadUrl}
                              download={job.files[0].originalName}
                              className="inline-block p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                triggerSystemPrint(
                                  job.files[0].url,
                                  job.files[0].originalName,
                                  job.files[0].mimeType
                                )
                              }
                              className="p-1.5 rounded-xl bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 hover:bg-indigo-700 dark:hover:bg-yellow-300 text-white font-bold transition-colors cursor-pointer"
                              title="Print document"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete from archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {previewFile && (
        <FileViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
};
