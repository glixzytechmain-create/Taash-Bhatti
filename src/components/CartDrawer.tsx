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
  Maximize2,
  Utensils,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Gift,
  Clock,
  Info,
  FileText,
  ChevronDown,
  ChevronUp,
  Truck,
  HeartHandshake,
  ChefHat,
} from 'lucide-react';
import { calculateEmberCheckoutUsage, debitEmberCoinsForOrder, creditGoldenEmbersForShortfall } from '../lib/walletService';
import { doc, getDoc, updateDoc, collection, onSnapshot, query, where, getDocs, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Meal, Gym, Order, User, OrderItem, Kitchen, AppFeatureFlags, SmartCoupon, CouponEvaluationContext, SmartCouponRedemptionRecord } from '../types';
import { evaluateSmartCoupon, getEligibleCoupons, normalizeSmartCoupon, searchPublicCoupons, generateDefaultTerms } from '../lib/couponEngine';
import { getStoredFeatureFlags, subscribeFeatureFlags } from '../lib/featureFlags';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, reverseGeocodeCoords, isGoogleMapsAuthFailed } from '../lib/googleMaps';
import { LeafletMap } from './LeafletMap';
import FullScreenAddressPinModal from './FullScreenAddressPinModal';
import GoesWellWithExtension from './GoesWellWithExtension';

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
  const [useLeaflet, setUseLeaflet] = useState(() => isGoogleMapsAuthFailed());
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  useEffect(() => {
    const handleFail = () => setUseLeaflet(true);
    window.addEventListener('fitzaika_maps_auth_failed', handleFail);
    return () => window.removeEventListener('fitzaika_maps_auth_failed', handleFail);
  }, []);

  const handleLeafletSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const q = searchQuery.toLowerCase();
    const matched = MUZAFFARPUR_LOCATIONS.find((loc) => loc.name.toLowerCase().includes(q));
    if (matched) {
      setMapCoords({ lat: matched.lat, lng: matched.lng });
      setMapAddress(matched.name);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Muzaffarpur')}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setMapCoords({ lat, lng });
          setMapAddress(data[0].display_name);
          setLoading(false);
          return;
        }
      }
    } catch (e) {}

    setMapAddress(`${searchQuery}, Muzaffarpur, Bihar`);
    setLoading(false);
  };

  if (useLeaflet || !GOOGLE_MAPS_API_KEY) {
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
                  handleLeafletSearch();
                }
              }}
              className="w-full bg-white border border-brand-green/20 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-brand-charcoal placeholder-brand-charcoal/40 focus:outline-none focus:border-brand-green"
            />
          </div>
          <button
            type="button"
            onClick={handleLeafletSearch}
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
        <div 
          onClick={() => setIsFullScreenOpen(true)}
          className="h-44 w-full rounded-2xl overflow-hidden border border-brand-green/15 relative shadow-sm cursor-pointer group"
          title="Click to expand map to full screen"
        >
          <LeafletMap
            center={mapCoords}
            zoom={14}
            interactive={true}
            draggableCustomerPin={true}
            points={[{ lat: mapCoords.lat, lng: mapCoords.lng, label: 'Delivery Location', type: 'customer' }]}
            onPositionSelect={async (coords) => {
              setMapCoords(coords);
              const addr = await reverseGeocodeCoords(coords.lat, coords.lng);
              setMapAddress(addr);
            }}
            className="w-full h-full"
          />

          {/* TAP TO MAKE MAP BIGGER MESSAGE BADGE */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreenOpen(true);
            }}
            className="absolute bottom-2 inset-x-2 z-10 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center justify-between text-[10px] font-bold cursor-pointer transition-all shadow-md group-hover:border-emerald-400"
          >
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>✨ Tap map to enlarge full-screen for precise doorstep pin & address search</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 group-hover:bg-emerald-500 shrink-0">
              <Maximize2 className="w-2.5 h-2.5" /> Enlarge
            </span>
          </div>
        </div>

        {/* FULLSCREEN DOORSTEP PIN MODAL */}
        <FullScreenAddressPinModal
          isOpen={isFullScreenOpen}
          onClose={() => setIsFullScreenOpen(false)}
          initialCoords={mapCoords}
          initialAddress={mapAddress}
          onConfirmPin={(coords, address) => {
            setMapCoords(coords);
            setMapAddress(address);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly" solutionChannel="gmp_git_agentskills_v1">
        <CustomerMapAndSearchContent
          mapCoords={mapCoords}
          setMapCoords={setMapCoords}
          mapAddress={mapAddress}
          setMapAddress={setMapAddress}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          loading={loading}
          setLoading={setLoading}
          onOpenFullScreen={() => setIsFullScreenOpen(true)}
        />
      </APIProvider>

      {/* FULLSCREEN DOORSTEP PIN MODAL */}
      <FullScreenAddressPinModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        initialCoords={mapCoords}
        initialAddress={mapAddress}
        onConfirmPin={(coords, address) => {
          setMapCoords(coords);
          setMapAddress(address);
        }}
      />
    </>
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
  onOpenFullScreen,
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

  const handleMapClick = async (e: any) => {
    if (e.detail && e.detail.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setMapCoords({ lat, lng });
      const address = await reverseGeocodeCoords(lat, lng);
      setMapAddress(address);
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
        <div 
          onClick={onOpenFullScreen}
          className="h-44 w-full rounded-2xl overflow-hidden border border-brand-green/15 relative shadow-sm cursor-pointer group"
          title="Click to expand map to full screen"
        >
          <GoogleMap
            center={mapCoords}
            zoom={14}
            gestureHandling={'cooperative'}
            disableDefaultUI={true}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_git_agentskills_v1', 'gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
          >
            <AdvancedMarker position={mapCoords}>
              <Pin background={'#2E7D32'} borderColor={'#FFF'} glyphColor={'#FFF'} />
            </AdvancedMarker>
          </GoogleMap>

          {/* TAP TO MAKE MAP BIGGER MESSAGE BADGE */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullScreen?.();
            }}
            className="absolute bottom-2 inset-x-2 z-10 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center justify-between text-[10px] font-bold cursor-pointer transition-all shadow-md group-hover:border-emerald-400"
          >
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>✨ Tap map to enlarge full-screen for precise doorstep pin & address search</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 group-hover:bg-emerald-500 shrink-0">
              <Maximize2 className="w-2.5 h-2.5" /> Enlarge
            </span>
          </div>
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
            onOpenFullScreen?.();
          }}
          className="h-44 w-full rounded-2xl bg-[#0F172A] border border-brand-green/20 relative overflow-hidden flex flex-col justify-between p-3.5 font-mono text-[9px] text-emerald-400 cursor-crosshair select-none shadow-inner group"
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

          {/* TAP TO MAKE MAP BIGGER MESSAGE BADGE */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullScreen?.();
            }}
            className="relative z-10 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center justify-between text-[10px] font-bold cursor-pointer transition-all shadow-md group-hover:border-emerald-400"
          >
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>✨ Tap map to enlarge full-screen for precise doorstep pin & address search</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 group-hover:bg-emerald-500 shrink-0">
              <Maximize2 className="w-2.5 h-2.5" /> Enlarge
            </span>
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

const CHEF_QUICK_TAGS = [
  { id: 'less_spicy', label: '🌶️ Less Spicy' },
  { id: 'extra_chutney', label: '🧅 Extra Chutney & Onions' },
  { id: 'well_done', label: '🔥 Well Done / Extra Charred' },
  { id: 'no_cutlery', label: '🍴 No Disposable Cutlery' },
  { id: 'low_oil', label: '🧂 Low Oil / Light Masala' },
  { id: 'pack_gravy', label: '🧊 Pack Gravy Separately' },
];

