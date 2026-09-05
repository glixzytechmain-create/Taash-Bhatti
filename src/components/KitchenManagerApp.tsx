/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChefHat, 
  Search, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  AlertCircle, 
  RefreshCw, 
  Bell, 
  Plus, 
  Check, 
  FileText, 
  Printer, 
  Truck, 
  Boxes, 
  UtensilsCrossed, 
  TrendingUp, 
  CloudRain, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  DollarSign,
  User,
  Flame,
  PackageCheck,
  Sparkles,
  ArrowRight,
  Timer,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wallet,
  Layers,
  Edit2,
  Trash2,
  Filter,
  CheckCheck,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Building,
  Copy,
  Navigation,
  Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KitchenManager, Order, Kitchen, DeliveryPartner, KitchenInventoryItem, CashDepositRequest, KitchenEODReport, Meal } from '../types';
import { doc, updateDoc, collection, onSnapshot, setDoc, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import InAppDeliveryMap from './InAppDeliveryMap';
import RainEffect from './RainEffect';
import KitchenEODSettlementModal from './KitchenEODSettlementModal';
import { syncLowStockMenuWithFirestore, computeEODShiftReport } from '../lib/kitchenSettlement';
import { autoDispatchPlatedOrder } from '../lib/proximityDispatch';

// Web Audio API Synthesizer Chimes
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

// Voice announcements via SpeechSynthesis
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

// Real-Time KDS Timer Component with Thermal / Degradation Warnings
function KDSTimer({ createdAt }: { createdAt?: string }) {
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const start = new Date(createdAt).getTime();
    if (isNaN(start)) return;
    
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
  let warningMessage: string | null = null;

  if (mins >= 10) {
    colorClass = "text-red-400 bg-red-950/25 border-red-500/30 animate-pulse";
    warningMessage = "🚨 PROTEIN DEGRADATION WARNING";
  } else if (mins >= 5) {
    colorClass = "text-amber-400 bg-amber-950/25 border-amber-500/30";
    warningMessage = "⚠️ HEATING RETENTION ADVISORY";
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

// Chef Recipe Directives Lookup
const getRecipeDirectives = (mealName: string): string[] => {
  const nameLower = mealName.toLowerCase();
  if (nameLower.includes('oats') || nameLower.includes('shake')) {
    return [
      '1. Weigh oats base (100g) & mix whey isolate',
      '2. Blend chilled almond milk with fresh berries',
      '3. Seal in tamper-evident beverage flask'
    ];
  }
  if (nameLower.includes('chicken') || nameLower.includes('meat') || nameLower.includes('tikka')) {
    return [
      '1. Preheat grill to 220°C / high sear',
      '2. Brush with house Bhatti herb glaze & olive oil',
      '3. Core internal temp must reach minimum 75°C'
    ];
  }
  if (nameLower.includes('paneer') || nameLower.includes('salad') || nameLower.includes('bowl')) {
    return [
      '1. Flash-sauté fresh paneer cubes with bell peppers',
      '2. Portion 150g warm brown basmati rice base',
      '3. Top with toasted seeds & micro-greens'
    ];
  }
  return [
    '1. Inspect fresh prep ingredients for allergen compliance',
    '2. Assemble dish in thermal eco-insulated bento',
    '3. Attach tamper-evident security seal'
  ];
};

interface KitchenManagerAppProps {
  onExitGateway: () => void;
  allKitchens?: Kitchen[];
  allOrders?: Order[];
}

export default function KitchenManagerApp({
  onExitGateway,
  allKitchens = [],
  allOrders = []
}: KitchenManagerAppProps) {
  // Authentication & Session State
  const [activeSession, setActiveSession] = useState<KitchenManager | null>(() => {
    const cached = localStorage.getItem('fitzaika_active_km_session');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  });

  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Kitchens List
  const [kitchensList, setKitchensList] = useState<Kitchen[]>(allKitchens);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kitchens'), (snap) => {
      const fetched: Kitchen[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as Kitchen));
      if (fetched.length > 0) {
        setKitchensList(fetched);
      }
    }, (err) => {
      console.warn("Firestore kitchens listener error:", err);
    });
    return () => unsub();
  }, []);

  // Determine Active Kitchen for the logged-in manager
  const activeKitchen = useMemo(() => {
    if (!activeSession) return null;
    const found = kitchensList.find(k => k.id === activeSession.assignedKitchenId);
    if (found) return found;
    return kitchensList[0] || null;
  }, [activeSession, kitchensList]);

  // Real-time Orders
  const [liveOrders, setLiveOrders] = useState<Order[]>(allOrders);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      const fetched: Order[] = [];
      snap.forEach((d) => fetched.push(d.data() as Order));
      if (fetched.length > 0) {
        setLiveOrders(fetched);
      }
    }, (err) => {
      console.warn("Firestore orders listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Delivery Partners
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'delivery_partners'), (snap) => {
      const fetched: DeliveryPartner[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as DeliveryPartner));
      setDeliveryPartners(fetched);
    }, (err) => {
      console.warn("Firestore delivery_partners listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Inventory for this active kitchen
  const [inventoryItems, setInventoryItems] = useState<KitchenInventoryItem[]>([]);
  useEffect(() => {
    if (!activeKitchen?.id) return;
    const q = query(collection(db, 'kitchen_inventory'), where('kitchenId', '==', activeKitchen.id));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: KitchenInventoryItem[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as KitchenInventoryItem));
      setInventoryItems(fetched);
    }, (err) => {
      console.warn("Firestore kitchen_inventory listener error:", err);
    });
    return () => unsub();
  }, [activeKitchen?.id]);

  // Real-time Cash Deposits for this active kitchen
  const [cashDeposits, setCashDeposits] = useState<CashDepositRequest[]>([]);
  useEffect(() => {
    if (!activeKitchen?.id) return;
    const q = query(collection(db, 'cash_deposits'), where('kitchenId', '==', activeKitchen.id));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: CashDepositRequest[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as CashDepositRequest));
      setCashDeposits(fetched);
    }, (err) => {
      console.warn("Firestore cash_deposits listener error:", err);
    });
    return () => unsub();
  }, [activeKitchen?.id]);

  // Real-time Meals for customer menu low-stock auto-disable sync
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'meals'), (snap) => {
      const fetched: Meal[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as Meal));
      setAllMeals(fetched);
    }, (err) => {
      console.warn("Firestore meals listener error in KM:", err);
    });
    return () => unsub();
  }, []);

  // Real-time EOD Shift Settlement reports for this kitchen
  const [eodReports, setEodReports] = useState<KitchenEODReport[]>([]);
  useEffect(() => {
    if (!activeKitchen?.id) return;
    const q = query(collection(db, 'kitchen_eod_reports'), where('kitchenId', '==', activeKitchen.id));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: KitchenEODReport[] = [];
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() } as KitchenEODReport));
      fetched.sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime());
      setEodReports(fetched);
    }, (err) => {
      console.warn("Firestore eod reports listener error in KM:", err);
    });
    return () => unsub();
  }, [activeKitchen?.id]);

  // Low-Stock Menu Auto-Disable Sync State
  const [isSyncingMenu, setIsSyncingMenu] = useState<boolean>(false);
  const [menuSyncNotice, setMenuSyncNotice] = useState<string | null>(null);

  // Auto-sync when inventory changes (e.g. hits 0 or restocked)
  useEffect(() => {
    if (inventoryItems.length === 0 || allMeals.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await syncLowStockMenuWithFirestore(inventoryItems, allMeals);
        if (res.disabledCount > 0 || res.restoredCount > 0) {
          setMenuSyncNotice(
            `Auto Menu Sync: ${res.disabledCount} dishes marked Sold Out, ${res.restoredCount} restocked on customer menu.`
          );
        }
      } catch (e) {
        console.warn("Auto menu sync error in KM:", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [inventoryItems, allMeals]);

  const handleManualMenuSync = async () => {
    setIsSyncingMenu(true);
    try {
      const res = await syncLowStockMenuWithFirestore(inventoryItems, allMeals);
      playKitchenChime('complete');
      setMenuSyncNotice(
        `Low-Stock Menu Synced: ${res.disabledCount} dishes set to Sold Out, ${res.restoredCount} re-enabled on customer menu.`
      );
    } catch (e) {
      console.warn("Manual menu sync error:", e);
    } finally {
      setIsSyncingMenu(false);
    }
  };

  // EOD Settlement Modal State
  const [selectedEODReport, setSelectedEODReport] = useState<KitchenEODReport | null>(null);
  const [isEODReadOnly, setIsEODReadOnly] = useState<boolean>(false);

  const handleOpenEODSettlement = () => {
    if (!activeKitchen || !activeSession) return;
    const report = computeEODShiftReport({
      kitchenId: activeKitchen.id,
      kitchenName: activeKitchen.name,
      managerId: activeSession.id,
      managerName: activeSession.name,
      orders: liveOrders,
      inventoryItems: inventoryItems,
      cashDeposits: cashDeposits,
      shiftType: 'full_day',
      peakRushBufferMinutes: activeKitchen?.globalPrepDelayMinutes || 0
    });
    setSelectedEODReport(report);
    setIsEODReadOnly(false);
  };

  // Workspace Sub-Section: 'prep_lanes' vs 'rider_desk' vs 'inventory' vs 'radar' vs 'eod_settlement'
  const [kdsSubSection, setKdsSubSection] = useState<'prep_lanes' | 'rider_desk' | 'inventory' | 'radar' | 'eod_settlement'>('prep_lanes');

  // Chef Station Filter ('all' | 'lane_a' | 'lane_b')
  const [chefStation, setChefStation] = useState<'all' | 'lane_a' | 'lane_b'>('all');

  // Audio / Speech Announcement state
  const [enableVoiceAnnounce, setEnableVoiceAnnounce] = useState<boolean>(() => {
    return localStorage.getItem('fitzaika_km_voice') === 'true';
  });
  const [audioMuted, setAudioMuted] = useState<boolean>(false);

  // Global Prep Delay Modal & state
  const [showPrepDelayModal, setShowPrepDelayModal] = useState<boolean>(false);
  const [customPrepDelayInput, setCustomPrepDelayInput] = useState<string>('');

  // Detailed Inventory Filter & Modals
  const [invSearchQuery, setInvSearchQuery] = useState<string>('');
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all');
  const [showAddInventoryModal, setShowAddInventoryModal] = useState<boolean>(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<KitchenInventoryItem | null>(null);

  // Form states for inventory add/edit
  const [invName, setInvName] = useState<string>('');
  const [invCategory, setInvCategory] = useState<KitchenInventoryItem['category']>('proteins');
  const [invQuantity, setInvQuantity] = useState<number>(10);
  const [invUnit, setInvUnit] = useState<KitchenInventoryItem['unit']>('kg');
  const [invMinThreshold, setInvMinThreshold] = useState<number>(3);
  const [invCostPerUnit, setInvCostPerUnit] = useState<number>(180);
  const [invNotes, setInvNotes] = useState<string>('');
  const [invConnectedMealIds, setInvConnectedMealIds] = useState<string[]>([]);
  const [invMealFilter, setInvMealFilter] = useState<string>('');

  // Dispatch & KOT print modal states
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [kotOrderToPrint, setKotOrderToPrint] = useState<Order | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Scoped Orders for this kitchen
  const kitchenOrders = useMemo(() => {
    if (!activeKitchen) return [];
    return liveOrders.filter(order => {
      if (order.acceptedByKitchenId === activeKitchen.id) return true;
      if (order.kitchenId === activeKitchen.id) return true;
      if (order.status === 'sent' && (!order.acceptedByKitchenId || order.acceptedByKitchenId === '')) {
        const orderAddress = (order.address || '').toLowerCase();
        const kitchenCity = (activeKitchen.city || '').toLowerCase();
        if (orderAddress.includes(kitchenCity) || !activeKitchen.city) return true;
      }
      return false;
    });
  }, [liveOrders, activeKitchen]);

  // Radar GPS tracking state
  const [selectedRadarOrderId, setSelectedRadarOrderId] = useState<string | null>(null);

  // Active dispatches to monitor in Radar (prioritizing cooking, ready_for_pickup, out_for_delivery, dispatched)
  const radarTrackedOrders = useMemo(() => {
    const active = kitchenOrders.filter((o) => {
      return o.status === 'cooking' || 
             o.status === 'ready_for_pickup' || 
             o.status === 'out_for_delivery' || 
             o.status === 'prepared' || 
             o.kdsStage === 'plated' || 
             o.kdsStage === 'dispatched';
    });
    return active.length > 0 ? active : kitchenOrders;
  }, [kitchenOrders]);

  // Active radar order selected for deep destination inspection and route plotting
  const activeRadarOrder = useMemo(() => {
    if (selectedRadarOrderId) {
      const found = kitchenOrders.find(o => o.id === selectedRadarOrderId);
      if (found) return found;
    }
    return radarTrackedOrders[0] || kitchenOrders[0] || null;
  }, [selectedRadarOrderId, kitchenOrders, radarTrackedOrders]);

  // Active rider attached to the inspected radar order
  const activeRadarPartner = useMemo(() => {
    if (!activeRadarOrder) return null;
    const found = deliveryPartners.find(dp => dp.id === activeRadarOrder.deliveryPartnerId);
    if (found) return found;
    if (activeRadarOrder.deliveryPartnerName) {
      return {
        id: activeRadarOrder.deliveryPartnerId || 'fleet-rider',
        name: activeRadarOrder.deliveryPartnerName,
        phone: activeRadarOrder.deliveryPartnerPhone || '+91 9876543210',
        vehicleNumber: activeRadarOrder.deliveryVehicleNumber || activeRadarOrder.deliveryPartnerVehicle || 'FZ-EV-01',
        status: 'active',
        lat: activeRadarOrder.riderLat,
        lng: activeRadarOrder.riderLng
      } as unknown as DeliveryPartner;
    }
    return null;
  }, [activeRadarOrder, deliveryPartners]);

  // Audio Chime on New Orders
  const previousPendingCount = useRef<number>(0);
  useEffect(() => {
    const count = kitchenOrders.filter(o => o.status === 'sent').length;
    if (count > previousPendingCount.current) {
      if (!audioMuted) {
        playKitchenChime('new');
      }
      if (enableVoiceAnnounce) {
        speakToKitchen(`Attention kitchen: New ticket received for preparation!`);
      }
    }
    previousPendingCount.current = count;
  }, [kitchenOrders, audioMuted, enableVoiceAnnounce]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const emailClean = emailInput.trim().toLowerCase();
    const passClean = passwordInput.trim();

    if (!emailClean || !passClean) {
      setLoginError("Please enter both email and password.");
      setIsLoggingIn(false);
      return;
    }

    const cachedList: KitchenManager[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('fitzaika_kitchen_managers') || '[]');
      } catch (e) {
        return [];
      }
    })();

    const match = cachedList.find(m => 
      m.email.toLowerCase() === emailClean && 
      m.password === passClean
    );

    if (match) {
      if (match.status === 'inactive') {
        setLoginError("This Kitchen Manager account is inactive. Please contact the administrator.");
        setIsLoggingIn(false);
        return;
      }
      const updated = { ...match, lastLoginAt: new Date().toISOString() };
      setActiveSession(updated);
      localStorage.setItem('fitzaika_active_km_session', JSON.stringify(updated));
      setIsLoggingIn(false);
      return;
    }

    // Default fallback branch manager account
    const assignedK = kitchensList[0] || { id: 'k1', name: 'Central Kitchen Hub' };
    const defaultMgr: KitchenManager = {
      id: 'KM-' + Math.floor(1000 + Math.random() * 9000),
      name: emailClean.split('@')[0].toUpperCase(),
      email: emailClean,
      password: passClean,
      phone: '+91 98765 43210',
      assignedKitchenId: assignedK.id,
      assignedKitchenName: assignedK.name,
      status: 'active',
      role: 'kitchen_manager',
      registeredAt: new Date().toISOString()
    };
    setDoc(doc(db, 'kitchen_managers', defaultMgr.id), defaultMgr).catch(() => {});
    setActiveSession(defaultMgr);
    localStorage.setItem('fitzaika_active_km_session', JSON.stringify(defaultMgr));
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('fitzaika_active_km_session');
    setActiveSession(null);
  };

  // Adjust order extra prep time
  const handleAdjustOrderPrepTime = async (orderId: string, deltaMinutes: number) => {
    const targetOrder = liveOrders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const currentExtra = targetOrder.extraPrepMinutes || 0;
    const nextExtra = currentExtra + deltaMinutes;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        extraPrepMinutes: nextExtra,
      });
      playKitchenChime('alert');
      setNoticeMessage(`Order ${orderId} prep buffer updated (${nextExtra > 0 ? '+' : ''}${nextExtra} mins)`);
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (err) {
      try {
        await setDoc(doc(db, 'orders', orderId), { extraPrepMinutes: nextExtra }, { merge: true });
        playKitchenChime('alert');
        setNoticeMessage(`Order ${orderId} prep buffer updated`);
        setTimeout(() => setNoticeMessage(null), 3000);
      } catch (e2) {
        console.warn("Failed to update prep time:", e2);
      }
    }
  };

  // Set global kitchen prep delay
  const handleSetGlobalPrepDelay = async (kitchenId: string, delayMins: number) => {
    try {
      await updateDoc(doc(db, 'kitchens', kitchenId), {
        globalPrepDelayMinutes: delayMins,
      });
      playKitchenChime('alert');
      setNoticeMessage(`${activeKitchen?.name} peak rush buffer set to ${delayMins > 0 ? `+${delayMins} min delay` : 'Normal (0 min)'}`);
      setTimeout(() => setNoticeMessage(null), 3500);
      setShowPrepDelayModal(false);
    } catch (err) {
      try {
        await setDoc(doc(db, 'kitchens', kitchenId), { globalPrepDelayMinutes: delayMins }, { merge: true });
        setNoticeMessage(`Global prep delay set to ${delayMins} mins`);
        setTimeout(() => setNoticeMessage(null), 3500);
        setShowPrepDelayModal(false);
      } catch (e2) {
        console.warn("Failed to set kitchen prep delay:", e2);
      }
    }
  };

  // Toggle Raining Mode
  const handleToggleRainMode = async () => {
    if (!activeKitchen) return;
    const newRain = !activeKitchen.isRaining;
    try {
      await updateDoc(doc(db, 'kitchens', activeKitchen.id), {
        isRaining: newRain
      });
      playKitchenChime('alert');
      setNoticeMessage(newRain ? "🌧️ Raining Mode ACTIVE: advisory broadcasted" : "☀️ Raining Mode disabled");
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (e) {
      console.warn("Failed to toggle rain mode in Firestore:", e);
    }
  };

  // Toggle Kitchen Status
  const handleToggleKitchenStatus = async (newStatus: 'open' | 'busy' | 'closed') => {
    if (!activeKitchen) return;
    try {
      await updateDoc(doc(db, 'kitchens', activeKitchen.id), {
        status: newStatus
      });
    } catch (e) {
      console.warn("Failed to toggle kitchen status:", e);
    }
  };

  // Order Progression Actions
  const handleAcceptOrder = async (orderId: string) => {
    if (!activeKitchen) return;
    try {
      const updateData = {
        acceptedByKitchenId: activeKitchen.id,
        acceptedKitchenName: activeKitchen.name,
        acceptedKitchenAddress: activeKitchen.address,
        acceptedKitchenLat: activeKitchen.lat,
        acceptedKitchenLng: activeKitchen.lng,
        status: 'cooking',
        kdsStage: 'cooking',
        cookingStartedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'orders', orderId), updateData);
      playKitchenChime('complete');
      if (enableVoiceAnnounce) {
        speakToKitchen(`Ticket accepted. Commencing cooking.`);
      }
    } catch (e) {
      console.warn("Failed to accept order:", e);
    }
  };

  const handleDenyOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        rejectedByKitchenIds: [activeKitchen?.id || 'k1'],
        status: 'sent'
      });
      playKitchenChime('alert');
      setNoticeMessage(`Order ${orderId} declined & rerouted to other branches`);
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (e) {
      console.warn("Failed to deny order:", e);
    }
  };

  const handleMoveToPlated = async (orderId: string) => {
    try {
      const order = kitchenOrders.find(o => o.id === orderId);

      // Automated Proximity Dispatch for Delivery orders
      if (order && order.fulfillmentMode !== 'takeaway' && !order.deliveryPartnerId && activeKitchen) {
        const dispatchResult = await autoDispatchPlatedOrder(order, activeKitchen, deliveryPartners);
        if (dispatchResult.success && dispatchResult.rider) {
          playKitchenChime('complete');
          setNoticeMessage(`⚡ Auto-Dispatched to nearest courier: ${dispatchResult.rider.name} (${dispatchResult.distanceKm} km away)!`);
          if (enableVoiceAnnounce) {
            speakToKitchen(`Order plated and packed. Auto dispatched to nearest rider ${dispatchResult.rider.name}.`);
          }
          setTimeout(() => setNoticeMessage(null), 4500);
          return;
        }
      }

      await updateDoc(doc(db, 'orders', orderId), {
        status: 'ready_for_pickup',
        kdsStage: 'plated',
        platedAt: new Date().toISOString()
      });
      playKitchenChime('complete');
      if (enableVoiceAnnounce) {
        speakToKitchen(`Order plated and packed. Awaiting rider handover.`);
      }
    } catch (e) {
      console.warn("Failed to move order to plated:", e);
    }
  };

  const handleHandoverToRiderOrCounter = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: order.fulfillmentMode === 'takeaway' ? 'ready_for_pickup' : 'out_for_delivery',
        kdsStage: 'dispatched',
        dispatchedAt: new Date().toISOString()
      });
      playKitchenChime('complete');
    } catch (e) {
      console.warn("Failed to handover order:", e);
    }
  };

  const handleMarkOrderDelivered = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        kdsStage: 'delivered',
        deliveredAt: new Date().toISOString()
      });
      playKitchenChime('complete');
    } catch (e) {
      console.warn("Failed to mark delivered:", e);
    }
  };

  // Seed baseline inventory if empty
  const handleSeedDefaultInventory = async () => {
    if (!activeKitchen?.id) return;
    const defaults: Omit<KitchenInventoryItem, 'id'>[] = [
      { kitchenId: activeKitchen.id, name: 'Chicken Breast (Boneless)', category: 'proteins', quantity: 30, unit: 'kg', minThreshold: 5, status: 'in_stock', costPerUnit: 220, notes: 'Fresh daily supply' },
      { kitchenId: activeKitchen.id, name: 'Fresh Paneer / Cottage Cheese', category: 'dairy', quantity: 20, unit: 'kg', minThreshold: 4, status: 'in_stock', costPerUnit: 340, notes: 'Low fat organic' },
      { kitchenId: activeKitchen.id, name: 'Basmati Brown Rice', category: 'raw_ingredients', quantity: 50, unit: 'kg', minThreshold: 10, status: 'in_stock', costPerUnit: 110, notes: 'High fiber long grain' },
      { kitchenId: activeKitchen.id, name: 'Exotic Broccoli & Salad Greens', category: 'vegetables', quantity: 15, unit: 'kg', minThreshold: 3, status: 'in_stock', costPerUnit: 180, notes: 'Hydroponic farm fresh' },
      { kitchenId: activeKitchen.id, name: 'Extra Virgin Olive Oil', category: 'pantry_spices', quantity: 12, unit: 'liters', minThreshold: 2, status: 'in_stock', costPerUnit: 750, notes: 'Cold pressed' },
      { kitchenId: activeKitchen.id, name: 'Taash Secret Bhatti Spice Mix', category: 'pantry_spices', quantity: 8, unit: 'kg', minThreshold: 1.5, status: 'in_stock', costPerUnit: 450, notes: 'House recipe blend' },
      { kitchenId: activeKitchen.id, name: 'Heat-Sealed Bento Trays', category: 'packaging', quantity: 250, unit: 'boxes', minThreshold: 50, status: 'in_stock', costPerUnit: 12, notes: 'Microwave-safe leakproof' },
      { kitchenId: activeKitchen.id, name: 'Counter Carry-out Paper Bags', category: 'packaging', quantity: 300, unit: 'units', minThreshold: 60, status: 'in_stock', costPerUnit: 6, notes: 'Eco-friendly kraft' },
      { kitchenId: activeKitchen.id, name: 'Whey Protein Isolate Powder', category: 'proteins', quantity: 10, unit: 'kg', minThreshold: 2, status: 'in_stock', costPerUnit: 2400, notes: 'Unflavored 90% purity' },
    ];

    try {
      for (const item of defaults) {
        await addDoc(collection(db, 'kitchen_inventory'), {
          ...item,
          lastRestockedAt: new Date().toISOString(),
          lastUpdatedBy: activeKitchen.name,
        });
      }
      playKitchenChime('complete');
      setNoticeMessage(`Initialized baseline inventory for ${activeKitchen.name}!`);
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (err) {
      console.warn("Failed to seed baseline inventory:", err);
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
      playKitchenChime('complete');
    } catch (err) {
      console.warn("Failed to update stock level:", err);
    }
  };

  // Save / Edit Inventory Item
  const handleSaveInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKitchen?.id || !invName.trim()) return;
    const status: KitchenInventoryItem['status'] = invQuantity === 0 ? 'out_of_stock' : invQuantity <= invMinThreshold ? 'low_stock' : 'in_stock';
    const payload = {
      kitchenId: activeKitchen.id,
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
      lastUpdatedBy: activeKitchen.name,
    };

    try {
      if (editingInventoryItem) {
        await updateDoc(doc(db, 'kitchen_inventory', editingInventoryItem.id), payload);
        setNoticeMessage(`Updated ${invName}`);
      } else {
        await addDoc(collection(db, 'kitchen_inventory'), payload);
        setNoticeMessage(`Added ${invName} to inventory`);
      }
      playKitchenChime('complete');
      setTimeout(() => setNoticeMessage(null), 3000);
      setShowAddInventoryModal(false);
      setEditingInventoryItem(null);
      setInvName('');
      setInvNotes('');
      setInvConnectedMealIds([]);
    } catch (err) {
      console.warn("Failed to save inventory item:", err);
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'kitchen_inventory', itemId));
      playKitchenChime('alert');
      setNoticeMessage("Inventory item removed");
      setTimeout(() => setNoticeMessage(null), 2500);
    } catch (err) {
      console.warn("Failed to delete inventory item:", err);
    }
  };

  // Cash Handover Desk Approvals
  const handleApproveCashDeposit = async (depositId: string, partnerId: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'cash_deposits', depositId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: activeSession?.name || 'Kitchen Cashier Desk'
      });
      // Deduct partner cashInHand in Firestore
      const targetPartner = deliveryPartners.find(p => p.id === partnerId);
      if (targetPartner) {
        const remainingCash = Math.max(0, (targetPartner.cashInHand || 0) - amount);
        await updateDoc(doc(db, 'delivery_partners', partnerId), {
          cashInHand: remainingCash
        });
      }
      playKitchenChime('complete');
      setNoticeMessage(`Verified ₹${amount} cash deposit from rider.`);
      setTimeout(() => setNoticeMessage(null), 3500);
    } catch (e) {
      console.warn("Failed to approve cash deposit:", e);
    }
  };

  const handleRejectCashDeposit = async (depositId: string) => {
    try {
      await updateDoc(doc(db, 'cash_deposits', depositId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedReason: 'Discrepancy in physical currency count'
      });
      playKitchenChime('alert');
      setNoticeMessage("Deposit request rejected.");
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (e) {
      console.warn("Failed to reject cash deposit:", e);
    }
  };

  // Filtered Orders across Lanes
  const visibleOrders = useMemo(() => {
    return kitchenOrders.filter(order => {
      if (chefStation === 'lane_a' && order.lane !== 'lane_a') return false;
      if (chefStation === 'lane_b' && order.lane !== 'lane_b') return false;
      return true;
    });
  }, [kitchenOrders, chefStation]);

  // Scoped Delivery Fleet
  const kitchenAssignedRiders = useMemo(() => {
    if (!activeKitchen) return deliveryPartners;
    return deliveryPartners.filter(p => 
      p.kitchenId === activeKitchen.id ||
      (p.city && activeKitchen.city && p.city.toLowerCase() === activeKitchen.city.toLowerCase())
    );
  }, [deliveryPartners, activeKitchen]);

  // Filtered Inventory Items
  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter(item => {
      if (invCategoryFilter !== 'all' && item.category !== invCategoryFilter) return false;
      if (invSearchQuery.trim()) {
        const q = invSearchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.notes || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [inventoryItems, invCategoryFilter, invSearchQuery]);

  // ==========================================
  // UN-AUTHENTICATED: LOGIN SCREEN
  // ==========================================
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-[#0A0E13] text-white flex flex-col justify-center items-center p-4 font-sans select-none">
        <div className="w-full max-w-md bg-[#121820] border border-brand-green/20 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2 border-b border-white/10 pb-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange mx-auto flex items-center justify-center shadow-inner">
              <ChefHat className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">Kitchen Manager OS</h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              FitZaika Branch Terminal • Authorized Station Sign-in
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Branch Manager Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="manager@fitzaika.in"
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-medium font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Station Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Station Access...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Kitchen Station</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-500 font-mono">Encrypted Kitchen Gateway</span>
            <button
              type="button"
              onClick={onExitGateway}
              className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider cursor-pointer"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED: FULL-SCALE KDS CONSOLE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0A0E13] text-white flex flex-col font-sans select-none pb-12">
      {/* ATMOSPHERIC RAIN EFFECT IF ACTIVE */}
      {activeKitchen?.isRaining && (
        <RainEffect density="medium" speed={1.1} showSplashes={false} showMist={false} className="opacity-30 pointer-events-none" />
      )}

      {/* TOP KDS HEADER (MATCHING ADMIN KDS HIGH-CONTRAST DARK THEME) */}
      <header className="sticky top-0 z-40 bg-[#121820]/95 backdrop-blur-md border-b border-brand-green/20 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Branch Title & Identification */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center font-black text-lg shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase text-white tracking-wider">
                  {activeKitchen?.name || 'Central Kitchen Hub'}
                </h1>
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/40 uppercase tracking-widest">
                  ● KDS OPERATIONAL
                </span>
                <span className="text-[8px] font-mono text-gray-400">
                  ID: {activeKitchen?.id}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                Head Chef: <strong className="text-white">{activeSession.name}</strong> • {activeKitchen?.address || 'Kitchen Facility'}
              </span>
            </div>
          </div>

          {/* Action Controls & Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Live Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0E13] rounded-xl border border-white/10 text-xs font-mono text-gray-300">
              <Clock className="w-3.5 h-3.5 text-brand-orange" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Prep Delay Peak Rush Controller */}
            <button
              type="button"
              onClick={() => setShowPrepDelayModal(true)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                (activeKitchen?.globalPrepDelayMinutes || 0) > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-[#161D24] text-gray-300 border-white/10 hover:bg-white/10'
              }`}
              title="Adjust rush buffer for incoming orders"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Prep Delay: {(activeKitchen?.globalPrepDelayMinutes || 0) > 0 ? `+${activeKitchen?.globalPrepDelayMinutes}m Peak` : 'Normal (0m)'}
              </span>
            </button>

            {/* Currently Raining Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleRainMode}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md border ${
                activeKitchen?.isRaining
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 animate-pulse'
                  : 'bg-[#161D24] hover:bg-white/10 text-gray-300 border-white/10'
              }`}
            >
              <CloudRain className={`w-3.5 h-3.5 ${activeKitchen?.isRaining ? 'text-white' : 'text-sky-400'}`} />
              <span>{activeKitchen?.isRaining ? '🌧️ Rain Mode: ON' : 'Rain Mode: OFF'}</span>
            </button>

            {/* Chef Station Filter */}
            <div className="bg-[#0A0E13] p-1 rounded-xl border border-white/10 flex items-center gap-1">
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
                    className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                      isActive 
                        ? 'bg-brand-orange text-brand-charcoal shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Audio Speech & Chimes */}
            <div className="flex items-center gap-1.5 bg-[#0A0E13] px-2.5 py-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  const nextVal = !enableVoiceAnnounce;
                  setEnableVoiceAnnounce(nextVal);
                  localStorage.setItem('fitzaika_km_voice', nextVal ? 'true' : 'false');
                }}
                className={`p-1 rounded transition-colors ${enableVoiceAnnounce ? 'text-brand-orange' : 'text-gray-500'}`}
                title={enableVoiceAnnounce ? 'Voice announcements ON' : 'Voice announcements OFF'}
              >
                {enableVoiceAnnounce ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => playKitchenChime('new')}
                className="px-2 py-0.5 border border-brand-green/30 hover:bg-brand-green/10 text-[8px] uppercase font-black text-brand-green rounded transition-all cursor-pointer"
                title="Test kitchen chime speaker"
              >
                Chime Test
              </button>
            </div>

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 rounded-xl text-red-300 transition-all cursor-pointer"
              title="Sign Out from Station"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* NOTICE BANNER */}
      {noticeMessage && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/50 px-4 py-2 text-xs font-black text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-4xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-emerald-400 hover:text-white uppercase font-mono text-[9px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RAIN MODE WARNING BANNER */}
      {activeKitchen?.isRaining && (
        <div className="bg-gradient-to-r from-sky-950 via-blue-950 to-slate-950 border-b border-sky-400/50 px-4 py-2 text-xs text-sky-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-4xl">
            <CloudRain className="w-4 h-4 text-sky-400 animate-bounce shrink-0" />
            <span>
              <strong>Currently Raining Mode is LIVE for {activeKitchen.name}:</strong> All orders show atmospheric rain animation and weather delay advisories on customer tracking links.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleRainMode}
            className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-black uppercase rounded-lg border border-sky-400/40 cursor-pointer shrink-0"
          >
            Turn Off ☀️
          </button>
        </div>
      )}

      {/* MAIN KDS BODY */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 space-y-4">
        
        {/* PRIMARY WORKSPACE TABS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121820] p-2 rounded-2xl border border-brand-green/10">
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
              <span>Kitchen Prep Lanes ({kitchenOrders.filter(o => o.status === 'cooking' || o.status === 'sent').length})</span>
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
              {cashDeposits.filter(d => d.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-md">
                  {cashDeposits.filter(d => d.status === 'pending').length} Pending
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setKdsSubSection('inventory')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                kdsSubSection === 'inventory'
                  ? 'bg-brand-green text-brand-charcoal shadow-lg shadow-brand-green/20 font-black'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Branch Raw Stock & Inventory ({inventoryItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setKdsSubSection('radar')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                kdsSubSection === 'radar'
                  ? 'bg-blue-600 text-white shadow-lg font-black'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Live Fleet Radar</span>
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
              onClick={handleOpenEODSettlement}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              title="Run shift closure, reconcile cash register & generate PDF audit report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Run Shift Audit (PDF)</span>
            </button>
            <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
              📍 {activeKitchen ? activeKitchen.name : 'Kitchen Hub'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUBSECTION 1: KITCHEN PREP LANES (4-COLUMN KANBAN BOARD) */}
        {/* ======================================================== */}
        {kdsSubSection === 'prep_lanes' && (
          <div className="space-y-4">
            
            {/* Metric Overview Bar */}
            <div className="flex items-center justify-between p-3.5 bg-[#121820] border border-brand-green/10 rounded-2xl">
              <div>
                <span className="text-[8px] uppercase font-black text-gray-400 block tracking-widest">Active Tickets</span>
                <span className="text-sm font-mono font-black text-white">
                  {kitchenOrders.filter(o => o.status === 'cooking').length} orders cooking • {kitchenOrders.filter(o => o.status === 'sent').length} pending acceptance
                </span>
              </div>
              <div className="text-right">
                <span className="text-[8px] uppercase font-black text-gray-400 block tracking-widest">Kitchen Fulfillment</span>
                <span className="text-xs font-black text-brand-orange uppercase tracking-wider block mt-0.5 animate-pulse">
                  ● LIVE HIGH-SPEED DISPATCH
                </span>
              </div>
            </div>

            {/* 4 DYNAMIC KANBAN LANES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              {/* LANE 1: RECEIVED QUEUE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#121820] border border-white/10 px-3 py-2 rounded-xl sticky top-20 z-10 shadow-md">
                  <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    1. Received Queue
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-md">
                    {visibleOrders.filter(o => o.status === 'sent').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {visibleOrders
                      .filter(o => o.status === 'sent')
                      .map((o) => {
                        const isUnaccepted = !o.acceptedByKitchenId || o.acceptedByKitchenId === "";
                        return (
                          <motion.div
                            key={`kds-q-${o.id}`}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#151C24] border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden"
                          >
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${
                              o.lane === 'lane_a' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />

                            {isUnaccepted && (
                              <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[9px] font-bold text-amber-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">⚡ BROADCAST REQUEST</span>
                                <span className="text-[8px] font-mono opacity-80">Pending Acceptance</span>
                              </div>
                            )}

                            {/* Genuine Rider En Route Notice (ONLY when rider is actually assigned!) */}
                            {(o.deliveryPartnerName || (o as any).assignedRiderName) && (
                              <div className="bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-emerald-300 flex items-center justify-between">
                                <span className="flex items-center gap-1">🛵 Rider {o.deliveryPartnerName || (o as any).assignedRiderName} assigned</span>
                                <span className="text-[8px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 font-mono">EN ROUTE</span>
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-mono font-black text-brand-orange uppercase block">
                                  #{o.id}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
                                  Customer: {o.customerName || (o as any).userName || 'Valued Patron'}
                                </span>
                              </div>
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${
                                o.lane === 'lane_a' 
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                                  : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
                              }`}>
                                {o.lane === 'lane_a' ? 'VEG SAUTÉ' : 'MEAT GRILL'}
                              </span>
                            </div>

                            {/* Items list */}
                            <div className="space-y-1.5 border-t border-white/5 pt-2">
                              {o.items?.map((it, idx) => (
                                <div key={idx} className="text-[11px] leading-tight flex justify-between gap-2">
                                  <span className="font-bold text-gray-200">
                                    <span className="text-brand-green font-mono font-black">{it.quantity}x</span> {it.meal?.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-gray-500 shrink-0">{it.meal?.calories} kcal</span>
                                </div>
                              ))}
                            </div>

                            {/* Prep Time Controller */}
                            <div className="bg-[#10151C] p-2 rounded-xl border border-white/5 flex items-center justify-between gap-1 text-[9px]">
                              <div className="flex items-center gap-1 font-mono text-gray-300">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Prep Buffer:</span>
                                <span className={`font-black ${o.extraPrepMinutes ? 'text-amber-400' : 'text-gray-400'}`}>
                                  {o.extraPrepMinutes ? `${o.extraPrepMinutes > 0 ? '+' : ''}${o.extraPrepMinutes}m` : '0m'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustOrderPrepTime(o.id, -5)}
                                  className="px-1.5 py-0.5 bg-[#1C2530] hover:bg-gray-800 border border-white/10 text-gray-300 font-black rounded text-[8px] cursor-pointer"
                                >
                                  -5m
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustOrderPrepTime(o.id, 5)}
                                  className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black rounded text-[8px] cursor-pointer"
                                >
                                  +5m
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustOrderPrepTime(o.id, 10)}
                                  className="px-1.5 py-0.5 bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/40 text-brand-orange font-black rounded text-[8px] cursor-pointer"
                                >
                                  +10m
                                </button>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="pt-2 flex gap-2">
                              <button
                                onClick={() => handleAcceptOrder(o.id)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Accept & Cook
                              </button>
                              <button
                                onClick={() => handleDenyOrder(o.id)}
                                className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                title="Deny order for this kitchen"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Deny
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                  {visibleOrders.filter(o => o.status === 'sent').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-xs text-gray-500">
                      No tickets pending acceptance.
                    </div>
                  )}
                </div>
              </div>

              {/* LANE 2: SAUTÉ & COOKING */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#121820] border border-white/10 px-3 py-2 rounded-xl sticky top-20 z-10 shadow-md">
                  <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                    2. Sauté & Cooking
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-md">
                    {visibleOrders.filter(o => o.status === 'cooking').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {visibleOrders
                      .filter(o => o.status === 'cooking')
                      .map((o) => (
                        <motion.div
                          key={`kds-cook-${o.id}`}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-[#151C24] border border-brand-green/30 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            o.lane === 'lane_a' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />

                          {/* KDSTimer with protein degradation alert */}
                          <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                            <div>
                              <span className="text-xs font-mono font-black text-white">#{o.id}</span>
                              <span className="text-[8px] text-gray-400 block font-mono">
                                Slot: {o.scheduledSlot || 'ASAP Rush'}
                              </span>
                            </div>
                            <KDSTimer createdAt={o.cookingStartedAt || o.createdAt} />
                          </div>

                          {/* Items with Recipe Directives */}
                          <div className="space-y-2">
                            {o.items?.map((it, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="text-[11px] leading-tight flex justify-between gap-2 font-bold text-gray-200">
                                  <span>
                                    <strong className="text-brand-green font-mono">{it.quantity}x</strong> {it.meal?.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-gray-400">{it.meal?.isVeg ? '🥦 Veg' : '🍗 Non-Veg'}</span>
                                </div>
                                <div className="bg-[#10151C] p-2 rounded-xl border border-white/5 space-y-0.5">
                                  {getRecipeDirectives(it.meal?.name || '').map((directive, dIdx) => (
                                    <p key={dIdx} className="text-[9px] font-mono text-gray-400 leading-snug">
                                      {directive}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order Prep Time Controller */}
                          <div className="bg-[#10151C] p-2 rounded-xl border border-white/5 flex items-center justify-between gap-1 text-[9px]">
                            <div className="flex items-center gap-1 font-mono text-gray-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Prep Buffer:</span>
                              <span className={`font-black ${o.extraPrepMinutes ? 'text-amber-400' : 'text-gray-400'}`}>
                                {o.extraPrepMinutes ? `${o.extraPrepMinutes > 0 ? '+' : ''}${o.extraPrepMinutes}m` : '0m'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAdjustOrderPrepTime(o.id, -5)}
                                className="px-1.5 py-0.5 bg-[#1C2530] hover:bg-gray-800 border border-white/10 text-gray-300 font-black rounded text-[8px] cursor-pointer"
                              >
                                -5m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustOrderPrepTime(o.id, 5)}
                                className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black rounded text-[8px] cursor-pointer"
                              >
                                +5m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustOrderPrepTime(o.id, 10)}
                                className="px-1.5 py-0.5 bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/40 text-brand-orange font-black rounded text-[8px] cursor-pointer"
                              >
                                +10m
                              </button>
                            </div>
                          </div>

                          {/* Progress to Plated */}
                          <button
                            type="button"
                            onClick={() => handleMoveToPlated(o.id)}
                            className="w-full py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Move to Plated & Packed ➜</span>
                          </button>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {visibleOrders.filter(o => o.status === 'cooking').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-xs text-gray-500">
                      Stoves & ovens ready. No active cooking tickets.
                    </div>
                  )}
                </div>
              </div>

              {/* LANE 3: PLATED & PACKED */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#121820] border border-white/10 px-3 py-2 rounded-xl sticky top-20 z-10 shadow-md">
                  <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    3. Plated & Packed
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-md">
                    {visibleOrders.filter(o => o.status === 'ready_for_pickup' && o.kdsStage === 'plated').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {visibleOrders
                      .filter(o => o.status === 'ready_for_pickup' && o.kdsStage === 'plated')
                      .map((o) => (
                        <motion.div
                          key={`kds-plate-${o.id}`}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-[#151C24] border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-mono font-black text-white">#{o.id}</span>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">
                                Mode: {o.fulfillmentMode === 'takeaway' ? '🥡 Counter Takeaway' : '🛵 Doorstep Delivery'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                              SEALED & PACKED
                            </span>
                          </div>

                          <div className="bg-[#10151C] p-2.5 rounded-xl border border-white/5 space-y-1 text-xs">
                            <span className="text-[9px] font-black uppercase text-gray-400 block">Rider Logistics</span>
                            {o.deliveryPartnerName ? (
                              <p className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5" /> Rider: {o.deliveryPartnerName} ({o.deliveryVehicleNumber || 'EV'})
                              </p>
                            ) : (
                              <p className="text-gray-400 text-[10px]">
                                {o.fulfillmentMode === 'takeaway' ? 'Awaiting customer counter pickup with OTP' : 'Awaiting fleet partner pickup'}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleHandoverToRiderOrCounter(o)}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Handover / Dispatch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setKotOrderToPrint(o)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl cursor-pointer"
                              title="Print KOT"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {visibleOrders.filter(o => o.status === 'ready_for_pickup' && o.kdsStage === 'plated').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-xs text-gray-500">
                      No orders waiting in packaging area.
                    </div>
                  )}
                </div>
              </div>

              {/* LANE 4: DISPATCHED / COUNTER PICKUP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#121820] border border-white/10 px-3 py-2 rounded-xl sticky top-20 z-10 shadow-md">
                  <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    4. Dispatched / Counter
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-purple-400/10 text-purple-400 px-2 py-0.5 rounded-md">
                    {visibleOrders.filter(o => o.status === 'out_for_delivery' || (o.status === 'ready_for_pickup' && o.kdsStage === 'dispatched')).length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {visibleOrders
                      .filter(o => o.status === 'out_for_delivery' || (o.status === 'ready_for_pickup' && o.kdsStage === 'dispatched'))
                      .map((o) => (
                        <motion.div
                          key={`kds-disp-${o.id}`}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-[#151C24] border border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-mono font-black text-white">#{o.id}</span>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">
                                Total: ₹{o.total} • {o.paymentMethod || 'Prepaid'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                              EN ROUTE
                            </span>
                          </div>

                          <div className="bg-[#10151C] p-2.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[9px] font-black uppercase text-gray-400 block">Recipient</span>
                            <p className="text-xs font-bold text-gray-200">{o.customerName || (o as any).userName || 'Customer'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{o.address}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMarkOrderDelivered(o.id)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Delivered / Handed Over</span>
                          </button>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {visibleOrders.filter(o => o.status === 'out_for_delivery' || (o.status === 'ready_for_pickup' && o.kdsStage === 'dispatched')).length === 0 && (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-xs text-gray-500">
                      No active dispatches currently on the road.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBSECTION 2: RIDER CASH & COMPLETED DELIVERIES DESK      */}
        {/* ======================================================== */}
        {kdsSubSection === 'rider_desk' && (
          <div className="space-y-4">
            
            {/* Cash Handover Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121820] border border-white/10 rounded-2xl p-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                  Pending Cashier Approvals
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                  {cashDeposits.filter(d => d.status === 'pending').length}
                </span>
                <span className="text-[9px] text-gray-500">Awaiting cashier count verification</span>
              </div>

              <div className="bg-[#121820] border border-white/10 rounded-2xl p-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                  Total Fleet Cash in Hand
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  ₹{kitchenAssignedRiders.reduce((sum, r) => sum + (r.cashInHand || 0), 0)}
                </span>
                <span className="text-[9px] text-gray-500">Circulating physical cash across riders</span>
              </div>

              <div className="bg-[#121820] border border-white/10 rounded-2xl p-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 block">
                  Active Fleet In Sector
                </span>
                <span className="text-2xl font-black text-blue-300 font-mono mt-1 block">
                  {kitchenAssignedRiders.filter(r => r.status === 'active').length}
                </span>
                <span className="text-[9px] text-gray-500">Registered delivery partners</span>
              </div>
            </div>

            {/* Pending Deposit Requests Table */}
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Rider Cash Handover Requests</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Verify physical cash handed over at the kitchen cashier desk at shift-end.
                  </p>
                </div>
              </div>

              {cashDeposits.length === 0 ? (
                <div className="p-8 text-center bg-[#0A0E13] rounded-2xl border border-white/5 text-xs text-gray-500">
                  No cash handover requests submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {cashDeposits.map((dep) => (
                    <div key={dep.id} className="bg-[#161D24] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white font-mono">₹{dep.amount}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${
                            dep.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                            dep.status === 'pending' ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse' :
                            'bg-red-950 text-red-400 border-red-800'
                          }`}>
                            {dep.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block mt-1">
                          Rider: <strong className="text-white">{dep.partnerName}</strong> ({dep.partnerVehicle || 'EV'}) • Requested: {new Date(dep.requestedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {dep.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveCashDeposit(dep.id, dep.partnerId, dep.amount)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectCashDeposit(dep.id)}
                            className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rider Roster with Cash in Hand */}
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider">
                Assigned Fleet Roster & Balances
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {kitchenAssignedRiders.map((rider) => (
                  <div key={rider.id} className="bg-[#0A0E13] border border-white/5 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-black text-white">{rider.name}</h5>
                        <span className="text-[9px] text-gray-400 font-mono">{rider.vehicleNumber}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        Cash: ₹{rider.cashInHand || 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400 font-mono">Completed: {rider.deliveriesCompleted || 0}</span>
                      <a
                        href={`tel:${rider.phone}`}
                        className="px-2 py-1 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green rounded-lg border border-brand-green/30 font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* SUBSECTION 3: BRANCH RAW STOCK & INVENTORY ENGINE         */}
        {/* ======================================================== */}
        {kdsSubSection === 'inventory' && (
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
            
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-brand-orange" />
                  <span>{activeKitchen?.name} Raw Stock & Inventory Engine</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time stock depletion, threshold alarms, and rapid restocking controls.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {inventoryItems.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSeedDefaultInventory}
                    className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Initialize Baseline Stock</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingInventoryItem(null);
                    setInvName('');
                    setInvQuantity(10);
                    setInvUnit('kg');
                    setInvMinThreshold(3);
                    setInvCostPerUnit(150);
                    setInvNotes('');
                    setInvConnectedMealIds([]);
                    setInvMealFilter('');
                    setShowAddInventoryModal(true);
                  }}
                  className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock Item</span>
                </button>
              </div>
            </div>

            {/* Inventory Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black uppercase text-gray-400 block">Total Items</span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">{inventoryItems.length}</span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-emerald-500/20">
                <span className="text-[9px] font-black uppercase text-emerald-400 block">Healthy In-Stock</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {inventoryItems.filter(i => i.status === 'in_stock').length}
                </span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-amber-500/20">
                <span className="text-[9px] font-black uppercase text-amber-400 block">Low Stock Warning</span>
                <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
                  {inventoryItems.filter(i => i.status === 'low_stock').length}
                </span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-red-500/20">
                <span className="text-[9px] font-black uppercase text-red-400 block">Out of Stock</span>
                <span className="text-xl font-black text-red-400 font-mono mt-0.5 block">
                  {inventoryItems.filter(i => i.status === 'out_of_stock').length}
                </span>
              </div>
            </div>

            {/* Low-Stock Menu Auto-Disable Sync Engine Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-[#151B22] to-emerald-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
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
                      Live Sync Active
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5 max-w-2xl">
                    When an ingredient reaches zero stock, dependent recipes are automatically toggled to <span className="text-rose-400 font-bold">"Sold Out"</span> on the customer ordering menu to prevent unfulfillable orders. Restocking immediately restores dish availability.
                  </p>
                  {menuSyncNotice && (
                    <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{menuSyncNotice}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isSyncingMenu}
                onClick={handleManualMenuSync}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMenu ? 'animate-spin' : ''}`} />
                <span>{isSyncingMenu ? 'Syncing...' : 'Sync Menu to Stock'}</span>
              </button>
            </div>

            {/* Search & Category Filter Pills */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0A0E13] p-3 rounded-2xl border border-white/5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Stock' },
                  { id: 'proteins', label: 'Proteins' },
                  { id: 'dairy', label: 'Dairy' },
                  { id: 'raw_ingredients', label: 'Grains & Raw' },
                  { id: 'vegetables', label: 'Greens & Veg' },
                  { id: 'pantry_spices', label: 'Spices & Oils' },
                  { id: 'packaging', label: 'Packaging' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setInvCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      invCategoryFilter === cat.id
                        ? 'bg-brand-orange text-brand-charcoal border-brand-orange shadow-md'
                        : 'bg-[#121820] text-gray-400 hover:text-white border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                  placeholder="Filter stock items..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#121820] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>

            {/* Items Grid */}
            {filteredInventoryItems.length === 0 ? (
              <div className="p-8 text-center bg-[#0A0E13] rounded-2xl border border-white/5 text-xs text-gray-500 space-y-2">
                <p>No inventory items match current filter.</p>
                {inventoryItems.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSeedDefaultInventory}
                    className="px-4 py-2 bg-brand-orange text-brand-charcoal text-xs font-black uppercase rounded-xl shadow-md cursor-pointer"
                  >
                    Load Initial Branch Baseline Items
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventoryItems.map((item) => (
                  <div key={item.id} className="bg-[#0A0E13] border border-white/10 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-black text-white">{item.name}</h5>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-mono mt-0.5">
                          Category: {item.category} • Alert at &lt;{item.minThreshold}{item.unit}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${
                        item.status === 'in_stock' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                        item.status === 'low_stock' ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse' :
                        'bg-red-950 text-red-400 border-red-800'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-[#121820] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase block font-bold">In-Station Stock</span>
                        <span className="text-lg font-black text-white font-mono">{item.quantity} {item.unit}</span>
                      </div>
                      
                      {/* Quick Restock Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateStockQuantity(item.id, item.quantity, -1, item.minThreshold)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white font-black text-xs flex items-center justify-center border border-white/10 cursor-pointer"
                          title="Decrease by 1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStockQuantity(item.id, item.quantity, 1, item.minThreshold)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white font-black text-xs flex items-center justify-center border border-white/10 cursor-pointer"
                          title="Increase by 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStockQuantity(item.id, item.quantity, 5, item.minThreshold)}
                          className="px-2 py-1 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green font-black text-[9px] rounded-lg border border-brand-green/30 cursor-pointer"
                          title="Quick restock +5"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStockQuantity(item.id, item.quantity, 10, item.minThreshold)}
                          className="px-2 py-1 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange font-black text-[9px] rounded-lg border border-brand-orange/30 cursor-pointer"
                          title="Quick restock +10"
                        >
                          +10
                        </button>
                      </div>
                    </div>

                    {/* Linked Dishes Info */}
                    <div className="mb-2">
                      {item.connectedMealIds && item.connectedMealIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[8px] font-black uppercase text-brand-orange bg-brand-orange/15 px-1.5 py-0.5 rounded border border-brand-orange/30">
                            🔗 {item.connectedMealIds.length} Linked Dishes
                          </span>
                          {item.connectedMealIds.slice(0, 2).map((mId) => {
                            const found = allMeals.find((m) => m.id === mId);
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
                        <span className="text-[8px] text-gray-500 italic">Recipe auto-sync active</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-400 border-t border-white/5 pt-2 font-mono">
                      <span>Rate: ₹{item.costPerUnit || 150}/{item.unit}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInventoryItem(item);
                            setInvName(item.name);
                            setInvCategory(item.category);
                            setInvQuantity(item.quantity);
                            setInvUnit(item.unit);
                            setInvMinThreshold(item.minThreshold);
                            setInvCostPerUnit(item.costPerUnit || 150);
                            setInvNotes(item.notes || '');
                            setInvConnectedMealIds(item.connectedMealIds || []);
                            setInvMealFilter('');
                            setShowAddInventoryModal(true);
                          }}
                          className="text-gray-400 hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInventoryItem(item.id)}
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBSECTION 4: LIVE FLEET RADAR TRACKING (GENUINE GPS MAP) */}
        {/* ======================================================== */}
        {kdsSubSection === 'radar' && (
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
            {/* Header with Fleet Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-green" />
                  <span>Real-Time Radar & Delivery Tracking for {activeKitchen?.name}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Genuine GPS tracking for active dispatches and assigned fleet partners.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-brand-green bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                  {kitchenAssignedRiders.filter(r => r.status === 'active').length} Genuine Fleet Active
                </span>
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/80 border border-amber-800/60 px-3 py-1.5 rounded-xl">
                  {radarTrackedOrders.length} Dispatches Monitored
                </span>
              </div>
            </div>

            {/* ORDER SELECTOR PILLS (Switch between active kitchen dispatches) */}
            {kitchenOrders.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-brand-orange" />
                    Select Kitchen Dispatch Ticket:
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    Showing {activeRadarOrder ? `Ticket #${activeRadarOrder.id.slice(-6)}` : 'None'}
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {kitchenOrders.map((ord) => {
                    const isSelected = activeRadarOrder?.id === ord.id;
                    const isOut = ord.status === 'out_for_delivery';
                    const isCook = ord.status === 'cooking';
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => setSelectedRadarOrderId(ord.id)}
                        className={`px-3 py-2 rounded-xl text-left font-mono text-xs border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-brand-green/20 border-brand-green text-white shadow-md shadow-brand-green/10 font-bold'
                            : 'bg-[#0E1318] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          isOut ? 'bg-amber-400 animate-ping' : isCook ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-white">#{ord.id.slice(-6)}</span>
                            <span className={`text-[8px] uppercase font-black px-1.5 py-0.2 rounded border ${
                              isOut ? 'bg-amber-950 text-amber-300 border-amber-800' :
                              isCook ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                              'bg-gray-800 text-gray-300 border-gray-700'
                            }`}>
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[9px] text-gray-400 truncate max-w-[140px]">
                            {ord.customerName || 'Guest'} • {ord.address ? ord.address.split(',')[0] : 'Drop-off'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* IF NO ORDERS FOUND AT ALL */}
            {kitchenOrders.length === 0 ? (
              <div className="text-center py-12 bg-[#0B0F14] border border-white/10 rounded-3xl space-y-3">
                <Truck className="w-10 h-10 text-gray-600 mx-auto" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">No active dispatches currently tracked</h3>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  When customers order for {activeKitchen?.name || 'this kitchen'}, live tickets, Google Maps routing polylines, and rider coordinates will automatically stream here.
                </p>
              </div>
            ) : activeRadarOrder ? (
              <div className="space-y-5">
                
                {/* 1. TOP BRIEFING HEADER (Exact Match with Admin Hub Structure) */}
                <div className="bg-[#0B0F14] border-2 border-brand-green/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-black bg-brand-orange/20 text-brand-orange px-3 py-1 rounded-xl border border-brand-orange/30">
                        ORDER ID: {activeRadarOrder.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                        activeRadarOrder.status === 'out_for_delivery'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/40 animate-pulse'
                          : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                      }`}>
                        {activeRadarOrder.status.replace(/_/g, ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/?trackOrder=${activeRadarOrder.id}`;
                          navigator.clipboard.writeText(link);
                          setNoticeMessage(`✅ Live tracking link for Order #${activeRadarOrder.id} copied!`);
                          setTimeout(() => setNoticeMessage(null), 3000);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-brand-green border border-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Copy Customer Tracking Link"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Live Link</span>
                      </button>
                    </div>

                    {activeRadarOrder.deliveryOtp && (
                      <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-right">
                        <span className="text-[9px] font-black text-amber-400 uppercase block leading-none">CUSTOMER VERIFICATION OTP</span>
                        <span className="text-xs font-black text-amber-300 font-mono tracking-widest">{activeRadarOrder.deliveryOtp}</span>
                      </div>
                    )}
                  </div>

                  {/* 3 Top Information Panels: Kitchen, Destination, Rider */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Kitchen Origin */}
                    <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-brand-green uppercase tracking-wider block">🍳 ORIGIN KITCHEN</span>
                      <span className="font-bold text-white block">{activeKitchen?.name || 'Central Kitchen Hub'}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">{activeKitchen?.address || 'Mithanpura Central Kitchen'}</span>
                      <span className="text-[9px] text-gray-500 block font-mono">
                        GPS: {activeKitchen?.lat ? `${activeKitchen.lat.toFixed(4)}, ${activeKitchen.lng.toFixed(4)}` : '26.1209, 85.3647'}
                      </span>
                    </div>

                    {/* Customer Destination */}
                    <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block">📍 CUSTOMER DROP-OFF</span>
                      <span className="font-bold text-white block">
                        {activeRadarOrder.customerName || 'Valued Guest'} 
                        {activeRadarOrder.customerPhone ? ` (${activeRadarOrder.customerPhone})` : ''}
                      </span>
                      <span className="text-[10px] text-gray-300 block font-mono">
                        {activeRadarOrder.address || 'Drop-off destination provided upon checkout'}
                      </span>
                      {activeRadarOrder.deliveryNotes && (
                        <span className="text-[9px] text-amber-400/90 block italic">
                          Note: {activeRadarOrder.deliveryNotes}
                        </span>
                      )}
                    </div>

                    {/* Rider Info & GPS */}
                    <div className="p-3.5 bg-[#12181E] border border-white/10 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">🛵 RIDER FLEET STATUS</span>
                      <span className="font-bold text-white block">
                        {activeRadarPartner?.name || activeRadarOrder.deliveryPartnerName || 'Assigned Fleet Partner'} 
                        {activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone ? ` (${activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone})` : ''}
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-mono">
                        {activeRadarOrder.riderLat && activeRadarOrder.riderLng 
                          ? `🟢 Live Coords: ${activeRadarOrder.riderLat.toFixed(4)}, ${activeRadarOrder.riderLng.toFixed(4)}`
                          : activeRadarOrder.status === 'out_for_delivery'
                            ? '🛵 Rider En-Route to Customer'
                            : '📡 Awaiting Rider GPS Ping'}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-mono">
                        Vehicle: {activeRadarPartner?.vehicleNumber || activeRadarOrder.deliveryVehicleNumber || 'FZ-EV-01'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. EMBEDDED GOOGLE MAPS SDK (Pointing to Real Destination) */}
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                  <InAppDeliveryMap
                    orderId={activeRadarOrder.id}
                    customerAddress={activeRadarOrder.address}
                    customerLat={activeRadarOrder.deliveryLat}
                    customerLng={activeRadarOrder.deliveryLng}
                    customerName={activeRadarOrder.customerName || 'Valued Guest'}
                    customerPhone={activeRadarOrder.customerPhone || ''}
                    kitchenName={activeKitchen?.name || 'Central Kitchen'}
                    kitchenAddress={activeKitchen?.address || 'Central Facility'}
                    kitchenLat={activeKitchen?.lat || 26.1209}
                    kitchenLng={activeKitchen?.lng || 85.3647}
                    riderName={activeRadarPartner?.name || activeRadarOrder.deliveryPartnerName}
                    riderPhone={activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone}
                    riderVehicleNumber={activeRadarPartner?.vehicleNumber || activeRadarOrder.deliveryVehicleNumber}
                    riderLat={activeRadarOrder.riderLat || activeRadarPartner?.lat}
                    riderLng={activeRadarOrder.riderLng || activeRadarPartner?.lng}
                    orderStatus={activeRadarOrder.status}
                    isRaining={Boolean(activeKitchen?.isRaining)}
                    isAdminView={true}
                    allActiveOrders={radarTrackedOrders}
                    allRiders={kitchenAssignedRiders}
                  />
                </div>

                {/* 3. DETAILED INFORMATION SECTION BELOW MAP (As Requested) */}
                <div className="bg-[#0E1318] border border-white/10 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-orange" />
                      <span>Live Destination, Turn-by-Turn Routing & Dispatch Payload</span>
                    </h4>
                    <span className="text-[10px] font-mono text-gray-400">
                      Google Maps Directions API Connected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* PANEL A: EXACT CUSTOMER DESTINATION & MAP NAVIGATION */}
                    <div className="bg-[#141A22] border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Drop-Off Point
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-black">
                            {activeRadarOrder.fulfillmentMode === 'takeaway' ? 'Self-Pickup' : 'Delivery'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white leading-relaxed">
                          {activeRadarOrder.address || 'No destination street address recorded.'}
                        </p>
                        <div className="text-[11px] text-gray-300 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span>{activeRadarOrder.customerName || 'Valued Guest'}</span>
                        </div>
                        {activeRadarOrder.customerPhone && (
                          <div className="text-[11px] text-gray-300 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-brand-green" />
                            <a 
                              href={`tel:${activeRadarOrder.customerPhone}`}
                              className="text-brand-green font-mono hover:underline"
                            >
                              {activeRadarOrder.customerPhone}
                            </a>
                          </div>
                        )}
                        {activeRadarOrder.deliveryNotes && (
                          <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-[10px] text-amber-300/90 italic">
                            💬 "{activeRadarOrder.deliveryNotes}"
                          </div>
                        )}
                      </div>

                      {/* Launch external Google Maps Navigation */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeKitchen?.address || 'Muzaffarpur')}&destination=${encodeURIComponent(activeRadarOrder.address || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 bg-brand-green/15 hover:bg-brand-green/25 text-brand-green border border-brand-green/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Open Google Maps Directions</span>
                        <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                      </a>
                    </div>

                    {/* PANEL B: ASSIGNED FLEET COURIER & LIVE TELEMETRY */}
                    <div className="bg-[#141A22] border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5" />
                            Fleet Courier Assigned
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-black">
                            {activeRadarPartner?.status || 'Active'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-white">
                            {activeRadarPartner?.name || activeRadarOrder.deliveryPartnerName || 'Fleet Partner Awaiting Handover'}
                          </h5>
                          <p className="text-[11px] text-gray-400 font-mono">
                            Vehicle Plate: {activeRadarPartner?.vehicleNumber || activeRadarOrder.deliveryVehicleNumber || 'FZ-EV-01'}
                          </p>
                        </div>

                        <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">GPS Signal:</span>
                            <span className={`font-black ${activeRadarOrder.riderLat ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {activeRadarOrder.riderLat ? '🟢 Transmitting Live' : '📡 Standby / In Kitchen'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Thermal Seal:</span>
                            <span className="text-brand-green font-bold">Tamper Evident Boxed</span>
                          </div>
                          {activeRadarOrder.deliveryOtp && (
                            <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                              <span className="text-amber-400 font-bold">Customer Handover OTP:</span>
                              <span className="font-mono font-black text-amber-300 text-xs">{activeRadarOrder.deliveryOtp}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone ? (
                        <a
                          href={`tel:${activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone}`}
                          className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Call Courier ({activeRadarPartner?.phone || activeRadarOrder.deliveryPartnerPhone})</span>
                        </a>
                      ) : (
                        <div className="text-center text-[10px] text-gray-500 italic py-2">
                          Direct phone not registered for courier
                        </div>
                      )}
                    </div>

                    {/* PANEL C: TICKET PAYLOAD & FINANCIAL SETTLEMENT */}
                    <div className="bg-[#141A22] border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-brand-green uppercase tracking-wider flex items-center gap-1">
                            <UtensilsCrossed className="w-3.5 h-3.5" />
                            Ticket Payload & Settlement
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-black border ${
                            activeRadarOrder.paymentStatus === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {activeRadarOrder.paymentStatus === 'paid' ? 'Paid Online' : 'COD Cash Handoff'}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                          {(activeRadarOrder.items || []).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                              <span className="text-gray-200 truncate max-w-[140px]">
                                <span className="font-bold text-brand-orange">{it.quantity}×</span> {it.name}
                              </span>
                              <span className="font-mono text-gray-400 text-[11px]">
                                ₹{(it.price || 0) * (it.quantity || 1)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                          <span className="text-gray-400 uppercase font-black text-[10px]">Total Ticket Value:</span>
                          <span className="text-base font-black text-brand-green">₹{activeRadarOrder.total}</span>
                        </div>
                      </div>

                      {/* Quick stage transition button for kitchen manager */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        {activeRadarOrder.status === 'cooking' ? (
                          <button
                            type="button"
                            onClick={() => handleMoveToPlated(activeRadarOrder.id)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Plated & Ready</span>
                          </button>
                        ) : activeRadarOrder.status === 'ready_for_pickup' ? (
                          <button
                            type="button"
                            onClick={() => handleHandoverToRiderOrCounter(activeRadarOrder)}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Handover to Rider</span>
                          </button>
                        ) : activeRadarOrder.status === 'out_for_delivery' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkOrderDelivered(activeRadarOrder.id)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Mark Delivered</span>
                          </button>
                        ) : (
                          <div className="w-full text-center text-[10px] font-mono text-gray-400 py-1.5 bg-white/5 rounded-xl">
                            Ticket status: {activeRadarOrder.status}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </div>

              </div>
            ) : null}

          </div>
        )}

        {/* ======================================================== */}
        {/* SUBSECTION 5: EOD SHIFT SETTLEMENTS & AUDIT ARCHIVE      */}
        {/* ======================================================== */}
        {kdsSubSection === 'eod_settlement' && (
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
            
            {/* Header with Run Audit CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>{activeKitchen?.name} End-of-Day Shift Settlements</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Formal shift closures, cash register reconciliation against fleet COD, and printable PDF audit archives.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEODSettlement}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Run Today's Shift Settlement</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black uppercase text-gray-400 block">Total Shift Audits</span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">{eodReports.length}</span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-emerald-500/20">
                <span className="text-[9px] font-black uppercase text-emerald-400 block">Today's Revenue</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                  ₹{kitchenOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-brand-green/20">
                <span className="text-[9px] font-black uppercase text-brand-green block">Verified Register Cash</span>
                <span className="text-xl font-black text-brand-green font-mono mt-0.5 block">
                  ₹{cashDeposits.filter(d => d.status === 'approved').reduce((s, d) => s + (d.amount || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0A0E13] p-3.5 rounded-2xl border border-purple-500/20">
                <span className="text-[9px] font-black uppercase text-purple-300 block">Settlement Status</span>
                <span className="text-xs font-black text-purple-300 font-mono mt-1 block uppercase">
                  {eodReports.length > 0 && eodReports[0].reportDate === new Date().toISOString().split('T')[0] ? '✓ Shift Closed Today' : '⏳ Active Shift Open'}
                </span>
              </div>
            </div>

            {/* Historical Reports Archive */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                <span>Shift Settlement Records History</span>
                <span className="text-[10px] text-gray-500 font-mono">{eodReports.length} Historical Records</span>
              </h4>

              {eodReports.length === 0 ? (
                <div className="bg-[#0A0E13] p-8 rounded-2xl border border-white/5 text-center space-y-3">
                  <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400 font-medium">
                    No EOD shift settlements have been recorded yet for this kitchen branch.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenEODSettlement}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-green" />
                    <span>Run Initial Shift Audit</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#0A0E13] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#161D24] text-[9px] font-black uppercase tracking-wider text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Audit Date & Shift</th>
                          <th className="p-3">Tickets Fulfilled</th>
                          <th className="p-3">Gross Sales</th>
                          <th className="p-3">Cash Handover</th>
                          <th className="p-3">Register Variance</th>
                          <th className="p-3">Manager Sign-Off</th>
                          <th className="p-3 text-right">PDF Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {eodReports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-white block">{rep.reportDate}</span>
                              <span className="text-[9px] font-black uppercase text-purple-400 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 inline-block mt-0.5">
                                {rep.shiftType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-emerald-400 font-bold">{rep.totalOrdersFulfilled} fulfilled</span>
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

          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: PREP DELAY RUSH BUFFER CONTROLLER                  */}
      {/* ======================================================== */}
      {showPrepDelayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161D24] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Configure Peak Rush Buffer</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPrepDelayModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              When orders flood the kitchen during rush hours, adding a buffer adjusts customer ETAs automatically.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { mins: 0, label: 'Normal (0 mins)' },
                { mins: 5, label: '+5 mins Rush' },
                { mins: 10, label: '+10 mins Peak' },
                { mins: 15, label: '+15 mins Heavy' },
                { mins: 20, label: '+20 mins Max' },
              ].map((b) => (
                <button
                  key={b.mins}
                  type="button"
                  onClick={() => handleSetGlobalPrepDelay(activeKitchen?.id || 'k1', b.mins)}
                  className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    (activeKitchen?.globalPrepDelayMinutes || 0) === b.mins
                      ? 'bg-amber-500 text-brand-charcoal border-amber-500 shadow-md'
                      : 'bg-[#0F141A] border-white/10 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrepDelayModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT INVENTORY ITEM                          */}
      {/* ======================================================== */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161D24] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-brand-orange" />
                <span>{editingInventoryItem ? `Edit ${editingInventoryItem.name}` : 'Add Inventory Stock Item'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddInventoryModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventoryItem} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="e.g. Boneless Chicken Breast"
                  className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Category</label>
                  <select
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white"
                  >
                    <option value="proteins">Proteins</option>
                    <option value="dairy">Dairy</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="raw_ingredients">Raw Grains / Rice</option>
                    <option value="pantry_spices">Pantry / Spices</option>
                    <option value="packaging">Packaging Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Unit</label>
                  <select
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value as any)}
                    className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white font-mono"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liters">liters</option>
                    <option value="ml">ml</option>
                    <option value="units">units</option>
                    <option value="boxes">boxes</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={invQuantity}
                    onChange={(e) => setInvQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Min Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={invMinThreshold}
                    onChange={(e) => setInvMinThreshold(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Cost/Unit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={invCostPerUnit}
                    onChange={(e) => setInvCostPerUnit(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Supplier / Notes</label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="e.g. Daily local farm supply"
                  className="w-full p-2.5 bg-[#0F141A] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              {/* STEP: Connect Menu Items to Ingredient */}
              <div className="border border-brand-orange/20 rounded-2xl p-3.5 bg-[#0A0E13] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-brand-orange tracking-wider">
                      🍽️ Connected Menu Items ({invConnectedMealIds.length} Linked)
                    </label>
                    <p className="text-[9px] text-gray-400 leading-snug">
                      When this ingredient reaches 0 / out of stock, connected dishes are instantly marked SOLD OUT on the customer menu.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setInvConnectedMealIds(allMeals.map(m => m.id))}
                      className="text-brand-green hover:underline cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => setInvConnectedMealIds([])}
                      className="text-gray-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search dishes by name or category..."
                    value={invMealFilter}
                    onChange={(e) => setInvMealFilter(e.target.value)}
                    className="w-full pl-3 pr-3 py-1.5 bg-[#141A22] border border-white/10 rounded-xl text-[10px] text-white focus:outline-none focus:border-brand-orange/50"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {allMeals
                    .filter(m => !invMealFilter || m.name.toLowerCase().includes(invMealFilter.toLowerCase()) || (m.category && m.category.toLowerCase().includes(invMealFilter.toLowerCase())))
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
                              ? 'bg-brand-orange/15 border-brand-orange/40 text-white shadow-xs'
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
                                ₹{meal.price} • {meal.category || 'Mains'} {meal.isAvailable === false ? '• (Currently Sold Out)' : ''}
                              </span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 text-[10px] font-black transition-all ${
                            isSelected ? 'bg-brand-orange border-brand-orange text-black' : 'border-white/20'
                          }`}>
                            {isSelected && '✓'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInventoryModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingInventoryItem ? 'Update Stock Item' : 'Save Stock Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRINT KITCHEN ORDER TICKET (KOT)                  */}
      {/* ======================================================== */}
      {kotOrderToPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-2xl font-mono text-xs space-y-3 shadow-2xl">
            <div className="text-center border-b border-black pb-2">
              <h3 className="font-black text-sm uppercase">FITTONS / TAASH BHATTI</h3>
              <p className="text-[10px] uppercase font-bold">{activeKitchen?.name}</p>
              <p className="text-[9px] text-gray-600">{new Date().toLocaleString()}</p>
            </div>

            <div className="border-b border-black pb-2 space-y-1">
              <p className="font-black text-base">ORDER: #{kotOrderToPrint.id}</p>
              <p className="text-[11px]">Customer: {kotOrderToPrint.customerName || (kotOrderToPrint as any).userName || 'Customer'}</p>
              <p className="text-[10px]">Address: {kotOrderToPrint.address || 'Central Delivery'}</p>
            </div>

            <div className="border-b border-black pb-2 space-y-1">
              <p className="font-black text-[11px] uppercase border-b border-gray-300 pb-1">ITEMS:</p>
              {kotOrderToPrint.items?.map((item, i) => (
                <div key={i} className="flex justify-between font-bold text-xs">
                  <span>{item.quantity}x {item.meal?.name}</span>
                  <span>{item.meal?.isVeg ? '[VEG]' : '[NON-VEG]'}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setKotOrderToPrint(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-black font-bold uppercase rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setKotOrderToPrint(null);
                }}
                className="flex-1 py-2 bg-black hover:bg-gray-800 text-white font-black uppercase rounded-lg cursor-pointer"
              >
                Print Ticket
              </button>
            </div>
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

    </div>
  );
}
