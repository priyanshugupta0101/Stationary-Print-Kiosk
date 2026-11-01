import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for browser rendering
if (typeof window !== 'undefined') {
  try {
    // Use unpkg worker matching pdfjs-dist version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Failed to configure pdf.worker.min.mjs:', e);
  }
}

export interface ThumbnailResult {
  url: string;
  isPdf: boolean;
  isImage: boolean;
  aspectRatio: number; // width / height
  error?: string;
}

const thumbnailCache = new Map<string, ThumbnailResult>();

/**
 * Generates an image thumbnail data URL for an uploaded File.
 * Supports PDFs (renders page 1 to canvas) and images (via object URLs / canvas).
 */
export async function generateDocumentThumbnail(file: File): Promise<ThumbnailResult> {
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  // Case 1: Image files
  if (isImage) {
    try {
      const objectUrl = URL.createObjectURL(file);
      // Determine image natural aspect ratio
      const aspectRatio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.naturalWidth / (img.naturalHeight || 1);
          resolve(ratio > 0 ? ratio : 0.707); // Default A4 ratio ~ 1/√2 = 0.707
        };
        img.onerror = () => resolve(0.707);
        img.src = objectUrl;
      });

      const result: ThumbnailResult = {
        url: objectUrl,
        isPdf: false,
        isImage: true,
        aspectRatio,
      };
      thumbnailCache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn('Error creating image thumbnail:', e);
    }
  }

  // Case 2: PDF files
  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      });

      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });

      // Create high-DPI rendering canvas with reasonable max dimensions for thumbnail
      const targetWidth = Math.min(480, viewport.width);
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Fill clean paper white background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // pdfjs-dist v4 expects canvas and canvasContext in RenderParameters
        await (page as any).render({
          canvasContext: context,
          canvas: canvas,
          viewport: scaledViewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const result: ThumbnailResult = {
          url: dataUrl,
          isPdf: true,
          isImage: false,
          aspectRatio: viewport.width / (viewport.height || 1),
        };
        thumbnailCache.set(cacheKey, result);
        return result;
      }
    } catch (err: any) {
      console.warn('PDF thumbnail generation via pdfjs-dist had an issue:', err);
    }
  }

  // Case 3: Fallback / Non-previewable documents (Doc, docx, txt, fallback)
  const result: ThumbnailResult = {
    url: '',
    isPdf,
    isImage,
    aspectRatio: 0.707, // Standard portrait A4
    error: 'Visual preview not directly supported',
  };
  thumbnailCache.set(cacheKey, result);
  return result;
}
