/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Video Upload & Client-Side Loop Optimization Utility
 * - Reads video files (.mp4, .webm, .mov) directly from user devices
 * - Auto-optimizes long/heavy videos into lightweight silent food loops
 * - Supports direct Data URLs and URL fallbacks
 * - Zero CORS / decode issues (no crossOrigin on blob: URLs)
 */

export interface VideoProcessingResult {
  dataUrl: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Reads a video file from device into a Base64 Data URL.
 * If the file is small (<= 2.5MB), reads it directly as Data URL for instant, 100% reliable playback.
 * If larger, attempts client-side canvas loop recording (first 4 seconds, silent, 480p)
 * to keep payload within Firestore and browser performance thresholds.
 */
export async function processVideoFile(
  file: File,
  maxDurationSec: number = 4,
  maxDimension: number = 480,
  onProgress?: (status: string) => void
): Promise<VideoProcessingResult> {
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i)) {
    throw new Error('Please select a valid video file (.mp4, .webm, or .mov).');
  }

  // 1. If video is already lightweight (under 2.5 MB), read directly as Data URL
  if (file.size <= 2.5 * 1024 * 1024) {
    onProgress?.('Reading video clip from device...');
    const dataUrl = await readFileAsDataUrl(file);
    const meta = await getVideoMetadata(dataUrl);
    const thumb = await captureVideoPoster(dataUrl).catch(() => undefined);
    return {
      dataUrl,
      thumbnailUrl: thumb,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      sizeBytes: file.size,
    };
  }

  // 2. If larger, check if browser supports client-side loop recording via MediaRecorder
  const canCompress = typeof window !== 'undefined' && 
    typeof MediaRecorder !== 'undefined' && 
    typeof HTMLCanvasElement.prototype.captureStream === 'function';

  if (!canCompress) {
    // If MediaRecorder is unsupported and file is under 4MB, fallback to direct reading
    if (file.size <= 4 * 1024 * 1024) {
      const dataUrl = await readFileAsDataUrl(file);
      const meta = await getVideoMetadata(dataUrl);
      const thumb = await captureVideoPoster(dataUrl).catch(() => undefined);
      return {
        dataUrl,
        thumbnailUrl: thumb,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
      };
    }
    throw new Error(`Video file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To keep dish cards fast on mobile, please choose a clip under 4MB or paste a video URL.`);
  }

  // 3. Compress video into a silent, high-efficiency 4-second loop
  onProgress?.('Optimizing video loop for mobile...');
  try {
    return await compressVideoToLoop(file, maxDurationSec, maxDimension, onProgress);
  } catch (compressErr) {
    console.warn('Canvas video loop compression failed, trying direct read fallback:', compressErr);
    // If compression failed but file is under 4MB, safely fallback to direct read
    if (file.size <= 4 * 1024 * 1024) {
      const dataUrl = await readFileAsDataUrl(file);
      const meta = await getVideoMetadata(dataUrl);
      const thumb = await captureVideoPoster(dataUrl).catch(() => undefined);
      return {
        dataUrl,
        thumbnailUrl: thumb,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
      };
    }
    throw new Error(`Could not optimize ${(file.size / (1024 * 1024)).toFixed(1)}MB video. Please choose a shorter clip under 4MB or paste an external video URL.`);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read video file from device.'));
    reader.readAsDataURL(file);
  });
}

export function captureVideoPoster(src: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    // CRITICAL: NEVER set crossOrigin on blob: or data: URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      video.crossOrigin = 'anonymous';
    }

    let finished = false;
    const finish = (result: string) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        video.remove();
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish('');
    }, 4500);

    const tryDraw = () => {
      try {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          const maxDim = 640;
          let w = video.videoWidth;
          let h = video.videoHeight;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const thumb = canvas.toDataURL('image/jpeg', 0.70);
            finish(thumb);
            return;
          }
        }
      } catch (e) {
        console.warn('Canvas poster capture exception:', e);
      }
    };

    video.onseeked = tryDraw;
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
      } catch (_) {
        tryDraw();
      }
    };
    video.onerror = () => finish('');
    video.src = src;
  });
}

function getVideoMetadata(src: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      video.crossOrigin = 'anonymous';
    }

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration || 0,
        width: video.videoWidth || 480,
        height: video.videoHeight || 360,
      });
      video.remove();
    };
    video.onerror = () => {
      resolve({ duration: 0, width: 480, height: 360 });
      video.remove();
    };
    video.src = src;
  });
}

async function compressVideoToLoop(
  file: File,
  maxDurationSec: number,
  maxDimension: number,
  onProgress?: (status: string) => void
): Promise<VideoProcessingResult> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(video);
    }

    let timeoutId: NodeJS.Timeout;
    let animationFrameId: number;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      URL.revokeObjectURL(blobUrl);
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (_) {}
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };

    // Safety timeout after 15 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Video processing timed out.'));
    }, 15000);

    video.onloadeddata = async () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;

        // Scale resolution down if it exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        // Ensure even dimensions for video codecs
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          cleanup();
          const fallbackDataUrl = await readFileAsDataUrl(file);
          resolve({ dataUrl: fallbackDataUrl, duration: video.duration || 0, width, height, sizeBytes: file.size });
          return;
        }

        // Capture first frame as thumbnail
        ctx.drawImage(video, 0, 0, width, height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.65);

        // Determine supported recording mimeType
        let mimeType = 'video/webm;codecs=vp8';
        if (typeof MediaRecorder !== 'undefined') {
          const candidates = [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
          ];
          for (const cand of candidates) {
            if (MediaRecorder.isTypeSupported(cand)) {
              mimeType = cand;
              break;
            }
          }
        }

        const stream = canvas.captureStream(24);
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 500_000, // 500 kbps for ~250KB 4s clip
          });
        } catch (_) {
          recorder = new MediaRecorder(stream);
        }

        const recordedChunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        const rawDuration = video.duration;
        const targetDuration = (rawDuration && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0)
          ? Math.min(rawDuration, maxDurationSec)
          : maxDurationSec;

        recorder.onstop = async () => {
          cleanup();

          const recordedBlob = new Blob(recordedChunks, { type: mimeType });
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({
              dataUrl,
              thumbnailUrl,
              duration: targetDuration,
              width,
              height,
              sizeBytes: recordedBlob.size,
            });
          };
          reader.onerror = () => {
            reject(new Error('Failed to encode optimized looping video.'));
          };
          reader.readAsDataURL(recordedBlob);
        };

        const renderFrame = () => {
          if (video.currentTime >= targetDuration || video.ended) {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          animationFrameId = requestAnimationFrame(renderFrame);
        };

        recorder.start(100);
        video.currentTime = 0;
        try {
          await video.play();
        } catch (_) {}
        renderFrame();
      } catch (procErr: any) {
        cleanup();
        reject(procErr);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video file.'));
    };

    // Set src AFTER listeners are registered
    video.src = blobUrl;
  });
}
