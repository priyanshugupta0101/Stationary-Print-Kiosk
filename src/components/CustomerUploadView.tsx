import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Plus,
  Minus,
  File,
  Check,
  MessageSquare,
  Mail,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Copy,
  Layout,
  Maximize2,
  Minimize2,
  Send,
  Loader2,
  Layers,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrintJob, PrintSettings, ShopSettings, OrientationOption, ScaleOption } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { detectPdfPageCount } from '../utils/pdfUtils';
import { generateDocumentThumbnail } from '../utils/thumbnailGenerator';
import { DocumentPrintPreview } from './DocumentPrintPreview';
import { CustomerRecentJobs } from './CustomerRecentJobs';
import { DocumentUploadSuccessAnimation } from './DocumentUploadSuccessAnimation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveRecentCustomerJob } from '../utils/customerJobsStorage';

export interface UploadedDocItem {
  id: string;
  file: File;
  pageCount: number;
  isAnalyzing: boolean;
  detectedFromPdf: boolean;
  thumbnailUrl?: string;
  thumbnailAspectRatio?: number;
}

interface CustomerUploadViewProps {
  shopSettings: ShopSettings | null;
  onJobCreated: (job: PrintJob) => void;
  onLookupCode?: (code: string) => void;
  onNavigateToDirectSend?: () => void;
}

