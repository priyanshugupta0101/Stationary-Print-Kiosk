/**
 * Canvas-based High-Resolution Wall Poster Generator for Customer Counter
 * Cool, minimalist, high-impact design:
 * 1. Top Center: Clean Stationery Shop Name
 * 2. Center: Large Main QR Code with viewfinder accents
 * 3. Below QR: Clean 4-step customer instructions
 * 4. Bottom: Prominent Price Details (B/W and Color rates)
 */

export interface PosterOptions {
  shopName: string;
  tagline?: string;
  shopAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  currency?: string;
  bwPricePerPage?: number;
  colorPricePerPage?: number;
  qrDataUrl: string;
  customerUrl: string;
}

export async function generatePosterDataUrl(options: PosterOptions): Promise<string> {
  const width = 1200;
  const height = 1700;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Crisp White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer frame: sleek double border
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#0F172A';
  roundRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E2E8F0';
  roundRect(ctx, 36, 36, width - 72, height - 72, 22);
  ctx.stroke();

  // 2. TOP CENTER: Stationery Shop Name (Clean, Bold, No Clutter)
  const displayShopName = (options.shopName || 'COPY').trim();
  const topCenterY = 90;

  // Tiny minimalist pill above shop name
  ctx.fillStyle = '#4F46E5';
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  const tagText = 'SELF-SERVICE DOCUMENT PRINTING';
  const tagWidth = ctx.measureText(tagText).width + 32;
  ctx.fillStyle = '#EEF2FF';
  roundRect(ctx, width / 2 - tagWidth / 2, topCenterY - 32, tagWidth, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#4F46E5';
  ctx.fillText(tagText, width / 2, topCenterY - 13);

  // Big Bold Stationery Shop Name
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(displayShopName, width / 2, topCenterY + 45);

  // Sleek decorative divider below shop name
  const dividerWidth = 140;
  ctx.fillStyle = '#4F46E5';
  roundRect(ctx, width / 2 - dividerWidth / 2, topCenterY + 70, dividerWidth, 4, 2);
  ctx.fill();

  // 3. MAIN QR SECTION (Center Stage)
  const qrCardY = 205;
  const qrCardWidth = width - 96;
  const qrCardHeight = 630;
  const qrCardX = 48;

  // Card background with subtle shadow
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, qrCardX, qrCardY, qrCardWidth, qrCardHeight, 28);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#CBD5E1';
  roundRect(ctx, qrCardX, qrCardY, qrCardWidth, qrCardHeight, 28);
  ctx.stroke();

  // QR Header
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO PRINT', width / 2, qrCardY + 62);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Point your phone camera or Google Lens at this code', width / 2, qrCardY + 98);

  // Draw QR Image
  if (options.qrDataUrl) {
    const qrSize = 390;
    const qrX = width / 2 - qrSize / 2;
    const qrY = qrCardY + 128;

    // QR White Container
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0F172A';
    roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
    ctx.stroke();

    // Cool Modern Viewfinder Bracket Accents (Indigo Neon)
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4F46E5';
    const bLen = 36;
    const bOff = 10;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(qrX - bOff, qrY - bOff + bLen);
    ctx.lineTo(qrX - bOff, qrY - bOff);
    ctx.lineTo(qrX - bOff + bLen, qrY - bOff);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(qrX + qrSize + bOff - bLen, qrY - bOff);
    ctx.lineTo(qrX + qrSize + bOff, qrY - bOff);
    ctx.lineTo(qrX + qrSize + bOff, qrY - bOff + bLen);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(qrX - bOff, qrY + qrSize + bOff - bLen);
    ctx.lineTo(qrX - bOff, qrY + qrSize + bOff);
    ctx.lineTo(qrX - bOff + bLen, qrY + qrSize + bOff);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(qrX + qrSize + bOff - bLen, qrY + qrSize + bOff);
    ctx.lineTo(qrX + qrSize + bOff, qrY + qrSize + bOff);
    ctx.lineTo(qrX + qrSize + bOff, qrY + qrSize + bOff - bLen);
    ctx.stroke();

    // Draw the image
    const qrImg = await loadImage(options.qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Web Link Pill below QR
  const urlDisplay = options.customerUrl ? options.customerUrl.replace(/^https?:\/\//, '') : 'Print Upload Portal';
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 17px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const pillText = `Upload Portal: ${urlDisplay}`;
  const pillW = ctx.measureText(pillText).width + 36;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, width / 2 - pillW / 2, qrCardY + 580, pillW, 34, 17);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#E2E8F0';
  roundRect(ctx, width / 2 - pillW / 2, qrCardY + 580, pillW, 34, 17);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.fillText(pillText, width / 2, qrCardY + 603);

  // 4. STEPS DIRECTLY BELOW QR (Clean 4 Steps Grid)
  const stepsY = 875;

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOW IT WORKS', width / 2, stepsY + 25);

  const steps = [
    {
      num: '1',
      title: 'Scan QR Code',
      desc: 'Open phone camera & tap the notification link.',
      accent: '#0284C7',
      bg: '#F0F9FF',
    },
    {
      num: '2',
      title: 'Upload Documents',
      desc: 'Pick PDF, Word, or images & choose B/W or Color.',
      accent: '#6366F1',
      bg: '#EEF2FF',
    },
    {
      num: '3',
      title: 'Get 4-Digit Code',
      desc: 'Your phone displays an instant pickup OTP.',
      accent: '#D97706',
      bg: '#FFFBEB',
    },
    {
      num: '4',
      title: 'Collect at Counter',
      desc: 'Share the code with desk operator to print.',
      accent: '#059669',
      bg: '#ECFDF5',
    },
  ];

  const stepCardWidth = (width - 96 - 28) / 2; // 2 columns
  const stepCardHeight = 150;
  const stepGridStartY = stepsY + 50;

  steps.forEach((step, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardX = 48 + col * (stepCardWidth + 28);
    const cardY = stepGridStartY + row * (stepCardHeight + 20);

    // Step Card Background
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cardX, cardY, stepCardWidth, stepCardHeight, 20);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#E2E8F0';
    roundRect(ctx, cardX, cardY, stepCardWidth, stepCardHeight, 20);
    ctx.stroke();

    // Number circle badge
    const badgeX = cardX + 46;
    const badgeY = cardY + 46;
    ctx.fillStyle = step.bg;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = step.accent;
    ctx.stroke();

    ctx.fillStyle = step.accent;
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(step.num, badgeX, badgeY + 8);

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(step.title, cardX + 86, cardY + 46);

    // Description
    ctx.fillStyle = '#475569';
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    wrapText(ctx, step.desc, cardX + 86, cardY + 78, stepCardWidth - 100, 24);
  });

  // 5. AT BOTTOM: PRICE DETAILS
  const priceY = 1275;
  const priceWidth = width - 96;
  const priceHeight = 270;
  const currency = options.currency || '₹';
  const bwRate = options.bwPricePerPage ?? 2;
  const colorRate = options.colorPricePerPage ?? 10;

  // Price Section Background Card
  ctx.fillStyle = '#0F172A';
  roundRect(ctx, 48, priceY, priceWidth, priceHeight, 28);
  ctx.fill();

  // Header inside Price Card
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⚡ PRINTING RATES (A4 LASER QUALITY)', width / 2, priceY + 45);

  // Two Big Price Blocks Side-By-Side
  const cardColW = (priceWidth - 56) / 2;
  const cardColH = 160;
  const colY = priceY + 68;

  // B/W Price Box
  const bwX = 48 + 20;
  ctx.fillStyle = '#1E293B';
  roundRect(ctx, bwX, colY, cardColW, cardColH, 20);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#334155';
  roundRect(ctx, bwX, colY, cardColW, cardColH, 20);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BLACK & WHITE', bwX + cardColW / 2, colY + 36);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${currency}${bwRate}`, bwX + cardColW / 2, colY + 98);

  ctx.fillStyle = '#64748B';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PER SINGLE PAGE', bwX + cardColW / 2, colY + 130);

  // Color Price Box
  const colorX = bwX + cardColW + 16;
  ctx.fillStyle = '#1E1B4B';
  roundRect(ctx, colorX, colY, cardColW, cardColH, 20);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4F46E5';
  roundRect(ctx, colorX, colY, cardColW, cardColH, 20);
  ctx.stroke();

  ctx.fillStyle = '#A5B4FC';
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('COLOR PRINT', colorX + cardColW / 2, colY + 36);

  ctx.fillStyle = '#818CF8';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${currency}${colorRate}`, colorX + cardColW / 2, colY + 98);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PER SINGLE PAGE', colorX + cardColW / 2, colY + 130);

  // Bottom note
  const footerY = 1590;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Fast • Private • Secure — Documents are printed directly at the counter', width / 2, footerY);

  return canvas.toDataURL('image/png');
}

/**
 * Downloads a data URL as an image file
 */
export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a dedicated same-origin print window containing the full A4 poster
 */
export function printPosterWindow(posterDataUrl: string, shopName: string) {
  const printWin = window.open('', '_blank', 'width=900,height=1100');
  if (!printWin || !printWin.document) {
    // Fallback: download instead
    downloadImage(posterDataUrl, `${shopName.replace(/\s+/g, '-').toLowerCase()}-wall-poster.png`);
    return;
  }

  printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Print Wall Poster - ${escapeHtml(shopName)}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 12px;
        background: #52525B;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .poster-img {
        max-width: 100%;
        max-height: 96vh;
        object-fit: contain;
        background: #FFFFFF;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
      }
      @media print {
        body {
          background: #FFFFFF !important;
          padding: 0 !important;
          margin: 0 !important;
          min-height: auto !important;
        }
        .poster-img {
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <img
      class="poster-img"
      src="${posterDataUrl}"
      alt="Customer Printing Poster"
      onload="setTimeout(function(){ window.focus(); window.print(); }, 400);"
    />
  </body>
</html>`);
  printWin.document.close();
}

// Helpers
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
