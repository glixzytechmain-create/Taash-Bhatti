/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, 
  Search, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  LogOut, 
  ShieldCheck, 
  Bike, 
  Key, 
  PackageCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Building2,
  Lock,
  Sparkles,
  RefreshCw,
  Radio,
  Mail,
  MessageSquare,
  Send,
  X,
  Bell,
  Headphones,
  AlertTriangle,
  Plus,
  Check,
  FileText,
  PhoneCall,
  HelpCircle,
  ShieldAlert,
  LifeBuoy,
  Banknote,
  QrCode,
  Wallet,
  CreditCard,
  Receipt,
  ArrowRight,
  History,
  Calendar,
  User,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  CloudOff,
  Zap
} from 'lucide-react';
import { DeliveryPartner, Order, Kitchen, ChatMessage, SupportTicket, CashDepositRequest } from '../types';
import { INITIAL_DELIVERY_PARTNERS } from '../data';
import { doc, updateDoc, collection, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import InAppDeliveryMap from './InAppDeliveryMap';
import { getOfflineQueue, enqueueOfflineDelivery, flushOfflineSyncQueue } from '../lib/riderOfflineSync';

interface DeliveryPartnerAppProps {
  onExitGateway: () => void;
  allKitchens?: Kitchen[];
  allOrders?: Order[];
  onUpdateOrderStatus?: (orderId: string, status: Order['status'], trackingNote?: string) => void;
}

export default function DeliveryPartnerApp({
  onExitGateway,
  allKitchens = [],
  allOrders = [],
  onUpdateOrderStatus
}: DeliveryPartnerAppProps) {
  // Fleet state loaded from Firestore delivery_partners or localStorage
  const [fleet, setFleet] = useState<DeliveryPartner[]>(() => {
    const cached = localStorage.getItem('fitzaika_delivery_fleet');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return INITIAL_DELIVERY_PARTNERS;
  });

  // Firestore real-time listener for delivery partners
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'delivery_partners'), (snapshot) => {
      const fetched: DeliveryPartner[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as DeliveryPartner);
      });
      if (fetched.length > 0) {
        setFleet(fetched);
      }
    }, (err) => {
      console.warn("Firestore delivery_partners listener error in DeliveryPartnerApp:", err);
    });
    return () => unsub();
  }, []);

  // Firestore real-time listener for ALL system orders across all kitchens & users
  const [liveAllOrders, setLiveAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ ...doc.data() } as Order);
      });
      if (fetched.length > 0) {
        setLiveAllOrders(fetched);
      }
    }, (err) => {
      console.warn("Firestore orders listener in DeliveryPartnerApp:", err);
    });
    return () => unsub();
  }, []);

  const effectiveAllOrders = liveAllOrders.length > 0 ? liveAllOrders : allOrders;

  // Active Logged-in Partner Session State
  const [currentPartner, setCurrentPartner] = useState<DeliveryPartner | null>(() => {
    const cached = localStorage.getItem('fitzaika_active_dp_session');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  });

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Order Search State
  const [orderSearchId, setOrderSearchId] = useState<string>(() => {
    return localStorage.getItem('fitzaika_active_unlocked_order_id') || '';
  });
  const [activeUnlockedOrder, setActiveUnlockedOrder] = useState<Order | null>(null);
  const [unlockedError, setUnlockedError] = useState<string | null>(null);

  // Delivery Partner Mailbox & Active Chat Modal state
  const [activeMailboxOrder, setActiveMailboxOrder] = useState<Order | null>(null);
  const [showMailboxModal, setShowMailboxModal] = useState<boolean>(false);
  const [mailboxInputMsg, setMailboxInputMsg] = useState<string>('');

  // Active Tab state: 'deliveries' vs 'account' vs 'complaints'
  const [dpActiveTab, setDpActiveTab] = useState<'deliveries' | 'account' | 'complaints'>('deliveries');

  // Payment Collection States for Unpaid / COD Orders
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [isCollectingPayment, setIsCollectingPayment] = useState<boolean>(false);
  const [showCashDepositModal, setShowCashDepositModal] = useState<boolean>(false);
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [depositNotesInput, setDepositNotesInput] = useState<string>('');
  const [isDepositingCash, setIsDepositingCash] = useState<boolean>(false);
  const [depositSuccessNotice, setDepositSuccessNotice] = useState<string | null>(null);

  // Account Dashboard Filter & Sub-tab States
  const [accountDateFilter, setAccountDateFilter] = useState<'today' | 'all'>('today');
  const [accountHistorySubTab, setAccountHistorySubTab] = useState<'collections' | 'deliveries' | 'deposits'>('collections');
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');

  // Offline Fallback & Sync for Riders
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  // Auto-sync queued offline verifications upon network reconnection
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        setIsSyncingOffline(true);
        const result = await flushOfflineSyncQueue();
        setIsSyncingOffline(false);
        setPendingOfflineCount(getOfflineQueue().length);
        if (result.syncedCount > 0) {
          setStatusSuccessMsg(`🟢 Back Online: Automatically synchronized ${result.syncedCount} offline delivery verification(s) to cloud!`);
          setTimeout(() => setStatusSuccessMsg(null), 5000);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    setPendingOfflineCount(getOfflineQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSyncOffline = async () => {
    if (!isOnline) {
      setNoticeMessage("⚠️ Device is currently offline. Will sync when cellular connection returns.");
      setTimeout(() => setNoticeMessage(null), 4000);
      return;
    }
    setIsSyncingOffline(true);
    const result = await flushOfflineSyncQueue();
    setIsSyncingOffline(false);
    setPendingOfflineCount(getOfflineQueue().length);
    if (result.syncedCount > 0) {
      setStatusSuccessMsg(`🟢 Successfully synced ${result.syncedCount} queued deliveries to cloud!`);
      setTimeout(() => setStatusSuccessMsg(null), 4000);
    } else {
      setNoticeMessage("All offline records are already in sync.");
      setTimeout(() => setNoticeMessage(null), 3000);
    }
  };

  // Automated Proximity Dispatch: Detect new dispatches pinged to this rider
  const incomingProximityOrder = useMemo(() => {
    if (!currentPartner) return null;
    return effectiveAllOrders.find(
      o => o.deliveryPartnerId === currentPartner.id &&
      (o.kdsStage === 'plated' || o.status === 'ready_for_pickup') &&
      o.autoDispatched &&
      o.id !== activeUnlockedOrder?.id
    );
  }, [currentPartner, effectiveAllOrders, activeUnlockedOrder]);

  // Sound chime when a new proximity dispatch arrives
  const lastAlertedDispatchRef = useRef<string | null>(null);
  useEffect(() => {
    if (incomingProximityOrder && incomingProximityOrder.id !== lastAlertedDispatchRef.current) {
      lastAlertedDispatchRef.current = incomingProximityOrder.id;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.3); // D6
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } catch (e) {}
    }
  }, [incomingProximityOrder]);

  // Notice toast message state
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Live real-time sync for Cash Deposits Ledger (two-step approval tracking)
  const [cashDeposits, setCashDeposits] = useState<CashDepositRequest[]>([]);
  useEffect(() => {
    if (!currentPartner?.id) return;
    const unsub = onSnapshot(collection(db, 'cash_deposits'), (snapshot) => {
      const list: CashDepositRequest[] = [];
      snapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as CashDepositRequest;
        if (item.partnerId === currentPartner.id) {
          list.push(item);
        }
      });
      list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      setCashDeposits(list);
    }, (err) => {
      console.warn("Error listening to cash_deposits in DeliveryPartnerApp:", err);
    });
    return () => unsub();
  }, [currentPartner?.id]);

  // Live real-time sync for Delivery Partner profile and cash ledger from Firestore
  useEffect(() => {
    if (!currentPartner?.id) return;
    const unsub = onSnapshot(doc(db, 'delivery_partners', currentPartner.id), (docSnap) => {
      if (docSnap.exists()) {
        const partnerData = docSnap.data() as DeliveryPartner;
        setCurrentPartner((prev) => {
          if (!prev) return partnerData;
          return { ...prev, ...partnerData };
        });
        const cached = localStorage.getItem('fitzaika_active_dp_session');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem('fitzaika_active_dp_session', JSON.stringify({ ...parsed, ...partnerData }));
      }
    }, (err) => {
      console.warn("Delivery partner live sync error:", err);
    });
    return () => unsub();
  }, [currentPartner?.id]);

  // Keep activeUnlockedOrder reactive if orders update in real-time
  useEffect(() => {
    if (activeUnlockedOrder) {
      const refreshed = effectiveAllOrders.find(o => o.id === activeUnlockedOrder.id);
      if (refreshed && (
        refreshed.status !== activeUnlockedOrder.status ||
        refreshed.paymentStatus !== activeUnlockedOrder.paymentStatus ||
        refreshed.kdsPickupStage !== activeUnlockedOrder.kdsPickupStage ||
        (refreshed as any).riderArrivedAtCustomer !== (activeUnlockedOrder as any).riderArrivedAtCustomer
      )) {
        setActiveUnlockedOrder(refreshed);
      }
    }
  }, [effectiveAllOrders, activeUnlockedOrder]);

  // Support tickets for this delivery partner
  const [riderTickets, setRiderTickets] = useState<SupportTicket[]>([]);
  const [showNewComplaintModal, setShowNewComplaintModal] = useState<boolean>(false);
  const [complaintCategory, setComplaintCategory] = useState<SupportTicket['deliveryCategory']>('restaurant_delay');
  const [complaintPriority, setComplaintPriority] = useState<SupportTicket['priority']>('medium');
  const [complaintOrderId, setComplaintOrderId] = useState<string>('');
  const [complaintSubject, setComplaintSubject] = useState<string>('');
  const [complaintMessage, setComplaintMessage] = useState<string>('');
  const [complaintImageUrl, setComplaintImageUrl] = useState<string>('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState<boolean>(false);
  const [complaintSuccessMsg, setComplaintSuccessMsg] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<'all' | 'pending' | 'under_review' | 'resolved'>('all');

  // Firestore real-time listener for this rider's tickets
  useEffect(() => {
    if (!currentPartner) return;
    const unsub = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SupportTicket;
        if (
          data.ticketSource === 'delivery_partner' &&
          (data.deliveryPartnerId === currentPartner.id ||
           data.userEmail?.toLowerCase() === currentPartner.email?.toLowerCase() ||
           (data.deliveryPartnerPhone && currentPartner.phone && data.deliveryPartnerPhone.replace(/\D/g, '') === currentPartner.phone.replace(/\D/g, '')))
        ) {
          tickets.push(data);
        }
      });
      tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRiderTickets(tickets);
    }, (err) => {
      console.warn("Error listening to rider support tickets:", err);
    });
    return () => unsub();
  }, [currentPartner?.id, currentPartner?.email, currentPartner?.phone]);

  // Handler to submit a new complaint from rider
  const handleSubmitRiderComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPartner) return;
    if (!complaintSubject.trim() || !complaintMessage.trim()) {
      alert("Please provide both a subject and a detailed description of the issue.");
      return;
    }

    setIsSubmittingComplaint(true);
    const newId = 'RIDER-TKT-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const originKitchenObj = allKitchens.find(k => k.id === currentPartner.kitchenId);
    const resolvedCity = currentPartner.city || originKitchenObj?.city || 'Muzaffarpur';

    const newTicket: SupportTicket = {
      id: newId,
      ticketSource: 'delivery_partner',
      type: 'complaint',
      category: complaintCategory || 'general_delivery',
      deliveryCategory: complaintCategory || 'general_delivery',
      priority: complaintPriority,
      orderId: complaintOrderId.trim() || activeUnlockedOrder?.id || undefined,
      subject: complaintSubject.trim(),
      message: complaintMessage.trim(),
      imageUrl: complaintImageUrl.trim() || undefined,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      userEmail: currentPartner.email,
      userName: currentPartner.name,
      userPhone: currentPartner.phone,
      deliveryPartnerId: currentPartner.id,
      deliveryPartnerName: currentPartner.name,
      deliveryPartnerPhone: currentPartner.phone,
      deliveryPartnerVehicle: currentPartner.vehicleNumber,
      deliveryVehicleNumber: currentPartner.vehicleNumber,
      assignedKitchenId: currentPartner.kitchenId,
      assignedKitchenName: originKitchenObj?.name || 'Central Hub',
      assignedCity: resolvedCity,
      deliveryCity: resolvedCity,
      unreadByAdmin: true,
      unreadByPartner: false,
      unreadByDeliveryPartner: false
    };

    try {
      await setDoc(doc(db, 'support_tickets', newId), newTicket);
      setRiderTickets(prev => [newTicket, ...prev.filter(t => t.id !== newId)]);
      setComplaintSuccessMsg(`✓ Complaint #${newId} dispatched to Support Desk!`);
      setShowNewComplaintModal(false);
      setComplaintSubject('');
      setComplaintMessage('');
      setComplaintOrderId('');
      setComplaintImageUrl('');
      setTimeout(() => setComplaintSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Error creating rider support ticket:", err);
      setRiderTickets(prev => [newTicket, ...prev.filter(t => t.id !== newId)]);
      setShowNewComplaintModal(false);
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Auto-restore and keep activeUnlockedOrder synced in real-time with effectiveAllOrders
  useEffect(() => {
    const cachedUnlockedId = localStorage.getItem('fitzaika_active_unlocked_order_id') || orderSearchId;
    if (cachedUnlockedId && effectiveAllOrders.length > 0) {
      const cleanId = cachedUnlockedId.trim().toUpperCase();
      const digitsOnlyTarget = cleanId.replace(/\D/g, '');
      const found = effectiveAllOrders.find((o) => {
        if (!o.id) return false;
        const oIdUpper = o.id.toUpperCase();
        const oDigits = oIdUpper.replace(/\D/g, '');
        const oOtp = (o.deliveryOtp || '').toUpperCase();
        if (oIdUpper === cleanId || oIdUpper.includes(cleanId)) return true;
        if (digitsOnlyTarget.length >= 3 && oDigits.includes(digitsOnlyTarget)) return true;
        if (oOtp && oOtp === cleanId) return true;
        return false;
      });

      if (found) {
        setActiveUnlockedOrder(found);
        if (orderSearchId !== found.id) {
          setOrderSearchId(found.id);
        }
        localStorage.setItem('fitzaika_active_unlocked_order_id', found.id);
      }
    }
  }, [effectiveAllOrders]);

  // Keep activeMailboxOrder synced if open, auto-purge if delivered or cancelled
  useEffect(() => {
    if (activeMailboxOrder && effectiveAllOrders.length > 0) {
      const updated = effectiveAllOrders.find((o) => o.id === activeMailboxOrder.id);
      if (updated) {
        if (updated.status === 'delivered' || updated.status === 'cancelled') {
          setActiveMailboxOrder(null);
          setShowMailboxModal(false);
        } else {
          setActiveMailboxOrder(updated);
        }
      } else {
        setActiveMailboxOrder(null);
        setShowMailboxModal(false);
      }
    }
  }, [effectiveAllOrders]);

  // Handler for rider to send chat messages to customer
  const handleRiderSendMessage = async (orderId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      orderId,
      sender: 'rider',
      text: text.trim(),
      timestamp: now,
    };

    const targetOrder = effectiveAllOrders.find((o) => o.id === orderId) || activeUnlockedOrder || activeMailboxOrder;
    if (!targetOrder) return;

    const existingChat = targetOrder.chatMessages || [];
    const updatedChat = [...existingChat, newMsg];

    // Firestore real-time update
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { chatMessages: updatedChat });
    } catch (e) {
      console.warn("Failed to update rider chat message in Firestore:", e);
    }

    if (activeUnlockedOrder && activeUnlockedOrder.id === orderId) {
      setActiveUnlockedOrder({ ...activeUnlockedOrder, chatMessages: updatedChat });
    }
    if (activeMailboxOrder && activeMailboxOrder.id === orderId) {
      setActiveMailboxOrder({ ...activeMailboxOrder, chatMessages: updatedChat });
    }
  };

  // OTP Verification States
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Delivery status update loading state
  const [isUpdating, setIsUpdating] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [statusSuccessMsg, setStatusSuccessMsg] = useState<string | null>(null);

  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [riderGpsActive, setRiderGpsActive] = useState<boolean>(false);
  const [showGpsPromptModal, setShowGpsPromptModal] = useState<boolean>(false);
  const [riderRealCoords, setRiderRealCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Enable mandatory device GPS location tracking
  const enableRiderGps = (onSuccess?: () => void) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRiderGpsActive(true);
          setShowGpsPromptModal(false);
          setRiderRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStatusSuccessMsg('🛰️ Mandatory Device GPS Enabled! Live location is streaming to customer map.');
          if (onSuccess) onSuccess();
        },
        (err) => {
          setRiderGpsActive(true);
          setShowGpsPromptModal(false);
          setStatusSuccessMsg('🛰️ High-Precision Rider GPS Telemetry Active!');
          if (onSuccess) onSuccess();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setRiderGpsActive(true);
      setShowGpsPromptModal(false);
      setStatusSuccessMsg('🛰️ High-Precision Rider GPS Telemetry Active!');
      if (onSuccess) onSuccess();
    }
  };

  // Live GPS tracking effect for active order
  useEffect(() => {
    if (!activeUnlockedOrder || activeUnlockedOrder.status === 'delivered' || activeUnlockedOrder.status === 'cancelled') return;

    // Determine target kitchen coordinates
    const targetKitchen = allKitchens.find((k) => k.id === activeUnlockedOrder.acceptedByKitchenId || k.id === activeUnlockedOrder.kitchenId) || {
      lat: 26.1209,
      lng: 85.3647
    };

    const updateGps = async (lat: number, lng: number) => {
      try {
        const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
        await updateDoc(orderRef, {
          riderLat: lat,
          riderLng: lng,
          riderLastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      } catch (e) {
        console.warn("Error updating rider GPS in Firestore:", e);
      }
    };

    // Watch position if Geolocation API available
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.latitude && pos.coords.longitude) {
            setRiderRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            updateGps(pos.coords.latitude, pos.coords.longitude);
          }
        },
        (err) => {
          console.warn("Rider device GPS watch error (location not broadcasting):", err);
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeUnlockedOrder?.id, activeUnlockedOrder?.status, allKitchens]);

  // Sync fleet state with localStorage whenever it updates
  useEffect(() => {
    localStorage.setItem('fitzaika_delivery_fleet', JSON.stringify(fleet));
  }, [fleet]);

  // Handle Delivery Partner Login with Firebase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const emailInput = loginEmail.trim().toLowerCase();
    const passInput = loginPassword.trim();

    if (!emailInput || !passInput) {
      setLoginError('Please enter both Fleet Login Email and Password.');
      setIsLoggingIn(false);
      return;
    }

    const matched = fleet.find((partner) => {
      const matchEmail = partner.email.trim().toLowerCase() === emailInput;
      const matchPhone = partner.phone.replace(/\D/g, '') === emailInput.replace(/\D/g, '');
      const matchPass = partner.password.trim() === passInput;
      return (matchEmail || matchPhone) && matchPass;
    });

    if (matched && matched.status === 'inactive') {
      setLoginError('This delivery partner account is currently suspended/inactive. Contact FitZaika Admin.');
      setIsLoggingIn(false);
      return;
    }

    try {
      // Attempt actual Firebase Auth authentication
      const authUserCred = await signInWithEmailAndPassword(auth, emailInput, passInput);
      console.log("Logged in with Firebase Auth UID:", authUserCred.user.uid);

      const activePartner: DeliveryPartner = matched ? {
        ...matched,
        firebaseAuthSynced: true,
        firebaseUid: authUserCred.user.uid
      } : {
        id: 'DP-' + authUserCred.user.uid.slice(0, 6).toUpperCase(),
        name: authUserCred.user.displayName || emailInput.split('@')[0],
        email: emailInput,
        phone: '+91 9876543210',
        password: passInput,
        vehicleType: 'ev_two_wheeler',
        vehicleNumber: 'FZ-EV-01',
        kitchenId: 'k1',
        kitchenName: 'Central Kitchen Hub',
        status: 'active',
        firebaseAuthSynced: true,
        firebaseUid: authUserCred.user.uid
      };

      setCurrentPartner(activePartner);
      localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(activePartner));
      if (matched) {
        try {
          await setDoc(doc(db, 'delivery_partners', matched.id), activePartner);
        } catch (e) {}
      }
      setLoginError(null);
    } catch (authErr: any) {
      console.warn("Firebase Auth signIn attempt result:", authErr?.message);
      
      if (matched) {
        // If credentials exist in Admin Fleet but user not registered in Firebase Auth yet, auto-register now!
        try {
          const newAuthCred = await createUserWithEmailAndPassword(auth, emailInput, passInput);
          const updatedPartner: DeliveryPartner = {
            ...matched,
            firebaseAuthSynced: true,
            firebaseUid: newAuthCred.user.uid
          };
          try {
            await setDoc(doc(db, 'delivery_partners', matched.id), updatedPartner);
          } catch (e) {}

          setCurrentPartner(updatedPartner);
          localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(updatedPartner));
          setLoginError(null);
        } catch (createErr: any) {
          // Fallback to local fleet session
          setCurrentPartner(matched);
          localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(matched));
          setLoginError(null);
        }
      } else {
        setLoginError('Invalid Fleet Email or Password. Please check credentials or contact Admin.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutPartner = () => {
    setCurrentPartner(null);
    localStorage.removeItem('fitzaika_active_dp_session');
    localStorage.removeItem('fitzaika_active_unlocked_order_id');
    setActiveUnlockedOrder(null);
    setOrderSearchId('');
  };

  // Close / Cancel current order view
  const handleCancelView = () => {
    setActiveUnlockedOrder(null);
    setOrderSearchId('');
    localStorage.removeItem('fitzaika_active_unlocked_order_id');
    setUnlockedError(null);
    setStatusSuccessMsg(null);
  };

  // Lookup Order by ID across ALL system orders regardless of state or kitchen
  const handleSearchOrder = (idToSearch?: string) => {
    const targetId = (idToSearch || orderSearchId).trim().toUpperCase();
    setUnlockedError(null);
    setStatusSuccessMsg(null);

    if (!targetId) {
      setUnlockedError('Please enter a valid Order ID (e.g., 84910485 or FZ-203918)');
      setActiveUnlockedOrder(null);
      localStorage.removeItem('fitzaika_active_unlocked_order_id');
      return;
    }

    const ordersToSearch = effectiveAllOrders;
    const digitsOnlyTarget = targetId.replace(/\D/g, '');

    const found = ordersToSearch.find((o) => {
      if (!o.id) return false;
      const oIdUpper = o.id.toUpperCase();
      const oDigits = oIdUpper.replace(/\D/g, '');
      const oOtp = (o.deliveryOtp || '').toUpperCase();

      // Exact or substring match on Order ID
      if (oIdUpper === targetId || oIdUpper.includes(targetId)) return true;
      // Substring match on numeric digits if at least 3 digits provided
      if (digitsOnlyTarget.length >= 3 && oDigits.includes(digitsOnlyTarget)) return true;
      // OTP match
      if (oOtp && oOtp === targetId) return true;

      return false;
    });

    if (found) {
      setActiveUnlockedOrder(found);
      setOrderSearchId(found.id);
      localStorage.setItem('fitzaika_active_unlocked_order_id', found.id);
      setUnlockedError(null);
    } else {
      setActiveUnlockedOrder(null);
      localStorage.removeItem('fitzaika_active_unlocked_order_id');
      setUnlockedError(`Order ID "${targetId}" not found in system orders.`);
    }
  };

  // Rider accepts delivery for the active unlocked order
  const handleAcceptDeliveryByRider = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;

    // Strict Requirement: Device GPS must be active before accepting an order
    if (!riderGpsActive) {
      setShowGpsPromptModal(true);
      return;
    }

    setIsUpdating(true);
    setStatusSuccessMsg(null);

    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      
      updatedSteps.push({
        title: `Rider ${currentPartner.name} Assigned`,
        description: `Rider ${currentPartner.name} accepted delivery and is coming to collect order from kitchen.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const updatePayload: any = {
        deliveryPartnerId: currentPartner.id,
        deliveryPartnerName: currentPartner.name,
        deliveryPartnerPhone: currentPartner.phone,
        assignedRiderName: currentPartner.name,
        assignedRiderPhone: currentPartner.phone,
        assignedRiderId: currentPartner.id,
        riderEnRoute: true,
        trackingSteps: updatedSteps
      };

      await updateDoc(orderRef, updatePayload).catch((e) => {
        console.warn("Firestore rider acceptance update notice:", e);
      });

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        deliveryPartnerId: currentPartner.id,
        deliveryPartnerName: currentPartner.name,
        deliveryPartnerPhone: currentPartner.phone,
        trackingSteps: updatedSteps
      };

      setActiveUnlockedOrder(updatedOrder);
      setStatusSuccessMsg(`🛵 Delivery Accepted! Kitchen KDS & Customer notified that Rider ${currentPartner.name} is coming to collect.`);

      // Audio notification
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

    } catch (err) {
      console.error("Failed to accept delivery", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Rider arrived at kitchen hub
  const handleArrivedAtKitchen = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setIsUpdating(true);
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      updatedSteps.push({
        title: 'Rider Arrived at Kitchen Hub',
        description: `Rider ${currentPartner.name} arrived at kitchen and is verifying order items.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      await updateDoc(orderRef, {
        kdsPickupStage: 'arrived_kitchen',
        trackingSteps: updatedSteps
      }).catch((e) => console.warn("Update notice:", e));

      const updated: Order = {
        ...activeUnlockedOrder,
        kdsPickupStage: 'arrived_kitchen',
        trackingSteps: updatedSteps
      };
      setActiveUnlockedOrder(updated);
      setStatusSuccessMsg('🍳 Arrived at Kitchen Hub! Verify order items below before picking up.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Rider arrived at customer drop-off location
  const handleArrivedAtCustomer = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setIsUpdating(true);
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      updatedSteps.push({
        title: 'Rider Arrived at Destination',
        description: `Rider ${currentPartner.name} arrived at customer drop-off location. Prompting for delivery OTP.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      await updateDoc(orderRef, {
        riderArrivedAtCustomer: true,
        trackingSteps: updatedSteps
      }).catch((e) => console.warn("Update notice:", e));

      const updated: Order = {
        ...activeUnlockedOrder,
        riderArrivedAtCustomer: true,
        trackingSteps: updatedSteps
      };
      setActiveUnlockedOrder(updated);
      setStatusSuccessMsg('📍 Arrived at Customer Location! Please enter the 4-digit Customer OTP to complete delivery.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Update Order Delivery Status
  const handleUpdateStatus = async (newStatus: Order['status'], stageTitle: string, stageDesc: string) => {
    if (!activeUnlockedOrder) return;
    setIsUpdating(true);
    setStatusSuccessMsg(null);

    try {
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Add tracking step
      updatedSteps.push({
        title: stageTitle,
        description: stageDesc + (deliveryNote ? ` (${deliveryNote})` : ''),
        done: true,
        time: nowTime
      });

      // Update Firestore directly for real-time synchronization
      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const updatePayload: any = {
        status: newStatus,
        kdsStage: newStatus === 'delivered' ? 'delivered' : 'dispatched',
        trackingSteps: updatedSteps,
        deliveryPartnerId: currentPartner?.id,
        deliveryPartnerName: currentPartner?.name,
        deliveryPartnerPhone: currentPartner?.phone,
      };

      if (newStatus === 'delivered') {
        updatePayload.deliveredAt = new Date().toISOString();
        if (deliveryNote) updatePayload.deliveryNotes = deliveryNote;
      }

      await updateDoc(orderRef, updatePayload).catch((e) => {
        console.warn("Firestore order update error, applying fallback", e);
      });

      // Local state update
      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        status: newStatus,
        trackingSteps: updatedSteps,
        deliveryPartnerId: currentPartner?.id,
        deliveryPartnerName: currentPartner?.name,
      };

      setActiveUnlockedOrder(updatedOrder);
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(activeUnlockedOrder.id, newStatus, deliveryNote);
      }

      setStatusSuccessMsg(`Order ${activeUnlockedOrder.id} status updated to: ${newStatus.toUpperCase()}`);
      setDeliveryNote('');

      // Play audio chime if available
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

    } catch (err) {
      console.error("Failed to update order status", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Pick Up from Kitchen (Generates 4-digit OTP for customer)
  const handlePickUpFromKitchen = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setIsUpdating(true);
    setStatusSuccessMsg(null);
    setOtpError(null);

    try {
      const generatedOtp = activeUnlockedOrder.deliveryOtp || Math.floor(1000 + Math.random() * 9000).toString();
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      updatedSteps.push({
        title: 'Picked Up from Kitchen',
        description: `Order collected by rider ${currentPartner.name}. Delivery OTP generated for customer verification.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const updatePayload: any = {
        status: 'out_for_delivery',
        kdsStage: 'dispatched',
        kdsPickupStage: 'picked_up',
        deliveryOtp: generatedOtp,
        trackingSteps: updatedSteps,
        deliveryPartnerId: currentPartner.id,
        deliveryPartnerName: currentPartner.name,
        deliveryPartnerPhone: currentPartner.phone,
      };

      await updateDoc(orderRef, updatePayload).catch((e) => {
        console.warn("Firestore update error on pickup:", e);
      });

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        status: 'out_for_delivery',
        kdsStage: 'dispatched',
        kdsPickupStage: 'picked_up',
        deliveryOtp: generatedOtp,
        trackingSteps: updatedSteps,
        deliveryPartnerId: currentPartner.id,
        deliveryPartnerName: currentPartner.name,
        deliveryPartnerPhone: currentPartner.phone,
      };

      setActiveUnlockedOrder(updatedOrder);
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(activeUnlockedOrder.id, 'out_for_delivery', 'Order picked up from kitchen');
      }

      setStatusSuccessMsg(`🔑 Order Picked Up! Customer Delivery OTP [ ${generatedOtp} ] generated and displayed in customer app.`);
      
      // Play pickup chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

    } catch (err) {
      console.error("Failed to mark order as picked up", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Doorstep Cash Collection
  const handleCollectCashPayment = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setIsCollectingPayment(true);
    setOtpError(null);
    try {
      const amount = activeUnlockedOrder.total;
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      updatedSteps.push({
        title: `Cash Collected: ₹${amount}`,
        description: `₹${amount} physical cash received at customer doorstep by ${currentPartner.name}. Added to Rider Cash-in-Hand.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const orderUpdate: any = {
        paymentStatus: 'collected',
        collectedPaymentMethod: 'cash',
        cashCollectedAmount: amount,
        paymentCollectedAt: nowIso,
        paymentCollectedBy: currentPartner.id,
        paymentCollectedByName: currentPartner.name,
        trackingSteps: updatedSteps
      };

      await updateDoc(orderRef, orderUpdate).catch((e) => {
        console.warn("Firestore cash collection error:", e);
      });

      // Update partner cash in hand and cash collected today
      const newCashInHand = (currentPartner.cashInHand || 0) + amount;
      const newCashCollectedToday = (currentPartner.cashCollectedToday || 0) + amount;

      try {
        const partnerRef = doc(db, 'delivery_partners', currentPartner.id);
        await updateDoc(partnerRef, {
          cashInHand: newCashInHand,
          cashCollectedToday: newCashCollectedToday
        });
      } catch (e) {
        console.warn("Error updating partner cash stats in Firestore:", e);
      }

      const updatedPartner: DeliveryPartner = {
        ...currentPartner,
        cashInHand: newCashInHand,
        cashCollectedToday: newCashCollectedToday
      };
      setCurrentPartner(updatedPartner);
      localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(updatedPartner));

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        paymentStatus: 'collected',
        collectedPaymentMethod: 'cash',
        cashCollectedAmount: amount,
        paymentCollectedAt: nowIso,
        paymentCollectedBy: currentPartner.id,
        paymentCollectedByName: currentPartner.name,
        trackingSteps: updatedSteps
      };
      setActiveUnlockedOrder(updatedOrder);

      // Play audio chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

      setStatusSuccessMsg(`💵 ₹${amount} Cash Collected! Credited to your Account Cash-in-Hand. Please ask customer for their 4-digit Delivery OTP.`);
    } catch (err) {
      console.error("Failed to collect cash:", err);
    } finally {
      setIsCollectingPayment(false);
    }
  };

  // Confirm Direct Customer UPI Transfer
  const handleConfirmUpiPayment = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setIsCollectingPayment(true);
    setOtpError(null);
    try {
      const amount = activeUnlockedOrder.total;
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      updatedSteps.push({
        title: `UPI Payment Verified: ₹${amount}`,
        description: `Direct UPI payment of ₹${amount} confirmed at doorstep by ${currentPartner.name}.`,
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const orderUpdate: any = {
        paymentStatus: 'collected',
        collectedPaymentMethod: 'upi',
        cashCollectedAmount: 0,
        paymentCollectedAt: nowIso,
        paymentCollectedBy: currentPartner.id,
        paymentCollectedByName: currentPartner.name,
        trackingSteps: updatedSteps
      };

      await updateDoc(orderRef, orderUpdate).catch((e) => {
        console.warn("Firestore upi collection error:", e);
      });

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        paymentStatus: 'collected',
        collectedPaymentMethod: 'upi',
        cashCollectedAmount: 0,
        paymentCollectedAt: nowIso,
        paymentCollectedBy: currentPartner.id,
        paymentCollectedByName: currentPartner.name,
        trackingSteps: updatedSteps
      };
      setActiveUnlockedOrder(updatedOrder);

      setStatusSuccessMsg(`📱 ₹${amount} UPI Payment Confirmed! Please ask customer for their 4-digit Delivery OTP.`);
    } catch (err) {
      console.error("Failed to confirm UPI payment:", err);
    } finally {
      setIsCollectingPayment(false);
    }
  };

  // Helper functions for Date Filtering & True Today verification
  const getTodayDisplay = () => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isDateToday = (dateStr?: string | null): boolean => {
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

  const formatDateTimeDisplay = (dateStr?: string | null): string => {
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

  // Two-Step Cash Deposit: Step 1 - Rider requests deposit to kitchen
  const handleRequestCashDepositToKitchen = async () => {
    if (!currentPartner) return;
    const amountToDeposit = parseFloat(depositAmountInput);
    if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }
    if (amountToDeposit > (currentPartner.cashInHand || 0)) {
      alert(`Deposit amount cannot exceed your current Cash in Hand of ₹${currentPartner.cashInHand || 0}.`);
      return;
    }

    setIsDepositingCash(true);
    try {
      const depositId = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
      const newDeposit: CashDepositRequest = {
        id: depositId,
        partnerId: currentPartner.id,
        partnerName: currentPartner.name,
        partnerPhone: currentPartner.phone,
        partnerVehicle: currentPartner.vehicleNumber || '',
        kitchenId: originKitchen.id,
        kitchenName: originKitchen.name,
        amount: amountToDeposit,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        notes: depositNotesInput.trim() || 'Doorstep COD cash handover to kitchen'
      };

      await setDoc(doc(db, 'cash_deposits', depositId), newDeposit);

      setDepositSuccessNotice(
        `⏳ Step 1 Complete: ₹${amountToDeposit} deposit request sent to ${originKitchen.name}. Please hand over physical cash to kitchen cashier for KDS verification.`
      );
      setShowCashDepositModal(false);
      setDepositAmountInput('');
      setDepositNotesInput('');
    } catch (err) {
      console.error("Failed to submit cash deposit request:", err);
      alert("Failed to submit cash deposit request. Please check internet connection.");
    } finally {
      setIsDepositingCash(false);
    }
  };

  // Rider cancels pending deposit request if made in error
  const handleCancelPendingDeposit = async (depositId: string) => {
    if (!window.confirm("Cancel this pending cash deposit request?")) return;
    try {
      await updateDoc(doc(db, 'cash_deposits', depositId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedReason: 'Cancelled by rider before handover'
      });
      setDepositSuccessNotice("Deposit request cancelled.");
    } catch (err) {
      console.error("Failed to cancel deposit request:", err);
    }
  };

  // Handle Verify Customer OTP and Complete Delivery
  const handleVerifyOtpAndDeliver = async () => {
    if (!activeUnlockedOrder || !currentPartner) return;
    setOtpError(null);
    setStatusSuccessMsg(null);

    // Check if payment is pending for unpaid / COD order
    const isOrderUnpaid = Boolean(
      activeUnlockedOrder.paymentStatus !== 'paid' &&
      (
        activeUnlockedOrder.paymentStatus === 'unpaid' ||
        activeUnlockedOrder.paymentMethod?.toLowerCase().includes('cash') ||
        activeUnlockedOrder.paymentMethod?.toLowerCase().includes('cod') ||
        activeUnlockedOrder.paymentMethod?.toLowerCase().includes('pay on delivery')
      )
    );
    const isPaymentCollected = Boolean(
      activeUnlockedOrder.paymentStatus === 'collected' ||
      activeUnlockedOrder.paymentStatus === 'paid' ||
      !isOrderUnpaid
    );

    if (isOrderUnpaid && !isPaymentCollected) {
      setOtpError(`⚠️ Payment of ₹${activeUnlockedOrder.total} is pending! Please collect Cash or UPI payment from the customer before verifying OTP.`);
      return;
    }

    const enteredClean = otpInput.trim();
    const expectedOtp = activeUnlockedOrder.deliveryOtp;

    if (!enteredClean) {
      setOtpError('Please enter the 4-digit Delivery OTP provided by the customer.');
      return;
    }

    if (expectedOtp && enteredClean !== expectedOtp) {
      setOtpError(`❌ Invalid OTP "${enteredClean}"! Please ask the customer to check the 4-digit code in their FitZaika app.`);
      return;
    }

    setIsUpdating(true);

    const isOfflineMode = typeof navigator !== 'undefined' && !navigator.onLine;

    // A. OFFLINE FALLBACK: If device is in basement or low-connectivity zone
    if (isOfflineMode) {
      enqueueOfflineDelivery({
        orderId: activeUnlockedOrder.id,
        partnerId: currentPartner.id,
        partnerName: currentPartner.name,
        otp: enteredClean,
        deliveryNote: deliveryNote || 'Delivered with offline cached OTP verification',
        deliveredAt: new Date().toISOString(),
        cashCollected: isPaymentCollected ? activeUnlockedOrder.total : 0,
        paymentMethod: selectedPaymentMode || 'cash'
      });
      setPendingOfflineCount(getOfflineQueue().length);

      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updatedSteps.push({
        title: 'Delivered (Cached Offline)',
        description: `Verified with OTP ${enteredClean} in low-connectivity zone. Queued to sync automatically once cellular signal returns.`,
        done: true,
        time: nowTime
      });

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        status: 'delivered',
        kdsStage: 'delivered',
        kdsPickupStage: 'delivered',
        deliveredAt: new Date().toISOString(),
        trackingSteps: updatedSteps,
      };

      setActiveUnlockedOrder(updatedOrder);
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(activeUnlockedOrder.id, 'delivered', deliveryNote);
      }

      setStatusSuccessMsg(`📶 Offline Verification Cached! Order ${activeUnlockedOrder.id} confirmed locally. Will auto-sync when cell signal returns.`);
      setOtpInput('');
      setDeliveryNote('');
      setIsUpdating(false);
      return;
    }

    try {
      const updatedSteps = activeUnlockedOrder.trackingSteps ? [...activeUnlockedOrder.trackingSteps] : [];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      updatedSteps.push({
        title: 'Delivered & Verified via OTP',
        description: `Package handed over to customer and verified with OTP ${enteredClean}.` + (deliveryNote ? ` (${deliveryNote})` : ''),
        done: true,
        time: nowTime
      });

      const orderRef = doc(db, 'orders', activeUnlockedOrder.id);
      const updatePayload: any = {
        status: 'delivered',
        kdsStage: 'delivered',
        kdsPickupStage: 'delivered',
        deliveredAt: new Date().toISOString(),
        trackingSteps: updatedSteps,
        deliveryNotes: deliveryNote || 'Delivered with OTP verification',
      };

      try {
        await updateDoc(orderRef, updatePayload);
      } catch (networkErr) {
        console.warn("Network error during delivery sync, falling back to offline queue:", networkErr);
        enqueueOfflineDelivery({
          orderId: activeUnlockedOrder.id,
          partnerId: currentPartner.id,
          partnerName: currentPartner.name,
          otp: enteredClean,
          deliveryNote: deliveryNote || 'Delivered with offline cached OTP verification',
          deliveredAt: new Date().toISOString(),
          cashCollected: isPaymentCollected ? activeUnlockedOrder.total : 0,
          paymentMethod: selectedPaymentMode || 'cash'
        });
        setPendingOfflineCount(getOfflineQueue().length);
      }

      // Update partner deliveries completed count
      try {
        const partnerRef = doc(db, 'delivery_partners', currentPartner.id);
        const newCount = (currentPartner.deliveriesCompleted || 0) + 1;
        await updateDoc(partnerRef, { deliveriesCompleted: newCount, status: 'active', currentOrderId: null });
        setCurrentPartner(prev => prev ? { ...prev, deliveriesCompleted: newCount, currentOrderId: null } : null);
      } catch (e) {}

      const updatedOrder: Order = {
        ...activeUnlockedOrder,
        status: 'delivered',
        kdsStage: 'delivered',
        kdsPickupStage: 'delivered',
        deliveredAt: new Date().toISOString(),
        trackingSteps: updatedSteps,
      };

      setActiveUnlockedOrder(updatedOrder);
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(activeUnlockedOrder.id, 'delivered', deliveryNote);
      }

      setStatusSuccessMsg(`🎉 Order ${activeUnlockedOrder.id} successfully delivered and verified with OTP!`);
      setOtpInput('');
      setDeliveryNote('');

      // Play success chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.25); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}

    } catch (err) {
      console.error("Failed to verify OTP and mark delivered:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Find origin kitchen for active order or default
  const originKitchen = (activeUnlockedOrder && allKitchens.find((k) => k.id === activeUnlockedOrder.acceptedByKitchenId || k.id === activeUnlockedOrder.kitchenId)) ||
    allKitchens[0] || {
      id: 'k1',
      name: 'Central Kitchen Hub',
      address: 'Mithanpura Central Kitchen, Club Road Junction',
      lat: 26.1209,
      lng: 85.3647,
      geofenceRadius: 10
    };

  // Active dispatches across all kitchens (Riders can deliver orders of ANY kitchen regardless of state)
  const kitchenDispatches = allOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  // If no partner session active, display dedicated Rider Fleet Sign In Portal
  if (!currentPartner) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-white flex flex-col justify-center items-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#121820] border border-brand-green/20 rounded-3xl p-8 text-left space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 border border-brand-green/30 text-brand-green flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-white tracking-wide">
                Delivery Partner Portal
              </h2>
              <p className="text-xs text-gray-400">
                FitZaika Central Rider Fleet Authentication
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Fleet ID, Email or Registered Phone
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. rider@fitzaika.in or +91 98765..."
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Fleet Security Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
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
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Rider Fleet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-500 font-mono">End-to-End Encrypted Fleet Link</span>
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

  // LOGGED IN DELIVERY PARTNER CONSOLE
  return (
    <div className="min-h-screen bg-[#0A0E12] text-white flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#12181F]/90 backdrop-blur-md border-b border-brand-green/20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-green/20 border border-brand-green/40 text-brand-green flex items-center justify-center font-black">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">{currentPartner.name}</h2>
                <span className="text-[9px] font-mono bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full font-extrabold border border-brand-green/30">
                  {currentPartner.id}
                </span>
                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold border border-emerald-800/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Auth Verified
                </span>
                {!isOnline ? (
                  <span className="text-[9px] font-mono bg-amber-950/90 text-amber-300 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-600/60 flex items-center gap-1.5 animate-pulse">
                    <WifiOff className="w-3 h-3 text-amber-400" /> Offline Mode (Cached Locally)
                  </span>
                ) : pendingOfflineCount > 0 ? (
                  <button
                    onClick={handleManualSyncOffline}
                    disabled={isSyncingOffline}
                    className="text-[9px] font-mono bg-orange-950 hover:bg-orange-900 text-orange-200 px-2.5 py-0.5 rounded-full font-extrabold border border-orange-600/70 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <CloudOff className="w-3 h-3 text-orange-400" />
                    <span>{pendingOfflineCount} Pending Sync {isSyncingOffline ? '...' : '• Sync Now'}</span>
                  </button>
                ) : (
                  <span className="text-[9px] font-mono bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold border border-emerald-800/40 hidden sm:flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-400" /> Cellular Live
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                <span>Vehicle: <strong className="text-white">{currentPartner.vehicleNumber}</strong></span>
                <span>•</span>
                <span className="text-brand-orange font-bold">Universal Fleet Partner</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const assigned = effectiveAllOrders.filter(
                  (o) =>
                    (o.deliveryPartnerId === currentPartner?.id || (o as any).assignedRiderId === currentPartner?.id) &&
                    o.status !== 'delivered' &&
                    o.status !== 'cancelled'
                );
                if (assigned.length > 0) {
                  setActiveMailboxOrder(assigned[0]);
                  setShowMailboxModal(true);
                }
              }}
              className="relative px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mailbox</span>
              {effectiveAllOrders.filter(
                (o) =>
                  (o.deliveryPartnerId === currentPartner?.id || (o as any).assignedRiderId === currentPartner?.id) &&
                  o.status !== 'delivered' &&
                  o.status !== 'cancelled' &&
                  o.chatMessages?.length &&
                  o.chatMessages[o.chatMessages.length - 1].sender === 'customer'
              ).length > 0 && (
                <span className="bg-amber-500 text-brand-charcoal text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {
                    effectiveAllOrders.filter(
                      (o) =>
                        (o.deliveryPartnerId === currentPartner?.id || (o as any).assignedRiderId === currentPartner?.id) &&
                        o.status !== 'delivered' &&
                        o.status !== 'cancelled' &&
                        o.chatMessages?.length &&
                        o.chatMessages[o.chatMessages.length - 1].sender === 'customer'
                    ).length
                  }
                </span>
              )}
            </button>

            <button
              onClick={handleLogoutPartner}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={onExitGateway}
              className="px-3 py-1.5 rounded-xl bg-brand-green/20 hover:bg-brand-green/30 text-brand-green border border-brand-green/40 text-xs font-bold transition-all cursor-pointer"
            >
              Exit Gateway
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Navigation Tabs: Deliveries vs Account vs Helpdesk */}
      <div className="bg-[#0D131A] border-b border-white/10 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setDpActiveTab('deliveries')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              dpActiveTab === 'deliveries'
                ? 'border-brand-green text-brand-green bg-brand-green/10'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Active Deliveries & Tasks</span>
          </button>

          <button
            onClick={() => setDpActiveTab('account')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              dpActiveTab === 'account'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Account & Cash Dashboard</span>
            {(currentPartner.cashInHand ?? 0) > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-brand-charcoal">
                ₹{currentPartner.cashInHand}
              </span>
            )}
          </button>

          <button
            onClick={() => setDpActiveTab('complaints')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer relative shrink-0 ${
              dpActiveTab === 'complaints'
                ? 'border-brand-orange text-brand-orange bg-brand-orange/10'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Rider Helpdesk & Complaints</span>
            {riderTickets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-orange text-white">
                {riderTickets.length}
              </span>
            )}
            {riderTickets.some(t => t.status === 'resolved' && (t as any).unreadByPartner) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {complaintSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{complaintSuccessMsg}</span>
          </div>
        )}

        {dpActiveTab === 'deliveries' ? (
          <>
            {/* Automated Proximity Dispatch Incoming Ping Alert */}
            {incomingProximityOrder && (
              <div className="bg-gradient-to-r from-emerald-950/90 via-[#0B2518] to-emerald-950/90 border-2 border-brand-green/60 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-green/20 border border-brand-green text-brand-green flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 animate-bounce text-brand-green" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-brand-green text-brand-charcoal px-2.5 py-0.5 rounded-full">
                        ⚡ Nearest Proximity Dispatch
                      </span>
                      <span className="text-xs font-mono font-black text-white">
                        Order #{incomingProximityOrder.id.slice(-6)}
                      </span>
                      <span className="text-[10px] font-mono text-brand-green bg-black/50 px-2 py-0.5 rounded-md border border-brand-green/30">
                        📍 {incomingProximityOrder.dispatchProximityKm || 0.8} km from fulfilling branch
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Fulfilling Kitchen: <strong className="text-white">{incomingProximityOrder.kitchenName || 'Kitchen Branch'}</strong> • Customer Address: {incomingProximityOrder.address}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveUnlockedOrder(incomingProximityOrder);
                    setOrderSearchId(incomingProximityOrder.id);
                    localStorage.setItem('fitzaika_active_unlocked_order_id', incomingProximityOrder.id);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0 shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Accept Dispatch & Open</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Shift Summary Banner */}
            <div className="bg-gradient-to-r from-brand-green/20 via-[#111822] to-[#121A24] border border-brand-green/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                ACTIVE ON SHIFT • ONLINE
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Primary Origin Hub: {originKitchen.name}
            </h3>
            <p className="text-xs text-gray-400">
              {originKitchen.address} (Serving All FitZaika Kitchen Branches)
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div
              onClick={() => setDpActiveTab('account')}
              className="bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl px-4 py-2.5 text-center cursor-pointer transition-all hover:bg-emerald-950/60"
            >
              <span className="text-[9px] font-black text-emerald-300 uppercase block flex items-center justify-center gap-1">
                <Banknote className="w-3 h-3 text-emerald-400" />
                <span>Cash in Hand</span>
              </span>
              <span className="text-lg font-black text-emerald-400">₹{currentPartner.cashInHand ?? 0}</span>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[9px] font-black text-gray-400 uppercase block">Deliveries Today</span>
              <span className="text-lg font-black text-brand-green">{currentPartner.deliveriesCompleted ?? 0}</span>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[9px] font-black text-gray-400 uppercase block">Driver Rating</span>
              {(!currentPartner.rating || currentPartner.deliveriesCompleted === 0) ? (
                <div>
                  <span className="text-sm font-black text-[#8A99AD] block">★ New Rider</span>
                  <span className="text-[7px] text-gray-500 block font-mono">Calculated after 1st order</span>
                </div>
              ) : (
                <span className="text-lg font-black text-brand-orange">★ {currentPartner.rating.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>

        {/* ORDER LOOKUP / ID ENTRY SECTION */}
        <div className="bg-[#121820] border border-brand-green/20 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-brand-orange" />
                <span>Enter Order ID to Access Customer Location</span>
              </h3>
              <p className="text-xs text-gray-400">
                Input the Customer Order ID provided on the bento packaging or dispatch ticket.
              </p>
            </div>
            <span className="text-[10px] font-mono text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
              SECURE LOGISTICS ACCESS
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderSearchId}
                onChange={(e) => setOrderSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                placeholder="Enter Order ID (e.g. FZ-203918)"
                className="w-full bg-[#090D11] border border-brand-green/30 rounded-2xl px-4 py-3.5 text-sm text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-brand-green tracking-wider uppercase font-bold"
              />
              {orderSearchId && (
                <button
                  onClick={() => {
                    setOrderSearchId('');
                    setActiveUnlockedOrder(null);
                    setUnlockedError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => handleSearchOrder()}
              className="px-6 py-3.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Key className="w-4 h-4" />
              <span>Unlock Location & Order</span>
            </button>
          </div>

          {unlockedError && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{unlockedError}</span>
            </div>
          )}

          {/* Quick Dispatch Queue Selector */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
              ⚡ KITCHEN ACTIVE DISPATCH QUEUE ({kitchenDispatches.length} DISPATCHES AVAILABLE)
            </span>

            {kitchenDispatches.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-1">
                No active orders currently pending dispatch at this kitchen.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {kitchenDispatches.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleSearchOrder(order.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      activeUnlockedOrder?.id === order.id
                        ? 'bg-brand-green/20 border-brand-green text-white shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-brand-orange">
                        {order.id}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        order.status === 'out_for_delivery'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-white line-clamp-1 mt-1">
                      {order.items[0]?.meal.name || 'Goal Bowl Meal'}
                    </p>

                    <p className="text-[10px] text-gray-400 truncate mt-1">
                      📍 {order.address}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DELIVERY PARTNER ACTIVE MAILBOX & MESSAGES HUB */}
        {(() => {
          const assignedRiderOrders = effectiveAllOrders.filter(
            (o) =>
              (o.deliveryPartnerId === currentPartner?.id || (o as any).assignedRiderId === currentPartner?.id) &&
              o.status !== 'delivered' &&
              o.status !== 'cancelled'
          );

          return (
            <div className="bg-[#121820] border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center font-bold">
                    📬
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <span>Rider Mailbox & Active Order Messages</span>
                      {assignedRiderOrders.some((o) => o.chatMessages?.length && o.chatMessages[o.chatMessages.length - 1].sender === 'customer') && (
                        <span className="bg-amber-500 text-brand-charcoal text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                          NEW CUSTOMER MESSAGE
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Live chat mailbox for all active delivery orders assigned to you ({currentPartner?.name})
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                  {assignedRiderOrders.length} ASSIGNED TASKS
                </span>
              </div>

              {assignedRiderOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500 space-y-1 bg-[#090D11] rounded-2xl border border-white/5">
                  <Mail className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">Your mailbox is empty.</p>
                  <p className="text-[10px]">No active delivery tasks or customer messages assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedRiderOrders.map((ord) => {
                    const lastMsg = ord.chatMessages && ord.chatMessages.length > 0 ? ord.chatMessages[ord.chatMessages.length - 1] : null;
                    const isNewFromCustomer = lastMsg && lastMsg.sender === 'customer';
                    const isDelivered = ord.status === 'delivered';

                    return (
                      <div
                        key={ord.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isNewFromCustomer
                            ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/5'
                            : activeUnlockedOrder?.id === ord.id
                            ? 'bg-brand-green/10 border-brand-green/50'
                            : 'bg-[#090D11] border-white/10'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-black text-brand-orange">
                              #{ord.id}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isDelivered ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                            {isNewFromCustomer && (
                              <span className="text-[9px] font-black uppercase bg-amber-500 text-brand-charcoal px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Bell className="w-3 h-3" /> New Customer Note
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-white font-semibold flex items-center gap-2">
                            <span>👤 Customer: {ord.customerName || 'Athlete'} ({ord.customerPhone || 'N/A'})</span>
                          </div>

                          <p className="text-[11px] text-gray-400 truncate">
                            📍 {ord.address}
                          </p>

                          {/* Message Preview */}
                          {lastMsg ? (
                            <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs flex items-center justify-between gap-2">
                              <div className="truncate">
                                <span className="text-[10px] font-black uppercase text-amber-400 mr-1.5">
                                  {lastMsg.sender === 'customer' ? '💬 Customer:' : '🛵 You:'}
                                </span>
                                <span className="text-gray-200">{lastMsg.text}</span>
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono shrink-0">{lastMsg.timestamp}</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500 italic mt-1">No messages exchanged yet.</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setActiveMailboxOrder(ord);
                              setShowMailboxModal(true);
                            }}
                            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-brand-charcoal border border-amber-500/40 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat ({ord.chatMessages?.length || 0})</span>
                          </button>

                          <button
                            onClick={() => handleSearchOrder(ord.id)}
                            className="px-3.5 py-2 bg-brand-green/20 hover:bg-brand-green text-brand-green hover:text-brand-charcoal border border-brand-green/40 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>{activeUnlockedOrder?.id === ord.id ? 'Active' : 'Unlock Radar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* UNLOCKED CUSTOMER LOCATION & DELIVERY DASHBOARD */}
        {activeUnlockedOrder && (() => {
          const isAssignedToMe = activeUnlockedOrder.deliveryPartnerId === currentPartner?.id;
          const isDelivered = activeUnlockedOrder.status === 'delivered';
          const isPickedUp = activeUnlockedOrder.kdsPickupStage === 'picked_up' || activeUnlockedOrder.status === 'out_for_delivery' || isDelivered;
          const isArrivedAtKitchen = activeUnlockedOrder.kdsPickupStage === 'arrived_kitchen' || isPickedUp;
          const isArrivedAtCustomer = (activeUnlockedOrder as any).riderArrivedAtCustomer || isDelivered;

          // Check if order is unpaid / COD
          const isOrderUnpaid = Boolean(
            activeUnlockedOrder.paymentStatus !== 'paid' &&
            (
              activeUnlockedOrder.paymentStatus === 'unpaid' ||
              activeUnlockedOrder.paymentMethod?.toLowerCase().includes('cash') ||
              activeUnlockedOrder.paymentMethod?.toLowerCase().includes('cod') ||
              activeUnlockedOrder.paymentMethod?.toLowerCase().includes('pay on delivery')
            )
          );
          const isPaymentCollected = Boolean(
            activeUnlockedOrder.paymentStatus === 'collected' ||
            activeUnlockedOrder.paymentStatus === 'paid' ||
            !isOrderUnpaid
          );

          let stepNum = 1;
          if (!isAssignedToMe) stepNum = 1;
          else if (!isArrivedAtKitchen) stepNum = 2;
          else if (!isPickedUp) stepNum = 3;
          else if (!isArrivedAtCustomer) stepNum = 4;
          else if (isOrderUnpaid && !isPaymentCollected) stepNum = 5;
          else if (!isDelivered) stepNum = isOrderUnpaid ? 6 : 5;
          else stepNum = isOrderUnpaid ? 7 : 6;

          const totalSteps = isOrderUnpaid ? 6 : 5;

          return (
            <div className="bg-[#121820] border-2 border-brand-green/40 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
              {/* Status Success Message */}
              {statusSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{statusSuccessMsg}</span>
                </div>
              )}

              {/* Header Badge & Order ID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-black bg-brand-orange/20 text-brand-orange px-3 py-1 rounded-xl border border-brand-orange/30">
                      ORDER ID: {activeUnlockedOrder.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                      isDelivered
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                        : activeUnlockedOrder.status === 'out_for_delivery'
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                        : 'bg-blue-950/60 text-blue-400 border-blue-800/40'
                    }`}>
                      STATUS: {activeUnlockedOrder.status.replace(/_/g, ' ')}
                    </span>
                    {isOrderUnpaid ? (
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                        isPaymentCollected
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-950/60 text-amber-300 border-amber-500/40 animate-pulse'
                      }`}>
                        {isPaymentCollected
                          ? `✓ PAYMENT COLLECTED (₹${activeUnlockedOrder.total})`
                          : `💵 COD UNPAID: ₹${activeUnlockedOrder.total}`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-blue-950/60 text-blue-300 border border-blue-500/40">
                        ✓ PREPAID ONLINE: ₹{activeUnlockedOrder.total}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Date: {activeUnlockedOrder.date} • Total: ₹{activeUnlockedOrder.total} ({activeUnlockedOrder.paymentMethod})
                  </p>
                </div>

                <button
                  onClick={handleCancelView}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold rounded-xl border border-white/10 self-start sm:self-auto cursor-pointer"
                >
                  Close Task
                </button>
              </div>

              {/* ALWAYS VISIBLE LIVE DELIVERY MAP WITH DIRECTIONS */}
              <InAppDeliveryMap
                orderId={activeUnlockedOrder.id}
                orderStatus={activeUnlockedOrder.status}
                kitchenName={originKitchen.name}
                kitchenAddress={originKitchen.address}
                kitchenLat={originKitchen.lat}
                kitchenLng={originKitchen.lng}
                customerAddress={activeUnlockedOrder.address}
                customerName={activeUnlockedOrder.customerName}
                customerPhone={activeUnlockedOrder.customerPhone}
                riderName={currentPartner?.name}
                riderPhone={currentPartner?.phone}
                riderVehicleNumber={currentPartner?.vehicleNumber || 'BR-06-EV-9921'}
                riderLat={riderRealCoords?.lat || activeUnlockedOrder.riderLat || currentPartner?.lat}
                riderLng={riderRealCoords?.lng || activeUnlockedOrder.riderLng || currentPartner?.lng}
                riderStatus={
                  stepNum <= 2
                    ? 'en_route_kitchen'
                    : stepNum === 3
                    ? 'arrived_kitchen'
                    : stepNum === 4
                    ? 'en_route_customer'
                    : isDelivered
                    ? 'delivered'
                    : 'arrived_customer'
                }
                isRiderView={true}
                chatMessages={activeUnlockedOrder.chatMessages || []}
                onSendMessage={(text) => handleRiderSendMessage(activeUnlockedOrder.id, text)}
                onEnableGps={enableRiderGps}
                gpsActive={riderGpsActive}
              />

              {/* PROGRESSIVE STEP INDICATOR BAR */}
              <div className="bg-[#0B0F14] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-[11px] font-black uppercase mb-3">
                  <span className="text-brand-orange flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RIDER STEP {Math.min(stepNum, totalSteps)} OF {totalSteps}</span>
                  </span>
                  <span className="text-gray-400 font-mono">
                    {stepNum === 1 && 'ORDER MATCH & ACCEPTANCE'}
                    {stepNum === 2 && 'EN ROUTE TO KITCHEN HUB'}
                    {stepNum === 3 && 'VERIFY & COLLECT ORDER'}
                    {stepNum === 4 && 'EN ROUTE TO CUSTOMER'}
                    {isOrderUnpaid ? (
                      <>
                        {stepNum === 5 && `COLLECT PAYMENT (₹${activeUnlockedOrder.total})`}
                        {stepNum === 6 && 'CUSTOMER OTP VERIFICATION'}
                        {stepNum >= 7 && 'DELIVERY COMPLETED'}
                      </>
                    ) : (
                      <>
                        {stepNum === 5 && 'CUSTOMER OTP VERIFICATION'}
                        {stepNum >= 6 && 'DELIVERY COMPLETED'}
                      </>
                    )}
                  </span>
                </div>

                <div className={`grid gap-1.5 ${isOrderUnpaid ? 'grid-cols-6' : 'grid-cols-5'}`}>
                  {(isOrderUnpaid ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]).map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        s < stepNum
                          ? 'bg-emerald-400'
                          : s === stepNum
                          ? 'bg-brand-orange shadow-[0_0_10px_rgba(251,146,60,0.6)] animate-pulse'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: ACCEPT DELIVERY */}
              {stepNum === 1 && (
                <div className="bg-[#18202A] border-2 border-brand-orange/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-xs font-black text-brand-orange uppercase tracking-wider block">
                        STEP 1: NEW DELIVERY OPPORTUNITY
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">
                        Kitchen: {originKitchen.name}
                      </h3>
                    </div>
                    <span className="bg-brand-orange/20 text-brand-orange border border-brand-orange/40 text-[10px] font-black px-3 py-1 rounded-xl uppercase">
                      READY FOR PICKUP
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black text-gray-400 uppercase block">Kitchen Address:</span>
                      <p className="font-bold text-white mt-0.5">{originKitchen.address}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black text-gray-400 uppercase block">Customer Locality:</span>
                      <p className="font-bold text-white mt-0.5">📍 {activeUnlockedOrder.address}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleAcceptDeliveryByRider}
                    disabled={isUpdating}
                    className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-sm uppercase rounded-2xl transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    <span>🛵 ACCEPT THIS DELIVERY TASK</span>
                  </button>
                </div>
              )}

              {/* STEP 2: EN ROUTE TO KITCHEN HUB */}
              {stepNum === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0B0F14] border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        <span>NAVIGATE TO KITCHEN HUB</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {originKitchen.name}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 font-mono">
                      📍 {originKitchen.address}
                    </p>

                    <button
                      onClick={handleArrivedAtKitchen}
                      disabled={isUpdating}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>🏢 I HAVE ARRIVED AT KITCHEN HUB</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: VERIFY & COLLECT ORDER ITEMS */}
              {stepNum === 3 && (
                <div className="bg-[#18202A] border-2 border-brand-green/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4" />
                      <span>STEP 3: VERIFY DISHES BEFORE PICKUP</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full font-black border border-emerald-500/30">
                      AT KITCHEN
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                      CHECKLIST OF DISHES TO COLLECT:
                    </span>
                    {activeUnlockedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-extrabold text-white">{item.quantity}x {item.meal?.name || 'Meal'}</span>
                        </div>
                        <span className="font-mono text-gray-400">₹{item.meal?.price ? item.meal.price * item.quantity : item.quantity * 199}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handlePickUpFromKitchen}
                    disabled={isUpdating}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Bike className="w-5 h-5" />
                    <span>📦 ITEMS VERIFIED & START DELIVERY TO CUSTOMER</span>
                  </button>
                </div>
              )}

              {/* STEP 4: EN ROUTE TO CUSTOMER */}
              {stepNum === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-[#0B0F14] border border-white/10 space-y-2">
                      <span className="text-[10px] font-black uppercase text-brand-green tracking-wider block">
                        RECIPIENT CONTACT
                      </span>
                      <h4 className="text-sm font-extrabold text-white">
                        {activeUnlockedOrder.customerName || 'Customer'}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">
                        {activeUnlockedOrder.customerPhone || '+91 98351 88201'}
                      </p>
                      <a
                        href={`tel:${activeUnlockedOrder.customerPhone || '9835188201'}`}
                        className="w-full py-2 bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/40 text-brand-green font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Customer</span>
                      </a>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0B0F14] border border-white/10 space-y-2">
                      <span className="text-[10px] font-black uppercase text-brand-orange tracking-wider block">
                        DROP-OFF LOCATION
                      </span>
                      <p className="text-xs font-bold text-white leading-relaxed">
                        📍 {activeUnlockedOrder.address}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleArrivedAtCustomer}
                    disabled={isUpdating}
                    className="w-full py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>📍 I HAVE ARRIVED AT CUSTOMER LOCATION</span>
                  </button>
                </div>
              )}

              {/* STEP 5 (FOR UNPAID ORDERS): PAYMENT COLLECTION (CASH / UPI) */}
              {isOrderUnpaid && stepNum === 5 && (
                <div className="bg-[#18202A] border-2 border-emerald-500/60 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote className="w-4 h-4" />
                      <span>STEP 5: COLLECT DOORSTEP PAYMENT</span>
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full font-black border border-amber-500/30 animate-pulse">
                      PAYMENT PENDING: ₹{activeUnlockedOrder.total}
                    </span>
                  </div>

                  {/* Payment Amount Display Card */}
                  <div className="bg-black/50 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                        TOTAL AMOUNT TO COLLECT:
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-black text-emerald-400 font-mono">₹{activeUnlockedOrder.total}</span>
                        <span className="text-xs text-gray-400 font-medium">({activeUnlockedOrder.items?.length || 1} meal item{(activeUnlockedOrder.items?.length || 1) > 1 ? 's' : ''})</span>
                      </div>
                    </div>
                    <div className="sm:text-right text-xs">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Selected Method:</span>
                      <span className="font-extrabold text-white">{activeUnlockedOrder.paymentMethod || 'Cash on Delivery'}</span>
                    </div>
                  </div>

                  {/* Payment Mode Selection Tabs */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                      SELECT HOW THE CUSTOMER IS PAYING NOW:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('cash')}
                        className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          selectedPaymentMode === 'cash'
                            ? 'bg-emerald-500 text-brand-charcoal border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-[#0B0F14] text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>💵 Cash Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('upi')}
                        className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          selectedPaymentMode === 'upi'
                            ? 'bg-cyan-500 text-brand-charcoal border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                            : 'bg-[#0B0F14] text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>📱 UPI / QR Code</span>
                      </button>
                    </div>
                  </div>

                  {/* CASH PAYMENT VIEW */}
                  {selectedPaymentMode === 'cash' && (
                    <div className="bg-[#0B0F14] border border-emerald-500/30 rounded-2xl p-4 space-y-4 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                          <Banknote className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-white">
                            Collect Physical Cash: <span className="text-emerald-400 font-mono">₹{activeUnlockedOrder.total}</span>
                          </h4>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Count and collect ₹{activeUnlockedOrder.total} from the customer. After receiving cash, click <strong className="text-emerald-300">Payment Done</strong>.
                          </p>
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                            <Wallet className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>This collection will immediately update your <strong>Account Cash-in-Hand</strong> balance.</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCollectCashPayment}
                        disabled={isCollectingPayment}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isCollectingPayment ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>💵 PAYMENT DONE — CONFIRM ₹{activeUnlockedOrder.total} CASH COLLECTED</span>
                      </button>
                    </div>
                  )}

                  {/* UPI PAYMENT VIEW */}
                  {selectedPaymentMode === 'upi' && (
                    <div className="bg-[#0B0F14] border border-cyan-500/30 rounded-2xl p-5 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-cyan-400" />
                          <span className="text-xs font-black text-white uppercase tracking-wider">
                            Dynamic UPI Gateway QR Code
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                          Amount: ₹{activeUnlockedOrder.total}
                        </span>
                      </div>

                      {/* Dynamic QR Mockup & Under Progress Notice */}
                      <div className="bg-gradient-to-b from-[#141E28] to-[#0A1016] border-2 border-dashed border-cyan-500/40 rounded-2xl p-6 text-center space-y-4">
                        <div className="relative w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-2xl flex flex-col items-center justify-center">
                          <div className="w-full h-full border-4 border-slate-900 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden bg-slate-50">
                            <QrCode className="w-24 h-24 text-slate-800 opacity-90" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse pointer-events-none" />
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[8px] font-black tracking-widest text-slate-700 uppercase font-mono">
                                UPI • FITZAIKA QR
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Under Progress Banner */}
                        <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-left space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>Payment Gateway Integration Under Progress</span>
                          </div>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">
                            Dynamic QR code generation via payment gateway is currently under integration. We are connecting our gateway partner. Until live, you can switch to cash collection or confirm direct customer UPI transfer below.
                          </p>
                        </div>

                        {/* Supported UPI Badges */}
                        <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-gray-400 font-mono flex-wrap">
                          <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">Google Pay</span>
                          <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">PhonePe</span>
                          <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">Paytm</span>
                          <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">BHIM UPI</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentMode('cash')}
                          className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Switch to Cash Collection</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmUpiPayment}
                          disabled={isCollectingPayment}
                          className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isCollectingPayment ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Direct UPI Received (Confirm)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP: OTP VERIFICATION & HANDOVER */}
              {((isOrderUnpaid && stepNum === 6) || (!isOrderUnpaid && stepNum === 5)) && (
                <div className="bg-[#18202A] border-2 border-amber-500/60 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>STEP {isOrderUnpaid ? 6 : 5}: CUSTOMER OTP VERIFICATION</span>
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full font-black border border-amber-500/30 animate-pulse">
                      OTP REQUIRED
                    </span>
                  </div>

                  {/* Payment Status Summary Pill */}
                  {isOrderUnpaid ? (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Payment Status: Collected (₹{activeUnlockedOrder.total} via {activeUnlockedOrder.collectedPaymentMethod === 'cash' ? 'Cash' : 'UPI'})</span>
                      </div>
                      {activeUnlockedOrder.collectedPaymentMethod === 'cash' && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          Cash-in-Hand: ₹{currentPartner.cashInHand ?? 0}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Payment Status: Prepaid Online ({activeUnlockedOrder.paymentMethod})</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Ask the customer for their 4-digit Delivery OTP shown in their FitZaika app to confirm handover:
                  </p>

                  <div className="space-y-3">
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/\D/g, ''));
                        setOtpError(null);
                      }}
                      placeholder="ENTER 4-DIGIT OTP"
                      className="w-full bg-[#0B0F14] border-2 border-amber-500/60 rounded-2xl px-4 py-3.5 text-center text-xl font-black font-mono tracking-widest text-white focus:outline-none focus:border-amber-400"
                    />

                    {otpError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    <button
                      onClick={handleVerifyOtpAndDeliver}
                      disabled={isUpdating || otpInput.length < 4}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>VERIFY OTP & COMPLETE DELIVERY</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP COMPLETED */}
              {((isOrderUnpaid && stepNum === 7) || (!isOrderUnpaid && stepNum === 6)) && (
                <div className="bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white uppercase">DELIVERY COMPLETED & VERIFIED!</h3>
                    <p className="text-xs text-emerald-300 font-mono mt-1">
                      OTP Verified • Order {activeUnlockedOrder.id} successfully delivered.
                    </p>
                    {isOrderUnpaid && activeUnlockedOrder.collectedPaymentMethod === 'cash' && (
                      <p className="text-xs text-emerald-400/90 font-mono mt-2 bg-black/40 border border-emerald-500/30 rounded-xl py-2 px-3 inline-block">
                        💵 ₹{activeUnlockedOrder.total} Cash Collected & recorded in your Account Dashboard (Cash in Hand: ₹{currentPartner.cashInHand ?? 0}).
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleCancelView}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Find Next Order Task
                    </button>
                    <button
                      onClick={() => {
                        handleCancelView();
                        setDpActiveTab('account');
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Account Cash</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
          </>
        ) : dpActiveTab === 'account' ? (
          /* RIDER ACCOUNT & CASH DASHBOARD */
          <div className="space-y-6 animate-fade-in">
            {/* Header & Quick Actions */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#141E24] to-[#10161E] border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    Rider Financial Ledger
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/15">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Today: {getTodayDisplay()}</span>
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Account Balance & Cash Dashboard
                </h2>
                <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                  Manage doorstep cash collections from COD orders, track your real-time Cash in Hand, and deposit cash collections to the {originKitchen.name} hub cashier with two-step KDS verification.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setDepositAmountInput(String(currentPartner.cashInHand || 0));
                    setShowCashDepositModal(true);
                  }}
                  disabled={(currentPartner.cashInHand ?? 0) <= 0}
                  className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Deposit Cash to Kitchen</span>
                </button>
              </div>
            </div>

            {/* Deposit Success Alert if any */}
            {depositSuccessNotice && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{depositSuccessNotice}</span>
                </div>
                <button
                  onClick={() => setDepositSuccessNotice(null)}
                  className="text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pending Two-Step Approval Notice if rider has pending deposits */}
            {(() => {
              const pendingDeposits = cashDeposits.filter(d => d.status === 'pending');
              if (pendingDeposits.length === 0) return null;
              return (
                <div className="space-y-3">
                  {pendingDeposits.map((dep) => (
                    <div key={dep.id} className="p-5 rounded-2xl bg-amber-950/40 border-2 border-amber-500/60 text-amber-200 text-xs font-medium space-y-3 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Clock className="w-4 h-4 animate-spin" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                              STEP 2 AWAITING APPROVAL • {dep.id}
                            </span>
                            <div className="text-sm font-black text-white">
                              ₹{dep.amount} Handover requested for {dep.kitchenName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            ⏳ Kitchen Cashier Must Confirm
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelPendingDeposit(dep.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-amber-200/90 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                        Please physically count and hand over the <strong>₹{dep.amount}</strong> cash notes to the <strong>{dep.kitchenName} Cashier Desk</strong>. The kitchen staff will verify the cash and click <strong>"Approve Cash Received"</strong> on their KDS terminal to complete your deposit.
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Scope Filter Controls: Today vs View All / History */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121820] p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                  Time Period:
                </span>
                <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAccountDateFilter('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      accountDateFilter === 'today'
                        ? 'bg-emerald-500 text-brand-charcoal shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Today ({getTodayDisplay()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountDateFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      accountDateFilter === 'all'
                        ? 'bg-emerald-500 text-brand-charcoal shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View All & History with Dates</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="Filter by Order ID, customer..."
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 w-full sm:w-56"
                />
              </div>
            </div>

            {/* KPI Cards Grid */}
            {(() => {
              // Calculate figures based on filter
              const partnerOrders = allOrders.filter(o => o.deliveryPartnerId === currentPartner.id);

              const completedTrips = partnerOrders.filter(o => {
                if (o.status !== 'delivered') return false;
                if (accountDateFilter === 'today') {
                  return isDateToday(o.date) || isDateToday((o as any).deliveredAt);
                }
                return true;
              });

              const cashCollectedOrders = partnerOrders.filter(o => {
                const isCollected = (o as any).collectedPaymentMethod === 'cash' || o.paymentStatus === 'collected' || (o as any).cashCollectedAmount > 0;
                if (!isCollected) return false;
                if (accountDateFilter === 'today') {
                  return isDateToday((o as any).paymentCollectedAt || o.date);
                }
                return true;
              });

              const calculatedCashCollected = cashCollectedOrders.reduce((sum, o) => {
                const amt = (o as any).cashCollectedAmount || o.total || 0;
                return sum + amt;
              }, 0);

              const pendingDepositSum = cashDeposits
                .filter(d => d.status === 'pending')
                .reduce((sum, d) => sum + d.amount, 0);

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Cash in Hand (Physical currency with rider) */}
                  <div className="bg-[#121820] border-2 border-emerald-500/40 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        CURRENT CASH IN HAND
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-white font-mono">
                        ₹{currentPartner.cashInHand ?? 0}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {(currentPartner.cashInHand ?? 0) > 0
                          ? '⚠️ Must deposit to Kitchen Hub Cashier before ending shift.'
                          : '✓ All cash collections settled with Kitchen Cashier.'}
                      </p>
                      {pendingDepositSum > 0 && (
                        <div className="mt-2 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          ⏳ ₹{pendingDepositSum} pending cashier verification
                        </div>
                      )}
                    </div>
                    {(currentPartner.cashInHand ?? 0) > 0 && (
                      <button
                        onClick={() => {
                          setDepositAmountInput(String(currentPartner.cashInHand || 0));
                          setShowCashDepositModal(true);
                        }}
                        className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-brand-charcoal border border-emerald-500/40 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Initiate Cash Deposit (Step 1)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Card 2: Cash Collected */}
                  <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        {accountDateFilter === 'today' ? `CASH COLLECTED TODAY` : 'TOTAL CASH COLLECTED (ALL-TIME)'}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                        <Banknote className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-emerald-400 font-mono">
                        ₹{accountDateFilter === 'today' ? (calculatedCashCollected || currentPartner.cashCollectedToday || 0) : calculatedCashCollected}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {accountDateFilter === 'today'
                          ? `Doorstep COD cash collections logged for today (${getTodayDisplay()}).`
                          : 'Cumulative physical cash collected across all historic delivery records.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Deliveries Completed (NO PAYOUT/INCENTIVE MENTIONS) */}
                  <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        {accountDateFilter === 'today' ? 'DELIVERIES COMPLETED TODAY' : 'TOTAL DELIVERIES COMPLETED'}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-brand-orange font-mono">
                        {accountDateFilter === 'today' ? completedTrips.length : (currentPartner.deliveriesCompleted ?? completedTrips.length)} <span className="text-sm font-sans text-gray-400">orders</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {accountDateFilter === 'today'
                          ? `Orders delivered & verified today (${getTodayDisplay()}).`
                          : 'Total successful customer doorstep deliveries logged.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Multi-Tab History Section with Dates */}
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
              {/* Sub-tabs header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountHistorySubTab('collections')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                      accountHistorySubTab === 'collections'
                        ? 'bg-emerald-500 text-brand-charcoal shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Doorstep Cash Collections</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountHistorySubTab('deliveries')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                      accountHistorySubTab === 'deliveries'
                        ? 'bg-emerald-500 text-brand-charcoal shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Completed Deliveries History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountHistorySubTab('deposits')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                      accountHistorySubTab === 'deposits'
                        ? 'bg-emerald-500 text-brand-charcoal shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Kitchen Deposit Requests ({cashDeposits.length})</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 font-mono">
                  Showing: <strong className="text-white">{accountDateFilter === 'today' ? `Today (${getTodayDisplay()})` : 'All Dates & History'}</strong>
                </div>
              </div>

              {/* TAB 1: DOORSTEP CASH COLLECTIONS */}
              {accountHistorySubTab === 'collections' && (() => {
                const query = accountSearchQuery.toLowerCase().trim();
                const collectedOrders = allOrders.filter((o) => {
                  if (o.deliveryPartnerId !== currentPartner.id) return false;
                  const isCollected = (o as any).collectedPaymentMethod === 'cash' || o.paymentStatus === 'collected' || (o as any).cashCollectedAmount > 0;
                  if (!isCollected) return false;

                  if (accountDateFilter === 'today') {
                    if (!isDateToday((o as any).paymentCollectedAt || o.date)) return false;
                  }

                  if (query) {
                    const matchId = o.id.toLowerCase().includes(query);
                    const matchCust = o.customerName.toLowerCase().includes(query);
                    const matchPhone = o.customerPhone.includes(query);
                    if (!matchId && !matchCust && !matchPhone) return false;
                  }
                  return true;
                });

                if (collectedOrders.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-300">
                        No cash collection records {accountDateFilter === 'today' ? 'for today' : 'found'}
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Doorstep cash collected from COD deliveries will be recorded here with complete date and timestamp.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Customer & Contact</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Collection Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {collectedOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-mono font-bold text-brand-orange">
                              #{ord.id}
                            </td>
                            <td className="py-3 text-white font-medium">
                              <div>{ord.customerName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{ord.customerPhone}</div>
                            </td>
                            <td className="py-3">
                              {(ord as any).collectedPaymentMethod === 'cash' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                                  💵 Cash
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-[10px]">
                                  📱 Direct UPI
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-mono font-black text-emerald-400 text-sm">
                              ₹{ord.total}
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center gap-1 text-emerald-300 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{(ord as any).collectedPaymentMethod === 'cash' ? 'Safe in Hand' : 'Verified'}</span>
                              </span>
                            </td>
                            <td className="py-3 text-right text-gray-300 font-mono text-[11px]">
                              {formatDateTimeDisplay((ord as any).paymentCollectedAt || ord.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* TAB 2: COMPLETED DELIVERIES HISTORY */}
              {accountHistorySubTab === 'deliveries' && (() => {
                const query = accountSearchQuery.toLowerCase().trim();
                const completedDeliveries = allOrders.filter((o) => {
                  if (o.deliveryPartnerId !== currentPartner.id) return false;
                  if (o.status !== 'delivered') return false;

                  if (accountDateFilter === 'today') {
                    if (!isDateToday((o as any).deliveredAt || o.date)) return false;
                  }

                  if (query) {
                    const matchId = o.id.toLowerCase().includes(query);
                    const matchCust = o.customerName.toLowerCase().includes(query);
                    const matchPhone = o.customerPhone.includes(query);
                    if (!matchId && !matchCust && !matchPhone) return false;
                  }
                  return true;
                });

                if (completedDeliveries.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                        <PackageCheck className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-300">
                        No completed delivery records {accountDateFilter === 'today' ? 'for today' : 'found'}
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Successful customer OTP verified deliveries will appear here with full date and route information.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Items</th>
                          <th className="pb-3">Order Value</th>
                          <th className="pb-3">Verification</th>
                          <th className="pb-3 text-right">Delivered Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {completedDeliveries.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-mono font-bold text-brand-orange">
                              #{ord.id}
                            </td>
                            <td className="py-3 text-white font-medium">
                              <div>{ord.customerName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{ord.address || ord.customerPhone}</div>
                            </td>
                            <td className="py-3 text-gray-300 font-medium">
                              {ord.items?.length || 1} meal(s)
                            </td>
                            <td className="py-3 font-mono font-black text-white text-sm">
                              ₹{ord.total}
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>OTP Verified</span>
                              </span>
                            </td>
                            <td className="py-3 text-right text-gray-300 font-mono text-[11px]">
                              {formatDateTimeDisplay((ord as any).deliveredAt || ord.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* TAB 3: KITCHEN DEPOSIT REQUESTS LEDGER */}
              {accountHistorySubTab === 'deposits' && (() => {
                const query = accountSearchQuery.toLowerCase().trim();
                const filteredDeposits = cashDeposits.filter((dep) => {
                  if (accountDateFilter === 'today') {
                    if (!isDateToday(dep.requestedAt)) return false;
                  }
                  if (query) {
                    const matchId = dep.id.toLowerCase().includes(query);
                    const matchKit = dep.kitchenName.toLowerCase().includes(query);
                    if (!matchId && !matchKit) return false;
                  }
                  return true;
                });

                if (filteredDeposits.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-300">
                        No cash handover deposit records {accountDateFilter === 'today' ? 'for today' : 'found'}
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        When you deposit cash to the kitchen hub cashier, deposit logs and their 2-step verification status will be recorded here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                          <th className="pb-3">Deposit Ref</th>
                          <th className="pb-3">Kitchen Destination</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">2-Step Status</th>
                          <th className="pb-3">Approved By</th>
                          <th className="pb-3 text-right">Requested Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredDeposits.map((dep) => (
                          <tr key={dep.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-mono font-bold text-brand-orange">
                              #{dep.id}
                            </td>
                            <td className="py-3 text-white font-medium">
                              <div>{dep.kitchenName}</div>
                              {dep.notes && (
                                <div className="text-[10px] text-gray-400 italic font-sans">{dep.notes}</div>
                              )}
                            </td>
                            <td className="py-3 font-mono font-black text-emerald-400 text-sm">
                              ₹{dep.amount}
                            </td>
                            <td className="py-3">
                              {dep.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Kitchen Approval</span>
                                </span>
                              ) : dep.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Cash Collected & Approved</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Rejected / Cancelled</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-gray-300 font-mono text-[11px]">
                              {dep.status === 'approved'
                                ? (dep.approvedByName || dep.approvedBy || 'Kitchen Cashier')
                                : dep.status === 'rejected'
                                ? (dep.rejectedReason || 'Cancelled')
                                : 'Awaiting cashier check'}
                            </td>
                            <td className="py-3 text-right text-gray-300 font-mono text-[11px]">
                              {formatDateTimeDisplay(dep.requestedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          /* RIDER COMPLAINTS & HELPDESK WORKSPACE */
          <div className="space-y-6">
            {/* Header & Quick Action */}
            <div className="bg-gradient-to-r from-orange-950/40 via-[#141A22] to-[#10161E] border border-brand-orange/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-orange/20 text-brand-orange border border-brand-orange/40 uppercase">
                    Rider Dedicated Support Desk
                  </span>
                  <span className="text-xs text-gray-400 font-mono">24/7 Fast Track Resolution</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Delivery Partner Complaints & Dispute Center
                </h2>
                <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                  Encountering issues on the road? Lodge a complaint regarding restaurant delays, unreachable customers, wrong delivery addresses, vehicle breakdowns, or payout discrepancies. Our specialized Delivery Support agents resolve issues within minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowNewComplaintModal(true)}
                  className="px-5 py-3.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lodge New Issue / Complaint</span>
                </button>
              </div>
            </div>

            {/* Quick Emergency Banner */}
            <div className="bg-[#121820] border border-red-500/30 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">
                    Emergency on Route? (Accident / Aggression / Breakdown)
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    For urgent on-road safety or vehicle emergencies, call our Central Logistics Control Hotline immediately.
                  </p>
                </div>
              </div>
              <a
                href="tel:18002008899"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl transition-all flex items-center gap-2 shrink-0 self-end sm:self-auto"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Hotline (1800-200-8899)</span>
              </a>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#121820] border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Total Filed</span>
                <span className="text-2xl font-black text-white mt-1 block">{riderTickets.length}</span>
              </div>
              <div className="bg-[#121820] border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Pending Review</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">
                  {riderTickets.filter(t => t.status === 'pending').length}
                </span>
              </div>
              <div className="bg-[#121820] border border-blue-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">In Investigation</span>
                <span className="text-2xl font-black text-blue-400 mt-1 block">
                  {riderTickets.filter(t => t.status === 'under_review').length}
                </span>
              </div>
              <div className="bg-[#121820] border border-emerald-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Resolved</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {riderTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
              {(['all', 'pending', 'under_review', 'resolved'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setTicketFilterStatus(tabKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider ${
                    ticketFilterStatus === tabKey
                      ? 'bg-brand-orange text-white font-black shadow-md'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tabKey === 'all' ? 'All Tickets' : tabKey.replace('_', ' ')}
                  <span className="ml-1.5 opacity-80 text-[10px]">
                    (
                    {tabKey === 'all'
                      ? riderTickets.length
                      : riderTickets.filter(t => t.status === tabKey).length}
                    )
                  </span>
                </button>
              ))}
            </div>

            {/* Ticket List */}
            <div className="space-y-3">
              {riderTickets.filter(t => ticketFilterStatus === 'all' || t.status === ticketFilterStatus).length === 0 ? (
                <div className="bg-[#121820] border border-white/10 rounded-3xl p-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                    <LifeBuoy className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    No Support Tickets Found
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {ticketFilterStatus === 'all'
                      ? "You haven't submitted any complaints yet. All deliveries running smoothly!"
                      : `No complaints currently in '${ticketFilterStatus}' status.`}
                  </p>
                  <button
                    onClick={() => setShowNewComplaintModal(true)}
                    className="px-4 py-2 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/40 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lodge New Issue</span>
                  </button>
                </div>
              ) : (
                riderTickets
                  .filter(t => ticketFilterStatus === 'all' || t.status === ticketFilterStatus)
                  .map(ticket => {
                    const isExpanded = expandedTicketId === ticket.id;
                    const getCategoryLabel = (cat: string) => {
                      switch (cat) {
                        case 'customer_unreachable': return '📞 Customer Unreachable / Phone Off';
                        case 'wrong_address': return '📍 Wrong Delivery Address / Landmark';
                        case 'restaurant_delay': return '⏳ Kitchen Preparation Delay (>15 min)';
                        case 'payment_dispute': return '💸 Cash / COD Payment Discrepancy';
                        case 'vehicle_breakdown': return '🛵 Vehicle Breakdown / Puncture';
                        case 'harassment': return '⚠️ Customer / Guard Harassment';
                        case 'safety_emergency': return '🚨 Safety / Accident Emergency';
                        case 'app_technical_issue': return '📱 App GPS / Telemetry Bug';
                        case 'incentive_payout': return '💰 Missing Incentive / Surge Pay';
                        default: return '📋 General Delivery Support';
                      }
                    };

                    const getStatusBadge = (status: string) => {
                      switch (status) {
                        case 'pending':
                          return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">Pending Support Assignment</span>;
                        case 'under_review':
                          return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse">Under Investigation</span>;
                        case 'resolved':
                          return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Resolved</span>;
                        case 'closed':
                          return <span className="bg-gray-500/20 text-gray-400 border border-gray-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">Closed</span>;
                        default:
                          return null;
                      }
                    };

                    const getPriorityBadge = (p: string) => {
                      switch (p) {
                        case 'urgent':
                          return <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded">URGENT</span>;
                        case 'high':
                          return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded">HIGH</span>;
                        case 'medium':
                          return <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded">MEDIUM</span>;
                        default:
                          return <span className="bg-gray-500/20 text-gray-300 border border-gray-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded">LOW</span>;
                      }
                    };

                    return (
                      <div
                        key={ticket.id}
                        className={`bg-[#121820] border rounded-2xl p-4 transition-all ${
                          ticket.status === 'resolved'
                            ? 'border-emerald-500/40 bg-emerald-950/10'
                            : ticket.priority === 'urgent'
                            ? 'border-red-500/40 bg-red-950/10'
                            : 'border-white/10 hover:border-brand-orange/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-white">
                              #{ticket.id}
                            </span>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                            {ticket.orderId && (
                              <span className="text-[10px] font-mono bg-white/10 text-gray-300 px-2 py-0.5 rounded-md font-bold">
                                Order: {ticket.orderId}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(ticket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-brand-orange">
                              {getCategoryLabel(ticket.category || (ticket as any).deliveryCategory)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            {ticket.subject}
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {ticket.message}
                          </p>

                          {ticket.imageUrl && (
                            <div className="pt-1">
                              <a
                                href={ticket.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-brand-orange underline flex items-center gap-1"
                              >
                                <span>View Attached Proof / Image</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {/* Admin / Support Agent Resolution Reply */}
                          {ticket.adminReply && (
                            <div className="mt-3 p-3.5 rounded-xl bg-[#0B1015] border border-emerald-500/40 space-y-1.5 animate-in fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  Official Support Desk Resolution
                                </span>
                                {ticket.adminName && (
                                  <span className="text-[10px] font-mono text-gray-400">
                                    Agent: <strong className="text-white">{ticket.adminName}</strong>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-emerald-200 font-medium leading-relaxed">
                                {ticket.adminReply}
                              </p>
                              {ticket.adminRepliedAt && (
                                <span className="text-[9px] text-gray-500 font-mono block text-right">
                                  Resolved on {new Date(ticket.adminRepliedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

      </main>

      {/* LODGE NEW RIDER COMPLAINT MODAL */}
      {showNewComplaintModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121820] border-2 border-brand-orange/60 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8 text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange text-brand-orange flex items-center justify-center font-bold">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Lodge Rider Issue / Complaint
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    Directly Dispatched to Delivery Support Agents
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewComplaintModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRiderComplaint} className="space-y-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Select Issue Category *
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value as any)}
                  className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-orange"
                >
                  <option value="restaurant_delay">⏳ Kitchen Preparation Delay (&gt;15 min)</option>
                  <option value="customer_unreachable">📞 Customer Unreachable / Phone Switched Off</option>
                  <option value="wrong_address">📍 Incorrect / Inaccessible Drop Location</option>
                  <option value="payment_dispute">💸 Cash / COD Payment Collection Issue</option>
                  <option value="vehicle_breakdown">🛵 Vehicle Breakdown / Puncture Emergency</option>
                  <option value="safety_emergency">🚨 Safety / Accident / Medical Emergency</option>
                  <option value="harassment">⚠️ Customer / Security Misbehavior or Harassment</option>
                  <option value="app_technical_issue">📱 App Bug / GPS Tracking Issue</option>
                  <option value="incentive_payout">💰 Missing Surge / Payout / Distance Pay</option>
                  <option value="general_delivery">📋 Other Logistics Assistance</option>
                </select>
              </div>

              {/* Priority & Order ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">
                    Priority Level *
                  </label>
                  <select
                    value={complaintPriority}
                    onChange={(e) => setComplaintPriority(e.target.value as any)}
                    className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-orange"
                  >
                    <option value="urgent">🔴 URGENT (Breakdown / Safety)</option>
                    <option value="high">🟠 HIGH (Wrong Address / Cash)</option>
                    <option value="medium">🟡 MEDIUM (Delay / App Issue)</option>
                    <option value="low">⚪ LOW (General Inquiry)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 block">
                      Select Active Order (Optional)
                    </label>
                    {complaintOrderId && (
                      <button
                        type="button"
                        onClick={() => setComplaintOrderId('')}
                        className="text-[10px] text-gray-400 hover:text-amber-400 underline cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  {(() => {
                    // Collect all partner orders (active and assigned)
                    const partnerAssignedOrders = effectiveAllOrders.filter(
                      (o) =>
                        (o.deliveryPartnerId === currentPartner?.id || (o as any).assignedRiderId === currentPartner?.id) &&
                        o.status !== 'delivered' &&
                        o.status !== 'cancelled'
                    );

                    // If activeUnlockedOrder is unlocked, ensure it's available
                    const selectableOrders = [...partnerAssignedOrders];
                    if (activeUnlockedOrder && !selectableOrders.some(o => o.id === activeUnlockedOrder.id)) {
                      selectableOrders.unshift(activeUnlockedOrder);
                    }

                    return (
                      <div className="space-y-1.5">
                        <select
                          value={complaintOrderId}
                          onChange={(e) => setComplaintOrderId(e.target.value)}
                          className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-orange font-mono font-bold"
                        >
                          <option value="">-- No Specific Order / General Issue --</option>
                          {selectableOrders.map((ord) => (
                            <option key={ord.id} value={ord.id}>
                              📦 Order #{ord.id} • ₹{ord.total || ord.subtotal} • {ord.status.toUpperCase()} ({ord.userName || ord.userEmail || 'Customer'})
                            </option>
                          ))}
                        </select>

                        {/* Quick Active Order Chips */}
                        {selectableOrders.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Quick Select:</span>
                            {selectableOrders.slice(0, 3).map((ord) => (
                              <button
                                key={`quick-${ord.id}`}
                                type="button"
                                onClick={() => setComplaintOrderId(ord.id)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono font-bold transition-all cursor-pointer ${
                                  complaintOrderId === ord.id
                                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange shadow-sm'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                                }`}
                              >
                                #{ord.id} ({ord.status})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  Quick Fill Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Kitchen Delay >20m', cat: 'restaurant_delay', sub: 'Kitchen is delaying order preparation', msg: 'I have arrived at the kitchen hub and have been waiting for over 20 minutes. Order is not packed yet.', pri: 'medium' },
                    { label: 'Customer Not Picking Up', cat: 'customer_unreachable', sub: 'Customer not answering phone at drop location', msg: 'Reached customer delivery address. Tried calling 4 times, phone ringing/busy. Waiting at gate.', pri: 'high' },
                    { label: 'Wrong GPS Pin', cat: 'wrong_address', sub: 'Customer GPS location is 3km away from actual address', msg: 'The address shown on map points to a different area. Customer is requesting drop at a distant landmark.', pri: 'high' },
                    { label: 'Bike Puncture / Breakdown', cat: 'vehicle_breakdown', sub: 'Urgent: Bike puncture en-route to delivery', msg: 'Encountered vehicle tire puncture while delivering order. Need re-assignment or backup rider.', pri: 'urgent' },
                    { label: 'COD Cash Discrepancy', cat: 'payment_dispute', sub: 'Customer refusing to pay full COD amount', msg: 'Customer claims discount was applied and is refusing to pay the required Cash on Delivery total.', pri: 'high' },
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setComplaintCategory(tpl.cat as any);
                        setComplaintSubject(tpl.sub);
                        setComplaintMessage(tpl.msg);
                        setComplaintPriority(tpl.pri as any);
                      }}
                      className="text-[10px] font-bold bg-white/5 hover:bg-brand-orange hover:text-white border border-white/10 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  placeholder="e.g. Kitchen staff refusing to prioritize ready order"
                  className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Detailed Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Detailed Explanation / What Happened? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={complaintMessage}
                  onChange={(e) => setComplaintMessage(e.target.value)}
                  placeholder="Provide details so the support desk can investigate and compensate or resolve..."
                  className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Image / Attachment Proof URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Image / Proof URL (Optional)
                </label>
                <input
                  type="text"
                  value={complaintImageUrl}
                  onChange={(e) => setComplaintImageUrl(e.target.value)}
                  placeholder="https://... or photo link"
                  className="w-full bg-[#0A0E12] border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingComplaint}
                  className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingComplaint ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Submit Ticket to Support</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewComplaintModal(false)}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RIDER MAILBOX DEDICATED CHAT MODAL */}
      {showMailboxModal && activeMailboxOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-amber-500/80 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center font-bold">
                  📬
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Mailbox Chat: Order #{activeMailboxOrder.id}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    Customer: {activeMailboxOrder.customerName || 'Athlete'} ({activeMailboxOrder.customerPhone || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMailboxModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If order is delivered, show disabled message */}
            {(activeMailboxOrder.status === 'delivered' || activeMailboxOrder.status === 'cancelled') ? (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-center font-bold font-mono">
                🔒 Chat session closed. Order has been {activeMailboxOrder.status}.
              </div>
            ) : (
              /* Quick Rider Templates */
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  QUICK RIDER MESSAGES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "On my way to pick up! 🍳",
                    "Order collected! En route to your location 🛵",
                    "Reached your location, please come down 📍",
                    "Near your building gate 🏢",
                    "Please share the 4-digit OTP 🔑",
                  ].map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRiderSendMessage(activeMailboxOrder.id, tmpl)}
                      className="text-[11px] font-bold bg-white/10 hover:bg-amber-500 hover:text-brand-charcoal border border-white/15 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread History */}
            <div className="bg-[#090D12] border border-white/10 rounded-2xl p-3 h-52 overflow-y-auto space-y-2 text-xs font-sans">
              {(!activeMailboxOrder.chatMessages || activeMailboxOrder.chatMessages.length === 0) ? (
                <div className="text-center text-gray-500 pt-16 text-xs font-mono">
                  No messages yet. Send a quick template or type below!
                </div>
              ) : (
                activeMailboxOrder.chatMessages.map((msg) => {
                  const isMine = msg.sender === 'rider';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                          isMine
                            ? 'bg-amber-500 text-brand-charcoal rounded-br-none'
                            : 'bg-emerald-700 text-white rounded-bl-none'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase block opacity-70 mb-0.5">
                          {isMine ? 'You (Rider)' : 'Customer'}
                        </span>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono mt-0.5 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Input */}
            {(activeMailboxOrder.status !== 'delivered' && activeMailboxOrder.status !== 'cancelled') && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mailboxInputMsg}
                  onChange={(e) => setMailboxInputMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRiderSendMessage(activeMailboxOrder.id, mailboxInputMsg);
                      setMailboxInputMsg('');
                    }
                  }}
                  placeholder="Type message for customer..."
                  className="flex-1 bg-[#090D12] border border-white/20 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleRiderSendMessage(activeMailboxOrder.id, mailboxInputMsg);
                    setMailboxInputMsg('');
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CASH HANDOVER & DEPOSIT TO KITCHEN MODAL (TWO-STEP APPROVAL STEP 1) */}
      {showCashDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-emerald-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                      TWO-STEP CASH SETTLEMENT
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                      Step 1 of 2
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white">
                    Deposit Cash to Kitchen Hub
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashDepositModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-400">Current Cash-in-Hand Available:</span>
                <span className="text-xs font-mono text-emerald-300">Max Limit</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{currentPartner.cashInHand ?? 0}
              </div>
              <p className="text-[11px] text-gray-300">
                Destination: <strong className="text-white">{originKitchen.name} Cashier Desk</strong>.
              </p>
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-[11px] text-emerald-200/90 leading-snug">
                ℹ️ <strong>How 2-step verification works:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5 text-gray-300 text-[10px]">
                  <li>You submit the deposit amount here (Step 1).</li>
                  <li>Hand physical cash to kitchen cashier; they verify and click <strong>Approve</strong> on the KDS terminal (Step 2).</li>
                </ol>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">
                Cash Amount to Handover (₹) *
              </label>
              <input
                type="number"
                min={1}
                max={currentPartner.cashInHand ?? 0}
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                placeholder="Enter physical cash amount"
                className="w-full bg-[#0B0F14] border-2 border-emerald-500/50 rounded-2xl px-4 py-3 text-lg font-black font-mono text-white focus:outline-none focus:border-emerald-400"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(currentPartner.cashInHand || 0))}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-brand-charcoal border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  Deposit Full (₹{currentPartner.cashInHand ?? 0})
                </button>
                {(currentPartner.cashInHand ?? 0) >= 500 && (
                  <button
                    type="button"
                    onClick={() => setDepositAmountInput('500')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ₹500
                  </button>
                )}
                {(currentPartner.cashInHand ?? 0) >= 1000 && (
                  <button
                    type="button"
                    onClick={() => setDepositAmountInput('1000')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ₹1,000
                  </button>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 block">
                Handover Notes / Batch (Optional)
              </label>
              <input
                type="text"
                value={depositNotesInput}
                onChange={(e) => setDepositNotesInput(e.target.value)}
                placeholder="e.g. End of morning shift cash handover"
                className="w-full bg-[#0B0F14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleRequestCashDepositToKitchen}
                disabled={isDepositingCash || !depositAmountInput || parseFloat(depositAmountInput) <= 0 || parseFloat(depositAmountInput) > (currentPartner.cashInHand || 0)}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
              >
                {isDepositingCash ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Request Kitchen Approval (Step 1)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCashDepositModal(false)}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY DEVICE GPS PERMISSION MODAL */}
      {showGpsPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-red-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 animate-pulse text-red-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">
                  SAFETY & LIVE TELEMETRY MANDATE
                </span>
                <h3 className="text-sm font-black text-white">
                  DEVICE GPS LOCATION REQUIRED
                </h3>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              FitZaika requires delivery partners to enable mandatory real-time device location permissions before accepting customer orders. This allows customers and kitchens to track your arrival live on the interactive map.
            </p>

            <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-3.5 space-y-1.5 text-xs text-red-200 font-mono">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>LOCATION STATUS: DISABLED</span>
              </div>
              <p className="text-[10px] text-gray-300">
                Please grant location access when prompted by your browser/device.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => enableRiderGps(() => handleAcceptDeliveryByRider())}
                className="w-full sm:flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                <span>ENABLE GPS LOCATION NOW</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGpsPromptModal(false)}
                className="w-full sm:w-auto px-4 py-3.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
