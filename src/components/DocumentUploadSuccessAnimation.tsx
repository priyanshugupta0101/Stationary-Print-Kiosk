import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, FileCheck, Sparkles, X, Layers, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/soundEffects';

interface DocumentUploadSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedCount: number;
  totalPages: number;
  documentNames?: string[];
  title?: string;
  subtitle?: string;
  autoCloseMs?: number; // optional auto-close
}

export const DocumentUploadSuccessAnimation: React.FC<DocumentUploadSuccessAnimationProps> = ({
  isOpen,
  onClose,
  uploadedCount,
  totalPages,
  documentNames = [],
  title = 'Documents Uploaded Successfully!',
  subtitle,
  autoCloseMs = 4000,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Play tactile pop-up & cheerful document upload success sound
    soundEffects.playUploadSuccessPop();

    // Trigger confetti burst
    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.45 },
          colors: ['#22c55e', '#eab308', '#6366f1', '#38bdf8', '#10b981'],
          disableForReducedMotion: true,
        });

        // Small delayed secondary burst
        const timer = setTimeout(() => {
          confetti({
            particleCount: 35,
            angle: 60,
            spread: 55,
            origin: { x: 0.2, y: 0.5 },
            colors: ['#eab308', '#22c55e', '#6366f1'],
            disableForReducedMotion: true,
          });
          confetti({
            particleCount: 35,
            angle: 120,
            spread: 55,
            origin: { x: 0.8, y: 0.5 },
            colors: ['#eab308', '#22c55e', '#6366f1'],
            disableForReducedMotion: true,
          });
        }, 250);

        return () => clearTimeout(timer);
      }
    } catch {
      // Graceful fallback if canvas is restricted
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoCloseMs) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="upload-success-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-all"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden transition-colors"
          >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 animate-pulse" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success Animation Graphic */}
            <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
              {/* Outer pulsing rings */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.35, 1.2], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500/30 dark:bg-yellow-400/30"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.9, 1.2, 1.1], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-2 rounded-full bg-emerald-400/25 dark:bg-yellow-500/25"
              />

              {/* Central Glowing Shield */}
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 dark:from-yellow-500 dark:via-amber-400 dark:to-yellow-300 flex items-center justify-center text-white dark:text-slate-950 shadow-xl shadow-emerald-600/30 dark:shadow-yellow-500/40 relative z-10"
              >
                {/* Checkmark SVG with draw animation */}
                <motion.svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut', delay: 0.25 }}
                  />
                </motion.svg>

                {/* Floating Sparkle */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-300 dark:bg-white text-slate-950 flex items-center justify-center shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-600" />
                </motion.div>
              </motion.div>
            </div>

            {/* Title & Subtitle */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight"
            >
              {title}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300"
            >
              {subtitle || (
                <>
                  <span className="font-extrabold text-emerald-600 dark:text-yellow-400">
                    {uploadedCount} {uploadedCount === 1 ? 'file' : 'files'}
                  </span>{' '}
                  ready for printing •{' '}
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    {totalPages} total {totalPages === 1 ? 'page' : 'pages'}
                  </span>{' '}
                  calculated
                </>
              )}
            </motion.p>

            {/* Document Badges List (up to 3 previews) */}
            {documentNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-left space-y-1.5 max-h-32 overflow-y-auto"
              >
                {documentNames.slice(0, 3).map((name, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-200">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-yellow-400 shrink-0" />
                    <span className="truncate font-semibold flex-1">{name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-yellow-400 bg-emerald-50 dark:bg-yellow-950/60 px-1.5 py-0.5 rounded-md shrink-0">
                      Uploaded
                    </span>
                  </div>
                ))}
                {documentNames.length > 3 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1 font-medium">
                    +{documentNames.length - 3} more documents uploaded
                  </p>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="mt-6 flex flex-col sm:flex-row gap-2.5"
            >
              <button
                type="button"
                id="btn-confirm-uploaded-docs"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-yellow-400 dark:hover:bg-yellow-300 text-white dark:text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Configure Print Settings</span>
              </button>
            </motion.div>

            {/* Auto-close timer bar */}
            {autoCloseMs > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-emerald-500/50 dark:bg-yellow-400/50"
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
