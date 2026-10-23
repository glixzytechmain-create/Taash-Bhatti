import { loadGoogleMaps } from './googleMaps';
import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  increment 
} from 'firebase/firestore';
import { 
  Order, 
  DeliveryPartner, 
  RiderTripLog, 
  RiderDistanceAnalytics 
} from '../types';

// =========================================================================
// 1. VEHICLE FUEL & LOGISTICS ALLOWANCE RATES
// =========================================================================
export const VEHICLE_FUEL_RATES: Record<string, number> = {
  bike: 3.50,          // ₹3.50/km petrol 2-wheeler
  scooter: 3.20,       // ₹3.20/km petrol scooter
  ev_two_wheeler: 1.50,// ₹1.50/km electric vehicle charging allowance
  bicycle: 1.00,       // ₹1.00/km green fitness bonus
  car: 7.00,           // ₹7.00/km delivery van/car
};

export function getVehicleFuelRate(vehicleType?: string): number {
  if (!vehicleType) return 3.50;
  return VEHICLE_FUEL_RATES[vehicleType] || 3.50;
}

// =========================================================================
// 2. HIGH-PRECISION MATHEMATICAL UTILITIES
// =========================================================================

/**
 * Standard Haversine formula to compute great-circle distance in kilometers.
 */
export function calculateHaversineKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =========================================================================
// 3. GOOGLE MAPS TURN-BY-TURN ROAD DISTANCE RESOLVER
// =========================================================================

export interface RoadDistanceResult {
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  polyline: [number, number][];
  isFromGoogleMaps: boolean;
}

/**
 * Fetches turn-by-turn road driving distance (in km) between Bhatti origin
 * and Customer destination using Google Maps DirectionsService.
 * Includes a resilient fallback to high-precision urban tortuosity (1.28x)
 * if network or API quotas are constrained.
 */
export async function fetchGoogleRoadDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RoadDistanceResult> {
  try {
    const gMaps = await loadGoogleMaps();
    if (gMaps && gMaps.DirectionsService) {
      const directionsService = new gMaps.DirectionsService();

      const response = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
        directionsService.route(
          {
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: gMaps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === gMaps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          }
        );
      });

      if (
        response && 
        response.routes && 
        response.routes[0] && 
        response.routes[0].legs && 
        response.routes[0].legs[0]
      ) {
        const leg = response.routes[0].legs[0];
        const distKm = Number(((leg.distance?.value || 0) / 1000).toFixed(2));
        const durSec = leg.duration?.value || 0;
        const durationMinutes = Math.max(1, Math.round(durSec / 60));
        const durationText = leg.duration?.text || `${durationMinutes} mins`;

        const polylinePts: [number, number][] = [];
        if (response.routes[0].overview_path) {
          response.routes[0].overview_path.forEach((pt: any) => {
            const lat = typeof pt.lat === 'function' ? pt.lat() : pt.lat;
            const lng = typeof pt.lng === 'function' ? pt.lng() : pt.lng;
            polylinePts.push([lat, lng]);
          });
        }

        return {
          distanceKm: distKm > 0 ? distKm : Number((calculateHaversineKm(origin.lat, origin.lng, destination.lat, destination.lng) * 1.28).toFixed(2)),
          durationText,
          durationMinutes,
          polyline: polylinePts,
          isFromGoogleMaps: true,
        };
      }
    }
  } catch (err) {
    console.warn("Google Maps Directions API unavailable, using urban routing tortuosity fallback:", err);
  }

  // Reliable Fallback: Haversine * 1.28 urban routing tortuosity factor (standard in Indian Tier-2 city roads)
  const straightLine = calculateHaversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const roadKm = Number((straightLine * 1.28).toFixed(2));
  const estimatedMins = Math.max(3, Math.round(roadKm * 3.5)); // ~17 km/h urban transit

  return {
    distanceKm: roadKm,
    durationText: `${estimatedMins} mins`,
    durationMinutes: estimatedMins,
    polyline: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
    isFromGoogleMaps: false,
  };
}

// =========================================================================
// 4. REAL-TIME JITTER-FILTERED GPS ODOMETER ENGINE
// =========================================================================

export interface ActiveOdometerData {
  orderId: string;
  partnerId: string;
  startedAt: string;
  accumulatedMeters: number;
  lastLat: number | null;
  lastLng: number | null;
  lastTimestamp: number;
  pointsCount: number;
  currentSpeedKmh: number;
  isSimulated?: boolean;
}

const STORAGE_PREFIX = 'taashbhatti_odometer_v2_';

