/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bulletproof Multi-Layer Tour Persistence for Devices
 * Ensures the interactive guided tour displays strictly ONCE per device/browser.
 * Uses localStorage with multiple redundant keys + persistent cookie fallback.
 */

const TOUR_STORAGE_KEYS = [
  'tb_guided_tour_completed_v1',
  'tb_guided_tour_completed',
  'taash_app_tour_seen',
] as const;

const COOKIE_NAME = 'tb_guided_tour_completed';

export function hasSeenTourOnDevice(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Check primary and fallback localStorage keys
    for (const key of TOUR_STORAGE_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val === 'true' || val === '1') {
        return true;
      }
    }
  } catch (e) {
    // LocalStorage might throw in restricted/sandboxed webviews
  }

  try {
    // 2. Check persistent cookie fallback
    if (typeof document !== 'undefined' && document.cookie) {
      if (document.cookie.includes(`${COOKIE_NAME}=true`) || document.cookie.includes(`${COOKIE_NAME}=1`)) {
        return true;
      }
    }
  } catch (e) {}

  try {
    // 3. Check sessionStorage fallback
    if (window.sessionStorage.getItem('tb_guided_tour_completed') === 'true') {
      return true;
    }
  } catch (e) {}

  return false;
}

export function markTourCompletedOnDevice(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Write all localStorage keys
    for (const key of TOUR_STORAGE_KEYS) {
      window.localStorage.setItem(key, 'true');
    }
  } catch (e) {
    console.warn('Could not persist tour completion to localStorage:', e);
  }

  try {
    // 2. Write persistent cookie (1 year duration, SameSite Lax)
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=true; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch (e) {}

  try {
    // 3. Write sessionStorage
    window.sessionStorage.setItem('tb_guided_tour_completed', 'true');
  } catch (e) {}
}

export function resetTourOnDevice(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of TOUR_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}

  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  } catch (e) {}

  try {
    window.sessionStorage.removeItem('tb_guided_tour_completed');
  } catch (e) {}
}
