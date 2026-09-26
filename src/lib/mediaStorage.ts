/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Taash Bhatti Dish Media Storage Engine
 * - Photos: Auto-compressed to lightweight WebP/JPEG Data URLs (~30-50 KB) for direct Firestore storage
 * - Videos: Uploaded directly to Firebase Storage CDN (taash-bhatti.firebasestorage.app)
 * - Automatic poster thumbnail extraction via HTML5 Canvas
 * - Seamless fallback handling if Firebase Storage bucket is pending activation
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { compressImageFile } from './imageUpload';
import { captureVideoPoster } from './videoUpload';

export interface VideoUploadResult {
  url: string;
  thumbnailUrl: string;
  storageType: 'firebase_storage' | 'direct_url' | 'data_url';
  fileName: string;
  sizeBytes: number;
}

/**
 * Uploads a dish photo. Compresses client-side to ~35-50KB for 100% reliable, zero-latency Firestore storage.
 */
export async function uploadDishImageToFirestore(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPEG, PNG, WebP).');
  }
  // Target 800px max dimension, quality 0.72 -> produces crisp ~35-50KB JPEGs
  return await compressImageFile(file, 800, 0.72);
}

/**
 * Uploads a dish video.
 * Primary target: Firebase Storage CDN (supports high-definition videos of any size).
 * Also captures an instant canvas poster frame thumbnail.
 */
export async function uploadDishVideo(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<VideoUploadResult> {
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i)) {
    throw new Error('Please select a valid video file (.mp4, .webm, or .mov).');
  }

  onProgress?.(5, 'Extracting video preview thumbnail...');

  // 1. Create a local blob URL to capture the poster frame thumbnail
  const blobUrl = URL.createObjectURL(file);
  let thumbnailUrl = '';
  try {
    thumbnailUrl = await captureVideoPoster(blobUrl);
  } catch (thumbErr) {
    console.warn('[MediaStorage] Poster thumbnail capture note:', thumbErr);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  // 2. Upload to Firebase Storage
  if (storage) {
    try {
      onProgress?.(15, 'Preparing Firebase Storage upload...');
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `dish_media/videos/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: file.type || 'video/mp4',
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress?.(
              Math.max(15, progress),
              `Uploading video to Firebase Storage (${progress}%)...`
            );
          },
          (err) => {
            console.error('[MediaStorage] Firebase Storage Upload Error:', err);
            reject(err);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      onProgress?.(100, 'Video uploaded successfully!');

      return {
        url: downloadUrl,
        thumbnailUrl: thumbnailUrl || '',
        storageType: 'firebase_storage',
        fileName: file.name,
        sizeBytes: file.size,
      };
    } catch (storageErr: any) {
      console.error('[MediaStorage] Firebase Storage upload error:', storageErr);
      
      // If file is very small (<= 1.5MB), safely fallback to direct data URL for immediate testing
      if (file.size <= 1.5 * 1024 * 1024) {
        onProgress?.(90, 'Reading small video clip...');
        const dataUrl = await readFileAsDataUrl(file);
        return {
          url: dataUrl,
          thumbnailUrl: thumbnailUrl || '',
          storageType: 'data_url',
          fileName: file.name,
          sizeBytes: file.size,
        };
      }

      const friendlyMsg = storageErr?.message || storageErr?.code || 'Failed to upload video to Firebase Storage.';
      throw new Error(`Video upload error: ${friendlyMsg}`);
    }
  }

  // Fallback if storage SDK is unavailable
  if (file.size <= 1.2 * 1024 * 1024) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      url: dataUrl,
      thumbnailUrl: thumbnailUrl || '',
      storageType: 'data_url',
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  throw new Error(
    `Video file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To upload videos of any size, please activate Firebase Storage in the Firebase Console.`
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file from device.'));
    reader.readAsDataURL(file);
  });
}
