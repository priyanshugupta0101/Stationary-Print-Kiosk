import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Eye,
  FileText,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrientationOption, ScaleOption, PaperSize, DuplexMode, BindingOption } from '../types';
import { UploadedDocItem } from './CustomerUploadView';

interface DocumentPrintPreviewProps {
  docs: UploadedDocItem[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  orientation: OrientationOption;
  scale: ScaleOption;
  colorMode: 'bw' | 'color';
  paperSize: PaperSize;
  duplex: DuplexMode;
  binding: BindingOption;
  copies: number;
}

const PAPER_DIMENSIONS: Record<PaperSize, { name: string; dims: string; ratio: number }> = {
  A4: { name: 'A4', dims: '210 × 297 mm', ratio: 210 / 297 },
  A3: { name: 'A3', dims: '297 × 420 mm', ratio: 297 / 420 },
  Letter: { name: 'Letter', dims: '8.5 × 11 in', ratio: 8.5 / 11 },
  Legal: { name: 'Legal', dims: '8.5 × 14 in', ratio: 8.5 / 14 },
};

export const DocumentPrintPreview: React.FC<DocumentPrintPreviewProps> = ({
  docs,
  activeDocId,
  onSelectDoc,
  orientation,
  scale,
  colorMode,
  paperSize,
  duplex,
  binding,
  copies,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);

  if (!docs || docs.length === 0) return null;

  const activeDoc = docs.find((d) => d.id === activeDocId) || docs[0];
  const activeIndex = docs.findIndex((d) => d.id === activeDoc.id);

  const isLandscape = orientation === 'landscape';
  const paperSpec = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;

  const handlePrevDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = (activeIndex - 1 + docs.length) % docs.length;
    onSelectDoc(docs[prevIdx].id);
    setIsFlipped(false);
  };

