/**
 * Production Document Print Helper for COPY Platform
 * Supports both:
 * 1. Automatic Direct Print Engine: Injects pre-configured styles (@page, orientation, fit-to-size, grayscale, rotation)
 *    and immediately executes printing without requiring re-navigation.
 * 2. Manual System Print: Opens the OS native print dialog or external viewer for detailed manual tweaking.
 */

export type PrinterMachineProfile =
  | 'machine_1_normal'
  | 'machine_2_glossy'
  | 'machine_3_heavy'
  | 'machine_os_dialog';

export interface AutoPrintOptions {
  orientation?: 'portrait' | 'landscape';
  scale?: 'fit' | 'original';
  colorMode?: 'bw' | 'color';
  paperSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  rotation?: number; // 0, 90, 180, 270
  copies?: number;
  printerMachineProfile?: PrinterMachineProfile;
  machineLabel?: string;
}

/**
 * Automatic Print Engine:
 * Pre-configures print layout, page size, orientation, rotation, and color filter in a temporary
 * same-origin frame and executes printing seamlessly.
 */
export function triggerAutoPrint(
  fileUrl: string,
  originalName: string,
  mimeType?: string,
  options: AutoPrintOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const orientation = options.orientation || 'portrait';
      const scale = options.scale || 'fit';
      const colorMode = options.colorMode || 'bw';
      const paperSize = options.paperSize || 'A4';
      const rotation = options.rotation || 0;
      const copies = Math.max(1, options.copies || 1);

      const tagPrefix = options.machineLabel
        ? `[${options.machineLabel}] `
        : options.printerMachineProfile === 'machine_2_glossy'
        ? '[GLOSSY PHOTO FRAME] '
        : options.printerMachineProfile === 'machine_3_heavy'
        ? '[HEAVY CARDSTOCK] '
        : options.printerMachineProfile === 'machine_1_normal'
        ? '[DOC LASER A4] '
        : '';

      const pageMargin =
        options.printerMachineProfile === 'machine_2_glossy'
          ? '0mm'
          : scale === 'fit'
          ? '8mm'
          : '0mm';

      const isImage =
        Boolean(mimeType?.startsWith('image/')) ||
        /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(originalName);

      const isText =
        Boolean(mimeType?.startsWith('text/')) ||
        /\.(txt|csv|log|json|md)$/i.test(originalName);

      // Unique iframe ID for silent background rendering
      const iframeId = 'copy-auto-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe) {
        iframe.remove();
      }

      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const filterCss = colorMode === 'bw' ? 'filter: grayscale(100%) contrast(1.15);' : '';
      const rotationCss = rotation !== 0 ? `transform: rotate(${rotation}deg); transform-origin: center center;` : '';
      const fitCss = scale === 'fit' ? 'max-width: 100%; max-height: 100%; object-fit: contain;' : 'width: auto; height: auto;';

      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(tagPrefix + originalName)}</title>
    <style>
      @page {
        size: ${paperSize} ${orientation};
        margin: ${pageMargin};
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #fff;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-inside: avoid;
        ${filterCss}
        ${rotationCss}
      }
      img {
        ${fitCss}
        display: block;
      }
      embed, iframe, object {
        width: 100vw;
        height: 100vh;
        border: none;
        ${filterCss}
      }
      @media print {
        body { margin: 0; padding: 0; }
        .print-container { width: 100%; height: 100%; }
      }
    </style>
  </head>
  <body>
    ${
      isImage
        ? `<div class="print-container"><img src="${fileUrl}" alt="${escapeHtml(originalName)}" onload="window.__readyToPrint = true;" /></div>`
        : isText
        ? `<div class="print-container" style="padding: 20px; font-family: monospace; white-space: pre-wrap; font-size: 13px;">${escapeHtml(fileUrl)}</div>`
        : `<embed src="${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=${scale === 'fit' ? 'Fit' : 'FitH'}" type="application/pdf" style="width:100%;height:100%;" />`
    }
    <script>
      function executePrint() {
        try {
          window.focus();
          window.print();
        } catch(e) {}
      }
      window.onload = function() {
        setTimeout(executePrint, 350);
      };
    </script>
  </body>
</html>`;

      if (iframe.contentWindow && iframe.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(htmlContent);
        iframe.contentDocument.close();

        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus();
            iframe?.contentWindow?.print();
          } catch (e) {
            // If iframe direct print blocked by browser security, use popup fallback
            openPrintPopup(htmlContent);
          }
          resolve(true);
        }, 500);
      } else {
        openPrintPopup(htmlContent);
        resolve(true);
      }
    } catch (err) {
      console.warn('triggerAutoPrint error, falling back:', err);
      triggerSystemPrint(fileUrl, originalName, mimeType);
      resolve(false);
    }
  });
}

/**
 * Manual System Print:
 * Opens the native system print workflow or file in safe new tab.
 */
export function triggerSystemPrint(fileUrl: string, originalName: string, mimeType?: string) {
  try {
    const isImage =
      Boolean(mimeType?.startsWith('image/')) ||
      /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(originalName);

    const isText =
      Boolean(mimeType?.startsWith('text/')) ||
      /\.(txt|csv|log|json|md)$/i.test(originalName);

    if (isImage) {
      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (printWin && printWin.document) {
        printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Manual Print Settings - ${escapeHtml(originalName)}</title>
    <style>
      @page { margin: 10mm; size: auto; }
      body {
        margin: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        display: block;
      }
      @media print {
        body { padding: 0; min-height: auto; }
        img { width: 100%; max-height: 100%; object-fit: contain; }
      }
    </style>
  </head>
  <body>
    <img src="${fileUrl}" alt="${escapeHtml(originalName)}" onload="setTimeout(function(){ window.focus(); window.print(); }, 350);" />
  </body>
</html>`);
        printWin.document.close();
        return;
      }
    } else if (isText) {
      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (printWin && printWin.document) {
        fetch(fileUrl)
          .then((res) => res.text())
          .then((content) => {
            printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Manual Print Settings - ${escapeHtml(originalName)}</title>
    <style>
      @page { margin: 15mm; size: auto; }
      body {
        margin: 0;
        padding: 24px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        color: #111;
        background: #fff;
      }
    </style>
  </head>
  <body>${escapeHtml(content)}</body>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</html>`);
            printWin.document.close();
          })
          .catch(() => {
            openSafeTab(fileUrl);
          });
        return;
      }
    }

    // For PDFs: open in clean viewer tab with native OS print dialog
    openSafeTab(fileUrl);
  } catch (err) {
    console.warn('Safe print trigger handled error:', err);
    openSafeTab(fileUrl);
  }
}

function openPrintPopup(htmlContent: string) {
  const win = window.open('', '_blank', 'width=850,height=950');
  if (win && win.document) {
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
  }
}

function openSafeTab(url: string) {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