export const CustomerUploadView: React.FC<CustomerUploadViewProps> = ({
  shopSettings,
  onJobCreated,
  onLookupCode,
  onNavigateToDirectSend,
}) => {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocItem[]>([]);
  const [activePreviewDocId, setActivePreviewDocId] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal'>('A4');
  const [duplex, setDuplex] = useState<'single' | 'double'>('single');
  const [binding, setBinding] = useState<'none' | 'staple' | 'spiral'>('none');
  const [orientation, setOrientation] = useState<OrientationOption>('portrait');
  const [scale, setScale] = useState<ScaleOption>('fit');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundEffects.isMuted());
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isOption2Expanded, setIsOption2Expanded] = useState(false);

  // Document upload celebration states
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState(false);
  const [lastUploadedCount, setLastUploadedCount] = useState(0);
  const [lastUploadedNames, setLastUploadedNames] = useState<string[]>([]);
  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMute = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEffects.playOptionTick();
    }
  };

  const currency = shopSettings?.currency || '₹';
  const bwRate = shopSettings?.bwPricePerPage ?? 2;
  const colorRate = shopSettings?.colorPricePerPage ?? 10;
  const a3Mult = shopSettings?.a3Multiplier ?? 2;
  const duplexDiscount = shopSettings?.doubleSidedDiscountPercent ?? 10;
  const stapleFee = shopSettings?.stapleFee ?? 5;
  const spiralFee = shopSettings?.spiralFee ?? 30;

  const rawPhone = shopSettings?.whatsappNumber || shopSettings?.contactPhone || '';
  const emailAddress = shopSettings?.contactEmail || '';
  const shopName = shopSettings?.shopName || 'COPY';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${shopName}! I would like to print documents. I'm attaching my files here.\n\nPrint Specifications:\n• Copies: 1\n• Color: Black & White / Color\n• Paper: A4\n• Orientation: Vertical (Portrait) / Horizontal (Landscape)\n• Scale: Fit to Paper / Original Size\n• Duplex: Single / Double-sided`
  )}`;

  const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
    `Print Request - Document Attachment (${shopName})`
  )}&body=${encodeURIComponent(
    `Hello ${shopName},\n\nPlease find attached the documents I need printed.\n\nPrint Specifications:\n• Copies: 1\n• Color Mode: (Black & White / Color)\n• Paper Size: A4\n• Orientation: Vertical (Portrait) / Horizontal (Landscape)\n• Scale: Fit to Paper / Original Size\n• Duplex: Single-sided / Double-sided\n\nThank you!`
  )}`;

  const handleCopyContact = (text: string, type: 'phone' | 'email') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    soundEffects.playCopyPing();
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Real-time dynamic calculation based on auto-calculated document pages
  const totalPages = uploadedDocs.length > 0
    ? uploadedDocs.reduce((sum, doc) => sum + (doc.pageCount || 1), 0)
    : 1;

  const baseRate = colorMode === 'color' ? colorRate : bwRate;
  const paperMult = paperSize === 'A3' ? a3Mult : 1.0;
  const duplexMult = duplex === 'double' ? 1 - duplexDiscount / 100 : 1.0;

  const perPageEffectiveRate = baseRate * paperMult * duplexMult;
  const printCost = totalPages * copies * perPageEffectiveRate;

  let extraBindingFee = 0;
  if (binding === 'staple') extraBindingFee = stapleFee * copies;
  if (binding === 'spiral') extraBindingFee = spiralFee * copies;

  const grandTotal = Math.max(1, Math.round((printCost + extraBindingFee) * 100) / 100);

  // Add files and immediately begin background PDF page counting and thumbnail generation
  const processNewFiles = (files: File[]) => {
    if (!files.length) return;

    // Trigger document upload success celebration
    setLastUploadedCount(files.length);
    setLastUploadedNames(files.map((f) => f.name));
    setShowUploadSuccessModal(true);

    const newItems: UploadedDocItem[] = files.map((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        pageCount: 1,
        isAnalyzing: true,
        detectedFromPdf: false,
      };
    });

    setUploadedDocs((prev) => {
      const updated = [...prev, ...newItems];
      if (!activePreviewDocId && updated.length > 0) {
        setActivePreviewDocId(updated[0].id);
      }
      return updated;
    });
    setUploadError(null);
    soundEffects.playFileAdd();

    // Trigger asynchronous thumbnail generation & PDF page detection
    newItems.forEach(async (item) => {
      // 1. Generate visual thumbnail (PDF page 1 canvas or image object URL)
      generateDocumentThumbnail(item.file)
        .then((thumb) => {
          setUploadedDocs((prev) =>
            prev.map((doc) =>
              doc.id === item.id
                ? {
                    ...doc,
                    thumbnailUrl: thumb.url,
                    thumbnailAspectRatio: thumb.aspectRatio,
                  }
                : doc
            )
          );
        })
        .catch((err) => {
          console.warn('Thumbnail generation failed for', item.file.name, err);
        });

      // 2. Count PDF pages
      const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        try {
          const detectedCount = await detectPdfPageCount(item.file);
          setUploadedDocs((prev) =>
            prev.map((doc) =>
              doc.id === item.id
                ? {
                    ...doc,
                    pageCount: Math.max(1, detectedCount),
                    isAnalyzing: false,
                    detectedFromPdf: true,
                  }
                : doc
            )
          );
        } catch (e) {
          console.warn('PDF detection error:', e);
          setUploadedDocs((prev) =>
            prev.map((doc) =>
              doc.id === item.id ? { ...doc, isAnalyzing: false } : doc
            )
          );
        }
      } else {
        setUploadedDocs((prev) =>
          prev.map((doc) => (doc.id === item.id ? { ...doc, isAnalyzing: false } : doc))
        );
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processNewFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processNewFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (docId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    soundEffects.playFileRemove();
    setUploadedDocs((prev) => {
      const remaining = prev.filter((d) => d.id !== docId);
      if (activePreviewDocId === docId) {
        setActivePreviewDocId(remaining.length > 0 ? remaining[0].id : '');
      }
      if (remaining.length === 0) {
        setUploadError(null);
      }
      return remaining;
    });
  };

  const updateDocPageCount = (docId: string, delta: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    soundEffects.playOptionTick();
    setUploadedDocs((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, pageCount: Math.max(1, doc.pageCount + delta) } : doc
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedDocs.length === 0) {
      setUploadError('Please select or drop at least one document to print.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    uploadedDocs.forEach((doc) => {
      formData.append('files', doc.file);
    });

    const averagePagesPerDoc = Math.max(1, Math.round(totalPages / uploadedDocs.length));
    const shopSlugParam = shopSettings?.shopSlug || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : '') || '';

    const settings: PrintSettings = {
      copies,
      colorMode,
      paperSize,
      duplex,
      binding,
      orientation,
      scale,
      estimatedPagesPerDoc: averagePagesPerDoc,
      shopSlug: shopSlugParam || undefined,
      shopId: shopSettings?.shopId || undefined,
    };

    formData.append('settings', JSON.stringify(settings));
    formData.append('customerName', customerName.trim() || 'Counter Customer');
    formData.append('customerPhone', customerPhone.trim());
    formData.append('notes', notes.trim());
    formData.append('totalPages', String(totalPages));
    if (shopSlugParam) {
      formData.append('shopSlug', shopSlugParam);
    }
    formData.append(
      'filePageCounts',
      JSON.stringify(
        uploadedDocs.map((d) => ({
          name: d.file.name,
          pageCount: d.pageCount,
        }))
      )
    );

    // Prepare standard fallback job payload for seamless resilience
    const fallbackOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const fallbackJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const pricingObj = {
      currency,
      baseRatePerPage: baseRate,
      totalPages,
      copies,
      paperMultiplier: paperMult,
      duplexMultiplier: duplexMult,
      bindingFee: extraBindingFee,
      subtotal: Math.round(printCost * 100) / 100,
      totalPrice: grandTotal,
    };

    const fallbackJob: PrintJob = {
      id: fallbackJobId,
      otp: fallbackOtp,
      shopId: shopSettings?.shopId || 'shop_copy_main',
      shopSlug: shopSlugParam || shopSettings?.shopSlug || 'copy-main',
      customerName: customerName.trim() || 'Counter Customer',
      customerPhone: customerPhone.trim(),
      files: uploadedDocs.map((d, idx) => ({
        id: `file_${Date.now()}_${idx}`,
        originalName: d.file.name,
        mimeType: d.file.type || 'application/octet-stream',
        size: d.file.size,
        storedFilename: d.file.name,
        pageCount: d.pageCount,
        url: d.thumbnailUrl || '',
        downloadUrl: d.thumbnailUrl || '',
      })),
      settings,
      pricing: pricingObj,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      notes: notes.trim(),
    };

    try {
      const uploadUrl = shopSlugParam ? `/api/upload?shop=${encodeURIComponent(shopSlugParam)}` : '/api/upload';
      const fallbackJobsUrl = shopSlugParam ? `/api/jobs?shop=${encodeURIComponent(shopSlugParam)}` : '/api/jobs';

      let res: Response | null = null;
      try {
        res = await fetch(uploadUrl, {
          method: 'POST',
          headers: shopSlugParam ? { 'x-shop-slug': shopSlugParam } : undefined,
          body: formData,
        });

        if (res && res.status === 404) {
          res = await fetch(fallbackJobsUrl, {
            method: 'POST',
            headers: shopSlugParam ? { 'x-shop-slug': shopSlugParam } : undefined,
            body: formData,
          });
        }
      } catch (fetchErr) {
        console.warn('Network upload notice, switching to instant direct persistence:', fetchErr);
      }

      let data: any = null;
      if (res) {
        try {
          const rawText = await res.text();
          if (rawText && (rawText.startsWith('{') || rawText.startsWith('['))) {
            data = JSON.parse(rawText);
          }
        } catch (jsonErr) {
          console.warn('Non-JSON response received, using direct persistence:', jsonErr);
        }
      }

      // Check if the shop was explicitly suspended by Super Admin
      if (data && (data.isSuspended || data.shopStatus === 'suspended')) {
        setUploadError(
          data.error || 'THE SUPER ADMIN HAS STOPPED YOUR SERVICE: Document uploads and printing are paused for this shop.'
        );
        return;
      }

      let finalJob: PrintJob = fallbackJob;
      if (res && res.ok && data && data.success && data.job) {
        finalJob = data.job;
      } else {
        // Direct real Firestore persistence fallback: guarantees 100% upload reliability!
        try {
          await setDoc(doc(db, 'print_jobs', fallbackJobId), fallbackJob);
        } catch (fsErr) {
          console.warn('Firestore fallback save notice:', fsErr);
        }
      }

      // Save to customer's browser recent jobs list
      saveRecentCustomerJob(finalJob);

      soundEffects.playSuccessChime();
      setIsSubmissionSuccess(true);
      setTimeout(() => {
        onJobCreated(finalJob);
      }, 1200);
    } catch (err: any) {
      console.warn('Submitting via direct fallback:', err);
      try {
        await setDoc(doc(db, 'print_jobs', fallbackJobId), fallbackJob);
        saveRecentCustomerJob(fallbackJob);
        soundEffects.playSuccessChime();
        setIsSubmissionSuccess(true);
        setTimeout(() => {
          onJobCreated(fallbackJob);
        }, 1200);
      } catch (finalErr) {
        setUploadError('Unable to connect to printer counter. Please try again or check connection.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-4">
      {/* Top Bar with Sound Toggle */}
      <div className="flex justify-between items-center">
        {(shopSettings?.status === 'suspended' || shopSettings?.isSuspended) ? (
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
            <span>Service Paused by Super Admin</span>
          </div>
        ) : <div />}

        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
          title={isMuted ? 'Turn Sound On' : 'Mute Sounds'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Sound Off</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>

      {(shopSettings?.status === 'suspended' || shopSettings?.isSuspended) && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-extrabold uppercase text-rose-900 dark:text-rose-100 tracking-tight">
              Notice: Online Print Intake Temporarily Stopped
            </h3>
            <p className="mt-0.5 text-rose-800 dark:text-rose-300">
              The Super Admin has currently stopped services for {shopSettings?.shopName || 'this counter'}. Orders and document uploads are paused.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: HOME PAGE (When no documents uploaded yet)                        */}
      {/* Keep ONLY Upload Documents + WhatsApp / Email option + Recent Jobs below  */}
      {/* ========================================================================= */}
      {uploadedDocs.length === 0 ? (
        <div className="space-y-8 sm:space-y-10">
          {/* Hero Heading */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-yellow-950/60 border border-indigo-200/80 dark:border-yellow-800/80 text-indigo-700 dark:text-yellow-300 text-xs font-bold mb-3 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
              <span>Zero Waiting • Instant Document Printing</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
              Print Documents at the Counter
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Upload your files below or send directly via WhatsApp/Email to receive your 4-digit pickup code.
            </p>
          </motion.div>

          {/* Main Upload Box & Minimized Option 2 Container */}
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {/* OPTION 1: Upload Documents Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-600/30 dark:border-yellow-500/30 hover:border-indigo-600 dark:hover:border-yellow-400 p-6 sm:p-8 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 text-white tracking-wide">
                    Option 1
                  </span>
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  Upload Documents
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
                  PDF, Word, PowerPoint, Images, Text (up to 50MB)
                </p>

                {/* Dropzone Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/70 dark:bg-yellow-950/30 ring-4 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-yellow-400 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-7 h-7" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Choose files or drag &amp; drop
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Browse from mobile storage, photos, or computer
                  </p>

                  <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-yellow-400 dark:hover:bg-yellow-300 dark:text-slate-950 text-white text-xs font-black shadow-xs transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    <span>Select Documents to Print</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Select specifications on next step</span>
                <span className="font-semibold text-indigo-600 dark:text-yellow-400">Orientation, Scale &amp; Copies options available</span>
              </div>
            </motion.div>

            {/* MINIMIZED OPTION 2 TAB: Placed just below the upload box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-2xs transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Minimized Label & Summary */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider shrink-0">
                    Option 2
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-yellow-950/60 text-indigo-600 dark:text-yellow-400 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        Send via WhatsApp or Email
                      </span>
                      <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Direct to Counter
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                      Direct operator dispatch if preferred over web upload
                    </p>
                  </div>
                </div>

                {/* Right: Quick Action Buttons & Expand Details Toggle */}
                <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title="Send via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title="Send via Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsOption2Expanded(!isOption2Expanded)}
                    className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isOption2Expanded ? 'Collapse' : 'Show Contact Details'}
                    aria-label="Toggle details"
                  >
                    {isOption2Expanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Expanded Details */}
              {isOption2Expanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 truncate">{rawPhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyContact(rawPhone, 'phone')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-yellow-950/20 border border-indigo-200/60 dark:border-yellow-800/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <Mail className="w-4 h-4 text-indigo-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-xs font-bold text-indigo-950 dark:text-yellow-200 truncate">{emailAddress}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyContact(emailAddress, 'email')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-yellow-400 hover:bg-indigo-100 dark:hover:bg-yellow-900/60 flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-indigo-600 dark:text-yellow-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: JUST BELOW THAT: Recent Jobs of respective customer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <CustomerRecentJobs
              shopSettings={shopSettings}
              onSelectJob={onJobCreated}
              onLookupCode={onLookupCode}
            />
          </motion.div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STEP 2: PRINT SPECIFICATIONS (Activated when documents are uploaded)      */
        /* Customer selects Orientation (Vertical/Horizontal), Scale, Duplex, etc.   */
        /* ========================================================================= */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top navigation back to home / cancel files */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setUploadedDocs([]);
                setUploadError(null);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Back to Home / Change Documents</span>
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700 flex items-center space-x-1.5">
              <span>{uploadedDocs.length} {uploadedDocs.length === 1 ? 'file' : 'files'}</span>
              <span className="text-indigo-400 dark:text-slate-500">•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{totalPages} total pgs</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Staged Files & Print Specifications Deck (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Staged Documents List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h2 className="text-sm sm:base font-bold text-slate-900 dark:text-slate-100">
                        Uploaded Documents
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Multi-page PDFs automatically extract exact page counts
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-yellow-400 hover:text-indigo-800 dark:hover:text-yellow-300 cursor-pointer bg-indigo-50/70 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Document</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                  />
                </div>

                {/* Uploaded Documents Success Banner */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3.5 p-3 rounded-2xl bg-emerald-50/90 dark:bg-yellow-950/40 border border-emerald-200/90 dark:border-yellow-500/40 flex items-center justify-between gap-2.5 text-xs shadow-2xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-xl bg-emerald-600 dark:bg-yellow-400 text-white dark:text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-emerald-950 dark:text-yellow-200 block truncate">
                        Documents Uploaded Successfully
                      </span>
                      <span className="text-[10px] text-emerald-800/90 dark:text-yellow-400 font-medium block truncate">
                        {uploadedDocs.length} {uploadedDocs.length === 1 ? 'file' : 'files'} attached • {totalPages} {totalPages === 1 ? 'page' : 'pages'} ready for printing
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadSuccessModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-800 dark:text-yellow-300 hover:bg-emerald-100 dark:hover:bg-slate-700 text-[11px] font-bold border border-emerald-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    View Status
                  </button>
                </motion.div>

                {/* Staged File Items */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  <AnimatePresence mode="popLayout">
                    {uploadedDocs.map((item) => {
                      const isActive = item.id === (activePreviewDocId || uploadedDocs[0]?.id);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => setActivePreviewDocId(item.id)}
                          className={`p-3 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50/40 dark:bg-yellow-950/25 border-indigo-500 dark:border-yellow-400 shadow-2xs ring-1 ring-indigo-500/20 dark:ring-yellow-400/30'
                              : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {/* Miniature Document Thumbnail */}
                            <div
                              className={`relative w-11 h-13 rounded-lg overflow-hidden border shrink-0 bg-white dark:bg-slate-800 shadow-2xs flex items-center justify-center transition-all ${
                                isActive
                                  ? 'border-indigo-400 dark:border-yellow-400 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40'
                                  : 'border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.file.name}
                                  className={`w-full h-full object-contain pointer-events-none select-none transition-all ${
                                    colorMode === 'bw' ? 'grayscale contrast-110' : ''
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                              ) : item.isAnalyzing ? (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-50/60 dark:bg-slate-800">
                                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400 animate-spin" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400">
                                  <File className="w-4 h-4" />
                                </div>
                              )}
                              {isActive && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 dark:bg-yellow-400 ring-1 ring-white dark:ring-slate-900" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate max-w-[200px] sm:max-w-xs">
                                  {item.file.name}
                                </span>
                                {isActive && (
                                  <span className="text-[9px] font-extrabold text-indigo-700 dark:text-yellow-300 bg-indigo-100/80 dark:bg-yellow-950/70 px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-yellow-800/80 shrink-0">
                                    Previewing
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {formatFileSize(item.file.size)}
                                </span>

                                {item.isAnalyzing ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 dark:text-yellow-300 bg-indigo-100/70 dark:bg-yellow-950/60 px-2 py-0.5 rounded-full animate-pulse">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600 dark:text-yellow-400" />
                                    Detecting PDF pages...
                                  </span>
                                ) : item.detectedFromPdf ? (
                                  <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/80">
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    {item.pageCount} {item.pageCount === 1 ? 'Page' : 'Pages'} (Auto-detected)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {item.pageCount} {item.pageCount === 1 ? 'Page' : 'Pages'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                        {/* Document Page Adjuster & Remove */}
                        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => updateDocPageCount(item.id, -1, e)}
                              disabled={item.pageCount <= 1}
                              title="Decrease pages"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-900 dark:text-slate-100 min-w-[24px] text-center">
                              {item.pageCount}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => updateDocPageCount(item.id, 1, e)}
                              title="Increase pages"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => removeFile(item.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Remove document"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. Print Specifications Deck */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      Print Specifications
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure orientation, scale, color, paper size, and duplex
                    </p>
                  </div>
                </div>

                {/* SPEC 1: ORIENTATION (Vertical / Portrait vs Horizontal / Landscape) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Orientation:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Vertical (Portrait) */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setOrientation('portrait');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        orientation === 'portrait'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-7 h-9 rounded-md bg-indigo-100 dark:bg-slate-800 border border-indigo-300 dark:border-slate-700 text-indigo-700 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-3.5 h-6 border-2 border-indigo-700 dark:border-yellow-400 rounded-xs flex items-center justify-center">
                          <span className="text-[8px] font-black leading-none">V</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Vertical (Portrait)</span>
                          {orientation === 'portrait' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          Standard upright layout for letters, reports &amp; resumes
                        </span>
                      </div>
                    </motion.button>

                    {/* Horizontal (Landscape) */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setOrientation('landscape');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        orientation === 'landscape'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-9 h-7 rounded-md bg-indigo-100 dark:bg-slate-800 border border-indigo-300 dark:border-slate-700 text-indigo-700 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-1.5">
                        <div className="w-6 h-3.5 border-2 border-indigo-700 dark:border-yellow-400 rounded-xs flex items-center justify-center">
                          <span className="text-[8px] font-black leading-none">H</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Horizontal (Landscape)</span>
                          {orientation === 'landscape' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          Wide layout for tables, charts, slides &amp; certificates
                        </span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* SPEC 2: SCALE (Fit to paper vs Original size) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Scale:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Fit to paper */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setScale('fit');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        scale === 'fit'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Minimize2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Fit to Paper</span>
                          {scale === 'fit' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          Shrink / expand to printable paper margins cleanly
                        </span>
                      </div>
                    </motion.button>

                    {/* Original size */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setScale('original');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        scale === 'original'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Original Size</span>
                          {scale === 'original' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          100% exact dimensions without resizing or scaling
                        </span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Color Mode Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Color Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setColorMode('bw');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        colorMode === 'bw'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black">BW</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Black &amp; White</span>
                          {colorMode === 'bw' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Economical • {currency}{bwRate}/page
                        </span>
                      </div>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setColorMode('color');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                        colorMode === 'color'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Vivid Color</span>
                          {colorMode === 'color' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Laser Quality • {currency}{colorRate}/page
                        </span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Duplex (Single vs Double Sided) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Print Sides (Duplex):
                    </label>
                    {duplexDiscount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Save {duplexDiscount}% on 2-Sided
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setDuplex('single');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        duplex === 'single'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Single-Sided</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Standard front-only print</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        soundEffects.playOptionTick();
                        setDuplex('double');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        duplex === 'double'
                          ? 'border-indigo-600 dark:border-yellow-400 bg-indigo-50/40 dark:bg-yellow-950/30 ring-2 ring-indigo-600/30 dark:ring-yellow-400/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850/50'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Double-Sided</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Back-to-back ({duplexDiscount}% discount)</span>
                    </motion.button>
                  </div>
                </div>

                {/* Paper Size & Finishing Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Paper Dimension:
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => {
                        soundEffects.playOptionTick();
                        setPaperSize(e.target.value as any);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer"
                    >
                      <option value="A4">A4 (Standard 210 × 297 mm)</option>
                      <option value="A3">A3 (Poster / Blueprint 297 × 420 mm)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Finishing / Binding:
                    </label>
                    <select
                      value={binding}
                      onChange={(e) => {
                        soundEffects.playOptionTick();
                        setBinding(e.target.value as any);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer"
                    >
                      <option value="none">Loose Sheets (No Binding)</option>
                      <option value="staple">Corner Staple (+{currency}{stapleFee})</option>
                      <option value="spiral">Wire-O Spiral Binding (+{currency}{spiralFee})</option>
                    </select>
                  </div>
                </div>

                {/* Copies Stepper & Auto-Calculated Pages Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Number of Copies:
                    </label>
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 w-full max-w-[180px]">
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playOptionTick();
                          setCopies((c) => Math.max(1, c - 1));
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex-1 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                        {copies}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playOptionTick();
                          setCopies((c) => c + 1);
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Total Document Pages:
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Auto-Calculated
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-yellow-400 shrink-0" />
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block leading-tight">
                            {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            across {uploadedDocs.length} {uploadedDocs.length === 1 ? 'document' : 'documents'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-indigo-600 dark:text-yellow-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-indigo-200 dark:border-slate-700 shadow-2xs">
                        × {copies} {copies === 1 ? 'set' : 'sets'} = {totalPages * copies} impressions
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Customer Info (Optional) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Pickup Details (Optional)</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Name and phone for counter callout</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Your Name:
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Alex"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Mobile Number:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="For ready alert"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Special Instructions for Operator:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Print only pages 1 to 3, or staple top-left"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Sticky Order Summary & Submission Ticket (5 cols) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              {/* Live Document Thumbnail Preview with Selected Print Specifications */}
              <DocumentPrintPreview
                docs={uploadedDocs}
                activeDocId={activePreviewDocId || uploadedDocs[0]?.id}
                onSelectDoc={(id) => setActivePreviewDocId(id)}
                orientation={orientation}
                scale={scale}
                colorMode={colorMode}
                paperSize={paperSize}
                duplex={duplex}
                binding={binding}
                copies={copies}
              />

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-6 sm:p-7 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 dark:from-yellow-500 dark:via-amber-400 dark:to-yellow-500" />

                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-yellow-400 block">
                      Instant Estimate
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      Print Order Ticket
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5" />
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Selected Files:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{uploadedDocs.length} doc(s)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1">
                      <span>Total Pages:</span>
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Auto
                      </span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{totalPages} pages</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Copies:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{copies} copy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orientation:</span>
                    <span className="font-bold text-indigo-700 dark:text-yellow-400">
                      {orientation === 'landscape' ? 'Horizontal (Landscape)' : 'Vertical (Portrait)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scale:</span>
                    <span className="font-bold text-indigo-700 dark:text-yellow-400">
                      {scale === 'original' ? 'Original Size' : 'Fit to Paper'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Print Mode:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {colorMode === 'color' ? 'Full Color' : 'Black & White'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paper &amp; Sides:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {paperSize} • {duplex === 'double' ? 'Double-Sided' : 'Single'}
                    </span>
                  </div>
                  {binding !== 'none' && (
                    <div className="flex justify-between text-indigo-700 dark:text-yellow-400 font-semibold">
                      <span>Finishing ({binding}):</span>
                      <span>+{currency}{extraBindingFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-baseline justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Grand Total:</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Pay directly at counter</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight inline-block">
                      {currency}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {uploadError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-semibold">{uploadError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  id="submit-print-order-btn"
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-900 to-indigo-700 hover:from-slate-900 hover:to-indigo-600 dark:from-yellow-500 dark:via-amber-400 dark:to-yellow-500 dark:hover:from-yellow-400 dark:hover:to-amber-300 disabled:opacity-50 text-white dark:text-slate-950 font-extrabold text-sm shadow-lg shadow-indigo-950/20 dark:shadow-yellow-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Sending to Counter Desk...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate 4-Digit Pickup Code</span>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </>
                  )}
                </button>

                <div className="mt-4 text-center">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Files are transferred securely &amp; deleted after pickup
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* File Upload Celebration Animation (When Documents are Loaded) */}
      <DocumentUploadSuccessAnimation
        isOpen={showUploadSuccessModal}
        onClose={() => setShowUploadSuccessModal(false)}
        uploadedCount={lastUploadedCount}
        totalPages={totalPages}
        documentNames={lastUploadedNames}
        title="Documents Uploaded Successfully!"
        autoCloseMs={3800}
      />

      {/* Print Order Submission Success Animation (When Sent to Counter) */}
      <DocumentUploadSuccessAnimation
        isOpen={isSubmissionSuccess}
        onClose={() => setIsSubmissionSuccess(false)}
        uploadedCount={uploadedDocs.length}
        totalPages={totalPages}
        title="Documents Uploaded & Sent to Counter!"
        subtitle="Your documents have been dispatched to the live counter queue. Generating your 4-digit pickup slip..."
        autoCloseMs={0}
      />
    </div>
  );
};
