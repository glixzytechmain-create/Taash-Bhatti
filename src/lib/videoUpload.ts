/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Video Upload & Client-Side Loop Optimization Utility
 * - Reads video files (.mp4, .webm, .mov) directly from user devices
 * - Auto-optimizes long/heavy videos into lightweight silent food loops
 * - Supports direct Data URLs and URL fallbacks
 */

export interface VideoProcessingResult {
  dataUrl: string;
  duration: number;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Reads a video file from device into a Base64 Data URL.
 * If the file is small (<= 1.2MB), reads it directly.
 * If larger, attempts client-side canvas loop recording (first 4 seconds, silent, 480p)
 * to keep payload within Firestore and browser performance thresholds.
 */
export async function processVideoFile(
  file: File,
  maxDurationSec: number = 4,
  maxDimension: number = 480,
  onProgress?: (status: string) => void
): Promise<VideoProcessingResult> {
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|ogg|m4v)$/i)) {
    throw new Error('Please select a valid video file (.mp4, .webm, or .mov).');
  }

  // 1. If video is already very lightweight (under 1.2 MB), read directly as Data URL
  if (file.size <= 1.2 * 1024 * 1024) {
    onProgress?.('Reading lightweight video clip...');
    const dataUrl = await readFileAsDataUrl(file);
    const meta = await getVideoMetadata(dataUrl);
    return {
      dataUrl,
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
    // If MediaRecorder is unsupported and file is under 3MB, fallback to direct reading
    if (file.size <= 3 * 1024 * 1024) {
      const dataUrl = await readFileAsDataUrl(file);
      const meta = await getVideoMetadata(dataUrl);
      return {
        dataUrl,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
      };
    }
    throw new Error(`Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a clip under 3MB or paste a video URL.`);
  }

  // 3. Compress video into a silent, high-efficiency 4-second loop
  onProgress?.('Extracting silent looping preview...');
  return compressVideoToLoop(file, maxDurationSec, maxDimension, onProgress);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read video file from device.'));
    reader.readAsDataURL(file);
  });
}

function getVideoMetadata(src: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
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
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(blobUrl);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };

    // Safety timeout after 15 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      // If compression timed out, try falling back to direct read if under 3MB
      if (file.size <= 3 * 1024 * 1024) {
        readFileAsDataUrl(file)
          .then((dataUrl) => resolve({ dataUrl, duration: 0, width: 480, height: 360, sizeBytes: file.size }))
          .catch(reject);
      } else {
        reject(new Error('Video processing timed out. Please select a shorter clip or paste a video URL.'));
      }
    }, 15000);

    video.onloadedmetadata = async () => {
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

        // Determine supported recording mimeType
        let mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
        }

        const stream = canvas.captureStream(24);
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 600_000, // 600 kbps for ~300KB 4s clip
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

        const targetDuration = Math.min(video.duration || maxDurationSec, maxDurationSec);
        let animationFrameId: number;

        recorder.onstop = async () => {
          cancelAnimationFrame(animationFrameId);
          cleanup();

          const recordedBlob = new Blob(recordedChunks, { type: mimeType });
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({
              dataUrl,
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
        await video.play();
        renderFrame();
      } catch (procErr: any) {
        cleanup();
        console.warn('Video loop compression exception:', procErr);
        // Fallback to direct file read if under 3MB
        if (file.size <= 3 * 1024 * 1024) {
          const directDataUrl = await readFileAsDataUrl(file);
          resolve({ dataUrl: directDataUrl, duration: 0, width: 480, height: 360, sizeBytes: file.size });
        } else {
          reject(procErr);
        }
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not decode video file. Please ensure it is a valid MP4 or WebM video.'));
    };
  });
}
