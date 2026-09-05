/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Percent,
  Flame,
  Target,
  MapPin,
  CreditCard,
  Lock,
  ArrowRight,
  CheckCircle,
  Search,
  Compass,
  Save,
  Home,
  PlusCircle,
  Check,
  Dumbbell,
  RefreshCw,
  Sparkles,
  Coins,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { calculateEmberCheckoutUsage, debitEmberCoinsForOrder } from '../lib/walletService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Meal, Gym, Order, User, OrderItem, Kitchen, AppFeatureFlags } from '../types';
import { getStoredFeatureFlags, subscribeFeatureFlags } from '../lib/featureFlags';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// High-fidelity fallback locations in Muzaffarpur, Bihar for map searching
const MUZAFFARPUR_LOCATIONS = [
  { name: "Mithanpura, Muzaffarpur, Bihar 842002", lat: 26.1158, lng: 85.3912 },
  { name: "Kalyani Chowk, Muzaffarpur, Bihar 842001", lat: 26.1220, lng: 85.3780 },
  { name: "Motijheel, Muzaffarpur, Bihar 842001", lat: 26.1265, lng: 85.3705 },
  { name: "Gobarsahi, Muzaffarpur, Bihar 842001", lat: 26.0984, lng: 85.3486 },
  { name: "Bela Industrial Area, Muzaffarpur, Bihar 842005", lat: 26.1030, lng: 85.3995 },
  { name: "Ahiyapur, Muzaffarpur, Bihar 842004", lat: 26.1485, lng: 85.3970 },
  { name: "Jawahar Lal Road, Muzaffarpur, Bihar 842001", lat: 26.1245, lng: 85.3815 },
  { name: "Ramna, Muzaffarpur, Bihar 842002", lat: 26.1292, lng: 85.3881 },
];

function CustomerLocationPicker({
  mapCoords,
  setMapCoords,
  mapAddress,
  setMapAddress,
}: {
  mapCoords: { lat: number; lng: number };
  setMapCoords: (coords: { lat: number; lng: number }) => void;
  mapAddress: string;
  setMapAddress: (addr: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY || ''}>
      <CustomerMapAndSearchContent
        mapCoords={mapCoords}
        setMapCoords={setMapCoords}
        mapAddress={mapAddress}
        setMapAddress={setMapAddress}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loading={loading}
        setLoading={setLoading}
      />
    </APIProvider>
  );
}

