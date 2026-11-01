import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Palette,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Smartphone,
  Crown,
  Info,
} from 'lucide-react';
import { ThemeId, THEME_OPTIONS, ThemeOption } from '../types/theme';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  finalTheme: ThemeId;
  onPreviewTheme: (themeId: ThemeId) => void;
  onSelectFinalTheme: (themeId: ThemeId) => void;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  finalTheme,
  onPreviewTheme,
  onSelectFinalTheme,
  isMinimized: controlledMinimized,
  onToggleMinimize,
}) => {
  const [internalMinimized, setInternalMinimized] = useState<boolean>(false);
  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : internalMinimized;

  const setIsMinimized = (val: boolean) => {
    if (onToggleMinimize) {
      onToggleMinimize(val);
    } else {
      setInternalMinimized(val);
    }
  };

  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const activeThemeMeta = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];
  const finalThemeMeta = THEME_OPTIONS.find((t) => t.id === finalTheme) || THEME_OPTIONS[0];

  const handleSelectAsFinal = (themeId: ThemeId) => {
    onSelectFinalTheme(themeId);
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
    }, 2800);
  };

  return (
    <>
      {/* Floating Minimized Trigger (When collapsed) */}
      {isMinimized && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-[#16284F] text-white shadow-xl shadow-black/25 border-2 border-[#E5C278]/40 hover:scale-105 transition-all cursor-pointer group"
            title="Open UI Theme Options"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 group-hover:rotate-12 transition-transform">
              <Palette className="w-3.5 h-3.5 text-[#E5C278]" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#E5C278] block leading-none">
                UI Theme
              </span>
              <span className="text-xs font-bold truncate max-w-[130px] block">
                {activeThemeMeta.name}
              </span>
            </div>
            <div className="flex items-center space-x-1 pl-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40"
                style={{ backgroundColor: activeThemeMeta.palette.accent }}
              />
              <ChevronUp className="w-4 h-4 text-white/70" />
            </div>
          </button>
        </div>
      )}

      {/* Main Top Theme Selector Banner */}
      {!isMinimized && (
        <div
          id="theme-switcher-bar"
          className="sticky top-0 z-40 bg-[#16284F] text-white border-b-2 border-[#B48234]/50 shadow-lg shadow-[#16284F]/15 transition-all"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
              {/* Left Info & Status */}
              <div className="flex items-center justify-between lg:justify-start space-x-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2]/10 border border-[#E5C278]/30 flex items-center justify-center text-[#E5C278] shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif text-sm sm:text-base font-bold text-[#E5C278] tracking-tight">
                        UI Theme Previewer
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                        5 Live Styles
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 hidden sm:block">
                      Click any theme to preview live. When satisfied, click &quot;Select as Final UI&quot;.
                    </p>
                  </div>
                </div>

                {/* Mobile Minimize Toggle */}
                <div className="flex items-center space-x-1.5 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setShowComparisonModal(true)}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white transition-colors"
                    title="Compare all themes"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white transition-colors"
                    title="Collapse Theme Switcher"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Center: Theme Pills / Selector */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                {THEME_OPTIONS.map((theme) => {
                  const isPreviewing = currentTheme === theme.id;
                  const isFinal = finalTheme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onPreviewTheme(theme.id)}
                      className={`relative flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isPreviewing
                          ? 'bg-white text-[#16284F] shadow-md ring-2 ring-[#E5C278]'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                      }`}
                    >
                      {/* Swatch dots */}
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 z-2"
                          style={{ backgroundColor: theme.palette.primary }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 z-1"
                          style={{ backgroundColor: theme.palette.accent }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.palette.bg }}
                        />
                      </div>

                      <div className="text-left">
                        <span className="block leading-tight">{theme.name}</span>
                        <span
                          className={`text-[9px] block font-normal leading-tight ${
                            isPreviewing ? 'text-[#70675D]' : 'text-white/60'
                          }`}
                        >
                          {theme.fontType}
                        </span>
                      </div>

                      {/* Badges */}
                      {isFinal && (
                        <span
                          className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center space-x-0.5 ${
                            isPreviewing
                              ? 'bg-[#16284F] text-[#E5C278]'
                              : 'bg-[#E5C278] text-[#16284F]'
                          }`}
                          title="This is currently set as your Final UI"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span className="hidden sm:inline">FINAL</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right: Confirmation & Action */}
              <div className="flex items-center space-x-2 shrink-0 justify-between sm:justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-white/10">
                {/* Select Final Button */}
                <button
                  type="button"
                  onClick={() => handleSelectAsFinal(currentTheme)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    finalTheme === currentTheme
                      ? 'bg-[#EAF5EE] text-[#1D6A42] border border-[#BDE3CA]'
                      : 'bg-[#B48234] hover:bg-[#C59242] text-white'
                  }`}
                  title="Save current preview as your permanent final choice"
                >
                  {finalTheme === currentTheme ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#1D6A42]" />
                      <span>Final UI Confirmed</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Select as Final UI</span>
                    </>
                  )}
                </button>

                {/* Compare Themes Dialog Trigger */}
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(true)}
                  className="hidden sm:flex items-center space-x-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                  title="Compare themes side-by-side"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>

                {/* Collapse Bar */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="hidden lg:flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  title="Hide theme switcher to review screens"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Hide Bar</span>
                </button>
              </div>
            </div>

            {/* Saved Toast Notification */}
            {justSaved && (
              <div className="mt-2 py-1.5 px-3 rounded-lg bg-[#EAF5EE] text-[#1D6A42] border border-[#BDE3CA] text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    &quot;{activeThemeMeta.name}&quot; has been saved as your Final UI selection! You can continue testing anytime.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setJustSaved(false)}
                  className="text-[#1D6A42] hover:opacity-75 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FFFDF9] border border-[#DFCDB2] rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[90vh] flex flex-col relative text-[#16284F]">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#E8DFC8] bg-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#16284F] text-[#E5C278] flex items-center justify-center shadow-xs">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#16284F]">
                    UI Design Options &amp; Aesthetic Palettes
                  </h3>
                  <p className="text-xs text-[#70675D] font-serif italic">
                    Compare visual personalities crafted for this stationery &amp; print shop.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="p-1.5 rounded-lg text-[#7A7063] hover:text-[#16284F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Theme Cards Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_OPTIONS.map((theme) => {
                  const isCurrent = currentTheme === theme.id;
                  const isFinal = finalTheme === theme.id;

                  return (
                    <div
                      key={theme.id}
                      className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#16284F] bg-white shadow-md ring-2 ring-[#B48234]/40'
                          : 'border-[#E8DFC8] bg-[#FAF7F2]/60 hover:bg-white'
                      }`}
                    >
                      <div>
                        {/* Header Swatches & Status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.palette.primary }}
                              title="Primary"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.palette.accent }}
                              title="Accent"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.palette.bg }}
                              title="Background"
                            />
                          </div>

                          <div className="flex items-center space-x-1">
                            {isFinal && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5EE] text-[#1D6A42] border border-[#BDE3CA]">
                                FINAL
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16284F] text-[#E5C278]">
                                PREVIEWING
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Tagline */}
                        <h4 className="font-serif text-base font-bold text-[#16284F]">
                          {theme.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-[#8C6322] block mb-2">
                          {theme.tagline}
                        </span>

                        <p className="text-xs text-[#5C5349] leading-relaxed mb-3">
                          {theme.description}
                        </p>

                        <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-[10px] text-[#70675D] space-y-1 mb-4">
                          <div>
                            <span className="font-bold text-[#16284F]">Palette:</span>{' '}
                            {theme.styleNote}
                          </div>
                          <div>
                            <span className="font-bold text-[#16284F]">Typography:</span>{' '}
                            {theme.fontType}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-[#E8DFC8]/60">
                        <button
                          type="button"
                          onClick={() => {
                            onPreviewTheme(theme.id);
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#16284F] text-white'
                              : 'bg-white border border-[#D5C8B4] hover:bg-[#FAF7F2] text-[#16284F]'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'Currently Active' : 'Preview This Style'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onPreviewTheme(theme.id);
                            handleSelectAsFinal(theme.id);
                          }}
                          className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer ${
                            isFinal
                              ? 'bg-[#EAF5EE] text-[#1D6A42] border border-[#BDE3CA]'
                              : 'text-[#8C6322] hover:bg-[#FEF6E4]'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isFinal ? 'Chosen as Final UI ✓' : 'Select as Final UI'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[#E8DFC8] bg-[#FAF7F2] flex items-center justify-between">
              <span className="text-xs text-[#70675D] italic">
                Active Selection: <strong className="text-[#16284F]">{finalThemeMeta.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-5 py-2 rounded-xl bg-[#16284F] text-white text-xs font-bold hover:bg-[#203767] transition-colors cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