const DELIVERY_QUICK_TAGS = [
  { id: 'leave_door', label: '🚪 Leave at door' },
  { id: 'no_bell', label: "🔕 Don't ring bell (Baby / Pet)" },
  { id: 'call_arrival', label: '📞 Call only upon arrival' },
  { id: 'leave_security', label: '💂 Leave with society security guard' },
  { id: 'do_not_call', label: '🚫 Do not call' },
];

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (mealId: string, delta: number) => void;
  onRemoveItem: (mealId: string) => void;
  selectedBhatti?: Kitchen | null;
  user: User;
  onPlaceOrder: (newOrder: Order) => void;
  onClearCart: () => void;
  onSelectTab: (tab: any) => void;
  onUpdateUser: (updated: User) => Promise<void> | void;
  allKitchens?: Kitchen[];
  allMeals?: Meal[];
  likedMeals?: string[];
  onAddToCart?: (meal: Meal) => void;
  initialCouponCode?: string | null;
  dineInSession?: { tableNumber: string; bhattiId: string; bhattiName?: string; isFromQR?: boolean } | null;
  onClearDineInSession?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  selectedBhatti,
  user,
  onPlaceOrder,
  onClearCart,
  onSelectTab,
  onUpdateUser,
  allKitchens = [],
  allMeals = [],
  likedMeals = [],
  onAddToCart,
  initialCouponCode,
  dineInSession,
  onClearDineInSession,
}: CartDrawerProps) {
  // Coupon input state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]); // Array of applied coupons in stack
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  // Available Smart Coupons from Firestore & User Completed Orders
  const [allAvailableCoupons, setAllAvailableCoupons] = useState<SmartCoupon[]>([]);
  const [userCompletedOrderCount, setUserCompletedOrderCount] = useState<number>(0);
  const [showBrowseOffers, setShowBrowseOffers] = useState(false);
  const [publicOfferSearch, setPublicOfferSearch] = useState('');
  const [viewingTcCoupon, setViewingTcCoupon] = useState<SmartCoupon | null>(null);

  // Real-time listener for active coupons in cart
  useEffect(() => {
    if (!isOpen) return;
    const couponsCol = collection(db, 'coupons');
    const unsub = onSnapshot(couponsCol, (snap) => {
      const list: SmartCoupon[] = [];
      snap.forEach((d) => {
        const raw = { id: d.id, ...d.data() };
        try {
          list.push(normalizeSmartCoupon(raw));
        } catch (_) {}
      });
      setAllAvailableCoupons(list);
    }, (err) => {
      console.warn("Could not load coupons in cart:", err);
    });
    return () => unsub();
  }, [isOpen]);

  // Load customer completed order count to verify sequence criteria (e.g. 1st order only, Nth order)
  useEffect(() => {
    const uid = user.id || auth.currentUser?.uid;
    if (!uid || !isOpen) return;

    const fetchOrdersCount = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', uid),
          where('status', '==', 'delivered')
        );
        const snap = await getDocs(q);
        setUserCompletedOrderCount(snap.size);
      } catch (err) {
        console.warn("Could not fetch user order count for coupon evaluation:", err);
      }
    };
    fetchOrdersCount();
  }, [user.id, auth.currentUser?.uid, isOpen]);

  // Preload coupon code if passed from Bhatti GameOn or User Vault
  useEffect(() => {
    if (initialCouponCode && isOpen) {
      setCouponCode(initialCouponCode.trim().toUpperCase());
      setCouponError(null);
    }
  }, [initialCouponCode, isOpen]);

  // App-wide feature flags (Accepting orders kill switch, etc.)
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    return () => unsubscribe();
  }, []);

  // Fulfillment Mode: Delivery vs Takeaway vs Dine-In Table Service
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'takeaway' | 'dine_in'>('delivery');

  // Dine-In Specific State
  const [dineInGuestName, setDineInGuestName] = useState(user.name || '');
  const [dineInGuestPhone, setDineInGuestPhone] = useState(user.phone || '');
  const [selectedTableNumber, setSelectedTableNumber] = useState(dineInSession?.tableNumber || '');
  const [selectedDineInKitchenId, setSelectedDineInKitchenId] = useState(dineInSession?.bhattiId || selectedBhatti?.id || (allKitchens[0]?.id || ''));

  // Sync when dineInSession changes or is active
  useEffect(() => {
    if (dineInSession) {
      setFulfillmentType('dine_in');
      setSelectedTableNumber(dineInSession.tableNumber);
      if (dineInSession.bhattiId) {
        setSelectedDineInKitchenId(dineInSession.bhattiId);
      }
    }
  }, [dineInSession]);

  // Sync user profile name/phone into guest fields if empty
  useEffect(() => {
    if (user.name && !dineInGuestName) setDineInGuestName(user.name);
    if (user.phone && !dineInGuestPhone) setDineInGuestPhone(user.phone);
  }, [user.name, user.phone]);

  // Derived selected Dine-In Kitchen
  const selectedDineInKitchen = useMemo(() => {
    if (selectedDineInKitchenId) {
      const match = allKitchens.find(k => k.id === selectedDineInKitchenId);
      if (match) return match;
    }
    if (selectedBhatti) return selectedBhatti;
    return allKitchens[0] || null;
  }, [selectedDineInKitchenId, selectedBhatti, allKitchens]);

  // Derived Table Occupancy Status for Selected Bhatti
  const dineInTableStatus = useMemo(() => {
    if (!selectedDineInKitchen) return { hasTables: false, allOccupied: false, availableCount: 0, totalCount: 0, tables: [] };
    const tables = selectedDineInKitchen.tables || [];
    const available = tables.filter(t => !t.isOccupied);
    return {
      hasTables: tables.length > 0,
      allOccupied: tables.length > 0 && available.length === 0,
      availableCount: available.length,
      totalCount: tables.length,
      tables,
    };
  }, [selectedDineInKitchen]);

  // Order Timing State: ASAP vs Scheduled Slot
  const [orderTiming, setOrderTiming] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledSlot, setScheduledSlot] = useState<string>('Today, 1:30 PM - 2:00 PM');

  // Item Customizations Map: { [itemIdx: number]: OrderItemCustomization }
  const [itemCustomizations, setItemCustomizations] = useState<Record<number, any>>({});
  const [customizingItemIndex, setCustomizingItemIndex] = useState<number | null>(null);

  // Goes Well With Extension dismissed state per item key
  const [dismissedPairingItemKeys, setDismissedPairingItemKeys] = useState<string[]>([]);

  // User Deck / Favorite Meals Suggestions shown below added items in cart
  // ONLY show what is actually in user's deck (no fallback mock/dummy items)
  const deckSuggestions = useMemo(() => {
    if (!allMeals || allMeals.length === 0 || !likedMeals || likedMeals.length === 0) return [];
    return allMeals.filter(m => likedMeals.includes(m.id));
  }, [allMeals, likedMeals]);

  // --- HIGH-CONVERTING FOOD-TECH FEATURES ---
  // 1. Free Delivery Shortfall & 1-Step-Ahead Gold Ember Coin Banking
  const [bankShortfallToGec, setBankShortfallToGec] = useState<boolean>(false);

  // 2. Cooking Instructions & Chef Notes
  const [selectedChefTags, setSelectedChefTags] = useState<string[]>([]);
  const [customChefNote, setCustomChefNote] = useState<string>('');

  // 3. Delivery Instructions & Gate Notes (Rider Notes)
  const [selectedDeliveryTags, setSelectedDeliveryTags] = useState<string[]>([]);
  const [customDeliveryNote, setCustomDeliveryNote] = useState<string>('');

  // 4. Rider Tipping
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [isCustomTipActive, setIsCustomTipActive] = useState<boolean>(false);

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
      const isDealItem = Boolean(item.isDeal || item.dealId);
      const custom = isDealItem ? null : (itemCustomizations[idx] || item.customization);
      let extra = 0;
      if (!isDealItem) {
        if (custom?.portionSize === 'large') extra += 40;
        if (custom?.portionSize === 'jumbo') extra += 80;
        if (custom?.addOns && Array.isArray(custom.addOns)) {
          extra += custom.addOns.reduce((aSum: number, addon: any) => aSum + (addon.price || 0), 0);
        }
      }
      const itemPrice = (item.meal.price + extra) * item.quantity;
      if (isDealItem) {
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
  const couponDiscountVal = useMemo(() => {
    if (appliedCoupons.length === 0 || regularSubtotal === 0) return 0;
    let sumDiscount = 0;
    for (const c of appliedCoupons) {
      if (c.discountType === 'percentage') {
        const raw = Math.round(regularSubtotal * ((c.discountValue || 0) / 100));
        const maxCap = c.criteria?.maxDiscountCap || c.maxDiscountCap;
        sumDiscount += maxCap ? Math.min(raw, maxCap) : raw;
      } else if (c.discountType === 'fixed') {
        sumDiscount += (c.discountValue || 0);
      }
    }
    return Math.min(regularSubtotal, sumDiscount);
  }, [regularSubtotal, appliedCoupons]);

  // 5. TOTAL CALCULATION & CONVERSION TRIGGERS
  const FREE_DELIVERY_THRESHOLD = 500;
  const freeDeliveryShortfall = Math.max(0, FREE_DELIVERY_THRESHOLD - regularSubtotal);

  // Real Menu Recommendations for Free Delivery Gap
  const realMenuRecommendations = useMemo(() => {
    if (!allMeals || allMeals.length === 0) return [];
    const inCartIds = new Set(cartItems.map((item) => item.meal.id));
    const candidates = allMeals.filter((m) => {
      if (inCartIds.has(m.id)) return false;
      if ((m as any).isAvailable === false || (m as any).available === false) return false;
      return true;
    });

    // Group A: items with price >= freeDeliveryShortfall, sorted ascending by price (closest bridge to free delivery)
    const exactOrHigher = candidates
      .filter((m) => m.price >= freeDeliveryShortfall)
      .sort((a, b) => a.price - b.price);

    // Group B: items with price < freeDeliveryShortfall, sorted descending by price (highest value add-ons towards shortfall)
    const lower = candidates
      .filter((m) => m.price < freeDeliveryShortfall)
      .sort((a, b) => b.price - a.price);

    return [...exactOrHigher, ...lower].slice(0, 8);
  }, [allMeals, cartItems, freeDeliveryShortfall]);

  const isFreeDeliveryCoupon = useMemo(() => {
    return appliedCoupons.some((c) => c.discountType === 'free_delivery');
  }, [appliedCoupons]);

  const totalDiscount = gymDiscountVal + couponDiscountVal;

  // Shortfall amount banked into Gold Ember Coins (1 GEC = ₹1)
  const gecShortfallAmount = (bankShortfallToGec && freeDeliveryShortfall > 0 && fulfillmentType === 'delivery') ? freeDeliveryShortfall : 0;

  // Free delivery for Takeaway & Dine-In Table Service OR if order is above ₹500, OR a free delivery coupon is applied, OR customer banked shortfall to GEC
  const isFreeDeliveryQualified = 
    fulfillmentType === 'takeaway' || 
    fulfillmentType === 'dine_in' || 
    regularSubtotal >= FREE_DELIVERY_THRESHOLD || 
    isFreeDeliveryCoupon ||
    gecShortfallAmount > 0;

  const deliveryFee = isFreeDeliveryQualified ? 0 : 30;

  // Effective rider tip (only applicable on delivery)
  const effectiveRiderTip = fulfillmentType === 'delivery'
    ? (isCustomTipActive ? Math.max(0, Number(customTipInput) || 0) : selectedTip)
    : 0;

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

  const finalTotal = emberCheckout.finalPayable + gecShortfallAmount + effectiveRiderTip;

  // Compile Pure Evaluation Context for Smart Criteria Engine
  const evalContext: CouponEvaluationContext = useMemo(() => {
    return {
      subtotal: regularSubtotal,
      cartItems: cartItems.map((item) => ({
        mealId: item.meal.id,
        mealName: item.meal.name,
        category: (item.meal as any).category || (item.meal.goals ? item.meal.goals[0] : undefined),
        price: item.meal.price,
        quantity: item.quantity,
        isVeg: item.meal.isVeg,
        isDeal: Boolean(item.isDeal || item.dealId || item.meal.id.startsWith('deal-') || item.meal.goals?.includes('gourmet_special' as any)),
      })),
      fulfillmentMode: (fulfillmentType as any) || 'delivery',
      kitchenId: (fulfillmentType === 'dine_in' ? (selectedDineInKitchen?.id || dineInSession?.bhattiId) : selectedBhatti?.id) || undefined,
      user: {
        id: user?.id || auth.currentUser?.uid || undefined,
        email: user?.email || auth.currentUser?.email || undefined,
        phone: user?.phone || undefined,
        completedOrderCount: userCompletedOrderCount,
        lastOrderDate: (user as any)?.lastOrderDate || undefined,
      },
      appliedCoupons: appliedCoupons.map((c) => ({
        code: c.code,
        isStackable: c.isStackable ?? c.criteria?.isStackable,
        stackableWith: c.stackableWith ?? c.criteria?.stackableWith,
      })),
    };
  }, [
    regularSubtotal,
    cartItems,
    fulfillmentType,
    selectedDineInKitchen?.id,
    dineInSession?.bhattiId,
    selectedBhatti?.id,
    user,
    userCompletedOrderCount,
    appliedCoupons,
  ]);

  // Compute Ready-to-apply and Almost-eligible Smart Coupons
  const { eligible: eligibleCoupons, almostEligible: almostEligibleCoupons } = useMemo(() => {
    if (!allAvailableCoupons || allAvailableCoupons.length === 0) {
      return { eligible: [], almostEligible: [] };
    }
    const unapplied = allAvailableCoupons.filter(
      (c) => !appliedCoupons.some((ac) => ac.code === c.code || ac.id === c.code)
    );
    return getEligibleCoupons(unapplied, evalContext);
  }, [allAvailableCoupons, appliedCoupons, evalContext]);

  // Search & filter active public coupons for customer exploration
  const publicOffersList = useMemo(() => {
    return searchPublicCoupons(allAvailableCoupons, publicOfferSearch, evalContext);
  }, [allAvailableCoupons, publicOfferSearch, evalContext]);

  // Helper to render responsive fulfillment mode badge
  const renderModeBadge = (coupon: SmartCoupon) => {
    const modes = coupon.criteria?.allowedChannels;
    if (!modes || modes.length === 0 || (modes.includes('delivery') && modes.includes('takeaway') && modes.includes('dine_in'))) {
      return (
        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30 shrink-0">
          ⭐ All Modes
        </span>
      );
    }
    if (modes.length === 1) {
      if (modes[0] === 'delivery') {
        return (
          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 border border-blue-500/30 shrink-0">
            🚚 Delivery
          </span>
        );
      }
      if (modes[0] === 'takeaway') {
        return (
          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 border border-purple-500/30 shrink-0">
            🛍️ Takeaway
          </span>
        );
      }
      if (modes[0] === 'dine_in') {
        return (
          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-700 border border-orange-500/30 shrink-0">
            🍽️ Dine-In
          </span>
        );
      }
    }
    return (
      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-stone-500/15 text-stone-700 border border-stone-500/30 shrink-0">
        {modes.map(m => m === 'delivery' ? '🚚' : m === 'takeaway' ? '🛍️' : '🍽️').join(' ')}
      </span>
    );
  };

  // Core smart coupon application routine
  const applyCouponByCode = async (rawCode: string) => {
    setCouponError(null);
    setCouponSuccess(null);

    const codeClean = rawCode.trim().toUpperCase();
    if (!codeClean) return;

    // Check if cart has only deals
    if (regularSubtotal === 0 && dealsSubtotal > 0) {
      setCouponError("Coupons cannot be applied to Deals & Combos. Deals already feature exclusive bundle pricing. Add regular menu items to use coupons.");
      return;
    }

    // Check for duplicates
    if (appliedCoupons.some((c) => c.code === codeClean || c.id === codeClean)) {
      setCouponError("This coupon code is already applied to your order.");
      return;
    }

    try {
      let targetCoupon = allAvailableCoupons.find((c) => c.code === codeClean || c.id === codeClean);
      if (!targetCoupon) {
        const couponRef = doc(db, 'coupons', codeClean);
        const couponSnap = await getDoc(couponRef);
        if (!couponSnap.exists()) {
          setCouponError("Invalid coupon code. This coupon does not exist or has expired.");
          return;
        }
        targetCoupon = normalizeSmartCoupon({ id: codeClean, ...couponSnap.data() });
      }

      // Execute comprehensive smart validation
      const evalResult = evaluateSmartCoupon(targetCoupon, evalContext);

      if (!evalResult.isValid) {
        setCouponError(evalResult.helpfulHint || evalResult.rejectionReason || "Coupon cannot be applied to this cart.");
        return;
      }

      // Add to applied stack
      setAppliedCoupons((prev) => [...prev, targetCoupon!]);
      setCouponCode('');

      if (targetCoupon.discountType === 'percentage') {
        const capText = targetCoupon.criteria?.maxDiscountCap ? ` up to ₹${targetCoupon.criteria.maxDiscountCap}` : '';
        setCouponSuccess(`🎉 Code '${targetCoupon.code}' applied! (-${targetCoupon.discountValue}%${capText})`);
      } else if (targetCoupon.discountType === 'fixed') {
        setCouponSuccess(`🎉 Flat discount applied! (-₹${targetCoupon.discountValue})`);
      } else if (targetCoupon.discountType === 'free_delivery') {
        setCouponSuccess(`🚚 Free delivery unlocked with '${targetCoupon.code}'!`);
      } else if (targetCoupon.discountType === 'free_perk') {
        setCouponSuccess(`🎁 Complimentary reward unlocked: ${targetCoupon.perkName || 'Chef Special'}!`);
      }
    } catch (err) {
      console.error("Error applying smart coupon:", err);
      setCouponError("Could not check coupon. Please retry.");
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyCouponByCode(couponCode);
  };

  // Place order trigger
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const isDineIn = fulfillmentType === 'dine_in';
    const isTakeaway = fulfillmentType === 'takeaway';

    if (!auth.currentUser && !isDineIn) {
      alert("🔒 Authentication Required: Please sign in or register to place your meal order.");
      onClose();
      onSelectTab('account');
      return;
    }

    if (isDineIn) {
      const gName = (dineInGuestName || user.name || '').trim();
      const gPhone = (dineInGuestPhone || user.phone || '').replace(/\D/g, '');
      if (!gName) {
        alert("👤 Please enter your name for the table service.");
        return;
      }
      if (!gPhone || gPhone.length < 10) {
        alert("📱 Please enter a valid 10-digit mobile number for table order updates.");
        return;
      }
      const effectiveTable = (selectedTableNumber || dineInSession?.tableNumber || '').trim();
      if (!effectiveTable) {
        alert("🍽️ Please select or enter your table number for dine-in service.");
        return;
      }
      // Check if Bhatti all tables occupied (unless from physical table QR code)
      if (!dineInSession?.isFromQR && dineInTableStatus.allOccupied) {
        alert(`⚠️ All tables at ${selectedDineInKitchen?.name || 'this Bhatti'} are currently occupied. Dine-in is temporarily full.`);
        return;
      }
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
    if ((fulfillmentType === 'takeaway' || isDineIn) && allKitchens.length > 0 && !anyKitchenAvailable) {
      alert("⚠️ All Kitchens Unavailable: All kitchen counters are currently paused or taking no orders. Please try again later!");
      return;
    }

    // 8-digit numeric code for order ID
    const orderId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const takeawayOtp = isTakeaway ? Math.floor(1000 + Math.random() * 9000).toString() : undefined;

    const effectiveTable = isDineIn ? (selectedTableNumber || dineInSession?.tableNumber || 'Table 1').trim() : undefined;
    const finalCustomerName = isDineIn ? (dineInGuestName || user.name || 'Dine-In Guest').trim() : (user.name || 'Customer');
    const finalCustomerPhone = isDineIn ? (dineInGuestPhone || user.phone || 'N/A').trim() : (user.phone || 'N/A');

    let finalAddress = isDineIn
      ? `Dine-In • ${effectiveTable} (${selectedDineInKitchen?.name || 'Taash Bhatti'})`
      : isTakeaway
      ? (selectedAddress ? `Self-Pickup (Customer Area: ${selectedAddress})` : 'Self-Pickup (Cloud Kitchen Counter)')
      : selectedAddress;

    // Append perk description if present
    const perkCoupons = appliedCoupons.filter((c) => c.discountType === 'free_perk');
    if (perkCoupons.length > 0) {
      const perksDesc = perkCoupons.map((c) => c.perkName).join(', ');
      finalAddress = `${finalAddress} (🎁 Unlocked Perks: ${perksDesc})`;
    }

    const destinationTitle = isDineIn ? `Table Service (${effectiveTable})` : isTakeaway ? 'Counter Pickup' : 'Doorstep Drop';
    const destinationDesc = isDineIn
      ? `Fresh Handi cooked and served directly to ${effectiveTable} at ${selectedDineInKitchen?.name || 'Taash Bhatti'}`
      : isTakeaway
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

    // Kitchen targeting: For Dine-in, target the selected Dine-In kitchen
    const eligibleKitchenIds = isDineIn && selectedDineInKitchen
      ? [selectedDineInKitchen.id]
      : selectedBhatti 
      ? [selectedBhatti.id] 
      : allKitchens.map(k => k.id);

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

    // Attach custom options to items (deals do not have portion/ingredient customization)
    const enrichedItems: OrderItem[] = cartItems.map((item, idx) => ({
      ...item,
      customization: (item.isDeal || item.dealId) ? undefined : (itemCustomizations[idx] || item.customization),
    }));

    const slotLabel = orderTiming === 'scheduled' ? `Scheduled: ${scheduledSlot}` : 'ASAP (15-25 mins)';

    // Combine chef notes and quick tags
    const combinedChefNotesList = [...selectedChefTags];
    if (customChefNote.trim()) {
      combinedChefNotesList.push(customChefNote.trim());
    }
    const combinedChefNoteString = combinedChefNotesList.length > 0
      ? combinedChefNotesList.join(' • ')
      : isDineIn 
      ? `DINE-IN ORDER FOR ${effectiveTable}. Customer: ${finalCustomerName} (${finalCustomerPhone})`
      : `Nutritional balance verified. Timing: ${slotLabel}`;

    // Combine delivery instructions and notes
    const combinedDeliveryInstructionsList = [...selectedDeliveryTags];
    if (customDeliveryNote.trim()) {
      combinedDeliveryInstructionsList.push(customDeliveryNote.trim());
    }
    const combinedDeliveryNoteString = combinedDeliveryInstructionsList.length > 0
      ? combinedDeliveryInstructionsList.join(' • ')
      : undefined;

    const newOrder: Order = {
      id: orderId,
      items: enrichedItems,
      userId: auth.currentUser?.uid || (isDineIn ? `guest_table_${orderId}` : ''),
      isDineInGuest: isDineIn && !auth.currentUser,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      guestName: isDineIn ? finalCustomerName : undefined,
      guestPhone: isDineIn ? finalCustomerPhone : undefined,
      tableNumber: isDineIn ? effectiveTable : undefined,
      dineInBhattiId: isDineIn ? (selectedDineInKitchen?.id || selectedBhatti?.id) : undefined,
      dineInBhattiName: isDineIn ? (selectedDineInKitchen?.name || selectedBhatti?.name) : undefined,
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
      chefNote: combinedChefNoteString,
      chefNotes: selectedChefTags.length > 0 ? selectedChefTags : undefined,
      deliveryNotes: combinedDeliveryNoteString,
      deliveryInstructions: selectedDeliveryTags.length > 0 ? selectedDeliveryTags : undefined,
      riderTip: effectiveRiderTip > 0 ? effectiveRiderTip : undefined,
      gecAddedAmount: gecShortfallAmount > 0 ? gecShortfallAmount : undefined,
      gecCoinsEarned: gecShortfallAmount > 0 ? gecShortfallAmount : undefined,
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
      preferredKitchenId: selectedBhatti ? selectedBhatti.id : undefined,
      kitchenId: selectedBhatti ? selectedBhatti.id : "",
      kitchenName: selectedBhatti ? selectedBhatti.name : "All Available Bhattis",
      eligibleKitchenIds: eligibleKitchenIds,
      deliveryLat: activeDeliveryCoords.lat,
      deliveryLng: activeDeliveryCoords.lng,
      acceptedByKitchenId: "",
      acceptedKitchenName: "",
      acceptedKitchenAddress: selectedBhatti ? selectedBhatti.address : "",
      rejectedByKitchenIds: [],
    };

    // Increment coupon usage count dynamically and accumulate totalSavings in Firestore
    for (const coupon of appliedCoupons) {
      if (coupon.id || coupon.code) {
        const cId = coupon.id || coupon.code;
        try {
          // Calculate savings contribution for this specific coupon
          let savingsContrib = 0;
          if (coupon.discountType === 'percentage') {
            const raw = Math.round(regularSubtotal * ((coupon.discountValue || 0) / 100));
            const maxCap = coupon.criteria?.maxDiscountCap || coupon.maxDiscountCap;
            savingsContrib = maxCap ? Math.min(raw, maxCap) : raw;
          } else if (coupon.discountType === 'fixed') {
            savingsContrib = Math.min(regularSubtotal, coupon.discountValue || 0);
          } else if (coupon.discountType === 'free_delivery') {
            savingsContrib = 30; // Delivery fee saved
          }

          const couponRef = doc(db, 'coupons', cId);
          const snap = await getDoc(couponRef);
          if (snap.exists()) {
            const currentData = snap.data();
            const currentCount = currentData.usageCount || 0;
            const currentGlobalCount = currentData.globalUsageCount || currentCount || 0;
            const currentSavings = currentData.totalSavings || 0;
            const currentBreakdown = currentData.channelBreakdown || { delivery: 0, takeaway: 0, dine_in: 0 };
            const channelKey: 'delivery' | 'takeaway' | 'dine_in' =
              fulfillmentType === 'takeaway' ? 'takeaway' : fulfillmentType === 'dine_in' ? 'dine_in' : 'delivery';
            currentBreakdown[channelKey] = (currentBreakdown[channelKey] || 0) + 1;

            const redemptionRecord: SmartCouponRedemptionRecord = {
              orderId: orderId,
              userId: auth.currentUser?.uid || user.id || 'guest',
              userName: finalCustomerName || user.name || 'Customer',
              userPhone: finalCustomerPhone || user.phone || '',
              fulfillmentMode: channelKey,
              subtotal: regularSubtotal,
              discountAmount: savingsContrib,
              timestamp: new Date().toISOString()
            };

            const recentRedemptions = Array.isArray(currentData.recentRedemptions)
              ? [redemptionRecord, ...currentData.recentRedemptions].slice(0, 50)
              : [redemptionRecord];

            await updateDoc(couponRef, {
              usageCount: currentCount + 1,
              globalUsageCount: currentGlobalCount + 1,
              totalSavings: currentSavings + savingsContrib,
              channelBreakdown: currentBreakdown,
              recentRedemptions: recentRedemptions,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Error updating coupon usage/savings:", err);
        }
      }
    }

    // Debit Ember coins if used
    if (emberCheckout.totalEmberDiscount > 0) {
      const activeUserId = user.id || auth.currentUser?.uid || localStorage.getItem('fitzaika_guest_user_id') || 'guest_user';
      const newGolden = Math.max(0, goldenBalance - emberCheckout.goldenDeduction);
      const newStandard = Math.max(0, standardBalance - emberCheckout.standardDeduction);
      const newTotal = newGolden + newStandard;

      const updatedUser: User = {
        ...user,
        goldenEmberBalance: newGolden,
        standardEmberBalance: newStandard,
        walletBalance: newTotal
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      try {
        ['fitzaika_user_session', 'fitzaika_cached_user_profile'].forEach((key) => {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.goldenEmberBalance = newGolden;
            parsed.standardEmberBalance = newStandard;
            parsed.walletBalance = newTotal;
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        });
        window.dispatchEvent(
          new CustomEvent('fitzaika_user_updated', {
            detail: {
              goldenEmberBalance: newGolden,
              standardEmberBalance: newStandard,
              walletBalance: newTotal
            }
          })
        );
      } catch (e) {}

      try {
        await debitEmberCoinsForOrder({
          userId: activeUserId,
          orderId,
          goldenAmount: emberCheckout.goldenDeduction,
          standardAmount: emberCheckout.standardDeduction
        });
      } catch (emberErr) {
        console.warn("Could not debit ember coins:", emberErr);
      }
    }

    // Credit Gold Ember Coins if customer banked free delivery shortfall
    if (gecShortfallAmount > 0) {
      const activeUserId = user.id || auth.currentUser?.uid || localStorage.getItem('fitzaika_guest_user_id') || 'guest_user';
      try {
        await creditGoldenEmbersForShortfall({
          userId: activeUserId,
          orderId,
          amount: gecShortfallAmount
        });
      } catch (gecErr) {
        console.warn("Could not credit Golden Embers for shortfall:", gecErr);
      }

      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          goldenEmberBalance: (user.goldenEmberBalance || 0) + gecShortfallAmount,
          walletBalance: (user.walletBalance || 0) + gecShortfallAmount
        });
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
    setBankShortfallToGec(false);
    setSelectedChefTags([]);
    setCustomChefNote('');
    setSelectedDeliveryTags([]);
    setCustomDeliveryNote('');
    setSelectedTip(0);
    setCustomTipInput('');
    setIsCustomTipActive(false);
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

            {/* DINE-IN TABLE BADGE IF DINE-IN */}
            {fulfillmentType === 'dine_in' && (
              <div className="w-full bg-emerald-50 border-2 border-brand-green/40 rounded-2xl p-4 text-center max-w-xs space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-brand-green uppercase tracking-widest block">
                  🍽️ DINE-IN SERVICE CONFIRMED
                </span>
                <span className="text-2xl font-black text-brand-charcoal tracking-wide block font-mono bg-white py-1 rounded-xl border border-brand-green/30">
                  {selectedTableNumber || dineInSession?.tableNumber || 'Table'}
                </span>
                <p className="text-[9px] text-emerald-900/80 font-bold leading-tight">
                  Dishes will be delivered piping hot to your table at {selectedDineInKitchen?.name || dineInSession?.bhattiName || 'Taash Bhatti'}. Enjoy your meal!
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
              {/* FULFILLMENT MODE SELECTOR: DELIVERY vs TAKEAWAY vs DINE-IN TABLE */}
              <div className="bg-brand-cream/30 border border-brand-green/15 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/60 tracking-wider block">
                    Fulfillment Method
                  </span>
                  {dineInSession?.isFromQR ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-green/10 text-brand-green border border-brand-green/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
                      Table QR Seated
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-green/10 text-brand-green border border-brand-green/20">
                      3 Modes Available
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex flex-col justify-between cursor-pointer ${
                      fulfillmentType === 'delivery'
                        ? 'border-2 border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-base">🚚</span>
                      <span className="block leading-tight font-black text-[11px]">Delivery</span>
                    </div>
                    <span className={`text-[8px] block font-normal leading-tight ${fulfillmentType === 'delivery' ? 'text-emerald-100' : 'text-gray-500'}`}>
                      Doorstep Drop
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('takeaway')}
                    className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex flex-col justify-between cursor-pointer ${
                      fulfillmentType === 'takeaway'
                        ? 'border-2 border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-base">🛍️</span>
                      <span className="block leading-tight font-black text-[11px]">Pickup</span>
                    </div>
                    <span className={`text-[8px] block font-normal leading-tight ${fulfillmentType === 'takeaway' ? 'text-emerald-100' : 'text-gray-500'}`}>
                      Counter (₹0 Fee)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('dine_in')}
                    className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex flex-col justify-between cursor-pointer ${
                      fulfillmentType === 'dine_in'
                        ? 'border-2 border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-brand-green/10 bg-white text-brand-charcoal hover:bg-brand-cream/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-base">🍽️</span>
                      <span className="block leading-tight font-black text-[11px]">Dine-In</span>
                    </div>
                    <span className={`text-[8px] block font-normal leading-tight ${fulfillmentType === 'dine_in' ? 'text-emerald-100' : 'text-gray-500'}`}>
                      Table Service (₹0)
                    </span>
                  </button>
                </div>

                {fulfillmentType === 'takeaway' && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-900 font-semibold space-y-1">
                    <span className="font-extrabold block text-emerald-950">📍 Cloud Kitchen Pickup Counter:</span>
                    <p className="leading-snug">Order will be transmitted to nearby cloud kitchens. Counter address will be shown once accepted.</p>
                    <p className="text-[9px] text-emerald-700 font-bold">🔑 A 4-digit Pickup OTP will be generated upon checkout for counter verification.</p>
                  </div>
                )}

                {fulfillmentType === 'dine_in' && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-[10px] text-emerald-950 font-semibold space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold flex items-center gap-1 text-emerald-900">
                        <span>🍽️ Handi Table Service</span>
                        {dineInSession?.isFromQR && (
                          <span className="text-[8px] bg-brand-green text-white font-black px-1.5 py-0.5 rounded">QR SCANNED</span>
                        )}
                      </span>
                      {dineInSession && onClearDineInSession && (
                        <button
                          type="button"
                          onClick={onClearDineInSession}
                          className="text-[9px] text-rose-700 underline font-bold cursor-pointer"
                        >
                          Clear Table
                        </button>
                      )}
                    </div>
                    <p className="leading-snug text-emerald-800">
                      {dineInSession?.isFromQR
                        ? `Seated at ${selectedTableNumber || dineInSession.tableNumber} • Orders prepared fresh in clay oven and served to your table.`
                        : `Fresh clay-oven meals served directly to your designated table at the selected Bhatti.`}
                    </p>
                    {dineInTableStatus.allOccupied && !dineInSession?.isFromQR && (
                      <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-red-800 text-[10px] font-bold">
                        ⚠️ All tables currently occupied at {selectedDineInKitchen?.name || 'this Bhatti'}. You may still order for Takeaway or Delivery!
                      </div>
                    )}
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

              {/* DYNAMIC "ADD ₹X FOR FREE DELIVERY" PROGRESS BAR & UP-SELL ENGINE */}
              {fulfillmentType === 'delivery' && (
                <div className="bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/60 border border-brand-green/20 rounded-2xl p-3.5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-xs ${
                        isFreeDeliveryQualified ? 'bg-brand-green text-white animate-bounce' : 'bg-amber-500/20 text-amber-700'
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-brand-charcoal leading-tight">
                          {isFreeDeliveryCoupon ? (
                            '🎉 Free Delivery Unlocked with Coupon!'
                          ) : bankShortfallToGec && freeDeliveryShortfall > 0 ? (
                            '🪙 Free Delivery Unlocked via Gold Embers!'
                          ) : freeDeliveryShortfall === 0 ? (
                            "🎉 You've Unlocked FREE Insulated Delivery!"
                          ) : (
                            <>
                              Add <span className="text-brand-orange font-mono">₹{freeDeliveryShortfall}</span> more to get <span className="text-brand-green">FREE Insulated Delivery!</span>
                            </>
                          )}
                        </h4>
                        <span className="text-[9px] text-brand-charcoal/60 block mt-0.5">
                          {freeDeliveryShortfall === 0 || isFreeDeliveryCoupon || (bankShortfallToGec && freeDeliveryShortfall > 0)
                            ? 'Delivered in thermal-insulated bento carriers at ₹0 extra cost.'
                            : `Free doorstep delivery threshold is ₹${FREE_DELIVERY_THRESHOLD}.`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-black text-brand-green bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-lg shrink-0">
                      {isFreeDeliveryQualified ? '100%' : `${Math.min(100, Math.round((regularSubtotal / FREE_DELIVERY_THRESHOLD) * 100))}%`}
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2.5 bg-brand-cream/80 rounded-full overflow-hidden relative border border-brand-green/15">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isFreeDeliveryQualified
                          ? 'bg-gradient-to-r from-emerald-500 via-brand-green to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-brand-green'
                      }`}
                      style={{
                        width: `${isFreeDeliveryQualified ? 100 : Math.min(100, Math.round((regularSubtotal / FREE_DELIVERY_THRESHOLD) * 100))}%`
                      }}
                    />
                  </div>

                  {/* Shortfall Actions: 1-Step-Ahead GEC Accelerator & Real Menu Add-ons */}
                  {freeDeliveryShortfall > 0 && !isFreeDeliveryCoupon && (
                    <div className="space-y-3 pt-1">
                      {/* 1-STEP-AHEAD INNOVATION: Bank Shortfall into Gold Ember Coins */}
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-400/40 rounded-xl p-3 space-y-2 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-brand-charcoal flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                              🪙
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-brand-charcoal">
                                  Bank ₹{freeDeliveryShortfall} to Gold Ember Coins
                                </span>
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-brand-charcoal shadow-xs">
                                  1 GEC = ₹1
                                </span>
                              </div>
                              <p className="text-[10px] text-brand-charcoal/70 leading-snug mt-0.5">
                                Add ₹{freeDeliveryShortfall} to your wallet as <strong>{freeDeliveryShortfall} Gold Ember Coins</strong> for future orders to unlock <strong>FREE Delivery immediately!</strong> (Save ₹30 delivery fee).
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setBankShortfallToGec(!bankShortfallToGec)}
                            className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              bankShortfallToGec
                                ? 'bg-brand-green text-white border border-brand-green ring-2 ring-brand-green/30'
                                : 'bg-amber-500 hover:bg-amber-400 text-brand-charcoal border border-amber-400'
                            }`}
                          >
                            {bankShortfallToGec ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Banked (+{freeDeliveryShortfall} GEC)</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Bank & Unlock Free</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 1-Tap Real Menu Recommendations */}
                      {realMenuRecommendations.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-brand-charcoal/60 tracking-wider flex items-center gap-1">
                              <span>🔥 Quick Add-ons to Unlock Free Delivery:</span>
                            </span>
                            <span className="text-[9px] font-semibold text-brand-green">
                              Real Menu Dishes
                            </span>
                          </div>

                          <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                            {realMenuRecommendations.map((meal) => (
                              <div
                                key={`free-rec-${meal.id}`}
                                className="w-44 shrink-0 bg-white p-2 rounded-xl border border-brand-green/15 shadow-xs flex flex-col justify-between space-y-1.5 group hover:border-brand-green/40 transition-all"
                              >
                                <div className="flex gap-2 items-center">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-brand-green/10 bg-brand-cream/30">
                                    <img
                                      src={meal.image}
                                      alt={meal.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h6 className="text-[10px] font-bold text-brand-charcoal truncate leading-tight">
                                      {meal.name}
                                    </h6>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-[11px] font-black text-brand-charcoal">
                                        ₹{meal.price}
                                      </span>
                                      <span className={`text-[8px] font-extrabold px-1 rounded ${
                                        meal.price >= freeDeliveryShortfall
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {meal.price >= freeDeliveryShortfall ? '⚡ Free Dev' : `+₹${meal.price}`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onAddToCart) onAddToCart(meal);
                                    else onUpdateQuantity(meal.id, 1);
                                  }}
                                  className="w-full py-1.5 px-2 rounded-lg bg-brand-green hover:bg-emerald-900 text-white font-extrabold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>Add to Order</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CART ITEMS LIST WITH CUSTOMIZATIONS */}
              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const isDealItem = Boolean(item.isDeal || item.dealId);
                  const custom = isDealItem ? {} : (itemCustomizations[idx] || item.customization || {});
                  let extraPrice = 0;
                  if (!isDealItem) {
                    if (custom.portionSize === 'large') extraPrice += 40;
                    if (custom.portionSize === 'jumbo') extraPrice += 80;
                    if (custom.addOns && Array.isArray(custom.addOns)) {
                      extraPrice += custom.addOns.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
                    }
                  }
                  const itemUnitPrice = item.meal.price + extraPrice;
                  const isCustomizingThis = !isDealItem && customizingItemIndex === idx;

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
                                {item.dealSelectedSteps.map((st, sIdx) => {
                                  const cleanTitle = (st.stepTitle || '')
                                    .replace(/^(Step|Course)\s*\d+\s*[:\-–.]*\s*/i, '')
                                    .replace(/^(Choose|Select)\s+(your\s+)?/i, '')
                                    .trim();
                                  const itemsList = st.items.map((it) => it.mealName).join(', ');
                                  return (
                                    <div key={sIdx} className="truncate flex items-start gap-1">
                                      <span className="font-bold text-brand-orange shrink-0">•</span>
                                      <span className="truncate">
                                        {cleanTitle && (
                                          <span className="font-bold text-brand-charcoal">{cleanTitle}: </span>
                                        )}
                                        <span className="text-stone-600">{itemsList}</span>
                                      </span>
                                    </div>
                                  );
                                })}
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

                      {/* Display Customization Summary Badge if set (for regular dishes only, not deals) */}
                      {!isDealItem && (custom.portionSize || custom.spiceLevel || (custom.addOns && custom.addOns.length > 0) || custom.cookingInstruction) && (
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

                      {/* Customize Meal Toggle Button - Only for non-deal dishes */}
                      {!isDealItem && (
                        <button
                          type="button"
                          onClick={() => setCustomizingItemIndex(isCustomizingThis ? null : idx)}
                          className="text-[10px] font-black text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomizingThis ? '✕ Close Customization' : '✨ Customize Portion, Spice & Add-ons'}
                        </button>
                      )}

                      {/* Expanded Customization Form for Item - Only for non-deal dishes */}
                      {!isDealItem && isCustomizingThis && (
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

                      {/* 🌟 Goes Well With Extension: Interactive Animated Horizontal Pairing Ribbon */}
                      {!isDealItem && (
                        <div className="pt-2 border-t border-brand-green/10">
                          {dismissedPairingItemKeys.includes(`cart-pair-${item.meal.id}-${idx}`) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDismissedPairingItemKeys((prev) =>
                                  prev.filter((k) => k !== `cart-pair-${item.meal.id}-${idx}`)
                                )
                              }
                              className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-1"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                              <span>Show &quot;Goes Well With&quot; for {item.meal.name.split(' ')[0]}</span>
                            </button>
                          ) : (
                            <GoesWellWithExtension
                              parentMeal={item.meal}
                              allMeals={allMeals || []}
                              onAddToCart={(pairingMeal) => {
                                if (onAddToCart) {
                                  onAddToCart(pairingMeal);
                                } else {
                                  onUpdateQuantity(pairingMeal.id, 1);
                                }
                              }}
                              cartMealIds={cartItems.map((c) => c.meal.id)}
                              onClose={() =>
                                setDismissedPairingItemKeys((prev) => [
                                  ...prev,
                                  `cart-pair-${item.meal.id}-${idx}`,
                                ])
                              }
                              theme="light"
                              title={`Goes well with ${item.meal.name.split(' ')[0]}:`}
                            />
                          )}
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

                      {/* 1-TAP DELIVERY INSTRUCTIONS & GATE NOTES (RIDER NOTES) */}
                      <div className="bg-white border border-brand-green/15 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">🛵</span>
                            <div>
                              <span className="text-xs font-black text-brand-charcoal block">
                                Delivery Instructions & Gate Notes
                              </span>
                              <span className="text-[9px] text-brand-charcoal/60 block leading-tight">
                                Visible to your delivery rider upon arrival.
                              </span>
                            </div>
                          </div>
                          {selectedDeliveryTags.length > 0 && (
                            <span className="text-[9px] font-mono font-bold bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-md">
                              {selectedDeliveryTags.length} active
                            </span>
                          )}
                        </div>

                        {/* Quick Chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {DELIVERY_QUICK_TAGS.map((tag) => {
                            const isSelected = selectedDeliveryTags.includes(tag.label);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedDeliveryTags(selectedDeliveryTags.filter((t) => t !== tag.label));
                                  } else {
                                    setSelectedDeliveryTags([...selectedDeliveryTags, tag.label]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border flex items-center gap-1 shadow-2xs active:scale-95 ${
                                  isSelected
                                    ? 'bg-brand-green text-white border-brand-green font-extrabold shadow-xs'
                                    : 'bg-brand-cream/30 text-brand-charcoal/80 border-brand-green/10 hover:border-brand-green/30'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                <span>{tag.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Rider Directions */}
                        <input
                          type="text"
                          value={customDeliveryNote}
                          onChange={(e) => setCustomDeliveryNote(e.target.value)}
                          placeholder="Gate code, floor/flat number, call instructions..."
                          className="w-full px-3 py-2 bg-brand-cream/20 border border-brand-green/15 rounded-xl text-xs text-brand-charcoal placeholder-gray-400 focus:outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>
                  ) : fulfillmentType === 'takeaway' ? (
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
              ) : (
                /* DINE-IN SERVICE: TABLE & GUEST FORM */
                <div className="space-y-3.5 bg-brand-cream/20 border border-brand-green/15 rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-brand-charcoal/60 tracking-wider block">
                      1. Table Service & Contact Details
                    </span>
                    {dineInSession?.isFromQR ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ⚡ Scanned Table QR
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-brand-green">
                        ₹0 Delivery Charge
                      </span>
                    )}
                  </div>

                  {/* If Scanned from QR: Locked Table Card */}
                  {dineInSession?.isFromQR ? (
                    <div className="p-3 bg-white border border-brand-green/20 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-brand-charcoal/40 block">Seated Table</span>
                        <div className="text-base font-black text-brand-charcoal flex items-center gap-1.5">
                          <span>🍽️</span>
                          <span>{selectedTableNumber || dineInSession.tableNumber}</span>
                        </div>
                        <span className="text-[10px] text-brand-charcoal/60 font-semibold block">
                          Branch: {selectedDineInKitchen?.name || dineInSession.bhattiName || 'Assigned Bhatti'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] bg-brand-green/10 text-brand-green font-extrabold px-2 py-1 rounded-lg border border-brand-green/20 inline-block">
                          Direct Seating Verified
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Manual Dine-In Selection: Choose Bhatti and Table */
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-brand-charcoal/50 block mb-1">
                          Select Bhatti Branch for Dine-In
                        </label>
                        <select
                          value={selectedDineInKitchenId}
                          onChange={(e) => setSelectedDineInKitchenId(e.target.value)}
                          className="w-full bg-white border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green"
                        >
                          {allKitchens.filter(k => k.hasDineIn !== false).map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.name} ({k.area || k.address || 'Taash Bhatti'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Availability status badge */}
                      <div className="flex items-center justify-between text-[10px] px-1 font-bold">
                        <span className="text-brand-charcoal/60">Table Availability:</span>
                        {dineInTableStatus.hasTables ? (
                          dineInTableStatus.allOccupied ? (
                            <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-black">
                              🔴 All {dineInTableStatus.totalCount} Tables Occupied
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-black">
                              🟢 {dineInTableStatus.availableCount} of {dineInTableStatus.totalCount} Available
                            </span>
                          )
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-black">
                            Tables Open
                          </span>
                        )}
                      </div>

                      {/* Occupancy warning block */}
                      {dineInTableStatus.allOccupied && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-800 font-bold space-y-1">
                          <span className="block font-black">⚠️ Currently Full for Dine-In</span>
                          <p className="font-medium leading-snug">All tables at {selectedDineInKitchen?.name} are occupied. You may switch branch, switch to Takeaway / Delivery, or wait a few minutes.</p>
                        </div>
                      )}

                      {/* Select or enter table number */}
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-brand-charcoal/50 block mb-1">
                          Table Number / Name
                        </label>
                        {dineInTableStatus.tables && dineInTableStatus.tables.length > 0 ? (
                          <div className="grid grid-cols-3 gap-1.5">
                            {dineInTableStatus.tables.map((tbl) => (
                              <button
                                key={tbl.id}
                                type="button"
                                disabled={tbl.isOccupied}
                                onClick={() => setSelectedTableNumber(tbl.tableNumber)}
                                className={`p-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                  selectedTableNumber === tbl.tableNumber
                                    ? 'bg-brand-green text-white border-brand-green shadow-xs'
                                    : tbl.isOccupied
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                    : 'bg-white text-brand-charcoal border-brand-green/15 hover:border-brand-green'
                                }`}
                              >
                                {tbl.tableNumber}
                                <span className="block text-[8px] font-normal opacity-80">
                                  {tbl.isOccupied ? 'Full' : `Cap: ${tbl.capacity || 4}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Table 4"
                            value={selectedTableNumber}
                            onChange={(e) => setSelectedTableNumber(e.target.value)}
                            className="w-full bg-white border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Diner Guest Form (Name & 10-digit mobile) */}
                  <div className="space-y-2 pt-2 border-t border-brand-green/10">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-charcoal/50 block">
                      Diner Details (Required for Table Service)
                    </span>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[8px] font-black text-brand-charcoal/40 uppercase block mb-1">Diner Full Name *</span>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={dineInGuestName}
                          onChange={(e) => setDineInGuestName(e.target.value)}
                          className="w-full bg-white border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-semibold text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>

                      <div>
                        <span className="text-[8px] font-black text-brand-charcoal/40 uppercase block mb-1">10-Digit Mobile Number *</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={dineInGuestPhone}
                          onChange={(e) => setDineInGuestPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-semibold text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>
                    </div>

                    <div className="p-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-[9px] text-emerald-900 font-semibold space-y-0.5">
                      <p className="flex items-center gap-1 font-bold text-emerald-950">
                        <span>✨ No Account Login Required!</span>
                      </p>
                      <p className="text-emerald-800">
                        {auth.currentUser
                          ? `You are signed in as ${user.name || 'member'}. This table order will be tied to your profile and history!`
                          : 'Orders are transmitted directly to the kitchen KDS for your table and stored locally on your device.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* COUPON INPUT */}
              <div id="cart-coupons-section" className="space-y-1.5 scroll-mt-20">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wide flex items-center gap-1">
                    <Tag className="w-3 h-3 text-brand-green" /> 2. Special Offers & Coupons
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBrowseOffers((prev) => !prev)}
                      className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Search className="w-2.5 h-2.5" />
                      {showBrowseOffers ? 'Hide Public Offers' : 'Browse All Offers'}
                      {allAvailableCoupons.filter((c) => c.isPublic !== false && c.isActive).length > 0 && (
                        <span className="bg-emerald-600 text-white rounded-full px-1 text-[8px] font-black">
                          {allAvailableCoupons.filter((c) => c.isPublic !== false && c.isActive).length}
                        </span>
                      )}
                    </button>
                    {appliedCoupons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupons([]);
                          setCouponSuccess("All coupons cleared.");
                          setCouponError(null);
                        }}
                        className="text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear Stack
                      </button>
                    )}
                  </div>
                </div>

                {/* Notice for Deals & Combos only in cart */}
                {regularSubtotal === 0 && dealsSubtotal > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 flex items-center gap-2">
                    <span className="text-sm">💡</span>
                    <span>Exclusive Combo deals are already pre-discounted. Add regular menu dishes to use coupons!</span>
                  </div>
                )}

                {/* ELIGIBLE SMART OFFERS (READY TO APPLY WITH 1-TAP) */}
                {eligibleCoupons.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Offers Unlocked For Your Cart ({eligibleCoupons.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {eligibleCoupons.map(({ coupon, result }) => (
                        <div
                          key={coupon.id || coupon.code}
                          className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-500/30 flex items-center justify-between gap-2 shadow-xs transition-all hover:border-emerald-500"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-xs text-emerald-800 tracking-wider bg-white px-2 py-0.5 rounded-lg border border-dashed border-emerald-500/50">
                                {coupon.code}
                              </span>
                              {coupon.badge && (
                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white tracking-wide">
                                  {coupon.badge}
                                </span>
                              )}
                              {renderModeBadge(coupon)}
                              {coupon.firstXRedeems && (
                                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 border border-amber-500/30">
                                  ⚡ 1st {coupon.firstXRedeems} Claims
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-brand-charcoal/80 font-medium truncate mt-0.5">
                              {coupon.description || coupon.title || `Save on your order`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {result.discountAmount > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600 block">
                                  ✨ Saves ₹{result.discountAmount} on dishes
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setViewingTcCoupon(coupon)}
                                className="text-[9px] font-bold text-brand-charcoal/50 hover:text-emerald-700 underline cursor-pointer"
                              >
                                View T&C
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCouponByCode(coupon.code)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ALMOST ELIGIBLE OFFERS (PROGRESS BAR TEASERS) */}
                {almostEligibleCoupons.length > 0 && (
                  <div className="space-y-1.5">
                    {almostEligibleCoupons.slice(0, 2).map(({ coupon, result }) => {
                      const minVal = coupon.criteria.minOrderValue || 0;
                      const progressPct = minVal > 0 ? Math.min(95, Math.round((regularSubtotal / minVal) * 100)) : 70;
                      return (
                        <div
                          key={coupon.id || coupon.code}
                          className="p-2.5 rounded-xl bg-brand-cream/40 border border-brand-green/20 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-brand-charcoal bg-white/80 px-1.5 py-0.5 rounded border border-brand-green/20">
                                {coupon.code}
                              </span>
                              {renderModeBadge(coupon)}
                              <button
                                type="button"
                                onClick={() => setViewingTcCoupon(coupon)}
                                className="text-[9px] font-bold text-brand-charcoal/50 hover:text-emerald-700 underline cursor-pointer"
                              >
                                T&C
                              </button>
                            </div>
                            <span className="font-bold text-brand-green text-[9px]">
                              {result.helpfulHint || `Add ₹${result.missingAmount || 0} to unlock`}
                            </span>
                          </div>
                          <div className="w-full bg-brand-green/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-green h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PUBLIC OFFERS SEARCH & EXPLORER */}
                {showBrowseOffers && (
                  <div className="p-3 rounded-2xl bg-brand-cream/35 border border-brand-green/20 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-brand-charcoal/70 tracking-wider flex items-center gap-1">
                        <Search className="w-3 h-3 text-brand-green" /> Search Available Public Coupons
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBrowseOffers(false)}
                        className="text-[10px] font-bold text-brand-charcoal/40 hover:text-brand-charcoal cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40" />
                      <input
                        type="text"
                        placeholder="Search by code, title, or reward..."
                        value={publicOfferSearch}
                        onChange={(e) => setPublicOfferSearch(e.target.value)}
                        className="w-full bg-white border border-brand-green/20 rounded-xl pl-8 pr-8 py-2 text-xs font-medium placeholder-brand-charcoal/40 focus:outline-none focus:border-brand-green transition-colors"
                      />
                      {publicOfferSearch && (
                        <button
                          type="button"
                          onClick={() => setPublicOfferSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Results List */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {publicOffersList.length === 0 ? (
                        <p className="text-center py-4 text-xs text-brand-charcoal/50 font-medium">
                          No public offers found matching "{publicOfferSearch}".
                        </p>
                      ) : (
                        publicOffersList.map(({ coupon, result }) => {
                          const isApplied = appliedCoupons.some(
                            (c) => (c.code || c.id) === coupon.code
                          );

                          return (
                            <div
                              key={coupon.id || coupon.code}
                              className={`p-2.5 rounded-xl border transition-all ${
                                result.isValid
                                  ? 'bg-emerald-50/70 border-emerald-400/40 hover:border-emerald-500'
                                  : 'bg-white/80 border-stone-200'
                              } flex flex-col gap-1.5`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-xs text-brand-charcoal bg-white px-2 py-0.5 rounded-md border border-stone-300">
                                    {coupon.code}
                                  </span>
                                  {coupon.badge && (
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                      {coupon.badge}
                                    </span>
                                  )}
                                  {renderModeBadge(coupon)}
                                  {coupon.firstXRedeems && (
                                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 border border-amber-500/30">
                                      ⚡ 1st {coupon.firstXRedeems} Claims
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setViewingTcCoupon(coupon)}
                                  className="text-[9px] font-bold text-brand-charcoal/60 hover:text-emerald-700 underline cursor-pointer shrink-0"
                                >
                                  View T&C
                                </button>
                              </div>

                              <p className="text-[10px] text-brand-charcoal/80 font-medium leading-tight">
                                {coupon.description || coupon.title}
                              </p>

                              <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                                {result.isValid ? (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {result.discountAmount > 0 ? `Saves ₹${result.discountAmount}` : 'Valid for your order'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold text-amber-800 line-clamp-1">
                                    {result.helpfulHint || result.rejectionReason}
                                  </span>
                                )}

                                {isApplied ? (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                    Applied ✓
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => applyCouponByCode(coupon.code)}
                                    disabled={!result.isValid}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer ${
                                      result.isValid
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                                        : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                                    }`}
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* MANUAL PROMO CODE INPUT */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Promo Code (e.g. TAASH50 or Secret Code)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-brand-cream/20 border border-brand-green/15 rounded-xl px-3 py-2 text-xs font-semibold uppercase placeholder-brand-charcoal/40 focus:outline-none focus:border-brand-green/40 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    Apply
                  </button>
                </form>

                {couponError && (
                  <div className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-700 font-medium leading-tight">{couponError}</p>
                  </div>
                )}

                {couponSuccess && (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-emerald-700 font-bold leading-tight">{couponSuccess}</p>
                  </div>
                )}

                {/* STACKING LIST VISUALIZATION */}
                {appliedCoupons.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-brand-green/10">
                    <span className="text-[9px] font-black uppercase text-brand-charcoal/50 block tracking-wider">
                      Currently Applied Coupons ({appliedCoupons.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {appliedCoupons.map((coupon) => (
                        <div
                          key={coupon.id || coupon.code}
                          className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green border border-brand-green/30 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold shadow-xs"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{coupon.code}</span>
                          <button
                            type="button"
                            onClick={() => setViewingTcCoupon(coupon)}
                            className="text-[9px] text-brand-charcoal/60 hover:text-brand-charcoal underline ml-0.5 cursor-pointer"
                            title="View Terms & Conditions"
                          >
                            T&C
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupons((prev) => prev.filter((c) => (c.id || c.code) !== (coupon.id || coupon.code)));
                              setCouponSuccess(`Coupon ${coupon.code} removed.`);
                              setCouponError(null);
                            }}
                            className="hover:text-rose-600 transition-colors cursor-pointer text-brand-charcoal/50 text-[10px] font-black ml-0.5"
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

              {/* COOKING INSTRUCTIONS & CHEF NOTES (QUICK CHIPS & CUSTOM NOTE) */}
              <div className="bg-white border border-brand-green/15 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👨‍🍳</span>
                    <div>
                      <span className="text-xs font-black text-brand-charcoal block">
                        Cooking Instructions & Chef Notes
                      </span>
                      <span className="text-[9px] text-brand-charcoal/60 block leading-tight">
                        Handed directly to the kitchen chef station.
                      </span>
                    </div>
                  </div>
                  {selectedChefTags.length > 0 && (
                    <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                      {selectedChefTags.length} tags selected
                    </span>
                  )}
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {CHEF_QUICK_TAGS.map((tag) => {
                    const isSelected = selectedChefTags.includes(tag.label);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedChefTags(selectedChefTags.filter((t) => t !== tag.label));
                          } else {
                            setSelectedChefTags([...selectedChefTags, tag.label]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border flex items-center gap-1 shadow-2xs active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-brand-charcoal border-amber-400 font-extrabold shadow-xs'
                            : 'bg-brand-cream/30 text-brand-charcoal/80 border-brand-green/10 hover:border-brand-green/30'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Chef Note */}
                <input
                  type="text"
                  value={customChefNote}
                  onChange={(e) => setCustomChefNote(e.target.value)}
                  placeholder="Special instructions (e.g. Extra mint chutney, serve piping hot)..."
                  className="w-full px-3 py-2 bg-brand-cream/20 border border-brand-green/15 rounded-xl text-xs text-brand-charcoal placeholder-gray-400 focus:outline-none focus:border-brand-green"
                />
              </div>

              {/* RIDER TIPPING (DELIVERY ORDERS ONLY) */}
              {fulfillmentType === 'delivery' && (
                <div className="bg-white border border-brand-green/15 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🛵</span>
                      <div>
                        <span className="text-xs font-black text-brand-charcoal block">
                          Tip Your Delivery Rider
                        </span>
                        <span className="text-[9px] text-brand-charcoal/60 block leading-tight">
                          100% of this tip goes directly to your rider.
                        </span>
                      </div>
                    </div>
                    {effectiveRiderTip > 0 && (
                      <span className="text-xs font-mono font-black text-brand-green bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        +₹{effectiveRiderTip}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[20, 30, 50].map((tipAmt) => {
                      const isSelected = selectedTip === tipAmt && !isCustomTipActive;
                      return (
                        <button
                          key={tipAmt}
                          type="button"
                          onClick={() => {
                            setIsCustomTipActive(false);
                            setSelectedTip(isSelected ? 0 : tipAmt);
                          }}
                          className={`py-2 px-1 rounded-xl text-center font-black text-xs transition-all cursor-pointer border active:scale-95 ${
                            isSelected
                              ? 'bg-brand-green text-white border-brand-green shadow-xs'
                              : 'bg-brand-cream/20 text-brand-charcoal border-brand-green/10 hover:border-brand-green/30'
                          }`}
                        >
                          ₹{tipAmt}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTipActive(true);
                        setSelectedTip(0);
                      }}
                      className={`py-2 px-1 rounded-xl text-center font-black text-xs transition-all cursor-pointer border active:scale-95 ${
                        isCustomTipActive
                          ? 'bg-brand-green text-white border-brand-green shadow-xs'
                          : 'bg-brand-cream/20 text-brand-charcoal border-brand-green/10 hover:border-brand-green/30'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {isCustomTipActive && (
                    <div className="flex items-center gap-2 pt-1 animate-fade-in">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={customTipInput}
                          onChange={(e) => setCustomTipInput(e.target.value)}
                          placeholder="Enter tip (e.g. 40)"
                          className="w-full pl-7 pr-3 py-1.5 bg-brand-cream/20 border border-brand-green/20 rounded-xl text-xs font-bold text-brand-charcoal placeholder-gray-400 focus:outline-none focus:border-brand-green"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomTipActive(false);
                          setCustomTipInput('');
                          setSelectedTip(0);
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-black text-gray-500 hover:text-red-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}
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

              {/* Gold Ember Banking Accelerator */}
              {gecShortfallAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-mono font-bold">
                  <span>🪙 Gold Ember Banking ({gecShortfallAmount} GEC)</span>
                  <span>+₹{gecShortfallAmount}</span>
                </div>
              )}

              {/* Delivery Rider Tip */}
              {effectiveRiderTip > 0 && (
                <div className="flex justify-between text-emerald-700 font-mono font-bold">
                  <span>🛵 Delivery Rider Tip</span>
                  <span>+₹{effectiveRiderTip}</span>
                </div>
              )}

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
                  !allKitchens.some(k => k.isActive !== false && k.isTakingOrders !== false) ||
                  (fulfillmentType === 'dine_in' && !dineInSession?.isFromQR && dineInTableStatus.allOccupied)
                ))
              }
              className="w-full mt-2 bg-brand-green hover:bg-brand-green/95 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {!featureFlags.acceptingOrders ? (
                <span>ORDERS CURRENTLY PAUSED</span>
              ) : fulfillmentType === 'dine_in' && !dineInSession?.isFromQR && dineInTableStatus.allOccupied ? (
                <span>TABLES CURRENTLY FULL AT THIS BHATTI</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-brand-orange" /> CONFIRM & PLACE MEAL ORDER
                </>
              )}
            </button>
          </div>
        )}

        {/* TERMS & CONDITIONS MODAL FOR COUPONS */}
        {viewingTcCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-brand-charcoal/10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-charcoal to-brand-brown p-4 text-white flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-lg border border-white/20">
                      {viewingTcCoupon.code}
                    </span>
                    {viewingTcCoupon.badge && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-orange text-white tracking-wide">
                        {viewingTcCoupon.badge}
                      </span>
                    )}
                    {viewingTcCoupon.isPublic === false && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-500 text-white tracking-wide">
                        🔒 Secret Promo
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-black text-base text-white leading-tight">
                    {viewingTcCoupon.title || `${viewingTcCoupon.code} Special Offer`}
                  </h3>
                  {viewingTcCoupon.description && (
                    <p className="text-xs text-brand-cream/80">{viewingTcCoupon.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingTcCoupon(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Criteria Badges */}
              <div className="p-3 bg-brand-cream/30 border-b border-brand-green/10 flex flex-wrap gap-2 text-[10px]">
                {/* Mode */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-brand-green/15 font-bold text-brand-charcoal">
                  <Compass className="w-3 h-3 text-brand-green" />
                  <span>
                    {viewingTcCoupon.criteria?.allowedChannels && viewingTcCoupon.criteria.allowedChannels.length > 0 && viewingTcCoupon.criteria.allowedChannels.length < 3
                      ? viewingTcCoupon.criteria.allowedChannels.map(m => m === 'delivery' ? 'Delivery Only' : m === 'takeaway' ? 'Takeaway Only' : 'Dine-In Only').join(', ')
                      : 'All Modes (Delivery, Takeaway & Dine-In)'}
                  </span>
                </div>

                {/* Early Bird */}
                {viewingTcCoupon.firstXRedeems && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-900 border border-amber-500/30 px-2 py-1 rounded-lg font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Early Bird: First {viewingTcCoupon.firstXRedeems} Claims Only ({viewingTcCoupon.globalUsageCount || 0} claimed)</span>
                  </div>
                )}

                {/* Min Order Value */}
                {viewingTcCoupon.criteria?.minOrderValue && viewingTcCoupon.criteria.minOrderValue > 0 && (
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-brand-green/15 font-bold text-brand-charcoal">
                    <Tag className="w-3 h-3 text-brand-green" />
                    <span>Min Order: ₹{viewingTcCoupon.criteria.minOrderValue}</span>
                  </div>
                )}

                {/* Max Discount Cap */}
                {viewingTcCoupon.criteria?.maxDiscountCap && viewingTcCoupon.criteria.maxDiscountCap > 0 && (
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-brand-green/15 font-bold text-brand-charcoal">
                    <Tag className="w-3 h-3 text-brand-green" />
                    <span>Max Cap: ₹{viewingTcCoupon.criteria.maxDiscountCap}</span>
                  </div>
                )}
              </div>

              {/* Terms List */}
              <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-charcoal/60 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-green" /> Terms & Conditions
                </h4>
                <ul className="space-y-2 text-xs text-brand-charcoal/80">
                  {(viewingTcCoupon.termsAndConditions && viewingTcCoupon.termsAndConditions.length > 0
                    ? viewingTcCoupon.termsAndConditions
                    : generateDefaultTerms(viewingTcCoupon, viewingTcCoupon.criteria)
                  ).map((term, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-brand-green font-bold text-sm leading-none shrink-0">•</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer with instant apply or eligibility hint */}
              <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewingTcCoupon(null)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors"
                >
                  Close
                </button>

                {(() => {
                  const evalRes = evaluateSmartCoupon(viewingTcCoupon, evalContext);
                  const isAlreadyApplied = appliedCoupons.some(c => (c.code || c.id) === viewingTcCoupon.code);

                  if (isAlreadyApplied) {
                    return (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Applied to Cart
                      </span>
                    );
                  }

                  if (evalRes.isValid) {
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          await applyCouponByCode(viewingTcCoupon.code);
                          setViewingTcCoupon(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer transition-colors shadow-xs active:scale-95 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Apply Offer (-₹{evalRes.discountAmount})
                      </button>
                    );
                  }

                  return (
                    <span className="text-[11px] text-amber-800 font-semibold max-w-[240px] text-right leading-tight">
                      {evalRes.helpfulHint || evalRes.rejectionReason}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
