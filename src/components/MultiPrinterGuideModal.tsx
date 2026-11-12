import React from 'react';
import {
  X,
  Printer,
  Sparkles,
  Zap,
  CheckCircle2,
  Terminal,
  HelpCircle,
  Copy,
  ExternalLink,
  Laptop,
  Check,
  AlertCircle,
  Image,
  FileText,
  Layers,
} from 'lucide-react';

interface MultiPrinterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiPrinterGuideModal: React.FC<MultiPrinterGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const chromeKioskWin = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}"`;
  const edgeKioskWin = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}"`;
  const chromeKioskMac = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --kiosk-printing "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-yellow-950/60 border border-indigo-200 dark:border-yellow-800/80 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Shop Counter Hardware Guide</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Multi-Printer Machine Selection &amp; 0-Click Auto-Printing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How automatic printing works, routing across 2–3 printers, and bypassing the OS dialog
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question 1: Why does the system dialog appear on Automatic Print? */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-yellow-400 font-extrabold text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Why did the system printing dialog show up instead of printing directly?</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            By default, web browsers (Chrome, Edge, Firefox) have a strict security sandbox that prohibits web pages from secretly firing hardware printers without user permission. Standard web apps pass the print command to your Operating System (Windows / Mac), which opens the print window defaulting to your system's <strong>Default Printer</strong>.
          </p>
        </div>

        {/* Question 2: How do 2–3 different printing machines work in this system? */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-black text-sm">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Managing 2 to 3 Different Physical Printers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Machine 1 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-slate-100">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                <span>Machine 1: Laser</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Standard document printer for normal A4 Xerox, spiral binding, and office paperwork.
              </p>
              <div className="text-[10px] bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg font-mono text-slate-600 dark:text-slate-300">
                Grayscale • 8mm margin
              </div>
            </div>

            {/* Machine 2 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-slate-100">
                <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Machine 2: Glossy Photo</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Inkjet / EcoTank for glossy photo frames, certificates, and vibrant color prints.
              </p>
              <div className="text-[10px] bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                Full Color • 0mm borderless
              </div>
            </div>

            {/* Machine 3 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-slate-100">
                <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Machine 3: Heavy Media</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Multi-purpose tray for thick cardstock, heavy covers, and A3 sheets.
              </p>
              <div className="text-[10px] bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg font-mono text-purple-600 dark:text-purple-300">
                Custom Media • High DPI
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              When you select <strong>Machine 2 (Glossy Photo)</strong> on the counter desk, the app automatically pre-configures 0mm borderless margins and full color, and prefixes the job title with <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">[GLOSSY PHOTO FRAME]</code> so you or your spooler immediately know which physical printer to send it to.
            </p>
          </div>
        </div>

        {/* 0-Click Silent Printing Setup (Bypassing OS Dialog Completely) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-300" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              How to enable 100% 0-Click Silent Auto-Printing (No Dialogs!)
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If you want <strong>ZERO clicks</strong>—where clicking "AUTO PRINT" in our app immediately prints from the printer without ever showing a printer selection or settings box—launch your browser with Chrome's built-in business flag:
            <code className="text-amber-300 font-mono font-bold mx-1">--kiosk-printing</code>
          </p>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-300 block">
              Windows (Run in Command Prompt or create a Desktop Shortcut):
            </span>
            <div className="flex items-center justify-between p-2.5 bg-black/50 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto">
              <span className="truncate mr-2">{chromeKioskWin}</span>
              <button
                type="button"
                onClick={() => handleCopy(chromeKioskWin, 'win-chrome')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
                title="Copy Command"
              >
                {copiedCmd === 'win-chrome' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-300 block">
              Microsoft Edge Shortcut:
            </span>
            <div className="flex items-center justify-between p-2.5 bg-black/50 rounded-xl border border-white/10 font-mono text-[11px] text-sky-400 overflow-x-auto">
              <span className="truncate mr-2">{edgeKioskWin}</span>
              <button
                type="button"
                onClick={() => handleCopy(edgeKioskWin, 'win-edge')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
                title="Copy Command"
              >
                {copiedCmd === 'win-edge' ? <Check className="w-3.5 h-3.5 text-sky-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3 Pro Counter Desk Strategies */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
            How Top Print Shops Route 2 to 3 Printers Smoothly:
          </h4>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-yellow-400 font-black flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Set Machine 1 (Laser) as Windows Default Printer:</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  90% of walk-in prints are normal B&amp;W documents. Having Machine 1 as your default Windows printer means normal documents print with 0 device selection needed.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-yellow-400 font-black flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Separate Desktop Shortcuts for Document vs Photo Printing:</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  You can have two Chrome shortcuts on your desktop—one configured with your Laser printer profile, and another with your Glossy Photo printer profile.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-yellow-400 font-black flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Automatic Chrome Memory:</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Even without kiosk flags, Chrome always remembers the last printer destination you picked in that browser window. Once you select Machine 2, clicking Print in that window will keep Machine 2 selected automatically!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-yellow-400 text-white dark:text-slate-950 text-xs font-black hover:bg-indigo-500 dark:hover:bg-yellow-300 transition cursor-pointer shadow-xs"
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
