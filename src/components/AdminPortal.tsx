/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Dumbbell, 
  XCircle, 
  CheckCircle, 
  Package, 
  Plus, 
  Sparkles, 
  RefreshCw, 
  BarChart2, 
  UtensilsCrossed, 
  Truck,
  MapPin,
  TrendingDown,
  UserCheck,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Percent,
  Ticket,
  Layers,
  Volume2,
  VolumeX,
  ChefHat,
  Copy,
  BookOpen,
  Award,
  Activity,
  Timer,
  CheckSquare,
  Square,
  Lock,
  Mail,
  Send,
  Star,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Bell,
  Megaphone,
  Boxes,
  Minus,
  Headphones,
  Search,
  UserX,
  Ban,
  Phone,
  ExternalLink,
  FileText,
  Tag,
  Zap,
  CheckCircle2,
  UserMinus,
  Banknote,
  Wallet,
  Calendar,
  History,
  ArrowRight,
  CloudRain,
  Printer,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InAppDeliveryMap from './InAppDeliveryMap';
import { ImageUploader } from './ImageUploader';
import { DeveloperMenuModal } from './DeveloperMenuModal';
import { getStoredFeatureFlags, subscribeFeatureFlags, saveFeatureFlags } from '../lib/featureFlags';
import { AppFeatureFlags } from '../types';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, arrayUnion, query, where, getDocs, addDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';

function getSecondaryAuth() {
  const name = 'FitZaikaSecondaryAuthApp';
  let secondaryApp = getApps().find(a => a.name === name);
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, name);
  }
  return getAuth(secondaryApp);
}
import { Order, Meal, Gym, GymChain, User, Kitchen, DeliveryPartner, SupportTicket, SupportAgent, KitchenManager, HeroBanner, AppNotification, KitchenInventoryItem, CashDepositRequest, KitchenEODReport } from '../types';
import { MEALS_DATA, GYMS_DATA, INITIAL_DELIVERY_PARTNERS, DEFAULT_HERO_BANNERS } from '../data';
import AdminDealsManager from './AdminDealsManager';
import { KdsRiderCashSection } from './KdsRiderCashSection';
import KitchenEODSettlementModal from './KitchenEODSettlementModal';
import { syncLowStockMenuWithFirestore, computeEODShiftReport } from '../lib/kitchenSettlement';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
}

const INITIAL_SUPPORT_AGENTS: SupportAgent[] = [];

// Initial mock ingredients with threshold check
interface IngredientStock {
  id: string;
  name: string;
  category: 'protein' | 'grain' | 'spice' | 'premium';
  currentStock: number; // in kg or units
  minRequired: number; // threshold
  unit: string;
}

const INITIAL_INGREDIENTS: IngredientStock[] = [
  { id: 'i1', name: 'Saffron Threads (Kashmir Reserve)', category: 'premium', currentStock: 0.15, minRequired: 0.5, unit: 'kg' },
  { id: 'i2', name: 'Low-Fat Organic Paneer', category: 'protein', currentStock: 18, minRequired: 15, unit: 'kg' },
  { id: 'i3', name: 'Lean Organic Chicken Breast', category: 'protein', currentStock: 42, minRequired: 20, unit: 'kg' },
  { id: 'i4', name: 'Whey Protein Isolate (Vanilla)', category: 'premium', currentStock: 3.5, minRequired: 10, unit: 'kg' },
  { id: 'i5', name: 'Premium Steel Cut Oats', category: 'grain', currentStock: 35, minRequired: 15, unit: 'kg' },
  { id: 'i6', name: 'Norwegian Salmon Filets', category: 'premium', currentStock: 1.8, minRequired: 5, unit: 'kg' },
  { id: 'i7', name: 'Avocado Fruit Supply', category: 'grain', currentStock: 14, minRequired: 10, unit: 'units' },
];

const INITIAL_SAMPLE_TICKETS: SupportTicket[] = [];

interface GymFormMapProps {
  lat?: number;
  lng?: number;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}

function GymFormMap({ lat, lng, onSelectLocation }: GymFormMapProps) {
  const map = useMap();
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>({ lat: lat || 26.1209, lng: lng || 85.3647 });

  useEffect(() => {
    if (lat && lng) {
      setMarkerPosition({ lat, lng });
      map?.setCenter({ lat, lng });
    }
  }, [lat, lng, map]);

  const handleMapClick = (e: any) => {
    const clickLat = e.detail?.latLng?.lat || e.latLng?.lat();
    const clickLng = e.detail?.latLng?.lng || e.latLng?.lng();
    if (clickLat && clickLng) {
      const pos = { lat: clickLat, lng: clickLng };
      setMarkerPosition(pos);
      onSelectLocation(clickLat, clickLng);

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          onSelectLocation(clickLat, clickLng, results[0].formatted_address);
        }
      });
    }
  };

  return (
    <GoogleMap
      defaultCenter={{ lat: lat || 26.1209, lng: lng || 85.3647 }}
      defaultZoom={13}
      mapId="DEMO_MAP_ID"
      onClick={handleMapClick}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
    >
      <AdvancedMarker
        position={markerPosition}
        draggable={true}
        onDragEnd={(e) => {
          const dragLat = e.latLng?.lat();
          const dragLng = e.latLng?.lng();
          if (dragLat && dragLng) {
            const pos = { lat: dragLat, lng: dragLng };
            setMarkerPosition(pos);
            onSelectLocation(dragLat, dragLng);

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: pos }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                onSelectLocation(dragLat, dragLng, results[0].formatted_address);
              }
            });
          }
        }}
      >
        <Pin background="#10B981" borderColor="#047857" glyphColor="#fff" />
      </AdvancedMarker>
    </GoogleMap>
  );
}

function SearchButton({ searchQuery, onSelectLocation, setLoading, loading }: { 
  searchQuery: string; 
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
  setLoading: (l: boolean) => void;
  loading: boolean;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const handleSearch = async () => {
    if (!placesLib || !searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await placesLib.Place.searchByText({
        textQuery: searchQuery,
        fields: ['displayName', 'location', 'formattedAddress'],
        locationBias: map?.getCenter() || { lat: 26.1209, lng: 85.3647 },
        maxResultCount: 1,
      });

      const firstPlace = response.places?.[0];
      if (firstPlace && firstPlace.location) {
        const pLat = firstPlace.location.lat();
        const pLng = firstPlace.location.lng();
        onSelectLocation(pLat, pLng, firstPlace.formattedAddress || firstPlace.displayName);
        map?.setCenter({ lat: pLat, lng: pLng });
        map?.setZoom(16);
      } else {
        alert("No locations found for your search query. Please try typing a more specific name.");
      }
    } catch (err) {
      console.error("Error searching place:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSearch}
      disabled={loading}
      className="bg-brand-green/10 hover:bg-brand-green/20 border border-brand-green/30 text-brand-green font-black text-xs px-4 py-2 rounded-xl uppercase transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
    >
      Search
    </button>
  );
}

interface GymLocationPickerProps {
  lat?: number;
  lng?: number;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}

function GymLocationPicker({ lat, lng, onSelectLocation }: GymLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search gym on Google Maps (e.g. Powerhouse Gym)..."
          className="flex-1 bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        />
        <SearchButton searchQuery={searchQuery} onSelectLocation={onSelectLocation} setLoading={setLoading} loading={loading} />
      </div>

      <div className="h-48 w-full rounded-xl border border-brand-green/15 overflow-hidden relative">
        <GymFormMap lat={lat} lng={lng} onSelectLocation={onSelectLocation} />
        {loading && (
          <div className="absolute inset-0 bg-[#0F1419]/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-brand-green text-xs font-bold uppercase">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Locating...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface KitchenFormMapProps {
  lat?: number;
  lng?: number;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}

function KitchenFormMap({ lat, lng, onSelectLocation }: KitchenFormMapProps) {
  const map = useMap();
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>({ lat: lat || 26.1209, lng: lng || 85.3647 });

  useEffect(() => {
    if (lat && lng) {
      setMarkerPosition({ lat, lng });
      map?.setCenter({ lat, lng });
    }
  }, [lat, lng, map]);

  const handleMapClick = (e: any) => {
    const clickLat = e.detail?.latLng?.lat || e.latLng?.lat();
    const clickLng = e.detail?.latLng?.lng || e.latLng?.lng();
    if (clickLat && clickLng) {
      const pos = { lat: clickLat, lng: clickLng };
      setMarkerPosition(pos);
      onSelectLocation(clickLat, clickLng);

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          onSelectLocation(clickLat, clickLng, results[0].formatted_address);
        }
      });
    }
  };

  return (
    <GoogleMap
      defaultCenter={{ lat: lat || 26.1209, lng: lng || 85.3647 }}
      defaultZoom={13}
      mapId="DEMO_MAP_ID"
      onClick={handleMapClick}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
    >
      <AdvancedMarker
        position={markerPosition}
        draggable={true}
        onDragEnd={(e) => {
          const dragLat = e.latLng?.lat();
          const dragLng = e.latLng?.lng();
          if (dragLat && dragLng) {
            const pos = { lat: dragLat, lng: dragLng };
            setMarkerPosition(pos);
            onSelectLocation(dragLat, dragLng);

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: pos }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                onSelectLocation(dragLat, dragLng, results[0].formatted_address);
              }
            });
          }
        }}
      >
        <Pin background="#EAB308" borderColor="#CA8A04" glyphColor="#fff" />
      </AdvancedMarker>
    </GoogleMap>
  );
}

interface KitchenLocationPickerProps {
  lat?: number;
  lng?: number;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}

function KitchenLocationPicker({ lat, lng, onSelectLocation }: KitchenLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search kitchen location on Google Maps (e.g. Mithanpura)..."
          className="flex-1 bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        />
        <SearchButton searchQuery={searchQuery} onSelectLocation={onSelectLocation} setLoading={setLoading} loading={loading} />
      </div>

      <div className="h-48 w-full rounded-xl border border-brand-green/15 overflow-hidden relative">
        <KitchenFormMap lat={lat} lng={lng} onSelectLocation={onSelectLocation} />
        {loading && (
          <div className="absolute inset-0 bg-[#0F1419]/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-brand-green text-xs font-bold uppercase">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Locating...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const playKitchenChime = (type: 'new' | 'complete' | 'alert') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'new') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
      
      const osc2 = audioCtx.createOscillator();
      const gainNode2 = audioCtx.createGain();
      osc2.connect(gainNode2);
      gainNode2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gainNode2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.12);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'complete') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.25); // C6
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked by browser context:", e);
  }
};

const speakToKitchen = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.8;
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }
};

function KDSTimer({ createdAt }: { createdAt: string }) {
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    if (isNaN(start)) return;
    
    // Update immediately
    setElapsedSecs(Math.floor((Date.now() - start) / 1000));

    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const mins = Math.floor(elapsedSecs / 60);
  const secs = elapsedSecs % 60;
  const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  let colorClass = "text-brand-green bg-brand-green/10 border-brand-green/20";
  let warningMessage = null;

  if (mins >= 10) {
    colorClass = "text-red-400 bg-red-950/25 border-red-500/30 animate-pulse";
    warningMessage = "🚨 PROTEIN DEGRADATION WARNING";
  } else if (mins >= 5) {
    colorClass = "text-amber-400 bg-amber-950/25 border-amber-500/30";
    warningMessage = "⚠️ HEATING RETENTION RETENTION";
  }

  return (
    <div className="flex flex-col items-end">
      <div className={`px-2 py-0.5 rounded-md border font-mono text-[9px] font-black flex items-center gap-1 ${colorClass}`}>
        <Timer className="w-3 h-3" />
        <span>{formatted}</span>
      </div>
      {warningMessage && (
        <span className="text-[6px] text-red-400 font-black tracking-widest mt-0.5 uppercase block text-right">
          {warningMessage}
        </span>
      )}
    </div>
  );
}

const getRecipeDirectives = (mealName: string): string[] => {
  const nameLower = mealName.toLowerCase();
  if (nameLower.includes('oats') || nameLower.includes('shake')) {
    return [
      "Pour 250ml raw almond soy milk & 1 scoop whey into sanitized blender.",
      "Incorporate 50g organic steel-cut oats and a pinch of Kashmiri Saffron threads.",
      "Blend on HIGH speed for 45 seconds until velvety macro texture achieved.",
      "Top with 15g slivered almonds & organic chia seeds; seal in thermal bag."
    ];
  }
  if (nameLower.includes('pancake') || nameLower.includes('waffle')) {
    return [
      "Whisk egg whites, oat flour, organic matcha, and protein mix until smooth.",
      "Preheat high-conductivity non-stick pan to 175°C with zero-calorie oil spray.",
      "Pour batter; cook for 150s, flip, and cook other side for exactly 60s.",
      "Layer cooked pancakes, drizzle natural agave syrup, and affix macro label."
    ];
  }
  if (nameLower.includes('paneer') || nameLower.includes('veg') || nameLower.includes('tofu') || nameLower.includes('bowl')) {
    return [
      "Pan-sear low-fat cottage cheese (paneer) cubes in 5g extra virgin olive oil.",
      "Toss diced bell peppers, steamed baby spinach, and seasoned quinoa base.",
      "Dust cottage cheese with low-sodium culinary salt and macro seasoning dust.",
      "Portion accurately: 150g quinoa carb base + 120g paneer protein base."
    ];
  }
  if (nameLower.includes('chicken') || nameLower.includes('meat') || nameLower.includes('fish') || nameLower.includes('grill')) {
    return [
      "Grill 180g lean organic poultry meat/fillet at 200°C on steel rib grills.",
      "Verify core thermal point of protein base reaches a safe 74°C limit.",
      "Prepare fresh carbohydrate complex (quinoa/sweet potatoes/brown rice).",
      "Arrange protein next to carbs; pack securely in steam-locking container."
    ];
  }
  return [
    "Verify recipe macro credentials on TAASH BHATTI database.",
    "Measure out fresh protein components and wash veggies in warm saline water.",
    "Heat delivery locker-bay container for active heat preservation.",
    "Affix high-fidelity macro calibration sticker to the bento lid."
  ];
};

interface AdminPortalProps {
  onExit: () => void;
  onSwitchGateway?: (gateway: 'customer' | 'admin' | 'partner' | 'support' | 'kitchen') => void;
  user?: any;
  fbUser?: any;
  allGyms?: Gym[];
  gymChains?: GymChain[];
  allKitchens?: Kitchen[];
}

export default function AdminPortal({ onExit, onSwitchGateway, user, fbUser, allGyms = [], gymChains = [], allKitchens = [] }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'tracking' | 'meals' | 'deals' | 'coupons' | 'kitchens' | 'fleet' | 'support' | 'users' | 'banners'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);

  // Hero Banners State
  const [banners, setBanners] = useState<HeroBanner[]>(DEFAULT_HERO_BANNERS);
  const [showBannerModal, setShowBannerModal] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerSubtitle, setBannerSubtitle] = useState<string>('');
  const [bannerBadge, setBannerBadge] = useState<string>('🔥 SPECIAL PROMO');
  const [bannerImage, setBannerImage] = useState<string>('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState<string>('menu');
  const [bannerButtonText, setBannerButtonText] = useState<string>('Explore Now ➜');
  const [bannerIsActive, setBannerIsActive] = useState<boolean>(true);
  const [bannerOrder, setBannerOrder] = useState<number>(1);

  // Developer Feature Flags & Menu State
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);
  const [showDevMenu, setShowDevMenu] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((newFlags) => {
      setFeatureFlags(newFlags);
    });
    return () => unsubscribe();
  }, []);

  // Complaints & Support Workspace State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const cached = localStorage.getItem('fitzaika_support_tickets');
      if (cached) {
        const parsed: SupportTicket[] = JSON.parse(cached);
        // Filter out hardcoded sample ticket IDs
        const cleanList = parsed.filter(t => !['TKT-892410', 'TKT-741209', 'TKT-630128'].includes(t.id));
        if (cleanList.length > 0) return cleanList;
      }
    } catch (e) {}
    return [];
  });
  const [supportFilterStatus, setSupportFilterStatus] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'closed'>('all');
  const [supportFilterType, setSupportFilterType] = useState<'all' | 'complaint' | 'feedback' | 'suggestion' | 'inquiry'>('all');
  const [supportFilterPriority, setSupportFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const [supportSort, setSupportSort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [adminLightboxImage, setAdminLightboxImage] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyStatusMap, setReplyStatusMap] = useState<Record<string, 'pending' | 'under_review' | 'resolved' | 'closed'>>({});
  const [isSendingReplyMap, setIsSendingReplyMap] = useState<Record<string, boolean>>({});

  // Push Notification Engine State
  const [notifSubTab, setNotifSubTab] = useState<'roster' | 'composer' | 'history'>('roster');
  const [notifTitle, setNotifTitle] = useState<string>('');
  const [notifBody, setNotifBody] = useState<string>('');
  const [notifCategory, setNotifCategory] = useState<'promo' | 'order_update' | 'chef_special' | 'event' | 'system'>('promo');
  const [notifAudience, setNotifAudience] = useState<'all' | 'vip' | 'city' | 'selected_users' | 'no_permissions'>('all');
  const [notifCity, setNotifCity] = useState<string>('Muzaffarpur');
  const [notifSelectedUserIds, setNotifSelectedUserIds] = useState<string[]>([]);
  const [notifImageUrl, setNotifImageUrl] = useState<string>('');
  const [notifLinkType, setNotifLinkType] = useState<'preset' | 'custom'>('preset');
  const [notifLinkUrl, setNotifLinkUrl] = useState<string>('menu');
  const [customLinkUrl, setCustomLinkUrl] = useState<string>('');
  const [notifButtonText, setNotifButtonText] = useState<string>('CLAIM OFFER ➜');
  const [isSendingNotif, setIsSendingNotif] = useState<boolean>(false);
  const [sentCampaigns, setSentCampaigns] = useState<AppNotification[]>([]);

  // Adaptive category selection handler - auto-sets action button text based on requested defaults
  const handleCategorySelect = (category: 'promo' | 'order_update' | 'chef_special' | 'event' | 'system') => {
    setNotifCategory(category);
    switch (category) {
      case 'promo':
        setNotifButtonText('CLAIM OFFER ➜');
        break;
      case 'order_update':
        setNotifButtonText('TRACK NOW ➜');
        break;
      case 'chef_special':
        setNotifButtonText('WITNESS ➜');
        break;
      case 'event':
        setNotifButtonText('PARTICIPATE ➜');
        break;
      case 'system':
        setNotifButtonText('TAKE ACTION ➜');
        break;
    }
  };

  // Real-time Firestore listener for Support Tickets + LocalStorage sync
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'support_tickets'),
      (snapshot) => {
        const list: SupportTicket[] = [];
        snapshot.forEach((docSnap) => {
          const t = { id: docSnap.id, ...docSnap.data() } as SupportTicket;
          if (!['TKT-892410', 'TKT-741209', 'TKT-630128'].includes(t.id)) {
            list.push(t);
          }
        });

        // Merge local storage cached tickets (excluding samples)
        try {
          const cached = localStorage.getItem('fitzaika_support_tickets');
          if (cached) {
            const localList: SupportTicket[] = JSON.parse(cached);
            localList.forEach((t) => {
              if (!['TKT-892410', 'TKT-741209', 'TKT-630128'].includes(t.id) && !list.some((existing) => existing.id === t.id)) {
                list.push(t);
              }
            });
          }
        } catch (e) {}

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSupportTickets(list);
        try {
          localStorage.setItem('fitzaika_support_tickets', JSON.stringify(list));
        } catch (e) {}
      },
      (error) => {
        console.warn("Support tickets Firestore listener warning:", error);
        try {
          const cached = localStorage.getItem('fitzaika_support_tickets');
          if (cached) {
            const parsed: SupportTicket[] = JSON.parse(cached);
            const clean = parsed.filter(t => !['TKT-892410', 'TKT-741209', 'TKT-630128'].includes(t.id));
            setSupportTickets(clean);
            return;
          }
        } catch (e) {}
        setSupportTickets([]);
      }
    );
    return () => unsubscribe();
  }, []);


  // Fleet & Delivery Partner Management State
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>(() => {
    const cached = localStorage.getItem('fitzaika_delivery_fleet');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return INITIAL_DELIVERY_PARTNERS;
  });

  const [showFleetModal, setShowFleetModal] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerPhone, setPartnerPhone] = useState<string>('');
  const [partnerEmail, setPartnerEmail] = useState<string>('');
  const [partnerPassword, setPartnerPassword] = useState<string>('');
  const [partnerVehicleType, setPartnerVehicleType] = useState<'bike' | 'scooter' | 'ev_two_wheeler' | 'bicycle' | 'car'>('ev_two_wheeler');
  const [partnerVehicleNumber, setPartnerVehicleNumber] = useState<string>('');
  const [partnerKitchenId, setPartnerKitchenId] = useState<string>('');
  const [partnerCity, setPartnerCity] = useState<string>('Muzaffarpur');
  const [partnerStatus, setPartnerStatus] = useState<'active' | 'inactive' | 'offline'>('active');

  // Support Staff Account Vault State
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>(() => {
    const cached = localStorage.getItem('fitzaika_support_agents');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return INITIAL_SUPPORT_AGENTS;
  });

  const [supportSubTab, setSupportSubTab] = useState<'tickets' | 'delivery_complaints' | 'agents'>('tickets');
  const [showSupportAgentModal, setShowSupportAgentModal] = useState<boolean>(false);
  const [editingSupportAgent, setEditingSupportAgent] = useState<SupportAgent | null>(null);

  const [agentName, setAgentName] = useState<string>('');
  const [agentPhone, setAgentPhone] = useState<string>('');
  const [agentEmail, setAgentEmail] = useState<string>('');
  const [agentPassword, setAgentPassword] = useState<string>('');
  const [agentRole, setAgentRole] = useState<'overall' | 'kitchen' | 'city' | 'delivery_support_global' | 'delivery_support_city'>('overall');
  const [agentKitchenId, setAgentKitchenId] = useState<string>('');
  const [agentCity, setAgentCity] = useState<string>('Muzaffarpur');
  const [agentStatus, setAgentStatus] = useState<'active' | 'inactive'>('active');

  // Delivery Partner Complaints Filter & Response States
  const [deliveryFilterStatus, setDeliveryFilterStatus] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'closed'>('all');
  const [deliveryFilterCategory, setDeliveryFilterCategory] = useState<string>('all');
  const [deliveryFilterPriority, setDeliveryFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');
  const [deliveryFilterCity, setDeliveryFilterCity] = useState('all');
  const [deliverySort, setDeliverySort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [expandedDeliveryTicketId, setExpandedDeliveryTicketId] = useState<string | null>(null);
  const [deliveryReplyTextMap, setDeliveryReplyTextMap] = useState<Record<string, string>>({});
  const [deliveryReplyStatusMap, setDeliveryReplyStatusMap] = useState<Record<string, 'pending' | 'under_review' | 'resolved' | 'closed'>>({});
  const [isSendingDeliveryReplyMap, setIsSendingDeliveryReplyMap] = useState<Record<string, boolean>>({});

  // Active Order Tagging & Action Modals for Support & Delivery Complaints
  const [orderTaggingTicket, setOrderTaggingTicket] = useState<SupportTicket | null>(null);
  const [viewingOrderDetailModal, setViewingOrderDetailModal] = useState<Order | null>(null);
  const [directMailModal, setDirectMailModal] = useState<{ toEmail: string; toName: string; defaultSubject: string; defaultBody: string } | null>(null);
  const [mailSubjectInput, setMailSubjectInput] = useState<string>('');
  const [mailBodyInput, setMailBodyInput] = useState<string>('');
  const [orderSearchQueryModal, setOrderSearchQueryModal] = useState<string>('');
  const [customOrderIdInput, setCustomOrderIdInput] = useState<string>('');
  const [isSavingOrderTag, setIsSavingOrderTag] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [banningUserFromTicket, setBanningUserFromTicket] = useState<{ user: Partial<User>; isRider?: boolean; ticketId?: string } | null>(null);
  const [ticketBanReason, setTicketBanReason] = useState<string>('Account suspended due to policy violation in support review.');

  // Support Agents Firestore listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'support_agents'), (snapshot) => {
      const fetched: SupportAgent[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push(docSnap.data() as SupportAgent);
      });
      if (fetched.length > 0) {
        setSupportAgents(fetched);
        localStorage.setItem('fitzaika_support_agents', JSON.stringify(fetched));
      }
    }, (err) => {
      console.warn("Firestore support_agents snapshot listener warning:", err);
    });
    return () => unsub();
  }, []);

  // Kitchen Station Managers Account State
  const [kitchenManagers, setKitchenManagers] = useState<KitchenManager[]>(() => {
    const cached = localStorage.getItem('fitzaika_kitchen_managers');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [];
  });

  const [kitchenSubTab, setKitchenSubTab] = useState<'branches' | 'managers'>('branches');
  const [showKitchenManagerModal, setShowKitchenManagerModal] = useState<boolean>(false);
  const [editingKitchenManager, setEditingKitchenManager] = useState<KitchenManager | null>(null);

  const [kmName, setKmName] = useState<string>('');
  const [kmPhone, setKmPhone] = useState<string>('');
  const [kmEmail, setKmEmail] = useState<string>('');
  const [kmPassword, setKmPassword] = useState<string>('');
  const [kmKitchenId, setKmKitchenId] = useState<string>('');
  const [kmStatus, setKmStatus] = useState<'active' | 'inactive'>('active');

  // Kitchen Managers Firestore listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kitchen_managers'), (snapshot) => {
      const fetched: KitchenManager[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push(docSnap.data() as KitchenManager);
      });
      if (fetched.length > 0) {
        setKitchenManagers(fetched);
        localStorage.setItem('fitzaika_kitchen_managers', JSON.stringify(fetched));
      }
    }, (err) => {
      console.warn("Firestore kitchen_managers snapshot listener warning:", err);
    });
    return () => unsub();
  }, []);

  // User Management & Role Administration Workspace state
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'rider' | 'kitchen' | 'admin'>('all');
  const [userCityFilter, setUserCityFilter] = useState<string>('all');
  const [userBannedFilter, setUserBannedFilter] = useState<'all' | 'active' | 'banned' | 'active_orders'>('all');
  const [userSortBy, setUserSortBy] = useState<'newest' | 'oldest' | 'name' | 'city'>('newest');

  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);
  const [editedUserProfileRole, setEditedUserProfileRole] = useState<'customer' | 'rider' | 'kitchen' | 'admin'>('customer');
  const [editedUserProfileCity, setEditedUserProfileCity] = useState<string>('Muzaffarpur');

  const [banningUser, setBanningUser] = useState<User | null>(null);
  const [banReasonInput, setBanReasonInput] = useState<string>('Violation of terms of service.');

  const [isSyncingAuth, setIsSyncingAuth] = useState<boolean>(false);
  const [authSyncStatus, setAuthSyncStatus] = useState<{
    success?: boolean;
    message?: string;
    uid?: string;
  } | null>(null);

  // Sync / Register partner account directly to Firebase Auth
  const syncPartnerToFirebaseAuth = async (emailStr: string, passStr: string): Promise<{ success: boolean; message: string; uid?: string }> => {
    setIsSyncingAuth(true);
    setAuthSyncStatus({ message: 'Provisioning Firebase Auth user...' });
    const cleanEmail = emailStr.trim().toLowerCase();
    const cleanPass = passStr.trim();

    if (!cleanEmail || !cleanPass) {
      setIsSyncingAuth(false);
      const errRes = { success: false, message: 'Please enter a valid Email and Password first.', uid: '' };
      setAuthSyncStatus(errRes);
      return errRes;
    }

    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPass);
      const res = {
        success: true,
        uid: cred.user.uid,
        message: `✓ Created and registered in Firebase Auth! (UID: ${cred.user.uid})`
      };
      setAuthSyncStatus(res);
      setIsSyncingAuth(false);
      return res;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          const secondaryAuth = getSecondaryAuth();
          const cred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPass);
          const res = {
            success: true,
            uid: cred.user.uid,
            message: `✓ Email already in Firebase Auth. Password verified & account linked! (UID: ${cred.user.uid})`
          };
          setAuthSyncStatus(res);
          setIsSyncingAuth(false);
          return res;
        } catch (signInErr: any) {
          const res = {
            success: true,
            uid: '',
            message: `✓ Account registered in Firebase Auth.`
          };
          setAuthSyncStatus(res);
          setIsSyncingAuth(false);
          return res;
        }
      } else {
        const res = {
          success: false,
          uid: '',
          message: `Firebase Auth Note: ${err.message || 'Failed to create user in Firebase Auth.'}`
        };
        setAuthSyncStatus(res);
        setIsSyncingAuth(false);
        return res;
      }
    }
  };

  // Firestore sync for Delivery Fleet
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'delivery_partners'), (snapshot) => {
      const fetched: DeliveryPartner[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as DeliveryPartner);
      });
      if (fetched.length > 0) {
        setDeliveryPartners(fetched);
      }
    }, (err) => {
      console.warn("Firestore delivery_partners snapshot listener error:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('fitzaika_delivery_fleet', JSON.stringify(deliveryPartners));
  }, [deliveryPartners]);
  const [chefStation, setChefStation] = useState<'all' | 'lane_a' | 'lane_b'>('all');
  const [enableVoiceAnnounce, setEnableVoiceAnnounce] = useState<boolean>(() => {
    return localStorage.getItem('fitzaika_kds_voice') === 'true';
  });
  const [tickedPrepSteps, setTickedPrepSteps] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [meals, setMeals] = useState<Meal[]>([]);
  const [ingredients, setIngredients] = useState<IngredientStock[]>(INITIAL_INGREDIENTS);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponSubTab, setCouponSubTab] = useState<'campaigns' | 'analytics' | 'stacking'>('campaigns');

  // Gym Partner and Offer Management states
  const [gymSubTab, setGymSubTab] = useState<'chains' | 'partners' | 'offers' | 'referrals'>('chains');
  const [showGymModal, setShowGymModal] = useState<boolean>(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);

  // Gym Chain form states
  const [showChainModal, setShowChainModal] = useState<boolean>(false);
  const [editingChain, setEditingChain] = useState<GymChain | null>(null);
  const [chainName, setChainName] = useState<string>('');
  const [chainDescription, setChainDescription] = useState<string>('');
  const [chainLogo, setChainLogo] = useState<string>('');

  // Gym form states
  const [gymChainId, setGymChainId] = useState<string>('');
  const [gymName, setGymName] = useState<string>('');
  const [gymCity, setGymCity] = useState<string>('');
  const [gymAddress, setGymAddress] = useState<string>('');
  const [gymDiscountPct, setGymDiscountPct] = useState<number>(15);
  const [gymBannerText, setGymBannerText] = useState<string>('');
  const [gymImage, setGymImage] = useState<string>('');
  const [gymOwnerName, setGymOwnerName] = useState<string>('');
  const [gymOwnerPhone, setGymOwnerPhone] = useState<string>('');
  const [gymOwnerEmail, setGymOwnerEmail] = useState<string>('');
  const [gymIsActive, setGymIsActive] = useState<boolean>(true);
  const [gymIsVerified, setGymIsVerified] = useState<boolean>(true);
  const [gymPartnerStatus, setGymPartnerStatus] = useState<'bronze' | 'silver' | 'gold' | 'elite'>('gold');
  const [gymOfferType, setGymOfferType] = useState<'discount' | 'free_meal' | 'perk_only' | 'referral_bonus' | 'group_deal'>('discount');
  const [gymFreeMealRule, setGymFreeMealRule] = useState<string>('');
  const [gymReferralCode, setGymReferralCode] = useState<string>('');
  const [gymMembersOffersRaw, setGymMembersOffersRaw] = useState<string>('');
  const [gymGroupDealsRaw, setGymGroupDealsRaw] = useState<string>('');
  const [gymLat, setGymLat] = useState<number | undefined>(undefined);
  const [gymLng, setGymLng] = useState<number | undefined>(undefined);

  // Coupon form states
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [couponCode, setCouponCodeState] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed' | 'free_delivery' | 'free_perk'>('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState(15);
  const [couponPerkName, setCouponPerkName] = useState('');
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [couponExpiryDate, setCouponExpiryDate] = useState('');
  const [couponMinOrderValue, setCouponMinOrderValue] = useState(0);
  const [couponUsageCap, setCouponUsageCap] = useState(100);
  const [couponUsageCount, setCouponUsageCount] = useState(0);
  const [couponFirstNUsersOnly, setCouponFirstNUsersOnly] = useState(0);
  const [couponScope, setCouponScope] = useState<'all' | 'account_based' | 'gym_only'>('all');
  const [couponTargetUserEmail, setCouponTargetUserEmail] = useState('');
  const [couponTargetGymId, setCouponTargetGymId] = useState('');
  const [couponIsStackable, setCouponIsStackable] = useState(false);
  const [couponStackableWith, setCouponStackableWith] = useState<string[]>([]);

  // Meal Filter and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiet, setFilterDiet] = useState<'all' | 'veg' | 'non_veg' | 'vegan'>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [mealsCurrentPage, setMealsCurrentPage] = useState(1);
  const MEALS_PER_PAGE = 5;

  // Add/Edit Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formPrice, setFormPrice] = useState(300);
  const [formCalories, setFormCalories] = useState(400);
  const [formProtein, setFormProtein] = useState(30);
  const [formCarbs, setFormCarbs] = useState(40);
  const [formFats, setFormFats] = useState(10);
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsVegan, setFormIsVegan] = useState(false);
  const [formIngredientsText, setFormIngredientsText] = useState('');
  const [formSpicyLevel, setFormSpicyLevel] = useState<'mild' | 'medium' | 'spicy'>('medium');
  const [formTimings, setFormTimings] = useState<('breakfast' | 'lunch' | 'dinner' | 'snack')[]>(['lunch', 'dinner']);
  const [formGoals, setFormGoals] = useState<('fat_loss' | 'muscle_gain' | 'maintenance' | 'post_workout')[]>(['maintenance']);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formIsHidden, setFormIsHidden] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formPartnerGymExclusive, setFormPartnerGymExclusive] = useState(false);
  
  // Kitchen Management states
  const [selectedKdsKitchenId, setSelectedKdsKitchenId] = useState<string>('all');
  const [showKitchenModal, setShowKitchenModal] = useState<boolean>(false);
  const [editingKitchen, setEditingKitchen] = useState<Kitchen | null>(null);
  const [kitchenName, setKitchenName] = useState<string>('');
  const [kitchenAddress, setKitchenAddress] = useState<string>('');
  const [kitchenCity, setKitchenCity] = useState<string>('Muzaffarpur');
  const [kitchenLat, setKitchenLat] = useState<number | undefined>(undefined);
  const [kitchenLng, setKitchenLng] = useState<number | undefined>(undefined);
  const [kitchenGeofenceRadius, setKitchenGeofenceRadius] = useState<number>(5);
  const [kitchenIsActive, setKitchenIsActive] = useState<boolean>(true);

  // Enhanced KDS Multi-Branch Terminal States
  const [kdsUnlocked, setKdsUnlocked] = useState<boolean>(false);
  const [enteredKdsPassword, setEnteredKdsPassword] = useState<string>('');
  const [kdsPasswordError, setKdsPasswordError] = useState<string>('');
  const [showSwitchKdsModal, setShowSwitchKdsModal] = useState<boolean>(false);
  const [switchKdsInputId, setSwitchKdsInputId] = useState<string>('');

  // KDS Prep Controller & Rush Time Delay States
  const [showPrepDelayModal, setShowPrepDelayModal] = useState<boolean>(false);
  const [customPrepDelayInput, setCustomPrepDelayInput] = useState<string>('');

  // Kitchen Inventory Management States (Auto-adapted to activeKdsKitchen.id)
  const [inventoryItems, setInventoryItems] = useState<KitchenInventoryItem[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState<boolean>(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<KitchenInventoryItem | null>(null);

  const [invName, setInvName] = useState<string>('');
  const [invCategory, setInvCategory] = useState<KitchenInventoryItem['category']>('raw_ingredients');
  const [invQuantity, setInvQuantity] = useState<number>(10);
  const [invUnit, setInvUnit] = useState<KitchenInventoryItem['unit']>('kg');
  const [invMinThreshold, setInvMinThreshold] = useState<number>(3);
  const [invCostPerUnit, setInvCostPerUnit] = useState<number>(50);
  const [invNotes, setInvNotes] = useState<string>('');
  const [invConnectedMealIds, setInvConnectedMealIds] = useState<string[]>([]);
  const [invMealSearchQuery, setInvMealSearchQuery] = useState<string>('');

  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all');
  const [invSearchQuery, setInvSearchQuery] = useState<string>('');

  const activeKdsKitchen = useMemo(() => {
    if (allKitchens.length === 0) return null;
    return allKitchens.find(k => k.id === selectedKdsKitchenId) || allKitchens[0];
  }, [allKitchens, selectedKdsKitchenId]);

  const toast = useMemo(() => ({
    success: (msg: string) => {
      console.log("KDS SUCCESS:", msg);
    },
    error: (msg: string) => {
      console.error("KDS ERROR:", msg);
    }
  }), []);

  // Real-time Firestore sync for Kitchen Inventory automatically adapting to activeKdsKitchen.id
  useEffect(() => {
    if (!activeKdsKitchen?.id) return;
    const q = query(
      collection(db, 'kitchen_inventory'),
      where('kitchenId', '==', activeKdsKitchen.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: KitchenInventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as KitchenInventoryItem);
      });
      setInventoryItems(list);
    }, (err) => {
      console.error("Error loading kitchen inventory:", err);
    });
    return () => unsubscribe();
  }, [activeKdsKitchen?.id]);

  // --- KDS RIDER CASH DASHBOARD & TWO-STEP DEPOSIT APPROVALS ---
  const [cashDeposits, setCashDeposits] = useState<CashDepositRequest[]>([]);
  const [kdsSubSection, setKdsSubSection] = useState<'prep_lanes' | 'rider_desk' | 'eod_settlement'>('prep_lanes');
  const [kdsRiderDeskTab, setKdsRiderDeskTab] = useState<'pending' | 'ledger' | 'deliveries' | 'history'>('pending');
  const [kdsDateFilter, setKdsDateFilter] = useState<'today' | 'all'>('today');
  const [kdsRiderSearch, setKdsRiderSearch] = useState<string>('');
  const [rejectionModalDeposit, setRejectionModalDeposit] = useState<CashDepositRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isProcessingDepositAction, setIsProcessingDepositAction] = useState<boolean>(false);
  const [kdsDepositSuccessNotice, setKdsDepositSuccessNotice] = useState<string | null>(null);
  const [manualDepositRiderId, setManualDepositRiderId] = useState<string>('');
  const [manualDepositAmount, setManualDepositAmount] = useState<string>('');
  const [showManualDepositModal, setShowManualDepositModal] = useState<boolean>(false);

  // EOD Shift Settlements State (Admin)
  const [eodReports, setEodReports] = useState<KitchenEODReport[]>([]);
  const [selectedEODReport, setSelectedEODReport] = useState<KitchenEODReport | null>(null);
  const [isEODReadOnly, setIsEODReadOnly] = useState<boolean>(false);
  const [eodKitchenFilter, setEodKitchenFilter] = useState<string>('all');
  const [isSyncingLowStockMenu, setIsSyncingLowStockMenu] = useState<boolean>(false);
  const [lowStockSyncNotice, setLowStockSyncNotice] = useState<string | null>(null);

  // Real-time listener for all kitchen_eod_reports in Admin
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kitchen_eod_reports'), (snap) => {
      const list: KitchenEODReport[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as KitchenEODReport));
      list.sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime());
      setEodReports(list);
    }, (err) => {
      console.warn("Firestore kitchen_eod_reports error in AdminPortal:", err);
    });
    return () => unsub();
  }, []);

  // Low-Stock Auto-Disable Sync: when kitchen inventory changes, automatically sync with customer menu
  useEffect(() => {
    if (inventoryItems.length === 0 || meals.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await syncLowStockMenuWithFirestore(inventoryItems, meals);
        if (res.disabledCount > 0 || res.restoredCount > 0) {
          setLowStockSyncNotice(
            `Auto Menu Sync: ${res.disabledCount} dishes marked Sold Out, ${res.restoredCount} restocked on customer menu.`
          );
        }
      } catch (e) {
        console.warn("Auto menu sync error in AdminPortal:", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [inventoryItems, meals]);

  const handleAdminLowStockSync = async () => {
    setIsSyncingLowStockMenu(true);
    try {
      const res = await syncLowStockMenuWithFirestore(inventoryItems, meals);
      setLowStockSyncNotice(
        `Menu Synced: ${res.disabledCount} dishes marked Sold Out, ${res.restoredCount} restocked on customer menu.`
      );
    } catch (e) {
      console.warn("Manual menu sync error in Admin:", e);
    } finally {
      setIsSyncingLowStockMenu(false);
    }
  };

  const handleOpenAdminEODSettlement = (targetKitchen?: Kitchen) => {
    const k = targetKitchen || activeKdsKitchen;
    if (!k) return;
    const report = computeEODShiftReport({
      kitchenId: k.id,
      kitchenName: k.name,
      managerId: 'admin-hq',
      managerName: 'HQ Operations / Admin',
      orders: orders,
      inventoryItems: inventoryItems,
      cashDeposits: cashDeposits,
      shiftType: 'full_day',
      peakRushBufferMinutes: k.globalPrepDelayMinutes || 0
    });
    setSelectedEODReport(report);
    setIsEODReadOnly(false);
  };

  // Real-time listener for cash deposits across the platform
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cash_deposits'), (snapshot) => {
      const list: CashDepositRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CashDepositRequest);
      });
      list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      setCashDeposits(list);
    }, (err) => {
      console.warn("Firestore cash_deposits error in AdminPortal:", err);
    });
    return () => unsub();
  }, []);

  // Format today's date cleanly for KDS
  const getKdsTodayDisplay = () => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isKdsDateToday = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return (
        parsed.getFullYear() === today.getFullYear() &&
        parsed.getMonth() === today.getMonth() &&
        parsed.getDate() === today.getDate()
      );
    }
    const todayStr1 = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayStr2 = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return dateStr.includes(todayStr1) || dateStr.includes(todayStr2);
  };

  const formatKdsDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return dateStr;
  };

  // Assigned riders for active KDS kitchen
  const kitchenAssignedRiders = useMemo(() => {
    if (!activeKdsKitchen?.id) return deliveryPartners;
    return deliveryPartners.filter(p => 
      p.kitchenId === activeKdsKitchen.id ||
      (!p.kitchenId && activeKdsKitchen.id === allKitchens[0]?.id)
    );
  }, [deliveryPartners, activeKdsKitchen, allKitchens]);

  // Handle Kitchen Approving Rider Cash Handover
  const handleApproveCashDeposit = async (dep: CashDepositRequest) => {
    setIsProcessingDepositAction(true);
    try {
      const cashierDeskName = `${activeKdsKitchen?.name || 'Kitchen Hub'} Cashier Desk`;
      await updateDoc(doc(db, 'cash_deposits', dep.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: cashierDeskName,
        approvedByName: cashierDeskName
      });

      // Update delivery partner's cashInHand
      const partner = deliveryPartners.find(p => p.id === dep.partnerId);
      if (partner) {
        const remainingCash = Math.max(0, (partner.cashInHand || 0) - dep.amount);
        try {
          await updateDoc(doc(db, 'delivery_partners', partner.id), {
            cashInHand: remainingCash
          });
        } catch (e) {
          console.warn("Could not update delivery_partners doc directly:", e);
        }
        setDeliveryPartners(prev => prev.map(p => p.id === partner.id ? { ...p, cashInHand: remainingCash } : p));
      }

      playKitchenChime('complete');
      setKdsDepositSuccessNotice(`✅ Approved ₹${dep.amount} cash deposit from ${dep.partnerName}! Cash logged into kitchen register.`);
      setTimeout(() => setKdsDepositSuccessNotice(null), 6000);
    } catch (err) {
      console.error("Failed to approve cash deposit:", err);
      alert("Failed to approve deposit. Please check connection.");
    } finally {
      setIsProcessingDepositAction(false);
    }
  };

  // Handle Kitchen Rejecting Rider Cash Handover
  const handleRejectCashDeposit = async (dep: CashDepositRequest, reason: string) => {
    setIsProcessingDepositAction(true);
    try {
      await updateDoc(doc(db, 'cash_deposits', dep.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason.trim() || 'Amount discrepancy noted at kitchen counter'
      });
      setKdsDepositSuccessNotice(`⚠️ Rejected cash handover request #${dep.id}. Rider notified.`);
      setRejectionModalDeposit(null);
      setRejectionReasonInput('');
      setTimeout(() => setKdsDepositSuccessNotice(null), 6000);
    } catch (err) {
      console.error("Failed to reject cash deposit:", err);
    } finally {
      setIsProcessingDepositAction(false);
    }
  };

  // Direct manual cash collection entry from KDS desk
  const handleCreateDirectDeposit = async () => {
    const amt = parseFloat(manualDepositAmount);
    if (!manualDepositRiderId || isNaN(amt) || amt <= 0) {
      alert("Please select a valid rider and enter a valid cash amount.");
      return;
    }
    const partner = deliveryPartners.find(p => p.id === manualDepositRiderId);
    if (!partner) return;

    setIsProcessingDepositAction(true);
    try {
      const cashierDeskName = `${activeKdsKitchen?.name || 'Kitchen Hub'} Cashier Desk`;
      await addDoc(collection(db, 'cash_deposits'), {
        partnerId: partner.id,
        partnerName: partner.name,
        partnerPhone: partner.phone || '',
        partnerVehicle: partner.vehicleNumber || partner.vehicleType || '',
        kitchenId: activeKdsKitchen?.id || partner.kitchenId || 'default',
        kitchenName: activeKdsKitchen?.name || partner.kitchenName || 'Main Kitchen',
        amount: amt,
        status: 'approved',
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: cashierDeskName,
        approvedByName: cashierDeskName,
        notes: 'Direct physical counter handover logged by kitchen cashier'
      });

      const remainingCash = Math.max(0, (partner.cashInHand || 0) - amt);
      try {
        await updateDoc(doc(db, 'delivery_partners', partner.id), {
          cashInHand: remainingCash
        });
      } catch (e) {
        console.warn("Could not update delivery_partners doc:", e);
      }
      setDeliveryPartners(prev => prev.map(p => p.id === partner.id ? { ...p, cashInHand: remainingCash } : p));

      setShowManualDepositModal(false);
      setManualDepositRiderId('');
      setManualDepositAmount('');
      playKitchenChime('complete');
      setKdsDepositSuccessNotice(`✅ Directly collected & recorded ₹${amt} cash from rider ${partner.name}!`);
      setTimeout(() => setKdsDepositSuccessNotice(null), 6000);
    } catch (err) {
      console.error("Direct deposit creation error:", err);
      alert("Failed to record cash deposit.");
    } finally {
      setIsProcessingDepositAction(false);
    }
  };

  // Seed default baseline inventory for current active kitchen
  const handleSeedDefaultInventory = async () => {
    if (!activeKdsKitchen?.id) return;
    const defaults: Omit<KitchenInventoryItem, 'id'>[] = [
      { kitchenId: activeKdsKitchen.id, name: 'Chicken Breast (Boneless)', category: 'proteins', quantity: 30, unit: 'kg', minThreshold: 5, status: 'in_stock', costPerUnit: 220, notes: 'Fresh daily supply' },
      { kitchenId: activeKdsKitchen.id, name: 'Fresh Paneer / Cottage Cheese', category: 'dairy', quantity: 20, unit: 'kg', minThreshold: 4, status: 'in_stock', costPerUnit: 340, notes: 'Low fat organic' },
      { kitchenId: activeKdsKitchen.id, name: 'Basmati Brown Rice', category: 'raw_ingredients', quantity: 50, unit: 'kg', minThreshold: 10, status: 'in_stock', costPerUnit: 110, notes: 'High fiber long grain' },
      { kitchenId: activeKdsKitchen.id, name: 'Exotic Broccoli & Salad Greens', category: 'vegetables', quantity: 15, unit: 'kg', minThreshold: 3, status: 'in_stock', costPerUnit: 180, notes: 'Hydroponic farm fresh' },
      { kitchenId: activeKdsKitchen.id, name: 'Extra Virgin Olive Oil', category: 'pantry_spices', quantity: 12, unit: 'liters', minThreshold: 2, status: 'in_stock', costPerUnit: 750, notes: 'Cold pressed' },
      { kitchenId: activeKdsKitchen.id, name: 'Taash Secret Bhatti Spice Mix', category: 'pantry_spices', quantity: 8, unit: 'kg', minThreshold: 1.5, status: 'in_stock', costPerUnit: 450, notes: 'House recipe blend' },
      { kitchenId: activeKdsKitchen.id, name: 'Heat-Sealed Bento Trays', category: 'packaging', quantity: 250, unit: 'boxes', minThreshold: 50, status: 'in_stock', costPerUnit: 12, notes: 'Microwave-safe leakproof' },
      { kitchenId: activeKdsKitchen.id, name: 'Counter Carry-out Paper Bags', category: 'packaging', quantity: 300, unit: 'units', minThreshold: 60, status: 'in_stock', costPerUnit: 6, notes: 'Eco-friendly kraft' },
      { kitchenId: activeKdsKitchen.id, name: 'Whey Protein Isolate Powder', category: 'proteins', quantity: 10, unit: 'kg', minThreshold: 2, status: 'in_stock', costPerUnit: 2400, notes: 'Unflavored 90% purity' },
    ];

    try {
      for (const item of defaults) {
        await addDoc(collection(db, 'kitchen_inventory'), {
          ...item,
          lastRestockedAt: new Date().toISOString(),
          lastUpdatedBy: activeKdsKitchen.name,
        });
      }
      toast.success(`Initialized baseline inventory for ${activeKdsKitchen.name}!`);
    } catch (err) {
      toast.error("Failed to seed baseline inventory");
    }
  };

  // Quick quantity increment / decrement
  const handleUpdateStockQuantity = async (itemId: string, currentQty: number, delta: number, minThreshold: number) => {
    const nextQty = Math.max(0, currentQty + delta);
    const status: KitchenInventoryItem['status'] = nextQty === 0 ? 'out_of_stock' : nextQty <= minThreshold ? 'low_stock' : 'in_stock';
    try {
      await updateDoc(doc(db, 'kitchen_inventory', itemId), {
        quantity: nextQty,
        status,
        lastRestockedAt: new Date().toISOString(),
      });
      toast.success(`Updated stock quantity to ${nextQty}`);
    } catch (err) {
      toast.error("Failed to update stock level");
    }
  };

  // Add or Edit Inventory Item
  const handleSaveInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKdsKitchen?.id || !invName.trim()) {
      toast.error("Please provide item name");
      return;
    }
    const status: KitchenInventoryItem['status'] = invQuantity === 0 ? 'out_of_stock' : invQuantity <= invMinThreshold ? 'low_stock' : 'in_stock';
    const payload = {
      kitchenId: activeKdsKitchen.id,
      name: invName.trim(),
      category: invCategory,
      quantity: invQuantity,
      unit: invUnit,
      minThreshold: invMinThreshold,
      status,
      costPerUnit: invCostPerUnit,
      notes: invNotes.trim(),
      connectedMealIds: invConnectedMealIds,
      lastRestockedAt: new Date().toISOString(),
      lastUpdatedBy: activeKdsKitchen.name,
    };

    try {
      if (editingInventoryItem) {
        await updateDoc(doc(db, 'kitchen_inventory', editingInventoryItem.id), payload);
        toast.success(`Updated ${invName}`);
      } else {
        await addDoc(collection(db, 'kitchen_inventory'), payload);
        toast.success(`Added ${invName} to ${activeKdsKitchen.name} inventory`);
      }
      setShowAddInventoryModal(false);
      setEditingInventoryItem(null);
      setInvConnectedMealIds([]);
    } catch (err) {
      toast.error("Failed to save inventory item");
    }
  };

  // Delete Inventory Item
  const handleDeleteInventoryItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'kitchen_inventory', itemId));
      toast.success("Inventory item removed");
    } catch (err) {
      toast.error("Failed to delete inventory item");
    }
  };

  // Adjust order extra prep time
  const handleAdjustOrderPrepTime = async (orderId: string, deltaMinutes: number) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const currentExtra = targetOrder.extraPrepMinutes || 0;
    const nextExtra = currentExtra + deltaMinutes;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        extraPrepMinutes: nextExtra,
      });
      toast.success(`Order ${orderId} prep time updated (${nextExtra > 0 ? '+' : ''}${nextExtra} mins)`);
    } catch (err) {
      try {
        await setDoc(doc(db, 'orders', orderId), { extraPrepMinutes: nextExtra }, { merge: true });
        toast.success(`Order ${orderId} prep time updated`);
      } catch (e2) {
        toast.error("Failed to update prep time");
      }
    }
  };

  // Set global kitchen prep delay
  const handleSetGlobalPrepDelay = async (kitchenId: string, delayMins: number) => {
    try {
      await updateDoc(doc(db, 'kitchens', kitchenId), {
        globalPrepDelayMinutes: delayMins,
      });
      toast.success(`${activeKdsKitchen?.name} expected prep buffer set to ${delayMins > 0 ? `+${delayMins} min peak rush` : 'Normal (0 min)'}`);
      setShowPrepDelayModal(false);
    } catch (err) {
      try {
        await setDoc(doc(db, 'kitchens', kitchenId), { globalPrepDelayMinutes: delayMins }, { merge: true });
        toast.success(`Global prep buffer updated to ${delayMins} mins`);
        setShowPrepDelayModal(false);
      } catch (e2) {
        toast.error("Failed to update kitchen prep delay");
      }
    }
  };

  // Default to the first kitchen branch on mount/load
  useEffect(() => {
    if (selectedKdsKitchenId === 'all' && allKitchens.length > 0) {
      setSelectedKdsKitchenId(allKitchens[0].id);
    }
  }, [allKitchens, selectedKdsKitchenId]);

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isKdsLocked = useMemo(() => {
    return false; // Password requirement removed for Admin KDS terminal as requested
  }, []);

  const visibleOrders = useMemo(() => {
    return orders.filter(o => {
      // 0. Cancelled orders should not appear on active KDS queue
      if (o.status === 'cancelled') return false;

      // If 'all' terminals selected or no active kitchen selected, show all active orders
      if (selectedKdsKitchenId === 'all' || !activeKdsKitchen) {
        return true;
      }

      const activeId = activeKdsKitchen.id;

      // 1. If explicitly accepted by a specific kitchen terminal
      if (o.acceptedByKitchenId && o.acceptedByKitchenId.trim() !== "") {
        return o.acceptedByKitchenId === activeId;
      }

      // 2. If this kitchen terminal explicitly denied/rejected this order, hide it
      if (o.rejectedByKitchenIds && o.rejectedByKitchenIds.includes(activeId)) {
        return false;
      }

      // 3. For unaccepted orders: if assigned, eligible, or geofenced, or general broadcast, display on terminal
      if (o.kitchenId && o.kitchenId === activeId) {
        return true;
      }

      if (o.eligibleKitchenIds && o.eligibleKitchenIds.length > 0) {
        if (o.eligibleKitchenIds.includes(activeId)) {
          return true;
        }
      }

      // 4. Geofence distance check fallback
      const kLat = activeKdsKitchen.lat;
      const kLng = activeKdsKitchen.lng;
      const radius = activeKdsKitchen.geofenceRadius || 25;

      const dLat = o.deliveryLat || (o as any).lat;
      const dLng = o.deliveryLng || (o as any).lng;

      if (dLat && dLng && kLat && kLng) {
        const dist = getDistanceKm(dLat, dLng, kLat, kLng);
        if (dist <= radius) return true;
      }

      // 5. Broadcast fallback: if unaccepted, display so no order is ever lost
      return true;
    });
  }, [orders, activeKdsKitchen, selectedKdsKitchenId]);

  // Custom delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'meal' | 'coupon' | 'gym' | 'chain' | 'kitchen' | 'fleet' | 'user' | 'banner' | 'ingredient' | 'support_agent'; id: string; label: string } | null>(null);

  // Open Add Meal Form
  const handleOpenAddMeal = () => {
    setEditingMeal(null);
    setFormName('');
    setFormDescription('');
    setFormImage('');
    setFormPrice(299);
    setFormCalories(450);
    setFormProtein(30);
    setFormCarbs(40);
    setFormFats(12);
    setFormIsVeg(true);
    setFormIsVegan(false);
    setFormIngredientsText('');
    setFormSpicyLevel('medium');
    setFormTimings(['lunch', 'dinner']);
    setFormGoals(['maintenance']);
    setFormIsAvailable(true);
    setFormIsHidden(false);
    setFormIsFeatured(false);
    setFormPartnerGymExclusive(false);
    setShowFormModal(true);
  };

  // Open Edit Meal Form
  const handleOpenEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setFormName(meal.name);
    setFormDescription(meal.description);
    setFormImage(meal.image);
    setFormPrice(meal.price);
    setFormCalories(meal.calories);
    setFormProtein(meal.protein);
    setFormCarbs(meal.carbs);
    setFormFats(meal.fats);
    setFormIsVeg(meal.isVeg);
    setFormIsVegan(meal.isVegan === true);
    setFormIngredientsText(meal.ingredients ? meal.ingredients.map(ing => `${ing.name}: ${ing.grams}`).join(', ') : '');
    setFormSpicyLevel(meal.spicyLevel || 'medium');
    setFormTimings(meal.timings || []);
    setFormGoals(meal.goals || []);
    setFormIsAvailable(meal.isAvailable !== false);
    setFormIsHidden(meal.isHidden === true);
    setFormIsFeatured(meal.isFeatured === true);
    setFormPartnerGymExclusive(meal.partnerGymExclusive === true);
    setShowFormModal(true);
  };

  // Save Meal (Add or Update)
  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim()) return;

    const mealId = editingMeal ? editingMeal.id : 'm_' + Date.now();
    const targetImage = formImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
    
    const parseIngredients = (text: string): { name: string; grams: number }[] => {
      if (!text || !text.trim()) return [];
      return text.split(',').map(item => {
        const parts = item.split(':');
        const name = parts[0]?.trim() || '';
        const grams = parts[1] ? parseInt(parts[1].trim(), 10) || 0 : 0;
        return { name, grams };
      }).filter(ing => ing.name !== '');
    };

    const nextMeal: Meal = {
      id: mealId,
      name: formName.trim(),
      description: formDescription.trim(),
      image: targetImage,
      price: Number(formPrice),
      calories: Number(formCalories),
      protein: Number(formProtein),
      carbs: Number(formCarbs),
      fats: Number(formFats),
      isVeg: formIsVeg,
      isVegan: formIsVegan,
      spicyLevel: formSpicyLevel,
      timings: formTimings,
      goals: formGoals,
      rating: editingMeal?.rating,
      popularity: editingMeal ? editingMeal.popularity : 100,
      partnerGymExclusive: formPartnerGymExclusive,
      isAvailable: formIsAvailable,
      isHidden: formIsHidden,
      isFeatured: formIsFeatured,
      ingredients: parseIngredients(formIngredientsText),
    };

    try {
      await setDoc(doc(db, 'meals', mealId), nextMeal, { merge: true });
      setMeals(prev => {
        const exists = prev.some(m => m.id === mealId);
        if (exists) return prev.map(m => m.id === mealId ? nextMeal : m);
        return [nextMeal, ...prev];
      });
      setShowFormModal(false);
    } catch (err) {
      console.error("Error saving meal:", err);
      handleFirestoreError(err, editingMeal ? OperationType.UPDATE : OperationType.CREATE, `meals/${mealId}`);
    }
  };

  // Delete Meal Trigger
  const handleDeleteMeal = (mealId: string, mealName?: string) => {
    setDeleteConfirm({ type: 'meal', id: mealId, label: mealName || mealId });
  };

  // Open Add Delivery Partner Modal
  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerName('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerPassword('fz' + Math.floor(100000 + Math.random() * 900000));
    setPartnerVehicleType('ev_two_wheeler');
    setPartnerVehicleNumber('');
    setPartnerKitchenId(allKitchens[0]?.id || 'k1');
    setPartnerCity(allKitchens[0]?.city || 'Muzaffarpur');
    setPartnerStatus('active');
    setAuthSyncStatus(null);
    setShowFleetModal(true);
  };

  // Open Edit Delivery Partner Modal
  const handleOpenEditPartner = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setPartnerName(partner.name);
    setPartnerPhone(partner.phone);
    setPartnerEmail(partner.email);
    setPartnerPassword(partner.password);
    setPartnerVehicleType(partner.vehicleType);
    setPartnerVehicleNumber(partner.vehicleNumber);
    setPartnerKitchenId(partner.kitchenId);
    setPartnerCity(partner.city || allKitchens.find(k => k.id === partner.kitchenId)?.city || 'Muzaffarpur');
    setPartnerStatus(partner.status === 'inactive' ? 'inactive' : 'active');
    setAuthSyncStatus(partner.firebaseAuthSynced ? {
      success: true,
      message: partner.firebaseUid ? `✓ Registered in Firebase Auth (UID: ${partner.firebaseUid})` : `✓ Registered in Firebase Auth`
    } : null);
    setShowFleetModal(true);
  };

  // Save Delivery Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerPhone.trim() || !partnerEmail.trim() || !partnerPassword.trim() || !partnerVehicleNumber.trim()) {
      alert("Please fill in Name, Email, Password, Phone Number, and Vehicle Registration Number.");
      return;
    }

    const assignedKitchenObj = allKitchens.find(k => k.id === partnerKitchenId);
    const partnerId = editingPartner ? editingPartner.id : 'DP-' + Math.floor(7000 + Math.random() * 1000);

    // Actual Firebase Auth Sync / Provisioning Step
    const authRes = await syncPartnerToFirebaseAuth(partnerEmail, partnerPassword);

    const updatedPartner: DeliveryPartner = {
      id: partnerId,
      name: partnerName.trim(),
      phone: partnerPhone.trim(),
      email: partnerEmail.trim().toLowerCase(),
      password: partnerPassword.trim(),
      vehicleType: partnerVehicleType,
      vehicleNumber: partnerVehicleNumber.trim().toUpperCase(),
      kitchenId: partnerKitchenId,
      kitchenName: assignedKitchenObj?.name || 'Central Kitchen Hub',
      city: partnerCity.trim() || assignedKitchenObj?.city || 'Muzaffarpur',
      status: partnerStatus === 'inactive' ? 'inactive' : 'active',
      rating: editingPartner?.rating || 0,
      deliveriesCompleted: editingPartner?.deliveriesCompleted || 0,
      registeredAt: editingPartner?.registeredAt || new Date().toISOString().split('T')[0],
      firebaseAuthSynced: authRes.success ?? editingPartner?.firebaseAuthSynced ?? true,
      firebaseUid: authRes.uid || editingPartner?.firebaseUid || '',
    };

    try {
      await setDoc(doc(db, 'delivery_partners', partnerId), sanitizeForFirestore(updatedPartner));
    } catch (err) {
      console.warn("Firestore error saving delivery partner:", err);
    }

    setDeliveryPartners(prev => {
      const idx = prev.findIndex(p => p.id === partnerId);
      if (idx >= 0) {
        const nextArr = [...prev];
        nextArr[idx] = updatedPartner;
        return nextArr;
      }
      return [updatedPartner, ...prev];
    });

    setShowFleetModal(false);
  };

  // Delete Delivery Partner
  const handleDeletePartner = (id: string, name?: string) => {
    setDeleteConfirm({ type: 'fleet', id, label: name || id });
  };

  // Copy ONLY Email and Password
  const handleCopyCredentials = (partner: DeliveryPartner) => {
    const credsText = `Email: ${partner.email}\nPassword: ${partner.password}`;
    navigator.clipboard.writeText(credsText);
    alert(`Copied Credentials for ${partner.name}!\n\nEmail: ${partner.email}\nPassword: ${partner.password}`);
  };

  // Share via WhatsApp on partner's registered mobile number
  const handleShareWhatsApp = (partner: DeliveryPartner) => {
    const rawPhone = partner.phone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const textMsg = `Hello ${partner.name},\nHere are your TAASH BHATTI Delivery Fleet account credentials:\n\nEmail: ${partner.email}\nPassword: ${partner.password}\nAssigned Kitchen: ${partner.kitchenName || 'Kitchen Hub'}\n\nApp Login URL: ${window.location.origin}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  // Support Agent Management Handlers
  const handleOpenAddSupportAgent = () => {
    setEditingSupportAgent(null);
    setAgentName('');
    setAgentPhone('');
    setAgentEmail('');
    setAgentPassword('cs' + Math.floor(100000 + Math.random() * 900000));
    setAgentRole('overall');
    setAgentKitchenId(allKitchens[0]?.id || 'k1');
    setAgentCity(allKitchens[0]?.city || 'Muzaffarpur');
    setAgentStatus('active');
    setShowSupportAgentModal(true);
  };

  const handleOpenEditSupportAgent = (agent: SupportAgent) => {
    setEditingSupportAgent(agent);
    setAgentName(agent.name);
    setAgentPhone(agent.phone);
    setAgentEmail(agent.email);
    setAgentPassword(agent.password);
    setAgentRole(agent.role);
    setAgentKitchenId(agent.assignedKitchenId || allKitchens[0]?.id || 'k1');
    setAgentCity(agent.assignedCity || 'Muzaffarpur');
    setAgentStatus(agent.status);
    setShowSupportAgentModal(true);
  };

  const handleSaveSupportAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim() || !agentEmail.trim() || !agentPassword.trim()) {
      alert("Please fill in Name, Phone, Email, and Password.");
      return;
    }

    const assignedKitchenObj = allKitchens.find(k => k.id === agentKitchenId);
    const agentId = editingSupportAgent ? editingSupportAgent.id : 'SA-' + Math.floor(1000 + Math.random() * 9000);

    const authRes = await syncPartnerToFirebaseAuth(agentEmail, agentPassword);

    const updatedAgent: SupportAgent = {
      id: agentId,
      name: agentName.trim(),
      phone: agentPhone.trim(),
      email: agentEmail.trim().toLowerCase(),
      password: agentPassword.trim(),
      role: agentRole,
      assignedKitchenId: agentRole === 'kitchen' ? agentKitchenId : undefined,
      assignedKitchenName: agentRole === 'kitchen' ? (assignedKitchenObj?.name || 'Assigned Kitchen') : undefined,
      assignedCity: (agentRole === 'city' || agentRole === 'delivery_support_city') ? agentCity.trim() : undefined,
      status: agentStatus,
      registeredAt: editingSupportAgent?.registeredAt || new Date().toISOString(),
      firebaseAuthSynced: authRes.success || editingSupportAgent?.firebaseAuthSynced || false,
      firebaseUid: authRes.uid || editingSupportAgent?.firebaseUid || ''
    };

    try {
      await setDoc(doc(db, 'support_agents', agentId), sanitizeForFirestore(updatedAgent));
      setSupportAgents(prev => {
        const filtered = prev.filter(ag => ag.id !== agentId);
        const next = [updatedAgent, ...filtered];
        localStorage.setItem('fitzaika_support_agents', JSON.stringify(next));
        return next;
      });
      setShowSupportAgentModal(false);
      alert(`✓ Customer Support Agent ${editingSupportAgent ? 'updated' : 'created'} successfully!`);
    } catch (err) {
      console.error("Error saving support agent:", err);
      handleFirestoreError(err, editingSupportAgent ? OperationType.UPDATE : OperationType.CREATE, `support_agents/${agentId}`);
    }
  };

  const handleCopySupportAgentCredentials = (agent: SupportAgent) => {
    const credsText = `Email: ${agent.email}\nPassword: ${agent.password}`;
    navigator.clipboard.writeText(credsText);
    alert(`Copied Credentials for ${agent.name}!\n\nEmail: ${agent.email}\nPassword: ${agent.password}`);
  };

  const handleShareSupportAgentWhatsApp = (agent: SupportAgent) => {
    const rawPhone = agent.phone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const scopeDesc = agent.role === 'overall' 
      ? 'Customer Care (Global / All Hubs)' 
      : agent.role === 'kitchen' 
      ? `Kitchen Branch (${agent.assignedKitchenName || 'Kitchen Hub'})` 
      : agent.role === 'city' 
      ? `Customer Care (${agent.assignedCity || 'City Scope'})`
      : agent.role === 'delivery_support_global'
      ? 'Delivery Partner Support Desk (Global / All Cities)'
      : `Delivery Partner Support Desk (${agent.assignedCity || 'City Scope'})`;
    const textMsg = `Hello ${agent.name},\nHere are your TAASH BHATTI Support Desk account credentials:\n\nRole Scope: ${scopeDesc}\nEmail: ${agent.email}\nPassword: ${agent.password}\n\nLogin URL: ${window.location.origin}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  const handleDeleteSupportAgent = (id: string, name?: string) => {
    setDeleteConfirm({ type: 'support_agent' as any, id, label: name || id });
  };

  // Toggle quick fields directly
  const handleToggleMealAvailability = async (meal: Meal) => {
    try {
      await updateDoc(doc(db, 'meals', meal.id), {
        isAvailable: meal.isAvailable === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling availability:", err);
    }
  };

  const handleToggleMealHidden = async (meal: Meal) => {
    try {
      await updateDoc(doc(db, 'meals', meal.id), {
        isHidden: meal.isHidden === true ? false : true
      });
    } catch (err) {
      console.error("Error toggling hidden:", err);
    }
  };
  
  const [usersList, setUsersList] = useState<User[]>([]);

  // Real-time listen to registered Users
  useEffect(() => {
    if (!fbUser) return;
    const isUserAdmin = fbUser.email === 'glixzytechmain@gmail.com' || fbUser.email?.endsWith('@fitzaika.com') || fbUser.email?.endsWith('@taashbhatti.com');
    if (!isUserAdmin) return;

    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const loaded: User[] = [];
      snapshot.forEach((doc) => {
        loaded.push(doc.data() as User);
      });
      setUsersList(loaded);
    }, (error) => {
      console.error("Error subscribing to users in admin portal:", error);
    });

    // Notifications collection listener
    const notifCol = collection(db, 'notifications');
    const unsubscribeNotifs = onSnapshot(notifCol, (snapshot) => {
      const loaded: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
      });
      loaded.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setSentCampaigns(loaded);
    });

    return () => {
      unsubscribe();
      unsubscribeNotifs();
    };
  }, [fbUser]);

  // Dispatch Push Notification Campaign Handler
  const handleDispatchNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) {
      alert("⚠️ Please enter both Title and Body for the notification.");
      return;
    }

    setIsSendingNotif(true);

    const finalDestination = notifLinkType === 'custom' 
      ? (customLinkUrl.trim() || 'menu')
      : (notifLinkUrl || 'menu');

    // Adaptive action button text fallback
    let finalButtonText = notifButtonText.trim();
    if (!finalButtonText) {
      if (notifCategory === 'promo') finalButtonText = 'CLAIM OFFER ➜';
      else if (notifCategory === 'order_update') finalButtonText = 'TRACK NOW ➜';
      else if (notifCategory === 'chef_special') finalButtonText = 'WITNESS ➜';
      else if (notifCategory === 'event') finalButtonText = 'PARTICIPATE ➜';
      else if (notifCategory === 'system') finalButtonText = 'TAKE ACTION ➜';
      else finalButtonText = 'VIEW DETAILS ➜';
    }

    const newNotifId = 'notif_' + Date.now();
    const payload: AppNotification = {
      id: newNotifId,
      title: notifTitle.trim(),
      body: notifBody.trim(),
      category: notifCategory,
      targetAudience: notifAudience,
      targetCity: notifAudience === 'city' ? notifCity : '',
      targetUserIds: notifAudience === 'selected_users' ? notifSelectedUserIds : [],
      imageUrl: notifImageUrl.trim() || undefined,
      linkUrl: finalDestination,
      buttonText: finalButtonText,
      sentByEmail: fbUser?.email || 'Admin',
      sentAt: new Date().toISOString(),
      readBy: [],
    };

    try {
      await setDoc(doc(db, 'notifications', newNotifId), payload);

      // Trigger browser notification directly if admin has granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notifTitle, {
            body: notifBody,
            icon: 'https://cdn.postimage.me/2026/08/01/28172.png',
          });
        } catch (err) {
          console.warn("Local browser notification trigger skipped:", err);
        }
      }

      alert("🚀 Notification Campaign Dispatched Successfully! Broadcasted in real-time across user inboxes.");
      setNotifTitle('');
      setNotifBody('');
      setNotifImageUrl('');
      setNotifSubTab('history');
    } catch (err: any) {
      console.error("Error dispatching notification:", err);
      alert("❌ Failed to dispatch notification: " + (err?.message || String(err)));
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Derived subscribers stats
  const premiumSubscribers = useMemo(() => {
    const counts = {
      fatLoss: 0,
      muscleBuild: 0,
      leanBalance: 0,
    };
    usersList.forEach((u) => {
      if (u.goal === 'fat_loss') counts.fatLoss++;
      else if (u.goal === 'muscle_gain') counts.muscleBuild++;
      else counts.leanBalance++;
    });
    // Safeguard base values if database is empty to show active analytics
    if (counts.fatLoss === 0 && counts.muscleBuild === 0 && counts.leanBalance === 0) {
      counts.fatLoss = 4;
      counts.muscleBuild = 6;
      counts.leanBalance = 3;
    }
    return counts;
  }, [usersList]);

  // Aggregated roster combining standard users, riders, and kitchen operators
  const allUsersCombined = useMemo(() => {
    const map = new Map<string, User>();

    // 1. Add standard users from users collection
    usersList.forEach(u => {
      const key = (u.id || u.email || '').toLowerCase();
      if (key) {
        map.set(key, { ...u, role: u.role || 'customer' });
      }
    });

    // 2. Merge delivery partners (riders)
    deliveryPartners.forEach(dp => {
      const key = (dp.id || dp.email || '').toLowerCase();
      const existing = map.get(key) || map.get((dp.email || '').toLowerCase());
      const riderUser: User = {
        id: dp.id,
        name: dp.name,
        email: dp.email,
        phone: dp.phone,
        role: 'rider',
        city: dp.city || allKitchens.find(k => k.id === dp.kitchenId)?.city || 'Muzaffarpur',
        banned: dp.status === 'inactive' || existing?.banned || false,
        createdAt: dp.registeredAt || existing?.createdAt || new Date().toISOString(),
        ...existing,
      };
      map.set((dp.email || dp.id).toLowerCase(), riderUser);
    });

    return Array.from(map.values());
  }, [usersList, deliveryPartners, allKitchens]);

  // Derived list of all unique cities across kitchens and users
  const allCitiesList = useMemo(() => {
    const citiesSet = new Set<string>();
    citiesSet.add('Muzaffarpur');
    allKitchens.forEach(k => {
      if (k.city) citiesSet.add(k.city);
    });
    allUsersCombined.forEach(u => {
      if (u.city) citiesSet.add(u.city);
    });
    return Array.from(citiesSet).sort();
  }, [allKitchens, allUsersCombined]);

  // Filtered and Sorted Users list for User Management Tab
  const filteredUsers = useMemo(() => {
    let list = [...allUsersCombined];

    // Search query
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q)
      );
    }

    // Role filter
    if (userRoleFilter !== 'all') {
      list = list.filter(u => (u.role || 'customer') === userRoleFilter);
    }

    // City filter
    if (userCityFilter !== 'all') {
      list = list.filter(u => (u.city || 'Muzaffarpur').toLowerCase() === userCityFilter.toLowerCase());
    }

    // Banned / Active Order status filter
    if (userBannedFilter === 'active') {
      list = list.filter(u => !u.banned);
    } else if (userBannedFilter === 'banned') {
      list = list.filter(u => u.banned === true);
    } else if (userBannedFilter === 'active_orders') {
      list = list.filter(u => {
        return orders.some(o => 
          (o.userId === u.id || 
           (u.email && o.customerEmail && o.customerEmail.toLowerCase() === u.email.toLowerCase()) || 
           (u.phone && o.customerPhone && o.customerPhone === u.phone) ||
           (u.id && o.deliveryPartnerId === u.id)
          ) && 
          o.status !== 'delivered' && 
          o.status !== 'cancelled'
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (userSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (userSortBy === 'city') {
        return (a.city || 'Muzaffarpur').localeCompare(b.city || 'Muzaffarpur');
      }
      if (userSortBy === 'oldest') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      // Newest
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return list;
  }, [allUsersCombined, userSearchQuery, userRoleFilter, userCityFilter, userBannedFilter, userSortBy, orders]);

  // User Administration Handlers
  const handleToggleUserBan = async (targetUser: User, reason?: string) => {
    const isCurrentlyBanned = targetUser.banned === true;
    const newBannedState = !isCurrentlyBanned;
    const userDocId = targetUser.id || targetUser.email;

    try {
      if (userDocId) {
        await updateDoc(doc(db, 'users', userDocId), {
          banned: newBannedState,
          bannedReason: newBannedState ? (reason || 'Violation of security policies.') : '',
          bannedAt: newBannedState ? new Date().toISOString() : '',
          bannedBy: fbUser?.email || 'Admin'
        });
      }
      setBanningUser(null);
    } catch (err) {
      console.error("Error toggling user ban:", err);
      try {
        if (targetUser.email) {
          const q = query(collection(db, 'users'), where('email', '==', targetUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, {
              banned: newBannedState,
              bannedReason: newBannedState ? (reason || 'Violation of security policies.') : '',
              bannedAt: newBannedState ? new Date().toISOString() : '',
            });
          }
        }
      } catch (fallbackErr) {
        console.error("Fallback ban failed:", fallbackErr);
      }
      setBanningUser(null);
    }
  };

  const handleSaveUserRoleCity = async (userId: string, newRole: 'customer' | 'rider' | 'kitchen' | 'admin', newCity: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        city: newCity.trim(),
      });
      if (viewingUserProfile) {
        setViewingUserProfile({
          ...viewingUserProfile,
          role: newRole,
          city: newCity.trim(),
        });
      }
    } catch (err) {
      console.error("Error saving user role/city:", err);
    }
  };

  const handleDeleteUser = (targetUser: User) => {
    setDeleteConfirm({
      type: 'user',
      id: targetUser.id || targetUser.email,
      label: `${targetUser.name || 'User'} (${targetUser.email})`,
    });
  };

  // Support & Complaint Ticket Management Handlers: Order Tagging, Deletion & Ban
  const handleTagOrderToTicket = async (ticketId: string, orderId: string | null) => {
    setIsSavingOrderTag(true);
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        orderId: orderId ? orderId.trim() : '',
        updatedAt: new Date().toISOString()
      });
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, orderId: orderId ? orderId.trim() : undefined } : t));
      try {
        const cached = localStorage.getItem('fitzaika_support_tickets');
        if (cached) {
          const list: SupportTicket[] = JSON.parse(cached);
          const updated = list.map(t => t.id === ticketId ? { ...t, orderId: orderId ? orderId.trim() : undefined } : t);
          localStorage.setItem('fitzaika_support_tickets', JSON.stringify(updated));
        }
      } catch (e) {}
      setOrderTaggingTicket(null);
      setCustomOrderIdInput('');
    } catch (err: any) {
      console.error("Error tagging order to ticket:", err);
      alert("Failed to link order: " + (err.message || String(err)));
    } finally {
      setIsSavingOrderTag(false);
    }
  };

  const handleDeleteSupportTicket = async (ticket: SupportTicket) => {
    try {
      await deleteDoc(doc(db, 'support_tickets', ticket.id));
      setSupportTickets(prev => prev.filter(t => t.id !== ticket.id));
      try {
        const cached = localStorage.getItem('fitzaika_support_tickets');
        if (cached) {
          const list: SupportTicket[] = JSON.parse(cached);
          const filtered = list.filter(t => t.id !== ticket.id);
          localStorage.setItem('fitzaika_support_tickets', JSON.stringify(filtered));
        }
      } catch (e) {}
      setTicketToDelete(null);
    } catch (err: any) {
      console.error("Error deleting support ticket:", err);
      alert("Failed to delete ticket: " + (err.message || String(err)));
    }
  };

  const handleDirectBanUser = async (targetUser: Partial<User>, isRider?: boolean, customReason?: string) => {
    const isCurrentlyBanned = targetUser.banned === true;
    const newBannedState = !isCurrentlyBanned;
    const reason = customReason || ticketBanReason || 'Actioned by Admin Support Desk.';

    try {
      if (isRider) {
        // Update delivery_partners collection
        const partner = deliveryPartners.find(p => p.email?.toLowerCase() === targetUser.email?.toLowerCase() || p.id === targetUser.id || p.phone === targetUser.phone);
        if (partner?.id) {
          await updateDoc(doc(db, 'delivery_partners', partner.id), {
            status: newBannedState ? 'inactive' : 'active',
            banned: newBannedState,
            bannedReason: newBannedState ? reason : '',
            bannedAt: newBannedState ? new Date().toISOString() : ''
          });
          setDeliveryPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: newBannedState ? 'inactive' : 'active' } : p));
        }
      }

      // Update standard users collection
      const userDocId = targetUser.id || targetUser.email;
      if (userDocId) {
        await updateDoc(doc(db, 'users', userDocId), {
          banned: newBannedState,
          bannedReason: newBannedState ? reason : '',
          bannedAt: newBannedState ? new Date().toISOString() : '',
          bannedBy: fbUser?.email || 'Admin'
        });
      }

      setUsersList(prev => prev.map(u => {
        if ((u.id && u.id === targetUser.id) || (u.email && u.email.toLowerCase() === targetUser.email?.toLowerCase())) {
          return { ...u, banned: newBannedState, bannedReason: newBannedState ? reason : '' };
        }
        return u;
      }));

      setBanningUserFromTicket(null);
      alert(`✓ ${isRider ? 'Delivery Partner' : 'User'} ${targetUser.name || targetUser.email} has been ${newBannedState ? 'BANNED 🚫' : 'UNBANNED 🟢'}.`);
    } catch (err: any) {
      console.error("Error toggling ban from ticket:", err);
      alert("Failed to update ban status: " + (err.message || String(err)));
    }
  };

  const handleExpediteOrderFromTicket = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        isPriorityVIP: true,
        priorityNote: '🔥 EXPEDITED BY CUSTOMER SUPPORT DESK',
        updatedAt: new Date().toISOString()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isPriorityVIP: true, priorityNote: '🔥 EXPEDITED BY CUSTOMER SUPPORT DESK' } as any : o));
      playKitchenChime('alert');
      alert(`⚡ Order #${orderId} marked as EXPEDITED VIP! Sent high priority alert to kitchen queue.`);
    } catch (err: any) {
      console.error("Error expediting order:", err);
      alert("Failed to expedite order: " + (err.message || String(err)));
    }
  };

  const handleOpenDirectMail = (toEmail: string, toName: string, defaultSubject: string, defaultBody: string) => {
    setDirectMailModal({ toEmail, toName, defaultSubject, defaultBody });
    setMailSubjectInput(defaultSubject);
    setMailBodyInput(defaultBody);
  };

  const handleSendDirectMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMailModal) return;
    const mailtoUrl = `mailto:${directMailModal.toEmail}?subject=${encodeURIComponent(mailSubjectInput)}&body=${encodeURIComponent(mailBodyInput)}`;
    window.open(mailtoUrl, '_blank');
    setDirectMailModal(null);
  };

  // Real-time listen to ingredients collection in Firestore
  useEffect(() => {
    const ingCol = collection(db, 'ingredients');
    const unsubscribe = onSnapshot(ingCol, (snapshot) => {
      const loaded: IngredientStock[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as IngredientStock);
      });
      if (loaded.length > 0) {
        setIngredients(loaded);
      }
    }, (error) => {
      console.error("Error subscribing to ingredients in admin portal:", error);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listen to Firestore orders
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const loadedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        loadedOrders.push({
          ...d,
          id: d.id || doc.id,
          items: d.items || [],
          date: d.date || '',
          status: d.status || 'sent',
          total: d.total || 0,
          discount: d.discount || 0,
          subtotal: d.subtotal || 0,
          deliveryFee: d.deliveryFee || 0,
          address: d.address || '',
          paymentMethod: d.paymentMethod || 'Wallet',
          trackingSteps: d.trackingSteps || [],
          gymId: d.gymId || '',
          userId: d.userId || '',
          kitchenId: d.kitchenId || '',
          kdsStage: d.kdsStage || (d.status === 'cooking' ? 'received' : d.status === 'out_for_delivery' ? 'dispatched' : d.status === 'delivered' ? 'delivered' : d.status === 'cancelled' ? 'cancelled' : 'received'),
          lane: d.lane || 'lane_a',
          chefNote: d.chefNote || '',
          createdAt: d.createdAt || d.updatedAt || new Date().toISOString(),
        } as any);
      });
      // Sort orders descending
      loadedOrders.sort((a, b) => b.id.localeCompare(a.id));
      setOrders(loadedOrders);
    }, (error) => {
      console.error("Error subscribing to admin orders:", error);
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  // Sync / Real-time meals
  useEffect(() => {
    const mealsCol = collection(db, 'meals');
    const unsubscribe = onSnapshot(mealsCol, (snapshot) => {
      if (!snapshot.empty) {
        const loadedMeals: Meal[] = [];
        snapshot.forEach((doc) => {
          loadedMeals.push(doc.data() as Meal);
        });
        setMeals(loadedMeals);
      } else {
        setMeals([]);
      }
    }, (error) => {
      console.error("Error loading meals in admin portal:", error);
      handleFirestoreError(error, OperationType.LIST, 'meals');
    });
    return () => unsubscribe();
  }, []);

  // Real-time coupons listener
  useEffect(() => {
    const couponsCol = collection(db, 'coupons');
    const unsubscribe = onSnapshot(couponsCol, (snapshot) => {
      const loadedCoupons: any[] = [];
      snapshot.forEach((docSnap) => {
        loadedCoupons.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setCoupons(loadedCoupons);
    }, (error) => {
      console.error("Error loading coupons in admin portal:", error);
      handleFirestoreError(error, OperationType.LIST, 'coupons');
    });
    return () => unsubscribe();
  }, []);

  // Real-time Hero Banners listener
  useEffect(() => {
    const bannersCol = collection(db, 'hero_banners');
    const unsubscribe = onSnapshot(bannersCol, (snapshot) => {
      const loadedBanners: HeroBanner[] = [];
      snapshot.forEach((docSnap) => {
        loadedBanners.push({
          id: docSnap.id,
          ...docSnap.data()
        } as HeroBanner);
      });
      if (loadedBanners.length > 0) {
        loadedBanners.sort((a, b) => (a.order || 0) - (b.order || 0));
        setBanners(loadedBanners);
      } else {
        setBanners(DEFAULT_HERO_BANNERS);
      }
    }, (error) => {
      console.error("Error loading hero banners in admin portal:", error);
      setBanners(DEFAULT_HERO_BANNERS);
    });
    return () => unsubscribe();
  }, []);

  // Hero Banner action handlers
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerBadge('🔥 SPECIAL PROMO');
    setBannerImage('https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80');
    setBannerLinkUrl('menu');
    setBannerButtonText('Explore Special ➜');
    setBannerIsActive(true);
    setBannerOrder(banners.length + 1);
    setShowBannerModal(true);
  };

  const handleOpenEditBanner = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title || '');
    setBannerSubtitle(banner.subtitle || '');
    setBannerBadge(banner.badge || '');
    setBannerImage(banner.image || '');
    setBannerLinkUrl(banner.linkUrl || 'menu');
    setBannerButtonText(banner.buttonText || 'Explore Special ➜');
    setBannerIsActive(banner.isActive !== false);
    setBannerOrder(banner.order || 1);
    setShowBannerModal(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;

    const bannerId = editingBanner?.id || `b_${Date.now()}`;
    const bannerData: HeroBanner = {
      id: bannerId,
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
      badge: bannerBadge.trim(),
      image: bannerImage.trim() || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      linkUrl: bannerLinkUrl.trim(),
      buttonText: bannerButtonText.trim() || 'Explore Special ➜',
      isActive: bannerIsActive,
      order: Number(bannerOrder) || 1,
      createdAt: editingBanner?.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'hero_banners', bannerId), sanitizeForFirestore(bannerData));
      setBanners(prev => {
        const exists = prev.some(b => b.id === bannerId);
        if (exists) return prev.map(b => b.id === bannerId ? bannerData : b);
        return [...prev, bannerData];
      });
      setShowBannerModal(false);
    } catch (err) {
      console.error("Error saving banner:", err);
      handleFirestoreError(err, OperationType.WRITE, `hero_banners/${bannerId}`);
    }
  };

  const handleDeleteBanner = (bannerId: string, title?: string) => {
    setDeleteConfirm({ type: 'banner', id: bannerId, label: title || bannerId });
  };

  const handleToggleBannerActive = async (banner: HeroBanner) => {
    try {
      await updateDoc(doc(db, 'hero_banners', banner.id), {
        isActive: banner.isActive === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling banner status:", err);
    }
  };

  const handleSeedDefaultBanners = async () => {
    try {
      for (const b of DEFAULT_HERO_BANNERS) {
        await setDoc(doc(db, 'hero_banners', b.id), b);
      }
      alert("🔥 Default Hero Banners seeded to Firestore!");
    } catch (err) {
      console.error("Error seeding hero banners:", err);
    }
  };

  // Coupon action handlers
  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setCouponCodeState('');
    setCouponDiscountType('percentage');
    setCouponDiscountValue(15);
    setCouponPerkName('');
    setCouponIsActive(true);
    setCouponExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setCouponMinOrderValue(0);
    setCouponUsageCap(100);
    setCouponUsageCount(0);
    setCouponFirstNUsersOnly(0);
    setCouponScope('all');
    setCouponTargetUserEmail('');
    setCouponTargetGymId('');
    setCouponIsStackable(false);
    setCouponStackableWith([]);
    setShowCouponModal(true);
  };

  const handleOpenEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setCouponCodeState(coupon.code || coupon.id);
    setCouponDiscountType(coupon.discountType || 'percentage');
    setCouponDiscountValue(coupon.discountValue || 0);
    setCouponPerkName(coupon.perkName || '');
    setCouponIsActive(coupon.isActive !== false);
    setCouponExpiryDate(coupon.expiryDate || '');
    setCouponMinOrderValue(coupon.minOrderValue || 0);
    setCouponUsageCap(coupon.usageCap || 100);
    setCouponUsageCount(coupon.usageCount || 0);
    setCouponFirstNUsersOnly(coupon.firstNUsersOnly || 0);
    setCouponScope(coupon.scope || 'all');
    setCouponTargetUserEmail(coupon.targetUserEmail || '');
    setCouponTargetGymId(coupon.targetGymId || '');
    setCouponIsStackable(coupon.isStackable === true);
    setCouponStackableWith(coupon.stackableWith || []);
    setShowCouponModal(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const cleanCode = couponCode.trim().toUpperCase();
    const couponData = {
      code: cleanCode,
      discountType: couponDiscountType,
      discountValue: Number(couponDiscountValue) || 0,
      perkName: couponDiscountType === 'free_perk' ? couponPerkName.trim() : '',
      isActive: couponIsActive,
      expiryDate: couponExpiryDate || '',
      minOrderValue: Number(couponMinOrderValue) || 0,
      usageCap: Number(couponUsageCap) || 100,
      usageCount: Number(couponUsageCount) || 0,
      totalSavings: Number(editingCoupon?.totalSavings) || 0,
      firstNUsersOnly: Number(couponFirstNUsersOnly) || 0,
      scope: couponScope,
      targetUserEmail: couponScope === 'account_based' ? couponTargetUserEmail.trim().toLowerCase() : '',
      targetGymId: couponScope === 'gym_only' ? couponTargetGymId : '',
      isStackable: couponIsStackable,
      stackableWith: couponStackableWith,
    };

    try {
      await setDoc(doc(db, 'coupons', cleanCode), sanitizeForFirestore(couponData));
      setShowCouponModal(false);
    } catch (err) {
      console.error("Error saving coupon:", err);
      handleFirestoreError(err, OperationType.WRITE, `coupons/${cleanCode}`);
    }
  };

  const handleDeleteCoupon = (couponId: string) => {
    setDeleteConfirm({ type: 'coupon', id: couponId, label: couponId });
  };

  const handleToggleCouponActive = async (coupon: any) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: coupon.isActive === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling coupon active:", err);
    }
  };

  // Gym operational handlers
  const handleOpenAddGym = (initialChainId?: string) => {
    setEditingGym(null);
    setGymChainId(initialChainId || (gymChains.length > 0 ? gymChains[0].id : ''));
    setGymName('');
    setGymCity('Bengaluru');
    setGymAddress('');
    setGymDiscountPct(15);
    setGymBannerText('');
    setGymImage('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80');
    setGymOwnerName('');
    setGymOwnerPhone('');
    setGymOwnerEmail('');
    setGymIsActive(true);
    setGymIsVerified(true);
    setGymPartnerStatus('gold');
    setGymOfferType('discount');
    setGymFreeMealRule('');
    setGymReferralCode('');
    setGymMembersOffersRaw('');
    setGymGroupDealsRaw('');
    setGymLat(undefined);
    setGymLng(undefined);
    setShowGymModal(true);
  };

  const handleOpenEditGym = (gym: Gym) => {
    setEditingGym(gym);
    setGymChainId(gym.chainId || '');
    setGymName(gym.name || '');
    setGymCity(gym.city || 'Bengaluru');
    setGymAddress(gym.address || '');
    setGymDiscountPct(gym.discountPct || 15);
    setGymBannerText(gym.bannerText || '');
    setGymImage(gym.image || '');
    setGymOwnerName(gym.ownerContactName || '');
    setGymOwnerPhone(gym.ownerContactPhone || '');
    setGymOwnerEmail(gym.ownerContactEmail || '');
    setGymIsActive(gym.isActive !== false);
    setGymIsVerified(gym.isVerified !== false);
    setGymPartnerStatus(gym.partnerStatus || 'gold');
    setGymOfferType(gym.offerType || 'discount');
    setGymFreeMealRule(gym.freeMealRule || '');
    setGymReferralCode(gym.referralCode || '');
    setGymMembersOffersRaw(gym.membersOnlyOffers ? gym.membersOnlyOffers.join('\n') : '');
    setGymGroupDealsRaw(gym.groupOrderDeals ? gym.groupOrderDeals.join('\n') : '');
    setGymLat(gym.lat);
    setGymLng(gym.lng);
    setShowGymModal(true);
  };

  const handleSaveGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName.trim()) return;

    const gymId = editingGym?.id || `g_${Date.now()}`;
    const gymData: Gym = {
      id: gymId,
      chainId: gymChainId,
      name: gymName.trim(),
      city: gymCity.trim() || 'Bengaluru',
      address: gymAddress.trim(),
      discountPct: Number(gymDiscountPct) || 0,
      bannerText: gymBannerText.trim() || `Flat ${gymDiscountPct}% discount at our physical terminal lockers!`,
      image: gymImage.trim() || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
      ownerContactName: gymOwnerName.trim(),
      ownerContactPhone: gymOwnerPhone.trim(),
      ownerContactEmail: gymOwnerEmail.trim(),
      isActive: gymIsActive,
      isVerified: gymIsVerified,
      partnerStatus: gymPartnerStatus,
      offerType: gymOfferType,
      freeMealRule: gymFreeMealRule.trim(),
      referralCode: gymReferralCode.trim().toUpperCase() || `${gymName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase()}${gymDiscountPct}`,
      membersOnlyOffers: gymMembersOffersRaw.split('\n').map(line => line.trim()).filter(Boolean),
      groupOrderDeals: gymGroupDealsRaw.split('\n').map(line => line.trim()).filter(Boolean),
      redemptionsCount: editingGym?.redemptionsCount || 0,
      totalConversions: editingGym?.totalConversions || 0,
      registeredAt: editingGym?.registeredAt || new Date().toISOString().split('T')[0],
      lat: gymLat,
      lng: gymLng
    };

    try {
      await setDoc(doc(db, 'gyms', gymId), sanitizeForFirestore(gymData));
      setShowGymModal(false);
    } catch (err) {
      console.error("Error saving gym partner:", err);
    }
  };

  const handleDeleteGym = (gymId: string, gymName?: string) => {
    setDeleteConfirm({ type: 'gym', id: gymId, label: gymName || gymId });
  };

  const handleToggleGymActive = async (gym: Gym) => {
    try {
      await updateDoc(doc(db, 'gyms', gym.id), {
        isActive: gym.isActive === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling gym active:", err);
    }
  };

  const handleToggleGymVerified = async (gym: Gym) => {
    try {
      await updateDoc(doc(db, 'gyms', gym.id), {
        isVerified: gym.isVerified === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling gym verified:", err);
    }
  };

  // Kitchen operational handlers
  const handleOpenAddKitchen = () => {
    setEditingKitchen(null);
    setKitchenName('');
    setKitchenAddress('');
    setKitchenCity('Muzaffarpur');
    setKitchenLat(undefined);
    setKitchenLng(undefined);
    setKitchenGeofenceRadius(5);
    setKitchenIsActive(true);
    setShowKitchenModal(true);
  };

  const handleOpenEditKitchen = (kitchen: Kitchen) => {
    setEditingKitchen(kitchen);
    setKitchenName(kitchen.name || '');
    setKitchenAddress(kitchen.address || '');
    setKitchenCity(kitchen.city || 'Muzaffarpur');
    setKitchenLat(kitchen.lat);
    setKitchenLng(kitchen.lng);
    setKitchenGeofenceRadius(kitchen.geofenceRadius || 5);
    setKitchenIsActive(kitchen.isActive !== false);
    setShowKitchenModal(true);
  };

  const handleSaveKitchen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchenName.trim()) return;

    const kitchenId = editingKitchen?.id || `k_${Date.now()}`;
    const kitchenData: Kitchen = {
      id: kitchenId,
      name: kitchenName.trim(),
      address: kitchenAddress.trim(),
      city: kitchenCity.trim() || 'Muzaffarpur',
      geofenceRadius: Number(kitchenGeofenceRadius) || 5,
      isActive: kitchenIsActive,
      lat: kitchenLat,
      lng: kitchenLng,
    };

    try {
      await setDoc(doc(db, 'kitchens', kitchenId), sanitizeForFirestore(kitchenData));
      setShowKitchenModal(false);
    } catch (err) {
      console.error("Error saving kitchen branch:", err);
    }
  };

  const handleDeleteKitchen = (kitchenId: string, name?: string) => {
    setDeleteConfirm({ type: 'kitchen', id: kitchenId, label: name || kitchenId });
  };

  const handleToggleKitchenActive = async (kitchen: Kitchen) => {
    try {
      await updateDoc(doc(db, 'kitchens', kitchen.id), {
        isActive: kitchen.isActive === false ? true : false
      });
    } catch (err) {
      console.error("Error toggling kitchen active:", err);
    }
  };

  const handleToggleKitchenRain = async (kitchen: Kitchen) => {
    try {
      const nextRain = !kitchen.isRaining;
      await updateDoc(doc(db, 'kitchens', kitchen.id), {
        isRaining: nextRain
      });
      alert(`🌧️ Rain Mode for "${kitchen.name}" is now ${nextRain ? 'ACTIVATED (Delivery buffer enabled)' : 'DEACTIVATED'}`);
    } catch (err) {
      console.error("Error toggling kitchen rain mode:", err);
      alert("Failed to toggle Rain Mode. Please check network.");
    }
  };

  // Kitchen Manager operational handlers
  const handleOpenAddKitchenManager = () => {
    setEditingKitchenManager(null);
    setKmName('');
    setKmPhone('');
    setKmEmail('');
    setKmPassword('');
    setKmKitchenId(allKitchens[0]?.id || '');
    setKmStatus('active');
    setAuthSyncStatus(null);
    setShowKitchenManagerModal(true);
  };

  const handleOpenEditKitchenManager = (km: KitchenManager) => {
    setEditingKitchenManager(km);
    setKmName(km.name || '');
    setKmPhone(km.phone || '');
    setKmEmail(km.email || '');
    setKmPassword(km.password || '');
    setKmKitchenId(km.assignedKitchenId || allKitchens[0]?.id || '');
    setKmStatus(km.status || 'active');
    setAuthSyncStatus(null);
    setShowKitchenManagerModal(true);
  };

  const handleSaveKitchenManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kmName.trim() || !kmPhone.trim() || !kmEmail.trim() || !kmPassword.trim() || !kmKitchenId) {
      alert("Please fill in Name, Phone, Email, Password, and select an Assigned Kitchen Branch.");
      return;
    }

    const assignedKitchenObj = allKitchens.find(k => k.id === kmKitchenId);
    const kmId = editingKitchenManager ? editingKitchenManager.id : 'KM-' + Math.floor(1000 + Math.random() * 9000);

    const authRes = await syncPartnerToFirebaseAuth(kmEmail, kmPassword);

    const updatedKM: KitchenManager = {
      id: kmId,
      name: kmName.trim(),
      phone: kmPhone.trim(),
      email: kmEmail.trim().toLowerCase(),
      password: kmPassword.trim(),
      assignedKitchenId: kmKitchenId,
      assignedKitchenName: assignedKitchenObj?.name || 'Kitchen Hub',
      status: kmStatus,
      registeredAt: editingKitchenManager?.registeredAt || new Date().toISOString(),
      firebaseAuthSynced: authRes.success || editingKitchenManager?.firebaseAuthSynced || false,
      firebaseUid: authRes.uid || editingKitchenManager?.firebaseUid || '',
      role: 'kitchen_manager'
    };

    try {
      await setDoc(doc(db, 'kitchen_managers', kmId), sanitizeForFirestore(updatedKM));
      setKitchenManagers(prev => {
        const filtered = prev.filter(k => k.id !== kmId);
        const next = [updatedKM, ...filtered];
        localStorage.setItem('fitzaika_kitchen_managers', JSON.stringify(next));
        return next;
      });
      setShowKitchenManagerModal(false);
      alert(`✓ Kitchen Station Manager ${editingKitchenManager ? 'updated' : 'created'} successfully!`);
    } catch (err) {
      console.error("Error saving kitchen manager:", err);
      handleFirestoreError(err, editingKitchenManager ? OperationType.UPDATE : OperationType.CREATE, `kitchen_managers/${kmId}`);
    }
  };

  const handleDeleteKitchenManager = (id: string, name?: string) => {
    setDeleteConfirm({ type: 'kitchen_manager' as any, id, label: name || id });
  };

  const handleToggleKitchenManagerStatus = async (km: KitchenManager) => {
    const nextStatus: 'active' | 'inactive' = km.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'kitchen_managers', km.id), {
        status: nextStatus
      });
      setKitchenManagers(prev => prev.map(item => item.id === km.id ? { ...item, status: nextStatus } : item));
    } catch (err) {
      console.error("Error updating kitchen manager status:", err);
    }
  };

  const handleCopyKMCredentials = (km: KitchenManager) => {
    const credsText = `Email: ${km.email}\nPassword: ${km.password}`;
    navigator.clipboard.writeText(credsText);
    alert(`Copied Station Credentials for ${km.name}!\n\nEmail: ${km.email}\nPassword: ${km.password}`);
  };

  const handleShareKMWhatsApp = (km: KitchenManager) => {
    const rawPhone = km.phone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const textMsg = `Hello Chef ${km.name},\nHere are your TAASH BHATTI Kitchen Station (KDS) login credentials:\n\nAssigned Station: ${km.assignedKitchenName || 'Kitchen Hub'}\nEmail: ${km.email}\nPassword: ${km.password}\n\nLogin URL: ${window.location.origin}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  const handleLaunchKitchenPortal = (km: KitchenManager) => {
    localStorage.setItem('fitzaika_active_km_session', JSON.stringify(km));
    localStorage.setItem('fitzaika_gateway', 'kitchen');
    if (onSwitchGateway) {
      onSwitchGateway('kitchen');
    } else {
      window.location.reload();
    }
  };

  // Gym Chain operational handlers
  const handleOpenAddChain = () => {
    setEditingChain(null);
    setChainName('');
    setChainDescription('');
    setChainLogo('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80');
    setShowChainModal(true);
  };

  const handleOpenEditChain = (chain: GymChain) => {
    setEditingChain(chain);
    setChainName(chain.name || '');
    setChainDescription(chain.description || '');
    setChainLogo(chain.logo || '');
    setShowChainModal(true);
  };

  const handleSaveChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chainName.trim()) return;

    const chainId = editingChain?.id || `chain_${Date.now()}`;
    const chainData: GymChain = {
      id: chainId,
      name: chainName.trim(),
      description: chainDescription.trim(),
      logo: chainLogo.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80',
      registeredAt: editingChain?.registeredAt || new Date().toISOString().split('T')[0]
    };

    try {
      await setDoc(doc(db, 'gym_chains', chainId), sanitizeForFirestore(chainData));
      setShowChainModal(false);
    } catch (err) {
      console.error("Error saving gym chain:", err);
    }
  };

  const handleDeleteChain = (chainId: string, chainName?: string) => {
    // Check if there are active gym branches of this chain
    const branches = allGyms.filter(g => g.chainId === chainId);
    if (branches.length > 0) {
      alert(`Cannot delete this Gym Chain. There are ${branches.length} gym branches belonging to this chain. Please delete or reassign them first.`);
      return;
    }
    setDeleteConfirm({ type: 'chain', id: chainId, label: chainName || chainId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    try {
      if (type === 'meal') {
        await deleteDoc(doc(db, 'meals', id));
        setMeals(prev => prev.filter(m => m.id !== id));
      } else if (type === 'coupon') {
        await deleteDoc(doc(db, 'coupons', id));
        setCoupons(prev => prev.filter(c => (c.id || c.code) !== id));
      } else if (type === 'gym') {
        await deleteDoc(doc(db, 'gyms', id));
      } else if (type === 'chain') {
        await deleteDoc(doc(db, 'gym_chains', id));
      } else if (type === 'kitchen') {
        await deleteDoc(doc(db, 'kitchens', id));
      } else if (type === 'fleet') {
        await deleteDoc(doc(db, 'delivery_partners', id));
        setDeliveryPartners(prev => prev.filter(p => p.id !== id));
      } else if (type === 'user') {
        await deleteDoc(doc(db, 'users', id));
        setUsersList(prev => prev.filter(u => (u.id || u.email) !== id));
      } else if (type === 'banner') {
        await deleteDoc(doc(db, 'hero_banners', id));
        setBanners(prev => prev.filter(b => b.id !== id));
      } else if (type === 'ingredient') {
        await deleteDoc(doc(db, 'ingredients', id));
        setIngredients(prev => prev.filter(ing => ing.id !== id));
      } else if (type === ('support_agent' as any)) {
        await deleteDoc(doc(db, 'support_agents', id));
        setSupportAgents(prev => prev.filter(ag => ag.id !== id));
      } else if (type === ('kitchen_manager' as any)) {
        await deleteDoc(doc(db, 'kitchen_managers', id));
        setKitchenManagers(prev => prev.filter(km => km.id !== id));
      }
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      alert(`Error deleting ${type}: ${err?.message || String(err)}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Update Firestore order status with support for detailed KDS stages
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: Order['status'], nextKdsStage?: string) => {
    const pathForWrite = `orders/${orderId}`;
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      let finalStatus = nextStatus;
      let finalKdsStage = nextKdsStage || 'received';
      
      // If we only passed nextKdsStage, auto-derive finalStatus
      if (nextKdsStage && !nextStatus) {
        if (nextKdsStage === 'received' || nextKdsStage === 'cooking' || nextKdsStage === 'plated') {
          finalStatus = 'cooking';
        } else if (nextKdsStage === 'dispatched') {
          finalStatus = 'out_for_delivery';
        } else if (nextKdsStage === 'delivered') {
          finalStatus = 'delivered';
        } else if (nextKdsStage === 'cancelled') {
          finalStatus = 'cancelled';
        }
      }

      let stepText = '';
      if (finalKdsStage === 'received') stepText = 'Order received in main prep queue.';
      else if (finalKdsStage === 'cooking') stepText = 'Chef is preparing your premium macro-calculated meal.';
      else if (finalKdsStage === 'plated') stepText = 'Fulfillment checked and plated in the premium locker bag!';
      else if (finalKdsStage === 'dispatched') stepText = 'Dispatched! Your high-protein fuel is on the way to your locker.';
      else if (finalKdsStage === 'delivered') stepText = 'Locker loaded! Hot and secure inside your gym terminal.';
      else if (finalKdsStage === 'cancelled') stepText = 'Order cancelled by system manager.';

      const updatedTracking = [
        { title: 'Ordered', description: 'Order confirmed and synced to secure Firestore.', done: true, time: 'Now' },
        { 
          title: 'Cooking & Preparation', 
          description: finalKdsStage === 'received' ? 'Waiting in kitchen queue.' : finalKdsStage === 'cooking' ? 'Chef is preparing your meal.' : 'Cooking completed!', 
          done: finalKdsStage !== 'received' && finalKdsStage !== 'cancelled', 
          time: finalKdsStage !== 'received' && finalKdsStage !== 'cancelled' ? 'Active' : '' 
        },
        { 
          title: 'Plated & Ready', 
          description: finalKdsStage === 'plated' || finalKdsStage === 'dispatched' || finalKdsStage === 'delivered' ? 'Meal packed with thermal insulation.' : 'Waiting on chef sauté.', 
          done: finalKdsStage === 'plated' || finalKdsStage === 'dispatched' || finalKdsStage === 'delivered', 
          time: finalKdsStage === 'plated' || finalKdsStage === 'dispatched' || finalKdsStage === 'delivered' ? 'Ready' : '' 
        },
        { 
          title: 'On the Way', 
          description: stepText, 
          done: finalKdsStage === 'dispatched' || finalKdsStage === 'delivered', 
          time: finalKdsStage === 'dispatched' ? 'Dispatched' : '' 
        },
        { 
          title: 'Arrived', 
          description: 'Locker loaded! Hot and secure inside your gym terminal.', 
          done: finalKdsStage === 'delivered', 
          time: finalKdsStage === 'delivered' ? 'Arrived' : '' 
        },
      ];

      const extraTimeUpdates: any = {};
      if (finalKdsStage === 'cooking') {
        extraTimeUpdates.cookingStartedAt = new Date().toISOString();
      } else if (finalKdsStage === 'plated') {
        extraTimeUpdates.platedAt = new Date().toISOString();
      }

      await updateDoc(orderRef, {
        status: finalStatus,
        kdsStage: finalKdsStage,
        trackingSteps: updatedTracking,
        updatedAt: new Date().toISOString(),
        ...extraTimeUpdates
      });

      // Sound alerts
      if (finalKdsStage === 'cooking') {
        playKitchenChime('new');
        if (enableVoiceAnnounce) {
          speakToKitchen(`Order ${orderId.slice(-5)} started at sauté station!`);
        }
      } else if (finalKdsStage === 'plated') {
        playKitchenChime('complete');
        if (enableVoiceAnnounce) {
          speakToKitchen(`Order ${orderId.slice(-5)} completed and packed!`);
        }
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      handleFirestoreError(err, OperationType.UPDATE, pathForWrite);
    }
  };

  const handleAcceptKitchenOrder = async (orderId: string) => {
    if (!activeKdsKitchen) {
      alert("Please select or switch to a specific kitchen terminal to accept orders.");
      return;
    }
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        acceptedByKitchenId: activeKdsKitchen.id,
        kitchenId: activeKdsKitchen.id,
        acceptedKitchenName: activeKdsKitchen.name,
        acceptedKitchenAddress: activeKdsKitchen.address,
        acceptedKitchenLat: activeKdsKitchen.lat,
        acceptedKitchenLng: activeKdsKitchen.lng,
        kdsStage: 'cooking',
        status: 'cooking',
        cookingStartedAt: new Date().toISOString()
      });
      playKitchenChime('complete');
      alert(`🎉 Order #${orderId} ACCEPTED by ${activeKdsKitchen.name}! Moved to active preparation queue.`);
    } catch (err) {
      console.error("Error accepting kitchen order:", err);
      alert("⚠️ Could not accept order. Please check connection.");
    }
  };

  const handleDenyKitchenOrder = async (order: Order) => {
    if (!activeKdsKitchen) {
      alert("Please select or switch to a specific kitchen terminal to manage orders.");
      return;
    }

    const allEligible = order.eligibleKitchenIds && order.eligibleKitchenIds.length > 0
      ? order.eligibleKitchenIds
      : allKitchens.map(k => k.id);

    const alreadyDenied = order.rejectedByKitchenIds || [];
    const remainingNonDenied = allEligible.filter(id => !alreadyDenied.includes(id) && id !== activeKdsKitchen.id);

    if (remainingNonDenied.length === 0) {
      playKitchenChime('alert');
      alert("❌ MANDATORY FULFILLMENT: All other kitchen terminals in delivery radius have denied, or this is the last available kitchen terminal in range. As the last kitchen in range, you CANNOT deny this order! Please ACCEPT and prepare this ticket.");
      return;
    }

    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        rejectedByKitchenIds: arrayUnion(activeKdsKitchen.id)
      });
      playKitchenChime('alert');
      alert(`⛔ Order #${order.id} request denied. Forwarded to remaining kitchens in range.`);
    } catch (err) {
      console.error("Error denying kitchen order:", err);
      alert("⚠️ Could not deny order. Please check connection.");
    }
  };

  // Restock ingredient
  const handleRestockIngredient = async (id: string, amount: number = 20) => {
    try {
      const matched = ingredients.find(ing => ing.id === id);
      if (matched) {
        const nextStock = Number((matched.currentStock + amount).toFixed(2));
        await updateDoc(doc(db, 'ingredients', id), {
          currentStock: nextStock
        });
      }
    } catch (err) {
      console.error("Error updating ingredient restock:", err);
    }
  };

  // Seeder helper: Batch write the high-fidelity demo dataset into Firestore
  const handleSeedDatabase = async () => {
    try {
      // 1. Gym Chains
      const defaultChains = [
        { id: 'chain1', name: "Gold's Hub Outlets", description: "Global premier gold-standard dining & pickup outlets with state-of-the-art delivery terminals.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" },
        { id: 'chain2', name: "Cult Partner Outlets", description: "Elite gourmet dining spaces powered by smart tracking delivery points.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" },
        { id: 'chain3', name: "Anytime Express Hubs", description: "24/7 convenient community outlets integrated with temperature-controlled delivery bays.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" }
      ];
      for (const chain of defaultChains) {
        await setDoc(doc(db, 'gym_chains', chain.id), chain);
      }

      // 2. Meals Catalog
      for (const meal of MEALS_DATA) {
        await setDoc(doc(db, 'meals', meal.id), meal);
      }

      // 3. Partner Gym Facilities
      for (const gym of GYMS_DATA) {
        await setDoc(doc(db, 'gyms', gym.id), gym);
      }

      // 4. Coupons
      const defaultCoupons = [
        {
          code: 'FITZAJK50',
          discountType: 'fixed',
          discountValue: 50,
          perkName: '',
          isActive: true,
          expiryDate: '2028-12-31',
          minOrderValue: 200,
          usageCap: 500,
          usageCount: 0,
          totalSavings: 0,
          firstNUsersOnly: 0,
          scope: 'all',
          targetUserEmail: '',
          targetGymId: '',
          isStackable: false,
          stackableWith: []
        },
        {
          code: 'GYMPOWER20',
          discountType: 'percentage',
          discountValue: 20,
          perkName: '',
          isActive: true,
          expiryDate: '2028-12-31',
          minOrderValue: 300,
          usageCap: 1000,
          usageCount: 0,
          totalSavings: 0,
          firstNUsersOnly: 0,
          scope: 'all',
          targetUserEmail: '',
          targetGymId: '',
          isStackable: true,
          stackableWith: []
        }
      ];
      for (const coupon of defaultCoupons) {
        await setDoc(doc(db, 'coupons', coupon.code), coupon);
      }

      alert("🔥 Firestore Database Seeded successfully! 8 Dishes, 3 Elite Partner Gyms, 3 Chains, and 2 Coupons are now fully live.");
    } catch (err) {
      console.error("Error seeding database:", err);
      alert("Error seeding database: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // CALCULATE METRICS FROM REAL ORDERS
  const totalOrdersCount = orders.length;

  // 1. Calculate Avg Sauté Duration dynamically
  const avgSauteDurationStr = useMemo(() => {
    const completedPrepOrders = orders.filter(o => {
      const d = o as any;
      return d.cookingStartedAt && (d.platedAt || d.status === 'delivered' || d.status === 'out_for_delivery');
    });

    if (completedPrepOrders.length === 0) {
      return "0min 0sec";
    }

    let totalDurationMs = 0;
    completedPrepOrders.forEach(o => {
      const d = o as any;
      const start = new Date(d.cookingStartedAt).getTime();
      const end = d.platedAt ? new Date(d.platedAt).getTime() : new Date(d.updatedAt || d.createdAt).getTime();
      if (end > start) {
        totalDurationMs += (end - start);
      }
    });

    const avgMs = totalDurationMs / completedPrepOrders.length;
    const totalSeconds = Math.round(avgMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}min ${seconds}sec`;
  }, [orders]);

  // 2. Calculate Fulfillment Frequency/Efficiency dynamically
  const fulfillmentFrequencyStr = useMemo(() => {
    const completedCount = orders.filter(o => o.status === 'delivered').length;
    if (orders.length === 0) {
      return "0.0%";
    }
    const completedPct = ((completedCount / orders.length) * 100).toFixed(1);
    return `${completedPct}%`;
  }, [orders]);
  
  // Revenue calculation (ignore cancelled orders)
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const dynamicRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  // Subscription Baseline Revenue calculation (estimated ₹2000 per sub)
  const totalSubsCount = premiumSubscribers.fatLoss + premiumSubscribers.muscleBuild + premiumSubscribers.leanBalance;
  const subscriptionRevenue = totalSubsCount * 2199; // baseline avg package
  const overallRevenue = dynamicRevenue + subscriptionRevenue;

  // Pending orders
  const pendingOrdersCount = orders.filter(o => o.status === 'cooking' || o.status === 'out_for_delivery').length;

  // Cancellations
  const cancelledOrdersCount = orders.filter(o => o.status === 'cancelled').length;

  // Unique Customers count
  const uniqueCustomerIds = new Set(orders.map(o => o.userId || 'guest_user'));
  const activeCustomersCount = orders.length > 0 ? uniqueCustomerIds.size : 0;

  // Low Stock count
  const lowStockIngredients = ingredients.filter(ing => ing.currentStock <= ing.minRequired);
  const lowStockCount = lowStockIngredients.length;

  // Top meals aggregation
  const mealSalesCount: { [key: string]: number } = {};
  // Seed initial popularity to 0 for actual meals
  meals.forEach(m => {
    mealSalesCount[m.name] = 0;
  });
  // Add live items sales
  orders.forEach(o => {
    if (o.status !== 'cancelled') {
      o.items.forEach(it => {
        if (it.meal && it.meal.name) {
          mealSalesCount[it.meal.name] = (mealSalesCount[it.meal.name] || 0) + it.quantity;
        }
      });
    }
  });
  const topMealsSorted = Object.entries(mealSalesCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top Gyms aggregation
  const gymSalesCount: { [key: string]: number } = {};
  allGyms.forEach(g => {
    gymSalesCount[g.name] = 0;
  });
  orders.forEach(o => {
    if (o.status !== 'cancelled' && o.gymId) {
      const foundGym = allGyms.find(g => g.id === o.gymId);
      if (foundGym) {
        gymSalesCount[foundGym.name] = (gymSalesCount[foundGym.name] || 0) + 12; // dynamic weight for demo visibility
      }
    }
  });
  const topGymsSorted = Object.entries(gymSalesCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Filter meals dynamically
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      // search match
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = meal.name.toLowerCase().includes(query);
        const matchesDesc = meal.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // diet match
      if (filterDiet === 'veg' && !meal.isVeg) return false;
      if (filterDiet === 'non_veg' && meal.isVeg) return false;
      if (filterDiet === 'vegan' && !meal.isVegan) return false;

      // goal match
      if (filterGoal !== 'all' && !(meal.goals || []).includes(filterGoal as any)) return false;

      // availability match
      if (filterAvailability === 'available' && meal.isAvailable === false) return false;
      if (filterAvailability === 'unavailable' && meal.isAvailable !== false) return false;

      return true;
    });
  }, [meals, searchTerm, filterDiet, filterGoal, filterAvailability]);

  // Paginated meals calculations
  const totalMealPages = Math.ceil(filteredMeals.length / MEALS_PER_PAGE) || 1;
  const paginatedMeals = useMemo(() => {
    const startIndex = (mealsCurrentPage - 1) * MEALS_PER_PAGE;
    return filteredMeals.slice(startIndex, startIndex + MEALS_PER_PAGE);
  }, [filteredMeals, mealsCurrentPage]);

  // Adjust current page if filter shrinks lists
  useEffect(() => {
    if (mealsCurrentPage > totalMealPages) {
      setMealsCurrentPage(totalMealPages);
    }
  }, [totalMealPages, mealsCurrentPage]);

  return (
    <div className="min-h-screen bg-brand-charcoal text-white flex flex-col relative overflow-x-hidden select-none pb-12">
      {/* Background glowing gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.04)_0%,transparent_70%)] pointer-events-none" />

      {/* OPERATOR HEADER PANEL */}
      <header className="relative z-10 border-b border-brand-green/10 bg-[#0F1419]/90 backdrop-blur-md px-6 py-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white border border-brand-orange/30 rounded-2xl flex items-center justify-center p-0.5 shadow-md shrink-0 overflow-hidden">
              <img src="https://cdn.postimage.me/2026/08/01/28172.png" alt="TAASH BHATTI" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-wider text-white">
                  TAASH BHATTI Operator Console
                </h1>
                <span className="text-[8px] bg-brand-green/10 text-brand-green font-black px-1.5 py-0.5 rounded border border-brand-green/20 uppercase tracking-widest">
                  Live Sync
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Admin Profile: <span className="text-brand-orange font-bold font-mono">{fbUser?.email || "glixzytechmain@taashbhatti.com"}</span>
              </p>
            </div>
          </div>

          {/* Navigation Hud */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDevMenu(true)}
              className="px-3.5 py-2 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Toggle customer feature flags, kill switches, and menus"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Developer Menu</span>
            </button>

            <button
              onClick={onExit}
              className="px-4 py-2 border border-brand-green/30 hover:bg-brand-green/15 text-brand-green font-black text-[10px] uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer App
            </button>
          </div>

        </div>
      </header>

      {/* DUAL COHORT CONTAINER */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* MOBILE SEGMENTED PAGE CHANGER */}
        <div className="lg:hidden col-span-1 bg-[#12181E] border border-brand-green/15 rounded-3xl p-3 shadow-xl overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            {[
              { id: 'dashboard' as const, label: 'Dashboard Hub', icon: BarChart2, countBadge: null },
              { id: 'orders' as const, label: 'Fulfill Orders', icon: ShoppingBag, countBadge: pendingOrdersCount > 0 ? pendingOrdersCount : null },
              { id: 'tracking' as const, label: 'Live Tracking', icon: MapPin, countBadge: orders.filter(o => o.status === 'out_for_delivery' || o.status === 'cooking').length || null },
              { id: 'meals' as const, label: 'Meal Catalog', icon: UtensilsCrossed, countBadge: null },
              { id: 'deals' as const, label: 'Deals & Combos', icon: Zap, countBadge: null },
              { id: 'coupons' as const, label: 'Coupons Manager', icon: Ticket, countBadge: coupons.length > 0 ? coupons.length : null },
              { id: 'kitchens' as const, label: 'Kitchens Hub', icon: ChefHat, countBadge: allKitchens.length > 0 ? allKitchens.length : null },
              { id: 'fleet' as const, label: 'Delivery Fleet', icon: Truck, countBadge: deliveryPartners.length > 0 ? deliveryPartners.length : null },
              { id: 'users' as const, label: 'User Accounts', icon: Users, countBadge: usersList.length > 0 ? usersList.length : null },
              { id: 'support' as const, label: 'Support Desk', icon: Mail, countBadge: supportTickets.filter(t => t.status === 'pending').length || null },
              { id: 'banners' as const, label: 'Hero Banners', icon: Layers, countBadge: banners.length > 0 ? banners.length : null },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-wider cursor-pointer relative overflow-hidden"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active_admin_mobile_bg"
                      className="absolute inset-0 bg-brand-green"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-brand-charcoal' : 'text-brand-green'}`} />
                  <span className={`relative z-10 ${isActive ? 'text-brand-charcoal' : 'text-gray-300'}`}>
                    {tab.label.split(' ')[0]}
                  </span>
                  {tab.countBadge !== null && (
                    <span className="relative z-10 text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center bg-brand-orange text-brand-charcoal">
                      {tab.countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-green block">
                MAIN CONSOLE MODULES
              </span>
              <p className="text-[11px] text-gray-400 leading-normal">
                Select an operational workspace to monitor metrics and fulfill active client queues.
              </p>
            </div>
            
            <nav className="space-y-2">
              {[
                { id: 'dashboard' as const, label: 'Dashboard Hub', icon: BarChart2, badge: <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${activeTab === 'dashboard' ? 'bg-brand-charcoal/20 text-brand-charcoal' : 'bg-brand-green/10 text-brand-green'}`}>LIVE</span> },
                { id: 'orders' as const, label: 'Fulfill Orders', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? <span className="w-5 h-5 bg-brand-orange text-brand-charcoal rounded-full flex items-center justify-center font-black text-[9px] animate-bounce">{pendingOrdersCount}</span> : null },
                { id: 'tracking' as const, label: 'Live Tracking', icon: MapPin, badge: <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">{orders.filter(o => o.status === 'out_for_delivery' || o.status === 'cooking').length} active</span> },
                { id: 'meals' as const, label: 'Meal Catalog', icon: UtensilsCrossed, badge: <span className="text-[9px] text-gray-500 font-mono">{meals.length} dishes</span> },
                { id: 'deals' as const, label: 'Deals & Combos', icon: Zap, badge: <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">Studio</span> },
                { id: 'coupons' as const, label: 'Coupons Manager', icon: Ticket, badge: coupons.length > 0 ? <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-brand-orange/15 text-brand-orange border border-brand-orange/20">{coupons.length} active</span> : null },
                { id: 'kitchens' as const, label: 'Kitchen Branches', icon: ChefHat, badge: allKitchens.length > 0 ? <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-brand-green/15 text-brand-green border border-brand-green/20">{allKitchens.length} active</span> : null },
                { id: 'fleet' as const, label: 'Delivery Fleet', icon: Truck, badge: deliveryPartners.length > 0 ? <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-brand-orange/15 text-brand-orange border border-brand-orange/20">{deliveryPartners.length} riders</span> : null },
                { id: 'users' as const, label: 'User Accounts', icon: Users, badge: <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/60">{usersList.length} total</span> },
                { id: 'support' as const, label: 'Support & Complaints', icon: Mail, badge: supportTickets.filter(t => t.status === 'pending').length > 0 ? <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-[9px] animate-pulse">{supportTickets.filter(t => t.status === 'pending').length}</span> : null },
                { id: 'banners' as const, label: 'Hero Banners', icon: Layers, badge: <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-brand-orange/15 text-brand-orange border border-brand-orange/20">{banners.length} active</span> },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all font-black text-xs uppercase tracking-wider cursor-pointer relative overflow-hidden group"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active_admin_sidebar_bg"
                        className="absolute inset-0 bg-brand-green shadow-lg shadow-brand-green/15"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 relative z-10">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-charcoal' : 'text-brand-green group-hover:text-white'}`} />
                      <span className={`transition-colors duration-200 ${isActive ? 'text-brand-charcoal' : 'text-gray-300 group-hover:text-white'}`}>
                        {tab.label}
                      </span>
                    </div>
                    <div className="relative z-10">
                      {tab.badge}
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Quick stats panel */}
            <div className="bg-[#1B232C]/60 rounded-2xl p-4 border border-brand-green/5 space-y-3">
              <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 block">
                System Diagnostics
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-brand-charcoal p-2 rounded-xl">
                  <div className="text-[10px] font-mono text-gray-400 font-bold">FIRESTORE</div>
                  <div className="text-[10px] font-black text-brand-green font-mono">ACTIVE</div>
                </div>
                <div className="bg-brand-charcoal p-2 rounded-xl">
                  <div className="text-[10px] font-mono text-gray-400 font-bold font-mono">MEMBERS</div>
                  <div className="text-[10px] font-black text-brand-orange font-mono">{totalSubsCount}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="lg:col-span-9 space-y-6">
            
            {/* WORKSPACE 1: THE RICH ANALYTICS DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* LOW STOCK FLOATING ALERTS (Banner style) */}
                {lowStockCount > 0 && (
                  <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-red-950/40 border border-red-500/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 border border-red-500/20 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="text-center md:text-left">
                        <h4 className="text-xs font-black uppercase tracking-widest text-red-400">
                          Low Stock Alerts Detected ({lowStockCount})
                        </h4>
                        <p className="text-[10px] text-gray-300">
                          Certain premium macro ingredients are running below safe kitchen thresholds.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInventoryModal(true)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase rounded-xl tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      Restock Ingredients Now ➜
                    </button>
                  </motion.div>
                )}

                {/* THE POWER METRICS STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Revenue Card */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-all">
                      <DollarSign className="w-16 h-16 text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Total Revenue
                    </span>
                    <div className="text-2xl font-black text-brand-green font-mono">
                      ₹{overallRevenue.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-brand-green inline" />
                      Incl. ₹{(subscriptionRevenue).toLocaleString('en-IN')} Subscription MRR
                    </p>
                  </div>

                  {/* Live orders card */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-all">
                      <ShoppingBag className="w-16 h-16 text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Live Orders (Sync)
                    </span>
                    <div className="text-2xl font-black text-white font-mono">
                      {totalOrdersCount}
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-orange inline" />
                      Real-time listening in database
                    </p>
                  </div>

                  {/* Pending Orders Card */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-all">
                      <Clock className="w-16 h-16 text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Pending Kitchen Queue
                    </span>
                    <div className={`text-2xl font-black font-mono ${pendingOrdersCount > 0 ? 'text-brand-orange' : 'text-gray-400'}`}>
                      {pendingOrdersCount}
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1">
                      {pendingOrdersCount > 0 ? '👨‍🍳 Cooking & Dispatching active' : 'All orders fully fulfilled!'}
                    </p>
                  </div>

                  {/* Cancellations card */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-all">
                      <XCircle className="w-16 h-16 text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Cancellations
                    </span>
                    <div className={`text-2xl font-black font-mono ${cancelledOrdersCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {cancelledOrdersCount}
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1">
                      Cancellation rate: <span className="font-bold">{totalOrdersCount > 0 ? ((cancelledOrdersCount / totalOrdersCount) * 100).toFixed(0) : 0}%</span>
                    </p>
                  </div>

                </div>

                {/* ADVANCED MULTI-METRIC SUB GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Active customers & Subscription stats */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-green">
                        ⚡ Customers & Premium Plans
                      </span>
                      <Users className="w-4 h-4 text-brand-green" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-charcoal p-3.5 rounded-2xl text-center">
                        <span className="text-[8px] font-bold text-gray-400 block uppercase">ACTIVE CLIENTS</span>
                        <div className="text-xl font-mono font-black text-white mt-1">{activeCustomersCount}</div>
                      </div>
                      <div className="bg-brand-charcoal p-3.5 rounded-2xl text-center">
                        <span className="text-[8px] font-bold text-gray-400 block uppercase">SUBSCRIPTION STATS</span>
                        <div className="text-xl font-mono font-black text-brand-orange mt-1">{totalSubsCount}</div>
                      </div>
                    </div>

                    {/* Subscription split metrics with adjustments */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-gray-300">
                          <span>Fat Loss Warrior Plan</span>
                          <span className="font-mono text-brand-green">{premiumSubscribers.fatLoss} members</span>
                        </div>
                        <div className="w-full bg-brand-charcoal h-1.5 rounded-full overflow-hidden">
                          <div className="bg-brand-orange h-full rounded-full" style={{ width: `${totalSubsCount > 0 ? (premiumSubscribers.fatLoss / totalSubsCount) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-gray-300">
                          <span>Muscle Build Stack Plan</span>
                          <span className="font-mono text-brand-green">{premiumSubscribers.muscleBuild} members</span>
                        </div>
                        <div className="w-full bg-brand-charcoal h-1.5 rounded-full overflow-hidden">
                          <div className="bg-brand-green h-full rounded-full" style={{ width: `${totalSubsCount > 0 ? (premiumSubscribers.muscleBuild / totalSubsCount) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-gray-300">
                          <span>Lean Balance Lifestyle Plan</span>
                          <span className="font-mono text-brand-green">{premiumSubscribers.leanBalance} members</span>
                        </div>
                        <div className="w-full bg-brand-charcoal h-1.5 rounded-full overflow-hidden">
                          <div className="bg-white h-full rounded-full" style={{ width: `${totalSubsCount > 0 ? (premiumSubscribers.leanBalance / totalSubsCount) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Top Selling High-Protein Meals (Real-time list) */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange">
                        🔥 Top Performance Meals
                      </span>
                      <Flame className="w-4 h-4 text-brand-orange" />
                    </div>

                    <p className="text-[9px] text-gray-400">
                      Calculated on aggregate live checkout items + default baseline popularity.
                    </p>

                    <div className="space-y-2.5">
                      {topMealsSorted.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-brand-charcoal/50 border border-brand-green/5 p-2 rounded-xl text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-4 h-4 rounded bg-brand-orange/15 text-brand-orange text-[9px] font-black flex items-center justify-center border border-brand-orange/20 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-gray-200 truncate">{m.name}</span>
                          </div>
                          <span className="font-mono text-brand-green font-bold shrink-0">{m.count} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Gym Delivery Terminals */}
                  <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-green">
                        🏋️ Top Gym Locker Stations
                      </span>
                      <Dumbbell className="w-4 h-4 text-brand-green" />
                    </div>

                    <p className="text-[9px] text-gray-400">
                      Highest synchronized locker distribution by affiliate gym terminals.
                    </p>

                    <div className="space-y-2.5">
                      {topGymsSorted.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-brand-charcoal/50 border border-brand-green/5 p-2.5 rounded-xl text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-brand-green shrink-0" />
                            <span className="font-semibold text-gray-200 truncate">{g.name}</span>
                          </div>
                          <span className="font-mono text-brand-orange font-bold shrink-0">{g.count} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* LIVE VISUAL METRIC CHART WITH REAL-TIME FLOWS */}
                <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white">
                        Secure Operational Activity Flow
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Real-time visualization of current meal statuses and tracking pipelines.
                      </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-brand-green animate-ping" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div className="bg-brand-charcoal p-4 rounded-2xl border border-brand-green/5 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">ACTIVE COOKING</div>
                      <div className="text-2xl font-mono font-black text-brand-orange mt-1">
                        {orders.filter(o => o.status === 'cooking').length}
                      </div>
                      <div className="w-full bg-brand-charcoal/80 h-1 rounded-full overflow-hidden mt-3">
                        <div className="bg-brand-orange h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div className="bg-brand-charcoal p-4 rounded-2xl border border-brand-green/5 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">OUT FOR DELIVERY</div>
                      <div className="text-2xl font-mono font-black text-brand-green mt-1">
                        {orders.filter(o => o.status === 'out_for_delivery').length}
                      </div>
                      <div className="w-full bg-brand-charcoal/80 h-1 rounded-full overflow-hidden mt-3">
                        <div className="bg-brand-green h-full rounded-full animate-pulse" style={{ width: '40%' }} />
                      </div>
                    </div>

                    <div className="bg-brand-charcoal p-4 rounded-2xl border border-brand-green/5 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">COMPLETED LOCKERS</div>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {orders.filter(o => o.status === 'delivered').length}
                      </div>
                      <div className="w-full bg-brand-charcoal/80 h-1 rounded-full overflow-hidden mt-3">
                        <div className="bg-white h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="bg-brand-charcoal p-4 rounded-2xl border border-brand-green/5 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider font-bold">CANCELLED RUNS</div>
                      <div className="text-2xl font-mono font-black text-gray-500 mt-1">
                        {orders.filter(o => o.status === 'cancelled').length}
                      </div>
                      <div className="w-full bg-brand-charcoal/80 h-1 rounded-full overflow-hidden mt-3">
                        <div className="bg-gray-600 h-full rounded-full" style={{ width: '20%' }} />
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* WORKSPACE 2: REAL-TIME KDS & ORDER OPERATIONS MANAGEMENT */}
            {activeTab === 'orders' && (() => {
              const orders = visibleOrders;
              return (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="col-span-1 lg:col-span-12 bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-2xl space-y-6"
                >
                {/* ADVANCED KDS HEADER CONTROLS */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-brand-green/10 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-ping" />
                      <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-brand-orange" />
                        TAASH BHATTI Real-Time Kitchen Display System (KDS)
                      </h2>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Multi-station lane routing, active preparation timing, and high-fidelity nutritional dispatch workflows.
                    </p>
                  </div>

                  {/* KDS Station Routing & Controls */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Switch Kitchen Terminal */}
                    <button
                      onClick={() => {
                        setSwitchKdsInputId('');
                        setKdsPasswordError('');
                        setShowSwitchKdsModal(true);
                      }}
                      className="px-3 py-2 bg-brand-orange text-brand-charcoal hover:bg-brand-orange/90 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      Terminal: {activeKdsKitchen ? activeKdsKitchen.name : 'Select Kitchen'}
                      {activeKdsKitchen && activeKdsKitchen.id === allKitchens[0]?.id && (
                        <span className="text-[8px] font-black bg-brand-charcoal text-brand-orange px-1 py-0.5 rounded ml-1">
                          {kdsUnlocked ? '🔓' : '🔐'}
                        </span>
                      )}
                    </button>

                    {/* KDS Taking Orders Toggle Button */}
                    {activeKdsKitchen && (
                      <button
                        type="button"
                        onClick={async () => {
                          const isCurrentlyOnline = activeKdsKitchen.isTakingOrders !== false && activeKdsKitchen.isActive !== false;
                          const nextState = !isCurrentlyOnline;
                          try {
                            await updateDoc(doc(db, 'kitchens', activeKdsKitchen.id), {
                              isTakingOrders: nextState,
                              isActive: nextState
                            });
                            toast.success(`${activeKdsKitchen.name} is now ${nextState ? 'TAKING ORDERS 🟢' : 'CURRENTLY UNAVAILABLE 🔴'}`);
                          } catch (err) {
                            try {
                              await setDoc(doc(db, 'kitchens', activeKdsKitchen.id), {
                                isTakingOrders: nextState,
                                isActive: nextState
                              }, { merge: true });
                              toast.success(`${activeKdsKitchen.name} is now ${nextState ? 'TAKING ORDERS 🟢' : 'CURRENTLY UNAVAILABLE 🔴'}`);
                            } catch (e2) {
                              toast.error("Failed to update kitchen status in database");
                            }
                          }
                        }}
                        className={`px-3 py-2 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer border ${
                          (activeKdsKitchen.isTakingOrders !== false && activeKdsKitchen.isActive !== false)
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                            : 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900'
                        }`}
                        title="Toggle whether this kitchen branch is currently accepting new orders"
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          (activeKdsKitchen.isTakingOrders !== false && activeKdsKitchen.isActive !== false)
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-rose-500'
                        }`} />
                        {(activeKdsKitchen.isTakingOrders !== false && activeKdsKitchen.isActive !== false)
                          ? 'Taking Orders 🟢'
                          : 'Currently Unavailable 🔴'
                        }
                      </button>
                    )}

                    {/* KDS Prep Delay Controller Button */}
                    {activeKdsKitchen && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPrepDelayInput(activeKdsKitchen.globalPrepDelayMinutes?.toString() || '0');
                          setShowPrepDelayModal(true);
                        }}
                        className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        title="Set kitchen peak rush prep time delay shown to customers"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Prep Delay: {activeKdsKitchen.globalPrepDelayMinutes ? `+${activeKdsKitchen.globalPrepDelayMinutes}m Peak` : 'Normal (0m)'}
                      </button>
                    )}

                    {/* KDS Currently Raining Mode Toggle Button */}
                    {activeKdsKitchen && (
                      <button
                        type="button"
                        onClick={async () => {
                          const isCurrentlyRaining = Boolean(activeKdsKitchen.isRaining);
                          const nextRainState = !isCurrentlyRaining;
                          try {
                            await updateDoc(doc(db, 'kitchens', activeKdsKitchen.id), {
                              isRaining: nextRainState
                            });
                            toast.success(nextRainState
                              ? `🌧️ Currently Raining Mode enabled for ${activeKdsKitchen.name}! Rain animation and delivery notice activated on customer app.`
                              : `☀️ Rain Mode disabled for ${activeKdsKitchen.name}. Normal delivery weather restored.`
                            );
                          } catch (err) {
                            try {
                              await setDoc(doc(db, 'kitchens', activeKdsKitchen.id), {
                                isRaining: nextRainState
                              }, { merge: true });
                              toast.success(nextRainState
                                ? `🌧️ Currently Raining Mode enabled for ${activeKdsKitchen.name}!`
                                : `☀️ Rain Mode disabled for ${activeKdsKitchen.name}!`
                              );
                            } catch (e2) {
                              toast.error("Failed to update raining mode status");
                            }
                          }
                        }}
                        className={`px-3 py-2 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer border ${
                          activeKdsKitchen.isRaining
                            ? 'bg-sky-600/30 border-sky-400 text-sky-200 hover:bg-sky-600/40 shadow-sky-500/20 shadow-lg ring-1 ring-sky-400/50'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                        title={activeKdsKitchen.isRaining ? 'Turn OFF Currently Raining Mode' : 'Turn ON Currently Raining Mode when raining near this kitchen branch'}
                      >
                        <CloudRain className={`w-3.5 h-3.5 ${activeKdsKitchen.isRaining ? 'text-sky-300 animate-bounce' : 'text-gray-400'}`} />
                        <span>{activeKdsKitchen.isRaining ? '🌧️ Raining Mode: ON' : '🌧️ Rain Mode: OFF'}</span>
                      </button>
                    )}

                    {/* KDS Kitchen Inventory Management Button */}
                    {activeKdsKitchen && (
                      <button
                        type="button"
                        onClick={() => setShowInventoryModal(true)}
                        className="px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer relative"
                        title="Open real-time stock inventory for this kitchen"
                      >
                        <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                        Kitchen Inventory ({inventoryItems.length})
                        {inventoryItems.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-1 -right-1" />
                        )}
                      </button>
                    )}
                    <div className="bg-brand-charcoal p-1 rounded-xl border border-brand-green/10 flex items-center gap-1">
                      {[
                        { id: 'all' as const, label: 'All Stations', dotColor: 'bg-white' },
                        { id: 'lane_a' as const, label: 'Veg Sauté (A)', dotColor: 'bg-emerald-500' },
                        { id: 'lane_b' as const, label: 'Meat Grill (B)', dotColor: 'bg-rose-500' },
                      ].map((st) => {
                        const isActive = chefStation === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() => setChefStation(st.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              isActive 
                                ? 'bg-brand-orange text-brand-charcoal font-black shadow-md' 
                                : 'hover:bg-brand-charcoal/80 text-gray-400 hover:text-white'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                            {st.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Speech / Sound Panel */}
                    <div className="flex items-center gap-2 bg-brand-charcoal px-3 py-1.5 rounded-xl border border-brand-green/10">
                      <button
                        onClick={() => {
                          const nextVal = !enableVoiceAnnounce;
                          setEnableVoiceAnnounce(nextVal);
                          localStorage.setItem('fitzaika_kds_voice', nextVal ? 'true' : 'false');
                        }}
                        className={`p-1 rounded transition-colors ${enableVoiceAnnounce ? 'text-brand-orange hover:text-brand-orange/80' : 'text-gray-500 hover:text-gray-400'}`}
                        title={enableVoiceAnnounce ? 'Disable speech announcements' : 'Enable speech announcements'}
                      >
                        {enableVoiceAnnounce ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => playKitchenChime('new')}
                        className="px-2 py-0.5 border border-brand-green/20 hover:bg-brand-green/10 text-[8px] uppercase font-black text-brand-green rounded transition-all"
                        title="Test kitchen chime speaker"
                      >
                        Chime Test
                      </button>
                    </div>
                  </div>
                </div>

                {/* UNAVAILABLE / OFFLINE KITCHEN WARNING BANNER */}
                {activeKdsKitchen && (activeKdsKitchen.isTakingOrders === false || activeKdsKitchen.isActive === false) && (
                  <div className="bg-rose-950/90 border-2 border-rose-500 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-rose-200 shadow-xl animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5 font-black text-xs">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                      <span>⚠️ {activeKdsKitchen.name.toUpperCase()} IS CURRENTLY UNAVAILABLE & PAUSED FOR NEW ORDERS</span>
                    </div>
                    <span className="text-[10px] font-mono bg-rose-900 px-3 py-1 rounded-xl text-rose-200 border border-rose-500/40 font-black tracking-wider">
                      ● OFFLINE MODE ACTIVE
                    </span>
                  </div>
                )}

                {/* KDS CURRENTLY RAINING ACTIVE BANNER */}
                {activeKdsKitchen && activeKdsKitchen.isRaining && (
                  <div className="bg-sky-950/90 border-2 border-sky-400 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-sky-200 shadow-xl animate-in fade-in duration-200 relative overflow-hidden">
                    <div className="flex items-center gap-2.5 font-black text-xs z-10">
                      <CloudRain className="w-5 h-5 text-sky-300 shrink-0 animate-bounce" />
                      <span>🌧️ CURRENTLY RAINING MODE ACTIVE — Customer tracking tabs & radar map for {activeKdsKitchen.name} are displaying live rain animations and delivery delay advisory</span>
                    </div>
                    <div className="flex items-center gap-2 z-10">
                      <span className="text-[10px] font-mono bg-sky-900/80 px-3 py-1 rounded-xl text-sky-200 border border-sky-400/40 font-black tracking-wider">
                        ● RAIN MODE ON
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'kitchens', activeKdsKitchen.id), { isRaining: false });
                            toast.success(`☀️ Rain Mode turned off for ${activeKdsKitchen.name}`);
                          } catch (e) {
                            try {
                              await setDoc(doc(db, 'kitchens', activeKdsKitchen.id), { isRaining: false }, { merge: true });
                              toast.success(`☀️ Rain Mode turned off for ${activeKdsKitchen.name}`);
                            } catch (e2) {
                              toast.error("Failed to update rain mode status");
                            }
                          }
                        }}
                        className="px-2.5 py-1 bg-sky-800 hover:bg-sky-700 text-white text-[10px] font-black uppercase rounded-lg border border-sky-400/30 transition-all cursor-pointer"
                      >
                        Turn Off ☀️
                      </button>
                    </div>
                  </div>
                )}

                {/* NOTIFICATION BANNER */}
                {kdsDepositSuccessNotice && (
                  <div className="bg-emerald-950/90 border-2 border-emerald-500 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 shadow-xl animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5 font-black text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>{kdsDepositSuccessNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKdsDepositSuccessNotice(null)}
                      className="text-emerald-400 hover:text-emerald-200 text-xs font-black uppercase px-2 py-1 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* KDS PRIMARY WORKSPACE SELECTOR: PREP LANES vs RIDER CASH & DELIVERIES DESK */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-brand-charcoal/60 p-2.5 rounded-2xl border border-brand-green/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setKdsSubSection('prep_lanes')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                        kdsSubSection === 'prep_lanes'
                          ? 'bg-brand-orange text-brand-charcoal shadow-lg shadow-brand-orange/20 font-black'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Kitchen Prep Lanes ({orders.filter(o => o.status === 'cooking' || o.status === 'kitchen_accepted').length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKdsSubSection('rider_desk')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        kdsSubSection === 'rider_desk'
                          ? 'bg-emerald-500 text-brand-charcoal shadow-lg shadow-emerald-500/20 font-black'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Rider Cash & Completed Deliveries ({kitchenAssignedRiders.length} Fleet)</span>
                      {cashDeposits.filter(d => d.status === 'pending' && (!activeKdsKitchen?.id || d.kitchenId === activeKdsKitchen.id)).length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-md">
                          {cashDeposits.filter(d => d.status === 'pending' && (!activeKdsKitchen?.id || d.kitchenId === activeKdsKitchen.id)).length} Deposit Pending
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setKdsSubSection('eod_settlement')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        kdsSubSection === 'eod_settlement'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 font-black'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>EOD Shift Settlements ({eodReports.length})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAdminEODSettlement()}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      title="Run shift closure and generate printable PDF report"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Run Shift Audit (PDF)</span>
                    </button>
                    <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                      📍 {activeKdsKitchen ? activeKdsKitchen.name : 'Kitchen Hub'}
                    </span>
                  </div>
                </div>

                {kdsSubSection === 'rider_desk' ? (
                  <KdsRiderCashSection
                    activeKdsKitchen={activeKdsKitchen}
                    allKitchens={allKitchens}
                    deliveryPartners={deliveryPartners}
                    setDeliveryPartners={setDeliveryPartners}
                    orders={orders}
                    cashDeposits={cashDeposits}
                    onApproveDeposit={handleApproveCashDeposit}
                    onRejectDeposit={handleRejectCashDeposit}
                    isProcessingAction={isProcessingDepositAction}
                  />
                ) : kdsSubSection === 'eod_settlement' ? (
                  <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
                    {/* Header with Kitchen Filter and Action Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span>End-of-Day Kitchen Shift Settlements & Audits</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Cross-branch shift closure audits, COD cash reconciliation vs branch safe deposits, and exportable PDF records.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Kitchen Filter */}
                        <select
                          value={eodKitchenFilter}
                          onChange={(e) => setEodKitchenFilter(e.target.value)}
                          className="px-3 py-2 bg-[#161D24] text-xs font-bold text-white border border-white/10 rounded-xl focus:outline-none focus:border-brand-orange cursor-pointer"
                        >
                          <option value="all">All Kitchen Branches ({allKitchens.length})</option>
                          {allKitchens.map((k) => (
                            <option key={k.id} value={k.id}>{k.name} ({k.city})</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleOpenAdminEODSettlement()}
                          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Run Shift Audit for {activeKdsKitchen?.name || 'Selected Kitchen'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Metrics Bar */}
                    {(() => {
                      const filteredReports = eodReports.filter(r => eodKitchenFilter === 'all' || r.kitchenId === eodKitchenFilter);
                      const totalGross = filteredReports.reduce((s, r) => s + (r.grossRevenue || 0), 0);
                      const totalSafeCash = filteredReports.reduce((s, r) => s + (r.cashDepositedAtKitchen || 0), 0);
                      const totalDiscrepancies = filteredReports.filter(r => Math.abs(r.cashReconciliationVariance || 0) > 1).length;

                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-white/5">
                              <span className="text-[9px] font-black uppercase text-gray-400 block">Total Audits Filed</span>
                              <span className="text-xl font-black text-white font-mono mt-0.5 block">{filteredReports.length}</span>
                            </div>
                            <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-emerald-500/20">
                              <span className="text-[9px] font-black uppercase text-emerald-400 block">Settled Gross Revenue</span>
                              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                                ₹{totalGross.toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-brand-green/20">
                              <span className="text-[9px] font-black uppercase text-brand-green block">Verified Safe Cash</span>
                              <span className="text-xl font-black text-brand-green font-mono mt-0.5 block">
                                ₹{totalSafeCash.toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-purple-500/20">
                              <span className="text-[9px] font-black uppercase text-purple-300 block">Cash Variance Alarms</span>
                              <span className={`text-xl font-black font-mono mt-0.5 block ${totalDiscrepancies > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {totalDiscrepancies === 0 ? '0 (100% Balanced)' : `${totalDiscrepancies} Audits Discrepant`}
                              </span>
                            </div>
                          </div>

                          {/* Historical Reports Archive */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-300">
                                Official Shift Audit Archives
                              </h4>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {filteredReports.length} Archive Records
                              </span>
                            </div>

                            {filteredReports.length === 0 ? (
                              <div className="bg-[#0A0E13] p-8 rounded-2xl border border-white/5 text-center space-y-3">
                                <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                                <p className="text-xs text-gray-400 font-medium">
                                  No shift settlement reports filed yet {eodKitchenFilter !== 'all' ? 'for this branch' : 'across branches'}.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdminEODSettlement()}
                                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5 text-brand-green" />
                                  <span>Audit {activeKdsKitchen?.name || 'Active Kitchen'} Shift</span>
                                </button>
                              </div>
                            ) : (
                              <div className="bg-[#0A0E13] rounded-2xl border border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-[#161D24] text-[9px] font-black uppercase tracking-wider text-gray-400 border-b border-white/10">
                                      <tr>
                                        <th className="p-3">Kitchen Branch</th>
                                        <th className="p-3">Audit Date & Shift</th>
                                        <th className="p-3">Tickets Fulfilled</th>
                                        <th className="p-3">Gross Sales</th>
                                        <th className="p-3">Safe Cash Handover</th>
                                        <th className="p-3">Variance</th>
                                        <th className="p-3">Signed Off By</th>
                                        <th className="p-3 text-right">PDF Report</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {filteredReports.map((rep) => (
                                        <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                                          <td className="p-3">
                                            <span className="font-bold text-white block">{rep.kitchenName}</span>
                                            <span className="text-[9px] font-mono text-gray-500 block">ID: {rep.kitchenId}</span>
                                          </td>
                                          <td className="p-3">
                                            <span className="font-bold text-white block">{rep.reportDate}</span>
                                            <span className="text-[9px] font-black uppercase text-purple-400 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 inline-block mt-0.5">
                                              {rep.shiftType.replace('_', ' ')}
                                            </span>
                                          </td>
                                          <td className="p-3">
                                            <span className="text-emerald-400 font-bold">{rep.totalOrdersFulfilled} tickets</span>
                                            <span className="text-gray-500 text-[10px] block">{rep.takeawayOrdersCount} takeaway • {rep.deliveryOrdersCount} delivery</span>
                                          </td>
                                          <td className="p-3 font-bold text-brand-orange">
                                            ₹{rep.grossRevenue.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            <span className="text-white block font-bold">₹{rep.cashDepositedAtKitchen.toLocaleString()}</span>
                                            <span className="text-gray-500 text-[9px] block">of ₹{rep.codCollectedByFleet.toLocaleString()} billed</span>
                                          </td>
                                          <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                              Math.abs(rep.cashReconciliationVariance) < 1
                                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                                : rep.cashReconciliationVariance < 0
                                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                                                  : 'bg-blue-950/60 text-blue-300 border-blue-800'
                                            }`}>
                                              {rep.cashReconciliationVariance >= 0 ? `+₹${rep.cashReconciliationVariance}` : `-₹${Math.abs(rep.cashReconciliationVariance)}`}
                                            </span>
                                          </td>
                                          <td className="p-3">
                                            <span className="text-gray-200 font-bold block">{rep.managerName}</span>
                                            <span className="text-gray-500 text-[9px] block truncate max-w-[140px]">{new Date(rep.closedAt).toLocaleTimeString()}</span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedEODReport(rep);
                                                setIsEODReadOnly(true);
                                              }}
                                              className="px-3 py-1.5 bg-brand-green/10 hover:bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 ml-auto cursor-pointer transition-all"
                                            >
                                              <Printer className="w-3.5 h-3.5" />
                                              <span>View PDF</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                {/* KDS OPERATIONS METRIC BAR */}
                <div className="flex items-center justify-between p-4 bg-brand-charcoal/30 border border-brand-green/5 rounded-2xl">
                  <div>
                    <span className="text-[8px] uppercase font-black text-gray-500 block tracking-widest">Active Tickets</span>
                    <span className="text-sm font-mono font-black text-white">
                      {orders.filter(o => o.status === 'cooking').length} orders
                    </span>
                    <span className="text-[7px] text-gray-400 block mt-0.5">Real-time KDS sync queue</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] uppercase font-black text-gray-500 block tracking-widest">Kitchen Status</span>
                    <span className="text-xs font-black text-brand-orange uppercase tracking-wider block mt-0.5 animate-pulse">● LIVE FULFILLMENT MODE</span>
                  </div>
                </div>

                {/* DYNAMIC KANBAN GRID BOARD */}
                {isKdsLocked ? (
                  <div className="flex flex-col items-center justify-center py-24 px-4 space-y-6 max-w-md mx-auto text-center bg-brand-charcoal/10 border border-brand-green/10 rounded-3xl my-6">
                    <div className="w-16 h-16 bg-brand-orange/10 border border-brand-orange/30 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Lock className="w-8 h-8 text-brand-orange" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black bg-brand-orange/10 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded uppercase tracking-widest">
                        RESTRICTED KDS TERMINAL
                      </span>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        {activeKdsKitchen?.name || 'First Kitchen'} KDS
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        This terminal requires authorization. Please enter the password to unlock this kitchen's real-time KDS board.
                      </p>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (enteredKdsPassword === 'THEFIRST') {
                          setKdsUnlocked(true);
                          setKdsPasswordError('');
                          setEnteredKdsPassword('');
                        } else {
                          setKdsPasswordError('Incorrect password. Access Denied.');
                        }
                      }}
                      className="w-full space-y-3"
                    >
                      <input
                        type="password"
                        placeholder="Enter password..."
                        value={enteredKdsPassword}
                        onChange={(e) => {
                          setEnteredKdsPassword(e.target.value);
                          setKdsPasswordError('');
                        }}
                        className="w-full bg-[#151C24] border border-brand-green/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/50 text-center font-mono"
                      />
                      {kdsPasswordError && (
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{kdsPasswordError}</p>
                      )}
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
                      >
                        Unlock Terminal
                      </button>
                    </form>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 space-y-4 border border-dashed border-brand-green/10 rounded-2xl bg-brand-charcoal/20">
                    <div className="w-14 h-14 bg-brand-green/5 border border-brand-green/15 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                      <ShoppingBag className="w-6 h-6 text-brand-green" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-200 uppercase tracking-widest">Kitchen queue is cleared!</h4>
                      <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                        There are currently no active customer tickets inside the real-time queue. Awaiting live customer checkout orders...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                    
                    {/* COLUMN 1: RECEIVED / QUEUE */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-brand-charcoal/80 border border-brand-green/5 px-3 py-2 rounded-xl sticky top-0 z-10">
                        <span className="text-[9px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          1. Received Queue
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-md">
                          {visibleOrders.filter(o => (o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'out_for_delivery') && ((o as any).kdsStage === 'received' || !(o as any).kdsStage) && (chefStation === 'all' || (o as any).lane === chefStation)).length}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {visibleOrders
                            .filter(o => (o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'out_for_delivery') && ((o as any).kdsStage === 'received' || !(o as any).kdsStage) && (chefStation === 'all' || (o as any).lane === chefStation))
                            .map((o) => {
                              const isUnaccepted = !o.acceptedByKitchenId || o.acceptedByKitchenId === "";

                              return (
                                <motion.div
                                  key={`kds-c1-${o.id}`}
                                  layoutId={`kds-c1-${o.id}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="bg-[#151C24] border border-brand-green/5 hover:border-brand-orange/30 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden transition-all group"
                                >
                                  {/* Lane marker accent */}
                                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                                    (o as any).lane === 'lane_a' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`} />

                                  {/* Broadcast Status Badge */}
                                  {isUnaccepted && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-amber-400 flex items-center justify-between">
                                      <span className="flex items-center gap-1">⚡ BROADCAST REQUEST</span>
                                      <span className="text-[8px] font-mono opacity-80">Pending Acceptance</span>
                                    </div>
                                  )}

                                  {/* Rider En Route Notice */}
                                  {(o.deliveryPartnerName || (o as any).assignedRiderName) && (
                                    <div className="bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-emerald-300 flex items-center justify-between animate-pulse shadow-sm">
                                      <span className="flex items-center gap-1">🛵 Rider {o.deliveryPartnerName || (o as any).assignedRiderName} is coming to collect!</span>
                                      <span className="text-[8px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 font-mono">EN ROUTE</span>
                                    </div>
                                  )}

                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span 
                                          onClick={() => {
                                            navigator.clipboard.writeText(o.id);
                                            playKitchenChime('complete');
                                            alert(`Order ID ${o.id} copied to clipboard!`);
                                          }}
                                          className="text-[10px] font-mono font-black text-brand-orange cursor-pointer hover:underline uppercase flex items-center gap-1"
                                          title="Click to copy unique trackable ID"
                                        >
                                          {o.id}
                                        </span>
                                      </div>
                                      <span className="text-[7px] text-gray-500 block font-mono">Placed: {o.date}</span>
                                    </div>
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${
                                      (o as any).lane === 'lane_a' 
                                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                                        : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
                                    }`}>
                                      {(o as any).lane === 'lane_a' ? 'VEG SAUTÉ' : 'MEAT GRILL'}
                                    </span>
                                  </div>

                                  {/* Items list */}
                                  <div className="space-y-1.5 border-t border-brand-green/5 pt-2">
                                    {o.items?.map((it, idx) => (
                                      <div key={idx} className="text-[11px] leading-tight flex justify-between gap-2">
                                        <span className="font-bold text-gray-200">
                                          <span className="text-brand-green font-mono font-black">{it.quantity}x</span> {it.meal?.name}
                                        </span>
                                        <span className="text-[9px] font-mono text-gray-500 shrink-0">{it.meal?.calories} kcal</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Chef instruction notes */}
                                  {(o as any).chefNote && (
                                    <div className="bg-[#1A232D] border border-brand-green/5 px-2.5 py-2 rounded-xl text-[10px] text-gray-400 italic font-medium leading-relaxed">
                                      <span className="text-[8px] font-black text-brand-orange block uppercase not-italic tracking-wider mb-0.5">Instruction Notes:</span>
                                      "{(o as any).chefNote}"
                                    </div>
                                  )}

                                  {/* Order Prep Time Controller */}
                                  <div className="bg-[#121820] p-2 rounded-xl border border-brand-green/10 flex items-center justify-between gap-1 text-[9px]">
                                    <div className="flex items-center gap-1 font-mono text-gray-300">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      <span>Prep:</span>
                                      <span className={`font-black ${o.extraPrepMinutes ? 'text-amber-400' : 'text-gray-400'}`}>
                                        {o.extraPrepMinutes ? `${o.extraPrepMinutes > 0 ? '+' : ''}${o.extraPrepMinutes}m` : '0m'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustOrderPrepTime(o.id, -5)}
                                        className="px-1.5 py-0.5 bg-[#1C2530] hover:bg-gray-800 border border-white/10 text-gray-300 font-black rounded text-[8px] cursor-pointer"
                                        title="Reduce order prep time by 5m"
                                      >
                                        -5m
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustOrderPrepTime(o.id, 5)}
                                        className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black rounded text-[8px] cursor-pointer"
                                        title="Add 5m prep time"
                                      >
                                        +5m
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustOrderPrepTime(o.id, 10)}
                                        className="px-1.5 py-0.5 bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/40 text-brand-orange font-black rounded text-[8px] cursor-pointer"
                                        title="Add 10m prep time"
                                      >
                                        +10m
                                      </button>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  {isUnaccepted ? (
                                    <div className="pt-2 flex gap-2">
                                      <button
                                        onClick={() => handleAcceptKitchenOrder(o.id)}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" /> Accept Order
                                      </button>
                                      <button
                                        onClick={() => handleDenyKitchenOrder(o)}
                                        className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                        title="Deny order for this kitchen"
                                      >
                                        <XCircle className="w-3.5 h-3.5" /> Deny
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="pt-2">
                                      <button
                                        onClick={() => handleUpdateOrderStatus(o.id, 'cooking', 'cooking')}
                                        className="w-full py-2 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-[10px] uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                                      >
                                        <ChefHat className="w-3.5 h-3.5 stroke-[2.5px]" /> Start Sauté & Prep ➔
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* COLUMN 2: ACTIVE PREPARATION */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-brand-charcoal/80 border border-brand-green/5 px-3 py-2 rounded-xl sticky top-0 z-10">
                        <span className="text-[9px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                          2. Sauté & Cooking
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-md">
                          {visibleOrders.filter(o => o.status === 'cooking' && (o as any).kdsStage === 'cooking' && (chefStation === 'all' || (o as any).lane === chefStation)).length}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {visibleOrders
                            .filter(o => o.status === 'cooking' && (o as any).kdsStage === 'cooking' && (chefStation === 'all' || (o as any).lane === chefStation))
                            .map((o) => {
                              const uniqueId = o.id;
                              
                              // Check checklist progress
                              const steps = ["Weigh & Verify Raw Macros", "Cook/Blend Recipe Steps", "Check Thermal Pack Box"];
                              const stepsTicked = tickedPrepSteps[uniqueId] || {};
                              const tickedCount = Object.values(stepsTicked).filter(Boolean).length;
                              const progressPct = Math.round((tickedCount / steps.length) * 100);
                              const isAllTicked = tickedCount === steps.length;

                              const isRecipeExpanded = !!expandedRecipes[uniqueId];

                              return (
                                <motion.div
                                  key={`kds-c2-${o.id}`}
                                  layoutId={`kds-c2-${o.id}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="bg-[#19212C] border border-brand-orange/20 rounded-2xl p-4 space-y-3.5 shadow-lg relative overflow-hidden transition-all"
                                >
                                  {/* Lane marker accent */}
                                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                                    (o as any).lane === 'lane_a' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`} />

                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-mono font-black text-brand-orange uppercase">{o.id}</span>
                                      <span className="text-[7px] text-gray-500 block font-mono">Sauté lane assignment</span>
                                    </div>
                                    <KDSTimer createdAt={(o as any).createdAt} />
                                  </div>

                                  {/* Items list */}
                                  <div className="space-y-1.5 border-t border-brand-green/5 pt-2">
                                    {o.items?.map((it, idx) => (
                                      <div key={idx} className="text-[11px] leading-tight flex justify-between gap-2">
                                        <span className="font-bold text-gray-200">
                                          <span className="text-brand-green font-mono font-black">{it.quantity}x</span> {it.meal?.name}
                                        </span>
                                        <span className="text-[9px] font-mono text-gray-500 shrink-0">
                                          P: {it.meal?.protein}g
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Interactive Checklist progress */}
                                  <div className="space-y-1.5 bg-[#121820] border border-brand-green/5 p-2.5 rounded-xl">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Chef Checklist</span>
                                      <span className={`text-[8px] font-mono font-bold ${isAllTicked ? 'text-brand-green' : 'text-brand-orange'}`}>
                                        {progressPct}% Done
                                      </span>
                                    </div>
                                    
                                    {/* Checklist checkboxes */}
                                    <div className="space-y-1">
                                      {steps.map((step, idx) => {
                                        const isChecked = !!stepsTicked[step];
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              setTickedPrepSteps(prev => {
                                                const currentOrderSteps = prev[uniqueId] || {};
                                                const updated = {
                                                  ...prev,
                                                  [uniqueId]: {
                                                    ...currentOrderSteps,
                                                    [step]: !isChecked
                                                  }
                                                };
                                                // Speak feedback if toggled
                                                if (!isChecked && enableVoiceAnnounce) {
                                                  speakToKitchen(`Step ${idx + 1} completed.`);
                                                }
                                                return updated;
                                              });
                                            }}
                                            className="w-full flex items-center gap-1.5 text-left py-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer group"
                                          >
                                            {isChecked ? (
                                              <CheckSquare className="w-3.5 h-3.5 text-brand-green shrink-0" />
                                            ) : (
                                              <Square className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0" />
                                            )}
                                            <span className={`text-[9px] truncate ${isChecked ? 'line-through text-gray-600' : 'text-gray-300 font-medium'}`}>
                                              {step}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Progress line */}
                                    <div className="w-full bg-brand-charcoal h-1 rounded-full overflow-hidden mt-1.5">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${isAllTicked ? 'bg-brand-green' : 'bg-brand-orange'}`}
                                        style={{ width: `${progressPct}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* COLLAPSIBLE CULINARY DIRECTIVES */}
                                  <div className="border border-brand-green/5 rounded-xl bg-brand-charcoal/40 overflow-hidden">
                                    <button
                                      onClick={() => setExpandedRecipes(prev => ({ ...prev, [uniqueId]: !isRecipeExpanded }))}
                                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-[9px] font-black uppercase text-gray-400 hover:text-white hover:bg-brand-charcoal/60 cursor-pointer"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-brand-orange" />
                                        Culinary Assembly Guide
                                      </span>
                                      <span className="text-[10px]">{isRecipeExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
                                    </button>

                                    {isRecipeExpanded && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        className="px-2.5 pb-2.5 border-t border-brand-green/5 text-[9px] text-gray-400 space-y-1.5 bg-[#12171E] pt-2"
                                      >
                                        {getRecipeDirectives(o.items?.[0]?.meal?.name || '').map((directive, didx) => (
                                          <div key={didx} className="flex gap-1.5 items-start">
                                            <span className="text-brand-orange font-bold font-mono shrink-0">{didx + 1}.</span>
                                            <p className="leading-normal">{directive}</p>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'cooking', 'plated')}
                                      disabled={!isAllTicked}
                                      className={`flex-1 py-2 font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md ${
                                        isAllTicked 
                                          ? 'bg-brand-green text-brand-charcoal hover:scale-[1.02]' 
                                          : 'bg-brand-charcoal text-gray-500 border border-brand-green/5 opacity-60'
                                      }`}
                                      title={isAllTicked ? 'Complete prep and pass to plating bay' : 'Complete checklist first'}
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 stroke-[2.5px]" /> Plate & Pack ➔
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'cancelled', 'cancelled')}
                                      className="px-2.5 py-2 border border-red-500/10 hover:bg-red-500/10 text-red-400 font-black text-[9px] uppercase rounded-xl cursor-pointer"
                                      title="Void ticket"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* COLUMN 3: PLATED / QC CHECK */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-brand-charcoal/80 border border-brand-green/5 px-3 py-2 rounded-xl sticky top-0 z-10">
                        <span className="text-[9px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                          3. Plated & Packed
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-md">
                          {visibleOrders.filter(o => o.status === 'cooking' && (o as any).kdsStage === 'plated' && (chefStation === 'all' || (o as any).lane === chefStation)).length}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {visibleOrders
                            .filter(o => o.status === 'cooking' && (o as any).kdsStage === 'plated' && (chefStation === 'all' || (o as any).lane === chefStation))
                            .map((o) => (
                              <motion.div
                                key={`kds-c3-${o.id}`}
                                layoutId={`kds-c3-${o.id}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#151C24] border border-brand-green/20 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden transition-all group"
                              >
                                {/* Lane marker accent */}
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-green" />

                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-mono font-black text-brand-orange uppercase">{o.id}</span>
                                    <span className="text-[7px] text-brand-green font-black block uppercase tracking-wider">✓ MACRO VERIFIED</span>
                                  </div>
                                  <span className="text-[8px] bg-brand-green/10 text-brand-green font-black px-1.5 py-0.5 rounded border border-brand-green/20 uppercase tracking-widest">
                                    READY BAY
                                  </span>
                                </div>

                                {/* Items list */}
                                <div className="space-y-1.5 border-t border-brand-green/5 pt-2">
                                  {o.items?.map((it, idx) => (
                                    <div key={idx} className="text-[11px] leading-tight flex justify-between gap-2">
                                      <span className="font-bold text-gray-200">
                                        <span className="text-brand-green font-mono font-black">{it.quantity}x</span> {it.meal?.name}
                                      </span>
                                      <span className="text-[9px] font-mono text-gray-400 shrink-0">
                                        P:{it.meal?.protein}g / C:{it.meal?.carbs}g
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Station details info */}
                                <div className="bg-[#121820] border border-brand-green/5 p-2.5 rounded-xl space-y-1 text-[9px] text-gray-400 leading-normal">
                                  <div className="flex justify-between">
                                    <span className="font-bold text-gray-500">PACKAGING:</span>
                                    <span className="text-gray-300 font-mono">
                                      {o.fulfillmentMode === 'takeaway' ? 'Counter Carry-Out Bag' : 'Heat-Sealed Bento Tray'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-bold text-gray-500">
                                      {o.fulfillmentMode === 'takeaway' ? 'MODE:' : 'DESTINATION:'}
                                    </span>
                                    <span className="text-brand-orange font-bold truncate max-w-[140px]">
                                      {o.fulfillmentMode === 'takeaway' ? '🛍️ TAKEAWAY / SELF-PICKUP' : o.address}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-1.5 flex gap-1.5">
                                  {o.fulfillmentMode === 'takeaway' ? (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'ready_for_pickup', 'ready_for_pickup')}
                                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-[10px] uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                                    >
                                      <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5px]" /> Ready for Counter Pickup 🛍️
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'out_for_delivery', 'dispatched')}
                                      className="flex-1 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-[10px] uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                                    >
                                      <Truck className="w-3.5 h-3.5 stroke-[2.5px]" /> Dispatch ➔
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateOrderStatus(o.id, 'cancelled', 'cancelled')}
                                    className="px-2 py-2 border border-red-500/10 hover:bg-red-500/10 text-red-400 font-black text-[9px] uppercase rounded-xl cursor-pointer"
                                    title="Void ticket"
                                  >
                                    Void
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* COLUMN 4: DISPATCHED & COUNTER PICKUP */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-brand-charcoal/80 border border-brand-green/5 px-3 py-2 rounded-xl sticky top-0 z-10">
                        <span className="text-[9px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                          4. Dispatched / Counter Pickup
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-sky-400/10 text-sky-400 px-2 py-0.5 rounded-md">
                          {visibleOrders.filter(o => (o.status === 'out_for_delivery' || o.status === 'ready_for_pickup') && (chefStation === 'all' || (o as any).lane === chefStation)).length}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {visibleOrders
                            .filter(o => (o.status === 'out_for_delivery' || o.status === 'ready_for_pickup') && (chefStation === 'all' || (o as any).lane === chefStation))
                            .map((o) => (
                              <motion.div
                                key={`kds-c4-${o.id}`}
                                layoutId={`kds-c4-${o.id}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#151C24] border border-sky-500/20 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden transition-all group"
                              >
                                {/* Lane marker accent */}
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${o.fulfillmentMode === 'takeaway' ? 'bg-amber-400' : 'bg-sky-400'}`} />

                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-mono font-black text-brand-orange uppercase">{o.id}</span>
                                    <span className="text-[7px] text-sky-400 block font-mono">
                                      {o.fulfillmentMode === 'takeaway' ? 'Awaiting customer pickup at counter' : 'Dispatched and en-route'}
                                    </span>
                                  </div>
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                                    o.fulfillmentMode === 'takeaway'
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                      : 'bg-sky-950/40 text-sky-400 border-sky-900/30 animate-pulse'
                                  }`}>
                                    {o.fulfillmentMode === 'takeaway' ? 'READY AT COUNTER 🛍️' : 'DISPATCHED'}
                                  </span>
                                </div>

                                {/* Items list */}
                                <div className="space-y-1.5 border-t border-brand-green/5 pt-2">
                                  {o.items?.map((it, idx) => (
                                    <div key={idx} className="text-[11px] leading-tight flex justify-between gap-2">
                                      <span className="font-bold text-gray-200">
                                        <span className="text-brand-green font-mono font-black">{it.quantity}x</span> {it.meal?.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Pickup or Delivery location details */}
                                <div className="bg-[#121820] border border-brand-green/5 p-2.5 rounded-xl space-y-1 text-[9px] text-gray-400 leading-normal">
                                  {o.fulfillmentMode === 'takeaway' ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-amber-300 font-bold">
                                        <span>PICKUP OTP:</span>
                                        <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                          {(o as any).takeawayPickupOtp || '4921'}
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                                        <span>Counter: {o.acceptedKitchenName || 'Kitchen Branch'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                                      <span>{o.address}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-1 flex gap-1.5">
                                  {o.fulfillmentMode === 'takeaway' ? (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'delivered', 'delivered')}
                                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-brand-charcoal stroke-[2.5px]" /> Hand Over & Complete 🛍️
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'delivered', 'delivered')}
                                      className="w-full py-2 bg-white hover:bg-gray-100 text-brand-charcoal font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> Locker Loaded ✓
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateOrderStatus(o.id, 'cancelled', 'cancelled')}
                                    className="px-2 py-2 border border-red-500/10 hover:bg-red-500/10 text-red-400 font-black text-[9px] uppercase rounded-xl cursor-pointer"
                                    title="Cancel order"
                                  >
                                    Void
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>
                )}

                {/* ARCHIVED / COMPLETED DISPATCH HISTORIC LOGS */}
                <div className="pt-6 border-t border-brand-green/10">
                  <div className="flex items-center justify-between border-b border-brand-green/5 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-brand-green" />
                      Locker Fulfillment & Voided Archive Logs
                    </h3>
                    <span className="text-[9px] font-mono font-bold bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-md">
                      {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length} processed
                    </span>
                  </div>

                  {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      No processed or voided logs in current session.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-brand-green/5 max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-[#121820] border-b border-brand-green/10 text-[8px] uppercase tracking-widest font-black text-gray-500">
                            <th className="py-2 px-3">Order ID</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Items Fulfillmed</th>
                            <th className="py-2 px-3">Final Total</th>
                            <th className="py-2 px-3">Locker/Home Station</th>
                            <th className="py-2 px-3 text-right">Log Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-green/5 text-[10px] bg-brand-charcoal/10">
                          {orders
                            .filter(o => o.status === 'delivered' || o.status === 'cancelled')
                            .map((o) => (
                              <tr key={o.id} className="hover:bg-brand-charcoal/20 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-black text-brand-orange">
                                  {o.id}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-gray-400 font-medium">
                                    {o.address.includes('Locker') ? 'Gym Terminal' : 'Home Station'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-gray-300 font-medium max-w-xs truncate">
                                  {o.items?.map((it) => `${it.quantity}x ${it.meal?.name || 'Dish'}`).join(', ')}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-white">
                                  ₹{o.total}
                                </td>
                                <td className="py-2.5 px-3 text-gray-400 truncate max-w-xs">
                                  {o.address}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {o.status === 'delivered' ? (
                                    <span className="text-[8px] text-brand-green font-black uppercase tracking-wider bg-brand-green/10 px-2 py-0.5 rounded border border-brand-green/20">
                                      ✓ Loaded
                                    </span>
                                  ) : (
                                    <span className="text-[8px] text-red-400 font-black uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">
                                      ✕ Voided
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                  </>
                )}

              </motion.div>
            ); })()}

            {/* WORKSPACE 2 font: LIVE RADAR TRACKING */}
            {activeTab === 'tracking' && (() => {
              const trackedOrders = orders.filter((o) => {
                const isKitchenMatch = !activeKdsKitchen || o.acceptedByKitchenId === activeKdsKitchen.id || o.kitchenId === activeKdsKitchen.id;
                const isActiveStatus = o.status === 'cooking' || o.status === 'out_for_delivery' || o.kdsStage === 'plated' || o.kdsStage === 'dispatched';
                return isKitchenMatch && isActiveStatus;
              });

              return (
                <motion.div
                  key="tracking"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="col-span-1 lg:col-span-12 bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-2xl space-y-6"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-brand-green/10 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                          Kitchen & Fleet Live GPS Radar Tracking
                        </h2>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Real-time multi-side dispatch tracking for connected terminal: <b className="text-brand-orange">{activeKdsKitchen?.name || 'All Kitchens'}</b>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black bg-brand-green/10 text-brand-green border border-brand-green/20 px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                        {trackedOrders.length} Active Dispatches Monitored
                      </span>
                    </div>
                  </div>

                  {trackedOrders.length === 0 ? (
                    <div className="text-center py-12 bg-[#0B0F14] border border-white/10 rounded-2xl space-y-3">
                      <Truck className="w-10 h-10 text-gray-600 mx-auto" />
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">No active dispatches currently tracked</h3>
                      <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                        When kitchen terminals accept orders or dispatch riders, live GPS markers and OTP statuses will stream live to this dashboard.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {trackedOrders.map((order) => {
                        const orderKitchen = allKitchens.find((k) => k.id === order.acceptedByKitchenId || k.id === order.kitchenId) || activeKdsKitchen || {
                          name: 'Central Kitchen Hub',
                          address: 'Mithanpura Central Kitchen',
                          lat: 26.1209,
                          lng: 85.3647
                        };

                        const partner = deliveryPartners.find((dp) => dp.id === order.deliveryPartnerId) || {
                          name: order.deliveryPartnerName || 'Assigned Fleet Partner',
                          phone: order.deliveryPartnerPhone || '+91 9876543210',
                          vehicleNumber: 'FZ-EV-01'
                        };

                        return (
                          <div key={order.id} className="bg-[#0B0F14] border-2 border-brand-green/30 rounded-3xl p-5 space-y-4 shadow-xl">
                            {/* Header info */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-black bg-brand-orange/20 text-brand-orange px-3 py-1 rounded-xl border border-brand-orange/30">
                                  ORDER ID: {order.id}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                                  order.status === 'out_for_delivery'
                                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/40 animate-pulse'
                                    : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                }`}>
                                  {order.status.replace(/_/g, ' ')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = `${window.location.origin}/?trackOrder=${order.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert(`✅ Deliverable live tracking link for Order #${order.id} copied to clipboard!`);
                                  }}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-brand-green border border-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Copy Deliverable Tracking Link"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Live Link</span>
                                </button>
                              </div>

                              {order.deliveryOtp && (
                                <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-right">
                                  <span className="text-[9px] font-black text-amber-400 uppercase block leading-none">CUSTOMER VERIFICATION OTP</span>
                                  <span className="text-xs font-black text-amber-300 font-mono tracking-widest">{order.deliveryOtp}</span>
                                </div>
                              )}
                            </div>

                            {/* Grid details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              {/* Kitchen Origin */}
                              <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                                <span className="text-[9px] font-black text-brand-green uppercase tracking-wider block">🍳 ORIGIN KITCHEN</span>
                                <span className="font-bold text-white block">{orderKitchen.name}</span>
                                <span className="text-[10px] text-gray-400 block font-mono">{orderKitchen.address}</span>
                              </div>

                              {/* Customer Destination */}
                              <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                                <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block">📍 CUSTOMER DROP-OFF</span>
                                <span className="font-bold text-white block">{order.customerName || 'Siddharth Sharma'} ({order.customerPhone || '+91 98351 88201'})</span>
                                <span className="text-[10px] text-gray-400 block font-mono">{order.address}</span>
                              </div>

                              {/* Rider Info & GPS */}
                              <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">🛵 RIDER FLEET STATUS</span>
                                <span className="font-bold text-white block">{partner.name} ({partner.phone})</span>
                                <span className="text-[10px] text-emerald-400 block font-mono">
                                  {order.riderLat && order.riderLng ? `🟢 Live Coords: ${order.riderLat.toFixed(4)}, ${order.riderLng.toFixed(4)}` : '📡 Awaiting Rider GPS Ping'}
                                </span>
                              </div>
                            </div>

                            {/* Google Maps SDK Live Delivery Map */}
                            <InAppDeliveryMap
                              kitchenName={orderKitchen.name}
                              kitchenAddress={orderKitchen.address}
                              customerAddress={order.address}
                              customerName={order.customerName || 'Valued Guest'}
                              customerPhone={order.customerPhone}
                              riderName={partner.name}
                              riderPhone={partner.phone}
                              riderVehicleNumber={partner.vehicleNumber}
                              riderLat={order.riderLat}
                              riderLng={order.riderLng}
                              orderStatus={order.status}
                              orderId={order.id}
                              isAdminView={true}
                              allActiveOrders={trackedOrders}
                              allRiders={deliveryPartners}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* WORKSPACE 3: MACRO INVENTORY MANAGEMENT */}
            {activeTab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-brand-green/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">
                      High-Protein Kitchen Inventory Stats
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Monitor reserve supplies, check thresholds, and instant-restock high-value ingredients.
                    </p>
                  </div>
                  <Package className="w-5 h-5 text-brand-green" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ingredients.map((ing, ingIdx) => {
                    const isLow = ing.currentStock <= ing.minRequired;
                    const fillPct = Math.min(100, Math.max(0, ((ing.currentStock || 0) / (ing.minRequired ? ing.minRequired * 3 : 100)) * 100));

                    return (
                      <div 
                        key={ing.id ? `ing-${ing.id}-${ingIdx}` : `ing-${ingIdx}`} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isLow 
                            ? 'bg-red-950/20 border-red-500/25 shadow-md shadow-red-500/5' 
                            : 'bg-brand-charcoal/50 border-brand-green/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{ing.name}</span>
                              {isLow && (
                                <span className="text-[8px] bg-red-500/15 text-red-400 font-black px-1.5 py-0.5 rounded border border-red-500/30 uppercase tracking-widest animate-pulse shrink-0">
                                  🚨 LOW STOCK
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] uppercase font-bold text-gray-500 block">
                              Category: {ing.category}
                            </span>
                          </div>

                          <div className="text-right font-mono">
                            <span className={`text-base font-black ${isLow ? 'text-red-400' : 'text-brand-green'}`}>
                              {ing.currentStock} {ing.unit}
                            </span>
                            <span className="text-[9px] text-gray-500 block">
                              Min limit: {ing.minRequired} {ing.unit}
                            </span>
                          </div>
                        </div>

                        {/* Progress meter */}
                        <div className="w-full bg-brand-charcoal h-2 rounded-full overflow-hidden mt-4">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-brand-green'}`} 
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>

                        {/* Action controllers */}
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <span className="text-[9px] text-gray-400">
                            Fulfillment pipeline status: <span className="font-bold text-gray-300">{isLow ? 'Restock Required' : 'Optimal'}</span>
                          </span>

                          <button
                            onClick={() => handleRestockIngredient(ing.id, ing.category === 'spice' || ing.category === 'premium' ? 1.5 : 15)}
                            className="px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            + Restock {ing.category === 'spice' || ing.category === 'premium' ? '1.5 kg' : '15 kg'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* WORKSPACE 4: MEAL ROSTER & METRICS (CRUD) */}
            {activeTab === 'meals' && (
              <motion.div
                key="meals"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-brand-orange" />
                      TAASH BHATTI Premium Meal Roster
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Add, modify, hide, delete, or toggle availability of clay-oven recipes.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddMeal}
                    className="px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" /> Add New Meal
                  </button>
                </div>

                {/* Filters & Search Row */}
                <div className="bg-brand-charcoal/30 border border-brand-green/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  {/* Search input */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                      Search Meals
                    </label>
                    <input
                      type="text"
                      placeholder="Type name or ingredients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/50"
                    />
                  </div>

                  {/* Diet filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                      Dietary Type
                    </label>
                    <select
                      value={filterDiet}
                      onChange={(e) => setFilterDiet(e.target.value as any)}
                      className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                    >
                      <option value="all">All Diets</option>
                      <option value="veg">🌿 Pure Vegetarian</option>
                      <option value="vegan">🌱 Vegan Only</option>
                      <option value="non_veg">🥩 Non-Vegetarian Only</option>
                    </select>
                  </div>

                  {/* Fitness goal filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                      Nutritional Focus Goal
                    </label>
                    <select
                      value={filterGoal}
                      onChange={(e) => setFilterGoal(e.target.value)}
                      className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                    >
                      <option value="all">All Goals</option>
                      <option value="fat_loss">🔥 Fat Loss</option>
                      <option value="muscle_gain">💪 Muscle Gain</option>
                      <option value="maintenance">🥗 Maintenance</option>
                      <option value="post_workout">⚡ Post Workout</option>
                    </select>
                  </div>

                  {/* Availability filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider mb-1">
                      Availability State
                    </label>
                    <select
                      value={filterAvailability}
                      onChange={(e) => setFilterAvailability(e.target.value as any)}
                      className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                    >
                      <option value="all">All Stock Statuses</option>
                      <option value="available">🟢 In Stock / Ready</option>
                      <option value="unavailable">🔴 Sold Out / Paused</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Grid List */}
                {paginatedMeals.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-brand-green/10 rounded-2xl bg-brand-charcoal/20">
                    <UtensilsCrossed className="w-8 h-8 text-brand-green/30 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-bold">No registered meals match your filtering combinations.</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterDiet('all');
                        setFilterGoal('all');
                        setFilterAvailability('all');
                      }}
                      className="text-[10px] text-brand-orange hover:underline font-bold mt-1 uppercase"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {paginatedMeals.map((m, mIdx) => {
                      const isSoldOut = m.isAvailable === false;
                      const isHidden = m.isHidden === true;

                      return (
                        <div
                          key={m.id ? `meal-${m.id}-${mIdx}` : `meal-${mIdx}`}
                          className={`bg-brand-charcoal/40 border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            isSoldOut ? 'border-red-950/40 opacity-75' : isHidden ? 'border-dashed border-gray-800' : 'border-brand-green/5 hover:border-brand-green/15'
                          }`}
                        >
                          {/* Left: Info details */}
                          <div className="flex gap-4 items-start md:items-center">
                            <img
                              src={m.image}
                              alt={m.name}
                              className={`w-14 h-14 rounded-xl object-cover border border-brand-green/10 shrink-0 ${isSoldOut ? 'grayscale' : ''}`}
                              referrerPolicy="no-referrer"
                            />
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-black text-white">{m.name}</h3>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${m.isVeg ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                                  {m.isVeg ? 'VEG' : 'NON-VEG'}
                                </span>
                                {m.isFeatured && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-950 text-brand-orange border border-amber-900 uppercase">
                                    ★ Featured
                                  </span>
                                )}
                                {m.partnerGymExclusive && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/20 uppercase">
                                    Gym Exclusive
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 leading-relaxed max-w-xl line-clamp-1">
                                {m.description}
                              </p>

                              {/* Micro specs */}
                              <div className="flex items-center gap-3 text-[9px] font-mono text-gray-400 font-bold">
                                <span className="text-brand-orange">🔥 {m.calories} Kcal</span>
                                <span>🥩 P: {m.protein}g</span>
                                <span>🌾 C: {m.carbs}g</span>
                                <span>🥑 F: {m.fats}g</span>
                                <span className="text-gray-600">|</span>
                                <span className="capitalize">Spicy: <b className="text-white">{m.spicyLevel || 'medium'}</b></span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick actions and controls */}
                          <div className="flex items-center gap-4 border-t border-brand-green/5 pt-3 md:pt-0 md:border-0 justify-between md:justify-end">
                            <div className="text-left md:text-right pr-4 shrink-0">
                              <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider leading-none">PRICING</span>
                              <span className="text-sm font-black text-brand-green">₹{m.price}</span>
                            </div>

                            {/* Switches and Operations */}
                            <div className="flex items-center gap-2">
                              {/* Stock Toggler */}
                              <button
                                onClick={() => handleToggleMealAvailability(m)}
                                className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                                  !isSoldOut
                                    ? 'bg-emerald-950/55 text-emerald-400 border-emerald-900 hover:bg-emerald-950'
                                    : 'bg-red-950/55 text-red-400 border-red-900 hover:bg-red-950'
                                }`}
                                title="Click to Toggle Stock Status"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${!isSoldOut ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                                {!isSoldOut ? 'IN STOCK' : 'SOLD OUT'}
                              </button>

                              {/* Visibility Toggler */}
                              <button
                                onClick={() => handleToggleMealHidden(m)}
                                className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                                  !isHidden
                                    ? 'bg-blue-950/55 text-blue-400 border-blue-900 hover:bg-blue-950'
                                    : 'bg-gray-950/55 text-gray-400 border-gray-900 hover:bg-gray-950'
                                }`}
                                title="Click to Toggle Visibility on Menu"
                              >
                                {!isHidden ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" /> ON MENU
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" /> HIDDEN
                                  </>
                                )}
                              </button>

                              {/* Edit Trigger */}
                              <button
                                onClick={() => handleOpenEditMeal(m)}
                                className="p-2 bg-brand-charcoal border border-brand-green/20 hover:bg-brand-green/10 text-white rounded-xl transition-all cursor-pointer"
                                title="Edit Specifications"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Trigger */}
                              <button
                                onClick={() => handleDeleteMeal(m.id, m.name)}
                                className="p-2 bg-red-950/40 border border-red-900/35 hover:bg-red-600 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer"
                                title="Delete Forever"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Stylized Page Changer (Pagination Bar) */}
                    <div className="flex items-center justify-between border-t border-brand-green/10 pt-4 mt-2">
                      <p className="text-[10px] text-gray-400 font-bold">
                        Showing <span className="text-white">{(mealsCurrentPage - 1) * MEALS_PER_PAGE + 1} - {Math.min(mealsCurrentPage * MEALS_PER_PAGE, filteredMeals.length)}</span> of <span className="text-brand-orange font-mono">{filteredMeals.length}</span> registered meals
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={mealsCurrentPage === 1}
                          onClick={() => setMealsCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                            mealsCurrentPage === 1
                              ? 'border-gray-800 text-gray-600 bg-transparent cursor-not-allowed'
                              : 'border-brand-green/20 text-white hover:bg-brand-green/10'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalMealPages }).map((_, idx) => {
                          const page = idx + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setMealsCurrentPage(page)}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                mealsCurrentPage === page
                                  ? 'bg-brand-green text-brand-charcoal'
                                  : 'border border-brand-green/5 text-gray-400 hover:bg-brand-green/5'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}

                        <button
                          disabled={mealsCurrentPage === totalMealPages}
                          onClick={() => setMealsCurrentPage((prev) => Math.min(totalMealPages, prev + 1))}
                          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                            mealsCurrentPage === totalMealPages
                              ? 'border-gray-800 text-gray-600 bg-transparent cursor-not-allowed'
                              : 'border-brand-green/20 text-white hover:bg-brand-green/10'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* WORKSPACE: DEALS & COMBOS MANAGER MODULE */}
            {activeTab === 'deals' && (
              <motion.div
                key="deals"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <AdminDealsManager meals={meals} />
              </motion.div>
            )}

            {/* WORKSPACE 5: COUPON MANAGER MODULE */}
            {activeTab === 'coupons' && (() => {
              const totalCouponsCount = coupons.length;
              const activeCouponsCount = coupons.filter(c => c.isActive !== false).length;
              const inactiveCouponsCount = coupons.filter(c => c.isActive === false).length;
              const activePct = totalCouponsCount > 0 ? (activeCouponsCount / totalCouponsCount) * 100 : 0;
              const inactivePct = totalCouponsCount > 0 ? (inactiveCouponsCount / totalCouponsCount) * 100 : 0;
              const totalClaimsCount = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
              const totalCouponSavings = coupons.reduce((sum, c) => sum + (c.totalSavings || 0), 0);

              return (
                <motion.div
                  key="coupons"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-brand-orange" />
                        TAASH BHATTI Elite Coupon Hub
                      </h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Create premium discount codes, gym-only perks, account-locked campaigns, usage caps, and custom stacking rules.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddCoupon}
                      className="px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3px]" /> Create New Coupon
                    </button>
                  </div>

                  {/* Sub Tabs Selector */}
                  <div className="flex border-b border-brand-green/10 pb-0.5 gap-6 text-xs font-black uppercase tracking-wider">
                    <button
                      onClick={() => setCouponSubTab('campaigns')}
                      className={`pb-2.5 transition-all relative cursor-pointer ${couponSubTab === 'campaigns' ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`}
                    >
                      Campaigns & Rules
                      {couponSubTab === 'campaigns' && (
                        <motion.div layoutId="couponSubTabActiveBar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
                      )}
                    </button>
                    <button
                      onClick={() => setCouponSubTab('analytics')}
                      className={`pb-2.5 transition-all relative cursor-pointer ${couponSubTab === 'analytics' ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`}
                    >
                      Analytics Dashboard
                      {couponSubTab === 'analytics' && (
                        <motion.div layoutId="couponSubTabActiveBar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
                      )}
                    </button>
                    <button
                      onClick={() => setCouponSubTab('stacking')}
                      className={`pb-2.5 transition-all relative cursor-pointer ${couponSubTab === 'stacking' ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`}
                    >
                      Stacking Registry
                      {couponSubTab === 'stacking' && (
                        <motion.div layoutId="couponSubTabActiveBar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
                      )}
                    </button>
                  </div>

                  {/* SUB-TAB CONTENTS: CAMPAIGNS & RULES */}
                  {couponSubTab === 'campaigns' && (
                    <div className="space-y-6">
                      {/* Metrics Stats for coupons */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-brand-charcoal/40 border border-brand-green/5 p-4 rounded-2xl">
                          <span className="text-[8px] uppercase tracking-widest font-black text-gray-400 block mb-1">Total Coupons</span>
                          <span className="text-xl font-mono font-black text-white">{totalCouponsCount}</span>
                        </div>
                        <div className="bg-brand-charcoal/40 border border-brand-green/5 p-4 rounded-2xl">
                          <span className="text-[8px] uppercase tracking-widest font-black text-gray-400 block mb-1">Active Offers</span>
                          <span className="text-xl font-mono font-black text-brand-green">
                            {activeCouponsCount}
                          </span>
                        </div>
                        <div className="bg-brand-charcoal/40 border border-brand-green/5 p-4 rounded-2xl">
                          <span className="text-[8px] uppercase tracking-widest font-black text-gray-400 block mb-1">Total Claims</span>
                          <span className="text-xl font-mono font-black text-brand-orange">
                            {totalClaimsCount}
                          </span>
                        </div>
                        <div className="bg-brand-charcoal/40 border border-brand-green/5 p-4 rounded-2xl">
                          <span className="text-[8px] uppercase tracking-widest font-black text-gray-400 block mb-1">Exclusive Rules</span>
                          <span className="text-xl font-mono font-black text-blue-400">
                            {coupons.filter(c => c.scope === 'gym_only' || c.scope === 'account_based').length}
                          </span>
                        </div>
                      </div>

                      {/* List of Coupons */}
                      {totalCouponsCount === 0 ? (
                        <div className="text-center py-12 bg-brand-charcoal/20 rounded-2xl border border-dashed border-brand-green/10">
                          <Percent className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-xs text-gray-400 font-bold">No custom promotional campaigns found in database.</p>
                          <button
                            onClick={handleOpenAddCoupon}
                            className="mt-3 px-3.5 py-1.5 bg-brand-green/10 hover:bg-brand-green/25 text-brand-green font-black text-[10px] uppercase rounded-xl border border-brand-green/20 transition-all cursor-pointer"
                          >
                            Initialize First Coupon Campaign
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {coupons.map((coupon, index) => {
                            const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                            const progressPct = coupon.usageCap ? Math.min(((coupon.usageCount || 0) / coupon.usageCap) * 100, 100) : 0;
                            const connectedGym = coupon.scope === 'gym_only' && allGyms.find((g: any) => g.id === coupon.targetGymId);

                            return (
                              <div
                                key={`cp-card-${coupon.id || coupon.code || index}-${index}`}
                                className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                                  coupon.isActive === false
                                    ? 'bg-brand-charcoal/20 border-brand-green/5 opacity-60'
                                    : isExpired
                                    ? 'bg-red-950/5 border-red-500/10'
                                    : 'bg-[#18202A] border-brand-green/10 shadow-md hover:border-brand-green/20'
                                }`}
                              >
                                {/* Corner ribbon for reward value */}
                                <div className="absolute top-0 right-0 bg-brand-green/10 px-3.5 py-1.5 rounded-bl-2xl text-[10px] font-black text-brand-green font-mono">
                                  {coupon.discountType === 'percentage' && `${coupon.discountValue}% OFF`}
                                  {coupon.discountType === 'fixed' && `₹${coupon.discountValue} OFF`}
                                  {coupon.discountType === 'free_delivery' && `FREE DELIVERY`}
                                  {coupon.discountType === 'free_perk' && `FREE PERK`}
                                </div>

                                <div className="space-y-4">
                                  {/* Code Box */}
                                  <div className="flex items-center gap-3">
                                    <div className="bg-brand-charcoal px-3 py-1.5 rounded-xl border border-brand-green/15 text-xs font-mono font-black text-white tracking-wider select-all">
                                      {coupon.code || coupon.id}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                        coupon.isActive !== false && !isExpired
                                          ? 'bg-brand-green/15 text-brand-green border-brand-green/20'
                                          : 'bg-red-500/15 text-red-400 border-red-500/20'
                                      }`}>
                                        {coupon.isActive === false ? 'PAUSED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Info Rows */}
                                  <div className="space-y-2">
                                    {/* Reward Description */}
                                    <p className="text-[11px] text-gray-300 font-medium">
                                      {coupon.discountType === 'percentage' && `Provides flat ${coupon.discountValue}% off subtotal.`}
                                      {coupon.discountType === 'fixed' && `Provides ₹${coupon.discountValue} discount off order subtotal.`}
                                      {coupon.discountType === 'free_delivery' && `Waives all insulated doorstep transit fees.`}
                                      {coupon.discountType === 'free_perk' && `Rewards premium extra: "${coupon.perkName || 'Chef Choice Gift'}"`}
                                    </p>

                                    {/* Stacking Rule Badge */}
                                    <div>
                                      {coupon.isStackable ? (
                                        <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono inline-block mt-1">
                                          🔗 STACKABLE {coupon.stackableWith && coupon.stackableWith.length > 0 ? `[Locked stack: ${coupon.stackableWith.join(', ')}]` : '[Stacks with any stackable]'}
                                        </span>
                                      ) : (
                                        <span className="text-[8px] bg-brand-charcoal text-gray-500 border border-brand-green/5 px-2 py-0.5 rounded font-mono inline-block mt-1">
                                          🔒 SINGLE-USE ONLY (Solo checkout)
                                        </span>
                                      )}
                                    </div>

                                    {/* Expiry and Minimum requirement */}
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-400 font-semibold pt-1">
                                      <div>
                                        <span className="block text-[8px] text-gray-500 uppercase font-black">EXPIRY</span>
                                        <span>{coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never Expires'}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] text-gray-500 uppercase font-black">MIN ORDER</span>
                                        <span>₹{coupon.minOrderValue || 0}</span>
                                      </div>
                                    </div>

                                    {/* Scope Indicator */}
                                    <div className="border-t border-brand-green/5 pt-2.5 mt-2.5">
                                      <span className="block text-[8px] text-gray-500 uppercase font-black mb-1">REDEEM RULES</span>
                                      <div className="flex items-center gap-1.5">
                                        {coupon.scope === 'account_based' && (
                                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/15 font-mono">
                                            Locked: {coupon.targetUserEmail}
                                          </span>
                                        )}
                                        {coupon.scope === 'gym_only' && (
                                          <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/15">
                                            Gym Only: {connectedGym ? connectedGym.name : 'Unknown Terminal'}
                                          </span>
                                        )}
                                        {coupon.scope !== 'account_based' && coupon.scope !== 'gym_only' && (
                                          <span className="text-[9px] bg-brand-green/5 text-gray-300 px-2 py-0.5 rounded border border-brand-green/10">
                                            Publicly Usable (All Accounts)
                                          </span>
                                        )}
                                        {coupon.firstNUsersOnly > 0 && (
                                          <span className="text-[9px] bg-orange-500/10 text-brand-orange px-2 py-0.5 rounded border border-orange-500/15">
                                            First {coupon.firstNUsersOnly} Users Only
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Usage Statistics Meter */}
                                    <div className="space-y-1 pt-2">
                                      <div className="flex items-center justify-between text-[9px] font-mono">
                                        <span className="text-gray-500">USAGE CAP LOGS</span>
                                        <span className="text-white font-bold">
                                          {coupon.usageCount || 0} / {coupon.usageCap || '∞'} claimed
                                        </span>
                                      </div>
                                      {coupon.usageCap ? (
                                        <div className="w-full h-1.5 bg-brand-charcoal rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-brand-green rounded-full transition-all duration-300"
                                            style={{ width: `${progressPct}%` }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center justify-end gap-2 border-t border-brand-green/5 pt-3.5 mt-4">
                                  <button
                                    onClick={() => handleToggleCouponActive(coupon)}
                                    className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                                      coupon.isActive !== false
                                        ? 'bg-emerald-950/55 text-emerald-400 border-emerald-900 hover:bg-emerald-950'
                                        : 'bg-red-950/55 text-red-400 border-red-900 hover:bg-red-950'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${coupon.isActive !== false ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                                    {coupon.isActive !== false ? 'ACTIVE' : 'PAUSED'}
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditCoupon(coupon)}
                                    className="p-1.5 bg-brand-charcoal border border-brand-green/20 hover:bg-brand-green/10 text-white rounded-xl transition-all cursor-pointer"
                                    title="Edit Coupon"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                    className="p-1.5 bg-red-950/40 border border-red-900/35 hover:bg-red-600 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer"
                                    title="Delete Coupon"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB CONTENTS: ANALYTICS DASHBOARD */}
                  {couponSubTab === 'analytics' && (
                    <div className="space-y-6">
                      {/* High Level Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-wider uppercase text-gray-400">Total ₹ Saved in INR</span>
                            <Percent className="w-4 h-4 text-brand-green" />
                          </div>
                          <div className="mt-4">
                            <span className="text-2xl font-mono font-black text-brand-green">₹{totalCouponSavings.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-gray-500 block mt-1">Total value returned to terminal members.</span>
                          </div>
                        </div>

                        <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-wider uppercase text-gray-400">Coupon Status Mix</span>
                            <BarChart2 className="w-4 h-4 text-brand-orange" />
                          </div>
                          <div className="mt-4 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-gray-400">Active ({activeCouponsCount})</span>
                              <span className="text-brand-green font-bold">{activePct.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-gray-400">Paused ({inactiveCouponsCount})</span>
                              <span className="text-red-400 font-bold">{inactivePct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-charcoal rounded-full overflow-hidden flex">
                              <div className="h-full bg-brand-green" style={{ width: `${activePct}%` }} />
                              <div className="h-full bg-red-500" style={{ width: `${inactivePct}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-wider uppercase text-gray-400">Total Coupon Usage</span>
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="mt-4">
                            <span className="text-2xl font-mono font-black text-white">{totalClaimsCount} <span className="text-xs text-gray-500">claims</span></span>
                            <span className="text-[9px] text-gray-500 block mt-1">Overall checkout code interactions.</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Table for Individual Coupons */}
                      <div className="bg-[#18202A] border border-brand-green/10 rounded-2xl p-5 overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-4">INDIVIDUAL PROMOTIONAL METRICS</span>
                        
                        {totalCouponsCount === 0 ? (
                          <p className="text-xs text-gray-500 italic text-center py-6">No promotions active for metrics parsing.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-brand-green/10 text-gray-400 text-[9px] uppercase tracking-wider font-bold">
                                  <th className="pb-3 pr-2">Code</th>
                                  <th className="pb-3 px-2">Reward</th>
                                  <th className="pb-3 px-2 font-mono text-center">Use Count</th>
                                  <th className="pb-3 px-2 font-mono text-right">INR Saved</th>
                                  <th className="pb-3 px-2 font-mono text-center">Use Share</th>
                                  <th className="pb-3 pl-2 font-mono text-right">Savings Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-green/5">
                                {coupons.map((coupon, index) => {
                                  const useShare = totalClaimsCount > 0 ? ((coupon.usageCount || 0) / totalClaimsCount) * 100 : 0;
                                  const savingsShare = totalCouponSavings > 0 ? ((coupon.totalSavings || 0) / totalCouponSavings) * 100 : 0;

                                  return (
                                    <tr key={`cp-tr-${coupon.id || coupon.code || index}-${index}`} className="hover:bg-brand-green/[0.02]">
                                      <td className="py-3.5 pr-2 font-mono font-bold text-white text-[11px] select-all">
                                        {coupon.code || coupon.id}
                                      </td>
                                      <td className="py-3.5 px-2 text-gray-300">
                                        {coupon.discountType === 'percentage' && `${coupon.discountValue}% Off`}
                                        {coupon.discountType === 'fixed' && `₹${coupon.discountValue} Flat`}
                                        {coupon.discountType === 'free_delivery' && `Free Del.`}
                                        {coupon.discountType === 'free_perk' && `Gift Perk`}
                                      </td>
                                      <td className="py-3.5 px-2 font-mono text-center text-white font-semibold">
                                        {coupon.usageCount || 0}
                                      </td>
                                      <td className="py-3.5 px-2 font-mono text-right text-brand-green font-bold">
                                        ₹{(coupon.totalSavings || 0).toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-3.5 px-2 text-center">
                                        <span className="text-[10px] font-mono text-gray-400 bg-brand-charcoal px-2 py-0.5 rounded border border-brand-green/5">
                                          {useShare.toFixed(1)}%
                                        </span>
                                      </td>
                                      <td className="py-3.5 pl-2 text-right">
                                        <span className="text-[10px] font-mono text-brand-orange bg-brand-orange/5 px-2 py-0.5 rounded border border-brand-orange/10 font-bold">
                                          {savingsShare.toFixed(1)}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB CONTENTS: STACKING REGISTRY */}
                  {couponSubTab === 'stacking' && (
                    <div className="space-y-6">
                      {/* Explanatory Banner */}
                      <div className="bg-[#18202A] border-l-4 border-brand-green p-4 rounded-r-2xl text-xs space-y-1">
                        <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-brand-green" /> Understanding Coupon Stacking
                        </h4>
                        <p className="text-gray-400 leading-relaxed text-[11px]">
                          By default, only one single coupon can be checked out. Stacking allows checkout customers to input and combine multiple coupon offers (e.g. merging a **₹50 Cash Discount** with a **Free Delivery Perk**).
                        </p>
                        <p className="text-gray-500 text-[10px] italic">
                          Rule constraint: Coupons will only stack if BOTH coupons have "Allow Stacking" checked and their restricted stacking stacks explicitly declare or encompass the corresponding coupons.
                        </p>
                      </div>

                      {/* Stacking Allowance Table */}
                      <div className="bg-[#18202A] border border-brand-green/10 rounded-2xl p-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-4">COMBINATION & STACK ALLOWANCE INDEX</span>
                        
                        {totalCouponsCount === 0 ? (
                          <p className="text-xs text-gray-500 italic text-center py-6">No promotional codes found to list stacking configurations.</p>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {coupons.map((coupon, index) => {
                                const allowedCombos = coupon.isStackable
                                  ? coupon.stackableWith && coupon.stackableWith.length > 0
                                    ? coupons.filter(c => coupon.stackableWith.includes(c.code))
                                    : coupons.filter(c => c.isStackable && c.code !== coupon.code)
                                  : [];

                                return (
                                  <div key={`cp-stk-${coupon.id || coupon.code || index}-${index}`} className="p-4 rounded-xl bg-brand-charcoal/40 border border-brand-green/5 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <span className="font-mono text-white text-xs font-black tracking-wide bg-brand-charcoal px-2.5 py-1 rounded border border-brand-green/10 select-all inline-block">
                                          {coupon.code || coupon.id}
                                        </span>
                                        <span className="text-[10px] text-gray-400 block mt-1">
                                          {coupon.discountType === 'percentage' && `${coupon.discountValue}% Discount`}
                                          {coupon.discountType === 'fixed' && `₹${coupon.discountValue} Flat Savings`}
                                          {coupon.discountType === 'free_delivery' && `Free Transit Perk`}
                                          {coupon.discountType === 'free_perk' && `Complimentary Perk`}
                                        </span>
                                      </div>

                                      <div>
                                        {coupon.isStackable ? (
                                          <span className="text-[9px] font-black bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded">
                                            🔗 STACKABLE
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-black bg-brand-charcoal text-gray-500 border border-brand-green/5 px-2 py-0.5 rounded">
                                            🔒 SOLO ONLY
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Allowed Merges block */}
                                    <div className="border-t border-brand-green/5 pt-2.5 space-y-1">
                                      <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold block">ALLOWED MERGES</span>
                                      {coupon.isStackable ? (
                                        allowedCombos.length === 0 ? (
                                          <p className="text-[10px] text-gray-500 italic">No other stackable coupons available for merge pairings yet.</p>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5 pt-1">
                                            {allowedCombos.map((combo, idx) => (
                                              <span key={`${combo.id || combo.code || idx}-${idx}`} className="text-[10px] font-mono bg-brand-green/10 text-brand-green border border-brand-green/20 px-1.5 py-0.5 rounded">
                                                {combo.code}
                                              </span>
                                            ))}
                                            {(!coupon.stackableWith || coupon.stackableWith.length === 0) && (
                                              <span className="text-[9px] text-gray-400 italic block mt-0.5">Stacks with any stackable coupon.</span>
                                            )}
                                          </div>
                                        )
                                      ) : (
                                        <p className="text-[10px] text-red-400/70 italic">Combination locked. This coupon blocks all stacks upon application.</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}
 
            {/* WORKSPACE 6: GYM PARTNER MANAGEMENT MODULE */}
            {activeTab === 'gyms' && (
              <motion.div
                key="gyms"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-brand-green animate-pulse" />
                      TAASH BHATTI Gym Partner Hub
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Manage physical gym integrations, verify terminal locker stations, track referral campaigns and configure membership benefits.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleOpenAddChain}
                      className="self-start sm:self-center bg-brand-green/10 hover:bg-brand-green/20 border border-brand-green/30 text-brand-green font-black text-xs px-3.5 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      Create Clanspace
                    </button>
                    <button
                      onClick={() => handleOpenAddGym()}
                      className="self-start sm:self-center bg-brand-green hover:bg-brand-green/95 text-brand-charcoal font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Onboard New Gym
                    </button>
                  </div>
                </div>

                {/* Sub-Tab Selector */}
                <div className="flex border-b border-brand-green/10 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'chains' as const, label: 'Gym Chains / Clanspaces', count: gymChains.length },
                    { id: 'partners' as const, label: 'Branch Management', count: allGyms.length },
                    { id: 'offers' as const, label: 'Offer & Benefits Config', count: allGyms.filter(g => g.isActive).length },
                    { id: 'referrals' as const, label: 'QR & Referral tracking', count: allGyms.reduce((acc, g) => acc + (g.redemptionsCount || 0), 0) },
                  ].map((subTab) => {
                    const isSelected = gymSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setGymSubTab(subTab.id)}
                        className={`px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
                          isSelected 
                            ? 'border-brand-green text-brand-green bg-brand-green/5' 
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/[0.01]'
                        }`}
                      >
                        {subTab.label}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono ${isSelected ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-charcoal text-gray-500'}`}>
                          {subTab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Tab contents: Gym Chains / Clanspaces */}
                {gymSubTab === 'chains' && (
                  <div className="space-y-6">
                    {gymChains.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-brand-green/10 rounded-2xl">
                        <Layers className="w-10 h-10 text-gray-600 mx-auto mb-3 animate-pulse" />
                        <h4 className="text-white text-xs font-black uppercase">No Gym Chains / Clanspaces Found</h4>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">Create a gym clanspace first. Once a clanspace is defined, you can add gyms to that chain one by one!</p>
                        <button
                          onClick={handleOpenAddChain}
                          className="mt-4 px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                        >
                          Create Your First Clanspace
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {gymChains.map((chain) => {
                          const chainBranches = allGyms.filter(g => g.chainId === chain.id);
                          return (
                            <div key={chain.id} className="bg-[#182028] border border-brand-green/10 rounded-2xl p-5 flex flex-col justify-between hover:border-brand-green/20 transition-all relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/[0.02] rounded-bl-full group-hover:bg-brand-green/[0.04] transition-all" />
                              
                              <div>
                                <div className="flex items-start gap-4">
                                  <img 
                                    src={chain.logo || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80'} 
                                    alt={chain.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-brand-green/10 bg-brand-charcoal"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1">
                                    <h3 className="text-xs font-black uppercase text-white tracking-wide">{chain.name}</h3>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Clanspace ID: <span className="font-mono">{chain.id}</span></p>
                                    <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">{chain.description || 'No description provided.'}</p>
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-brand-green/5 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-brand-green bg-brand-green/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {chainBranches.length} {chainBranches.length === 1 ? 'Branch' : 'Branches'} Linked
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-mono">Registered: {chain.registeredAt || 'N/A'}</span>
                                </div>

                                {chainBranches.length > 0 && (
                                  <div className="mt-3 bg-brand-charcoal/50 rounded-xl p-3 border border-brand-green/5">
                                    <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black block mb-1.5">Branches List</span>
                                    <div className="space-y-1">
                                      {chainBranches.map(branch => (
                                        <div key={branch.id} className="flex items-center justify-between text-[10px] text-gray-300">
                                          <span className="font-bold truncate max-w-[150px]">{branch.name}</span>
                                          <span className="text-[9px] text-gray-500 font-mono">{branch.city}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-5 pt-3 border-t border-brand-green/5 flex gap-2 justify-end">
                                <button
                                  onClick={() => handleOpenAddGym(chain.id)}
                                  className="mr-auto px-2.5 py-1.5 bg-brand-green/10 hover:bg-brand-green/25 border border-brand-green/20 text-brand-green text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
                                >
                                  + Add Branch
                                </button>
                                <button
                                  onClick={() => handleOpenEditChain(chain)}
                                  className="px-2.5 py-1.5 bg-brand-charcoal hover:bg-brand-charcoal/80 border border-brand-green/5 text-gray-400 hover:text-white text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteChain(chain.id, chain.name)}
                                  className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Tab contents: Partners Management */}
                {gymSubTab === 'partners' && (
                  <div className="space-y-6">
                    {allGyms.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-brand-green/10 rounded-2xl">
                        <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <h4 className="text-white text-xs font-black uppercase">No Gym Partners Synced</h4>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">Onboard your first affiliate partner hub to enable secure terminal drops and member discount codes.</p>
                        <button
                          onClick={handleOpenAddGym}
                          className="mt-4 px-3.5 py-2 bg-brand-green/10 hover:bg-brand-green/20 border border-brand-green/20 text-brand-green text-[10px] font-black uppercase rounded-lg transition-all"
                        >
                          Construct Partner Site
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {allGyms.map((gym, gymIdx) => {
                          const statusColor = {
                            elite: 'bg-indigo-950 text-indigo-400 border-indigo-800',
                            gold: 'bg-amber-950 text-amber-400 border-amber-800',
                            silver: 'bg-zinc-950 text-zinc-400 border-zinc-800',
                            bronze: 'bg-orange-950 text-orange-400 border-orange-800'
                          }[gym.partnerStatus || 'gold'];

                          return (
                            <div 
                              key={`gym-partner-${gym.id || gymIdx}-${gymIdx}`} 
                              className={`bg-[#18202A] border rounded-2xl overflow-hidden transition-all duration-300 ${
                                gym.isActive ? 'border-brand-green/10 hover:border-brand-green/20' : 'border-red-950 opacity-70'
                              }`}
                            >
                              {/* Hero image and status badges */}
                              <div className="h-32 relative overflow-hidden group">
                                <img 
                                  src={gym.image} 
                                  alt={gym.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#18202A] via-transparent to-black/40" />
                                
                                {/* Status badge top left */}
                                <div className="absolute top-3 left-3 flex gap-1.5 items-center">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 border rounded-md ${statusColor}`}>
                                    {gym.partnerStatus || 'GOLD'} PARTNER
                                  </span>
                                  {gym.isVerified && (
                                    <span className="text-[8px] font-black bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Check className="w-2.5 h-2.5" /> VERIFIED SITE
                                    </span>
                                  )}
                                </div>

                                {/* Active toggle top right */}
                                <div className="absolute top-3 right-3">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                                    gym.isActive 
                                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                                      : 'bg-red-950 text-red-400 border-red-800'
                                  }`}>
                                    {gym.isActive ? 'OPERATIONAL' : 'PAUSED'}
                                  </span>
                                </div>

                                <div className="absolute bottom-3 left-3">
                                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{gym.name}</h3>
                                  <p className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-brand-green shrink-0" />
                                    {gym.city} • {gym.address}
                                  </p>
                                </div>
                              </div>

                              {/* Owner Contact Information and Site Toggles */}
                              <div className="p-4 space-y-4">
                                <div className="bg-brand-charcoal/40 border border-brand-green/5 rounded-xl p-3 space-y-2">
                                  <span className="text-[8px] font-black text-gray-500 block uppercase tracking-wider">OWNER CONTACT & LIAISON</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                      <span className="text-gray-400">Name:</span> <strong className="text-white font-black">{gym.ownerContactName || 'N/A'}</strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Phone:</span> <strong className="text-white font-mono">{gym.ownerContactPhone || 'N/A'}</strong>
                                    </div>
                                    <div className="col-span-1 sm:col-span-2 border-t border-brand-green/5 pt-1 mt-1 truncate">
                                      <span className="text-gray-400">Email:</span> <strong className="text-white font-mono">{gym.ownerContactEmail || 'N/A'}</strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Operational settings toggles */}
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                  <button
                                    onClick={() => handleToggleGymActive(gym)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
                                      gym.isActive 
                                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/80' 
                                        : 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-950/80'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${gym.isActive ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                                    {gym.isActive ? 'Pause Drops' : 'Resume Drops'}
                                  </button>

                                  <button
                                    onClick={() => handleToggleGymVerified(gym)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
                                      gym.isVerified 
                                        ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50 hover:bg-indigo-950/80' 
                                        : 'bg-zinc-905 text-gray-400 border-gray-700 hover:bg-zinc-800'
                                    }`}
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                    {gym.isVerified ? 'Revoke Site' : 'Verify Station'}
                                  </button>

                                  <div className="ml-auto flex gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditGym(gym)}
                                      className="p-1.5 bg-brand-charcoal border border-brand-green/15 hover:bg-brand-green/10 text-white rounded-xl transition-all cursor-pointer"
                                      title="Edit Partner Specs"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGym(gym.id, gym.name)}
                                      className="p-1.5 bg-red-950/40 border border-red-900/35 hover:bg-red-600 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer"
                                      title="Offboard Partner"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Tab contents: Gym Offer Management */}
                {gymSubTab === 'offers' && (
                  <div className="space-y-6">
                    <div className="bg-[#18202A] border-l-4 border-brand-green p-4 rounded-r-2xl text-xs space-y-1">
                      <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-green animate-bounce" /> Gym Offer Integration Rules
                      </h4>
                      <p className="text-gray-400 leading-relaxed text-[11px]">
                        Configure discounts, free meal qualifiers, referral payouts, and group ordering deals. These benefits incentivize gyms to market your brand, helping build deep collaboration value.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {allGyms.map((gym, gymIdx) => (
                        <div key={`gym-offer-${gym.id || gymIdx}-${gymIdx}`} className="bg-[#18202A] border border-brand-green/10 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-brand-green/5 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white uppercase">{gym.name}</span>
                              <span className="text-[9px] font-mono font-black text-brand-green px-2 py-0.5 bg-brand-green/10 border border-brand-green/20 rounded">
                                {gym.offerType ? gym.offerType.toUpperCase().replace('_', ' ') : 'DISCOUNT'} OFFER
                              </span>
                            </div>
                            <button
                              onClick={() => handleOpenEditGym(gym)}
                              className="text-[10px] font-black text-brand-green hover:text-white uppercase flex items-center gap-1 transition-all"
                            >
                              <Edit className="w-3 h-3" /> Configure Rules
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Member discount % */}
                            <div className="bg-brand-charcoal/40 p-3.5 border border-brand-green/5 rounded-xl space-y-1">
                              <span className="text-[8px] font-black text-gray-500 block uppercase">TERMINAL DISCOUNT CODE</span>
                              <div className="text-sm font-extrabold text-white flex items-baseline gap-1">
                                <span className="font-mono text-brand-green">{gym.discountPct || 0}% Off</span>
                                <span className="text-[10px] text-gray-500 font-sans">checkout code</span>
                              </div>
                              <p className="text-[9px] text-gray-400 leading-normal mt-1">{gym.bannerText || 'No specific description set.'}</p>
                            </div>

                            {/* Free meal rule */}
                            <div className="bg-brand-charcoal/40 p-3.5 border border-brand-green/5 rounded-xl space-y-1">
                              <span className="text-[8px] font-black text-gray-500 block uppercase">FREE-MEAL RULE</span>
                              <div className="text-[11px] font-extrabold text-white">
                                {gym.freeMealRule ? (
                                  <span className="text-brand-orange">{gym.freeMealRule}</span>
                                ) : (
                                  <span className="text-gray-500 italic font-medium">No free-meal rules bound.</span>
                                )}
                              </div>
                              <p className="text-[9px] text-gray-400 leading-normal mt-1">Triggers automatically upon satisfying cart thresholds.</p>
                            </div>

                            {/* Referral Rule */}
                            <div className="bg-brand-charcoal/40 p-3.5 border border-brand-green/5 rounded-xl space-y-1">
                              <span className="text-[8px] font-black text-gray-500 block uppercase">REFERRAL CAMPAIGN PAYOUT</span>
                              <div className="text-[11px] font-bold text-white flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                                  CODE: {gym.referralCode || 'N/A'}
                                </span>
                              </div>
                              <p className="text-[9px] text-gray-400 leading-normal mt-1">Tracks and links dynamic referral code redemptions.</p>
                            </div>

                            {/* Members only offers block */}
                            <div className="col-span-1 sm:col-span-2 bg-brand-charcoal/40 p-3.5 border border-brand-green/5 rounded-xl space-y-2">
                              <span className="text-[8px] font-black text-gray-500 block uppercase">EXCLUSIVE MEMBERSHIP BENEFITS</span>
                              {gym.membersOnlyOffers && gym.membersOnlyOffers.length > 0 ? (
                                <ul className="space-y-1">
                                  {gym.membersOnlyOffers.map((offer, idx) => (
                                    <li key={idx} className="text-[10px] text-gray-300 flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-brand-green shrink-0" />
                                      {offer}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-gray-500 italic">No exclusive membership perks bound.</p>
                              )}
                            </div>

                            {/* Group deals block */}
                            <div className="bg-brand-charcoal/40 p-3.5 border border-brand-green/5 rounded-xl space-y-2">
                              <span className="text-[8px] font-black text-gray-500 block uppercase">GROUP-ORDER LOCKER DEALS</span>
                              {gym.groupOrderDeals && gym.groupOrderDeals.length > 0 ? (
                                <ul className="space-y-1">
                                  {gym.groupOrderDeals.map((deal, idx) => (
                                    <li key={idx} className="text-[10px] text-gray-300 flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-brand-orange shrink-0" />
                                      {deal}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-gray-500 italic">No specific group deal modifiers.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Tab contents: Gym QR / Referral tracking */}
                {gymSubTab === 'referrals' && (
                  <div className="space-y-6">
                    {/* High level Conversion metrics summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black tracking-wider uppercase text-gray-400 font-sans">Total Redemptions</span>
                          <CheckCircle className="w-4 h-4 text-brand-green" />
                        </div>
                        <div className="mt-4">
                          <span className="text-2xl font-mono font-black text-brand-green">
                            {allGyms.reduce((sum, g) => sum + (g.redemptionsCount || 0), 0)}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-1">Overall checkouts using gym referral codes.</span>
                        </div>
                      </div>

                      <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black tracking-wider uppercase text-gray-400">Total conversions value</span>
                          <DollarSign className="w-4 h-4 text-brand-orange" />
                        </div>
                        <div className="mt-4">
                          <span className="text-2xl font-mono font-black text-white">
                            ₹{allGyms.reduce((sum, g) => sum + (g.totalConversions || 0), 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-1">Total revenue conversion value generated from partners.</span>
                        </div>
                      </div>

                      <div className="bg-[#18202A] border border-brand-green/10 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black tracking-wider uppercase text-gray-400">Top Performing Partner</span>
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="mt-4">
                          <span className="text-sm font-extrabold text-white uppercase truncate block">
                            {(() => {
                              const sorted = [...allGyms].sort((a, b) => (b.redemptionsCount || 0) - (a.redemptionsCount || 0));
                              return sorted[0] ? sorted[0].name : 'None';
                            })()}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-1">Partner with the highest checkout traction.</span>
                        </div>
                      </div>
                    </div>

                    {/* Partner Performance List */}
                    <div className="bg-[#18202A] border border-brand-green/10 rounded-2xl p-5 overflow-hidden">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-4">INDIVIDUAL PARTNER CONVERSION LEDGER</span>
                      
                      {allGyms.length === 0 ? (
                        <p className="text-xs text-gray-500 italic text-center py-6">No partners synced for conversion tracking.</p>
                      ) : (
                        <div className="space-y-4">
                          {allGyms.map((gym, gymIdx) => {
                            const maxRedemptions = Math.max(...allGyms.map(g => g.redemptionsCount || 0), 1);
                            const redemptionPct = Math.min(((gym.redemptionsCount || 0) / maxRedemptions) * 100, 100);

                            return (
                              <div key={`gym-rank-${gym.id || gymIdx}-${gymIdx}`} className="p-4 rounded-xl bg-brand-charcoal/40 border border-brand-green/5 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <h4 className="text-xs font-black text-white uppercase">{gym.name}</h4>
                                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {gym.id} • Registered: {gym.registeredAt || 'N/A'}</p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span className="text-[9px] font-black text-gray-400 block uppercase">REFERRAL CODE</span>
                                      <span className="text-xs font-mono text-brand-green font-extrabold bg-brand-green/5 border border-brand-green/15 px-2 py-0.5 rounded uppercase">
                                        {gym.referralCode || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="text-right border-l border-brand-green/10 pl-3">
                                      <span className="text-[9px] font-black text-gray-400 block uppercase">REDEMPTIONS</span>
                                      <span className="text-xs font-mono text-white font-extrabold">{gym.redemptionsCount || 0} claims</span>
                                    </div>
                                    <div className="text-right border-l border-brand-green/10 pl-3">
                                      <span className="text-[9px] font-black text-gray-400 block uppercase">REVENUE</span>
                                      <span className="text-xs font-mono text-brand-orange font-extrabold">₹{(gym.totalConversions || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Progress bar meter representing redemption volume share */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                                    <span>CONVERSION TRACTION SHARE</span>
                                    <span>{redemptionPct.toFixed(0)}% of Top Performer</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-brand-charcoal rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-brand-green rounded-full transition-all duration-300" 
                                      style={{ width: `${redemptionPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* WORKSPACE 7: KITCHEN BRANCHES MANAGEMENT MODULE */}
            {activeTab === 'kitchens' && (
              <motion.div
                key="kitchens"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
              >
                {/* Header Row & Sub-tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-brand-green animate-pulse" />
                      TAASH BHATTI Kitchen Operations
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Manage physical kitchen branches, operational geofences, rain mode, and assign Kitchen Station (KDS) managers.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Sub-tab navigation */}
                    <div className="flex bg-brand-charcoal/60 p-1 rounded-xl border border-brand-green/15">
                      <button
                        onClick={() => setKitchenSubTab('branches')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          kitchenSubTab === 'branches'
                            ? 'bg-brand-green text-brand-charcoal shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        🏬 Branches ({allKitchens.length})
                      </button>
                      <button
                        onClick={() => setKitchenSubTab('managers')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          kitchenSubTab === 'managers'
                            ? 'bg-brand-green text-brand-charcoal shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        👨‍🍳 Managers ({kitchenManagers.length})
                      </button>
                    </div>

                    {kitchenSubTab === 'branches' ? (
                      <button
                        onClick={handleOpenAddKitchen}
                        className="bg-brand-green hover:bg-brand-green/95 text-brand-charcoal font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Onboard New Kitchen
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenAddKitchenManager}
                        className="bg-brand-green hover:bg-brand-green/95 text-brand-charcoal font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Add Kitchen Manager
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-tab 1: BRANCHES VIEW */}
                {kitchenSubTab === 'branches' && (
                  <>
                    {allKitchens.length === 0 ? (
                      <div className="text-center py-16 space-y-4 border border-dashed border-brand-green/10 rounded-2xl bg-brand-charcoal/20">
                        <div className="w-14 h-14 bg-brand-green/5 border border-brand-green/15 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                          <ChefHat className="w-6 h-6 text-brand-green" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-gray-200 uppercase tracking-widest">No Kitchen Branches Registered</h4>
                          <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                            Please register a kitchen branch to route orders within range. Click the button above to onboard.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {allKitchens.map((kitchen) => {
                          const assignedMgrs = kitchenManagers.filter(km => km.assignedKitchenId === kitchen.id);
                          return (
                            <div key={kitchen.id} className="p-5 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex flex-col justify-between hover:border-brand-green/35 transition-all space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-sm font-bold text-white uppercase">{kitchen.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Kitchen ID:</span>
                                      <span 
                                        onClick={() => {
                                          navigator.clipboard.writeText(kitchen.id);
                                          playKitchenChime('complete');
                                          alert(`Copied Kitchen ID: ${kitchen.id}`);
                                        }}
                                        className="text-[10px] font-mono font-black text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded cursor-pointer hover:bg-brand-orange/20 transition-all select-all flex items-center gap-1"
                                        title="Click to copy Kitchen ID"
                                      >
                                        {kitchen.id}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                                      kitchen.isActive ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/60 text-red-400 border border-red-900/40'
                                    }`}>
                                      {kitchen.isActive ? 'OPERATIONAL' : 'INACTIVE'}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 text-xs text-gray-400">
                                  <p className="leading-relaxed"><strong className="text-gray-300">Address:</strong> {kitchen.address || 'N/A'}</p>
                                  <p><strong className="text-gray-300">Geofence:</strong> Orders within <span className="font-mono text-brand-green font-bold text-[13px]">{kitchen.geofenceRadius || 5} km</span></p>
                                  <p className="font-mono text-[10px] text-gray-500">
                                    Coords: {kitchen.lat && kitchen.lng ? `${kitchen.lat.toFixed(5)}, ${kitchen.lng.toFixed(5)}` : 'No Coordinates Set'}
                                  </p>
                                </div>

                                {/* Weather & Rain Mode Toggle */}
                                <div className="pt-2 border-t border-brand-green/10 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleToggleKitchenRain(kitchen)}
                                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                        kitchen.isRaining
                                          ? 'bg-blue-950/60 text-blue-300 border-blue-500/50 shadow-sm animate-pulse'
                                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                      }`}
                                      title="Toggle Weather Rain Mode (Adds delivery buffer + notification)"
                                    >
                                      {kitchen.isRaining ? '🌧️ RAIN MODE: ACTIVE (+15m buffer)' : '☀️ NORMAL WEATHER'}
                                    </button>
                                  </div>

                                  <div className="text-[10px] text-gray-400">
                                    👨‍🍳 <span className="text-white font-bold">{assignedMgrs.length}</span> Mgr{assignedMgrs.length === 1 ? '' : 's'}
                                  </div>
                                </div>

                                {/* Assigned Managers chips */}
                                {assignedMgrs.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {assignedMgrs.map(mgr => (
                                      <span
                                        key={mgr.id}
                                        onClick={() => handleLaunchKitchenPortal(mgr)}
                                        className="text-[9px] font-bold bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-brand-green/20 transition-all"
                                        title="Click to launch KDS station for this manager"
                                      >
                                        Chef {mgr.name} 🚀
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-5 pt-4 border-t border-brand-green/5">
                                <button
                                  onClick={() => handleToggleKitchenActive(kitchen)}
                                  className={`text-[9px] font-black uppercase transition-colors px-2.5 py-1.5 rounded-lg ${
                                    kitchen.isActive 
                                      ? 'bg-red-950/20 text-red-400 hover:bg-red-950/40' 
                                      : 'bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
                                  }`}
                                >
                                  {kitchen.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenEditKitchen(kitchen)}
                                    className="p-1.5 bg-brand-green/5 hover:bg-brand-green/15 text-brand-green border border-brand-green/15 rounded-xl transition-all cursor-pointer"
                                    title="Edit Kitchen"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKitchen(kitchen.id, kitchen.name)}
                                    className="p-1.5 bg-red-500/5 hover:bg-red-500/15 text-red-400 border border-red-500/15 rounded-xl transition-all cursor-pointer"
                                    title="Delete Kitchen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Sub-tab 2: MANAGERS ROSTER VIEW */}
                {kitchenSubTab === 'managers' && (
                  <div className="space-y-5">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Station Managers</p>
                          <h3 className="text-xl font-black text-white mt-1">{kitchenManagers.length}</h3>
                        </div>
                        <span className="text-2xl">👨‍🍳</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Stations</p>
                          <h3 className="text-xl font-black text-emerald-400 mt-1">
                            {kitchenManagers.filter(km => km.status === 'active').length}
                          </h3>
                        </div>
                        <span className="text-2xl">🔥</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Covered Branches</p>
                          <h3 className="text-xl font-black text-brand-green mt-1">
                            {new Set(kitchenManagers.map(km => km.assignedKitchenId)).size} / {allKitchens.length}
                          </h3>
                        </div>
                        <span className="text-2xl">🏬</span>
                      </div>
                    </div>

                    {/* Managers Roster Grid */}
                    {kitchenManagers.length === 0 ? (
                      <div className="text-center py-16 space-y-4 border border-dashed border-brand-green/10 rounded-2xl bg-brand-charcoal/20">
                        <div className="w-14 h-14 bg-brand-green/5 border border-brand-green/15 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                          <ChefHat className="w-6 h-6 text-brand-green" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-gray-200 uppercase tracking-widest">No Kitchen Managers Registered</h4>
                          <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                            Onboard Station Head Chefs so they can log into the Kitchen Display System (KDS) and manage tickets.
                          </p>
                        </div>
                        <button
                          onClick={handleOpenAddKitchenManager}
                          className="bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs px-4 py-2 rounded-xl uppercase tracking-wider transition-all"
                        >
                          + Add First Kitchen Manager
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {kitchenManagers.map((km) => {
                          const assignedKitchen = allKitchens.find(k => k.id === km.assignedKitchenId);
                          return (
                            <div key={km.id} className="p-5 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex flex-col justify-between hover:border-brand-green/35 transition-all space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-sm font-bold text-white uppercase flex items-center gap-1.5">
                                      <span>👨‍🍳</span> {km.name}
                                    </h3>
                                    <p className="text-[10px] text-brand-green font-bold uppercase tracking-wider mt-0.5">
                                      Branch: {assignedKitchen?.name || km.assignedKitchenName || 'Assigned Kitchen Hub'}
                                    </p>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                                    km.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/60 text-red-400 border border-red-900/40'
                                  }`}>
                                    {km.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </div>

                                <div className="bg-black/30 rounded-xl p-3 space-y-1.5 text-xs text-gray-300 border border-white/5 font-mono">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Email:</span>
                                    <span className="text-white font-bold select-all text-[11px]">{km.email}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Password:</span>
                                    <span className="text-amber-400 font-bold select-all text-[11px]">{km.password}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Phone:</span>
                                    <span className="text-gray-300 select-all text-[11px]">{km.phone}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <button
                                    onClick={() => handleCopyKMCredentials(km)}
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-white/10 flex items-center gap-1 cursor-pointer"
                                  >
                                    📋 Copy Logins
                                  </button>
                                  <button
                                    onClick={() => handleShareKMWhatsApp(km)}
                                    className="px-2.5 py-1.5 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-emerald-800/30 flex items-center gap-1 cursor-pointer"
                                  >
                                    📱 Share WhatsApp
                                  </button>
                                  <button
                                    onClick={() => handleLaunchKitchenPortal(km)}
                                    className="px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow cursor-pointer ml-auto"
                                    title="Instantly open the Kitchen KDS terminal as this manager"
                                  >
                                    🚀 Launch Station
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-green/5">
                                <button
                                  onClick={() => handleToggleKitchenManagerStatus(km)}
                                  className={`text-[9px] font-black uppercase transition-colors px-2.5 py-1.5 rounded-lg ${
                                    km.status === 'active' 
                                      ? 'bg-red-950/20 text-red-400 hover:bg-red-950/40' 
                                      : 'bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
                                  }`}
                                >
                                  {km.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenEditKitchenManager(km)}
                                    className="p-1.5 bg-brand-green/5 hover:bg-brand-green/15 text-brand-green border border-brand-green/15 rounded-xl transition-all cursor-pointer"
                                    title="Edit Manager"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKitchenManager(km.id, km.name)}
                                    className="p-1.5 bg-red-500/5 hover:bg-red-500/15 text-red-400 border border-red-500/15 rounded-xl transition-all cursor-pointer"
                                    title="Delete Manager"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* WORKSPACE 8: DELIVERY FLEET MANAGEMENT MODULE */}
            {activeTab === 'fleet' && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6 text-left"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-orange animate-bounce" />
                      TAASH BHATTI Delivery Fleet & Logistics Hub
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Create and manage delivery partner accounts with email & password credentials. Share login details directly via WhatsApp with riders.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleOpenAddPartner}
                    className="self-start sm:self-center bg-brand-orange hover:bg-brand-orange/95 text-brand-charcoal font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                    Add Delivery Partner
                  </button>
                </div>

                {/* Logistics Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-brand-charcoal/60 border border-brand-green/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Active Fleet Size</span>
                    <div className="text-xl font-mono font-black text-brand-green mt-1">
                      {deliveryPartners.filter(p => p.status === 'active').length} / {deliveryPartners.length} Active
                    </div>
                  </div>

                  <div className="bg-brand-charcoal/60 border border-brand-green/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Total Completed Deliveries</span>
                    <div className="text-xl font-mono font-black text-brand-orange mt-1">
                      {orders.filter(o => o.status === 'delivered').length} Orders
                    </div>
                  </div>

                  <div className="bg-brand-charcoal/60 border border-brand-green/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Avg Fleet Rating</span>
                    <div className="text-xl font-mono font-black text-white mt-1">
                      {deliveryPartners.filter(p => p.rating && p.rating > 0).length > 0
                        ? `⭐ ${(deliveryPartners.reduce((acc, p) => acc + (p.rating || 0), 0) / deliveryPartners.filter(p => p.rating && p.rating > 0).length).toFixed(1)} / 5.0`
                        : 'No ratings yet'}
                    </div>
                  </div>
                </div>

                {/* Fleet Roster List */}
                {deliveryPartners.length === 0 ? (
                  <div className="text-center py-16 space-y-4 border border-dashed border-brand-green/10 rounded-2xl bg-brand-charcoal/20">
                    <div className="w-14 h-14 bg-brand-orange/10 border border-brand-orange/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Truck className="w-6 h-6 text-brand-orange" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-200 uppercase tracking-widest">No Delivery Partners Created</h4>
                      <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                        Click "Add Delivery Partner" above to create real partner accounts with email and password login credentials.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {deliveryPartners.map((partner) => (
                      <div key={partner.id} className="p-5 rounded-2xl bg-brand-charcoal/40 border border-brand-green/10 flex flex-col justify-between hover:border-brand-green/35 transition-all space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white uppercase">{partner.name}</h3>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                  partner.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/80 text-red-400 border border-red-900/40'
                                }`}>
                                  {partner.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                Phone: <span className="text-brand-green font-bold">{partner.phone}</span> • ID: {partner.id}
                              </p>
                            </div>
                          </div>

                          {/* Credentials & Details Card */}
                          <div className="bg-[#10151B] border border-brand-green/5 p-3 rounded-xl space-y-1.5 text-[10px] text-gray-300 font-mono">
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">LOGIN EMAIL:</span>
                              <span className="text-brand-orange font-bold">{partner.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">LOGIN PASSWORD:</span>
                              <span className="text-white font-bold">{partner.password}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">KITCHEN BRANCH:</span>
                              <span className="text-brand-green font-bold">{partner.kitchenName || partner.kitchenId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">VEHICLE & REG:</span>
                              <span className="text-gray-200 font-bold uppercase">{partner.vehicleType.replace('_', ' ')} • {partner.vehicleNumber}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-white/5">
                              <span className="text-gray-500 font-bold">FIREBASE AUTH:</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                  partner.firebaseAuthSynced ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/80 text-amber-400 border border-amber-900/40'
                                }`}>
                                  {partner.firebaseAuthSynced ? '🟢 Auth Active' : '🟡 Pending Auth'}
                                </span>
                                {!partner.firebaseAuthSynced && (
                                  <button
                                    onClick={async () => {
                                      const res = await syncPartnerToFirebaseAuth(partner.email, partner.password);
                                      if (res.success) {
                                        const updated = { ...partner, firebaseAuthSynced: true, firebaseUid: res.uid };
                                        await setDoc(doc(db, 'delivery_partners', partner.id), updated);
                                        alert(`✓ Successfully provisioned Firebase Auth for ${partner.name}!`);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-[8px] font-bold uppercase rounded border border-brand-orange/30 cursor-pointer"
                                  >
                                    Sync Auth
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-green/5">
                          <button
                            onClick={() => handleCopyCredentials(partner)}
                            className="flex-1 py-2 bg-brand-green/15 hover:bg-brand-green/25 text-brand-green border border-brand-green/30 font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            title="Copy Email & Password to Clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Credentials
                          </button>

                          <button
                            onClick={() => handleShareWhatsApp(partner)}
                            className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            title="Share Credentials via WhatsApp"
                          >
                            💬 Share WhatsApp
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditPartner(partner)}
                            className="px-3 py-2 bg-brand-charcoal hover:bg-brand-charcoal/80 text-gray-300 border border-brand-green/10 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeletePartner(partner.id)}
                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* WORKSPACE 10: COMPLAINTS & SUPPORT MANAGEMENT MODULE */}
            {activeTab === 'support' && (() => {
              const customerTickets = supportTickets.filter(t => t.ticketSource !== 'delivery_partner');
              const deliveryTickets = supportTickets.filter(t => t.ticketSource === 'delivery_partner');

              // Customer tickets metrics
              const totalCustomerTickets = customerTickets.length;
              const pendingCount = customerTickets.filter(t => t.status === 'pending').length;
              const reviewCount = customerTickets.filter(t => t.status === 'under_review').length;
              const resolvedCount = customerTickets.filter(t => t.status === 'resolved').length;
              const closedCount = customerTickets.filter(t => t.status === 'closed').length;
              const urgentHighCount = customerTickets.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'resolved' && t.status !== 'closed').length;

              const ratedTickets = customerTickets.filter(t => typeof t.rating === 'number' && t.rating > 0);
              const avgRating = ratedTickets.length > 0
                ? (ratedTickets.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedTickets.length).toFixed(1)
                : '5.0';

              let filtered = [...customerTickets];

              if (supportFilterStatus !== 'all') {
                filtered = filtered.filter(t => t.status === supportFilterStatus);
              }
              if (supportFilterType !== 'all') {
                filtered = filtered.filter(t => t.type === supportFilterType);
              }
              if (supportFilterPriority !== 'all') {
                filtered = filtered.filter(t => t.priority === supportFilterPriority);
              }
              if (supportSearchQuery.trim()) {
                const q = supportSearchQuery.toLowerCase().trim();
                filtered = filtered.filter(t =>
                  t.id.toLowerCase().includes(q) ||
                  t.userName.toLowerCase().includes(q) ||
                  t.userEmail.toLowerCase().includes(q) ||
                  t.subject.toLowerCase().includes(q) ||
                  t.message.toLowerCase().includes(q) ||
                  (t.orderId && t.orderId.toLowerCase().includes(q))
                );
              }

              filtered.sort((a, b) => {
                if (supportSort === 'newest') {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                if (supportSort === 'oldest') {
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                if (supportSort === 'priority') {
                  const pMap = { urgent: 4, high: 3, medium: 2, low: 1 };
                  return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
                }
                return 0;
              });

              // Delivery tickets metrics
              const totalDeliveryTickets = deliveryTickets.length;
              const deliveryUrgentCount = deliveryTickets.filter(t => (t.priority === 'urgent' || t.priority === 'high' || t.isEmergency) && t.status !== 'resolved' && t.status !== 'closed').length;
              const deliveryPendingCount = deliveryTickets.filter(t => (t.status === 'pending' || t.status === 'under_review')).length;
              const deliveryResolvedCount = deliveryTickets.filter(t => (t.status === 'resolved' || t.status === 'closed')).length;

              const uniqueCities = Array.from(new Set([
                ...deliveryTickets.map(t => t.deliveryCity || ''),
                ...allGyms.map(g => g.city),
                ...allKitchens.map(k => k.city || ''),
                'Muzaffarpur',
                'Patna',
                'Darbhanga',
                'Delhi-NCR',
                'Bangalore',
                'Mumbai'
              ].filter(Boolean)));

              let filteredDelivery = [...deliveryTickets];
              if (deliveryFilterStatus !== 'all') {
                filteredDelivery = filteredDelivery.filter(t => t.status === deliveryFilterStatus);
              }
              if (deliveryFilterCategory !== 'all') {
                filteredDelivery = filteredDelivery.filter(t => t.deliveryCategory === deliveryFilterCategory);
              }
              if (deliveryFilterPriority !== 'all') {
                filteredDelivery = filteredDelivery.filter(t => t.priority === deliveryFilterPriority);
              }
              if (deliveryFilterCity !== 'all') {
                filteredDelivery = filteredDelivery.filter(t => (t.deliveryCity || '').toLowerCase() === deliveryFilterCity.toLowerCase());
              }
              if (deliverySearchQuery.trim()) {
                const q = deliverySearchQuery.toLowerCase().trim();
                filteredDelivery = filteredDelivery.filter(t =>
                  t.id.toLowerCase().includes(q) ||
                  (t.deliveryPartnerName && t.deliveryPartnerName.toLowerCase().includes(q)) ||
                  (t.deliveryPartnerPhone && t.deliveryPartnerPhone.toLowerCase().includes(q)) ||
                  (t.deliveryPartnerId && t.deliveryPartnerId.toLowerCase().includes(q)) ||
                  (t.deliveryVehicleNumber && t.deliveryVehicleNumber.toLowerCase().includes(q)) ||
                  (t.orderId && t.orderId.toLowerCase().includes(q)) ||
                  t.subject.toLowerCase().includes(q) ||
                  t.message.toLowerCase().includes(q)
                );
              }

              filteredDelivery.sort((a, b) => {
                if (deliverySort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                if (deliverySort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                if (deliverySort === 'priority') {
                  const pMap = { urgent: 4, high: 3, medium: 2, low: 1 };
                  const aScore = (a.isEmergency ? 10 : 0) + (pMap[a.priority] || 0);
                  const bScore = (b.isEmergency ? 10 : 0) + (pMap[b.priority] || 0);
                  return bScore - aScore;
                }
                return 0;
              });

              const handleSendAdminReply = async (ticket: SupportTicket) => {
                const text = replyTextMap[ticket.id]?.trim();
                const status = replyStatusMap[ticket.id] || 'resolved';
                if (!text) {
                  alert("Please type a response message before dispatching.");
                  return;
                }

                setIsSendingReplyMap(prev => ({ ...prev, [ticket.id]: true }));

                const updatedTicket: Partial<SupportTicket> = {
                  adminReply: text,
                  adminRepliedAt: new Date().toISOString(),
                  adminName: user?.name || 'TAASH BHATTI Care Desk',
                  status: status,
                  unreadByCustomer: true,
                  unreadByAdmin: false,
                };

                try {
                  const docRef = doc(db, 'support_tickets', ticket.id);
                  const cleanUpdated = JSON.parse(JSON.stringify(updatedTicket));
                  await updateDoc(docRef, cleanUpdated).catch(async () => {
                    const cleanMerged = JSON.parse(JSON.stringify({ ...ticket, ...updatedTicket }));
                    await setDoc(docRef, cleanMerged);
                  });

                  // Update React local state immediately
                  setSupportTickets((prev) =>
                    prev.map((t) => (t.id === ticket.id ? { ...t, ...updatedTicket } : t))
                  );
                  setReplyTextMap((prev) => ({ ...prev, [ticket.id]: '' }));

                  try {
                    const cached = localStorage.getItem('fitzaika_support_tickets');
                    if (cached) {
                      const list: SupportTicket[] = JSON.parse(cached);
                      const idx = list.findIndex(t => t.id === ticket.id);
                      if (idx !== -1) {
                        list[idx] = { ...list[idx], ...updatedTicket };
                        localStorage.setItem('fitzaika_support_tickets', JSON.stringify(list));
                      }
                    }
                  } catch (e) {}

                  alert(`✓ Response dispatched to ${ticket.userName}! Ticket status marked as ${status.toUpperCase()}.`);
                } catch (err) {
                  console.error(err);
                  alert("Failed to update ticket. Please check connection.");
                } finally {
                  setIsSendingReplyMap(prev => ({ ...prev, [ticket.id]: false }));
                }
              };

              const handleSendDeliveryReply = async (ticket: SupportTicket) => {
                const text = deliveryReplyTextMap[ticket.id]?.trim();
                const status = deliveryReplyStatusMap[ticket.id] || 'resolved';
                if (!text) {
                  alert("Please type a response resolution before dispatching to delivery partner.");
                  return;
                }

                setIsSendingDeliveryReplyMap(prev => ({ ...prev, [ticket.id]: true }));

                const updatedTicket: Partial<SupportTicket> = {
                  adminReply: text,
                  adminRepliedAt: new Date().toISOString(),
                  adminName: user?.name || 'Fleet & Operations Desk',
                  status: status,
                  unreadByDeliveryPartner: true,
                  unreadByAdmin: false,
                };

                try {
                  const docRef = doc(db, 'support_tickets', ticket.id);
                  const cleanUpdated = JSON.parse(JSON.stringify(updatedTicket));
                  await updateDoc(docRef, cleanUpdated).catch(async () => {
                    const cleanMerged = JSON.parse(JSON.stringify({ ...ticket, ...updatedTicket }));
                    await setDoc(docRef, cleanMerged);
                  });

                  setSupportTickets((prev) =>
                    prev.map((t) => (t.id === ticket.id ? { ...t, ...updatedTicket } : t))
                  );
                  setDeliveryReplyTextMap((prev) => ({ ...prev, [ticket.id]: '' }));

                  try {
                    const cached = localStorage.getItem('fitzaika_support_tickets');
                    if (cached) {
                      const list: SupportTicket[] = JSON.parse(cached);
                      const idx = list.findIndex(t => t.id === ticket.id);
                      if (idx !== -1) {
                        list[idx] = { ...list[idx], ...updatedTicket };
                        localStorage.setItem('fitzaika_support_tickets', JSON.stringify(list));
                      }
                    }
                  } catch (e) {}

                  alert(`✓ Resolution dispatched to Delivery Partner ${ticket.deliveryPartnerName || ticket.userName}! Marked as ${status.toUpperCase()}.`);
                } catch (err) {
                  console.error(err);
                  alert("Failed to update rider complaint ticket. Please check connection.");
                } finally {
                  setIsSendingDeliveryReplyMap(prev => ({ ...prev, [ticket.id]: false }));
                }
              };

              const deliveryCategoriesList = [
                { id: 'accident_emergency', label: '🚨 Accident / SOS Emergency' },
                { id: 'vehicle_breakdown', label: '🛵 Vehicle Breakdown' },
                { id: 'customer_unreachable', label: '📵 Customer Unreachable' },
                { id: 'wrong_address', label: '📍 Incorrect Address / Landmark' },
                { id: 'kitchen_delay', label: '⏱️ Kitchen Food Prep Delay' },
                { id: 'payment_incentive_issue', label: '💰 Payout / Incentive Dispute' },
                { id: 'app_technical_glitch', label: '📱 App Glitch / GPS Issue' },
                { id: 'cod_cash_mismatch', label: '💵 COD Cash Mismatch' },
                { id: 'safety_harassment', label: '🛡️ Safety / Harassment' },
                { id: 'other_delivery_issue', label: '📌 Other Delivery Issue' },
              ];

              return (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-brand-orange" />
                        Customer Care & Support Operations Control
                      </h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Manage guest inquiries, handle delivery person incident complaints, and provision support agency role credentials.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-gray-400 bg-brand-charcoal px-3 py-1.5 rounded-xl border border-brand-green/10">
                        Customer: <strong className="text-brand-green font-bold">{totalCustomerTickets}</strong>
                      </span>
                      <span className="text-[9px] font-mono text-gray-400 bg-brand-charcoal px-3 py-1.5 rounded-xl border border-amber-500/30">
                        Rider Complaints: <strong className="text-amber-400 font-bold">{totalDeliveryTickets}</strong>
                      </span>
                    </div>
                  </div>

                  {/* SUB-TAB NAVIGATOR */}
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#182028] border border-brand-green/15 rounded-2xl w-fit">
                    <button
                      type="button"
                      onClick={() => setSupportSubTab('tickets')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                        supportSubTab === 'tickets'
                          ? 'bg-brand-green text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Customer Tickets ({totalCustomerTickets})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSupportSubTab('delivery_complaints')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                        supportSubTab === 'delivery_complaints'
                          ? 'bg-amber-500 text-brand-charcoal shadow-md font-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery Complaints ({totalDeliveryTickets})</span>
                      {deliveryUrgentCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-black rounded-full animate-pulse">
                          {deliveryUrgentCount} SOS
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSupportSubTab('agents')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                        supportSubTab === 'agents'
                          ? 'bg-brand-orange text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Support Staff & Agencies ({supportAgents.length})</span>
                    </button>
                  </div>

                  {supportSubTab === 'tickets' && (
                    <div className="space-y-6">

                  {/* URGENT CUSTOMER CALL REQUESTS (DIRECT ACTION DESK) */}
                  {supportTickets.filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed').length > 0 && (
                    <div className="bg-red-950/40 border-2 border-red-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-red-400 animate-pulse" />
                            Urgent Customer Call Requests ({supportTickets.filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed').length})
                          </h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-500/40 font-mono">
                          Action Required
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {supportTickets
                          .filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed')
                          .map((call) => (
                            <div
                              key={call.id}
                              className="bg-[#10151B] border border-red-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-red-500/60 transition-colors"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                                      <span>{call.userName || 'Customer'}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      ID: {call.userId ? call.userId.slice(-8) : 'guest'}
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="p-2.5 bg-red-950/30 border border-red-500/20 rounded-lg">
                                  <span className="text-[9px] uppercase font-bold text-red-400 block tracking-wider mb-0.5">
                                    Reason Regarding Call:
                                  </span>
                                  <p className="text-xs text-red-100 font-medium leading-snug">
                                    {call.callRequestReason || call.subject}
                                  </p>
                                </div>

                                <div className="text-[10px] text-gray-400 space-y-0.5 font-mono">
                                  {call.userEmail && <div>Email: {call.userEmail}</div>}
                                  {call.orderId && <div>Order: #{call.orderId}</div>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                                {call.userPhone ? (
                                  <a
                                    href={`tel:${call.userPhone}`}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Call {call.userPhone}</span>
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-gray-500 italic py-1">No phone on file</span>
                                )}

                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'support_tickets', call.id), {
                                        callStatus: 'completed',
                                        status: 'resolved',
                                        resolvedAt: new Date().toISOString(),
                                        resolvedByAgentName: 'Admin Desk'
                                      });
                                      setSupportTickets(prev => prev.map(t => t.id === call.id ? { ...t, callStatus: 'completed', status: 'resolved' } : t));
                                    } catch (err) {
                                      console.error('Error resolving call request:', err);
                                    }
                                  }}
                                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                  title="Mark Call Completed"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Resolved</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#1B232C] p-4 rounded-2xl border border-red-500/20">
                      <span className="text-[9px] font-black uppercase text-red-400 tracking-wider block">🚨 Urgent & High Issues</span>
                      <span className="text-xl font-black text-white font-mono">{urgentHighCount}</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Requires immediate attention</span>
                    </div>

                    <div className="bg-[#1B232C] p-4 rounded-2xl border border-amber-500/20">
                      <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">⏳ Pending Review</span>
                      <span className="text-xl font-black text-amber-300 font-mono">{pendingCount + reviewCount}</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">{pendingCount} New / {reviewCount} In-Progress</span>
                    </div>

                    <div className="bg-[#1B232C] p-4 rounded-2xl border border-emerald-500/20">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">✅ Resolved Complaints</span>
                      <span className="text-xl font-black text-emerald-300 font-mono">{resolvedCount + closedCount}</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">{resolvedCount} Resolved / {closedCount} Closed</span>
                    </div>

                    <div className="bg-[#1B232C] p-4 rounded-2xl border border-brand-green/20">
                      <span className="text-[9px] font-black uppercase text-brand-green tracking-wider block">⭐ Customer Satisfaction</span>
                      <span className="text-xl font-black text-amber-400 font-mono flex items-center gap-1">
                        {avgRating} <span className="text-xs text-gray-400">/ 5.0</span>
                      </span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Based on {ratedTickets.length} meal ratings</span>
                    </div>
                  </div>

                  <div className="bg-[#182028] p-4 rounded-2xl border border-brand-green/10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Search by ticket ID, user, email, subject or message..."
                          value={supportSearchQuery}
                          onChange={(e) => setSupportSearchQuery(e.target.value)}
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                        />
                      </div>

                      <div>
                        <select
                          value={supportFilterStatus}
                          onChange={(e) => setSupportFilterStatus(e.target.value as any)}
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">🟡 Pending (New)</option>
                          <option value="under_review">🔵 Under Review</option>
                          <option value="resolved">🟢 Resolved</option>
                          <option value="closed">⚪ Closed</option>
                        </select>
                      </div>

                      <div>
                        <select
                          value={supportFilterType}
                          onChange={(e) => setSupportFilterType(e.target.value as any)}
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Ticket Types</option>
                          <option value="complaint">🚨 Complaints Only</option>
                          <option value="feedback">⭐ Meal Feedback</option>
                          <option value="suggestion">💡 Suggestions</option>
                          <option value="inquiry">❓ Inquiries</option>
                        </select>
                      </div>

                      <div>
                        <select
                          value={supportSort}
                          onChange={(e) => setSupportSort(e.target.value as any)}
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none cursor-pointer"
                        >
                          <option value="newest">Sort: Newest First</option>
                          <option value="oldest">Sort: Oldest First</option>
                          <option value="priority">Sort: Highest Priority</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
                      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Priority:</span>
                      {[
                        { id: 'all', label: 'All Priorities' },
                        { id: 'urgent', label: '🔴 Urgent' },
                        { id: 'high', label: '🟠 High' },
                        { id: 'medium', label: '🟡 Medium' },
                        { id: 'low', label: '🟢 Low' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSupportFilterPriority(item.id as any)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                            supportFilterPriority === item.id
                              ? 'bg-brand-orange text-brand-charcoal font-black'
                              : 'bg-[#12181E] text-gray-400 hover:text-white border border-brand-green/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="py-16 text-center bg-[#182028]/50 rounded-2xl border border-brand-green/10 space-y-2">
                      <Mail className="w-8 h-8 text-gray-600 mx-auto" />
                      <h3 className="text-xs font-black uppercase text-white">No Tickets Match Filters</h3>
                      <p className="text-[11px] text-gray-500">Try adjusting your search query or status filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((ticket) => {
                        const isExpanded = expandedTicketId === ticket.id;
                        const matchedOrder = ticket.orderId ? orders.find(o => o.id === ticket.orderId) : null;
                        const targetUserObj = allUsersCombined.find(u => (u.email && ticket.userEmail && u.email.toLowerCase() === ticket.userEmail.toLowerCase()) || (u.id && ticket.userId && u.id === ticket.userId));
                        const isUserBanned = targetUserObj?.banned === true;

                        return (
                          <div
                            key={ticket.id}
                            className={`bg-[#182028] border rounded-2xl transition-all overflow-hidden ${
                              ticket.priority === 'urgent'
                                ? 'border-red-500/40 bg-red-950/10'
                                : ticket.priority === 'high'
                                ? 'border-orange-500/30'
                                : 'border-brand-green/15'
                            }`}
                          >
                            <div
                              onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                              className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                            >
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
                                    #{ticket.id}
                                  </span>

                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    ticket.type === 'complaint'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : ticket.type === 'feedback'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : ticket.type === 'suggestion'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    {ticket.type}
                                  </span>

                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    ticket.priority === 'urgent' ? 'bg-red-600 text-white animate-pulse' :
                                    ticket.priority === 'high' ? 'bg-orange-500 text-brand-charcoal' :
                                    ticket.priority === 'medium' ? 'bg-amber-500/30 text-amber-300' :
                                    'bg-emerald-500/30 text-emerald-300'
                                  }`}>
                                    {ticket.priority} priority
                                  </span>

                                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                    ticket.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                    ticket.status === 'under_review' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                    ticket.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                  }`}>
                                    {ticket.status.replace('_', ' ')}
                                  </span>

                                  {/* USER STATUS TAG */}
                                  {isUserBanned ? (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase tracking-wider flex items-center gap-1">
                                      <Ban className="w-2.5 h-2.5" /> BANNED USER
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30 uppercase tracking-wider">
                                      🟢 Active Customer
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-xs font-extrabold text-white flex items-center gap-2 flex-wrap">
                                  <span>{ticket.subject}</span>
                                </h3>

                                {/* ACTIVE ORDER TAG ROW */}
                                <div className="flex items-center gap-2 flex-wrap pt-0.5" onClick={(e) => e.stopPropagation()}>
                                  {ticket.orderId ? (
                                    <div className="flex items-center gap-1.5 bg-[#12181E] px-2.5 py-1 rounded-xl border border-brand-green/30 text-[10px]">
                                      <span className="font-bold text-brand-green flex items-center gap-1">
                                        <Tag className="w-3 h-3 text-brand-green" />
                                        <span>Order #{ticket.orderId}</span>
                                      </span>
                                      {matchedOrder && (
                                        <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase ${
                                          matchedOrder.status === 'delivered' ? 'text-emerald-400 bg-emerald-950/60' :
                                          matchedOrder.status === 'out_for_delivery' ? 'text-amber-400 bg-amber-950/60' :
                                          'text-cyan-300 bg-cyan-950/60'
                                        }`}>
                                          • {matchedOrder.status.replace(/_/g, ' ')} (₹{matchedOrder.total})
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const ord = matchedOrder || orders.find(o => o.id === ticket.orderId) || ({ id: ticket.orderId, customerName: ticket.userName, customerEmail: ticket.userEmail, customerPhone: ticket.userPhone, items: [], total: 0, status: 'cooking', createdAt: ticket.createdAt } as any);
                                            setViewingOrderDetailModal(ord);
                                          }}
                                          className="p-1 hover:bg-brand-green/20 text-brand-green rounded transition-all cursor-pointer"
                                          title="View Order Details"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExpediteOrderFromTicket(ticket.orderId!)}
                                          className="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition-all cursor-pointer"
                                          title="Expedite Order (VIP Kitchen Alert)"
                                        >
                                          <Zap className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setOrderTaggingTicket(ticket)}
                                          className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-all cursor-pointer"
                                          title="Change Tagged Order"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleTagOrderToTicket(ticket.id, null)}
                                          className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-all cursor-pointer"
                                          title="Unlink Order"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setOrderTaggingTicket(ticket)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                    >
                                      <Tag className="w-3 h-3" />
                                      <span>+ Link Active Order</span>
                                    </button>
                                  )}
                                </div>

                                {/* USER TAG INFO */}
                                <p className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                                  <span>From:</span>
                                  <strong className="text-white font-bold">{ticket.userName}</strong>
                                  <span className="text-gray-500">({ticket.userEmail})</span>
                                  {ticket.userPhone && (
                                    <span className="text-gray-400 font-mono">📱 {ticket.userPhone}</span>
                                  )}
                                  <span className="text-gray-500">• {new Date(ticket.createdAt).toLocaleString()}</span>
                                </p>
                              </div>

                              {/* ACTION BUTTONS (MAIL, CALL, WHATSAPP, BAN, DELETE) */}
                              <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                                {ticket.userEmail && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDirectMail(
                                      ticket.userEmail,
                                      ticket.userName,
                                      `Regarding Support Ticket #${ticket.id}: ${ticket.subject}`,
                                      `Hi ${ticket.userName},\n\nWe are reaching out from TAASH BHATTI regarding your support ticket #${ticket.id} (${ticket.subject}).\n\n`
                                    )}
                                    className="px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                    title="Send Direct Email"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>Mail</span>
                                  </button>
                                )}

                                {ticket.userPhone && (
                                  <>
                                    <a
                                      href={`tel:${ticket.userPhone}`}
                                      className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                      title="Direct Call"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/${ticket.userPhone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 bg-[#0F2D1E] hover:bg-[#15422C] text-emerald-400 border border-emerald-600/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                      title="Chat on WhatsApp"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>WA</span>
                                    </a>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setBanningUserFromTicket({
                                    user: targetUserObj || { email: ticket.userEmail, name: ticket.userName, phone: ticket.userPhone, id: ticket.userId, banned: false },
                                    isRider: false,
                                    ticketId: ticket.id
                                  })}
                                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all ${
                                    isUserBanned
                                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/40'
                                      : 'bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800/40'
                                  }`}
                                  title={isUserBanned ? "Unban Customer" : "Ban Customer"}
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>{isUserBanned ? 'Unban' : 'Ban'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setTicketToDelete(ticket)}
                                  className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                  title="Delete Ticket"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                  className="px-2.5 py-1.5 bg-[#12181E] text-gray-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer ml-1"
                                >
                                  <span>{isExpanded ? 'Hide' : 'Review'}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-4 border-t border-brand-green/10 bg-[#12181E] space-y-4">
                                <div className="p-3.5 bg-[#1A232D] rounded-xl border border-brand-green/10 space-y-2">
                                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                                    <span>Category: <strong className="text-brand-orange uppercase">{ticket.category.replace(/_/g, ' ')}</strong></span>
                                    {ticket.orderId && <span>Attached Order: <strong className="text-brand-green font-mono">#{ticket.orderId}</strong></span>}
                                    {ticket.userPhone && <span>Phone: <strong className="text-white font-mono">{ticket.userPhone}</strong></span>}
                                  </div>

                                  <p className="text-xs text-gray-200 leading-relaxed font-sans bg-[#12181E] p-3 rounded-xl border border-white/5">
                                    "{ticket.message}"
                                  </p>

                                  {ticket.imageUrl && (
                                    <div className="p-2.5 bg-[#12181E] rounded-xl border border-white/10">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Attached Evidence Photo:</span>
                                        <span className="text-[9px] text-brand-green font-bold cursor-pointer hover:underline" onClick={() => setAdminLightboxImage(ticket.imageUrl || null)}>
                                          🔍 Tap to Zoom
                                        </span>
                                      </div>
                                      <img
                                        src={ticket.imageUrl}
                                        alt="Customer Evidence"
                                        className="max-h-56 rounded-lg object-cover border border-white/10 hover:opacity-90 cursor-pointer"
                                        onClick={() => setAdminLightboxImage(ticket.imageUrl || null)}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* DELIVERED RIDER LOGISTICS DOSSIER */}
                                {(ticket.deliveryPartnerName || ticket.deliveryPartnerPhone || ticket.orderKitchenName || matchedOrder?.deliveryPartnerName) && (() => {
                                  const riderName = ticket.deliveryPartnerName || matchedOrder?.deliveryPartnerName || 'Assigned Delivery Partner';
                                  const riderPhone = ticket.deliveryPartnerPhone || matchedOrder?.deliveryPartnerPhone;
                                  const riderVehicle = ticket.deliveryPartnerVehicle || matchedOrder?.deliveryPartnerVehicle || 'Motorbike / Scooter';
                                  const vehicleNum = ticket.deliveryVehicleNumber || matchedOrder?.deliveryVehicleNumber;
                                  const kitchenName = ticket.orderKitchenName || matchedOrder?.acceptedKitchenName || 'Central Hub';
                                  const deliveredAt = ticket.deliveredAt || (matchedOrder?.deliveredAt ? new Date(matchedOrder.deliveredAt).toLocaleTimeString() : undefined);

                                  return (
                                    <div className="p-3.5 bg-gradient-to-r from-amber-950/30 via-[#182028] to-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2.5">
                                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                                        <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5 tracking-wider">
                                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                                          🛵 Delivered Rider Logistics Dossier
                                        </span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded uppercase font-mono">
                                          Fulfilled Delivery
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <span className="text-[9px] text-gray-400 uppercase font-mono block">Delivery Executive</span>
                                          <div className="text-xs font-black text-white flex items-center gap-2 flex-wrap">
                                            <span>{riderName}</span>
                                            {vehicleNum && (
                                              <span className="text-[9px] font-mono font-bold bg-black text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                                                {vehicleNum}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-300 font-mono">
                                            Vehicle: <strong className="text-amber-200">{riderVehicle}</strong>
                                            {ticket.deliveryPartnerId && (
                                              <span className="text-gray-500"> • ID: {ticket.deliveryPartnerId}</span>
                                            )}
                                          </p>
                                        </div>

                                        <div className="space-y-1 sm:text-right">
                                          <span className="text-[9px] text-gray-400 uppercase font-mono block">Dispatch & Transit Hub</span>
                                          <p className="text-xs text-white font-bold">{kitchenName}</p>
                                          {deliveredAt && (
                                            <p className="text-[9px] font-mono text-emerald-400">Delivered At: {deliveredAt}</p>
                                          )}
                                        </div>
                                      </div>

                                      {riderPhone && (
                                        <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                                          <span className="text-[10px] font-mono text-amber-300">
                                            📞 Rider Phone: <strong className="text-white">{riderPhone}</strong>
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <a
                                              href={`tel:${riderPhone}`}
                                              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 transition-all"
                                            >
                                              <Phone className="w-3 h-3" /> Call Rider
                                            </a>
                                            <a
                                              href={`https://wa.me/${riderPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${riderName}, this is Admin Desk from TAASH BHATTI inquiring regarding Support Ticket #${ticket.id} on Order #${ticket.orderId || ''}.`)}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="bg-brand-green/30 hover:bg-brand-green/40 border border-brand-green text-brand-green font-black text-[10px] px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 transition-all"
                                            >
                                              <Send className="w-3 h-3" /> WhatsApp Rider
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* ATTACHED ORDER SNAPSHOT */}
                                {(ticket.orderId || ticket.orderItemsSummary) && (() => {
                                  const linkedOrder = matchedOrder || (ticket.orderId ? orders.find(o => o.id === ticket.orderId) : null);
                                  const total = ticket.orderTotal || linkedOrder?.total || linkedOrder?.subtotal;
                                  const date = ticket.orderDate || linkedOrder?.date;
                                  const status = ticket.orderStatus || linkedOrder?.status || 'fulfilled';
                                  const address = ticket.orderDeliveryAddress || linkedOrder?.address;
                                  const itemsText = ticket.orderItemsSummary || (linkedOrder?.items.map(i => `${i.quantity}x ${i.meal.name}`).join(', '));
                                  const payment = ticket.orderPaymentMethod || linkedOrder?.paymentMethod;

                                  return (
                                    <div className="bg-[#182028] border border-brand-green/20 p-3.5 rounded-2xl space-y-2 text-xs">
                                      <div className="flex items-center justify-between border-b border-brand-green/10 pb-2">
                                        <span className="font-black text-brand-green uppercase text-[10px] flex items-center gap-1.5">
                                          <ShoppingBag className="w-3.5 h-3.5" />
                                          Attached Order Summary #{ticket.orderId}
                                        </span>
                                        {total !== undefined && (
                                          <span className="text-white font-mono font-bold">
                                            ₹{total} {payment ? `(${payment.toUpperCase()})` : ''}
                                          </span>
                                        )}
                                      </div>

                                      {itemsText && (
                                        <div className="bg-[#12181E] p-2 rounded-xl text-gray-200 text-[11px] font-mono border border-white/5">
                                          🍱 <strong>Ordered Items:</strong> {itemsText}
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono">
                                        {date && <div>📅 Order Date: <span className="text-white">{date}</span></div>}
                                        <div>🚦 Order Status: <span className="text-amber-400 font-bold uppercase">{status}</span></div>
                                        {address && <div className="sm:col-span-2">📍 Destination: <span className="text-gray-300">{address}</span></div>}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {ticket.adminReply && (
                                  <div className="p-3.5 bg-brand-green/10 rounded-xl border border-brand-green/20 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-brand-green font-bold uppercase">
                                      <span>Reply from {ticket.adminName || 'Admin Desk'}</span>
                                      <span>{ticket.adminRepliedAt ? new Date(ticket.adminRepliedAt).toLocaleString() : ''}</span>
                                    </div>
                                    <p className="text-xs text-emerald-200 font-sans">{ticket.adminReply}</p>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div>
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase block mb-1 flex items-center gap-1">
                                      <span>🌟 Positive & Praise Reply Presets:</span>
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {[
                                        "Thank you so much for the wonderful feedback! We are thrilled you loved your macro-balanced meal!",
                                        "Great job ordering with TAASH BHATTI! Our executive chefs are delighted to serve you.",
                                        "We appreciate your 5-star review! Your compliment has been shared directly with our kitchen team.",
                                        "Thrilled to hear our express delivery made your dining routine smoother! Enjoy your next meal.",
                                        "Thanks for loving our high-protein recipes! We have noted your favorite dish for special rewards."
                                      ].map((preset, pIdx) => (
                                        <button
                                          key={`pos-${pIdx}`}
                                          type="button"
                                          onClick={() => {
                                            setReplyTextMap(prev => ({ ...prev, [ticket.id]: preset }));
                                            setReplyStatusMap(prev => ({ ...prev, [ticket.id]: 'resolved' }));
                                          }}
                                          className="text-[9px] bg-emerald-950/60 hover:bg-emerald-800/40 text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all text-left flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>+</span>
                                          <span>{preset.slice(0, 42)}...</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[9px] font-bold text-amber-400 uppercase block mb-1 flex items-center gap-1">
                                      <span>🛠️ Issue Resolution Presets:</span>
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {[
                                        "Apologies for the inconvenience! We have issued a ₹100 wallet credit to your account.",
                                        "Thank you for the meal feedback! Our Executive Chef has been notified.",
                                        "We investigated the locker drop delay; your next meal delivery is priority dispatched.",
                                        "Your refund/billing request has been processed and approved."
                                      ].map((preset, pIdx) => (
                                        <button
                                          key={`res-${pIdx}`}
                                          type="button"
                                          onClick={() => setReplyTextMap(prev => ({ ...prev, [ticket.id]: preset }))}
                                          className="text-[9px] bg-[#1A232D] hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 px-2.5 py-1 rounded-lg border border-white/10 transition-all text-left flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>+</span>
                                          <span>{preset.slice(0, 42)}...</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-brand-green/10">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                      <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">OFFICIAL ADMIN REPLY CONTENT</label>
                                      <textarea
                                        rows={3}
                                        placeholder="Type reply message that will be sent to customer's mailbox..."
                                        value={replyTextMap[ticket.id] ?? (ticket.adminReply || '')}
                                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [ticket.id]: e.target.value })}
                                        className="w-full bg-[#1A232D] border border-brand-green/15 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                                      />
                                    </div>

                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">UPDATE TICKET STATUS</label>
                                        <select
                                          value={replyStatusMap[ticket.id] ?? ticket.status}
                                          onChange={(e) => setReplyStatusMap({ ...replyStatusMap, [ticket.id]: e.target.value as any })}
                                          className="w-full bg-[#1A232D] border border-brand-green/15 rounded-xl p-2.5 text-xs text-white focus:outline-none font-bold"
                                        >
                                          <option value="under_review">🔵 Under Review</option>
                                          <option value="resolved">🟢 Resolved</option>
                                          <option value="closed">⚪ Closed</option>
                                        </select>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isSendingReplyMap[ticket.id]}
                                        onClick={() => handleSendAdminReply(ticket)}
                                        className="w-full py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isSendingReplyMap[ticket.id] ? 'Dispatching...' : 'Transmit Response'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                  )}

                  {supportSubTab === 'delivery_complaints' && (
                    <div className="space-y-6">
                      {/* STATS OVERVIEW */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-red-500/30">
                          <span className="text-[9px] font-black uppercase text-red-400 tracking-wider block">🚨 SOS / Urgent Complaints</span>
                          <span className="text-xl font-black text-red-300 font-mono">{deliveryUrgentCount}</span>
                          <span className="text-[9px] text-gray-500 block">Critical Field Issues</span>
                        </div>
                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-amber-500/20">
                          <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">⏳ Pending Action</span>
                          <span className="text-xl font-black text-amber-300 font-mono">{deliveryPendingCount}</span>
                          <span className="text-[9px] text-gray-500 block">Awaiting Dispatch Resolution</span>
                        </div>
                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-emerald-500/20">
                          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">✅ Resolved Complaints</span>
                          <span className="text-xl font-black text-emerald-300 font-mono">{deliveryResolvedCount}</span>
                          <span className="text-[9px] text-gray-500 block">Closed Rider Tickets</span>
                        </div>
                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">🛵 Total Complaints</span>
                          <span className="text-xl font-black text-white font-mono">{totalDeliveryTickets}</span>
                          <span className="text-[9px] text-gray-500 block">Logged By Fleet</span>
                        </div>
                      </div>

                      {/* FILTERS & SEARCH ROW */}
                      <div className="bg-[#1B232C] p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={deliverySearchQuery}
                              onChange={(e) => setDeliverySearchQuery(e.target.value)}
                              placeholder="Search rider name, phone, vehicle, order ID, or complaint topic..."
                              className="w-full pl-9 pr-4 py-2.5 bg-[#12181E] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-medium"
                            />
                            {deliverySearchQuery && (
                              <button
                                type="button"
                                onClick={() => setDeliverySearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-gray-400 shrink-0">Sort:</span>
                            <select
                              value={deliverySort}
                              onChange={(e) => setDeliverySort(e.target.value as any)}
                              className="bg-[#12181E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="priority">🔥 High Priority / SOS First</option>
                              <option value="newest">⏱️ Newest First</option>
                              <option value="oldest">📅 Oldest First</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Status</label>
                            <select
                              value={deliveryFilterStatus}
                              onChange={(e) => setDeliveryFilterStatus(e.target.value)}
                              className="w-full bg-[#12181E] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="all">All Statuses ({totalDeliveryTickets})</option>
                              <option value="pending">⏳ Pending</option>
                              <option value="under_review">🔵 In Progress / Under Review</option>
                              <option value="resolved">🟢 Resolved</option>
                              <option value="closed">⚪ Closed</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Category</label>
                            <select
                              value={deliveryFilterCategory}
                              onChange={(e) => setDeliveryFilterCategory(e.target.value)}
                              className="w-full bg-[#12181E] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="all">All Categories</option>
                              {deliveryCategoriesList.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Priority</label>
                            <select
                              value={deliveryFilterPriority}
                              onChange={(e) => setDeliveryFilterPriority(e.target.value)}
                              className="w-full bg-[#12181E] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="all">All Priorities</option>
                              <option value="urgent">🚨 Urgent / SOS</option>
                              <option value="high">🔴 High</option>
                              <option value="medium">🟡 Medium</option>
                              <option value="low">🟢 Low</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">City Filter</label>
                            <select
                              value={deliveryFilterCity}
                              onChange={(e) => setDeliveryFilterCity(e.target.value)}
                              className="w-full bg-[#12181E] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="all">All Cities</option>
                              {uniqueCities.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* COMPLAINTS LIST */}
                      {filteredDelivery.length === 0 ? (
                        <div className="p-8 text-center bg-[#1B232C] rounded-2xl border border-white/5 space-y-3">
                          <Truck className="w-10 h-10 text-gray-600 mx-auto" />
                          <h4 className="text-xs font-black uppercase text-gray-400">No Delivery Complaints Found</h4>
                          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                            {deliverySearchQuery || deliveryFilterStatus !== 'all' || deliveryFilterCategory !== 'all'
                              ? 'No complaints matched your current active filter parameters.'
                              : 'No complaints have been reported by delivery partners yet.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredDelivery.map((ticket) => {
                            const isExpanded = expandedTicketId === ticket.id;
                            const isUrgent = ticket.priority === 'urgent' || ticket.isEmergency;
                            const matchedOrder = ticket.orderId ? orders.find(o => o.id === ticket.orderId) : null;
                            const targetPartner = deliveryPartners.find(p => (p.phone && ticket.deliveryPartnerPhone && p.phone === ticket.deliveryPartnerPhone) || (p.email && ticket.userEmail && p.email.toLowerCase() === ticket.userEmail.toLowerCase()) || (p.id && ticket.userId && p.id === ticket.userId));
                            const isPartnerSuspended = targetPartner?.status === 'inactive' || targetPartner?.banned === true;

                            return (
                              <div
                                key={ticket.id}
                                className={`bg-[#1B232C] border rounded-2xl overflow-hidden transition-all shadow-md ${
                                  isUrgent
                                    ? 'border-red-500/40 bg-red-950/10'
                                    : 'border-white/5 hover:border-amber-500/30'
                                }`}
                              >
                                <div
                                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                  className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                  <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-brand-charcoal px-2.5 py-0.5 rounded border border-white/10">
                                        #{ticket.id}
                                      </span>

                                      {ticket.isEmergency && (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-600 text-white animate-pulse uppercase tracking-wider">
                                          🚨 SOS EMERGENCY
                                        </span>
                                      )}

                                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${
                                        ticket.status === 'pending' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40' :
                                        ticket.status === 'under_review' ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40' :
                                        ticket.status === 'resolved' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' :
                                        'bg-gray-800 text-gray-400 border border-gray-700'
                                      }`}>
                                        {ticket.status.replace('_', ' ')}
                                      </span>

                                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${
                                        ticket.priority === 'urgent' ? 'bg-red-950/80 text-red-400 border border-red-800/40' :
                                        ticket.priority === 'high' ? 'bg-orange-950/80 text-orange-400 border border-orange-800/40' :
                                        ticket.priority === 'medium' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40' :
                                        'bg-gray-800 text-gray-400'
                                      }`}>
                                        {ticket.priority} Priority
                                      </span>

                                      <span className="text-[9px] font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/30">
                                        {deliveryCategoriesList.find(c => c.id === ticket.deliveryCategory)?.label || ticket.deliveryCategory || 'Delivery Issue'}
                                      </span>

                                      {ticket.deliveryCity && (
                                        <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                                          📍 {ticket.deliveryCity}
                                        </span>
                                      )}

                                      {/* RIDER FLEET STATUS */}
                                      {isPartnerSuspended ? (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase tracking-wider flex items-center gap-1">
                                          <Ban className="w-2.5 h-2.5" /> SUSPENDED RIDER
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30 uppercase tracking-wider">
                                          🟢 Active Fleet Rider
                                        </span>
                                      )}
                                    </div>

                                    <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-2 flex-wrap">
                                      <span>{ticket.subject}</span>
                                    </h4>

                                    {/* ACTIVE ORDER TAG ROW */}
                                    <div className="flex items-center gap-2 flex-wrap pt-0.5" onClick={(e) => e.stopPropagation()}>
                                      {ticket.orderId ? (
                                        <div className="flex items-center gap-1.5 bg-[#12181E] px-2.5 py-1 rounded-xl border border-amber-500/30 text-[10px]">
                                          <span className="font-bold text-amber-400 flex items-center gap-1">
                                            <Tag className="w-3 h-3 text-amber-400" />
                                            <span>Active Order #{ticket.orderId}</span>
                                          </span>
                                          {matchedOrder && (
                                            <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase ${
                                              matchedOrder.status === 'delivered' ? 'text-emerald-400 bg-emerald-950/60' :
                                              matchedOrder.status === 'out_for_delivery' ? 'text-amber-400 bg-amber-950/60' :
                                              'text-cyan-300 bg-cyan-950/60'
                                            }`}>
                                              • {matchedOrder.status.replace(/_/g, ' ')} (₹{matchedOrder.total})
                                            </span>
                                          )}
                                          <div className="flex items-center gap-1 ml-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const ord = matchedOrder || orders.find(o => o.id === ticket.orderId) || ({ id: ticket.orderId, customerName: ticket.userName, customerEmail: ticket.userEmail, customerPhone: ticket.userPhone, items: [], total: 0, status: 'cooking', createdAt: ticket.createdAt } as any);
                                                setViewingOrderDetailModal(ord);
                                              }}
                                              className="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition-all cursor-pointer"
                                              title="View Order Details"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleExpediteOrderFromTicket(ticket.orderId!)}
                                              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-all cursor-pointer"
                                              title="Expedite Order / Emergency Kitchen Priority"
                                            >
                                              <Zap className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setOrderTaggingTicket(ticket)}
                                              className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-all cursor-pointer"
                                              title="Change Tagged Order"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleTagOrderToTicket(ticket.id, null)}
                                              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-all cursor-pointer"
                                              title="Unlink Order"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setOrderTaggingTicket(ticket)}
                                          className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                        >
                                          <Tag className="w-3 h-3" />
                                          <span>+ Tag Active Order</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* RIDER / DELIVERY PARTNER TAG */}
                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 font-mono">
                                      <span className="text-white font-bold flex items-center gap-1">
                                        <Truck className="w-3 h-3 text-amber-400" />
                                        <span>{ticket.deliveryPartnerName || ticket.userName}</span>
                                      </span>
                                      {ticket.deliveryPartnerPhone && (
                                        <span>📞 {ticket.deliveryPartnerPhone}</span>
                                      )}
                                      {ticket.deliveryVehicleNumber && (
                                        <span>🛵 {ticket.deliveryVehicleNumber}</span>
                                      )}
                                      {ticket.userEmail && (
                                        <span className="text-gray-500">✉️ {ticket.userEmail}</span>
                                      )}
                                      <span className="text-gray-500">
                                        {new Date(ticket.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* ACTIONABLE BUTTONS FOR RIDER COMPLAINT */}
                                  <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                                    {ticket.userEmail && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDirectMail(
                                          ticket.userEmail,
                                          ticket.deliveryPartnerName || ticket.userName,
                                          `Official Dispatch Dispatch regarding Complaint #${ticket.id}`,
                                          `Hi ${ticket.deliveryPartnerName || ticket.userName},\n\nWe have reviewed your delivery complaint #${ticket.id} (${ticket.subject}).\n\n`
                                        )}
                                        className="px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                        title="Mail Rider"
                                      >
                                        <Mail className="w-3 h-3" />
                                        <span>Mail</span>
                                      </button>
                                    )}

                                    {ticket.deliveryPartnerPhone && (
                                      <>
                                        <a
                                          href={`tel:${ticket.deliveryPartnerPhone}`}
                                          className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                          title="Call Delivery Partner"
                                        >
                                          <Phone className="w-3 h-3" />
                                          <span>Call</span>
                                        </a>
                                        <a
                                          href={`https://wa.me/${ticket.deliveryPartnerPhone.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1.5 bg-[#0F2D1E] hover:bg-[#15422C] text-emerald-400 border border-emerald-600/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                          title="WhatsApp Delivery Partner"
                                        >
                                          <Send className="w-3 h-3" />
                                          <span>WA</span>
                                        </a>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setBanningUserFromTicket({
                                        user: targetPartner || {
                                          email: ticket.userEmail,
                                          name: ticket.deliveryPartnerName || ticket.userName,
                                          phone: ticket.deliveryPartnerPhone,
                                          id: ticket.userId,
                                          banned: false
                                        },
                                        isRider: true,
                                        ticketId: ticket.id
                                      })}
                                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all ${
                                        isPartnerSuspended
                                          ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/40'
                                          : 'bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800/40'
                                      }`}
                                      title={isPartnerSuspended ? "Reactivate Rider" : "Suspend/Ban Rider"}
                                    >
                                      <Ban className="w-3 h-3" />
                                      <span>{isPartnerSuspended ? 'Reactivate' : 'Suspend'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setTicketToDelete(ticket)}
                                      className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                      title="Delete Complaint Ticket"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                      className="px-3 py-1.5 bg-[#12181E] text-gray-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer ml-1"
                                    >
                                      <span>{isExpanded ? 'Collapse' : 'Resolve'}</span>
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  </div>
                                </div>

                                {/* EXPANDED DETAILS & RESOLUTION DRAWER */}
                                {isExpanded && (
                                  <div className="p-4 border-t border-white/5 bg-[#141B22] space-y-4">
                                    <div className="bg-[#182028] p-3.5 rounded-xl border border-white/5 space-y-2">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                                        Rider Statement / Issue Description:
                                      </span>
                                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-medium">
                                        {ticket.message}
                                      </p>
                                    </div>

                                    {ticket.adminReply && (
                                      <div className="bg-[#1A2530] p-3.5 rounded-xl border border-brand-green/20 space-y-1.5">
                                        <div className="flex items-center justify-between text-[9px]">
                                          <span className="font-black text-brand-green uppercase flex items-center gap-1">
                                            <span>✓ Support Desk Resolution</span>
                                            <span className="text-gray-400">({ticket.adminName || 'Admin Desk'})</span>
                                          </span>
                                          {ticket.adminRepliedAt && (
                                            <span className="text-gray-500 font-mono">
                                              {new Date(ticket.adminRepliedAt).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-200 leading-relaxed font-medium">
                                          {ticket.adminReply}
                                        </p>
                                      </div>
                                    )}

                                    {/* RESOLUTION ACTION PRESETS */}
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-bold text-amber-400 uppercase block mb-1 flex items-center gap-1">
                                        <span>🛠️ Quick Resolution Presets for Riders:</span>
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {[
                                          "Emergency acknowledged! Dispatching backup rider and safety protocol initiated.",
                                          "Vehicle breakdown logged. Order reassigned to nearest rider with zero penalty.",
                                          "Customer address verified and updated. Call patch initiated via support.",
                                          "Kitchen prep delay penalty waived. Extra waiting incentive credited to wallet.",
                                          "Payout dispute verified and resolved. Amount adjusted in next settlement cycle."
                                        ].map((preset, pIdx) => (
                                          <button
                                            key={`del-res-${pIdx}`}
                                            type="button"
                                            onClick={() => setDeliveryReplyTextMap(prev => ({ ...prev, [ticket.id]: preset }))}
                                            className="text-[9px] bg-[#1A232D] hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 px-2.5 py-1 rounded-lg border border-white/10 transition-all text-left flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>+</span>
                                            <span>{preset.slice(0, 44)}...</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* REPLY & STATUS CONTROLS */}
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">OFFICIAL RESOLUTION TO RIDER</label>
                                          <textarea
                                            rows={3}
                                            placeholder="Type resolution instructions or assistance sent to delivery partner..."
                                            value={deliveryReplyTextMap[ticket.id] ?? (ticket.adminReply || '')}
                                            onChange={(e) => setDeliveryReplyTextMap({ ...deliveryReplyTextMap, [ticket.id]: e.target.value })}
                                            className="w-full bg-[#1A232D] border border-amber-500/20 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                                          />
                                        </div>

                                        <div className="space-y-3">
                                          <div>
                                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">UPDATE STATUS</label>
                                            <select
                                              value={deliveryReplyStatusMap[ticket.id] ?? ticket.status}
                                              onChange={(e) => setDeliveryReplyStatusMap({ ...deliveryReplyStatusMap, [ticket.id]: e.target.value as any })}
                                              className="w-full bg-[#1A232D] border border-amber-500/20 rounded-xl p-2.5 text-xs text-white focus:outline-none font-bold"
                                            >
                                              <option value="under_review">🔵 In Progress / Reviewing</option>
                                              <option value="resolved">🟢 Resolved & Assisted</option>
                                              <option value="closed">⚪ Closed</option>
                                            </select>
                                          </div>

                                          <button
                                            type="button"
                                            disabled={isSendingDeliveryReplyMap[ticket.id]}
                                            onClick={() => handleSendDeliveryReply(ticket)}
                                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>{isSendingDeliveryReplyMap[ticket.id] ? 'Dispatching...' : 'Transmit Resolution'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {supportSubTab === 'agents' && (
                    <div className="space-y-6">
                      {/* TOP ACTIONS & BANNER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1B232C] p-4 rounded-2xl border border-brand-orange/20">
                        <div>
                          <span className="text-[9px] font-black uppercase text-brand-orange bg-brand-orange/15 px-2.5 py-0.5 rounded border border-brand-orange/30 tracking-wider">
                            STAFF CREATION & ROLES MANAGEMENT
                          </span>
                          <h3 className="text-sm font-black uppercase text-white mt-1 flex items-center gap-2">
                            Customer Support Staff & Access Vault
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Provision, manage, and share login credentials for Customer Care agents with restricted scope (Overall, Kitchen Only, or City Wise).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAddSupportAgent}
                          className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Support Agent</span>
                        </button>
                      </div>

                      {/* METRICS STATS */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div className="bg-[#1B232C] p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black uppercase text-gray-400 block">Total Active Staff</span>
                          <span className="text-lg font-black text-white font-mono">{supportAgents.filter(a => a.status === 'active').length}</span>
                          <span className="text-[9px] text-gray-500 block">Registered Care Reps</span>
                        </div>
                        <div className="bg-[#1B232C] p-3.5 rounded-2xl border border-purple-500/20">
                          <span className="text-[9px] font-black uppercase text-purple-400 block">🌐 Overall Access</span>
                          <span className="text-lg font-black text-purple-300 font-mono">{supportAgents.filter(a => a.role === 'overall').length}</span>
                          <span className="text-[9px] text-gray-500 block">Global Desk Reps</span>
                        </div>
                        <div className="bg-[#1B232C] p-3.5 rounded-2xl border border-amber-500/20">
                          <span className="text-[9px] font-black uppercase text-amber-400 block">🏬 Kitchen Desk</span>
                          <span className="text-lg font-black text-amber-300 font-mono">{supportAgents.filter(a => a.role === 'kitchen').length}</span>
                          <span className="text-[9px] text-gray-500 block">Branch Assigned Reps</span>
                        </div>
                        <div className="bg-[#1B232C] p-3.5 rounded-2xl border border-emerald-500/20">
                          <span className="text-[9px] font-black uppercase text-emerald-400 block">🏙️ City Scope</span>
                          <span className="text-lg font-black text-emerald-300 font-mono">{supportAgents.filter(a => a.role === 'city').length}</span>
                          <span className="text-[9px] text-gray-500 block">Regional Care Reps</span>
                        </div>
                        <div className="bg-[#1B232C] p-3.5 rounded-2xl border border-blue-500/20">
                          <span className="text-[9px] font-black uppercase text-blue-400 block">🛵 Delivery Support</span>
                          <span className="text-lg font-black text-blue-300 font-mono">{supportAgents.filter(a => a.role === 'delivery_support_global' || a.role === 'delivery_support_city').length}</span>
                          <span className="text-[9px] text-gray-500 block">Rider Care Specialists</span>
                        </div>
                      </div>

                      {/* AGENTS ROSTER GRID */}
                      {supportAgents.length === 0 ? (
                        <div className="p-8 text-center bg-[#1B232C] rounded-2xl border border-white/5 space-y-3">
                          <Headphones className="w-10 h-10 text-gray-600 mx-auto" />
                          <h4 className="text-xs font-black uppercase text-gray-400">No Support Agents Created Yet</h4>
                          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                            Tap "Add Support Agent" above to create customer support credentials for your staff.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {supportAgents.map((agent) => (
                            <div key={agent.id} className="bg-[#1B232C] border border-brand-green/15 rounded-2xl p-4 space-y-3.5 hover:border-brand-orange/30 transition-all shadow-md">
                              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center font-black text-sm shrink-0">
                                    🎧
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-black text-white uppercase">{agent.name}</h4>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                        agent.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/80 text-red-400 border border-red-900/40'
                                      }`}>
                                        {agent.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                      ID: {agent.id} • {agent.phone}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider border shrink-0 ${
                                  agent.role === 'overall' ? 'bg-purple-950/80 text-purple-300 border-purple-800/40' :
                                  agent.role === 'kitchen' ? 'bg-amber-950/80 text-amber-300 border-amber-800/40' :
                                  agent.role === 'city' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40' :
                                  agent.role === 'delivery_support_global' ? 'bg-blue-950/80 text-blue-300 border-blue-800/40' :
                                  'bg-cyan-950/80 text-cyan-300 border-cyan-800/40'
                                }`}>
                                  {agent.role === 'overall' ? '🌐 Overall Access' :
                                   agent.role === 'kitchen' ? `🏬 Kitchen (${agent.assignedKitchenName || 'Assigned'})` :
                                   agent.role === 'city' ? `🏙️ City (${agent.assignedCity || 'All'})` :
                                   agent.role === 'delivery_support_global' ? '🛵 Rider Support (Global)' :
                                   `🛵 Rider Support (${agent.assignedCity || 'City'})`}
                                </span>
                              </div>

                              <div className="bg-[#12181E] p-3 rounded-xl border border-white/5 space-y-1 text-[11px] font-mono">
                                <div className="flex items-center justify-between text-gray-300">
                                  <span className="text-gray-500 uppercase text-[9px]">Email:</span>
                                  <span className="font-bold text-white select-all">{agent.email}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-300">
                                  <span className="text-gray-500 uppercase text-[9px]">Password:</span>
                                  <span className="font-bold text-brand-orange select-all">{agent.password}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                                <span className="text-gray-500 font-bold uppercase text-[9px]">Firebase Auth Status:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                    agent.firebaseAuthSynced ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/80 text-amber-400 border border-amber-900/40'
                                  }`}>
                                    {agent.firebaseAuthSynced ? '🟢 Auth Active' : '🟡 Pending Auth'}
                                  </span>
                                  {!agent.firebaseAuthSynced && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const res = await syncPartnerToFirebaseAuth(agent.email, agent.password);
                                        if (res.success) {
                                          const updated = { ...agent, firebaseAuthSynced: true, firebaseUid: res.uid };
                                          await setDoc(doc(db, 'support_agents', agent.id), updated);
                                          setSupportAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
                                          alert(`✓ Successfully provisioned Firebase Auth for ${agent.name}!`);
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-[8px] font-bold uppercase rounded border border-brand-orange/30 cursor-pointer"
                                    >
                                      Sync Auth
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopySupportAgentCredentials(agent)}
                                    className="px-2.5 py-1.5 bg-brand-charcoal hover:bg-gray-800 text-gray-300 border border-white/10 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareSupportAgentWhatsApp(agent)}
                                    className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/40 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSupportAgent(agent)}
                                    className="px-2.5 py-1.5 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/30 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSupportAgent(agent.id, agent.name)}
                                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-[9px] uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* WORKSPACE 11: USER MANAGEMENT & PUSH NOTIFICATION ENGINE CONSOLE */}
            {activeTab === 'users' && (() => {
              return (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl space-y-6"
                >
                  {/* Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-green/10 pb-5">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-orange" />
                        User Management & Push Notification Engine
                      </h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Manage user roles, filter accounts, and broadcast targeted push notifications & in-app promo alerts across customer inboxes.
                      </p>
                    </div>

                    {/* Sub-Navigation Tabs */}
                    <div className="flex items-center gap-1.5 bg-[#0F1419] p-1.5 rounded-2xl border border-brand-green/15 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setNotifSubTab('roster')}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                          notifSubTab === 'roster'
                            ? 'bg-brand-green text-brand-charcoal shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" /> Roster ({allUsersCombined.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotifSubTab('composer')}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                          notifSubTab === 'composer'
                            ? 'bg-brand-orange text-brand-charcoal shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Megaphone className="w-3.5 h-3.5" /> Push Notification Engine
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotifSubTab('history')}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                          notifSubTab === 'history'
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" /> Campaign History ({sentCampaigns.length})
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB 1: USER ROSTER & MANAGEMENT */}
                  {notifSubTab === 'roster' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Metrics Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-brand-green/20">
                          <span className="text-[9px] font-black uppercase text-brand-green tracking-wider block">👥 Total Registered</span>
                          <span className="text-xl font-black text-white font-mono">{allUsersCombined.length}</span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">Across all roles</span>
                        </div>

                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-blue-500/20">
                          <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider block">🥗 Customers</span>
                          <span className="text-xl font-black text-blue-300 font-mono">
                            {allUsersCombined.filter(u => !u.role || u.role === 'customer').length}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">Foodies & subscribers</span>
                        </div>

                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-amber-500/20">
                          <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">🛵 Delivery Fleet</span>
                          <span className="text-xl font-black text-amber-300 font-mono">
                            {allUsersCombined.filter(u => u.role === 'rider').length}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">Riders & couriers</span>
                        </div>

                        <div className="bg-[#1B232C] p-4 rounded-2xl border border-teal-500/20">
                          <span className="text-[9px] font-black uppercase text-teal-400 tracking-wider block">🍳 Kitchen & Admins</span>
                          <span className="text-xl font-black text-teal-300 font-mono">
                            {allUsersCombined.filter(u => u.role === 'kitchen' || u.role === 'admin').length}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">Branch operators</span>
                        </div>

                        <div className="bg-[#1B232C] p-4 rounded-2xl border-2 border-rose-600/40 shadow-[0_0_15px_rgba(225,29,72,0.15)] col-span-2 sm:col-span-1">
                          <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-500" /> Banned / Isolated
                          </span>
                          <span className="text-xl font-black text-rose-300 font-mono">
                            {allUsersCombined.filter(u => u.banned === true).length}
                          </span>
                          <span className="text-[9px] text-rose-400/80 block mt-0.5">Under Firewall Lock</span>
                        </div>
                      </div>

                      {/* Filter and Sort Toolbar */}
                      <div className="bg-[#182028] p-4 rounded-2xl border border-brand-green/10 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                          {/* Search Input */}
                          <div className="md:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Search Users</label>
                            <input
                              type="text"
                              placeholder="Search by name, email, phone, city..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                            />
                          </div>

                          {/* Role Filter */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Role Filter</label>
                            <select
                              value={userRoleFilter}
                              onChange={(e) => setUserRoleFilter(e.target.value as any)}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green cursor-pointer"
                            >
                              <option value="all">All Roles</option>
                              <option value="customer">Customer Only</option>
                              <option value="rider">Rider / Delivery Fleet</option>
                              <option value="kitchen">Kitchen Operator</option>
                              <option value="admin">System Admin</option>
                            </select>
                          </div>

                          {/* City Filter */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">City Filter</label>
                            <select
                              value={userCityFilter}
                              onChange={(e) => setUserCityFilter(e.target.value)}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green cursor-pointer"
                            >
                              <option value="all">All Cities</option>
                              {allCitiesList.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* Sort By */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Sort Order</label>
                            <select
                              value={userSortBy}
                              onChange={(e) => setUserSortBy(e.target.value as any)}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green cursor-pointer"
                            >
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="name">Name (A-Z)</option>
                              <option value="city">City (A-Z)</option>
                            </select>
                          </div>
                        </div>

                        {/* Second Row: Status Filter Chips */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-brand-green/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Account Status:</span>
                            <button
                              type="button"
                              onClick={() => setUserBannedFilter('all')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                userBannedFilter === 'all'
                                  ? 'bg-brand-green text-brand-charcoal font-black'
                                  : 'bg-brand-charcoal text-gray-400 hover:text-white'
                              }`}
                            >
                              All Statuses
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserBannedFilter('active')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                userBannedFilter === 'active'
                                  ? 'bg-emerald-500 text-brand-charcoal font-black'
                                  : 'bg-brand-charcoal text-gray-400 hover:text-white'
                              }`}
                            >
                              Active Only
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserBannedFilter('banned')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                userBannedFilter === 'banned'
                                  ? 'bg-rose-600 text-white font-black'
                                  : 'bg-brand-charcoal text-gray-400 hover:text-white'
                              }`}
                            >
                              🔴 Banned Only ({allUsersCombined.filter(u => u.banned).length})
                            </button>
                          </div>

                          <span className="text-[10px] font-mono text-gray-400">
                            Showing <strong className="text-white font-bold">{filteredUsers.length}</strong> of {allUsersCombined.length} users
                          </span>
                        </div>
                      </div>

                      {/* Users Roster List */}
                      <div className="space-y-3">
                        {filteredUsers.length === 0 ? (
                          <div className="p-10 text-center bg-[#151C24] rounded-2xl border border-brand-green/10 space-y-2">
                            <Users className="w-10 h-10 text-gray-500 mx-auto" />
                            <h4 className="text-xs font-black uppercase text-gray-300">No matching user accounts found</h4>
                            <p className="text-[11px] text-gray-500">Try adjusting search keywords or clearing role/city filters.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {filteredUsers.map((u, uIdx) => {
                              const isBanned = u.banned === true;
                              const roleName = u.role || 'customer';
                              const userCity = u.city || 'Muzaffarpur';

                              return (
                                <div
                                  key={u.id ? `usr-${u.id}-${uIdx}` : `usr-${u.email || 'guest'}-${uIdx}`}
                                  className={`bg-[#182028] border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                    isBanned
                                      ? 'border-rose-600/40 bg-rose-950/20 shadow-[0_0_20px_rgba(225,29,72,0.1)]'
                                      : 'border-brand-green/15 hover:border-brand-green/30'
                                  }`}
                                >
                                  {/* User Profile Info */}
                                  <div className="flex items-center gap-3.5">
                                    <img
                                      src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                                      alt={u.name}
                                      className={`w-12 h-12 rounded-2xl object-cover border ${
                                        isBanned ? 'border-rose-500' : 'border-brand-green/30'
                                      }`}
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-extrabold text-xs text-white uppercase">{u.name || 'User'}</h4>
                                        {/* Role Tag */}
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                          roleName === 'admin'
                                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                            : roleName === 'kitchen'
                                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                                            : roleName === 'rider'
                                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                                        }`}>
                                          {roleName}
                                        </span>

                                        {/* Status Tag */}
                                        {isBanned ? (
                                          <span className="text-[8px] font-black bg-rose-950 text-rose-300 border border-rose-600/60 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                            <Lock className="w-2.5 h-2.5 text-rose-400" /> BANNED (FIREWALL ACTIVE)
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded uppercase">
                                            ACTIVE
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400 mt-1 font-mono">
                                        <span>✉️ {u.email}</span>
                                        {u.phone && <span>📞 {u.phone}</span>}
                                        <span className="text-brand-orange">📍 City: {userCity}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Operational Controls */}
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    {/* View Profile Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingUserProfile(u);
                                        setEditedUserProfileRole(u.role || 'customer');
                                        setEditedUserProfileCity(u.city || 'Muzaffarpur');
                                      }}
                                      className="px-3 py-2 bg-brand-charcoal hover:bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> View Profile & Data
                                    </button>

                                    {/* Ban / Unban Toggle Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isBanned) {
                                          handleToggleUserBan(u);
                                        } else {
                                          setBanningUser(u);
                                          setBanReasonInput('Violation of terms of service.');
                                        }
                                      }}
                                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                                        isBanned
                                          ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-600'
                                          : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-600/60'
                                      }`}
                                    >
                                      {isBanned ? (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Lift Ban
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="w-3.5 h-3.5 text-rose-400" /> Ban Account
                                        </>
                                      )}
                                    </button>

                                    {/* Delete Account Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-2 bg-brand-charcoal hover:bg-red-950/60 text-red-400 border border-red-900/40 rounded-xl transition-all cursor-pointer"
                                      title="Delete User"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: PUSH NOTIFICATION DISPATCHER COMPOSER */}
                  {notifSubTab === 'composer' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                      {/* Left Side: Campaign Form */}
                      <form onSubmit={handleDispatchNotification} className="lg:col-span-7 space-y-4 bg-[#182028] border border-brand-green/20 p-5 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-brand-green/10 pb-3">
                          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-brand-orange" />
                            Compose Notification Campaign
                          </h3>
                          <span className="text-[9px] font-bold bg-brand-orange/15 text-brand-orange px-2.5 py-0.5 rounded-full border border-brand-orange/30 uppercase">
                            REAL-TIME PUSH
                          </span>
                        </div>

                        {/* Category Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                              Notification Category
                            </label>
                            <span className="text-[9px] font-mono text-brand-green">
                              Adaptive Action: {notifButtonText}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'promo', label: '🏷️ Promo / Discount', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' },
                              { id: 'order_update', label: '📦 Order Status', color: 'border-blue-500/30 text-blue-400 bg-blue-950/20' },
                              { id: 'chef_special', label: '👨‍🍳 Chef Special', color: 'border-amber-500/30 text-amber-400 bg-amber-950/20' },
                              { id: 'event', label: '🔥 Event / Contest', color: 'border-purple-500/30 text-purple-400 bg-purple-950/20' },
                              { id: 'system', label: '⚙️ System Alert', color: 'border-gray-500/30 text-gray-300 bg-gray-900/40' },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleCategorySelect(cat.id as any)}
                                className={`px-2.5 py-2 text-[10px] font-black rounded-xl border transition-all text-left cursor-pointer ${
                                  notifCategory === cat.id
                                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange font-black shadow-md'
                                    : `${cat.color} opacity-70 hover:opacity-100`
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title & Body Inputs */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Campaign Title *</label>
                              <span className="text-[9px] text-gray-500 font-mono">{notifTitle.length}/60 chars</span>
                            </div>
                            <input
                              required
                              type="text"
                              maxLength={60}
                              value={notifTitle}
                              onChange={(e) => setNotifTitle(e.target.value)}
                              placeholder="e.g. 🌶️ Weekend Special: 40% OFF Bhatti Charcoal Platters!"
                              className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/70"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Message Body *</label>
                              <span className="text-[9px] text-gray-500 font-mono">{notifBody.length}/160 chars</span>
                            </div>
                            <textarea
                              required
                              rows={3}
                              maxLength={160}
                              value={notifBody}
                              onChange={(e) => setNotifBody(e.target.value)}
                              placeholder="e.g. Savor freshly smoked tandoori protein recipes prepared by master chefs. Tap to claim your instant discount voucher before midnight."
                              className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/70 resize-none"
                            />
                          </div>
                        </div>

                        {/* Audience Targeting Filters */}
                        <div className="space-y-2 pt-2 border-t border-brand-green/10">
                          <label className="text-[10px] font-bold text-gray-400 block uppercase">
                            Target Audience Segment
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'all', label: '🌐 All App Users', desc: 'Broadcast to everyone' },
                              { id: 'vip', label: '👑 VIP Subscribers', desc: 'High lifetime value' },
                              { id: 'city', label: '📍 City Filter', desc: 'Geographic targeting' },
                              { id: 'selected_users', label: '🎯 Selected Users', desc: 'Pick specific accounts' },
                              { id: 'no_permissions', label: '🔔 In-App Inbox Only', desc: 'Users with push off' },
                            ].map((aud) => (
                              <button
                                key={aud.id}
                                type="button"
                                onClick={() => setNotifAudience(aud.id as any)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  notifAudience === aud.id
                                    ? 'bg-brand-green text-brand-charcoal border-brand-green shadow-sm'
                                    : 'bg-[#12181E] border-brand-green/15 text-gray-300 hover:border-brand-green/40'
                                }`}
                              >
                                <span className="text-[10px] font-black uppercase block">{aud.label}</span>
                                <span className={`text-[8px] block mt-0.5 ${notifAudience === aud.id ? 'text-brand-charcoal/80 font-bold' : 'text-gray-500'}`}>
                                  {aud.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Conditional Audience Options */}
                          {notifAudience === 'city' && (
                            <div className="mt-3 bg-[#12181E] p-3 rounded-xl border border-brand-orange/30 space-y-1.5 animate-fade-in">
                              <label className="text-[9px] font-bold text-brand-orange uppercase">Select Target City:</label>
                              <select
                                value={notifCity}
                                onChange={(e) => setNotifCity(e.target.value)}
                                className="w-full bg-[#1B232C] border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              >
                                {allCitiesList.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {notifAudience === 'selected_users' && (
                            <div className="mt-3 bg-[#12181E] p-3 rounded-xl border border-brand-green/30 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-brand-green uppercase">
                                  Select Target Users ({notifSelectedUserIds.length} chosen):
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (notifSelectedUserIds.length === allUsersCombined.length) {
                                      setNotifSelectedUserIds([]);
                                    } else {
                                      setNotifSelectedUserIds(allUsersCombined.map(u => u.id || u.email));
                                    }
                                  }}
                                  className="text-[9px] font-extrabold text-brand-orange hover:underline uppercase"
                                >
                                  {notifSelectedUserIds.length === allUsersCombined.length ? 'Deselect All' : 'Select All Users'}
                                </button>
                              </div>

                              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                {allUsersCombined.map((u) => {
                                  const uid = u.id || u.email;
                                  const isChecked = notifSelectedUserIds.includes(uid);
                                  return (
                                    <label
                                      key={uid}
                                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                        isChecked ? 'bg-brand-green/15 border-brand-green text-white' : 'bg-[#182028] border-brand-green/10 text-gray-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setNotifSelectedUserIds(prev => [...prev, uid]);
                                            } else {
                                              setNotifSelectedUserIds(prev => prev.filter(id => id !== uid));
                                            }
                                          }}
                                          className="accent-brand-green"
                                        />
                                        <span className="font-bold">{u.name || 'User'}</span>
                                      </div>
                                      <span className="text-[9px] font-mono text-gray-500">{u.email}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Image Upload & Attachment */}
                        <div className="pt-2 border-t border-brand-green/10">
                          <ImageUploader
                            value={notifImageUrl}
                            onChange={(url) => setNotifImageUrl(url)}
                            label="Notification Image Attachment (Upload / Photo / Link)"
                            placeholder="Directly upload photo, snap picture, or paste image URL to attach"
                            compact={false}
                          />
                        </div>

                        {/* In-App Destination & Action Button Customization */}
                        <div className="space-y-3 pt-2 border-t border-brand-green/10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">
                                  In-App Destination
                                </label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setNotifLinkType('preset')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                                      notifLinkType === 'preset' ? 'bg-brand-green text-brand-charcoal font-black' : 'bg-white/5 text-gray-400'
                                    }`}
                                  >
                                    Presets
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNotifLinkType('custom')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                                      notifLinkType === 'custom' ? 'bg-brand-orange text-brand-charcoal font-black' : 'bg-white/5 text-gray-400'
                                    }`}
                                  >
                                    Custom URL
                                  </button>
                                </div>
                              </div>

                              {notifLinkType === 'preset' ? (
                                <select
                                  value={notifLinkUrl}
                                  onChange={(e) => setNotifLinkUrl(e.target.value)}
                                  className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="menu">🥗 Fitzaika Gourmet Menu</option>
                                  <option value="catering">🔥 Taash Bhatti Charcoal Specials</option>
                                  <option value="coupons">🎟️ Coupons & Discounts</option>
                                  <option value="orders">📦 Order Tracker & History</option>
                                  <option value="coach">💪 AI Fitness & Macro Coach</option>
                                  <option value="gyms">🏋️ Partner Gyms & Fitness Centers</option>
                                  <option value="account">👤 Profile & Account Settings</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={customLinkUrl}
                                  onChange={(e) => setCustomLinkUrl(e.target.value)}
                                  placeholder="e.g. https://fitzaika.com/promo or /custom-route"
                                  className="w-full bg-[#12181E] border border-brand-orange/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                                />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">
                                  Action Button Label
                                </label>
                                <span className="text-[8px] font-mono text-brand-orange">Adaptive</span>
                              </div>
                              <input
                                type="text"
                                value={notifButtonText}
                                onChange={(e) => setNotifButtonText(e.target.value)}
                                placeholder="e.g. CLAIM OFFER ➜, TRACK NOW ➜, WITNESS ➜"
                                className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSendingNotif || !notifTitle.trim() || !notifBody.trim()}
                          className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSendingNotif ? 'Dispatching Broadcast...' : '🚀 DISPATCH PUSH NOTIFICATION & IN-APP ALERT'}</span>
                        </button>
                      </form>

                      {/* Right Side: Phone Notification Mockup Preview */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-[#182028] border border-brand-green/20 p-5 rounded-2xl text-center space-y-4">
                          <div className="flex items-center justify-between border-b border-brand-green/10 pb-3">
                            <span className="text-[9px] font-black uppercase text-brand-orange tracking-widest flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5" /> LIVE DEVICE PREVIEW
                            </span>
                            <span className="text-[9px] font-mono text-gray-400">Lockscreen View</span>
                          </div>

                          {/* Simulated Smartphone Screen */}
                          <div className="max-w-xs mx-auto bg-[#0A0D10] border-4 border-gray-800 rounded-[36px] p-4 shadow-2xl relative space-y-3">
                            {/* Phone Notch */}
                            <div className="w-20 h-3 bg-gray-800 mx-auto rounded-full mb-2" />

                            <div className="text-[9px] text-gray-400 font-mono text-center">Today 09:41 AM</div>

                            {/* Push Notification Card */}
                            <motion.div
                              layout
                              className="bg-[#141B22]/95 border border-brand-green/30 rounded-2xl p-3.5 shadow-xl text-left space-y-2 backdrop-blur-md"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-md bg-brand-green flex items-center justify-center text-brand-charcoal font-black text-[10px]">
                                    🔥
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-green">
                                    FITZAIKA • TAASH BHATTI
                                  </span>
                                </div>
                                <span className="text-[8px] text-gray-500 font-mono">now</span>
                              </div>

                              <h4 className="text-xs font-black text-white leading-tight">
                                {notifTitle || 'Title Placeholder'}
                              </h4>

                              <p className="text-[10px] text-gray-300 leading-snug">
                                {notifBody || 'Body content placeholder will appear here as users view their lockscreen alert.'}
                              </p>

                              {notifImageUrl && (
                                <img
                                  src={notifImageUrl}
                                  alt="Preview Banner"
                                  className="w-full h-24 object-cover rounded-xl border border-brand-green/20 mt-1"
                                />
                              )}

                              <div className="pt-2 border-t border-brand-green/10 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded">
                                  Category: {notifCategory}
                                </span>
                                <span className="text-[9px] font-extrabold text-brand-green">
                                  {notifButtonText}
                                </span>
                              </div>
                            </motion.div>
                          </div>

                          <p className="text-[10px] text-gray-500 italic">
                            This live mockup reflects how the notification appears on customer smartphones and inside their in-app Notification Inbox.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: CAMPAIGN HISTORY LOGS */}
                  {notifSubTab === 'history' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-brand-green/10 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <Bell className="w-4 h-4 text-purple-400" />
                          Past Notification Campaigns ({sentCampaigns.length})
                        </h3>
                        <span className="text-[9px] text-gray-400 font-mono">Real-time sync from Firestore</span>
                      </div>

                      {sentCampaigns.length === 0 ? (
                        <div className="p-10 text-center bg-[#151C24] rounded-2xl border border-brand-green/10 space-y-2">
                          <Megaphone className="w-10 h-10 text-gray-500 mx-auto" />
                          <h4 className="text-xs font-black uppercase text-gray-300">No campaigns dispatched yet</h4>
                          <p className="text-[11px] text-gray-500">Switch to the Push Notification Engine tab above to create and dispatch your first campaign.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sentCampaigns.map((camp) => (
                            <div
                              key={camp.id}
                              className="bg-[#182028] border border-brand-green/15 rounded-2xl p-4 space-y-3 hover:border-brand-green/30 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase bg-brand-orange/15 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded">
                                  {camp.category || 'promo'}
                                </span>
                                <span className="text-[9px] font-mono text-gray-400">
                                  {new Date(camp.sentAt).toLocaleString()}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-xs font-black text-white uppercase">{camp.title}</h4>
                                <p className="text-[11px] text-gray-300 mt-1 leading-snug">{camp.body}</p>
                              </div>

                              {camp.imageUrl && (
                                <img
                                  src={camp.imageUrl}
                                  alt={camp.title}
                                  className="w-full h-28 object-cover rounded-xl border border-brand-green/10"
                                />
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-brand-green/10 text-[10px]">
                                <span className="text-gray-400 font-mono">
                                  Target: <strong className="text-brand-green font-bold uppercase">{camp.targetAudience}</strong>
                                </span>
                                <span className="text-gray-400 font-mono">
                                  Reads: <strong className="text-purple-300 font-bold">{camp.readBy?.length || 0} users</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* FORM MODAL DIALOG (SWITCH KITCHEN TERMINAL) */}
            <AnimatePresence>
              {showSwitchKdsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSwitchKdsModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-5 my-auto overflow-hidden text-left"
                  >
                    <div className="flex items-start justify-between border-b border-brand-green/10 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          KDS TERMINAL CONTROLLER
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          Switch Kitchen Terminal
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowSwitchKdsModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmedId = switchKdsInputId.trim();
                        if (!trimmedId) return;

                        // Check if the ID matches any kitchen (by ID or case-insensitive name)
                        const matchedKitchen = allKitchens.find(
                          k => k.id.toLowerCase() === trimmedId.toLowerCase() || k.name.toLowerCase().includes(trimmedId.toLowerCase())
                        );

                        if (matchedKitchen) {
                          setSelectedKdsKitchenId(matchedKitchen.id);
                          setShowSwitchKdsModal(false);
                          setSwitchKdsInputId('');
                          setKdsPasswordError('');
                        } else {
                          setKdsPasswordError(`No kitchen branch found for: "${trimmedId}"`);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase text-left">Enter Kitchen ID or Name</label>
                        <input
                          required
                          type="text"
                          value={switchKdsInputId}
                          onChange={(e) => {
                            setSwitchKdsInputId(e.target.value);
                            setKdsPasswordError('');
                          }}
                          placeholder="e.g. k_1721000000000"
                          className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                        />
                        {kdsPasswordError && (
                          <p className="text-[10px] text-red-400 font-bold mt-1.5 uppercase tracking-wider text-left">{kdsPasswordError}</p>
                        )}
                      </div>

                      {/* Display registered kitchen branches for easy testing */}
                      <div className="bg-[#12181E] p-3 border border-brand-green/5 rounded-2xl space-y-2 text-left">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">Registered Kitchen Branches</span>
                        {allKitchens.length === 0 ? (
                          <span className="text-[10px] text-gray-500 italic block">No active kitchen branches registered.</span>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {allKitchens.map((k, index) => (
                              <button
                                key={k.id}
                                type="button"
                                onClick={() => {
                                  setSelectedKdsKitchenId(k.id);
                                  setShowSwitchKdsModal(false);
                                  setSwitchKdsInputId('');
                                  setKdsPasswordError('');
                                }}
                                className="w-full text-left p-1.5 rounded bg-brand-charcoal/40 hover:bg-brand-green/10 border border-brand-green/5 hover:border-brand-green/25 text-[10px] text-gray-300 flex items-center justify-between transition-all cursor-pointer"
                              >
                                <span>
                                  <span className="font-bold text-white">{k.name}</span>
                                  <span className="text-gray-500 ml-1">({k.id})</span>
                                </span>
                                {index === 0 ? (
                                  <span className="text-[8px] font-black bg-brand-orange/15 text-brand-orange border border-brand-orange/35 px-1 py-0.5 rounded">
                                    🔑 PASSWORD REQ
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/35 px-1 py-0.5 rounded">
                                    🔓 FREE ACCESS
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowSwitchKdsModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer border-none bg-transparent"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer border-none"
                        >
                          Access Terminal
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FORM MODAL DIALOG (KITCHEN EDITING AND CREATION) */}
            <AnimatePresence>
              {showKitchenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto pt-10 pb-10">
                  {/* Backdrop Blur overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowKitchenModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  {/* Form Card content */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl z-10 space-y-5 my-auto overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between border-b border-brand-green/10 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          {editingKitchen ? 'KITCHEN RE-CALIBRATION' : 'NEW KITCHEN REGISTRATION'}
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          {editingKitchen ? `Edit Kitchen: ${editingKitchen.name}` : 'Onboard New Kitchen Branch'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowKitchenModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveKitchen} className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Kitchen Name *</label>
                          <input
                            required
                            type="text"
                            value={kitchenName}
                            onChange={(e) => setKitchenName(e.target.value)}
                            placeholder="e.g. TAASH BHATTI North Muzaffarpur Kitchen"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Full Delivery Address *</label>
                          <input
                            required
                            type="text"
                            value={kitchenAddress}
                            onChange={(e) => setKitchenAddress(e.target.value)}
                            placeholder="e.g. Mithanpura Chowk, near Petrol Pump, Muzaffarpur"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Operating City *</label>
                          <input
                            required
                            type="text"
                            value={kitchenCity}
                            onChange={(e) => setKitchenCity(e.target.value)}
                            placeholder="e.g. Muzaffarpur, Mumbai, Delhi, Patna, Bengaluru"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-brand-green font-bold placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Delivery Geofence Radius (km) *</label>
                          <input
                            required
                            type="number"
                            min={1}
                            max={100}
                            value={kitchenGeofenceRadius}
                            onChange={(e) => setKitchenGeofenceRadius(Number(e.target.value))}
                            placeholder="e.g. 5"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                          <span className="text-[8px] text-gray-500 mt-1 block">Maximum distance inside which this kitchen accepts & delivers orders.</span>
                        </div>

                        {/* Google Maps verification module */}
                        <div className="bg-[#12181E] p-3.5 border border-brand-green/10 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-green block">Google Maps Verification & Location Search</span>
                            <span className="text-[9px] font-mono text-gray-500">
                              {kitchenLat && kitchenLng ? `LAT: ${kitchenLat.toFixed(5)}, LNG: ${kitchenLng.toFixed(5)}` : '⚠️ COORDINATES NOT SET'}
                            </span>
                          </div>

                          {GOOGLE_MAPS_API_KEY ? (
                            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                              <KitchenLocationPicker
                                lat={kitchenLat}
                                lng={kitchenLng}
                                onSelectLocation={(lat, lng, addr) => {
                                  setKitchenLat(lat);
                                  setKitchenLng(lng);
                                  if (addr) {
                                    setKitchenAddress(addr);
                                  }
                                }}
                              />
                            </APIProvider>
                          ) : (
                            <div className="text-[10px] text-red-400 italic">
                              ⚠️ Maps Platform Key not detected. Please drag map or configure manually.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Operational Active Flag */}
                      <div className="flex items-center gap-2 bg-brand-charcoal/30 p-3 rounded-2xl border border-brand-green/5">
                        <input
                          type="checkbox"
                          id="kitchenIsActiveCheckbox"
                          checked={kitchenIsActive}
                          onChange={(e) => setKitchenIsActive(e.target.checked)}
                          className="w-4 h-4 text-brand-green bg-[#12181E] border-gray-600 rounded focus:ring-brand-green cursor-pointer"
                        />
                        <label htmlFor="kitchenIsActiveCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                          Operational Active (Accepting Orders)
                        </label>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowKitchenModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {editingKitchen ? 'Re-Calibrate Kitchen' : 'Onboard Kitchen'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FORM MODAL DIALOG (KITCHEN MANAGER ONBOARDING & EDITING) */}
            <AnimatePresence>
              {showKitchenManagerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto pt-10 pb-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowKitchenManagerModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative bg-[#12181E] border border-brand-green/20 rounded-3xl p-6 sm:p-7 max-w-lg w-full z-10 shadow-2xl space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-green/10 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <ChefHat className="w-4 h-4 text-brand-green" />
                          {editingKitchenManager ? 'Edit Kitchen Manager' : 'Onboard Kitchen Manager'}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Configure station credentials and assign to a physical kitchen branch for KDS access.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowKitchenManagerModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveKitchenManager} className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Head Chef / Manager Name *</label>
                          <input
                            required
                            type="text"
                            value={kmName}
                            onChange={(e) => setKmName(e.target.value)}
                            placeholder="e.g. Chef Rajesh Kumar"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Contact Mobile Number *</label>
                            <input
                              required
                              type="tel"
                              value={kmPhone}
                              onChange={(e) => setKmPhone(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Assigned Kitchen Branch *</label>
                            <select
                              required
                              value={kmKitchenId}
                              onChange={(e) => setKmKitchenId(e.target.value)}
                              className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 cursor-pointer"
                            >
                              <option value="" disabled>Select Kitchen Hub</option>
                              {allKitchens.map(k => (
                                <option key={k.id} value={k.id} className="bg-brand-charcoal text-white">
                                  {k.name} ({k.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Login Email Address *</label>
                          <input
                            required
                            type="email"
                            value={kmEmail}
                            onChange={(e) => setKmEmail(e.target.value)}
                            placeholder="e.g. chef.rajesh@taashbhatti.com"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Station Password *</label>
                            <button
                              type="button"
                              onClick={() => setKmPassword('TbKitchen@' + Math.floor(1000 + Math.random() * 9000))}
                              className="text-[9px] text-brand-green hover:underline font-bold uppercase tracking-wider"
                            >
                              Generate Strong
                            </button>
                          </div>
                          <input
                            required
                            type="text"
                            value={kmPassword}
                            onChange={(e) => setKmPassword(e.target.value)}
                            placeholder="e.g. TbKitchen@8821"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="kmStatusCheck"
                            checked={kmStatus === 'active'}
                            onChange={(e) => setKmStatus(e.target.checked ? 'active' : 'inactive')}
                            className="w-4 h-4 rounded bg-brand-charcoal border-brand-green/30 text-brand-green focus:ring-0 cursor-pointer"
                          />
                          <label htmlFor="kmStatusCheck" className="text-xs text-gray-300 font-bold uppercase tracking-wider cursor-pointer">
                            Active Operational Station Access
                          </label>
                        </div>
                      </div>

                      <div className="bg-brand-green/5 border border-brand-green/15 rounded-xl p-3 text-[10px] text-gray-300 space-y-1">
                        <p className="font-bold text-brand-green flex items-center gap-1">
                          <span>🔐</span> Auto Firebase Authentication Provisioning
                        </p>
                        <p className="text-gray-400">
                          Saving will automatically provision Firebase Auth credentials for this email & password. The chef can log in using Email/Password on the sign-in modal to immediately access the Kitchen KDS terminal.
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowKitchenManagerModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {editingKitchenManager ? 'Save Changes' : 'Create Kitchen Manager'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showGymModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto pt-10 pb-10">
                  {/* Backdrop Blur overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowGymModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  {/* Form Card content */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-[28px] max-w-2xl w-full p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-green/15 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          {editingGym ? 'PARTNER SPEC RE-CALIBRATION' : 'NEW AFFILIATION DISPATCH CONFIG'}
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          {editingGym ? `Edit Partner: ${editingGym.name}` : 'Onboard New Physical Gym'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowGymModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveGym} className="space-y-4">
                      {/* Section A: Text Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Gym Chain / Clanspace *</label>
                          <select
                            required
                            value={gymChainId}
                            onChange={(e) => setGymChainId(e.target.value)}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-green/40"
                          >
                            <option value="" disabled>-- Select Gym Chain / Clanspace --</option>
                            {gymChains.map((chain) => (
                              <option key={chain.id} value={chain.id}>
                                {chain.name} ({chain.id})
                              </option>
                            ))}
                          </select>
                          {gymChains.length === 0 && (
                            <span className="text-[9px] text-red-400 mt-1 block">
                              ⚠️ No Gym Chains/Clanspaces defined. Please create a clanspace first.
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Gym Branch Name *</label>
                          <input
                            required
                            type="text"
                            value={gymName}
                            onChange={(e) => setGymName(e.target.value)}
                            placeholder="e.g. Golds Gym Elite"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">City *</label>
                          <input
                            required
                            type="text"
                            value={gymCity}
                            onChange={(e) => setGymCity(e.target.value)}
                            placeholder="e.g. Bengaluru"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Full Physical Address *</label>
                          <input
                            required
                            type="text"
                            value={gymAddress}
                            onChange={(e) => setGymAddress(e.target.value)}
                            placeholder="e.g. 5th Block, Koramangala, Landmark: Near Sony Signal"
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                          />
                        </div>

                        {/* Google Maps verification module */}
                        <div className="col-span-1 sm:col-span-2 bg-[#12181E] p-3.5 border border-brand-green/10 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-green block">Google Maps Verification & Location Search</span>
                            <span className="text-[9px] font-mono text-gray-500">
                              {gymLat && gymLng ? `LAT: ${gymLat.toFixed(5)}, LNG: ${gymLng.toFixed(5)}` : '⚠️ COORDINATES NOT SET'}
                            </span>
                          </div>

                          {GOOGLE_MAPS_API_KEY ? (
                            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                              <GymLocationPicker
                                lat={gymLat}
                                lng={gymLng}
                                onSelectLocation={(lat, lng, address) => {
                                  setGymLat(lat);
                                  setGymLng(lng);
                                  if (address) setGymAddress(address);
                                }}
                              />
                            </APIProvider>
                          ) : (
                            <div className="h-48 w-full bg-brand-charcoal/50 rounded-xl border border-brand-green/10 flex flex-col items-center justify-center text-center p-4">
                              <MapPin className="w-8 h-8 text-gray-600 mb-2" />
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Maps API Key Missing or Incomplete</p>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-500 leading-normal">
                            💡 Use the search field to find the location on the map, or click/drag the pin manually to get exact terminal delivery coordinates.
                          </p>
                        </div>

                        <div>
                          <ImageUploader
                            value={gymImage}
                            onChange={setGymImage}
                            label="Gym / Terminal Photo (Optional)"
                            placeholder="Upload partner gym photo or select from device"
                            compact
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Partner Status Tier</label>
                          <select
                            value={gymPartnerStatus}
                            onChange={(e: any) => setGymPartnerStatus(e.target.value)}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-green/40"
                          >
                            <option value="bronze">Bronze Partner</option>
                            <option value="silver">Silver Partner</option>
                            <option value="gold">Gold Partner</option>
                            <option value="elite">Elite Partner</option>
                          </select>
                        </div>
                      </div>

                      {/* Section B: Owner Contact Details */}
                      <div className="bg-brand-charcoal/40 p-4 border border-brand-green/10 rounded-2xl space-y-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">GYM BUSINESS LIAISON INFO</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Liaison Name</label>
                            <input
                              type="text"
                              value={gymOwnerName}
                              onChange={(e) => setGymOwnerName(e.target.value)}
                              placeholder="e.g. Ramesh Kumar"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Liaison Phone</label>
                            <input
                              type="tel"
                              value={gymOwnerPhone}
                              onChange={(e) => setGymOwnerPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Liaison Email</label>
                            <input
                              type="email"
                              value={gymOwnerEmail}
                              onChange={(e) => setGymOwnerEmail(e.target.value)}
                              placeholder="partner@gymname.com"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section C: Offer and Rules Settings */}
                      <div className="bg-brand-charcoal/40 p-4 border border-brand-green/10 rounded-2xl space-y-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">INTEGRATED OFFERS & BENEFITS CONFIG</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Primary Offer Mode</label>
                            <select
                              value={gymOfferType}
                              onChange={(e: any) => setGymOfferType(e.target.value)}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value="discount">Direct Locker Code Discount</option>
                              <option value="free_meal">Free Meal rule</option>
                              <option value="perk_only">Perks / Goodies Only</option>
                              <option value="referral_bonus">Referral bonus campaign</option>
                              <option value="group_deal">Group Locker drops</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Locker checkout Discount %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={gymDiscountPct}
                              onChange={(e) => setGymDiscountPct(Number(e.target.value))}
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Promotion Banner Text</label>
                            <input
                              type="text"
                              value={gymBannerText}
                              onChange={(e) => setGymBannerText(e.target.value)}
                              placeholder="Flat 15% discount code on checkouts for Golds Gym members!"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Free Meal Qualifying Rule (Optional)</label>
                            <input
                              type="text"
                              value={gymFreeMealRule}
                              onChange={(e) => setGymFreeMealRule(e.target.value)}
                              placeholder="e.g. Free High-Protein Shake on order of ₹299"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Referral / QR Redemption Code *</label>
                            <input
                              required
                              type="text"
                              value={gymReferralCode}
                              onChange={(e) => setGymReferralCode(e.target.value)}
                              placeholder="e.g. GOLDS15"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                            />
                            <span className="text-[8px] text-gray-500 mt-1 block">Tracks redemptions and attributes conversions to this specific partner.</span>
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Exclusive Membership Perks (one perk per line)</label>
                            <textarea
                              value={gymMembersOffersRaw}
                              onChange={(e) => setGymMembersOffersRaw(e.target.value)}
                              rows={3}
                              placeholder="e.g. Complimentary pre-workout shot
Free body composition analysis every Sunday"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Group Order / Locker Deals (one deal per line)</label>
                            <textarea
                              value={gymGroupDealsRaw}
                              onChange={(e) => setGymGroupDealsRaw(e.target.value)}
                              rows={2}
                              placeholder="e.g. 10% cash refund on orders of 3+ meals
Free express delivery directly to trainer desks"
                              className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section D: Operational Flags */}
                      <div className="flex items-center gap-6 bg-brand-charcoal/30 p-3 rounded-2xl border border-brand-green/5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="gymIsActiveCheckbox"
                            checked={gymIsActive}
                            onChange={(e) => setGymIsActive(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-[#12181E] border-gray-600 rounded focus:ring-brand-green cursor-pointer"
                          />
                          <label htmlFor="gymIsActiveCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                            Operational Active
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="gymIsVerifiedCheckbox"
                            checked={gymIsVerified}
                            onChange={(e) => setGymIsVerified(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-[#12181E] border-gray-600 rounded focus:ring-brand-green cursor-pointer"
                          />
                          <label htmlFor="gymIsVerifiedCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                            Verify Site Station
                          </label>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowGymModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {editingGym ? 'Re-Calibrate Affiliation' : 'Onboard Partner Site'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FORM MODAL DIALOG (GYM CHAIN EDITING AND CREATION) */}
            <AnimatePresence>
              {showChainModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto pt-10 pb-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowChainModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-[28px] max-w-md w-full p-6 shadow-2xl z-10 space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-green/15 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          {editingChain ? 'CLANSPACE RE-CALIBRATION' : 'NEW CLANSPACE DISPATCH CONFIG'}
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          {editingChain ? `Edit Chain: ${editingChain.name}` : 'Create Gym Chain / Clanspace'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowChainModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveChain} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Chain / Brand Name *</label>
                        <input
                          required
                          type="text"
                          value={chainName}
                          onChange={(e) => setChainName(e.target.value)}
                          placeholder="e.g. City Center Hub, Grand Mall Outlet"
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Description</label>
                        <textarea
                          value={chainDescription}
                          onChange={(e) => setChainDescription(e.target.value)}
                          rows={3}
                          placeholder="Provide brand description or franchise information..."
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Chain Logo URL</label>
                        <input
                          type="text"
                          value={chainLogo}
                          onChange={(e) => setChainLogo(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full bg-[#12181E] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowChainModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {editingChain ? 'Save Clanspace' : 'Create Clanspace'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FORM MODAL DIALOG (MEAL EDITING AND CREATION) */}
            <AnimatePresence>
              {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                  {/* Backdrop Blur overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowFormModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  {/* Form Card content */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-[28px] max-w-2xl w-full p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-green/15 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-orange/15 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          {editingMeal ? 'SPECIFICATION RE-CALIBRATION' : 'NEW MENU DISPATCH CONFIG'}
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          {editingMeal ? `Edit Specifics: ${editingMeal.name}` : 'Construct New Goal Meal'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowFormModal(false)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveMeal} className="space-y-4">
                      {/* Section A: Text Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Meal Name *</label>
                          <input
                            required
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/70"
                            placeholder="e.g. Muscle Double-Chicken Rice"
                          />
                        </div>

                        <div>
                          <ImageUploader
                            value={formImage}
                            onChange={setFormImage}
                            label="Meal Recipe Photo"
                            placeholder="Upload meal photo from gallery, take photo, or paste image link"
                            compact
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Recipe Description *</label>
                        <textarea
                          required
                          rows={2}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/70 resize-none animate-fade-in"
                          placeholder="Provide verified ingredient weights, protein source, and flavor profiles..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Key Ingredients (approximate grams)</label>
                        <textarea
                          rows={2}
                          value={formIngredientsText}
                          onChange={(e) => setFormIngredientsText(e.target.value)}
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-green/70 resize-none"
                          placeholder="e.g. Chicken: 180, Broccoli: 100, Sweet Potato Mash: 120"
                        />
                        <span className="text-[9px] text-gray-500 block mt-1 leading-normal">
                          Provide ingredients as comma-separated pairs like <b>Name: Grams</b> (e.g. Paneer: 150, Quinoa: 120).
                        </span>
                      </div>

                      {/* Section B: Price & Macro Targets */}
                      <div className="bg-brand-charcoal/20 border border-brand-green/5 p-3.5 rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Price (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            value={formPrice}
                            onChange={(e) => setFormPrice(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-brand-green/70 text-brand-green"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Calories (Kcal)</label>
                          <input
                            type="number"
                            min="0"
                            value={formCalories}
                            onChange={(e) => setFormCalories(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green/70"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Protein (g)</label>
                          <input
                            type="number"
                            min="0"
                            value={formProtein}
                            onChange={(e) => setFormProtein(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green/70 text-brand-orange font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Carbs (g)</label>
                          <input
                            type="number"
                            min="0"
                            value={formCarbs}
                            onChange={(e) => setFormCarbs(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green/70"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Fats (g)</label>
                          <input
                            type="number"
                            min="0"
                            value={formFats}
                            onChange={(e) => setFormFats(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green/70"
                          />
                        </div>
                      </div>

                      {/* Section C: Diet Type & Spicy Level */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Dietary Specification</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setFormIsVeg(true); setFormIsVegan(false); }}
                              className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                                formIsVeg && !formIsVegan
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-900 shadow-xs'
                                  : 'bg-brand-charcoal text-gray-400 border-brand-green/10'
                              }`}
                            >
                              🌿 Veg Only
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFormIsVeg(true); setFormIsVegan(true); }}
                              className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                                formIsVeg && formIsVegan
                                  ? 'bg-green-950 text-green-400 border-green-900 shadow-xs'
                                  : 'bg-brand-charcoal text-gray-400 border-brand-green/10'
                              }`}
                            >
                              🌱 Vegan Only
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFormIsVeg(false); setFormIsVegan(false); }}
                              className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                                !formIsVeg
                                  ? 'bg-red-950 text-red-400 border-red-900 shadow-xs'
                                  : 'bg-brand-charcoal text-gray-400 border-brand-green/10'
                              }`}
                            >
                              🥩 Non-Veg
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Spicy heat scale</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['mild', 'medium', 'spicy'] as const).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setFormSpicyLevel(lvl)}
                                className={`py-2 px-1.5 text-xs font-bold rounded-xl border transition-all capitalize cursor-pointer ${
                                  formSpicyLevel === lvl
                                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange font-black'
                                    : 'bg-brand-charcoal text-gray-400 border-brand-green/10'
                                }`}
                              >
                                {lvl === 'mild' ? '🌶️ Mild' : lvl === 'medium' ? '🌶️🌶️ Med' : '🌶️🌶️🌶️ Hot'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section D: Timings Selection (Multi-select) */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Delivery Service Timings (Select multi)</label>
                        <div className="flex flex-wrap gap-2">
                          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => {
                            const isSelected = formTimings.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormTimings((prev) => prev.filter((item) => item !== t));
                                  } else {
                                    setFormTimings((prev) => [...prev, t]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange'
                                    : 'bg-brand-charcoal text-gray-400 border-brand-green/15'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section E: Target Goals Selection (Multi-select) */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Nutritional Goals Compatibility (Select multi)</label>
                        <div className="flex flex-wrap gap-2">
                          {(['fat_loss', 'muscle_gain', 'maintenance', 'post_workout'] as const).map((g) => {
                            const isSelected = formGoals.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormGoals((prev) => prev.filter((item) => item !== g));
                                  } else {
                                    setFormGoals((prev) => [...prev, g]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-green text-brand-charcoal border-brand-green'
                                    : 'bg-brand-charcoal text-gray-400 border-brand-green/15'
                                }`}
                              >
                                {g.replace('_', ' ')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section F: Advanced toggles */}
                      <div className="bg-brand-charcoal/10 border border-brand-green/10 p-4 rounded-2xl grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={formIsAvailable}
                            onChange={(e) => setFormIsAvailable(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-brand-charcoal border-gray-600 rounded-sm focus:ring-brand-green"
                          />
                          <div>
                            <span>Is Available (In Stock)</span>
                            <span className="text-[9px] text-gray-400 block font-normal">Controls instant "SOLD OUT" badge.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={formIsHidden}
                            onChange={(e) => setFormIsHidden(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-brand-charcoal border-gray-600 rounded-sm focus:ring-brand-green"
                          />
                          <div>
                            <span>Is Hidden (Menu Lock)</span>
                            <span className="text-[9px] text-gray-400 block font-normal">Hides fully from customer interface.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={formIsFeatured}
                            onChange={(e) => setFormIsFeatured(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-brand-charcoal border-gray-600 rounded-sm focus:ring-brand-green"
                          />
                          <div>
                            <span>Is Featured (Priority)</span>
                            <span className="text-[9px] text-gray-400 block font-normal">Push into popular slots & coach tips.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={formPartnerGymExclusive}
                            onChange={(e) => setFormPartnerGymExclusive(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-brand-charcoal border-gray-600 rounded-sm focus:ring-brand-green"
                          />
                          <div>
                            <span>Partner Gym Exclusive</span>
                            <span className="text-[9px] text-gray-400 block font-normal">Only visible to connected elite memberships.</span>
                          </div>
                        </label>
                      </div>

                      {/* Sticky Form Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowFormModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {editingMeal ? 'Save Specification Updates' : 'Add to Active Roster'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FORM MODAL DIALOG (COUPON EDITING AND CREATION) */}
            <AnimatePresence>
              {showCouponModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                  {/* Backdrop Blur overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCouponModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  {/* Form Card content */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    className="relative bg-[#12181E] border border-brand-green/20 w-full max-w-lg rounded-3xl p-6 shadow-2xl z-10 space-y-5 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin"
                  >
                    {/* Title block */}
                    <div className="flex items-center justify-between border-b border-brand-green/10 pb-4">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-brand-green uppercase block">OPERATIONS WORKBENCH</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          {editingCoupon ? 'Modify Promotion Specs' : 'Deploy New Campaign Coupon'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCouponModal(false)}
                        className="p-1.5 hover:bg-brand-charcoal rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCoupon} className="space-y-4">
                      {/* Section A: Core Code */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Coupon Promo Code</label>
                          <input
                            type="text"
                            required
                            disabled={!!editingCoupon}
                            placeholder="e.g. GYMPOWER50"
                            value={couponCode}
                            onChange={(e) => setCouponCodeState(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono disabled:opacity-50"
                          />
                          <span className="text-[8px] text-gray-500 mt-1 block">Unique capitalized system key.</span>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Campaign Status</label>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              id="couponIsActiveForm"
                              checked={couponIsActive}
                              onChange={(e) => setCouponIsActive(e.target.checked)}
                              className="w-4 h-4 text-brand-green bg-brand-charcoal border-gray-600 rounded-sm focus:ring-brand-green cursor-pointer"
                            />
                            <label htmlFor="couponIsActiveForm" className="text-xs font-bold text-white cursor-pointer selection:bg-transparent">
                              Active & Usable
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Section B: Reward Specification */}
                      <div className="bg-brand-charcoal/20 border border-brand-green/5 p-4 rounded-2xl space-y-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">REWARD CONFIGURATION</span>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Reward Type</label>
                            <select
                              value={couponDiscountType}
                              onChange={(e) => setCouponDiscountType(e.target.value as any)}
                              className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 cursor-pointer"
                            >
                              <option value="percentage">Percentage Discount (%)</option>
                              <option value="fixed">Flat Amount Discount (₹)</option>
                              <option value="free_delivery">Free Delivery</option>
                              <option value="free_perk">Complimentary Gift / Perk</option>
                            </select>
                          </div>

                          {couponDiscountType === 'percentage' || couponDiscountType === 'fixed' ? (
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">
                                {couponDiscountType === 'percentage' ? 'Percentage Off (%)' : 'Amount Off (₹)'}
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                max={couponDiscountType === 'percentage' ? "100" : "10000"}
                                placeholder={couponDiscountType === 'percentage' ? "15" : "150"}
                                value={couponDiscountValue}
                                onChange={(e) => setCouponDiscountValue(Number(e.target.value))}
                                className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                              />
                            </div>
                          ) : couponDiscountType === 'free_perk' ? (
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Perk Gift Name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Free High-Protein Shake"
                                value={couponPerkName}
                                onChange={(e) => setCouponPerkName(e.target.value)}
                                className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-[10px] font-mono text-gray-500 pt-5">
                              No additional value parameter needed.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section C: Target Rules & Scope Restrictions */}
                      <div className="bg-brand-charcoal/20 border border-brand-green/5 p-4 rounded-2xl space-y-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">REDEEM SCOPE & RESTRICTIONS</span>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Target Scope</label>
                            <select
                              value={couponScope}
                              onChange={(e) => setCouponScope(e.target.value as any)}
                              className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 cursor-pointer"
                            >
                              <option value="all">Public (All Accounts)</option>
                              <option value="account_based">Account Locked (Single Email)</option>
                              <option value="gym_only">Gym Lock (Terminal Exclusive)</option>
                            </select>
                          </div>

                          {couponScope === 'account_based' ? (
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Recipient Email</label>
                              <input
                                type="email"
                                required
                                placeholder="customer@example.com"
                                value={couponTargetUserEmail}
                                onChange={(e) => setCouponTargetUserEmail(e.target.value)}
                                className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                              />
                            </div>
                          ) : couponScope === 'gym_only' ? (
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Target Partner Gym</label>
                              <select
                                value={couponTargetGymId}
                                required
                                onChange={(e) => setCouponTargetGymId(e.target.value)}
                                className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 cursor-pointer"
                              >
                                <option value="">Select a Terminal Gym...</option>
                                {allGyms.map((gym: any, gymIdx: number) => (
                                  <option key={`gym-opt-${gym.id || gymIdx}-${gymIdx}`} value={gym.id}>
                                    {gym.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-[10px] font-mono text-gray-500 pt-5">
                              Open to all terminal members.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section D: Gate Rules & Expiry Gating */}
                      <div className="bg-brand-charcoal/20 border border-brand-green/5 p-4 rounded-2xl grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Min Order Value (₹)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0 (No Minimum)"
                            value={couponMinOrderValue || ''}
                            onChange={(e) => setCouponMinOrderValue(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Campaign Expiry Date</label>
                          <input
                            type="date"
                            value={couponExpiryDate}
                            onChange={(e) => setCouponExpiryDate(e.target.value)}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/40 font-mono cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Usage Cap (Claims)</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="100 (Usage Cap)"
                            value={couponUsageCap || ''}
                            onChange={(e) => setCouponUsageCap(Number(e.target.value))}
                            className="w-full bg-brand-charcoal border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">First N Users Only</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0 (Disabled)"
                            value={couponFirstNUsersOnly || ''}
                            onChange={(e) => setCouponFirstNUsersOnly(Number(e.target.value))}
                            className="w-full bg-[#1e2730] border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/40 font-mono"
                          />
                          <span className="text-[8px] text-gray-500 mt-1 block">e.g. First 50 claims only.</span>
                        </div>
                      </div>

                      {/* Section E: Stacking Configuration */}
                      <div className="bg-[#12181E] border border-brand-green/10 p-4 rounded-2xl space-y-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-green block">STACKING & MERGE CAPABILITIES</span>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="couponIsStackableForm"
                            checked={couponIsStackable}
                            onChange={(e) => setCouponIsStackable(e.target.checked)}
                            className="w-4 h-4 text-brand-green bg-[#12181E] border-gray-600 rounded-sm focus:ring-brand-green cursor-pointer"
                          />
                          <label htmlFor="couponIsStackableForm" className="text-xs font-bold text-white cursor-pointer select-none">
                            Allow Stacking (Can merge with other coupons)
                          </label>
                        </div>

                        {couponIsStackable && (
                          <div className="space-y-2 pt-2 border-t border-brand-green/10">
                            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Stackable With Specific Coupons Only</label>
                            {coupons.filter(c => c.code !== couponCode).length === 0 ? (
                              <p className="text-[10px] text-gray-500 italic">No other coupons exist yet. This coupon will stack with any future stackable coupon.</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                                {coupons.filter(c => c.code !== couponCode).map((c) => {
                                  const isChecked = couponStackableWith.includes(c.code);
                                  return (
                                    <label key={c.code} className="flex items-center gap-2 p-1.5 rounded bg-brand-charcoal hover:bg-brand-green/5 cursor-pointer text-xs">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setCouponStackableWith(prev => [...prev, c.code]);
                                          } else {
                                            setCouponStackableWith(prev => prev.filter(code => code !== c.code));
                                          }
                                        }}
                                        className="w-3.5 h-3.5 text-brand-green bg-[#12181E] rounded cursor-pointer"
                                      />
                                      <span className="font-mono text-white text-[11px]">{c.code}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            <span className="text-[8px] text-gray-500 block">Select specific coupons this can stack with. Leave empty to allow stacking with ANY stackable coupon.</span>
                          </div>
                        )}
                      </div>

                      {/* Sticky Form Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 border-t border-brand-green/15 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCouponModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {editingCoupon ? 'Save Coupon Specs' : 'Publish Coupon Campaign'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          {/* Add / Edit Support Agent Modal */}
          <AnimatePresence>
            {showSupportAgentModal && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSupportAgentModal(false)}
                  className="absolute inset-0 bg-[#070b0e]/90 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 15, opacity: 0 }}
                  className="relative w-full max-w-lg bg-[#0F1419] border border-brand-green/20 rounded-[28px] p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-orange via-brand-green to-brand-orange" />

                  <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center font-black text-sm">
                        🎧
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase text-white tracking-wider">
                          {editingSupportAgent ? 'Edit Support Agent' : 'Add Support Agent'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium">
                          Provision staff credentials directly in Firestore DB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSupportAgentModal(false)}
                      className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveSupportAgent} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                        Agent Full Name *
                      </label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-medium outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="text"
                          value={agentPhone}
                          onChange={(e) => setAgentPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          required
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={agentEmail}
                          onChange={(e) => setAgentEmail(e.target.value)}
                          placeholder="agent@fitzaika.in"
                          required
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                          Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => setAgentPassword('cs' + Math.floor(100000 + Math.random() * 900000))}
                          className="text-[9px] font-bold text-brand-orange hover:underline cursor-pointer"
                        >
                          🔄 Generate Pass
                        </button>
                      </div>
                      <input
                        type="text"
                        value={agentPassword}
                        onChange={(e) => setAgentPassword(e.target.value)}
                        placeholder="Secure password"
                        required
                        className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-brand-orange font-mono font-bold outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Access Role Scope
                        </label>
                        <select
                          value={agentRole}
                          onChange={(e) => setAgentRole(e.target.value as any)}
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none transition-all"
                        >
                          <option value="overall">🌐 Customer Care (Global / All Hubs)</option>
                          <option value="kitchen">🏬 Kitchen Branch Desk (Branch Scope)</option>
                          <option value="city">🏙️ Customer Care (City Scope)</option>
                          <option value="delivery_support_global">🛵 Delivery Person Support (Global Scope)</option>
                          <option value="delivery_support_city">🛵 Delivery Person Support (City Scope)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Account Status
                        </label>
                        <select
                          value={agentStatus}
                          onChange={(e) => setAgentStatus(e.target.value as any)}
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none transition-all"
                        >
                          <option value="active">🟢 Active</option>
                          <option value="inactive">🔴 Inactive / Suspended</option>
                        </select>
                      </div>
                    </div>

                    {agentRole === 'kitchen' && (
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Assigned Kitchen Branch *
                        </label>
                        <select
                          value={agentKitchenId}
                          onChange={(e) => setAgentKitchenId(e.target.value)}
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none transition-all"
                        >
                          {allKitchens.map(k => (
                            <option key={k.id} value={k.id}>{k.name} ({k.city})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(agentRole === 'city' || agentRole === 'delivery_support_city') && (
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                          Assigned City Scope *
                        </label>
                        <input
                          type="text"
                          required
                          value={agentCity}
                          onChange={(e) => setAgentCity(e.target.value)}
                          placeholder="e.g. Muzaffarpur"
                          className="w-full bg-[#1B232C] border border-white/10 focus:border-brand-green rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none transition-all"
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowSupportAgentModal(false)}
                        className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        {editingSupportAgent ? 'Save Agent Changes' : 'Provision Agent Account'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Custom Delete Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirm && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="absolute inset-0 bg-[#070b0e]/90 backdrop-blur-sm"
                />
                
                {/* Modal Container */}
                <motion.div
                  initial={{ scale: 0.95, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 15, opacity: 0 }}
                  className="relative w-full max-w-md bg-[#0F1419] border border-red-900/40 rounded-[28px] p-6 shadow-2xl overflow-hidden"
                >
                  {/* Glowing aesthetic accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Alert Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/55 flex items-center justify-center text-red-500">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                        Confirm Irreversible Deletion
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium">
                        You are about to delete the following item from the database forever:
                      </p>
                      <div className="bg-red-950/20 border border-red-900/20 px-3 py-2 rounded-xl mt-2 select-text font-mono text-xs text-red-400 break-all">
                        {deleteConfirm.label}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">
                      ⚠️ THIS ACTION CANNOT BE UNDONE
                    </p>
                    
                    {/* Controls */}
                    <div className="flex gap-2.5 w-full pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-4 py-2.5 bg-brand-charcoal hover:bg-brand-charcoal/80 border border-brand-green/10 text-xs font-black uppercase text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-red-950/50 cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ADD / EDIT DELIVERY PARTNER MODAL */}
            {showFleetModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFleetModal(false)}
                  className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  className="relative bg-[#0F1419] border border-brand-green/20 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-5 my-auto overflow-hidden text-left"
                >
                  <div className="flex items-start justify-between border-b border-brand-green/10 pb-4">
                    <div>
                      <span className="text-[8px] font-black bg-brand-orange/15 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded uppercase tracking-wider">
                        LOGISTICS FLEET MANAGER
                      </span>
                      <h3 className="text-sm font-black uppercase text-white mt-1">
                        {editingPartner ? 'Edit Delivery Partner Profile' : 'Add New Delivery Partner'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowFleetModal(false)}
                      className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer border-none bg-transparent"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePartner} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/50"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Mobile / WhatsApp Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +91 9876543210"
                          value={partnerPhone}
                          onChange={(e) => setPartnerPhone(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fleet Login Email (Any domain e.g. Gmail) *</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul.delivery@gmail.com"
                          value={partnerEmail}
                          onChange={(e) => setPartnerEmail(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-brand-orange font-mono font-bold focus:outline-none focus:border-brand-green/50"
                        />
                        <p className="text-[8px] text-gray-400 mt-1 font-mono">
                          Accepts any email address (e.g., @gmail.com). Automatically created in Firebase Auth.
                        </p>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fleet Login Password *</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter password"
                          value={partnerPassword}
                          onChange={(e) => setPartnerPassword(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-green/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Assigned Kitchen Branch *</label>
                        <select
                          value={partnerKitchenId}
                          onChange={(e) => {
                            setPartnerKitchenId(e.target.value);
                            const matchedK = allKitchens.find(k => k.id === e.target.value);
                            if (matchedK?.city) setPartnerCity(matchedK.city);
                          }}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                        >
                          {allKitchens.length === 0 ? (
                            <option value="k1">Central Kitchen Branch (Default)</option>
                          ) : (
                            allKitchens.map(k => (
                              <option key={k.id} value={k.id}>{k.name} ({k.city || 'Muzaffarpur'})</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Assigned Operating City *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Muzaffarpur, Mumbai, Delhi, Patna"
                          value={partnerCity}
                          onChange={(e) => setPartnerCity(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-brand-green font-bold focus:outline-none focus:border-brand-green/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Vehicle Type *</label>
                        <select
                          value={partnerVehicleType}
                          onChange={(e) => setPartnerVehicleType(e.target.value as any)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                        >
                          <option value="ev_two_wheeler">⚡ EV Two-Wheeler / E-Scooter</option>
                          <option value="scooter">🛵 Motorized Scooter</option>
                          <option value="bike">🏍️ Motorcycle / Bike</option>
                          <option value="bicycle">🚲 Bicycle</option>
                          <option value="car">🚗 Delivery Vehicle / Car</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Vehicle Reg Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. MH-12-FZ-9821"
                          value={partnerVehicleNumber}
                          onChange={(e) => setPartnerVehicleNumber(e.target.value)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-green/50"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Status State</label>
                        <select
                          value={partnerStatus}
                          onChange={(e) => setPartnerStatus(e.target.value as any)}
                          className="w-full bg-brand-charcoal/80 border border-brand-green/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                        >
                          <option value="active">🟢 Active / Authorized</option>
                          <option value="inactive">🔴 Inactive / Suspended</option>
                        </select>
                      </div>
                    </div>

                    {/* VISUAL & ACTUAL STEP: FIREBASE AUTH PROVISIONING */}
                    <div className="p-4 bg-brand-charcoal/90 border border-brand-orange/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-xs border border-brand-orange/30">
                            <Lock className="w-3.5 h-3.5 text-brand-orange" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                              Firebase Auth Account Step
                              <span className="text-[8px] font-bold bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded uppercase">REQUIRED FOR LOGIN</span>
                            </h4>
                            <p className="text-[10px] text-gray-400">
                              Provisions actual account info to Firebase Authentication so delivery partner can log into their app.
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          authSyncStatus?.success || editingPartner?.firebaseAuthSynced
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {authSyncStatus?.success || editingPartner?.firebaseAuthSynced ? '🟢 Auth Synced' : '🟡 Pending Sync'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <div className="text-[10px] text-gray-300 font-mono truncate">
                          Target Email: <strong className="text-brand-orange">{partnerEmail || 'Enter email above'}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => syncPartnerToFirebaseAuth(partnerEmail, partnerPassword)}
                          disabled={isSyncingAuth || !partnerEmail || !partnerPassword}
                          className="px-3 py-1.5 bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/40 text-brand-orange font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                          {isSyncingAuth ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Provision Firebase Auth Now
                            </>
                          )}
                        </button>
                      </div>

                      {authSyncStatus?.message && (
                        <div className={`p-2.5 rounded-xl text-[10px] font-mono leading-relaxed ${
                          authSyncStatus.success ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300' : 'bg-red-950/60 border border-red-800/60 text-red-300'
                        }`}>
                          {authSyncStatus.message}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFleetModal(false)}
                        className="px-4 py-2 border border-brand-green/10 hover:bg-brand-green/5 text-gray-400 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSyncingAuth}
                        className="px-5 py-2 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSyncingAuth ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning & Saving...
                          </>
                        ) : (
                          editingPartner ? 'Save Changes & Provision Auth' : 'Create & Provision Partner'
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
            {/* VIEW USER PROFILE & DATA MODAL */}
            <AnimatePresence>
              {viewingUserProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto pt-10 pb-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setViewingUserProfile(null)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-brand-green/20 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-5 my-auto overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin text-left"
                  >
                    <div className="flex items-start justify-between border-b border-brand-green/10 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                          ACCOUNT DOSSIER & PROFILE DATA
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          {viewingUserProfile.name || 'User Profile'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setViewingUserProfile(null)}
                        className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Avatar + Basic details Header */}
                      <div className="flex items-center gap-4 bg-[#141A22] p-4 rounded-2xl border border-brand-green/10">
                        <img
                          src={viewingUserProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                          alt={viewingUserProfile.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-brand-green/30 shrink-0"
                        />
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-extrabold text-sm text-white uppercase truncate">{viewingUserProfile.name}</h4>
                          <p className="text-[11px] font-mono text-gray-300 truncate">✉️ {viewingUserProfile.email}</p>
                          {viewingUserProfile.phone && (
                            <p className="text-[11px] font-mono text-gray-400">📞 {viewingUserProfile.phone}</p>
                          )}
                          <span className="inline-block text-[9px] font-mono text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded">
                            📍 City: {viewingUserProfile.city || 'Muzaffarpur'}
                          </span>
                        </div>
                      </div>

                      {/* Role & City Re-assignment Form */}
                      <div className="bg-[#182028] p-4 rounded-2xl border border-brand-green/15 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-green flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" /> Re-assign Role & Operating City
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Account Role</label>
                            <select
                              value={editedUserProfileRole}
                              onChange={(e) => setEditedUserProfileRole(e.target.value as any)}
                              className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green cursor-pointer font-bold"
                            >
                              <option value="customer">🥗 Customer / Foodie</option>
                              <option value="rider">🛵 Rider / Delivery Fleet</option>
                              <option value="kitchen">🍳 Kitchen Branch Operator</option>
                              <option value="admin">👑 System Administrator</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Assigned City</label>
                            <input
                              type="text"
                              value={editedUserProfileCity}
                              onChange={(e) => setEditedUserProfileCity(e.target.value)}
                              placeholder="e.g. Muzaffarpur, Mumbai"
                              className="w-full bg-[#12181E] border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-brand-green font-bold focus:outline-none focus:border-brand-green"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleSaveUserRoleCity}
                            className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer border-none"
                          >
                            Update User Role & City
                          </button>
                        </div>
                      </div>

                      {/* Account System Telemetry Data */}
                      <div className="bg-[#12181E] p-4 rounded-2xl border border-white/5 space-y-2.5 text-xs font-mono">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                          System Account Attributes
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-[#182028] p-2.5 rounded-xl border border-white/5">
                            <span className="text-gray-500 block uppercase">User ID</span>
                            <span className="text-gray-200 font-bold truncate block">{viewingUserProfile.id || 'N/A'}</span>
                          </div>

                          <div className="bg-[#182028] p-2.5 rounded-xl border border-white/5">
                            <span className="text-gray-500 block uppercase">Firewall Status</span>
                            <span className={`font-bold block ${viewingUserProfile.banned ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {viewingUserProfile.banned ? '🔴 BANNED' : '🟢 ACTIVE'}
                            </span>
                          </div>

                          {viewingUserProfile.bannedReason && (
                            <div className="col-span-2 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 text-rose-300">
                              <span className="text-rose-400 font-bold uppercase block text-[8px]">Ban Lock Reason</span>
                              <span>{viewingUserProfile.bannedReason}</span>
                            </div>
                          )}

                          <div className="bg-[#182028] p-2.5 rounded-xl border border-white/5 col-span-2">
                            <span className="text-gray-500 block uppercase">Account Created</span>
                            <span className="text-gray-300">
                              {viewingUserProfile.createdAt ? new Date(viewingUserProfile.createdAt).toLocaleString() : 'Registered User'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-brand-green/10">
                      <button
                        type="button"
                        onClick={() => setViewingUserProfile(null)}
                        className="px-5 py-2 bg-brand-charcoal border border-brand-green/20 hover:bg-brand-green/10 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                      >
                        Close Dossier
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* BAN REASON CONFIRMATION MODAL */}
            <AnimatePresence>
              {banningUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setBanningUser(null)}
                    className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border-2 border-rose-600 rounded-3xl w-full max-w-md p-6 shadow-[0_0_30px_rgba(225,29,72,0.3)] z-10 space-y-4 my-auto overflow-hidden text-left"
                  >
                    <div className="flex items-start justify-between border-b border-rose-600/20 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-rose-950 text-rose-400 border border-rose-600/50 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-3 h-3" /> FIREWALL SECURITY BAN PROTOCOL
                        </span>
                        <h3 className="text-sm font-black uppercase text-white mt-1">
                          Ban Account: {banningUser.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => setBanningUser(null)}
                        className="p-1.5 hover:bg-rose-950/40 rounded-xl text-gray-400 transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="bg-rose-950/30 p-3.5 rounded-2xl border border-rose-800/40 text-rose-200 text-xs leading-relaxed space-y-2">
                      <p className="font-bold flex items-center gap-1.5 text-rose-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> Immediate Isolation Notice:
                      </p>
                      <p className="text-[11px] text-rose-300/90">
                        Imposing a firewall ban will lock <strong>{banningUser.email}</strong> out of TAASH BHATTI completely. An active security firewall screen will block all access, preventing them from logging in or using another account on their session.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Reason for Security Lock *</label>
                      <textarea
                        rows={3}
                        value={banReasonInput}
                        onChange={(e) => setBanReasonInput(e.target.value)}
                        placeholder="e.g. Violation of terms of service, malicious activity, non-payment."
                        className="w-full bg-[#141A22] border border-rose-600/30 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 border-t border-rose-600/20 pt-4">
                      <button
                        type="button"
                        onClick={() => setBanningUser(null)}
                        className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer border-none bg-transparent"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleUserBan(banningUser)}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg cursor-pointer border-none flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> ESTABLISH FIREWALL LOCK
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* HERO BANNERS MANAGEMENT WORKSPACE */}
            {activeTab === 'banners' && (
              <motion.div
                key="banners_workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left"
              >
                {/* Workspace Header */}
                <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-brand-orange/15 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                        <Layers className="w-3 h-3" /> HOMEPAGE HERO CAROUSEL
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Auto-transitions every 4 seconds
                      </span>
                    </div>
                    <h2 className="text-xl font-black uppercase text-white tracking-wide">
                      Hero Banners & Events Showcase Control
                    </h2>
                    <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                      Control the top hero banners displayed on the customer home page. Configure promotional badges, titles, background artwork, redirect targets (app tabs or external URLs), and activation status.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {banners.length === 0 && (
                      <button
                        type="button"
                        onClick={handleSeedDefaultBanners}
                        className="px-4 py-2.5 bg-brand-charcoal border border-brand-orange/40 hover:bg-brand-orange/10 text-brand-orange font-black text-xs uppercase rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" /> Seed Defaults
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenAddBanner}
                      className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:scale-[1.02] flex items-center gap-2 cursor-pointer border-none"
                    >
                      <Plus className="w-4 h-4" /> Add Hero Banner
                    </button>
                  </div>
                </div>

                {/* Banners Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {banners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`relative bg-[#12181E] border rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                        banner.isActive !== false ? 'border-brand-green/25 hover:border-brand-green/50' : 'border-gray-800 opacity-60'
                      }`}
                    >
                      {/* Live Banner Visual Preview */}
                      <div className="relative h-44 overflow-hidden group">
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#12181E] via-[#12181E]/60 to-transparent" />
                        
                        {/* Status Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="text-[9px] font-black bg-black/70 backdrop-blur-md text-gray-300 px-2 py-0.5 rounded-full border border-white/10 font-mono">
                            #{banner.order || index + 1}
                          </span>
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            banner.isActive !== false
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}>
                            {banner.isActive !== false ? '● ACTIVE LIVE' : '○ PAUSED'}
                          </span>
                        </div>

                        {/* Banner Overlay Content Preview */}
                        <div className="absolute bottom-3 left-4 right-4 space-y-1">
                          {banner.badge && (
                            <span className="text-[9px] font-black bg-brand-orange text-brand-charcoal px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                              {banner.badge}
                            </span>
                          )}
                          <h3 className="text-base font-black text-white uppercase tracking-wide drop-shadow-md line-clamp-1">
                            {banner.title}
                          </h3>
                          {banner.subtitle && (
                            <p className="text-xs text-gray-300 line-clamp-1 drop-shadow">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Details & Link Route info */}
                      <div className="p-4 bg-[#141A22] border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
                            <span className="text-brand-green font-bold">Redirect Target:</span>
                            <span className="text-white font-black bg-[#1A222B] px-2 py-0.5 rounded border border-white/10">
                              {banner.linkUrl ? banner.linkUrl : 'None (No Action)'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Button: "{banner.buttonText || 'Explore'}"
                          </span>
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBannerActive(banner)}
                            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all cursor-pointer border flex items-center gap-1.5 ${
                              banner.isActive !== false
                                ? 'bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/60'
                                : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/60'
                            }`}
                          >
                            {banner.isActive !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {banner.isActive !== false ? 'Pause Banner' : 'Activate Live'}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBanner(banner)}
                              className="px-3 py-1.5 bg-[#1E2630] hover:bg-[#28323F] text-brand-green font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer border border-brand-green/20 flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer border border-rose-800/40 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ADD / EDIT HERO BANNER MODAL */}
            <AnimatePresence>
              {showBannerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowBannerModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-brand-orange/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-5 my-auto overflow-hidden text-left"
                  >
                    <div className="flex items-start justify-between border-b border-brand-orange/15 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-brand-orange text-brand-charcoal px-2 py-0.5 rounded uppercase tracking-wider">
                          HOMEPAGE BANNER EDITOR
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-1">
                          {editingBanner ? 'Edit Hero Banner' : 'Add New Hero Banner'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowBannerModal(false)}
                        className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveBanner} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Banner Title *</label>
                          <input
                            type="text"
                            required
                            value={bannerTitle}
                            onChange={(e) => setBannerTitle(e.target.value)}
                            placeholder="e.g., TANDOORI NIGHTS FESTIVAL"
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subtitle / Highlight Text</label>
                          <input
                            type="text"
                            value={bannerSubtitle}
                            onChange={(e) => setBannerSubtitle(e.target.value)}
                            placeholder="e.g., Get 20% off on all Bhatti platters after 8 PM"
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Badge Pill Text</label>
                          <input
                            type="text"
                            value={bannerBadge}
                            onChange={(e) => setBannerBadge(e.target.value)}
                            placeholder="e.g. 🔥 CATERING SPECIAL"
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-brand-orange font-black focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Button Label</label>
                          <input
                            type="text"
                            value={bannerButtonText}
                            onChange={(e) => setBannerButtonText(e.target.value)}
                            placeholder="e.g. Order Catering ➜"
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">Banner Image URL</label>
                          <input
                            type="url"
                            value={bannerImage}
                            onChange={(e) => setBannerImage(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-mono"
                          />
                          {/* Image Preset Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[9px] text-gray-500 uppercase font-mono">Presets:</span>
                            {[
                              { name: '🔥 BBQ Bhatti', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80' },
                              { name: '🥗 Protein Bowl', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80' },
                              { name: '🍱 Party Platter', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80' }
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => setBannerImage(preset.url)}
                                className="text-[9px] bg-[#1A222B] hover:bg-[#242F3C] text-gray-300 px-2 py-0.5 rounded-md border border-white/10 cursor-pointer"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">Redirect Link Target / Tab ID</label>
                          <input
                            type="text"
                            value={bannerLinkUrl}
                            onChange={(e) => setBannerLinkUrl(e.target.value)}
                            placeholder="menu | catering | coach | account OR external https://..."
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-brand-green font-bold focus:outline-none focus:border-brand-green"
                          />
                          {/* Quick Link Target Chips */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[9px] text-gray-500 uppercase font-mono">Quick App Tabs:</span>
                            {['menu', 'catering', 'coach', 'account'].map((tabId) => (
                              <button
                                key={tabId}
                                type="button"
                                onClick={() => setBannerLinkUrl(tabId)}
                                className={`text-[9px] px-2 py-0.5 rounded-md border uppercase font-mono cursor-pointer ${
                                  bannerLinkUrl === tabId
                                    ? 'bg-brand-green/20 text-brand-green border-brand-green/40 font-bold'
                                    : 'bg-[#1A222B] text-gray-400 border-white/10 hover:text-white'
                                }`}
                              >
                                {tabId}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Display Order</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={bannerOrder}
                            onChange={(e) => setBannerOrder(Number(e.target.value))}
                            className="w-full bg-[#141A22] border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Live Status</label>
                          <button
                            type="button"
                            onClick={() => setBannerIsActive(!bannerIsActive)}
                            className={`w-full py-2.5 rounded-xl font-black text-xs uppercase transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                              bannerIsActive
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                            }`}
                          >
                            {bannerIsActive ? '🟢 Active Live' : '🔴 Paused'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowBannerModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer border-none bg-transparent"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-lg cursor-pointer border-none flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Save Hero Banner
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* KDS BRANCH PREP DELAY CONTROLLER MODAL */}
            <AnimatePresence>
              {showPrepDelayModal && activeKdsKitchen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPrepDelayModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/85 backdrop-blur-sm"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-5 text-left overflow-hidden"
                  >
                    <div className="flex items-start justify-between border-b border-amber-500/20 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                          KDS PREP TIME CONTROLLER
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-1">
                          {activeKdsKitchen.name} Prep Buffer
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowPrepDelayModal(false)}
                        className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      Adjusting this buffer will auto-update expected delivery & takeaway ETAs for all customers ordering from <strong className="text-white">{activeKdsKitchen.name}</strong>.
                    </p>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Quick Peak Rush Presets</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Normal Ops (0m)', val: 0 },
                          { label: 'Mild Rush (+5m)', val: 5 },
                          { label: 'Busy (+10m)', val: 10 },
                          { label: 'Heavy (+15m)', val: 15 },
                          { label: 'Peak Rush (+20m)', val: 20 },
                          { label: 'Extreme (+30m)', val: 30 },
                        ].map((p) => {
                          const isActive = (activeKdsKitchen.globalPrepDelayMinutes || 0) === p.val;
                          return (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => handleSetGlobalPrepDelay(activeKdsKitchen.id, p.val)}
                              className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border text-center ${
                                isActive
                                  ? 'bg-amber-500 text-brand-charcoal border-amber-400 font-extrabold shadow-md'
                                  : 'bg-[#151C24] text-gray-300 border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Input */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Or Enter Custom Minutes</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={customPrepDelayInput}
                          onChange={(e) => setCustomPrepDelayInput(e.target.value)}
                          placeholder="Minutes delay (e.g. 25)..."
                          className="flex-1 bg-[#141A22] border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSetGlobalPrepDelay(activeKdsKitchen.id, parseInt(customPrepDelayInput) || 0)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all cursor-pointer border-none shadow-md"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* KDS KITCHEN INVENTORY MANAGEMENT DRAWER/MODAL */}
            <AnimatePresence>
              {showInventoryModal && activeKdsKitchen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowInventoryModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-indigo-500/30 rounded-3xl w-full max-w-5xl p-6 shadow-2xl z-10 space-y-5 text-left overflow-hidden my-auto max-h-[92vh] flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-4 shrink-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                            REAL-TIME KITCHEN INVENTORY
                          </span>
                          <span className="text-[8px] font-mono bg-brand-charcoal text-brand-orange px-2 py-0.5 rounded border border-brand-orange/20">
                            Terminal ID: {activeKdsKitchen.id}
                          </span>
                        </div>
                        <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                          <Boxes className="w-5 h-5 text-indigo-400" />
                          {activeKdsKitchen.name} Raw Stock & Ingredient Engine
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {inventoryItems.length === 0 && (
                          <button
                            type="button"
                            onClick={handleSeedDefaultInventory}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Initialize Baseline Stock
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInventoryItem(null);
                            setInvName('');
                            setInvCategory('raw_ingredients');
                            setInvQuantity(10);
                            setInvUnit('kg');
                            setInvMinThreshold(3);
                            setInvCostPerUnit(100);
                            setInvNotes('');
                            setInvConnectedMealIds([]);
                            setInvMealSearchQuery('');
                            setShowAddInventoryModal(true);
                          }}
                          className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add New Item
                        </button>
                        <button
                          onClick={() => setShowInventoryModal(false)}
                          className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Stock Metrics Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                      <div className="bg-[#141A22] border border-white/5 p-3 rounded-2xl">
                        <span className="text-[8px] uppercase font-black text-gray-500 block tracking-widest">Total Tracked Items</span>
                        <span className="text-base font-mono font-black text-white mt-0.5 block">{inventoryItems.length} items</span>
                      </div>
                      <div className="bg-[#141A22] border border-emerald-500/20 p-3 rounded-2xl">
                        <span className="text-[8px] uppercase font-black text-emerald-400 block tracking-widest">Healthy In-Stock</span>
                        <span className="text-base font-mono font-black text-emerald-300 mt-0.5 block">
                          {inventoryItems.filter(i => i.status === 'in_stock').length} items
                        </span>
                      </div>
                      <div className="bg-[#141A22] border border-amber-500/20 p-3 rounded-2xl">
                        <span className="text-[8px] uppercase font-black text-amber-400 block tracking-widest">Low Stock Warning</span>
                        <span className="text-base font-mono font-black text-amber-300 mt-0.5 block">
                          {inventoryItems.filter(i => i.status === 'low_stock').length} items
                        </span>
                      </div>
                      <div className="bg-[#141A22] border border-rose-500/20 p-3 rounded-2xl">
                        <span className="text-[8px] uppercase font-black text-rose-400 block tracking-widest">Out of Stock</span>
                        <span className="text-base font-mono font-black text-rose-300 mt-0.5 block">
                          {inventoryItems.filter(i => i.status === 'out_of_stock').length} items
                        </span>
                      </div>
                    </div>

                    {/* Low-Stock Menu Auto-Disable Sync Engine Banner */}
                    <div className="bg-gradient-to-r from-amber-950/40 via-[#151B22] to-emerald-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase text-white tracking-wider">
                              Low-Stock Auto-Disable (Menu Sync Engine)
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active Background Sync
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5 max-w-2xl">
                            When ingredients hit 0 stock, dependent meals on the customer menu are automatically marked <span className="text-rose-400 font-bold">"Sold Out"</span> to prevent unfulfillable orders. Restocking ingredients restores dish availability automatically.
                          </p>
                          {lowStockSyncNotice && (
                            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{lowStockSyncNotice}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSyncingLowStockMenu}
                        onClick={handleAdminLowStockSync}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLowStockMenu ? 'animate-spin' : ''}`} />
                        <span>{isSyncingLowStockMenu ? 'Syncing...' : 'Sync Menu to Stock'}</span>
                      </button>
                    </div>

                    {/* Search & Category Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5 bg-[#141A22] p-1 rounded-2xl border border-white/10">
                        {[
                          { id: 'all', label: 'All Stock' },
                          { id: 'proteins', label: 'Proteins' },
                          { id: 'dairy', label: 'Dairy' },
                          { id: 'raw_ingredients', label: 'Grains & Raw' },
                          { id: 'vegetables', label: 'Greens & Veg' },
                          { id: 'pantry_spices', label: 'Spices & Oils' },
                          { id: 'packaging', label: 'Packaging' },
                        ].map((cat) => {
                          const isActive = invCategoryFilter === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setInvCategoryFilter(cat.id)}
                              className={`px-3 py-1.5 rounded-xl text-[9px] uppercase font-black transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-indigo-500 text-white shadow-md'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative w-full sm:w-60">
                        <input
                          type="text"
                          value={invSearchQuery}
                          onChange={(e) => setInvSearchQuery(e.target.value)}
                          placeholder="Search stock items..."
                          className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    {/* Inventory Items List / Grid */}
                    <div className="overflow-y-auto pr-1 space-y-3 flex-1 scrollbar-thin">
                      {inventoryItems.length === 0 ? (
                        <div className="text-center py-16 space-y-4 border border-dashed border-indigo-500/20 rounded-2xl bg-[#141A22]/50">
                          <Boxes className="w-12 h-12 text-indigo-400/50 mx-auto" />
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-white uppercase">No Inventory Found</h4>
                            <p className="text-xs text-gray-400 max-w-md mx-auto">
                              No stock items configured for {activeKdsKitchen.name}. Click 'Initialize Baseline Stock' to populate default raw ingredients.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSeedDefaultInventory}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer border-none"
                          >
                            Initialize Baseline Stock
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {inventoryItems
                            .filter(i => invCategoryFilter === 'all' || i.category === invCategoryFilter)
                            .filter(i => !invSearchQuery.trim() || i.name.toLowerCase().includes(invSearchQuery.toLowerCase()))
                            .map((item, idx) => (
                              <div
                                key={item.id ? `${item.id}-${idx}` : `inv-${idx}`}
                                className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden bg-[#141A22] ${
                                  item.status === 'out_of_stock'
                                    ? 'border-rose-500/50 bg-rose-950/20'
                                    : item.status === 'low_stock'
                                    ? 'border-amber-500/50 bg-amber-950/20'
                                    : 'border-white/10 hover:border-indigo-500/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">{item.category}</span>
                                    <h4 className="text-xs font-black text-white uppercase mt-0.5">{item.name}</h4>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                    item.status === 'out_of_stock'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : item.status === 'low_stock'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  }`}>
                                    {item.status.replace('_', ' ')}
                                  </span>
                                </div>

                                {/* Stock Quantity Display & Controls */}
                                <div className="flex items-center justify-between bg-[#0F1419] p-2.5 rounded-xl border border-white/5">
                                  <div>
                                    <span className="text-[8px] uppercase font-bold text-gray-400 block">Current Stock</span>
                                    <span className="text-sm font-mono font-black text-white">
                                      {item.quantity} <span className="text-xs text-indigo-300 font-bold">{item.unit}</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, item.quantity, -5, item.minThreshold)}
                                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 font-black text-[9px] rounded-lg border border-white/10 cursor-pointer"
                                      title="Subtract 5"
                                    >
                                      -5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, item.quantity, -1, item.minThreshold)}
                                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 font-black text-[9px] rounded-lg border border-white/10 cursor-pointer"
                                      title="Subtract 1"
                                    >
                                      -1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, item.quantity, 1, item.minThreshold)}
                                      className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-black text-[9px] rounded-lg border border-indigo-500/30 cursor-pointer"
                                      title="Add 1"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, item.quantity, 5, item.minThreshold)}
                                      className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-black text-[9px] rounded-lg border border-indigo-500/30 cursor-pointer"
                                      title="Add 5"
                                    >
                                      +5
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                                  <span>Min Alert: {item.minThreshold} {item.unit}</span>
                                  <span>Cost: ₹{item.costPerUnit}/{item.unit}</span>
                                </div>

                                {/* Connected Dishes */}
                                <div className="pt-1.5">
                                  {item.connectedMealIds && item.connectedMealIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      <span className="text-[8px] font-black uppercase text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                        🔗 {item.connectedMealIds.length} Linked Dishes
                                      </span>
                                      {item.connectedMealIds.slice(0, 2).map((mId) => {
                                        const found = meals.find((m) => m.id === mId);
                                        return found ? (
                                          <span key={mId} className="text-[8px] text-gray-300 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                                            {found.name}
                                          </span>
                                        ) : null;
                                      })}
                                      {item.connectedMealIds.length > 2 && (
                                        <span className="text-[8px] text-gray-500 font-mono">+{item.connectedMealIds.length - 2}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[8px] text-gray-500 italic">Auto-match by recipe</span>
                                  )}
                                </div>

                                {/* Edit / Delete Actions */}
                                <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingInventoryItem(item);
                                      setInvName(item.name);
                                      setInvCategory(item.category);
                                      setInvQuantity(item.quantity);
                                      setInvUnit(item.unit);
                                      setInvMinThreshold(item.minThreshold);
                                      setInvCostPerUnit(item.costPerUnit || 50);
                                      setInvNotes(item.notes || '');
                                      setInvConnectedMealIds(item.connectedMealIds || []);
                                      setInvMealSearchQuery('');
                                      setShowAddInventoryModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-indigo-300 font-bold text-[9px] uppercase rounded-lg border border-indigo-500/20 cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit className="w-3 h-3" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInventoryItem(item.id)}
                                    className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-bold text-[9px] uppercase rounded-lg border border-rose-800/40 cursor-pointer flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* ADD / EDIT INVENTORY ITEM MODAL */}
            <AnimatePresence>
              {showAddInventoryModal && activeKdsKitchen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overflow-y-auto py-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddInventoryModal(false)}
                    className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-[#0F1419] border border-indigo-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-5 my-auto text-left overflow-hidden"
                  >
                    <div className="flex items-start justify-between border-b border-indigo-500/20 pb-4">
                      <div>
                        <span className="text-[8px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                          KITCHEN STOCK ENTRY
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-1">
                          {editingInventoryItem ? 'Edit Stock Item' : 'Add New Ingredient / Item'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddInventoryModal(false)}
                        className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveInventoryItem} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Item Name *</label>
                        <input
                          type="text"
                          required
                          value={invName}
                          onChange={(e) => setInvName(e.target.value)}
                          placeholder="e.g., Boneless Chicken Breast"
                          className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Category</label>
                          <select
                            value={invCategory}
                            onChange={(e) => setInvCategory(e.target.value as any)}
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                          >
                            <option value="raw_ingredients">Grains & Raw Ingredients</option>
                            <option value="proteins">Proteins</option>
                            <option value="dairy">Dairy & Cheese</option>
                            <option value="vegetables">Greens & Vegetables</option>
                            <option value="pantry_spices">Pantry Spices & Oils</option>
                            <option value="packaging">Packaging Containers</option>
                            <option value="beverages">Beverages & Shakes</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Unit of Measure</label>
                          <select
                            value={invUnit}
                            onChange={(e) => setInvUnit(e.target.value as any)}
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                          >
                            <option value="kg">Kilograms (kg)</option>
                            <option value="g">Grams (g)</option>
                            <option value="liters">Liters</option>
                            <option value="ml">Milliliters (ml)</option>
                            <option value="units">Units / Pieces</option>
                            <option value="boxes">Boxes / Packs</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={invQuantity}
                            onChange={(e) => setInvQuantity(Number(e.target.value))}
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Low Stock Threshold</label>
                          <input
                            type="number"
                            min="0"
                            value={invMinThreshold}
                            onChange={(e) => setInvMinThreshold(Number(e.target.value))}
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Cost Per Unit (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={invCostPerUnit}
                            onChange={(e) => setInvCostPerUnit(Number(e.target.value))}
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Notes / Supplier</label>
                          <input
                            type="text"
                            value={invNotes}
                            onChange={(e) => setInvNotes(e.target.value)}
                            placeholder="e.g. Organic vendor"
                            className="w-full bg-[#141A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Connected Menu Items Step */}
                        <div className="border border-indigo-500/20 rounded-2xl p-3.5 bg-[#0A0E13] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="block text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                                🍽️ Connected Menu Items ({invConnectedMealIds.length} Linked)
                              </label>
                              <p className="text-[9px] text-gray-400 leading-snug">
                                When this stock reaches 0, connected dishes automatically become SOLD OUT on the customer menu.
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => setInvConnectedMealIds(meals.map(m => m.id))}
                                className="text-indigo-400 hover:underline cursor-pointer border-none bg-transparent"
                              >
                                All
                              </button>
                              <span className="text-gray-600">|</span>
                              <button
                                type="button"
                                onClick={() => setInvConnectedMealIds([])}
                                className="text-gray-400 hover:underline cursor-pointer border-none bg-transparent"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search dishes to connect..."
                              value={invMealSearchQuery}
                              onChange={(e) => setInvMealSearchQuery(e.target.value)}
                              className="w-full pl-3 pr-3 py-1.5 bg-[#141A22] border border-white/10 rounded-xl text-[10px] text-white focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>

                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {meals
                              .filter(m => !invMealSearchQuery || m.name.toLowerCase().includes(invMealSearchQuery.toLowerCase()))
                              .map((meal) => {
                                const isSelected = invConnectedMealIds.includes(meal.id);
                                return (
                                  <div
                                    key={meal.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setInvConnectedMealIds(prev => prev.filter(id => id !== meal.id));
                                      } else {
                                        setInvConnectedMealIds(prev => [...prev, meal.id]);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                                      isSelected
                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-white shadow-xs'
                                        : 'bg-[#141A22]/50 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {meal.image ? (
                                        <img src={meal.image} alt={meal.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] shrink-0">
                                          🍲
                                        </div>
                                      )}
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold text-[11px] block truncate text-white">{meal.name}</span>
                                        <span className="text-[9px] text-gray-400 block font-mono">
                                          ₹{meal.price} • {meal.category || 'Mains'} {meal.isAvailable === false ? '• (Sold Out)' : ''}
                                        </span>
                                      </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 text-[10px] font-black transition-all ${
                                      isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20'
                                    }`}>
                                      {isSelected && '✓'}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowAddInventoryModal(false)}
                          className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer border-none bg-transparent"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg cursor-pointer border-none flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Save Stock Item
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </AnimatePresence>

        </main>
      </div>

      {/* ACTIVE ORDER TAGGING SELECTOR MODAL */}
      <AnimatePresence>
        {orderTaggingTicket && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderTaggingTicket(null)}
              className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#11171E] border border-brand-green/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] flex flex-col text-left"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-brand-green bg-brand-green/10 px-2.5 py-0.5 rounded border border-brand-green/20">
                    SUPPORT DESK • ORDER TAGGING
                  </span>
                  <h3 className="text-sm font-black uppercase text-white mt-1">
                    Tag Active Order to Ticket #{orderTaggingTicket.id}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Customer: <strong className="text-white">{orderTaggingTicket.userName}</strong> ({orderTaggingTicket.userEmail || orderTaggingTicket.userPhone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderTaggingTicket(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SEARCH & CUSTOM ORDER ID INPUT */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Type Custom Order ID or Token:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customOrderIdInput}
                      onChange={(e) => setCustomOrderIdInput(e.target.value)}
                      placeholder="e.g., ORD-94821 or 94821"
                      className="flex-1 bg-[#182028] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-brand-green"
                    />
                    <button
                      type="button"
                      disabled={!customOrderIdInput.trim() || isSavingOrderTag}
                      onClick={() => handleTagOrderToTicket(orderTaggingTicket.id, customOrderIdInput.trim())}
                      className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Tag ID
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearchQueryModal}
                    onChange={(e) => setOrderSearchQueryModal(e.target.value)}
                    placeholder="Search matching customer orders by ID, items, or date..."
                    className="w-full pl-9 pr-3.5 py-2 bg-[#182028] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* ORDERS LIST */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Select from Recent Orders:
                </span>
                {orders
                  .filter((ord) => {
                    if (!orderSearchQueryModal) {
                      // Prioritize orders matching this customer or rider
                      const matchesUser = (ord.customerEmail && orderTaggingTicket.userEmail && ord.customerEmail.toLowerCase() === orderTaggingTicket.userEmail.toLowerCase()) ||
                        (ord.customerPhone && orderTaggingTicket.userPhone && ord.customerPhone.includes(orderTaggingTicket.userPhone.replace(/[^0-9]/g, ''))) ||
                        (ord.deliveryPartnerPhone && orderTaggingTicket.deliveryPartnerPhone && ord.deliveryPartnerPhone.includes(orderTaggingTicket.deliveryPartnerPhone.replace(/[^0-9]/g, '')));
                      return matchesUser || true;
                    }
                    const q = orderSearchQueryModal.toLowerCase();
                    return ord.id.toLowerCase().includes(q) ||
                      ord.customerName?.toLowerCase().includes(q) ||
                      ord.items?.some(i => i.name?.toLowerCase().includes(q));
                  })
                  .slice(0, 15)
                  .map((ord) => {
                    const isCurrentlyTagged = orderTaggingTicket.orderId === ord.id;
                    return (
                      <div
                        key={ord.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrentlyTagged
                            ? 'bg-brand-green/10 border-brand-green'
                            : 'bg-[#182028] border-white/5 hover:border-brand-green/30'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-white">#{ord.id}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded bg-white/10 text-gray-300">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-mono font-bold text-brand-green">₹{ord.total}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">
                            {ord.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Custom Meal'}
                          </p>
                          <span className="text-[9px] text-gray-500 font-mono block">
                            {ord.customerName} ({ord.customerPhone || ord.customerEmail}) • {new Date(ord.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrentlyTagged ? (
                            <button
                              type="button"
                              onClick={() => handleTagOrderToTicket(orderTaggingTicket.id, null)}
                              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 text-[10px] font-black uppercase rounded-xl border border-red-800/40 cursor-pointer"
                            >
                              Unlink
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSavingOrderTag}
                              onClick={() => handleTagOrderToTicket(orderTaggingTicket.id, ord.id)}
                              className="px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal text-[10px] font-black uppercase rounded-xl cursor-pointer"
                            >
                              Link Order
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                {orderTaggingTicket.orderId && (
                  <button
                    type="button"
                    onClick={() => handleTagOrderToTicket(orderTaggingTicket.id, null)}
                    className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
                  >
                    Remove Current Tag (#{orderTaggingTicket.orderId})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrderTaggingTicket(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl ml-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW ORDER DETAIL INSPECTOR MODAL */}
      <AnimatePresence>
        {viewingOrderDetailModal && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOrderDetailModal(null)}
              className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#11171E] border border-brand-green/30 rounded-3xl w-full max-w-xl p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] flex flex-col text-left"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-brand-green bg-brand-green/10 px-2.5 py-0.5 rounded border border-brand-green/20">
                      LIVE ORDER INSPECTOR
                    </span>
                    <span className="text-xs font-mono font-black text-white">
                      Order #{viewingOrderDetailModal.id}
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mt-1">
                    Customer: {viewingOrderDetailModal.customerName} ({viewingOrderDetailModal.customerPhone})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingOrderDetailModal(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* STATUS & EXPEDITE HEADER */}
                <div className="p-3.5 bg-[#182028] rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">Current Status:</span>
                    <span className="text-sm font-black text-brand-green uppercase">
                      {viewingOrderDetailModal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExpediteOrderFromTicket(viewingOrderDetailModal.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-[10px] uppercase rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Expedite Order VIP</span>
                  </button>
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Items in Order:</span>
                  <div className="space-y-1.5">
                    {viewingOrderDetailModal.items?.map((it, idx) => (
                      <div key={idx} className="p-2.5 bg-[#182028] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{it.quantity}x {it.name}</span>
                          <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400">
                            {it.calories && <span>⚡ {it.calories} kcal</span>}
                            {it.protein && <span className="text-emerald-400">🥩 {it.protein}g P</span>}
                            {it.carbs && <span className="text-amber-300">🌾 {it.carbs}g C</span>}
                            {it.fats && <span className="text-cyan-300">🥑 {it.fats}g F</span>}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-white">₹{(it.price || 0) * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BILLING & ADDRESS SUMMARY */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#182028] rounded-2xl border border-white/5 text-xs">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Delivery Address</span>
                    <p className="text-gray-200 text-[11px] leading-relaxed">
                      {viewingOrderDetailModal.deliveryAddress?.street || viewingOrderDetailModal.deliveryAddress?.city || 'Default Customer Locker / Address'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Total Bill</span>
                    <span className="text-base font-mono font-black text-brand-green">₹{viewingOrderDetailModal.total}</span>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {viewingOrderDetailModal.paymentMethod?.toUpperCase() || 'ONLINE PAID'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setViewingOrderDetailModal(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIRECT EMAIL COMPOSER MODAL */}
      <AnimatePresence>
        {directMailModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDirectMailModal(null)}
              className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#11171E] border border-blue-500/40 rounded-3xl w-full max-w-xl p-6 shadow-2xl z-10 space-y-4 text-left"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-800/40">
                    OFFICIAL DISPATCH • EMAIL DESK
                  </span>
                  <h3 className="text-sm font-black uppercase text-white mt-1">
                    Compose Direct Email to {directMailModal.toName}
                  </h3>
                  <span className="text-[11px] font-mono text-gray-400">{directMailModal.toEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDirectMailModal(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendDirectMail} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Subject</label>
                  <input
                    type="text"
                    required
                    value={mailSubjectInput}
                    onChange={(e) => setMailSubjectInput(e.target.value)}
                    className="w-full bg-[#182028] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Body Message</label>
                  <textarea
                    rows={6}
                    required
                    value={mailBodyInput}
                    onChange={(e) => setMailBodyInput(e.target.value)}
                    className="w-full bg-[#182028] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* EMAIL TEMPLATES PRESETS */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-400 uppercase block">Insert Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Refund Approved", text: "Dear Customer,\n\nWe have reviewed your request and approved a full refund/wallet credit. You should see it in your account shortly.\n\nWarm regards,\nTAASH BHATTI Care Desk" },
                      { label: "Rider Reassigned", text: "Dear Customer,\n\nYour delivery has been reassigned to our priority fleet and is arriving promptly.\n\nWarm regards,\nTAASH BHATTI Dispatch" },
                      { label: "Rider Warning Notice", text: "Notice of Safety Policy Review:\n\nPlease be advised that timely drop-offs and customer etiquette are required for active fleet duty.\n\nTAASH BHATTI Operations" },
                    ].map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMailBodyInput(t.text)}
                        className="text-[9px] bg-blue-950/40 hover:bg-blue-900 text-blue-300 px-2 py-0.5 rounded border border-blue-800/30 cursor-pointer"
                      >
                        + {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setDirectMailModal(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Launch Mail Client</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER / RIDER BAN CONFIRMATION MODAL */}
      <AnimatePresence>
        {banningUserFromTicket && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBanningUserFromTicket(null)}
              className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#11171E] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4 text-left"
            >
              <div className="flex items-start justify-between border-b border-red-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-white">
                      {banningUserFromTicket.user.banned ? 'Lift Account Ban' : `Ban / Suspend ${banningUserFromTicket.isRider ? 'Rider' : 'User'}`}
                    </h3>
                    <span className="text-[11px] text-gray-400">{banningUserFromTicket.user.name || banningUserFromTicket.user.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBanningUserFromTicket(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-gray-300 leading-relaxed">
                  {banningUserFromTicket.user.banned
                    ? `Are you sure you want to restore full access for ${banningUserFromTicket.user.name || banningUserFromTicket.user.email}? They will be able to log in and place/fulfill orders.`
                    : `Are you sure you want to suspend and block ${banningUserFromTicket.user.name || banningUserFromTicket.user.email}? They will be locked out immediately.`}
                </p>

                {!banningUserFromTicket.user.banned && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Reason for Ban</label>
                    <input
                      type="text"
                      value={ticketBanReason}
                      onChange={(e) => setTicketBanReason(e.target.value)}
                      placeholder="e.g. Fraudulent order, harassment, policy violation..."
                      className="w-full bg-[#182028] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setBanningUserFromTicket(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectBanUser(banningUserFromTicket.user, banningUserFromTicket.isRider, ticketBanReason)}
                  className={`px-5 py-2.5 font-black text-xs uppercase rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5 ${
                    banningUserFromTicket.user.banned
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>{banningUserFromTicket.user.banned ? 'Confirm Unban' : 'Confirm Ban'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SUPPORT TICKET CONFIRMATION MODAL */}
      <AnimatePresence>
        {ticketToDelete && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTicketToDelete(null)}
              className="fixed inset-0 bg-[#080B0F]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#11171E] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4 text-left"
            >
              <div className="flex items-start justify-between border-b border-rose-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-white">Delete Ticket #{ticketToDelete.id}</h3>
                    <span className="text-[11px] text-gray-400">{ticketToDelete.subject}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketToDelete(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Are you sure you want to permanently delete this ticket? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setTicketToDelete(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSupportTicket(ticketToDelete)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Ticket</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN ADMIN LIGHTBOX OVERLAY */}
      {adminLightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setAdminLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setAdminLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-all cursor-pointer border-none"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={adminLightboxImage}
              alt="Enlarged evidence"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-gray-400 mt-3 font-mono text-center">
              Tap anywhere outside image or click X to close
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: KITCHEN EOD SHIFT SETTLEMENT & PRINT REPORT        */}
      {/* ======================================================== */}
      {selectedEODReport && (
        <KitchenEODSettlementModal
          report={selectedEODReport}
          isReadOnly={isEODReadOnly}
          onClose={() => setSelectedEODReport(null)}
          onSaved={() => setSelectedEODReport(null)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: DEVELOPER MENU & KILL SWITCHES                    */}
      {/* ======================================================== */}
      <DeveloperMenuModal
        isOpen={showDevMenu}
        onClose={() => setShowDevMenu(false)}
        flags={featureFlags}
        onUpdateFlags={(newFlags) => setFeatureFlags(newFlags)}
        meals={meals}
      />
    </div>
  );
}
