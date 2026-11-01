import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const handleClick = () => {
    soundEffects.playThemeToggle(!isDark);
    onToggle();
  };

  return (
    <motion.button
      id="theme-toggle-btn"
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      className={`relative p-2 sm:p-2.5 rounded-2xl cursor-pointer overflow-hidden border transition-all duration-300 shadow-2xs group select-none ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-800 border-yellow-500/40 text-yellow-400 hover:border-yellow-400 shadow-yellow-950/30'
          : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900 shadow-slate-200/50'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode (Yellow Theme)'}
      aria-label="Toggle dark mode"
    >
      {/* Background ambient radial aura */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl ${
          isDark
            ? 'bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.18)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)]'
        }`}
      />

      {/* Animated Icon Container with Spring Rotation */}
      <div className="relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="dark-sun"
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="relative flex items-center justify-center text-yellow-400"
            >
              {/* Pulsing Sun Center & Rays */}
              <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2] fill-yellow-400/20 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
              {/* Micro yellow glow dot */}
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_4px_#fde047]"
              />
            </motion.div>
          ) : (
            <motion.div
              key="light-moon"
              initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="relative flex items-center justify-center text-slate-700"
            >
              <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2] fill-slate-700/15" />
              {/* Micro star sparkles */}
              <Sparkles className="absolute -top-1 -right-1 w-2 h-2 text-indigo-500/70" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};
