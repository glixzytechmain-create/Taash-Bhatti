/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppFeatureFlags } from '../types';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_STORAGE_KEY = 'taash_bhatti_feature_flags';
const EVENT_NAME = 'taash_feature_flags_changed';
const CHANNEL_NAME = 'taash_feature_flags_channel';

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
    bhattis: false,
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
  // 1. Save to local storage cache immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
  } catch (e) {}

  // 2. Dispatch in-browser custom event for instant same-tab reflection
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: flags }));
    } catch (e) {}

    // 3. Broadcast across all active tabs in this browser instance
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage(flags);
        bc.close();
      } catch (e) {}
    }
  }

  // 4. Persist to Firestore for global cloud sync to all active customers and portals
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

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<AppFeatureFlags>;
    if (custom && custom.detail) {
      onChange(custom.detail);
    } else {
      onChange(getLocalFeatureFlags());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY) {
      onChange(getLocalFeatureFlags());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  let broadcastChannel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event && event.data) {
          onChange(event.data);
        }
      };
    } catch (e) {}
  }

  let unsubscribeFirestore = () => {};
  try {
    const flagsRef = doc(db, 'app_settings', 'feature_flags');
    unsubscribeFirestore = onSnapshot(
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
  } catch (e) {}

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch (e) {}
    }
    unsubscribeFirestore();
  };
}