export function getActiveOdometer(orderId: string): ActiveOdometerData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${orderId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function initActiveOdometer(
  orderId: string, 
  partnerId: string, 
  initialCoords?: { lat: number; lng: number }
): ActiveOdometerData {
  const existing = getActiveOdometer(orderId);
  if (existing) return existing;

  const initial: ActiveOdometerData = {
    orderId,
    partnerId,
    startedAt: new Date().toISOString(),
    accumulatedMeters: 0,
    lastLat: initialCoords ? initialCoords.lat : null,
    lastLng: initialCoords ? initialCoords.lng : null,
    lastTimestamp: Date.now(),
    pointsCount: initialCoords ? 1 : 0,
    currentSpeedKmh: 0,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${orderId}`, JSON.stringify(initial));
    } catch (e) {}
  }

  return initial;
}

/**
 * Updates the rider odometer with the latest GPS coordinate.
 * Applies anti-jitter filter to ignore GPS drift when stationary.
 */
export function updateActiveOdometer(
  orderId: string,
  coords: { lat: number; lng: number; accuracy?: number; speed?: number }
): { 
  odometer: ActiveOdometerData; 
  accepted: boolean; 
  distanceKm: number; 
  rejectReason?: string 
} {
  let state = getActiveOdometer(orderId);
  if (!state) {
    state = initActiveOdometer(orderId, 'unknown_partner', { lat: coords.lat, lng: coords.lng });
    return { odometer: state, accepted: true, distanceKm: 0 };
  }

  // 1. Accuracy Filter: discard noisy pings (> 35 meters accuracy)
  if (coords.accuracy !== undefined && coords.accuracy > 35) {
    return {
      odometer: state,
      accepted: false,
      distanceKm: Number((state.accumulatedMeters / 1000).toFixed(2)),
      rejectReason: 'Accuracy too low (> 35m)',
    };
  }

  const now = Date.now();
  if (state.lastLat === null || state.lastLng === null) {
    state.lastLat = coords.lat;
    state.lastLng = coords.lng;
    state.lastTimestamp = now;
    state.pointsCount = 1;
    saveOdometer(state);
    return { odometer: state, accepted: true, distanceKm: 0 };
  }

  // Calculate delta distance from last accepted point
  const deltaKm = calculateHaversineKm(state.lastLat, state.lastLng, coords.lat, coords.lng);
  const deltaMeters = deltaKm * 1000;
  const elapsedSeconds = Math.max(1, (now - state.lastTimestamp) / 1000);
  const calculatedSpeedKmh = (deltaKm / (elapsedSeconds / 3600));

  // 2. Stationary Drift Filter:
  // If displacement < 10 meters AND speed < 1 m/s (3.6 km/h), rider is stationary waiting at signal or kitchen.
  // Do NOT accumulate phantom drift distance!
  if (deltaMeters < 10 && (coords.speed === undefined || coords.speed < 1.0)) {
    return {
      odometer: state,
      accepted: false,
      distanceKm: Number((state.accumulatedMeters / 1000).toFixed(2)),
      rejectReason: 'Stationary drift ignored (< 10m)',
    };
  }

  // 3. Teleportation / Glitch Filter:
  // If velocity > 120 km/h or delta > 2500m in a few seconds, discard spike
  if (calculatedSpeedKmh > 120 || deltaMeters > 2500) {
    return {
      odometer: state,
      accepted: false,
      distanceKm: Number((state.accumulatedMeters / 1000).toFixed(2)),
      rejectReason: 'GPS jump spike ignored (> 120 km/h)',
    };
  }

  // Valid, genuine transit movement!
  state.accumulatedMeters += deltaMeters;
  state.lastLat = coords.lat;
  state.lastLng = coords.lng;
  state.lastTimestamp = now;
  state.pointsCount += 1;
  state.currentSpeedKmh = Math.round(
    coords.speed !== undefined && coords.speed !== null && coords.speed >= 0
      ? coords.speed * 3.6
      : calculatedSpeedKmh
  );

  saveOdometer(state);

  return {
    odometer: state,
    accepted: true,
    distanceKm: Number((state.accumulatedMeters / 1000).toFixed(2)),
  };
}

function saveOdometer(state: ActiveOdometerData): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${state.orderId}`, JSON.stringify(state));
    } catch (e) {}
  }
}

