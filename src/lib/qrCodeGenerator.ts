/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate permanent QR Code as high-res PNG Data URL
 */
export async function generateQRCodeDataUrl(
  text: string, 
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOpts = {
    width: options.width || 600,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#1c1917', // brand-charcoal
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H' as const, // High error correction so logos/patterns can sit cleanly
  };

  return await QRCode.toDataURL(text, defaultOpts);
}

/**
 * Generate permanent QR Code as SVG string (infinite vector resolution)
 */
export async function generateQRCodeSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOpts = {
    width: options.width || 600,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#1c1917',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H' as const,
  };

  return await QRCode.toString(text, { ...defaultOpts, type: 'svg' });
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
