/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryPartner, Order, Kitchen } from '../types';
import { calculateHaversineDistanceKm } from './googleMaps';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Finds the nearest idle rider based on genuine GPS distance from fulfilling branch.
 */
export function findNearestIdleRider(
  kitchenCoords: { lat: number; lng: number },
  riders: DeliveryPartner[]
): { rider: DeliveryPartner; distanceKm: number } | null {
  if (!riders || riders.length === 0) return null;

  // Active riders who are not banned
  const activeRiders = riders.filter(r => r.status === 'active' && !r.banned);
  if (activeRiders.length === 0) return null;

  // Prioritize idle riders (no current assigned order)
  const idleRiders = activeRiders.filter(r => !r.currentOrderId || r.currentOrderId === '');
  const candidatePool = idleRiders.length > 0 ? idleRiders : activeRiders;

  let bestRider: DeliveryPartner | null = null;
  let minDistance = Infinity;

  for (const rider of candidatePool) {
    const rLat = rider.currentLat || (rider as any).lat || (kitchenCoords.lat + 0.008);
    const rLng = rider.currentLng || (rider as any).lng || (kitchenCoords.lng + 0.006);

    const dist = calculateHaversineDistanceKm(
      kitchenCoords.lat,
      kitchenCoords.lng,
      rLat,
      rLng
    );

    if (dist < minDistance) {
      minDistance = dist;
      bestRider = rider;
    }
  }

  if (!bestRider) return null;
  return {
    rider: bestRider,
    distanceKm: Number(minDistance.toFixed(2))
  };
}

/**
 * Automated Proximity Dispatch:
 * Pings and broadcasts dispatch to the nearest idle rider based on GPS distance
 * from the fulfilling branch as soon as the order reaches "Plated & Packed".
 */
export async function autoDispatchPlatedOrder(
  order: Order,
  kitchen: { id: string; name: string; address: string; lat: number; lng: number },
  riders: DeliveryPartner[]
): Promise<{ success: boolean; rider?: DeliveryPartner; distanceKm?: number; error?: string }> {
  try {
    const kitchenCoords = {
      lat: kitchen.lat || 26.1209,
      lng: kitchen.lng || 85.3647
    };

    const match = findNearestIdleRider(kitchenCoords, riders);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const existingSteps = Array.isArray(order.trackingSteps) ? [...order.trackingSteps] : [];

    if (match) {
      const { rider, distanceKm } = match;

      const newStep = {
        title: 'Auto-Dispatched to Nearest Courier',
        description: `Proximity dispatch broadcasted to ${rider.name} (${distanceKm} km from ${kitchen.name}).`,
        done: true,
        time: nowTime
      };

      const updatePayload = {
        status: 'ready_for_pickup',
        kdsStage: 'plated',
        platedAt: nowIso,
        deliveryPartnerId: rider.id,
        deliveryPartnerName: rider.name,
        deliveryPartnerPhone: rider.phone,
        deliveryVehicleNumber: rider.vehicleNumber || 'FZ-EV-01',
        deliveryPartnerVehicle: rider.vehicleType || 'bike',
        dispatchProximityKm: distanceKm,
        autoDispatched: true,
        dispatchStatus: 'dispatched_to_nearest',
        dispatchBroadcastAt: nowIso,
        trackingSteps: [...existingSteps, newStep]
      };

      // 1. Update order document
      await updateDoc(doc(db, 'orders', order.id), updatePayload);

      // 2. Update rider document with current order
      try {
        await updateDoc(doc(db, 'delivery_partners', rider.id), {
          currentOrderId: order.id,
          lastDispatchedAt: nowIso
        });
      } catch (err) {
        console.warn("Could not update delivery_partner currentOrderId:", err);
      }

      // 3. Record dispatch notification broadcast
      try {
        await addDoc(collection(db, 'dispatch_broadcasts'), {
          orderId: order.id,
          partnerId: rider.id,
          partnerName: rider.name,
          kitchenId: kitchen.id,
          kitchenName: kitchen.name,
          distanceKm,
          status: 'broadcasted',
          createdAt: nowIso
        });
      } catch (e) {}

      return {
        success: true,
        rider,
        distanceKm
      };
    } else {
      // No rider available right now, still mark ready for pickup
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'ready_for_pickup',
        kdsStage: 'plated',
        platedAt: nowIso,
        dispatchStatus: 'pending_dispatch'
      });

      return {
        success: false,
        error: 'No active fleet couriers online for automated proximity dispatch'
      };
    }
  } catch (error: any) {
    console.error("Failed automated proximity dispatch:", error);
    return {
      success: false,
      error: error?.message || 'Proximity dispatch failed'
    };
  }
}