export function clearActiveOdometer(orderId: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${orderId}`);
    } catch (e) {}
  }
}

// =========================================================================
// 5. TRIP LOG PERSISTENCE & CLOUD LEDGER
// =========================================================================

export interface CompleteTripParams {
  order: Order;
  partner: DeliveryPartner;
  kitchenCoords?: { lat: number; lng: number };
  customerCoords?: { lat: number; lng: number };
  customRoadDistanceKm?: number;
  customActualDistanceKm?: number;
}

/**
 * Finalizes and records the trip log to Firestore upon delivery OTP completion.
 * Updates order fields, saves trip log document, and updates partner rolling metrics.
 */
export async function finalizeAndRecordTrip(
  params: CompleteTripParams
): Promise<RiderTripLog> {
  const { order, partner, kitchenCoords, customerCoords } = params;

  // 1. Resolve road distance
  const kLat = kitchenCoords?.lat || order.acceptedKitchenLat || 26.1209;
  const kLng = kitchenCoords?.lng || order.acceptedKitchenLng || 85.3647;
  const cLat = customerCoords?.lat || order.deliveryLat || 26.1345;
  const cLng = customerCoords?.lng || order.deliveryLng || 85.3854;

  let roadKm = params.customRoadDistanceKm;
  if (!roadKm || roadKm <= 0) {
    const roadRes = await fetchGoogleRoadDistance({ lat: kLat, lng: kLng }, { lat: cLat, lng: cLng });
    roadKm = roadRes.distanceKm;
  }

  // 2. Resolve actual GPS odometer distance
  const odo = getActiveOdometer(order.id);
  const actualKm = params.customActualDistanceKm !== undefined
    ? params.customActualDistanceKm
    : (odo && odo.accumulatedMeters > 0 
        ? Number((odo.accumulatedMeters / 1000).toFixed(2)) 
        : roadKm);

  // 3. Billable distance (standard commercial practice: max of planned road km or actual tracked km)
  const billableDistanceKm = Math.max(roadKm, actualKm);

  // 4. Durations
  const startTime = odo?.startedAt || order.createdAt || new Date(Date.now() - 15 * 60000).toISOString();
  const deliveredTime = new Date().toISOString();
  const durationMs = Math.max(60000, new Date(deliveredTime).getTime() - new Date(startTime).getTime());
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  const avgSpeedKmh = Math.round((billableDistanceKm / (durationMinutes / 60)) || 18);

  // 5. Route Efficiency (Planned / Actual * 100, capped between 40% and 100%)
  const efficiency = actualKm > 0
    ? Math.min(100, Math.max(40, Math.round((roadKm / actualKm) * 100)))
    : 100;

  // 6. Fuel / Vehicle Reimbursement Allowance
  const fuelRate = getVehicleFuelRate(partner.vehicleType);
  const fuelAllowance = Number((billableDistanceKm * fuelRate).toFixed(2));

  const tripId = `trip_${order.id}`;

  const tripLog: RiderTripLog = {
    id: tripId,
    orderId: order.id,
    partnerId: partner.id,
    partnerName: partner.name,
    partnerPhone: partner.phone,
    vehicleType: partner.vehicleType || 'bike',
    vehicleNumber: partner.vehicleNumber || 'BR-06-TB-2026',
    kitchenId: order.acceptedByKitchenId || partner.kitchenId || 'k1',
    kitchenName: order.acceptedKitchenName || partner.kitchenName || 'Bhatti Main Kitchen',
    kitchenLat: kLat,
    kitchenLng: kLng,
    customerAddress: order.address || 'Customer Location',
    customerLat: cLat,
    customerLng: cLng,
    plannedRoadDistanceKm: roadKm,
    actualGpsDistanceKm: actualKm,
    billableDistanceKm,
    routeEfficiencyPercent: efficiency,
    startedAt: startTime,
    deliveredAt: deliveredTime,
    durationMinutes,
    avgSpeedKmh,
    fuelAllowance,
    tipEarned: order.riderTip || 0,
    orderTotal: order.total,
    paymentMode: order.paymentMethod || (order.isCOD ? 'Cash on Delivery' : 'Online'),
    status: 'completed',
  };

  // 7. Write to Firestore in background
  try {
    // A. Subcollection inside delivery partner
    const partnerTripRef = doc(db, 'delivery_partners', partner.id, 'trip_logs', order.id);
    await setDoc(partnerTripRef, tripLog);

    // B. Global trips collection for fleet-wide analytics
    const globalTripRef = doc(db, 'rider_trip_logs', order.id);
    await setDoc(globalTripRef, tripLog);

    // C. Update Order document with trip metrics
    const orderRef = doc(db, 'orders', order.id);
    await updateDoc(orderRef, {
      roadDistanceKm: roadKm,
      actualTrackedKm: actualKm,
      tripDurationMinutes: durationMinutes,
      tripEfficiencyPercent: efficiency,
    });

    // D. Increment rolling totals on the delivery partner document
    const partnerRef = doc(db, 'delivery_partners', partner.id);
    await updateDoc(partnerRef, {
      totalDistanceKm: increment(billableDistanceKm),
      todayDistanceKm: increment(billableDistanceKm),
      weekDistanceKm: increment(billableDistanceKm),
      monthDistanceKm: increment(billableDistanceKm),
      lifetimeFuelAllowance: increment(fuelAllowance),
      fuelAllowanceEarnedToday: increment(fuelAllowance),
    });
  } catch (err) {
    console.warn("Error persisting trip log to Firestore:", err);
  }

  // Clear local odometer for this order
  clearActiveOdometer(order.id);

  return tripLog;
}

// =========================================================================
// 6. REAL-TIME TRIP LOGS RETRIEVAL & ANALYTICS COMPUTATION
// =========================================================================

/**
 * Fetches recent trip logs for a delivery partner from Firestore.
 */
export async function fetchRiderTripLogs(
  partnerId: string, 
  maxCount = 50
): Promise<RiderTripLog[]> {
  try {
    const tripCol = collection(db, 'delivery_partners', partnerId, 'trip_logs');
    const q = query(tripCol, orderBy('deliveredAt', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);

    const logs: RiderTripLog[] = [];
    snapshot.forEach((d) => {
      logs.push(d.data() as RiderTripLog);
    });
    return logs;
  } catch (err) {
    console.warn("Could not query partner trip logs:", err);
    return [];
  }
}

/**
 * Calculates daily, weekly, monthly, and lifetime rollups from trip logs.
 */
export function calculateRiderAnalytics(
  trips: RiderTripLog[],
  partner?: DeliveryPartner | null
): RiderDistanceAnalytics {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 7 days ago timestamp
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  // 30 days ago timestamp
  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);

  let todayKm = 0;
  let todayTrips = 0;
  let todayMins = 0;
  let todayFuel = 0;

  let weekKm = 0;
  let weekTrips = 0;
  let weekFuel = 0;

  let monthKm = 0;
  let monthTrips = 0;
  let monthFuel = 0;

  let lifetimeKm = 0;
  let lifetimeTrips = 0;
  let lifetimeFuel = 0;

  let totalEfficiencySum = 0;

  for (const t of trips) {
    const tDate = new Date(t.deliveredAt);
    const dateStr = t.deliveredAt.split('T')[0];
    const dist = t.billableDistanceKm || t.plannedRoadDistanceKm || 0;
    const fuel = t.fuelAllowance || 0;
    const dur = t.durationMinutes || 0;

    // Lifetime
    lifetimeKm += dist;
    lifetimeTrips += 1;
    lifetimeFuel += fuel;
    totalEfficiencySum += (t.routeEfficiencyPercent || 100);

    // Month
    if (tDate >= monthAgo) {
      monthKm += dist;
      monthTrips += 1;
      monthFuel += fuel;
    }

    // Week
    if (tDate >= weekAgo) {
      weekKm += dist;
      weekTrips += 1;
      weekFuel += fuel;
    }

    // Today
    if (dateStr === todayStr) {
      todayKm += dist;
      todayTrips += 1;
      todayMins += dur;
      todayFuel += fuel;
    }
  }

  // Fallback to partner document totals if trips array is empty or freshly initialized
  if (partner) {
    if (todayKm === 0 && (partner.todayDistanceKm || 0) > 0) {
      todayKm = partner.todayDistanceKm || 0;
      todayFuel = partner.fuelAllowanceEarnedToday || (todayKm * getVehicleFuelRate(partner.vehicleType));
    }
    if (weekKm === 0 && (partner.weekDistanceKm || 0) > 0) {
      weekKm = partner.weekDistanceKm || 0;
      weekFuel = weekKm * getVehicleFuelRate(partner.vehicleType);
    }
    if (monthKm === 0 && (partner.monthDistanceKm || 0) > 0) {
      monthKm = partner.monthDistanceKm || 0;
      monthFuel = monthKm * getVehicleFuelRate(partner.vehicleType);
    }
    if (lifetimeKm === 0 && (partner.totalDistanceKm || 0) > 0) {
      lifetimeKm = partner.totalDistanceKm || 0;
      lifetimeTrips = partner.deliveriesCompleted || 0;
      lifetimeFuel = partner.lifetimeFuelAllowance || (lifetimeKm * getVehicleFuelRate(partner.vehicleType));
    }
  }

  return {
    todayKm: Number(todayKm.toFixed(1)),
    todayTrips,
    todayActiveMinutes: todayMins,
    todayFuelAllowance: Number(todayFuel.toFixed(2)),

    weekKm: Number(weekKm.toFixed(1)),
    weekTrips,
    weekFuelAllowance: Number(weekFuel.toFixed(2)),

    monthKm: Number(monthKm.toFixed(1)),
    monthTrips,
    monthFuelAllowance: Number(monthFuel.toFixed(2)),

    lifetimeKm: Number(lifetimeKm.toFixed(1)),
    lifetimeTrips: Math.max(lifetimeTrips, partner?.deliveriesCompleted || 0),
    lifetimeFuelAllowance: Number(lifetimeFuel.toFixed(2)),

    avgTripDistanceKm: lifetimeTrips > 0 ? Number((lifetimeKm / lifetimeTrips).toFixed(1)) : 0,
    avgRouteEfficiencyPercent: lifetimeTrips > 0 ? Math.round(totalEfficiencySum / lifetimeTrips) : 98,
  };
}
