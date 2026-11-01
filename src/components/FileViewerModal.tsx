import React from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { UploadedFileMeta } from '../types';
import { triggerSystemPrint } from '../utils/printHelper';

interface FileViewerModalProps {
  file: UploadedFileMeta | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage =
    file.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.originalName);
  const isPdf = file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.originalName);

  const handlePrint = () => {
    triggerSystemPrint(file.url, file.originalName, file.mimeType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-3 truncate mr-2 sm:mr-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {file.originalName}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.mimeType || 'Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              id="modal-download-file-btn"
              href={file.downloadUrl}
              download={file.originalName}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              id="modal-print-file-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body / Preview Area */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
          {isImage ? (
            <img
              src={file.url}
              alt={file.originalName}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              referrerPolicy="no-referrer"
            />
          ) : isPdf ? (
            <iframe
              src={`${file.url}#toolbar=1`}
              title={file.originalName}
              className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-xs"
            />
          ) : (
            <div className="text-center p-8 max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-yellow-400 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">{file.originalName}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Direct in-browser visual preview is optimized for PDFs and images. For Word, Excel, or
                PowerPoint, download the file to open or print on your desktop.
              </p>
              <div className="flex items-center justify-center">
                <a
                  href={file.downloadUrl}
                  download={file.originalName}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-md shadow-slate-950/20 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4 text-indigo-400 dark:text-yellow-400" />
                  <span>Download to Desktop</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
