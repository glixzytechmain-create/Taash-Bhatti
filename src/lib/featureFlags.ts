/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppFeatureFlags } from '../types';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_STORAGE_KEY = 'taash_bhatti_feature_flags';

export const DEFAULT_FEATURE_FLAGS: AppFeatureFlags = {
  enableMenuTab: true,
  enableDealsTab: true,
  enableWalletSection: true,
  enableKitchensTab: true,
  enableTakeawayOrdering: true,
  enableDeliveryOrdering: true,
  enableCoupons: true,
  acceptingOrders: true,
  closedOrderMessage: 'TAASH BHATTI is temporarily paused for new orders. Please check back shortly!',
  maintenanceMode: false,
  maintenanceMessage: 'TAASH BHATTI is currently performing kitchen maintenance. Orders will reopen shortly.',
  disabledCategories: [],
  disabledDishIds: [],
  tabDisables: {
    deck: true,
    gyms: true,
  },
  headerComponents: {
    logo: true,
    location: true,
    deck: true,
    notifications: true,
    mailbox: true,
    cart: true,
    progressBar: true,
  },
};

export function getLocalFeatureFlags(): AppFeatureFlags {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(cached) };
    }
  } catch (e) {
    console.warn('Could not read cached feature flags:', e);
  }
  return DEFAULT_FEATURE_FLAGS;
}

export const getStoredFeatureFlags = getLocalFeatureFlags;

export async function saveFeatureFlags(flags: AppFeatureFlags): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
  } catch (e) {}

  try {
    const flagsRef = doc(db, 'app_settings', 'feature_flags');
    await setDoc(flagsRef, flags, { merge: true });
  } catch (err) {
    console.warn('Could not save feature flags to Firestore:', err);
  }
}

export function subscribeFeatureFlags(onChange: (flags: AppFeatureFlags) => void): () => void {
  // Emit local cache immediately
  onChange(getLocalFeatureFlags());

  try {
    const flagsRef = doc(db, 'app_settings', 'feature_flags');
    const unsubscribe = onSnapshot(
      flagsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<AppFeatureFlags>;
          const merged: AppFeatureFlags = { ...DEFAULT_FEATURE_FLAGS, ...data };
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          onChange(merged);
        }
      },
      (error) => {
        console.warn('Feature flags snapshot listener offline fallback:', error);
      }
    );
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}
