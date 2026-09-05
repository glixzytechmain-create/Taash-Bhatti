/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OfflineDeliveryRecord } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const QUEUE_STORAGE_KEY = 'fitzaika_rider_offline_queue';

export function getOfflineQueue(): OfflineDeliveryRecord[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse offline sync queue:", e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineDeliveryRecord[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn("Failed to persist offline sync queue:", e);
  }
}

export function enqueueOfflineDelivery(
  record: Omit<OfflineDeliveryRecord, 'id' | 'synced' | 'queuedAt'>
): OfflineDeliveryRecord {
  const queue = getOfflineQueue();
  const newItem: OfflineDeliveryRecord = {
    ...record,
    id: `offline-sync-${record.orderId}-${Date.now()}`,
    synced: false,
    queuedAt: new Date().toISOString()
  };

  const updatedQueue = [...queue.filter(q => q.orderId !== record.orderId), newItem];
  saveOfflineQueue(updatedQueue);
  return newItem;
}

export function removeOfflineQueueItem(orderId: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter(q => q.orderId !== orderId);
  saveOfflineQueue(filtered);
}

/**
 * Iterates through pending offline deliveries and flushes them to Firestore.
 */
export async function flushOfflineSyncQueue(): Promise<{ syncedCount: number; failedCount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue: OfflineDeliveryRecord[] = [];

  for (const item of queue) {
    try {
      const orderRef = doc(db, 'orders', item.orderId);
      const updatePayload: any = {
        status: 'delivered',
        kdsStage: 'delivered',
        kdsPickupStage: 'delivered',
        deliveredAt: item.deliveredAt || new Date().toISOString(),
        deliveryNotes: item.deliveryNote || 'Delivered with offline cached OTP verification',
        offlineSyncedAt: new Date().toISOString()
      };

      if (item.cashCollected && item.cashCollected > 0) {
        updatePayload.paymentStatus = 'collected';
        updatePayload.cashCollectedAmount = item.cashCollected;
        updatePayload.collectedPaymentMethod = item.paymentMethod || 'cash';
        updatePayload.paymentCollectedAt = item.deliveredAt;
      }

      await updateDoc(orderRef, updatePayload);

      // Also update delivery partner stats if partnerId is present
      if (item.partnerId) {
        try {
          const partnerRef = doc(db, 'delivery_partners', item.partnerId);
          await updateDoc(partnerRef, {
            status: 'active',
            currentOrderId: null
          });
        } catch (e) {}
      }

      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync offline item for order ${item.orderId}:`, err);
      failedCount++;
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);
  return { syncedCount, failedCount };
}
