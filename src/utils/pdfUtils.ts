import { PDFDocument } from 'pdf-lib';

/**
 * Accurately extracts the number of pages in an uploaded PDF file.
 * Uses pdf-lib for full standard parsing with graceful binary fallback.
 */
export async function detectPdfPageCount(file: File): Promise<number> {
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return 1;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const count = pdfDoc.getPageCount();
    return Math.max(1, count);
  } catch (err) {
    console.warn('pdf-lib standard parse encountered an issue, attempting raw structural scan:', err);
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('latin1').decode(buffer);
      // Look for /Count N in the pages tree catalog
      const countMatch = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
      if (countMatch && countMatch[1]) {
        const parsed = parseInt(countMatch[1], 10);
        if (parsed > 0) return parsed;
      }
      // Or count occurrences of /Type /Page (isolated page dictionaries)
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }
    } catch (fallbackErr) {
      console.warn('Fallback scan also failed:', fallbackErr);
    }
    return 1;
  }
}