function CustomerMapAndSearchContent({
  mapCoords,
  setMapCoords,
  setMapAddress,
  searchQuery,
  setSearchQuery,
  loading,
  setLoading,
}: any) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);

    if (placesLib) {
      try {
        const response = await placesLib.Place.searchByText({
          textQuery: searchQuery,
          fields: ['displayName', 'location', 'formattedAddress'],
          locationBias: map?.getCenter() || { lat: 26.1209, lng: 85.3647 },
          maxResultCount: 1,
        });

        const firstPlace = response.places?.[0];
        if (firstPlace && firstPlace.location) {
          const rawLat = typeof firstPlace.location.lat === 'function' ? (firstPlace.location.lat as Function)() : firstPlace.location.lat;
          const rawLng = typeof firstPlace.location.lng === 'function' ? (firstPlace.location.lng as Function)() : firstPlace.location.lng;
          const numLat = Number(rawLat);
          const numLng = Number(rawLng);
          const foundAddress = firstPlace.formattedAddress || firstPlace.displayName || searchQuery;
          setMapCoords({ lat: numLat, lng: numLng });
          setMapAddress(foundAddress);
          if (map) {
            map.setCenter({ lat: numLat, lng: numLng });
            map.setZoom(15);
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Places API search error, using fallback:", e);
      }
    }

    // Local fallback search
    const q = searchQuery.toLowerCase();
    const matched = MUZAFFARPUR_LOCATIONS.find(loc => loc.name.toLowerCase().includes(q));
    if (matched) {
      setMapCoords({ lat: matched.lat, lng: matched.lng });
      setMapAddress(matched.name);
      if (map) {
        map.setCenter({ lat: matched.lat, lng: matched.lng });
        map.setZoom(16);
      }
    } else {
      let hash = 0;
      for (let i = 0; i < q.length; i++) {
        hash = (hash << 5) - hash + q.charCodeAt(i);
        hash |= 0;
      }
      const offsetLat = ((hash % 80) / 1000) * 0.3;
      const offsetLng = (((hash >> 2) % 80) / 1000) * 0.3;
      const simulatedLat = 26.1209 + offsetLat;
      const simulatedLng = 85.3647 + offsetLng;
      setMapCoords({ lat: simulatedLat, lng: simulatedLng });
      setMapAddress(`${searchQuery}, Muzaffarpur, Bihar`);
      if (map) {
        map.setCenter({ lat: simulatedLat, lng: simulatedLng });
        map.setZoom(16);
      }
    }
    setLoading(false);
  };

  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setMapCoords({ lat, lng });
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              setMapAddress(results[0].formatted_address);
            } else {
              setMapAddress(`Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`);
            }
          });
        } catch (err) {
          setMapAddress(`Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`);
        }
      } else {
        setMapAddress(`Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-charcoal/40" />
          <input
            type="text"
            placeholder="Search address, landmark or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="w-full bg-white border border-brand-green/20 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-brand-charcoal placeholder-brand-charcoal/40 focus:outline-none focus:border-brand-green"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-brand-green text-white font-bold text-xs rounded-xl hover:bg-brand-green/90 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {GOOGLE_MAPS_API_KEY ? (
        <div className="h-44 w-full rounded-2xl overflow-hidden border border-brand-green/15 relative shadow-sm">
          <GoogleMap
            center={mapCoords}
            zoom={14}
            gestureHandling={'cooperative'}
            disableDefaultUI={true}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
          >
            <AdvancedMarker position={mapCoords}>
              <Pin background={'#2E7D32'} borderColor={'#FFF'} glyphColor={'#FFF'} />
            </AdvancedMarker>
          </GoogleMap>
        </div>
      ) : (
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const simLat = 26.1209 + (0.5 - y) * 0.05;
            const simLng = 85.3647 + (x - 0.5) * 0.05;
            setMapCoords({ lat: simLat, lng: simLng });
            setMapAddress(`Pinpoint (${simLat.toFixed(4)}, ${simLng.toFixed(4)}), Muzaffarpur`);
          }}
          className="h-44 w-full rounded-2xl bg-[#0F172A] border border-brand-green/20 relative overflow-hidden flex flex-col justify-between p-3.5 font-mono text-[9px] text-emerald-400 cursor-crosshair select-none shadow-inner"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 border border-emerald-500/20 rounded-full animate-ping" />
            <div className="w-20 h-20 border border-emerald-500/30 rounded-full animate-pulse" />
          </div>
          <div className="relative flex justify-between items-center pointer-events-none">
            <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-brand-orange animate-spin" /> FITZAIKA RADAR MAP v2.6</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse text-brand-orange">ONLINE PINPOINT ACTIVE</span>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <MapPin className="w-6 h-6 text-brand-orange drop-shadow-[0_0_8px_rgba(244,163,26,0.6)]" />
            <span className="bg-brand-charcoal text-brand-cream border border-brand-green/20 px-1.5 py-0.5 rounded text-[8px] mt-1 font-bold whitespace-nowrap">Home target locked</span>
          </div>
          <div className="relative flex justify-between items-end pointer-events-none">
            <div>
              <span className="block text-emerald-500/60 font-semibold text-[8px]">COORDINATES</span>
              <span className="text-brand-cream font-bold">LAT: {mapCoords.lat.toFixed(6)}</span>
              <span className="text-brand-cream font-bold block">LNG: {mapCoords.lng.toFixed(6)}</span>
            </div>
            <div className="text-right text-slate-400">Click anywhere in the city grid<br />to pinpoint doorstep delivery</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (mealId: string, delta: number) => void;
  onRemoveItem: (mealId: string) => void;
  selectedGym: Gym | null;
  user: User;
  onPlaceOrder: (newOrder: Order) => void;
  onClearCart: () => void;
  onSelectTab: (tab: any) => void;
  onUpdateUser: (updated: User) => Promise<void> | void;
  allKitchens?: Kitchen[];
  allMeals?: Meal[];
  likedMeals?: string[];
  onAddToCart?: (meal: Meal) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  selectedGym,
  user,
  onPlaceOrder,
  onClearCart,
  onSelectTab,
  onUpdateUser,
  allKitchens = [],
  allMeals = [],
  likedMeals = [],
  onAddToCart,
}: CartDrawerProps) {
  // Coupon input state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]); // Array of applied coupons in stack
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // App-wide feature flags (Accepting orders kill switch, etc.)
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    return () => unsubscribe();
  }, []);

  // Fulfillment Mode: Delivery vs Takeaway (Self-Pickup) - Strictly NO Dine-In
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'takeaway'>('delivery');

  // Order Timing State: ASAP vs Scheduled Slot
  const [orderTiming, setOrderTiming] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledSlot, setScheduledSlot] = useState<string>('Today, 1:30 PM - 2:00 PM');

  // Item Customizations Map: { [itemIdx: number]: OrderItemCustomization }
  const [itemCustomizations, setItemCustomizations] = useState<Record<number, any>>({});
  const [customizingItemIndex, setCustomizingItemIndex] = useState<number | null>(null);

  // User Deck / Favorite Meals Suggestions shown below added items in cart
  // ONLY show what is actually in user's deck (no fallback mock/dummy items)
  const deckSuggestions = useMemo(() => {
    if (!allMeals || allMeals.length === 0 || !likedMeals || likedMeals.length === 0) return [];
    return allMeals.filter(m => likedMeals.includes(m.id));
  }, [allMeals, likedMeals]);

  // Address and Payment Selection
  const [selectedAddress, setSelectedAddress] = useState<string>(() => {
    return user.address || user.savedAddresses[0] || '';
  });

  const [selectedPayment, setSelectedPayment] = useState<string>(
    user.savedPayments[0]?.type || 'Cash on Delivery (COD)'
  );

  // State for adding a new address with interactive map search
  const [showAddAddressPanel, setShowAddAddressPanel] = useState(false);
  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [mapAddress, setMapAddress] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({ lat: 26.1209, lng: 85.3647 });
  const [homeAddressDetails, setHomeAddressDetails] = useState(''); // e.g. Flat/House number, Floor
  const [saveToProfileChecked, setSaveToProfileChecked] = useState(true);
  const [addressToast, setAddressToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync selectedAddress when user profile address changes & dynamically geocode to mapCoords
  useEffect(() => {
    if (user.address) {
      setSelectedAddress(user.address);
    } else if (user.savedAddresses && user.savedAddresses.length > 0) {
      setSelectedAddress(user.savedAddresses[0]);
    }
  }, [user.address, user.savedAddresses]);

  // Dynamically resolve mapCoords from selected address or user profile coordinates
  useEffect(() => {
    if (user.deliveryLat && user.deliveryLng && !isNaN(user.deliveryLat) && Math.abs(user.deliveryLat - 26.1209) > 0.0001) {
      setMapCoords({ lat: user.deliveryLat, lng: user.deliveryLng });
      return;
    }
    if (user.addressLat && user.addressLng && !isNaN(user.addressLat) && Math.abs(user.addressLat - 26.1209) > 0.0001) {
      setMapCoords({ lat: user.addressLat, lng: user.addressLng });
      return;
    }

    if (selectedAddress && typeof window !== 'undefined' && (window as any).google?.maps) {
      const cleanAddr = selectedAddress.replace(/\s*\([^)]*\)/g, '').trim();
      const presetMatch = MUZAFFARPUR_LOCATIONS.find(p => cleanAddr.toLowerCase().includes(p.name.split(',')[0].toLowerCase()));
      if (presetMatch) {
        setMapCoords({ lat: presetMatch.lat, lng: presetMatch.lng });
        return;
      }

      const geocoder = new (window as any).google.maps.Geocoder();
      const query = cleanAddr.toLowerCase().includes('bihar') || cleanAddr.toLowerCase().includes('muzaffarpur')
        ? cleanAddr
        : `${cleanAddr}, Muzaffarpur, Bihar, India`;

      geocoder.geocode({ address: query }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          setMapCoords({ lat, lng });
        } else {
          // If plus code prefix exists, try fallback with locality
          const parts = cleanAddr.split(',');
          if (parts.length > 1 && parts[0].includes('+')) {
            geocoder.geocode({ address: `${parts.slice(1).join(',')}, Bihar, India` }, (res2: any, stat2: any) => {
              if (stat2 === 'OK' && res2 && res2[0]) {
                const loc2 = res2[0].geometry.location;
                setMapCoords({ lat: loc2.lat(), lng: loc2.lng() });
              }
            });
          }
        }
      });
    }
  }, [selectedAddress, user.addressLat, user.addressLng, user.deliveryLat, user.deliveryLng]);

  // Geofence / nearest kitchen mapping helper
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const targetCoords = mapCoords;

  const deliveryKitchenInfo = useMemo(() => {
    if (!allKitchens || allKitchens.length === 0) {
      return { inRange: true, closestKitchen: null, distance: 0, reason: null };
    }

    // Filter to kitchens that are both active and currently taking orders
    const availableKitchens = allKitchens.filter(
      (k) => k.isActive !== false && k.isTakingOrders !== false
    );

    if (availableKitchens.length === 0) {
      return {
        inRange: false,
        closestKitchen: allKitchens[0] || null,
        distance: 0,
        reason: 'no_available_kitchens' as const,
      };
    }

    if (!targetCoords) {
      return {
        inRange: true,
        closestKitchen: availableKitchens[0],
        distance: 0,
        reason: null,
      };
    }

    // Check if ANY available kitchen covers targetCoords within its delivery geofence
    let inRangeKitchens: { kitchen: Kitchen; distance: number }[] = [];
    let closestAvailableKitchen: Kitchen | null = null;
    let minDistance = Infinity;

    for (const k of availableKitchens) {
      if (!k.lat || !k.lng) continue;
      const d = getDistanceKm(targetCoords.lat, targetCoords.lng, k.lat, k.lng);
      if (d < minDistance) {
        minDistance = d;
        closestAvailableKitchen = k;
      }
      const radius = k.geofenceRadius || 5;
      if (d <= radius) {
        inRangeKitchens.push({ kitchen: k, distance: d });
      }
    }

    if (inRangeKitchens.length > 0) {
      inRangeKitchens.sort((a, b) => a.distance - b.distance);
      return {
        inRange: true,
        closestKitchen: inRangeKitchens[0].kitchen,
        distance: inRangeKitchens[0].distance,
        reason: null,
      };
    }

    return {
      inRange: false,
      closestKitchen: closestAvailableKitchen || availableKitchens[0],
      distance: minDistance === Infinity ? 0 : minDistance,
      reason: 'out_of_geofence' as const,
    };
  }, [allKitchens, targetCoords]);

  // Helper search and reverse-geocode triggers
  const handleSearchAddress = async () => {
    if (!searchAddressQuery.trim()) return;
    setAddressToast(null);

    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: searchAddressQuery }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            setMapCoords({ lat, lng });
            setMapAddress(results[0].formatted_address);
          } else {
            fallbackSearch(searchAddressQuery);
          }
        });
        return;
      } catch (e) {
        console.warn("Geocoder search failed, using local fallback:", e);
      }
    }
    fallbackSearch(searchAddressQuery);
  };

  const fallbackSearch = (queryStr: string) => {
    const q = queryStr.toLowerCase();
    const matched = MUZAFFARPUR_LOCATIONS.find(loc =>
      loc.name.toLowerCase().includes(q)
    );
    if (matched) {
      setMapCoords({ lat: matched.lat, lng: matched.lng });
      setMapAddress(matched.name);
    } else {
      const randOffsetLat = (Math.random() - 0.5) * 0.03;
      const randOffsetLng = (Math.random() - 0.5) * 0.03;
      const simulatedLat = 26.1209 + randOffsetLat;
      const simulatedLng = 85.3647 + randOffsetLng;
      setMapCoords({ lat: simulatedLat, lng: simulatedLng });
      setMapAddress(`${queryStr}, Muzaffarpur, Bihar`);
    }
  };

  const triggerReverseGeocode = (lat: number, lng: number) => {
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          setMapAddress(results[0].formatted_address);
        }
      });
    } else {
      let closest = MUZAFFARPUR_LOCATIONS[0];
      let minDist = Infinity;
      MUZAFFARPUR_LOCATIONS.forEach(loc => {
        const dist = Math.pow(loc.lat - lat, 2) + Math.pow(loc.lng - lng, 2);
        if (dist < minDist) {
          minDist = dist;
          closest = loc;
        }
      });
      setMapAddress(`Near ${closest.name.split(',')[0]}, Muzaffarpur, Bihar`);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!mapAddress.trim()) {
      setAddressToast({ type: 'error', text: 'Please search or select a location on the map first.' });
      return;
    }

    const fullAddr = homeAddressDetails.trim()
      ? `${homeAddressDetails.trim()}, ${mapAddress.trim()}`
      : mapAddress.trim();

    setSelectedAddress(fullAddr);

    if (saveToProfileChecked && auth.currentUser) {
      // Append if not already in list
      if (!user.savedAddresses.includes(fullAddr)) {
        const updatedAddresses = [...user.savedAddresses, fullAddr];
        await onUpdateUser({
          ...user,
          savedAddresses: updatedAddresses
        });
      }
    }

    setAddressToast({ type: 'success', text: 'Address locked successfully!' });
    setTimeout(() => {
      setShowAddAddressPanel(false);
      setAddressToast(null);
      // Reset input fields
      setSearchAddressQuery('');
      setHomeAddressDetails('');
    }, 1200);
  };

  // checkout completed dialog
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [placedTakeawayOtp, setPlacedTakeawayOtp] = useState('');

  // 1. CALCULATE CORE SUB-TOTALS SEPARATING REGULAR ITEMS & DEALS PACKAGES
  const { regularSubtotal, dealsSubtotal, subtotal } = useMemo(() => {
    let regSum = 0;
    let dealSum = 0;

    cartItems.forEach((item, idx) => {
      const custom = itemCustomizations[idx] || item.customization;
      let extra = 0;
      if (custom?.portionSize === 'large') extra += 40;
      if (custom?.portionSize === 'jumbo') extra += 80;
      if (custom?.addOns && Array.isArray(custom.addOns)) {
        extra += custom.addOns.reduce((aSum: number, addon: any) => aSum + (addon.price || 0), 0);
      }
      const itemPrice = (item.meal.price + extra) * item.quantity;
      if (item.isDeal || item.dealId) {
        dealSum += itemPrice;
      } else {
        regSum += itemPrice;
      }
    });

    return {
      regularSubtotal: regSum,
      dealsSubtotal: dealSum,
      subtotal: regSum + dealSum,
    };
  }, [cartItems, itemCustomizations]);

  // 2. ACCUMULATE MACROS
  const totalMacros = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => {
        return {
          calories: sum.calories + item.meal.calories * item.quantity,
          protein: sum.protein + item.meal.protein * item.quantity,
          carbs: sum.carbs + item.meal.carbs * item.quantity,
          fats: sum.fats + item.meal.fats * item.quantity,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [cartItems]);

  // 3. GYM AUTOMATIC DISCOUNT (Only applicable for gym locker delivery)
  // 3. DISCOUNT & COUPONS
  const gymDiscountVal = 0;

  // 4. COUPON CODE DISCOUNT (Only applicable to regular menu items, deals are coupon-exempt)
  const totalCouponDiscountPct = useMemo(() => {
    return appliedCoupons
      .filter((c) => c.discountType === 'percentage')
      .reduce((sum, c) => sum + (c.discountValue || 0), 0);
  }, [appliedCoupons]);

  const totalCouponFixedVal = useMemo(() => {
    return appliedCoupons
      .filter((c) => c.discountType === 'fixed')
      .reduce((sum, c) => sum + (c.discountValue || 0), 0);
  }, [appliedCoupons]);

  const couponDiscountVal = useMemo(() => {
    if (appliedCoupons.length === 0 || regularSubtotal === 0) return 0;
    // Calculate coupon discount strictly on eligible regular menu items
    const pctDiscount = Math.round(regularSubtotal * (totalCouponDiscountPct / 100));
    return Math.min(regularSubtotal, pctDiscount + totalCouponFixedVal);
  }, [regularSubtotal, totalCouponDiscountPct, totalCouponFixedVal, appliedCoupons]);

  // 5. TOTAL CALCULATION
  const isFreeDeliveryCoupon = useMemo(() => {
    return appliedCoupons.some((c) => c.discountType === 'free_delivery');
  }, [appliedCoupons]);

  const totalDiscount = gymDiscountVal + couponDiscountVal;
  // Free delivery for Takeaway OR if order is above ₹300, OR a free delivery coupon is applied
  const deliveryFee = (fulfillmentType === 'takeaway' || subtotal > 300 || isFreeDeliveryCoupon) ? 0 : 30;
  const billBeforeEmbers = Math.max(0, subtotal - totalDiscount + deliveryFee);

  // BHATTI WALLET & EMBER COINS CHECKOUT STATE
  // Terms: 1 coin = ₹1. Golden Ember: up to 100% bill. Standard Ember: up to 30% bill.
  // Priority: Golden Embers must be applied first before Standard Embers can be used.
  const [useGoldenEmbers, setUseGoldenEmbers] = useState<boolean>(false);
  const [useStandardEmbers, setUseStandardEmbers] = useState<boolean>(false);

  const goldenBalance = Number(user.goldenEmberBalance || 0);
  const standardBalance = Number(user.standardEmberBalance || 0);
  const totalUserEmbers = goldenBalance + standardBalance;

  const emberCheckout = useMemo(() => {
    return calculateEmberCheckoutUsage({
      billAmount: billBeforeEmbers,
      goldenBalance,
      standardBalance,
      useGolden: useGoldenEmbers,
      useStandard: useStandardEmbers
    });
  }, [billBeforeEmbers, goldenBalance, standardBalance, useGoldenEmbers, useStandardEmbers]);

  const finalTotal = emberCheckout.finalPayable;

  // Handle Coupon Apply (Dynamic real-time lookups with stacking validation)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    const codeClean = couponCode.trim().toUpperCase();
    if (!codeClean) return;

    // Check if cart has only deals
    if (regularSubtotal === 0 && dealsSubtotal > 0) {
      setCouponError("Coupons cannot be applied to Deals & Combos. Deals already feature exclusive bundle pricing. Add regular menu items to use coupons.");
      return;
    }

    // 1. Check for duplicates
    if (appliedCoupons.some((c) => c.code === codeClean || c.id === codeClean)) {
      setCouponError("This coupon code is already applied to your order.");
      return;
    }

    try {
      const couponRef = doc(db, 'coupons', codeClean);
      const couponSnap = await getDoc(couponRef);

      let couponData: any = null;

      if (!couponSnap.exists()) {
        setCouponError("Invalid coupon code. This coupon does not exist.");
        return;
      }
      couponData = { id: codeClean, ...couponSnap.data() };

      // 2. Validate General Rules
      if (!couponData.isActive) {
        setCouponError('This special offer is currently paused or inactive.');
        return;
      }

      if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) {
        setCouponError('This coupon has expired.');
        return;
      }

      // Minimum order value validation against eligible regular menu items
      if (regularSubtotal < (couponData.minOrderValue || 0)) {
        setCouponError(`Minimum regular menu subtotal required: ₹${couponData.minOrderValue} (Deals & combos are exempt).`);
        return;
      }

      if (couponData.usageCap && (couponData.usageCount || 0) >= couponData.usageCap) {
        setCouponError('This coupon cap has been fully claimed.');
        return;
      }

      if (couponData.firstNUsersOnly && (couponData.usageCount || 0) >= couponData.firstNUsersOnly) {
        setCouponError(`First ${couponData.firstNUsersOnly} users limit reached for this campaign.`);
        return;
      }

      if (couponData.scope === 'account_based') {
        const userEmail = user?.email?.trim().toLowerCase() || '';
        const targetEmail = couponData.targetUserEmail?.trim().toLowerCase() || '';
        if (userEmail !== targetEmail) {
          setCouponError('This personalized coupon is locked to a different account.');
          return;
        }
      }

      if (couponData.scope === 'gym_only') {
        if (!selectedGym || selectedGym.id !== couponData.targetGymId) {
          setCouponError('Exclusive to orders connected with specific gym terminals.');
          return;
        }
      }

      // 3. Stacking Validations
      if (appliedCoupons.length > 0) {
        // A. Is the new coupon stackable?
        if (couponData.isStackable === false || !couponData.isStackable) {
          setCouponError(`Coupon '${codeClean}' is not stackable with other coupons.`);
          return;
        }

        // B. Are all already-applied coupons stackable?
        const hasNonStackableApplied = appliedCoupons.some((c) => c.isStackable === false || !c.isStackable);
        if (hasNonStackableApplied) {
          setCouponError('Your currently applied coupon does not allow stacking. Clear it first.');
          return;
        }

        // C. Does the new coupon restrict which coupon codes it can stack with?
        if (couponData.stackableWith && couponData.stackableWith.length > 0) {
          const restricted = appliedCoupons.some((c) => !couponData.stackableWith.includes(c.code));
          if (restricted) {
            setCouponError(`Coupon '${codeClean}' can only stack with: ${couponData.stackableWith.join(', ')}`);
            return;
          }
        }

        // D. Do any of the existing coupons restrict stacking with this new coupon?
        for (const existing of appliedCoupons) {
          if (existing.stackableWith && existing.stackableWith.length > 0) {
            if (!existing.stackableWith.includes(codeClean)) {
              setCouponError(`Coupon '${codeClean}' cannot stack with '${existing.code}', which has narrow stacking limits.`);
              return;
            }
          }
        }
      }

      // Applied successfully to stack
      setAppliedCoupons((prev) => [...prev, couponData]);
      setCouponCode('');

      if (couponData.discountType === 'percentage') {
        setCouponSuccess(`🏷️ Code '${couponData.code}' stacked! (-${couponData.discountValue}%)`);
      } else if (couponData.discountType === 'fixed') {
        setCouponSuccess(`🏷️ Flat discount stacked! (-₹${couponData.discountValue})`);
      } else if (couponData.discountType === 'free_delivery') {
        setCouponSuccess(`🚚 Free insulated delivery stacked!`);
      } else if (couponData.discountType === 'free_perk') {
        setCouponSuccess(`🎁 Premium perk stacked: ${couponData.perkName}!`);
      }

    } catch (err) {
      console.error("Error applying coupon:", err);
      setCouponError("Could not check coupon. Please retry.");
    }
  };

  // Place order trigger
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (!auth.currentUser) {
      alert("🔒 Authentication Required: Please sign in or register to place your meal order.");
      onClose();
      onSelectTab('account');
      return;
    }

    if (fulfillmentType === 'delivery' && !selectedAddress.trim()) {
      alert("⚠️ Please select a delivery address or pinpoint a location on the map first!");
      return;
    }

    if (fulfillmentType === 'delivery' && allKitchens.length > 0 && !deliveryKitchenInfo.inRange) {
      if (deliveryKitchenInfo.reason === 'no_available_kitchens') {
        alert("⚠️ All Kitchens Unavailable: All kitchen branches are currently paused or taking no orders. Please try again later!");
      } else {
        alert("⚠️ Out of Delivery Geofence: All available kitchens are outside the delivery radius of your address. Please select a closer delivery location or choose Takeaway / Self-Pickup.");
      }
      return;
    }

    const anyKitchenAvailable = allKitchens.some((k) => k.isActive !== false && k.isTakingOrders !== false);
    if (fulfillmentType === 'takeaway' && allKitchens.length > 0 && !anyKitchenAvailable) {
      alert("⚠️ All Kitchens Unavailable: All kitchen counters are currently paused or taking no orders. Please try again later!");
      return;
    }

    const isTakeaway = fulfillmentType === 'takeaway';

    // 8-digit numeric code for order ID
    const orderId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const takeawayOtp = isTakeaway ? Math.floor(1000 + Math.random() * 9000).toString() : undefined;

    let finalAddress = isTakeaway
      ? (selectedAddress ? `Self-Pickup (Customer Area: ${selectedAddress})` : 'Self-Pickup (Cloud Kitchen Counter)')
      : selectedAddress;

    // Append perk description if present
    const perkCoupons = appliedCoupons.filter((c) => c.discountType === 'free_perk');
    if (perkCoupons.length > 0) {
      const perksDesc = perkCoupons.map((c) => c.perkName).join(', ');
      finalAddress = `${finalAddress} (🎁 Unlocked Perks: ${perksDesc})`;
    }

    const destinationTitle = isTakeaway ? 'Counter Pickup' : 'Doorstep Drop';
    const destinationDesc = isTakeaway
      ? 'Self-Pickup at Cloud Kitchen Counter with OTP'
      : 'Warm carrier dispatched to your pinpointed doorstep';

    // Calculate eligible kitchens (must be active, taking orders, and within geofence)
    let activeDeliveryCoords = targetCoords || { lat: 26.1209, lng: 85.3647 };
    
    // Check if selectedAddress matches any preset location for pinpoint geofencing
    if (selectedAddress) {
      const addrLower = selectedAddress.toLowerCase();
      const presetMatch = MUZAFFARPUR_LOCATIONS.find(p => addrLower.includes(p.name.split(',')[0].toLowerCase()));
      if (presetMatch) {
        activeDeliveryCoords = { lat: presetMatch.lat, lng: presetMatch.lng };
      }
    }

    const eligibleKitchens = allKitchens.filter((kitchen) => {
      if (kitchen.isActive === false || kitchen.isTakingOrders === false) return false;
      if (!kitchen.lat || !kitchen.lng) return true;
      const dist = getDistanceKm(activeDeliveryCoords.lat, activeDeliveryCoords.lng, kitchen.lat, kitchen.lng);
      const radius = kitchen.geofenceRadius || 15;
      return dist <= radius;
    });

    const primaryKitchen = eligibleKitchens.length > 0
      ? eligibleKitchens[0]
      : (deliveryKitchenInfo.closestKitchen || allKitchens[0]);

    const eligibleKitchenIds = eligibleKitchens.length > 0
      ? eligibleKitchens.map(k => k.id)
      : (primaryKitchen ? [primaryKitchen.id] : (allKitchens.length > 0 ? allKitchens.map(k => k.id) : ['k1']));

    // Derive sauté lane assignment for KDS based strictly on Veg/Non-Veg
    let lane: 'lane_a' | 'lane_b' | 'lane_c' = 'lane_a';
    const firstMeal = cartItems[0]?.meal;
    if (firstMeal) {
      if (firstMeal.isVeg) {
        lane = 'lane_a'; // Veg Sauté
      } else {
        lane = 'lane_b'; // Meat Grill
      }
    }

    // Attach custom options to items
    const enrichedItems: OrderItem[] = cartItems.map((item, idx) => ({
      ...item,
      customization: itemCustomizations[idx] || item.customization,
    }));

    const slotLabel = orderTiming === 'scheduled' ? `Scheduled: ${scheduledSlot}` : 'ASAP (15-25 mins)';

    const newOrder: Order = {
      id: orderId,
      items: enrichedItems,
      userId: auth.currentUser?.uid || '',
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      status: 'sent',
      kdsStage: 'received',
      fulfillmentMode: fulfillmentType,
      scheduledSlot: slotLabel,
      takeawayPickupOtp: takeawayOtp,
      lane: lane,
      chefNote: `Nutritional balance verified. Timing: ${slotLabel}`,
      createdAt: new Date().toISOString(),
      subtotal,
      discount: totalDiscount,
      deliveryFee,
      total: finalTotal,
      goldenEmbersUsed: emberCheckout.goldenDeduction,
      standardEmbersUsed: emberCheckout.standardDeduction,
      walletUsedAmount: emberCheckout.totalEmberDiscount,
      address: finalAddress,
      paymentMethod: selectedPayment,
      paymentStatus: (selectedPayment.toLowerCase().includes('cash') || selectedPayment.toLowerCase().includes('cod')) ? 'unpaid' : 'paid',
      trackingSteps: isTakeaway
        ? [
            { title: 'Takeaway Order Sent', description: 'Transmitted to TAASH BHATTI Cloud Kitchen Counter.', done: true },
            { title: 'Chef Preparation', description: 'Fresh clay-oven preparation underway.', done: false },
            { title: 'Ready at Pickup Counter', description: `Ready for pickup. Show OTP: ${takeawayOtp}`, done: false },
            { title: 'Picked Up', description: 'Order handed over at counter.', done: false },
          ]
        : [
            { title: 'Order Transmitted', description: 'Transmitted to nearby partner kitchens. Awaiting acceptance.', done: true },
            { title: 'Kitchen Acceptance', description: 'Waiting for a gourmet kitchen to accept your order', done: false },
            { title: destinationTitle, description: destinationDesc, done: false },
          ],
      gymId: "",
      kitchenId: primaryKitchen?.id || "",
      kitchenName: primaryKitchen?.name || "Cloud Kitchen",
      eligibleKitchenIds: eligibleKitchenIds,
      deliveryLat: activeDeliveryCoords.lat,
      deliveryLng: activeDeliveryCoords.lng,
      acceptedByKitchenId: "",
      acceptedKitchenName: "",
      acceptedKitchenAddress: primaryKitchen?.address || "",
      rejectedByKitchenIds: [],
      customerName: user.name || 'Athlete Customer',
      customerPhone: user.phone || 'N/A',
    };

    // Increment coupon usage count dynamically and accumulate totalSavings in Firestore
    for (const coupon of appliedCoupons) {
      if (coupon.id) {
        try {
          // Calculate savings contribution for this specific coupon
          let savingsContrib = 0;
          if (coupon.discountType === 'percentage') {
            savingsContrib = Math.round((subtotal - gymDiscountVal) * (coupon.discountValue / 100));
          } else if (coupon.discountType === 'fixed') {
            savingsContrib = Math.min(subtotal - gymDiscountVal, coupon.discountValue);
          } else if (coupon.discountType === 'free_delivery') {
            savingsContrib = 30; // Delivery fee saved
          }

          const couponRef = doc(db, 'coupons', coupon.id);
          const snap = await getDoc(couponRef);
          if (snap.exists()) {
            const currentData = snap.data();
            const currentCount = currentData.usageCount || 0;
            const currentSavings = currentData.totalSavings || 0;
            await updateDoc(couponRef, {
              usageCount: currentCount + 1,
              totalSavings: currentSavings + savingsContrib
            });
          }
        } catch (err) {
          console.error("Error updating coupon usage/savings:", err);
        }
      }
    }

    // Debit Ember coins if used
    if (emberCheckout.totalEmberDiscount > 0 && user.id) {
      try {
        await debitEmberCoinsForOrder({
          userId: user.id,
          orderId,
          goldenAmount: emberCheckout.goldenDeduction,
          standardAmount: emberCheckout.standardDeduction
        });
        if (onUpdateUser) {
          onUpdateUser({
            ...user,
            goldenEmberBalance: Math.max(0, goldenBalance - emberCheckout.goldenDeduction),
            standardEmberBalance: Math.max(0, standardBalance - emberCheckout.standardDeduction),
            walletBalance: Math.max(0, (goldenBalance - emberCheckout.goldenDeduction) + (standardBalance - emberCheckout.standardDeduction))
          });
        }
      } catch (emberErr) {
        console.warn("Could not debit ember coins:", emberErr);
      }
    }

    onPlaceOrder(newOrder);
    setPlacedOrderId(orderId);
    if (takeawayOtp) {
      setPlacedTakeawayOtp(takeawayOtp);
    }
    setCheckoutCompleted(true);
  };

  const handleCloseCompleted = () => {
    // Reset Cart and states
    setCheckoutCompleted(false);
    setPlacedTakeawayOtp('');
    onClearCart();
    setCouponCode('');
    setAppliedCoupons([]);
    setCouponSuccess(null);
    setCouponError(null);
    onClose();
    // Redirect to Account status page
    onSelectTab('account');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-xs flex justify-end">
      {/* Black backdrop click */}
      <div className="absolute inset-0" onClick={checkoutCompleted ? undefined : onClose} />

      {/* Cart Container Drawer */}
      <div className="relative w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl border-l border-brand-green/10">
        
        {/* CHECKOUT SUCCESS MODAL POPUP */}
        {checkoutCompleted ? (
          <div className="absolute inset-0 bg-white z-50 p-6 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-brand-green text-brand-cream flex items-center justify-center shadow-lg text-2xl animate-bounce">
              ✓
            </div>

            <div>
              <span className="bg-brand-orange/10 text-brand-orange text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                PAYMENT SUCCESSFUL
              </span>
              <h3 className="text-xl font-black text-brand-charcoal mt-2.5 leading-none">TAASH BHATTI Order Confirmed!</h3>
              <p className="text-xs text-brand-charcoal/60 mt-2 max-w-xs leading-relaxed">
                Your order <b>{placedOrderId}</b> is now processing in our clay-oven kitchen.
              </p>
            </div>

            {/* TAKEAWAY PICKUP OTP CARD IF TAKEAWAY */}
            {fulfillmentType === 'takeaway' && (
              <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-center max-w-xs space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest block">
                  🔑 YOUR COUNTER PICKUP OTP
                </span>
                <span className="text-2xl font-black text-brand-charcoal tracking-widest block font-mono bg-white py-1 rounded-xl border border-amber-300">
                  {placedTakeawayOtp || '4829'}
                </span>
                <p className="text-[9px] text-amber-900/80 font-bold leading-tight">
                  Show this code at the accepting kitchen counter to receive your fresh takeaway order!
                </p>
              </div>
            )}

            {/* Summed macros review */}
            <div className="w-full bg-brand-cream/40 border border-brand-green/10 rounded-2xl p-4 text-xs font-bold text-brand-green space-y-1.5 max-w-xs">
              <span className="text-[9px] font-black uppercase text-brand-orange tracking-widest block mb-1">
                COMBINED MACRO NUTRITION
              </span>
              <div className="flex justify-between">
                <span>🔥 Total Calories</span>
                <span>{totalMacros.calories} kcal</span>
              </div>
              <div className="flex justify-between">
                <span>💪 Total Protein</span>
                <span>{totalMacros.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span>🌾 Total Carbohydrates</span>
                <span>{totalMacros.carbs}g</span>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2.5 pt-4">
              <p className="text-[10px] text-brand-charcoal/45 leading-normal font-semibold">
                Locker allocation successful. You can track preparation status live on your Account page.
              </p>
              <button
                onClick={handleCloseCompleted}
                className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Track Live Progress <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* HEADER AREA */}
        <div className="p-4.5 border-b border-brand-green/10 flex items-center justify-between bg-brand-cream/15 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-ping" />
            <h3 className="text-base font-black text-brand-charcoal">Your TAASH BHATTI Order</h3>
            <span className="text-[10px] bg-brand-green/10 text-brand-green font-bold px-2 py-0.5 rounded-full">
              {cartItems.length} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-brand-green/5 text-brand-charcoal/60 hover:text-brand-charcoal transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MIDDLE CONTENT: SCROLLABLE ITEMS */}
        <div className="flex-1 overflow-y-auto p-4.5 space-y-5">
          
          {cartItems.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <span className="text-4xl block">🥗</span>
              <h4 className="font-extrabold text-sm text-brand-charcoal">Your cart is empty</h4>
              <p className="text-[11px] text-brand-charcoal/50 max-w-xs mx-auto leading-normal">
                Great meals require authentic ingredients. Browse our menu and select the clay-oven delicacies perfect for your dining experience.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectTab('menu');
                }}
                className="mt-4 px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Start Browsing
              </button>
            </div>
          ) : (
            <>
              {/* FULFILLMENT MODE SELECTOR: DELIVERY vs TAKEAWAY (STRICTLY NO DINE-IN) */}
              <div className="bg-brand-cream/30 border border-brand-green/15 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/60 tracking-wider block">
                    Fulfillment Method
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    Strictly No Dine-In
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`p-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      fulfillmentType === 'delivery'
                        ? 'border-2 border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    <span className="text-base">🚚</span>
                    <div>
                      <span className="block leading-tight font-extrabold">Delivery Drop</span>
                      <span className={`text-[9px] block font-normal ${fulfillmentType === 'delivery' ? 'text-emerald-100' : 'text-gray-500'}`}>
                        Home or Gym Locker
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('takeaway')}
                    className={`p-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      fulfillmentType === 'takeaway'
                        ? 'border-2 border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    <span className="text-base">🛍️</span>
                    <div>
                      <span className="block leading-tight font-extrabold">Self-Pickup</span>
                      <span className={`text-[9px] block font-normal ${fulfillmentType === 'takeaway' ? 'text-emerald-100' : 'text-gray-500'}`}>
                        Cloud Kitchen Counter (₹0 Fee)
                      </span>
                    </div>
                  </button>
                </div>

                {fulfillmentType === 'takeaway' && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-900 font-semibold space-y-1">
                    <span className="font-extrabold block text-emerald-950">📍 Cloud Kitchen Pickup Counter:</span>
                    <p className="leading-snug">Order will be transmitted to nearby cloud kitchens. Counter address will be shown once accepted.</p>
                    <p className="text-[9px] text-emerald-700 font-bold">🔑 A 4-digit Pickup OTP will be generated upon checkout for counter verification.</p>
                  </div>
                )}
              </div>

              {/* SCHEDULED ORDER TIMING SELECTOR */}
              <div className="bg-brand-cream/30 border border-brand-green/15 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-brand-charcoal/60 tracking-wider block">
                  Order Timing
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderTiming('asap')}
                    className={`p-2.5 rounded-xl border font-bold text-xs transition-all text-center cursor-pointer ${
                      orderTiming === 'asap'
                        ? 'border-brand-green bg-brand-green/10 text-brand-green font-extrabold'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    ⚡ ASAP (15-25 Mins)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderTiming('scheduled')}
                    className={`p-2.5 rounded-xl border font-bold text-xs transition-all text-center cursor-pointer ${
                      orderTiming === 'scheduled'
                        ? 'border-brand-green bg-brand-green/10 text-brand-green font-extrabold'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    ⏰ Schedule for Later
                  </button>
                </div>

                {orderTiming === 'scheduled' && (
                  <div className="mt-2 space-y-1">
                    <label className="text-[9px] font-bold text-brand-charcoal/60 block uppercase">Select Delivery/Pickup Time Slot:</label>
                    <select
                      value={scheduledSlot}
                      onChange={(e) => setScheduledSlot(e.target.value)}
                      className="w-full bg-white border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green"
                    >
                      <option value="Today, 1:30 PM - 2:00 PM">Today, 1:30 PM - 2:00 PM</option>
                      <option value="Today, 2:00 PM - 2:30 PM">Today, 2:00 PM - 2:30 PM</option>
                      <option value="Today, 7:30 PM - 8:00 PM">Today, 7:30 PM - 8:00 PM</option>
                      <option value="Today, 8:30 PM - 9:00 PM">Today, 8:30 PM - 9:00 PM</option>
                      <option value="Tomorrow, 12:30 PM - 1:00 PM">Tomorrow, 12:30 PM - 1:00 PM</option>
                      <option value="Tomorrow, 8:00 PM - 8:30 PM">Tomorrow, 8:00 PM - 8:30 PM</option>
                    </select>
                  </div>
                )}
              </div>

              {/* CART ITEMS LIST WITH CUSTOMIZATIONS */}
              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const custom = itemCustomizations[idx] || item.customization || {};
                  let extraPrice = 0;
                  if (custom.portionSize === 'large') extraPrice += 40;
                  if (custom.portionSize === 'jumbo') extraPrice += 80;
                  if (custom.addOns && Array.isArray(custom.addOns)) {
                    extraPrice += custom.addOns.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
                  }
                  const itemUnitPrice = item.meal.price + extraPrice;
                  const isCustomizingThis = customizingItemIndex === idx;

                  return (
                    <div
                      key={`cart-item-${item.meal.id}-${idx}`}
                      className="bg-brand-cream/10 p-3.5 rounded-2xl border border-brand-green/10 space-y-2.5"
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                            <img
                              src={item.meal.image}
                              alt={item.meal.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {item.isDeal && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-orange text-brand-charcoal font-black text-[8px] uppercase tracking-wider">
                                  🍱 DEAL
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-brand-charcoal leading-snug line-clamp-1">
                                {item.meal.name}
                              </h4>
                            </div>
                            {item.isDeal && item.dealSelectedSteps && (
                              <div className="text-[9px] text-gray-500 font-medium mt-0.5 space-y-0.5">
                                {item.dealSelectedSteps.map((st, sIdx) => (
                                  <div key={sIdx} className="truncate">
                                    <span className="font-bold text-brand-charcoal">• {st.stepTitle}:</span>{' '}
                                    {st.items.map((it) => it.mealName).join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.isDeal && item.dealComboItemsSummary && (
                              <p className="text-[9px] text-gray-500 font-medium mt-0.5 truncate">
                                🍱 {item.dealComboItemsSummary}
                              </p>
                            )}
                            <span className="text-[9px] font-bold text-brand-green bg-brand-green/5 px-2 py-0.5 rounded-full inline-block mt-1">
                              🔥 {(Number(item.meal.calories) || 350) * item.quantity} kcal / 💪 {(Number(item.meal.protein) || 25) * item.quantity}g P
                            </span>
                            <span className="text-xs font-extrabold text-brand-charcoal block mt-1">
                              ₹{itemUnitPrice} {extraPrice > 0 && <span className="text-[9px] text-brand-orange font-normal">(Base ₹{item.meal.price} + ₹{extraPrice} custom)</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between h-full gap-2 shrink-0">
                          <button
                            onClick={() => onRemoveItem(item.meal.id)}
                            className="text-brand-charcoal/40 hover:text-rose-600 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Quantity adjuster */}
                          <div className="flex items-center gap-1.5 bg-white border border-brand-green/10 rounded-lg p-1 text-xs">
                            <button
                              onClick={() => onUpdateQuantity(item.meal.id, -1)}
                              className="p-1 hover:bg-brand-cream text-brand-charcoal rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-brand-charcoal px-1">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.meal.id, 1)}
                              className="p-1 hover:bg-brand-cream text-brand-charcoal rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Customization Summary Badge if set */}
                      {(custom.portionSize || custom.spiceLevel || (custom.addOns && custom.addOns.length > 0) || custom.cookingInstruction) && (
                        <div className="bg-white/80 p-2 rounded-xl border border-brand-green/10 text-[10px] space-y-0.5 text-brand-charcoal/80 font-medium">
                          <div className="flex flex-wrap gap-1 font-bold">
                            {custom.portionSize && (
                              <span className="bg-brand-green/10 text-brand-green px-1.5 py-0.5 rounded uppercase">
                                Portion: {custom.portionSize}
                              </span>
                            )}
                            {custom.spiceLevel && (
                              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded capitalize">
                                Spice: {custom.spiceLevel.replace('_', ' ')}
                              </span>
                            )}
                            {custom.addOns && custom.addOns.map((a: any, aIdx: number) => (
                              <span key={aIdx} className="bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded">
                                + {a.name} (₹{a.price})
                              </span>
                            ))}
                          </div>
                          {custom.cookingInstruction && (
                            <p className="text-[9px] italic text-brand-charcoal/60">Note: "{custom.cookingInstruction}"</p>
                          )}
                        </div>
                      )}

                      {/* Customize Meal Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setCustomizingItemIndex(isCustomizingThis ? null : idx)}
                        className="text-[10px] font-black text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isCustomizingThis ? '✕ Close Customization' : '✨ Customize Portion, Spice & Add-ons'}
                      </button>

                      {/* Expanded Customization Form for Item */}
                      {isCustomizingThis && (
                        <div className="p-3 bg-white border border-brand-green/20 rounded-xl space-y-3 animate-fade-in text-xs font-semibold">
                          {/* Portion size */}
                          <div>
                            <span className="text-[9px] font-black uppercase text-brand-charcoal/60 block mb-1">Portion Size</span>
                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              {[
                                { id: 'regular', label: 'Regular (Base)', price: 0 },
                                { id: 'large', label: 'Large (+₹40)', price: 40 },
                                { id: 'jumbo', label: 'Jumbo (+₹80)', price: 80 },
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setItemCustomizations(prev => ({
                                    ...prev,
                                    [idx]: { ...(prev[idx] || {}), portionSize: p.id }
                                  }))}
                                  className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold ${
                                    (custom.portionSize || 'regular') === p.id
                                      ? 'border-brand-green bg-brand-green text-white'
                                      : 'border-gray-200 bg-brand-cream/20 text-brand-charcoal'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Spice level */}
                          <div>
                            <span className="text-[9px] font-black uppercase text-brand-charcoal/60 block mb-1">Spice Level</span>
                            <div className="grid grid-cols-4 gap-1 text-center">
                              {[
                                { id: 'mild', label: 'Mild 🍃' },
                                { id: 'medium', label: 'Medium 🌶️' },
                                { id: 'spicy', label: 'Spicy 🌶️🌶️' },
                                { id: 'extra_spicy', label: 'Extra 🔥' },
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setItemCustomizations(prev => ({
                                    ...prev,
                                    [idx]: { ...(prev[idx] || {}), spiceLevel: s.id }
                                  }))}
                                  className={`py-1 rounded-lg border text-[9px] font-bold ${
                                    (custom.spiceLevel || item.meal.spicyLevel || 'medium') === s.id
                                      ? 'border-brand-orange bg-brand-orange text-white'
                                      : 'border-gray-200 bg-brand-cream/20 text-brand-charcoal'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Add-ons */}
                          <div>
                            <span className="text-[9px] font-black uppercase text-brand-charcoal/60 block mb-1">Add-ons / Extras</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'extra_dip', name: 'Mint Chutney Dip', price: 20 },
                                { id: 'double_protein', name: 'Extra Protein / Paneer', price: 30 },
                                { id: 'extra_roti', name: 'Extra Tandoori Roti', price: 25 },
                                { id: 'beverage', name: 'Fresh Mint Lemonade', price: 35 },
                              ].map((addon) => {
                                const currentAddons: any[] = custom.addOns || [];
                                const isSelected = currentAddons.some((a: any) => a.id === addon.id);

                                return (
                                  <button
                                    key={addon.id}
                                    type="button"
                                    onClick={() => {
                                      const updated = isSelected
                                        ? currentAddons.filter((a: any) => a.id !== addon.id)
                                        : [...currentAddons, addon];
                                      setItemCustomizations(prev => ({
                                        ...prev,
                                        [idx]: { ...(prev[idx] || {}), addOns: updated }
                                      }));
                                    }}
                                    className={`p-1.5 rounded-lg border text-left text-[10px] flex justify-between items-center ${
                                      isSelected
                                        ? 'border-brand-green bg-brand-green/10 text-brand-green font-bold'
                                        : 'border-gray-200 bg-white text-brand-charcoal'
                                    }`}
                                  >
                                    <span>{addon.name}</span>
                                    <span className="font-extrabold">+₹{addon.price}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Cooking Instructions */}
                          <div>
                            <span className="text-[9px] font-black uppercase text-brand-charcoal/60 block mb-1">Cooking Note for Chef</span>
                            <input
                              type="text"
                              placeholder="e.g. Less oil, make crispy, extra green chili..."
                              value={custom.cookingInstruction || ''}
                              onChange={(e) => setItemCustomizations(prev => ({
                                ...prev,
                                [idx]: { ...(prev[idx] || {}), cookingInstruction: e.target.value }
                              }))}
                              className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setCustomizingItemIndex(null)}
                            className="w-full py-1.5 bg-brand-green text-white text-[10px] font-black uppercase rounded-lg text-center"
                          >
                            Done Customizing
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 🃏 "FROM YOUR DECK" SECTION (Favorite Meals Quick-Add) */}
              {cartItems.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500/10 via-brand-cream/30 to-brand-green/5 border border-amber-400/30 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🃏</span>
                      <h4 className="text-xs font-black text-brand-charcoal uppercase tracking-wider">
                        From Your Deck
                      </h4>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-full">
                        {deckSuggestions.length > 0 ? `${deckSuggestions.length} in Deck` : 'Empty'}
                      </span>
                    </div>
                    {deckSuggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectTab('deck' as any);
                        }}
                        className="text-[10px] font-extrabold text-brand-orange hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>View Deck</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {deckSuggestions.length > 0 ? (
                    <>
                      <p className="text-[10px] text-brand-charcoal/60">
                        Quickly deal your favorite meals into this order with 1-tap:
                      </p>

                      {/* Horizontal Scroll / Compact Cards */}
                      <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                        {deckSuggestions.map((deckMeal) => {
                          const alreadyInCart = cartItems.find((item) => item.meal.id === deckMeal.id);
                          return (
                            <div
                              key={`deck-rec-${deckMeal.id}`}
                              className="w-48 shrink-0 bg-white p-2.5 rounded-xl border border-amber-300/40 shadow-xs flex flex-col justify-between space-y-2 group hover:border-amber-400 transition-all"
                            >
                              <div className="flex gap-2">
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-brand-green/10">
                                  <img
                                    src={deckMeal.image}
                                    alt={deckMeal.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-[11px] font-bold text-brand-charcoal truncate leading-tight">
                                    {deckMeal.name}
                                  </h5>
                                  <span className="text-[9px] font-extrabold text-brand-green block mt-0.5">
                                    💪 {deckMeal.protein || 25}g P • {deckMeal.calories || 350} kcal
                                  </span>
                                  <span className="text-[11px] font-black text-brand-charcoal block mt-0.5">
                                    ₹{deckMeal.price}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onAddToCart) {
                                    onAddToCart(deckMeal);
                                  } else {
                                    onUpdateQuantity(deckMeal.id, 1);
                                  }
                                }}
                                className="w-full py-1.5 px-2 rounded-lg bg-brand-green hover:bg-emerald-900 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{alreadyInCart ? `Add More (${alreadyInCart.quantity})` : 'Deal to Cart'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white/80 border border-dashed border-amber-300/80 rounded-xl p-3 text-center space-y-1.5">
                      <p className="text-[11px] font-bold text-brand-charcoal">
                        Your deck is currently empty
                      </p>
                      <p className="text-[10px] text-brand-charcoal/60">
                        Tap "Add to My Deck" on any meal in the menu to build your royal deck.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectTab('menu' as any);
                        }}
                        className="mt-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Browse Menu & Deal Cards</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* INTEGRATED MACRO ACCUMULATOR PANEL */}
              <div className="bg-brand-green/5 border border-brand-green/15 rounded-2xl p-4">
                <span className="text-[9px] font-black uppercase text-brand-green tracking-widest block mb-2 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-brand-orange animate-pulse" /> Combined Meal Macros Tracker
                </span>

                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-brand-charcoal">
                  <div className="p-1.5 bg-white/70 border border-brand-green/5 rounded-xl">
                    <span className="text-[8px] text-brand-charcoal/40 block leading-tight">CALORIES</span>
                    <span className="text-brand-charcoal font-extrabold">{totalMacros.calories}</span>
                    <span className="text-[7px] text-brand-charcoal/30 block leading-none">kcal</span>
                  </div>
                  <div className="p-1.5 bg-white/70 border border-brand-green/5 rounded-xl">
                    <span className="text-[8px] text-brand-charcoal/40 block leading-tight">PROTEIN</span>
                    <span className="text-brand-green font-extrabold">{totalMacros.protein}g</span>
                    <span className="text-[7px] text-brand-charcoal/30 block leading-none">Anabolic</span>
                  </div>
                  <div className="p-1.5 bg-white/70 border border-brand-green/5 rounded-xl">
                    <span className="text-[8px] text-brand-charcoal/40 block leading-tight">CARBS</span>
                    <span className="text-brand-orange font-extrabold">{totalMacros.carbs}g</span>
                    <span className="text-[7px] text-brand-charcoal/30 block leading-none">Glycogen</span>
                  </div>
                  <div className="p-1.5 bg-white/70 border border-brand-green/5 rounded-xl">
                    <span className="text-[8px] text-brand-charcoal/40 block leading-tight">FATS</span>
                    <span className="text-brand-charcoal font-extrabold">{totalMacros.fats}g</span>
                    <span className="text-[7px] text-brand-charcoal/30 block leading-none">Hormonal</span>
                  </div>
                </div>
              </div>

              {/* DELIVERY METHOD & ADDRESS SELECTOR */}
              {fulfillmentType === 'delivery' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                      1. Delivery Address & Pinpoint Location
                    </span>
                    {selectedAddress && (
                      <span className="text-[9px] font-bold text-brand-green flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                        {/* Saved Addresses list */}
                        {user.savedAddresses && user.savedAddresses.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-brand-charcoal/40 uppercase tracking-wider block">Your Saved Addresses</span>
                            <div className="space-y-1.5">
                              {user.savedAddresses.map((addr, idx) => {
                                const isSelected = selectedAddress === addr;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddress(addr);
                                      setShowAddAddressPanel(false);
                                    }}
                                    className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between gap-2.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'border-brand-green bg-brand-green/5 text-brand-green'
                                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/10'
                                    }`}
                                  >
                                    <div className="flex gap-2 min-w-0">
                                      <Home className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                                      <span className="text-xs font-semibold leading-snug line-clamp-2">{addr}</span>
                                    </div>
                                    {isSelected ? (
                                      <Check className="w-4 h-4 text-brand-green shrink-0 mt-0.5 font-extrabold" />
                                    ) : (
                                      <span className="text-[9px] text-brand-charcoal/30 shrink-0 font-bold mt-0.5">USE</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-brand-cream/25 border border-brand-green/10 rounded-2xl text-center">
                            <span className="text-xs text-brand-charcoal/60 font-semibold text-center block">No saved addresses on file. Map your first delivery below!</span>
                          </div>
                        )}

                        {/* Add address map panel toggle button */}
                        <button
                          type="button"
                          onClick={() => setShowAddAddressPanel(!showAddAddressPanel)}
                          className="w-full py-2.5 border border-dashed border-brand-green/30 text-brand-green bg-brand-green/[0.02] hover:bg-brand-green/[0.05] rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          {showAddAddressPanel ? 'Close Map Pinpoint' : '➕ Add & Pinpoint New Address'}
                        </button>

                        {/* Expandable address map panel */}
                        {showAddAddressPanel && (
                          <div className="p-3.5 bg-brand-cream/15 border border-brand-green/10 rounded-3xl space-y-3 animate-fade-in">
                            <CustomerLocationPicker
                              mapCoords={mapCoords}
                              setMapCoords={setMapCoords}
                              mapAddress={mapAddress}
                              setMapAddress={setMapAddress}
                            />

                            {/* Confirm mapped details and notes */}
                            <div className="space-y-2">
                              {mapAddress && (
                                <div className="bg-white p-2.5 rounded-xl border border-brand-green/10">
                                  <span className="text-[8px] text-brand-charcoal/40 font-black uppercase block tracking-wide">Pinpointed Location</span>
                                  <span className="text-[11px] font-semibold text-brand-charcoal leading-snug block">{mapAddress}</span>
                                </div>
                              )}

                              <div>
                                <span className="text-[8px] text-brand-charcoal/40 font-black uppercase block tracking-wide mb-1">Confirm flat / house / street info</span>
                                <input
                                  type="text"
                                  placeholder="e.g. Flat 302, 4th Block, Landmark"
                                  value={homeAddressDetails}
                                  onChange={(e) => setHomeAddressDetails(e.target.value)}
                                  className="w-full bg-white border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  id="saveAddressProfile"
                                  checked={saveToProfileChecked}
                                  onChange={(e) => setSaveToProfileChecked(e.target.checked)}
                                  className="w-3.5 h-3.5 text-brand-green border-brand-green/20 rounded focus:ring-brand-green cursor-pointer"
                                />
                                <label htmlFor="saveAddressProfile" className="text-[10px] text-brand-charcoal/60 font-bold cursor-pointer">
                                  💾 Save this address permanently to my profile
                                </label>
                              </div>

                              {addressToast && (
                                <div className={`p-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-wider ${
                                  addressToast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-brand-green' : 'bg-red-50 border border-red-200 text-red-600'
                                }`}>
                                  {addressToast.text}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={handleSaveNewAddress}
                                className="w-full py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> Lock & Set Delivery Location
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider block">
                    📍 Self-Pickup Selected
                  </span>
                  <div className="text-xs font-bold text-emerald-950">
                    TAASH BHATTI Cloud Kitchen Counter
                  </div>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    Your order will be transmitted to nearby kitchen branches. The specific accepting kitchen counter address will be displayed once accepted.
                  </p>
                  <p className="text-[9px] text-emerald-700 font-bold bg-white/70 p-2 rounded-xl border border-emerald-200">
                    ⚡ Instant Counter Pickup: Your 4-digit pickup code will be generated immediately after confirming payment. Show it at the counter for fast, zero-wait order pickup.
                  </p>
                </div>
              )}

              {/* COUPON INPUT */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wide">
                    2. Apply Coupon
                  </span>
                  {appliedCoupons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupons([]);
                        setCouponSuccess("All coupons cleared.");
                        setCouponError(null);
                      }}
                      className="text-[9px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Stack
                    </button>
                  )}
                </div>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. FIRSTGOAL"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold uppercase placeholder-brand-charcoal/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-green text-white font-bold text-xs rounded-xl"
                  >
                    Apply
                  </button>
                </form>
                {couponError && <p className="text-[9px] text-red-600 font-bold px-1">{couponError}</p>}
                {couponSuccess && <p className="text-[9px] text-brand-green font-bold px-1">{couponSuccess}</p>}

                {/* Stacking list visualization */}
                {appliedCoupons.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-brand-green/5 mt-1">
                    <span className="text-[9px] font-black uppercase text-brand-charcoal/40 block">Currently Stacked Coupons</span>
                    <div className="flex flex-wrap gap-1.5">
                      {appliedCoupons.map((coupon) => (
                        <div key={coupon.id} className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green border border-brand-green/20 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                          <span>{coupon.code}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupons(prev => prev.filter(c => c.id !== coupon.id));
                              setCouponSuccess(`Coupon ${coupon.code} removed.`);
                              setCouponError(null);
                            }}
                            className="hover:text-rose-600 transition-colors cursor-pointer text-brand-charcoal/40 text-[10px] font-black"
                            title="Remove Coupon"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BHATTI WALLET & EMBER COINS REDEMPTION MODULE */}
              {totalUserEmbers > 0 && (
                <div className="p-4 rounded-2xl bg-[#0C1017] text-white border border-amber-500/30 space-y-3 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shadow-xs">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                          Bhatti Wallet
                        </h4>
                        <span className="text-[10px] text-amber-300/80 font-mono">1 Ember = ₹1</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-bold text-amber-300 border border-white/10">
                      {totalUserEmbers} Available
                    </span>
                  </div>

                  {/* Vault Toggles */}
                  <div className="space-y-2 text-xs">
                    {/* 1. Golden Ember Vault (100% Bill Eligible - MUST BE FIRST IF GOLDEN EXISTS) */}
                    {goldenBalance > 0 && (
                      <div
                        onClick={() => setUseGoldenEmbers(!useGoldenEmbers)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          useGoldenEmbers
                            ? 'bg-amber-950/40 border-amber-400/80 text-amber-200 ring-1 ring-amber-400/40'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-amber-300">Golden Embers</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase font-black">
                                100% Cap
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {goldenBalance} Available (Refund Reserve)
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center font-black text-xs ${
                          useGoldenEmbers ? 'bg-amber-400 border-amber-400 text-black' : 'border-white/20'
                        }`}>
                          {useGoldenEmbers && '✓'}
                        </div>
                      </div>
                    )}

                    {/* 2. Standard Ember Vault (30% Bill Eligible) */}
                    {standardBalance > 0 && (
                      <div
                        onClick={() => {
                          if (goldenBalance > 0 && !useGoldenEmbers) {
                            return;
                          }
                          setUseStandardEmbers(!useStandardEmbers);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          goldenBalance > 0 && !useGoldenEmbers
                            ? 'opacity-40 bg-white/5 border-white/5 cursor-not-allowed text-gray-500'
                            : useStandardEmbers
                            ? 'bg-orange-950/40 border-orange-500/80 text-orange-200 ring-1 ring-orange-500/40'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-orange-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔥</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-orange-300">Standard Embers</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase font-black">
                                30% Cap: ₹{emberCheckout.standardMaxLimit}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {standardBalance} Available (Feast Rewards)
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center font-black text-xs ${
                          useStandardEmbers && (goldenBalance === 0 || useGoldenEmbers) ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/20'
                        }`}>
                          {useStandardEmbers && (goldenBalance === 0 || useGoldenEmbers) && '✓'}
                        </div>
                      </div>
                    )}

                    {/* Golden First Priority Notice */}
                    {goldenBalance > 0 && !useGoldenEmbers && (
                      <p className="text-[10px] text-amber-400/90 font-medium px-1 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Golden Embers must be applied first before Standard Embers can be redeemed.</span>
                      </p>
                    )}

                    {/* Applied Deduction Summary */}
                    {emberCheckout.totalEmberDiscount > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Total Embers Redeemed:</span>
                        </span>
                        <span className="font-black text-white">
                          -{emberCheckout.totalEmberDiscount} Coins (-₹{emberCheckout.totalEmberDiscount})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION SELECTOR */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                  3. Select Payment
                </span>
                <div className="p-3 bg-white border border-brand-green/10 rounded-2xl flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-brand-orange shrink-0" />
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedPayment}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                      className="w-full text-xs font-semibold focus:outline-none bg-transparent"
                    >
                      <option value="Cash on Delivery (COD)">💵 Cash on Delivery (COD)</option>
                      {user.savedPayments.map((p) => (
                        <option key={p.id} value={`${p.type} - ${p.details}`}>
                          💳 {p.type} ({p.details})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* BOTTOM STICKY CHECKOUT FOOTER */}
        {cartItems.length > 0 && (
          <div className="p-4.5 bg-brand-cream border-t border-brand-green/10 shrink-0 space-y-3 shadow-lg">
            
            {/* Bill Summary details */}
            <div className="space-y-1.5 text-xs font-semibold text-brand-charcoal/70">
              {dealsSubtotal > 0 && regularSubtotal > 0 ? (
                <>
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Regular Menu Subtotal</span>
                    <span>₹{regularSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Deals & Combos Package</span>
                    <span>₹{dealsSubtotal}</span>
                  </div>
                  <div className="flex justify-between font-bold text-brand-charcoal pt-0.5 border-t border-brand-green/10">
                    <span>Gross Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>{dealsSubtotal > 0 ? 'Deals Package Subtotal' : 'Basket Subtotal'}</span>
                  <span>₹{subtotal}</span>
                </div>
              )}
              
              {selectedGym && (
                <div className="flex justify-between text-brand-green">
                  <span>📍 Connected Locker Discount (-{selectedGym.discountPct}%)</span>
                  <span>-₹{gymDiscountVal}</span>
                </div>
              )}

              {appliedCoupons.length > 0 && (
                <div className="flex flex-col text-brand-green gap-1 bg-brand-green/5 p-2.5 rounded-xl border border-brand-green/10">
                  <div className="flex justify-between font-bold">
                    <span>🏷️ Coupon Discount {dealsSubtotal > 0 && <span className="text-[10px] font-normal text-brand-charcoal/60">(on regular menu)</span>}</span>
                    <span>-₹{couponDiscountVal}</span>
                  </div>
                  <div className="text-[10px] space-y-0.5 text-brand-charcoal/60">
                    {appliedCoupons.map((coupon) => (
                      <div key={coupon.id} className="flex justify-between items-center font-mono">
                        <span>• {coupon.code} ({coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : coupon.discountType === 'fixed' ? `-₹${coupon.discountValue}` : coupon.discountType === 'free_delivery' ? 'Free Delivery' : 'Gift Perk'})</span>
                        {coupon.discountType === 'free_perk' && (
                          <span className="text-[9px] text-brand-orange font-bold">
                            🎁 {coupon.perkName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <span>Insulated Warm Delivery Fee</span>
                <span>{deliveryFee === 0 ? <b className="text-brand-green">FREE</b> : `₹${deliveryFee}`}</span>
              </div>

              {/* Bhatti Wallet Ember Reductions */}
              {emberCheckout.goldenDeduction > 0 && (
                <div className="flex justify-between text-amber-700 font-mono">
                  <span>✨ Golden Embers Applied (100% Cap)</span>
                  <span>-₹{emberCheckout.goldenDeduction}</span>
                </div>
              )}

              {emberCheckout.standardDeduction > 0 && (
                <div className="flex justify-between text-orange-700 font-mono">
                  <span>🔥 Standard Embers Applied (30% Cap)</span>
                  <span>-₹{emberCheckout.standardDeduction}</span>
                </div>
              )}

              <div className="flex justify-between text-brand-charcoal text-sm font-black pt-2 border-t border-brand-green/5">
                <span>Final Payable Target</span>
                <span className="text-base text-brand-green font-mono">
                  ₹{finalTotal} {finalTotal === 0 && <span className="text-[10px] font-bold text-amber-600 uppercase">(100% Embers)</span>}
                </span>
              </div>

              {/* 10% Standard Ember Earning Note */}
              <div className="flex items-center justify-between text-[10px] text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/60 font-medium">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Standard Embers earned on completion:
                </span>
                <span className="font-mono font-black text-amber-900">
                  +{Math.max(1, Math.round(finalTotal * 0.10))} Coins (10%)
                </span>
              </div>

              {/* Kitchen geofence routing indicator */}
              {allKitchens.length > 0 && targetCoords && (
                <div className={`mt-2 p-3 rounded-xl border text-[10px] leading-relaxed flex flex-col gap-1 ${
                  deliveryKitchenInfo.inRange 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                    : 'bg-red-950/20 border-red-500/20 text-red-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[9px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${deliveryKitchenInfo.inRange ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                    {deliveryKitchenInfo.inRange ? 'Kitchen Delivery Routing Active' : 'Kitchen Geofence / Availability Notice'}
                  </div>
                  {deliveryKitchenInfo.reason === 'no_available_kitchens' ? (
                    <div className="text-red-300 font-bold">
                      ⚠️ All kitchen branches in your region are currently unavailable or paused for new orders.
                    </div>
                  ) : deliveryKitchenInfo.closestKitchen ? (
                    <div>
                      {deliveryKitchenInfo.inRange ? (
                        <>
                          Your order will be routed to available branch: <strong className="text-white font-extrabold">{deliveryKitchenInfo.closestKitchen.name}</strong> ({deliveryKitchenInfo.distance.toFixed(1)} km away, delivery limit {deliveryKitchenInfo.closestKitchen.geofenceRadius || 5} km).
                        </>
                      ) : (
                        <>
                          The closest available kitchen is <strong className="text-white font-extrabold">{deliveryKitchenInfo.closestKitchen.name}</strong> ({deliveryKitchenInfo.distance.toFixed(1)} km away), but its delivery radius is {deliveryKitchenInfo.closestKitchen.geofenceRadius || 5} km. All available kitchens are outside your address radius!
                        </>
                      )}
                    </div>
                  ) : (
                    <div>No active kitchens found.</div>
                  )}
                </div>
              )}

              {/* Developer Kill Switch: Accepting Orders Notice */}
              {!featureFlags.acceptingOrders && (
                <div className="mt-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>{featureFlags.closedOrderMessage || "TAASH BHATTI is temporarily not accepting new orders. Please check back shortly!"}</span>
                </div>
              )}
            </div>

            <button
              id="cart-checkout-btn"
              onClick={handleCheckout}
              disabled={
                !featureFlags.acceptingOrders ||
                (allKitchens.length > 0 && (
                  (fulfillmentType === 'delivery' && !deliveryKitchenInfo.inRange) ||
                  !allKitchens.some(k => k.isActive !== false && k.isTakingOrders !== false)
                ))
              }
              className="w-full mt-2 bg-brand-green hover:bg-brand-green/95 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {!featureFlags.acceptingOrders ? (
                <span>ORDERS CURRENTLY PAUSED</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-brand-orange" /> CONFIRM & PLACE MEAL ORDER
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
