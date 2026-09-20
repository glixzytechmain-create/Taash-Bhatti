/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { QR_CENTER_LOGO_BASE64 } from './qrLogoBase64';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  includeCenterLogo?: boolean;
}

/**
 * Generate permanent QR Code as high-res PNG Data URL with centered Non-Pot Woodfire Spade Emblem
 */
export async function generateQRCodeDataUrl(
  text: string, 
  options: QRCodeOptions = {}
): Promise<string> {
  const width = options.width || 600;
  const margin = options.margin || 2;
  const defaultOpts = {
    width,
    margin,
    color: {
      dark: options.color?.dark || '#1c1917', // brand-charcoal
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H' as const, // High error correction (30%) ensures rapid, reliable scanning with center emblem
  };

  // In browser environments with canvas support, overlay the crisp centered emblem
  if (typeof document !== 'undefined' && options.includeCenterLogo !== false) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = width;
      await QRCode.toCanvas(canvas, text, defaultOpts);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const logoImg = new Image();
        logoImg.src = QR_CENTER_LOGO_BASE64;
        await new Promise((resolve) => {
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            resolve(true);
          } else {
            logoImg.onload = () => resolve(true);
            logoImg.onerror = () => resolve(false);
          }
        });

        // Center badge dimensions: ~22% of total QR size
        const centerSize = Math.round(width * 0.22);
        const centerPos = Math.round((width - centerSize) / 2);
        const radius = Math.round(centerSize * 0.24);

        ctx.save();

        // 1. Outer dark shield backing with royal amber gold border
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(centerPos - 4, centerPos - 4, centerSize + 8, centerSize + 8, radius + 2);
        } else {
          ctx.arc(width / 2, width / 2, (centerSize + 8) / 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#0b0f14'; // Midnight charcoal
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f59e0b'; // Royal amber gold rim
        ctx.stroke();

        // 2. Inner emblem clipping
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(centerPos, centerPos, centerSize, centerSize, radius);
        } else {
          ctx.arc(width / 2, width / 2, centerSize / 2, 0, Math.PI * 2);
        }
        ctx.clip();
        ctx.drawImage(logoImg, centerPos, centerPos, centerSize, centerSize);
        ctx.restore();

        return canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.warn('Could not overlay center logo on QR canvas, falling back to base QR:', err);
    }
  }

  return await QRCode.toDataURL(text, defaultOpts);
}

/**
 * Generate permanent QR Code as SVG string with embedded vector center emblem
 */
export async function generateQRCodeSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const width = options.width || 600;
  const margin = options.margin || 2;
  const defaultOpts = {
    width,
    margin,
    color: {
      dark: options.color?.dark || '#1c1917',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H' as const,
  };

  const baseSvg = await QRCode.toString(text, { ...defaultOpts, type: 'svg' });

  if (options.includeCenterLogo === false) {
    return baseSvg;
  }

  // Inject centered Non-Pot Woodfire Spade Logo in SVG before closing </svg>
  const centerSize = Math.round(width * 0.22);
  const centerPos = Math.round((width - centerSize) / 2);
  const radius = Math.round(centerSize * 0.24);

  const centerBadgeSvg = `
  <g id="qr-center-emblem">
    <rect x="${centerPos - 4}" y="${centerPos - 4}" width="${centerSize + 8}" height="${centerSize + 8}" rx="${radius + 2}" ry="${radius + 2}" fill="#0b0f14" stroke="#f59e0b" stroke-width="3" />
    <clipPath id="center-logo-clip">
      <rect x="${centerPos}" y="${centerPos}" width="${centerSize}" height="${centerSize}" rx="${radius}" ry="${radius}" />
    </clipPath>
    <image x="${centerPos}" y="${centerPos}" width="${centerSize}" height="${centerSize}" href="${QR_CENTER_LOGO_BASE64}" clip-path="url(#center-logo-clip)" preserveAspectRatio="xMidYMid slice" />
  </g>
</svg>`;

  return baseSvg.replace('</svg>', centerBadgeSvg);
}

/**
 * Download a generated Data URL as a file (PNG or SVG)
 */
export function downloadFile(content: string, filename: string, isSvg: boolean = false): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('a');
  if (isSvg) {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    link.href = URL.createObjectURL(blob);
  } else {
    link.href = content;
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