  const handleNextDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (activeIndex + 1) % docs.length;
    onSelectDoc(docs[nextIdx].id);
    setIsFlipped(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 relative overflow-hidden transition-colors">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Live Print Preview
                </h4>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                  Spec Applied
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {activeDoc.file.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {duplex === 'double' && (
              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-750 text-indigo-700 dark:text-yellow-400 border border-indigo-200 dark:border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Flip between front and back side"
              >
                <RotateCw className="w-3 h-3" />
                <span>{isFlipped ? 'Side B (Back)' : 'Side A (Front)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setModalZoom(1);
                setIsModalOpen(true);
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Enlarge preview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-document Switcher (if > 1 uploaded document) */}
        {docs.length > 1 && (
          <div className="flex items-center justify-between mb-3 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-750 text-[11px]">
            <button
              type="button"
              onClick={handlePrevDoc}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-yellow-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Previous document"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[240px] px-1 no-scrollbar">
              {docs.map((doc, idx) => {
                const isActive = doc.id === activeDoc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDoc(doc.id);
                      setIsFlipped(false);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold text-[10px] whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 font-black text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Doc {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextDoc}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-yellow-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Next document"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Physical Paper Sheet Canvas Container */}
        <div className="relative w-full bg-slate-100/90 dark:bg-slate-950/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 flex items-center justify-center min-h-[260px] sm:min-h-[290px] overflow-hidden">
          {/* Background Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Under-layer sheet if Duplex (double-sided) is selected to show physical stack */}
          {duplex === 'double' && (
            <div
              className={`absolute bg-slate-200/80 dark:bg-slate-800/90 rounded-lg shadow-xs transition-all duration-300 pointer-events-none ${
                isLandscape ? 'w-[78%] max-w-[290px] aspect-[1.414/1]' : 'w-[56%] max-w-[210px] aspect-[1/1.414]'
              }`}
              style={{
                transform: 'translate(5px, 5px) rotate(1deg)',
              }}
            />
          )}

          {/* Physical Sheet */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`relative bg-white rounded-lg shadow-lg dark:shadow-slate-950/50 border border-slate-300/80 dark:border-slate-700 overflow-hidden transition-all duration-300 cursor-pointer group ${
              isLandscape
                ? 'w-[82%] max-w-[310px] aspect-[1.414/1]'
                : 'w-[58%] max-w-[220px] aspect-[1/1.414]'
            }`}
            onClick={() => {
              setModalZoom(1);
              setIsModalOpen(true);
            }}
          >
            {/* Staple Effect Overlay */}
            {binding === 'staple' && (
              <div
                className="absolute top-2 left-2 z-20 pointer-events-none transform -rotate-45"
                title="Staple bound"
              >
                <div className="w-4 h-1 bg-slate-400 rounded-full border border-slate-600 shadow-sm" />
              </div>
            )}

            {/* Spiral Binding Effect Overlay (left edge) */}
            {binding === 'spiral' && (
              <div className="absolute left-0 top-0 bottom-0 w-3.5 z-20 flex flex-col justify-evenly items-center bg-slate-50/80 dark:bg-slate-800/80 border-r border-slate-200/90 dark:border-slate-700 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-1.5 rounded-full bg-slate-700 border border-slate-900 shadow-2xs"
                  />
                ))}
              </div>
            )}

            {/* Margins for Scale: "Fit to Paper" vs "Original" */}
            <div
              className={`w-full h-full flex flex-col items-center justify-center transition-all ${
                scale === 'fit'
                  ? 'p-2.5 sm:p-3 border-[1.5px] border-dashed border-slate-300/80 m-1 rounded-sm'
                  : 'p-0'
              }`}
            >
              {/* Document Content / Thumbnail Graphic */}
              <div
                className={`w-full h-full relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  colorMode === 'bw'
                    ? 'grayscale contrast-110 brightness-95'
                    : 'contrast-100'
                }`}
              >
                {activeDoc.thumbnailUrl ? (
                  <img
                    src={activeDoc.thumbnailUrl}
                    alt={activeDoc.file.name}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : activeDoc.isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                    <div className="w-5 h-5 border-2 border-indigo-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] font-bold text-slate-500">
                      Generating preview...
                    </span>
                  </div>
                ) : (
                  /* Stylized fallback document view */
                  <div className="w-full h-full p-3 flex flex-col justify-between bg-white text-slate-800">
                    <div className="space-y-1.5">
                      <div className="h-2 w-3/4 bg-slate-800/80 rounded-xs" />
                      <div className="h-1.5 w-full bg-slate-300/80 rounded-xs" />
                      <div className="h-1.5 w-5/6 bg-slate-300/80 rounded-xs" />
                      <div className="h-1.5 w-2/3 bg-slate-300/80 rounded-xs" />
                    </div>

                    <div className="py-2 flex flex-col items-center justify-center">
                      <FileText className="w-7 h-7 text-indigo-500 mb-1" />
                      <span className="text-[8px] font-bold text-slate-600 truncate max-w-[120px] text-center">
                        {activeDoc.file.name}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-slate-200 rounded-xs" />
                      <div className="h-1.5 w-4/5 bg-slate-200 rounded-xs" />
                      <div className="flex justify-between items-center text-[7px] text-slate-400 font-bold pt-1">
                        <span>{paperSize}</span>
                        <span>{activeDoc.pageCount} pgs</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hover Overlay Hint */}
            <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[10px] font-extrabold shadow-md flex items-center space-x-1">
                <Maximize2 className="w-3 h-3" />
                <span>Enlarge</span>
              </span>
            </div>

            {/* Corner Badge: Paper Size & Orientation */}
            <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[8px] font-black tracking-wider uppercase backdrop-blur-xs">
              {paperSize} • {isLandscape ? 'Landscape' : 'Portrait'}
            </div>
          </motion.div>
        </div>

        {/* Live Specification Badges List below preview */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-1.5 text-[10px]">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span
              className={`px-2 py-0.5 rounded-md font-extrabold border ${
                colorMode === 'bw'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
              }`}
            >
              {colorMode === 'bw' ? 'B&W Monochrome' : 'Full Color'}
            </span>

            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {paperSpec.name} ({paperSpec.dims})
            </span>

            <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-yellow-400 border border-indigo-200 dark:border-slate-750">
              {scale === 'fit' ? 'Fit to Paper' : 'Original Scale'}
            </span>

            {binding !== 'none' && (
              <span className="px-2 py-0.5 rounded-md font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 capitalize">
                {binding} Finish
              </span>
            )}
          </div>

          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {activeDoc.pageCount} {activeDoc.pageCount === 1 ? 'page' : 'pages'}
          </span>
        </div>
      </div>

      {/* High-Resolution Full-Screen Preview Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-yellow-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {activeDoc.file.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {paperSize} ({paperSpec.dims}) • {orientation === 'landscape' ? 'Horizontal' : 'Vertical'} • {colorMode === 'bw' ? 'Black & White' : 'Color'}
                    </p>
                  </div>
                </div>

                {/* Controls & Close */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setModalZoom((z) => Math.max(0.6, z - 0.2))}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {Math.round(modalZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalZoom((z) => Math.min(2.5, z + 0.2))}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Sheet View */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[380px]">
                <div
                  className={`relative bg-white rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 transition-all overflow-hidden ${
                    isLandscape ? 'w-[520px] aspect-[1.414/1]' : 'w-[370px] aspect-[1/1.414]'
                  }`}
                  style={{
                    transform: `scale(${modalZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Staple */}
                  {binding === 'staple' && (
                    <div className="absolute top-3 left-3 z-20 pointer-events-none transform -rotate-45">
                      <div className="w-6 h-1.5 bg-slate-400 rounded-full border border-slate-600 shadow-sm" />
                    </div>
                  )}

                  {/* Spiral */}
                  {binding === 'spiral' && (
                    <div className="absolute left-0 top-0 bottom-0 w-5 z-20 flex flex-col justify-evenly items-center bg-slate-50/80 border-r border-slate-200/90 pointer-events-none">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-3 h-2 rounded-full bg-slate-700 border border-slate-900 shadow-2xs"
                        />
                      ))}
                    </div>
                  )}

                  {/* Inner Page with active print specifications */}
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      scale === 'fit' ? 'p-4 border-[2px] border-dashed border-slate-300 m-1 rounded-sm' : 'p-0'
                    }`}
                  >
                    <div
                      className={`w-full h-full flex items-center justify-center overflow-hidden ${
                        colorMode === 'bw'
                          ? 'grayscale contrast-110 brightness-95'
                          : 'contrast-100'
                      }`}
                    >
                      {activeDoc.thumbnailUrl ? (
                        <img
                          src={activeDoc.thumbnailUrl}
                          alt={activeDoc.file.name}
                          className="w-full h-full object-contain select-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center">
                          <FileText className="w-12 h-12 text-indigo-500 mb-2" />
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{activeDoc.file.name}</h4>
                          <p className="text-xs text-slate-400">
                            {activeDoc.pageCount} Pages • {activeDoc.file.type || 'Document'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Simulating <strong>{colorMode === 'bw' ? 'Black & White' : 'Color'}</strong> print on{' '}
                    <strong>{paperSize}</strong> in <strong>{orientation}</strong> mode
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-yellow-400 dark:text-slate-950 font-black text-white hover:bg-slate-800 dark:hover:bg-yellow-300 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
