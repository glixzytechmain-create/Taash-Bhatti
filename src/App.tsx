/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Header from './components/Header';
import BottomNav, { TabType } from './components/BottomNav';
import HomeTab from './components/HomeTab';
import MenuTab from './components/MenuTab';
import DealsTab from './components/DealsTab';
import CateringPlannerTab from './components/CateringPlannerTab';
import AICoachTab from './components/AICoachTab';
import BhattisTab from './components/BhattisTab';
import AccountTab from './components/AccountTab';
import MyDeckTab from './components/MyDeckTab';
import BuddyDeckView from './components/BuddyDeckView';
import CartDrawer from './components/CartDrawer';
import { Gift, ArrowRight } from 'lucide-react';
import { Meal, Gym, GymChain, Order, User, OrderItem, Kitchen, MealReview, BuddyDeckRequest, GroupOrderRoom } from './types';
import { GYMS_DATA, MEALS_DATA } from './data';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db, googleProvider, sanitizeForFirestore } from './lib/firebase';
import OnboardingWizard from './components/OnboardingWizard';
import AdminPortal from './components/AdminPortal';
import AdminLoginPortal from './components/AdminLoginPortal';
import CartQuantityButton from './components/CartQuantityButton';
import DeliveryPartnerApp from './components/DeliveryPartnerApp';
import CustomerSupportPortal from './components/CustomerSupportPortal';
import KitchenManagerApp from './components/KitchenManagerApp';
import IdentityVerificationModal from './components/IdentityVerificationModal';
import SupportMailboxModal from './components/SupportMailboxModal';
import AuthVerifyingOverlay from './components/AuthVerifyingOverlay';
import TaashOpeningSplash from './components/TaashOpeningSplash';
import CityGeofenceSelectorModal from './components/CityGeofenceSelectorModal';
import NotificationPromptModal from './components/NotificationPromptModal';
import SelectDeliveryAddressModal from './components/SelectDeliveryAddressModal';
import WelcomeBackModal from './components/WelcomeBackModal';
import OnboardingFlowModal from './components/OnboardingFlowModal';
import TapFeedbackEffect from './components/TapFeedbackEffect';
import FloatingDeliveredRateBubble from './components/FloatingDeliveredRateBubble';
import DeliveredOrderRatingModal from './components/DeliveredOrderRatingModal';
import MealReviewsSection from './components/MealReviewsSection';
import DeliverableOrderTracker from './components/DeliverableOrderTracker';
import GroupOrderRoomView from './components/GroupOrderRoomView';
import GroupOrderFloatingBubble from './components/GroupOrderFloatingBubble';
import { SmartNotificationEngine } from './components/SmartNotificationEngine';
import { DeveloperMenuModal } from './components/DeveloperMenuModal';
import LegalDocumentsModal from './components/LegalDocumentsModal';
import { SmartPushTesterModal } from './components/SmartPushTesterModal';
import { smartPushService } from './lib/smartPushService';
import { App as CapApp } from '@capacitor/app';
import { getStoredFeatureFlags, subscribeFeatureFlags, saveFeatureFlags } from './lib/featureFlags';
import { AppFeatureFlags } from './types';

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial mock orders to make the profile look rich right out of the box
const INITIAL_ORDERS: Order[] = [
  {
    id: 'FZ-203918',
    items: [
      {
        meal: {
          id: 'm1',
          name: 'Saffron-Infused Tandoori Paneer Bowl',
          description: 'Fresh grilled low-fat paneer cubes marinated in saffron-infused spices, served over a bed of aromatic rice and roasted bell peppers.',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
          price: 349,
          isVeg: true,
          timings: ['lunch', 'dinner'],
          spicyLevel: 'medium',
          popularity: 95,
          prepTimeMinutes: 20,
        },
        quantity: 1,
      }
    ],
    date: '10 Jul 2026',
    status: 'delivered',
    total: 349,
    discount: 50,
    subtotal: 399,
    deliveryFee: 0,
    address: 'Flat 402, Royal Residency, Muzaffarpur',
    paymentMethod: 'UPI / NetBanking',
    trackingSteps: [],
  },
];

export default function App() {
  // Deliverable Read-Only Order Tracking Link state (?trackOrder=ORD-1234 or ?track=ORD-1234 or ?orderId=ORD-1234 or #track=ORD-1234)
  const [deliverableOrderId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('trackOrder') || params.get('track') || params.get('orderId');
      if (q && q.trim()) return q.trim();
      const hash = window.location.hash;
      if (hash && hash.includes('track=')) {
        const match = hash.match(/track=([^&]+)/);
        if (match && match[1]) return decodeURIComponent(match[1]).trim();
      }
    } catch (e) {}
    return null;
  });

  // Multi-Gateway state (Customer app vs Admin control console vs Delivery Partner app vs Customer Support Desk vs Kitchen Manager KDS)
  const [currentGateway, setCurrentGateway] = useState<'customer' | 'admin' | 'partner' | 'support' | 'kitchen'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const portalParam = params.get('portal') || params.get('gateway');
        if (portalParam && ['customer', 'admin', 'partner', 'support', 'kitchen'].includes(portalParam)) {
          return portalParam as any;
        }
      }
    } catch (e) {}
    return (localStorage.getItem('fitzaika_gateway') as 'customer' | 'admin' | 'partner' | 'support' | 'kitchen') || 'customer';
  });
  const [adminEmailAttempt, setAdminEmailAttempt] = useState<string | null>(null);
  const [adminPasscodeVerified, setAdminPasscodeVerified] = useState<boolean>(() => {
    return localStorage.getItem('fitzaika_admin_verified') === 'true';
  });

  // Identity Verification Animation Modal state
  const [identityModal, setIdentityModal] = useState<{
    isOpen: boolean;
    step: 'scanning' | 'verifying' | 'confirmed';
    title: string;
    subtitle: string;
  }>({
    isOpen: false,
    step: 'scanning',
    title: 'Authenticating Tokens...',
    subtitle: 'Connecting to TAASH BHATTI Cloud Auth Nodes',
  });

  // Navigation State
  const [initialBuddyDeckId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        if (path.startsWith('/buddydeck') || params.get('page') === 'buddydeck' || params.has('deckId')) {
          return params.get('deckId') || null;
        }
      }
    } catch (e) {}
    return null;
  });

  const [activeTab, setActiveTab] = useState<TabType | 'buddydeck'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        if (path.startsWith('/buddydeck') || params.get('page') === 'buddydeck' || params.has('deckId')) {
          return 'buddydeck';
        }
      }
    } catch (e) {}
    return 'home';
  });
  const [preSelectedGoal, setPreSelectedGoal] = useState<string | null>(null);

  // Buddy Deck Real-Time Receiver Notifications State
  const [incomingBuddyRequest, setIncomingBuddyRequest] = useState<BuddyDeckRequest | null>(null);
  const [incomingBuddyOrderAlert, setIncomingBuddyOrderAlert] = useState<Order | null>(null);

  // Group Ordering Room (Taash Dawat) State (?groupRoomId=... or ?dawat=...)
  const [urlGroupRoomId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('groupRoomId') || params.get('roomCode') || params.get('dawat') || null;
      }
    } catch (e) {}
    return null;
  });
  const [urlGroupPin] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('groupPin') || params.get('pin') || null;
      }
    } catch (e) {}
    return null;
  });
  const [showGroupOrdering, setShowGroupOrdering] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return Boolean(params.get('groupRoomId') || params.get('roomCode') || params.get('dawat'));
      }
    } catch (e) {}
    return false;
  });

  // Legal Documents Modal (Terms & Conditions / Privacy Policy)
  const [showLegalModal, setShowLegalModal] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('page') === 'terms' || params.get('page') === 'privacy' || Boolean(params.get('terms')) || Boolean(params.get('privacy'));
      }
    } catch (e) {}
    return false;
  });
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('page') === 'privacy' || params.get('privacy')) return 'privacy';
      }
    } catch (e) {}
    return 'terms';
  });

  const handleOpenLegal = (tab: 'terms' | 'privacy' = 'terms') => {
    setLegalModalTab(tab);
    setShowLegalModal(true);
  };

  // Group Ordering Active State & Preloaded Meals (from Reorder)
  const [groupOrderPreloadMeals, setGroupOrderPreloadMeals] = useState<{ meal: Meal; quantity: number }[] | null>(null);
  const [activeGroupRoom, setActiveGroupRoom] = useState<GroupOrderRoom | null>(null);
  const [placedGroupOrder, setPlacedGroupOrder] = useState<Order | null>(null);

  // Monitor active group order room from localStorage & Firestore for the floating bubble
  useEffect(() => {
    const activeRoomId = localStorage.getItem('tb_active_group_room_id');
    if (!activeRoomId) {
      setActiveGroupRoom(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'group_orders', activeRoomId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GroupOrderRoom;
          if (data.status === 'disbanded' || data.status === 'ordered') {
            setActiveGroupRoom(null);
            localStorage.removeItem('tb_active_group_room_id');
          } else {
            setActiveGroupRoom(data);
          }
        } else {
          setActiveGroupRoom(null);
          localStorage.removeItem('tb_active_group_room_id');
        }
      },
      (err) => {
        console.warn('Group room sync error:', err);
      }
    );

    return () => unsub();
  }, [showGroupOrdering]);

  const handleOpenGroupOrderWithMeals = (items?: any[]) => {
    if (items && items.length > 0) {
      setGroupOrderPreloadMeals(items);
    } else {
      setGroupOrderPreloadMeals(null);
    }
    setShowGroupOrdering(true);
  };

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Support Mailbox State
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  // User Preferences State
  const [user, setUser] = useState<User>(() => {
    const cached = localStorage.getItem('fitzaika_cached_user_profile');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      name: 'Customer',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      goal: 'general',
      preferredGymId: null,
      savedAddresses: [],
      savedPayments: [],
    };
  });

  // Helper for persistent Guest User ID
  const getGuestUserId = (): string => {
    let guestId = localStorage.getItem('fitzaika_guest_user_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('fitzaika_guest_user_id', guestId);
    }
    return guestId;
  };

  const updateOrdersWithCache = (newOrders: Order[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem('fitzaika_orders_cache', JSON.stringify(newOrders));
    } catch (e) {}
  };

  // Global selection trackers
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedBhatti, setSelectedBhatti] = useState<Kitchen | null>(() => {
    try {
      const cached = localStorage.getItem('fitzaika_selected_bhatti');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  const handleSelectBhatti = (bhatti: Kitchen | null) => {
    setSelectedBhatti(bhatti);
    if (bhatti) {
      localStorage.setItem('fitzaika_selected_bhatti', JSON.stringify(bhatti));
    } else {
      localStorage.removeItem('fitzaika_selected_bhatti');
    }
  };
  const [likedMeals, setLikedMeals] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('fitzaika_deck_meals');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('fitzaika_orders_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [meals, setMeals] = useState<Meal[]>(() => MEALS_DATA);

  // Monitor placed group orders for floating tracking bubble
  useEffect(() => {
    const placedOrderId = localStorage.getItem('tb_placed_group_order_id');
    if (placedOrderId) {
      const match = orders.find(
        (o) => o.id === placedOrderId && o.status !== 'delivered' && o.status !== 'cancelled'
      );
      if (match) {
        setPlacedGroupOrder(match);
      } else {
        const finished = orders.find(
          (o) => o.id === placedOrderId && (o.status === 'delivered' || o.status === 'cancelled')
        );
        if (finished) {
          localStorage.removeItem('tb_placed_group_order_id');
          setPlacedGroupOrder(null);
        }
      }
    } else {
      const latestActiveGroupOrder = orders.find(
        (o) => o.isGroupOrder && o.status !== 'delivered' && o.status !== 'cancelled'
      );
      if (latestActiveGroupOrder) {
        setPlacedGroupOrder(latestActiveGroupOrder);
      }
    }
  }, [orders]);

  // Auto-cleanup: Auto-delete feast room from Firestore backend when group order is delivered
  useEffect(() => {
    const deliveredGroupOrders = orders.filter(
      (o) => (o.isGroupOrder || o.groupRoomId) && o.status === 'delivered'
    );

    deliveredGroupOrders.forEach(async (ord) => {
      const roomId = ord.groupRoomId;
      if (roomId) {
        try {
          const roomRef = doc(db, 'group_orders', roomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            await deleteDoc(roomRef);
            console.log(`[Auto-Cleanup] Group feast room #${roomId} deleted from backend upon order delivery #${ord.id}`);
          }
        } catch (e) {
          console.warn('[Auto-Cleanup] Error deleting delivered feast room:', e);
        }

        const activeId = localStorage.getItem('tb_active_group_room_id');
        if (activeId === roomId) {
          localStorage.removeItem('tb_active_group_room_id');
          setActiveGroupRoom(null);
        }
        const placedId = localStorage.getItem('tb_placed_group_order_id');
        if (placedId === ord.id) {
          localStorage.removeItem('tb_placed_group_order_id');
          setPlacedGroupOrder(null);
        }
      }
    });
  }, [orders]);

  // Firebase Auth and sync state
  const [fbUser, setFbUser] = useState<any>(() => {
    const cached = localStorage.getItem('fitzaika_cached_fb_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showAuthVerifyingOverlay, setShowAuthVerifyingOverlay] = useState<boolean>(false);
  const [showOpeningSplash, setShowOpeningSplash] = useState<boolean>(true);

  // Onboarding wizard overlay state (Disabled per user request)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [adminCreatingAccount, setAdminCreatingAccount] = useState<boolean>(false);

  // Location Setup & Multi-Address Delivery Selection Modals State
  const [showCityLocationModal, setShowCityLocationModal] = useState<boolean>(false);
  const [showSelectAddressModal, setShowSelectAddressModal] = useState<boolean>(false);
  const [onboardingFlowState, setOnboardingFlowState] = useState<{
    isOpen: boolean;
    userDisplayName?: string | null;
    userPhone?: string | null;
    mode: 'login' | 'signup' | 'restore';
    savedAddressCount: number;
    savedAddressPrimary?: string | null;
    isNewUser: boolean;
  } | null>(null);
  const [welcomeBackUser, setWelcomeBackUser] = useState<{
    name: string;
    avatar?: string;
    address?: string;
    addressCount: number;
  } | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [ratingModalOrder, setRatingModalOrder] = useState<Order | null>(null);

  // Developer Feature Flags & Menu State
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);
  const [showDevMenu, setShowDevMenu] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    return () => unsubscribe();
  }, []);

  // Developer Menu Hotkey Shortcut: Ctrl+Shift+D or Meta+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setShowDevMenu((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    (window as any).openDevMenu = () => setShowDevMenu(true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).openDevMenu;
    };
  }, []);

  // Smart Push Notification Tester State & Double-Tap Back Toast
  const [showPushTester, setShowPushTester] = useState<boolean>(false);
  const [backExitToast, setBackExitToast] = useState<boolean>(false);

  useEffect(() => {
    (window as any).openPushTester = () => setShowPushTester(true);
    return () => {
      delete (window as any).openPushTester;
    };
  }, []);

  // Mutable reference tracking all active modals/portals for hardware back-button listener
  const modalsStateRef = React.useRef({
    showPushTester: false,
    showDevMenu: false,
    showLegalModal: false,
    showGroupOrdering: false,
    cartOpen: false,
    mailboxOpen: false,
    ratingModalOrder: null as Order | null,
    showNotificationPrompt: false,
    welcomeBackUser: null as any,
    onboardingFlowState: null as any,
    showSelectAddressModal: false,
    showCityLocationModal: false,
    currentGateway: 'customer' as string,
    activeTab: 'home' as string,
  });

  useEffect(() => {
    modalsStateRef.current = {
      showPushTester,
      showDevMenu,
      showLegalModal,
      showGroupOrdering,
      cartOpen,
      mailboxOpen,
      ratingModalOrder,
      showNotificationPrompt,
      welcomeBackUser,
      onboardingFlowState,
      showSelectAddressModal,
      showCityLocationModal,
      currentGateway,
      activeTab,
    };
  }, [
    showPushTester,
    showDevMenu,
    showLegalModal,
    showGroupOrdering,
    cartOpen,
    mailboxOpen,
    ratingModalOrder,
    showNotificationPrompt,
    welcomeBackUser,
    onboardingFlowState,
    showSelectAddressModal,
    showCityLocationModal,
    currentGateway,
    activeTab,
  ]);

  // Hardware Back Button Protection: dismiss modals -> exit portals -> switch to home -> double-tap to exit
  useEffect(() => {
    let lastBackPress = 0;

    const backListenerPromise = CapApp.addListener('backButton', () => {
      const s = modalsStateRef.current;

      // 1. Modal / Sheet Priority Stack
      if (s.showPushTester) {
        setShowPushTester(false);
        return;
      }
      if (s.showDevMenu) {
        setShowDevMenu(false);
        return;
      }
      if (s.showLegalModal) {
        setShowLegalModal(false);
        return;
      }
      if (s.showGroupOrdering) {
        setShowGroupOrdering(false);
        return;
      }
      if (s.cartOpen) {
        setCartOpen(false);
        return;
      }
      if (s.mailboxOpen) {
        setMailboxOpen(false);
        return;
      }
      if (s.ratingModalOrder) {
        setRatingModalOrder(null);
        return;
      }
      if (s.showNotificationPrompt) {
        setShowNotificationPrompt(false);
        return;
      }
      if (s.welcomeBackUser) {
        setWelcomeBackUser(null);
        return;
      }
      if (s.onboardingFlowState?.isOpen) {
        setOnboardingFlowState(null);
        return;
      }
      if (s.showSelectAddressModal) {
        setShowSelectAddressModal(false);
        return;
      }
      if (s.showCityLocationModal) {
        setShowCityLocationModal(false);
        return;
      }

      // 2. Return to Customer gateway if inside admin/partner/kitchen/support
      if (s.currentGateway !== 'customer') {
        setCurrentGateway('customer');
        localStorage.setItem('fitzaika_gateway', 'customer');
        return;
      }

      // 3. Return to Home Tab if on another tab
      if (s.activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      // 4. Double-Tap Exit Guard on Home Screen
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPress = now;
        setBackExitToast(true);
        setTimeout(() => setBackExitToast(false), 2000);
      }
    });

    return () => {
      backListenerPromise.then((handler) => handler.remove?.());
    };
  }, []);

  // Cart ref for App Lifecycle background check
  const cartRef = React.useRef<OrderItem[]>([]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // App Lifecycle Listener for Native Lock-Screen Abandoned Cart Push (5 Mins)
  useEffect(() => {
    smartPushService.initChannels();

    const appStatePromise = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // App backgrounded or phone locked
        const currentCart = cartRef.current;
        if (currentCart && currentCart.length > 0) {
          const firstDishName = currentCart[0]?.meal?.name || 'delicious meal';
          smartPushService.scheduleAbandonedCartPush(firstDishName, 300); // 5 minutes
        }
      } else {
        // App reopened
        smartPushService.cancelAbandonedCartPush();
      }
    });

    return () => {
      appStatePromise.then((handler) => handler.remove?.());
    };
  }, []);

  // Helper to detect if current load was a browser reload/refresh
  const isPageReload = (): boolean => {
    try {
      if (typeof window !== 'undefined' && window.performance) {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          return (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
        }
        if ((performance as any).navigation) {
          return (performance as any).navigation.type === 1; // TYPE_RELOAD
        }
      }
    } catch (e) {}
    return false;
  };

  // Conditional Location / Delivery Destination Prompting upon App Opening:
  // 1. Only ask those who have NOT saved any address in their profile with the map popup to select a delivery location.
  // 2. If user already has 1 address saved, do NOT show the map popup or prompt (use their address).
  // 3. Only if user has more than 1 saved address, show them the dialog to select their saved address where they want food delivered.
  // 4. Never trigger on page reloads/refreshes, only on fresh app launch.
  // 5. If welcome back popup or onboarding flow is active or user has saved addresses, never show the map location picker window!
  useEffect(() => {
    if (authChecking) return;
    if (currentGateway !== 'customer') return;

    if (welcomeBackUser || onboardingFlowState?.isOpen) {
      setShowCityLocationModal(false);
      return;
    }

    const sessionKey = fbUser ? `taash_arrival_prompt_${fbUser.uid}` : 'taash_arrival_prompt_guest';
    const hasPromptedThisSession = sessionStorage.getItem(sessionKey) === 'true';

    // If it's a page reload or already prompted during this browser session, skip automatic modals
    if (hasPromptedThisSession || isPageReload()) {
      sessionStorage.setItem(sessionKey, 'true');
      return;
    }

    const savedList = (user?.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0);
    const primaryAddr = (user?.address && user.address.trim().length > 0) ? [user.address.trim()] : [];
    const uniqueAddresses = Array.from(new Set([...savedList, ...primaryAddr]));
    const addressCount = uniqueAddresses.length;

    // If user has any saved address, strictly do not show map modal!
    if (addressCount > 0) {
      sessionStorage.setItem(sessionKey, 'true');
      setShowCityLocationModal(false);
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem(sessionKey, 'true');
      if (addressCount === 0 && !welcomeBackUser && !onboardingFlowState?.isOpen) {
        // Zero saved addresses: Prompt with map popup to select delivery location
        setShowCityLocationModal(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [authChecking, currentGateway, fbUser?.uid, user?.savedAddresses, user?.address, welcomeBackUser, onboardingFlowState?.isOpen]);

  // Handler for user selecting an active delivery destination from multiple saved addresses
  const handleSelectDeliveryAddress = async (selectedAddressText: string) => {
    const nextUser = {
      ...user,
      address: selectedAddressText,
    };
    setUser(nextUser);
    localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(nextUser));

    if (fbUser && fbUser.uid) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          address: selectedAddressText,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn("Could not save selected delivery address:", err);
      }
    }

    const shortAddr = selectedAddressText.length > 32 ? selectedAddressText.slice(0, 32) + '...' : selectedAddressText;
    setToastMessage(`📍 Delivering to: ${shortAddr}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save location handler for first-time or returning users
  const handleSaveLocation = async (
    city: string,
    address: string,
    lat: number,
    lng: number,
    inRange: boolean,
    kitchenName?: string
  ) => {
    if (fbUser) {
      localStorage.setItem(`taash_first_location_done_${fbUser.uid}`, 'true');
    }
    const existingAddresses = user.savedAddresses || [];
    const updatedAddresses = [address, ...existingAddresses.filter(a => a !== address)];
    
    const nextUser = {
      ...user,
      city,
      address,
      addressLat: lat,
      addressLng: lng,
      deliveryLat: lat,
      deliveryLng: lng,
      savedAddresses: updatedAddresses,
    };
    setUser(nextUser);
    localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(nextUser));

    if (fbUser && fbUser.uid) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          city,
          address,
          addressLat: lat,
          addressLng: lng,
          deliveryLat: lat,
          deliveryLng: lng,
          savedAddresses: updatedAddresses,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn("Could not save location to Firestore:", err);
      }
    }

    if (inRange) {
      setToastMessage(`🟢 Delivery Location confirmed in ${city}!`);
    } else {
      setToastMessage(`📍 Saved Address in ${city}`);
    }
    setTimeout(() => setToastMessage(null), 3000);

    // STEP 2: IMMEDIATELY PROCEED TO DEVICE NOTIFICATION PROMPT AFTER LOCATION SETUP (ONLY FOR SIGNED-IN USERS)
    if (fbUser) {
      setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 400);
    }
  };

  // Keep a ref of adminCreatingAccount to avoid stale closures in onAuthStateChanged
  const adminCreatingAccountRef = React.useRef(adminCreatingAccount);
  useEffect(() => {
    adminCreatingAccountRef.current = adminCreatingAccount;
  }, [adminCreatingAccount]);

  const handleShowOnboarding = (val: boolean) => {
    // Onboarding disabled per user request
    setShowOnboarding(false);
  };

  // Toast alert trigger state (satisfying success animation on Add to Cart)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enforce Light Theme Clean Aesthetics
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('fitzaika_theme', 'light');
  }, []);

  const handleOnboardingComplete = async (updatedData: Partial<User>) => {
    const nextUser = {
      ...user,
      ...updatedData,
      onboardingCompleted: true,
    };
    setUser(nextUser);
    localStorage.setItem('fitzaika_onboarding_done', 'true');
    handleShowOnboarding(false);

    // Save/Sync to Firebase Firestore if logged in
    if (fbUser) {
      try {
        const userRef = doc(db, 'users', fbUser.uid);
        await setDoc(userRef, {
          ...nextUser,
          uid: fbUser.uid,
        }, { merge: true });
        showToast("💪 Metabolic profile synced in secure cloud vault!");
      } catch (err) {
        console.error("Error saving onboarding details to cloud", err);
      }
    } else {
      showToast("💪 Local metabolic profile calibrated!");
    }
  };

  // Helper: Trigger floating success toast on add-to-cart
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync state with Firebase Auth and Firestore real-time snapshots
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);
      setAuthChecking(false);

      if (firebaseUser) {
        setShowAuthVerifyingOverlay(true);
      } else {
        setShowAuthVerifyingOverlay(false);
      }

      if (firebaseUser && firebaseUser.email) {
        const emailClean = firebaseUser.email.trim().toLowerCase();
        
        try {
          // 1. Check Customer Support Agents
          const qAgent = query(collection(db, 'support_agents'), where('email', '==', emailClean));
          const snapAgent = await getDocs(qAgent);
          if (!snapAgent.empty) {
            setCurrentGateway('support');
            localStorage.setItem('fitzaika_gateway', 'support');
          } else {
            // 2. Check Kitchen Station Managers
            const qKM = query(collection(db, 'kitchen_managers'), where('email', '==', emailClean));
            const snapKM = await getDocs(qKM);
            if (!snapKM.empty) {
              const kmData = { id: snapKM.docs[0].id, ...snapKM.docs[0].data() };
              localStorage.setItem('fitzaika_active_km_session', JSON.stringify(kmData));
              setCurrentGateway('kitchen');
              localStorage.setItem('fitzaika_gateway', 'kitchen');
            } else {
              // 3. Check Delivery Fleet Partners
              const q = query(collection(db, 'delivery_partners'), where('email', '==', emailClean));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const partnerData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(partnerData));
                setCurrentGateway('partner');
                localStorage.setItem('fitzaika_gateway', 'partner');
              } else if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
                setAdminEmailAttempt(emailClean);
                setAdminPasscodeVerified(true);
                localStorage.setItem('fitzaika_admin_verified', 'true');
              }
            }
          }
        } catch (e) {
          if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
            setAdminEmailAttempt(emailClean);
            setAdminPasscodeVerified(true);
            localStorage.setItem('fitzaika_admin_verified', 'true');
          }
        }
      }

      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (firebaseUser) {
        localStorage.setItem('fitzaika_cached_fb_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }));
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const profile = snapshot.data() as User;
            if (profile.email && profile.email.includes('@taashbhatti.phone')) {
              profile.email = '';
              setDoc(userRef, { email: '' }, { merge: true }).catch(() => {});
            }
            setUser(profile);
            if (profile.deckMealIds || profile.favoriteMealIds) {
              const loadedDeck = profile.deckMealIds || profile.favoriteMealIds || [];
              setLikedMeals(loadedDeck);
              try {
                localStorage.setItem('fitzaika_deck_meals', JSON.stringify(loadedDeck));
              } catch (e) {}
            }
            localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(profile));
            if (profile.onboardingCompleted) {
              localStorage.setItem('fitzaika_onboarding_done', 'true');
            } else {
              localStorage.removeItem('fitzaika_onboarding_done');
            }
          } else {
            const initialProfile: User = {
              name: firebaseUser.displayName || 'TAASH BHATTI Athlete',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
              goal: 'muscle_gain',
              preferredGymId: '',
              savedAddresses: [],
              savedPayments: [],
              onboardingCompleted: false,
            };
            setDoc(userRef, initialProfile).catch((error) => {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
            });
            setUser(initialProfile);
            localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(initialProfile));
            localStorage.removeItem('fitzaika_onboarding_done');
          }
        }, (error: any) => {
          if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
            console.warn("User profile sync running offline mode.");
          } else {
            console.error("Error fetching user profile", error);
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        });

        const activeUid = firebaseUser.uid;
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', activeUid));
        unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const loadedOrders: Order[] = [];
          snapshot.forEach((d) => {
            loadedOrders.push(d.data() as Order);
          });

          // Merge with cached local orders in case any were saved offline or during guest session
          const cachedStr = localStorage.getItem('fitzaika_orders_cache');
          let localCache: Order[] = [];
          if (cachedStr) {
            try { localCache = JSON.parse(cachedStr); } catch (e) {}
          }
          const combinedMap = new Map<string, Order>();
          loadedOrders.forEach(o => combinedMap.set(o.id, o));
          localCache.forEach(o => {
            if (!combinedMap.has(o.id) && (o.userId === activeUid || o.userId?.startsWith('guest_'))) {
              combinedMap.set(o.id, { ...o, userId: activeUid });
            }
          });
          const combinedList = Array.from(combinedMap.values());
          combinedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
          updateOrdersWithCache(combinedList);
        }, (error: any) => {
          console.warn("User orders sync running offline mode.", error);
        });
      } else {
        // Inspect local storage for an active session (e.g., phone auth or remembered user profile)
        const cachedUserStr = localStorage.getItem('fitzaika_cached_user_profile');
        const cachedFbUserStr = localStorage.getItem('fitzaika_cached_fb_user');
        const hasAuthSession = localStorage.getItem('fitzaika_auth_session') === 'true';
        let persistentProfile: User | null = null;
        if (cachedUserStr) {
          try {
            persistentProfile = JSON.parse(cachedUserStr);
          } catch (e) {}
        }

        const isRealUser = persistentProfile && (
          hasAuthSession ||
          (persistentProfile.phone && persistentProfile.phone.trim().length > 0) ||
          (persistentProfile.email && persistentProfile.email.trim().length > 0 && !persistentProfile.email.includes('guest@')) ||
          (persistentProfile.savedAddresses && persistentProfile.savedAddresses.length > 0)
        );

        if (isRealUser && persistentProfile) {
          // RETAIN USER SESSION! DO NOT CLEAR DATA OR LOG OUT!
          setUser(persistentProfile);
          let restoredFbUser: any = null;
          if (cachedFbUserStr) {
            try {
              restoredFbUser = JSON.parse(cachedFbUserStr);
              setFbUser(restoredFbUser);
            } catch (e) {}
          }

          // Sync orders for this persistent user
          const activeUid = restoredFbUser?.uid || persistentProfile.phone || getGuestUserId();
          const ordersQuery = query(collection(db, 'orders'), where('userId', '==', activeUid));
          unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            const loadedOrders: Order[] = [];
            snapshot.forEach((d) => {
              loadedOrders.push(d.data() as Order);
            });
            const cachedStr = localStorage.getItem('fitzaika_orders_cache');
            let localCache: Order[] = [];
            if (cachedStr) {
              try { localCache = JSON.parse(cachedStr); } catch (e) {}
            }
            const combinedMap = new Map<string, Order>();
            loadedOrders.forEach(o => combinedMap.set(o.id, o));
            localCache.forEach(o => {
              if (!combinedMap.has(o.id) && (o.userId === activeUid || o.userId?.startsWith('guest_'))) {
                combinedMap.set(o.id, { ...o, userId: activeUid });
              }
            });
            const combinedList = Array.from(combinedMap.values());
            combinedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
            updateOrdersWithCache(combinedList);
          }, (error: any) => {
            console.warn("User orders sync running offline mode.", error);
          });
        } else {
          // Genuinely a guest user with no prior login session
          setUser({
            name: 'Guest Athlete',
            email: 'guest@taashbhatti.com',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            goal: 'general',
            preferredGymId: '',
            savedAddresses: [],
            savedPayments: [],
          });

          // Sync guest orders in Firestore using persistent guest ID
          const guestId = getGuestUserId();
          const guestOrdersQuery = query(collection(db, 'orders'), where('userId', '==', guestId));
          unsubscribeOrders = onSnapshot(guestOrdersQuery, (snapshot) => {
            const loadedOrders: Order[] = [];
            snapshot.forEach((d) => {
              loadedOrders.push(d.data() as Order);
            });
            const cachedStr = localStorage.getItem('fitzaika_orders_cache');
            let localCache: Order[] = [];
            if (cachedStr) {
              try { localCache = JSON.parse(cachedStr); } catch (e) {}
            }
            const combinedMap = new Map<string, Order>();
            loadedOrders.forEach(o => combinedMap.set(o.id, o));
            localCache.forEach(o => {
              if (!combinedMap.has(o.id)) {
                combinedMap.set(o.id, o);
              }
            });
            const combinedList = Array.from(combinedMap.values());
            combinedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
            updateOrdersWithCache(combinedList);
          }, (error: any) => {
            console.warn("Guest orders sync running offline mode.", error);
          });
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  // Real-time Buddy Deck Approval Request & Received Orders Listener for Receiver
  useEffect(() => {
    const currentUserId = fbUser?.uid || getGuestUserId();
    if (!currentUserId) return;

    // 1. Listen for pending approval requests for this receiver
    const buddyReqQuery = query(
      collection(db, 'buddy_deck_requests'),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const unsubBuddyReq = onSnapshot(buddyReqQuery, (snapshot) => {
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        setIncomingBuddyRequest({ ...firstDoc.data(), id: firstDoc.id } as BuddyDeckRequest);
      } else {
        setIncomingBuddyRequest(null);
      }
    }, (err) => {
      console.warn("Buddy requests subscription running in local mode:", err);
    });

    // 2. Listen for orders where this user is the receiver
    let initialOrdersLoaded = false;
    const buddyOrdersQuery = query(
      collection(db, 'orders'),
      where('receiverId', '==', currentUserId)
    );
    const unsubBuddyOrders = onSnapshot(buddyOrdersQuery, (snapshot) => {
      const receivedOrders: Order[] = [];
      snapshot.forEach((docSnap) => {
        receivedOrders.push(docSnap.data() as Order);
      });

      if (!initialOrdersLoaded) {
        initialOrdersLoaded = true;
      } else {
        // Detect newly added surprise orders
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newOrder = change.doc.data() as Order;
            const seenKey = `fitzaika_seen_buddy_order_${newOrder.id}`;
            if (!sessionStorage.getItem(seenKey)) {
              sessionStorage.setItem(seenKey, '1');
              setIncomingBuddyOrderAlert(newOrder);

              // Trigger native browser notification if enabled
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`🎁 Surprise Order Placed!`, {
                    body: `${newOrder.senderName || 'Your friend'} (${newOrder.senderPhone || 'Verified'}) has placed an order for you at ${newOrder.address}! Click here to track.`,
                    icon: 'https://cdn.postimage.me/2026/08/01/28172.png',
                  });
                } catch (e) {}
              }
            }
          }
        });
      }

      // Merge into orders list so they show in Account Orders History & Tracking
      if (receivedOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, Order>();
          prev.forEach((o) => map.set(o.id, o));
          receivedOrders.forEach((o) => map.set(o.id, o));
          const list = Array.from(map.values());
          list.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
          return list;
        });
      }
    }, (err) => {
      console.warn("Buddy received orders subscription running in local mode:", err);
    });

    return () => {
      unsubBuddyReq();
      unsubBuddyOrders();
    };
  }, [fbUser]);

  // Sync meals from Firestore
  useEffect(() => {
    const unsubscribeMeals = onSnapshot(collection(db, 'meals'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedMeals: Meal[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Meal;
          loadedMeals.push({
            ...data,
            id: docSnap.id || data.id,
            goesWellWith: Array.isArray(data.goesWellWith) ? data.goesWellWith : [],
          });
        });
        setMeals(loadedMeals);
      } else {
        setMeals(MEALS_DATA);
      }
    }, (error) => {
      console.error("Error subscribing to meals in App.tsx:", error);
    });
    return () => unsubscribeMeals();
  }, []);

  // Real-Time Native Browser Push Notification Listener
  useEffect(() => {
    let initialLoadDone = false;
    const notifCol = collection(db, 'notifications');
    const unsubscribe = onSnapshot(notifCol, (snapshot) => {
      if (!initialLoadDone) {
        initialLoadDone = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const item = change.doc.data() as any;
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(item.title || 'Fitzaika • Taash Bhatti Alert', {
                body: item.body || 'You have a new update.',
                icon: item.imageUrl || 'https://cdn.postimage.me/2026/08/01/28172.png',
              });
            } catch (err) {
              console.warn("Could not trigger native browser push popup:", err);
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Silent background database seeder to initialize Firestore collections if empty
  useEffect(() => {
    const checkAndSeed = async () => {
      // Quietly wait for initial subscription snapshots to load first
      await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        const mealsRef = collection(db, 'meals');
        const mealsSnap = await getDocs(mealsRef);
        if (mealsSnap.empty) {
          console.log("Firestore is empty. Executing silent high-fidelity database seeding...");

          // 1. Gym Chains
          const defaultChains = [
            { id: 'chain1', name: "Gold's Hub Outlets", description: "Global premier gold-standard dining & pickup outlets with state-of-the-art delivery terminals.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" },
            { id: 'chain2', name: "Cult Partner Outlets", description: "Elite gourmet dining spaces with dedicated reception delivery points.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" },
            { id: 'chain3', name: "Anytime Express Hubs", description: "24/7 convenient community outlets integrated with temperature-controlled delivery bays.", logo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80", registeredAt: "2026-01-01" }
          ];
          for (const chain of defaultChains) {
            await setDoc(doc(db, 'gym_chains', chain.id), chain);
          }

          // 2. Meal Catalog
          for (const m of MEALS_DATA) {
            await setDoc(doc(db, 'meals', m.id), m);
          }

          // 3. Gym Partners
          for (const g of GYMS_DATA) {
            await setDoc(doc(db, 'gyms', g.id), g);
          }

          // 4. Coupons
          const defaultCoupons = [
            {
              code: 'FITFIRST15',
              discountType: 'percentage',
              discountValue: 15,
              perkName: '',
              isActive: true,
              expiryDate: '2028-12-31',
              minOrderValue: 250,
              usageCap: 1000,
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
          for (const c of defaultCoupons) {
            await setDoc(doc(db, 'coupons', c.code), c);
          }

          // 5. Kitchen Ingredients
          const defaultIngredients = [
            { id: 'i1', name: 'Saffron Threads (Kashmir Reserve)', category: 'premium', currentStock: 0.15, minRequired: 0.5, unit: 'kg' },
            { id: 'i2', name: 'Low-Fat Organic Paneer', category: 'protein', currentStock: 18, minRequired: 15, unit: 'kg' },
            { id: 'i3', name: 'Lean Organic Chicken Breast', category: 'protein', currentStock: 42, minRequired: 20, unit: 'kg' },
            { id: 'i4', name: 'Whey Protein Isolate (Vanilla)', category: 'premium', currentStock: 3.5, minRequired: 10, unit: 'kg' },
            { id: 'i5', name: 'Premium Steel Cut Oats', category: 'grain', currentStock: 35, minRequired: 15, unit: 'kg' },
            { id: 'i6', name: 'Norwegian Salmon Filets', category: 'premium', currentStock: 1.8, minRequired: 5, unit: 'kg' },
            { id: 'i7', name: 'Avocado Fruit Supply', category: 'grain', currentStock: 14, minRequired: 10, unit: 'units' },
          ];
          for (const ing of defaultIngredients) {
            await setDoc(doc(db, 'ingredients', ing.id), ing);
          }

          // 6. Default Kitchen Branches
          const defaultKitchens = [
            {
              id: 'k1',
              name: 'Taash Bhatti Central Kitchen',
              address: 'Mithanpura Chowk, near Club Road, Muzaffarpur, Bihar 842002',
              city: 'Muzaffarpur',
              lat: 26.1220,
              lng: 85.3780,
              geofenceRadius: 15,
              isActive: true,
              isTakingOrders: true,
              phone: '+91 98765 43210',
              managerName: 'Chef Rajesh Kumar',
              registeredAt: '2026-01-01'
            },
            {
              id: 'k2',
              name: 'Taash Bhatti Express Hub - Brahmpura',
              address: 'Brahmpura Main Road, Muzaffarpur, Bihar 842003',
              city: 'Muzaffarpur',
              lat: 26.1310,
              lng: 85.3620,
              geofenceRadius: 12,
              isActive: true,
              isTakingOrders: true,
              phone: '+91 98765 43211',
              managerName: 'Chef Amit Verma',
              registeredAt: '2026-01-01'
            }
          ];
          for (const k of defaultKitchens) {
            await setDoc(doc(db, 'kitchens', k.id), k);
          }

          console.log("All real-world high-fidelity baseline data seeded into Firestore successfully!");
        }
      } catch (err) {
        console.error("Silent seeder error:", err);
      }
    };
    checkAndSeed();
  }, []);

  // Sync kitchens from Firestore (strictly from backend, no fake hardcoded kitchens)
  useEffect(() => {
    const unsubscribeKitchens = onSnapshot(collection(db, 'kitchens'), (snapshot) => {
      const loadedKitchens: Kitchen[] = [];
      snapshot.forEach((doc) => {
        loadedKitchens.push(doc.data() as Kitchen);
      });
      setKitchens(loadedKitchens);
    }, (error) => {
      console.error("Error subscribing to kitchens in App.tsx:", error);
    });
    return () => unsubscribeKitchens();
  }, []);

  // Sync unread support ticket notifications
  useEffect(() => {
    const activeEmail = (user.email || fbUser?.email || "guest@taashbhatti.com").toLowerCase().trim();
    const q = query(
      collection(db, 'support_tickets'),
      where('userEmail', '==', activeEmail)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.unreadByCustomer || (data.status !== 'pending' && data.adminReply && data.unreadByCustomer !== false)) {
          count++;
        }
      });
      setUnreadMailCount(count);
    }, (err) => {
      console.warn("Support tickets unread count listener notice:", err);
    });

    return () => unsub();
  }, [user.email, fbUser?.email]);

  // Update user profile wrapper (synced to Firestore)
  const handleUpdateUser = async (updated: User) => {
    setUser(updated);
    if (auth.currentUser) {
      const pathForWrite = `users/${auth.currentUser.uid}`;
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          ...updated,
          uid: auth.currentUser.uid
        }, { merge: true });
        showToast("💾 Profile updated in secure cloud!");
      } catch (error) {
        console.error("Error writing user to Firestore:", error);
        handleFirestoreError(error, OperationType.WRITE, pathForWrite);
      }
    }
  };

  // Place order wrapper (synced to Firestore for both authenticated and guest users)
  const handlePlaceOrder = async (order: Order) => {
    const activeUserId = auth.currentUser?.uid || getGuestUserId();
    const orderWithUser: Order = {
      ...order,
      userId: activeUserId,
      customerName: user.name || order.customerName || 'Customer',
      customerPhone: user.phone || order.customerPhone || 'N/A',
    };
    const sanitizedOrder = sanitizeForFirestore(orderWithUser);
    const pathForWrite = `orders/${order.id}`;

    // Update local state and localStorage cache immediately
    setOrders((prev) => {
      const filtered = prev.filter(o => o.id !== order.id);
      const next = [orderWithUser, ...filtered];
      try {
        localStorage.setItem('fitzaika_orders_cache', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'orders', order.id), sanitizedOrder);
      smartPushService.cancelAbandonedCartPush();
      showToast("🎉 Order placed and live synced to Cloud KDS Counter!");
    } catch (error) {
      console.error("Error saving order to Firestore:", error);
      showToast("🎉 Order saved locally (offline mode)");
      try {
        handleFirestoreError(error, OperationType.WRITE, pathForWrite);
      } catch (e) {
        console.warn("Handled firestore error for orders write:", e);
      }
    }
  };

  // Auth Operations handlers
  const handleSignInWithEmail = async (email: string, pass: string) => {
    const emailClean = email.trim().toLowerCase();
    const passClean = pass.trim();

    setIdentityModal({
      isOpen: true,
      step: 'scanning',
      title: 'Authenticating Credentials...',
      subtitle: 'Verifying with TAASH BHATTI Cryptographic Vault',
    });

    try {
      await signInWithEmailAndPassword(auth, emailClean, passClean);

      setIdentityModal({
        isOpen: true,
        step: 'verifying',
        title: 'Confirming Security Credentials...',
        subtitle: 'Validating access policies and session tokens',
      });

      let targetGateway: 'customer' | 'admin' | 'partner' | 'support' | 'kitchen' = 'customer';

      try {
        const qAgent = query(collection(db, 'support_agents'), where('email', '==', emailClean));
        const snapAgent = await getDocs(qAgent);
        if (!snapAgent.empty) {
          targetGateway = 'support';
        } else {
          const qKM = query(collection(db, 'kitchen_managers'), where('email', '==', emailClean));
          const snapKM = await getDocs(qKM);
          if (!snapKM.empty) {
            const kmData = { id: snapKM.docs[0].id, ...snapKM.docs[0].data() };
            localStorage.setItem('fitzaika_active_km_session', JSON.stringify(kmData));
            targetGateway = 'kitchen';
          } else {
            const q = query(collection(db, 'delivery_partners'), where('email', '==', emailClean));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const partnerData = { id: snap.docs[0].id, ...snap.docs[0].data() };
              localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(partnerData));
              targetGateway = 'partner';
            } else if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
              setAdminEmailAttempt(emailClean);
              setAdminPasscodeVerified(true);
              localStorage.setItem('fitzaika_admin_verified', 'true');
              targetGateway = 'admin';
            }
          }
        }
      } catch (e) {
        if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
          setAdminEmailAttempt(emailClean);
          setAdminPasscodeVerified(true);
          localStorage.setItem('fitzaika_admin_verified', 'true');
          targetGateway = 'admin';
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 600));

      setIdentityModal({
        isOpen: true,
        step: 'confirmed',
        title: 'Identity Confirmed ✓',
        subtitle: 'Access granted. Loading your personalized interface...',
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      setCurrentGateway(targetGateway);
      localStorage.setItem('fitzaika_gateway', targetGateway);
      setIdentityModal(prev => ({ ...prev, isOpen: false }));

      if (targetGateway === 'admin') {
        showToast("👑 Admin console authenticated successfully!");
      } else if (targetGateway === 'partner') {
        showToast("🚴 Delivery Partner session activated!");
      } else if (targetGateway === 'support') {
        showToast("🎧 Support Desk session activated!");
      } else if (targetGateway === 'kitchen') {
        showToast("👨‍🍳 Kitchen Station Manager desk activated!");
      } else {
        showToast("🔐 Logged in successfully!");
      }

      return { success: true };
    } catch (err: any) {
      console.warn("Login authentication error:", err?.code || err?.message);

      setIdentityModal(prev => ({ ...prev, isOpen: false }));

      let friendlyError = "Invalid email or password.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = "Incorrect password. Please verify your password and try again.";
      } else if (err.code === 'auth/user-not-found') {
        friendlyError = "No account found with this email. Please verify your email or click 'NEW REGISTRY' to create an account.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid email address.";
      } else if (err.code === 'auth/user-disabled') {
        friendlyError = "This user account has been disabled.";
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = "Too many failed login attempts. Please wait a few moments and try again.";
      }

      return { success: false, error: friendlyError };
    }
  };

  const handleSignUpWithEmail = async (email: string, pass: string, name: string, goal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'general') => {
    const emailClean = email.trim().toLowerCase();
    const passClean = pass.trim();
    const isAdminEmail = emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com');
    
    if (isAdminEmail) {
      setAdminCreatingAccount(true);
      try {
        localStorage.removeItem('fitzaika_onboarding_done');
        localStorage.removeItem('fitzaika_cached_user_profile');
        
        // Actually register the admin account in Firebase Auth!
        const cred = await createUserWithEmailAndPassword(auth, emailClean, passClean);
        await updateProfile(cred.user, { displayName: name });
        
        const initialProfile: User = {
          name,
          email: emailClean,
          goal,
          preferredGymId: null,
          savedAddresses: [],
          savedPayments: [],
          onboardingCompleted: true,
        };
        await setDoc(doc(db, 'users', cred.user.uid), initialProfile);
        
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setAdminEmailAttempt(emailClean);
        setAdminCreatingAccount(false);
        showToast("🌱 Admin account registered successfully!");
        return { success: true };
      } catch (err: any) {
        console.error("Admin signup error:", err);
        setAdminCreatingAccount(false);
        let friendly = err.message || "Failed to register admin account.";
        if (err.code === 'auth/email-already-in-use') {
          friendly = "An account with this email already exists. Please use 'SECURE LOGIN' instead.";
        } else if (err.code === 'auth/weak-password') {
          friendly = "Password should be at least 6 characters long.";
        }
        return { success: false, error: friendly };
      }
    }

    try {
      localStorage.removeItem('fitzaika_onboarding_done');
      localStorage.removeItem('fitzaika_cached_user_profile');
      
      const cred = await createUserWithEmailAndPassword(auth, emailClean, passClean);
      await updateProfile(cred.user, { displayName: name });
      
      const initialProfile: User = {
        name,
        email: emailClean,
        goal,
        preferredGymId: null,
        savedAddresses: [],
        savedPayments: [],
        onboardingCompleted: false,
      };
      await setDoc(doc(db, 'users', cred.user.uid), initialProfile);
      
      showToast("🌱 Account registered & profiles synced!");
      return { success: true };
    } catch (err: any) {
      console.error("Registration error:", err);
      let friendly = err.message || "Failed to register account.";
      if (err.code === 'auth/email-already-in-use') {
        friendly = "An account with this email already exists. Please use 'SECURE LOGIN' instead.";
      } else if (err.code === 'auth/weak-password') {
        friendly = "Password should be at least 6 characters long.";
      } else if (err.code === 'auth/invalid-email') {
        friendly = "Please enter a valid email address.";
      }
      return { success: false, error: friendly };
    }
  };

  const handleSignInWithGoogle = async () => {
    setIdentityModal({
      isOpen: true,
      step: 'scanning',
      title: 'Authenticating Google Tokens...',
      subtitle: 'Verifying Google OAuth 2.0 Identity',
    });

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email;
      let targetGateway: 'customer' | 'admin' | 'partner' | 'support' | 'kitchen' = 'customer';

      setIdentityModal({
        isOpen: true,
        step: 'verifying',
        title: 'Confirming Security Credentials...',
        subtitle: 'Validating access policies and session tokens',
      });

      if (email) {
        const emailClean = email.trim().toLowerCase();
        try {
          const qAgent = query(collection(db, 'support_agents'), where('email', '==', emailClean));
          const snapAgent = await getDocs(qAgent);
          if (!snapAgent.empty) {
            targetGateway = 'support';
          } else {
            const qKM = query(collection(db, 'kitchen_managers'), where('email', '==', emailClean));
            const snapKM = await getDocs(qKM);
            if (!snapKM.empty) {
              const kmData = { id: snapKM.docs[0].id, ...snapKM.docs[0].data() };
              localStorage.setItem('fitzaika_active_km_session', JSON.stringify(kmData));
              targetGateway = 'kitchen';
            } else {
              const q = query(collection(db, 'delivery_partners'), where('email', '==', emailClean));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const partnerData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                localStorage.setItem('fitzaika_active_dp_session', JSON.stringify(partnerData));
                targetGateway = 'partner';
              } else if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
                setAdminEmailAttempt(emailClean);
                targetGateway = 'admin';
              }
            }
          }
        } catch (e) {
          if (emailClean === 'glixzytechmain@gmail.com' || emailClean.endsWith('@fitzaika.com') || emailClean.endsWith('@taashbhatti.com')) {
            setAdminEmailAttempt(emailClean);
            targetGateway = 'admin';
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 600));

      setIdentityModal({
        isOpen: true,
        step: 'confirmed',
        title: 'Identity Confirmed ✓',
        subtitle: 'Access granted. Loading your personalized interface...',
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      setCurrentGateway(targetGateway);
      localStorage.setItem('fitzaika_gateway', targetGateway);
      setIdentityModal(prev => ({ ...prev, isOpen: false }));

      if (targetGateway === 'admin') {
        showToast("🔒 Secure admin verification required.");
      } else if (targetGateway === 'partner') {
        showToast("🚴 Delivery Partner session activated!");
      } else if (targetGateway === 'support') {
        showToast("🎧 Support Desk session activated!");
      } else if (targetGateway === 'kitchen') {
        showToast("👨‍🍳 Kitchen Station Manager desk activated!");
      } else {
        showToast("🔐 Logged in with Google!");
      }

      return { success: true };
    } catch (err: any) {
      console.error(err);
      setIdentityModal(prev => ({ ...prev, isOpen: false }));
      return { success: false, error: err.message || "Google sign-in canceled or failed." };
    }
  };

  const handlePhoneAuthSuccess = (data: { user: User; fbUser: any; isNewUser: boolean }) => {
    setUser(data.user);
    setFbUser(data.fbUser);
    setShowAuthVerifyingOverlay(false);
    
    // Explicitly persist session in localStorage so the user is never logged out on app reopen
    try {
      localStorage.setItem('fitzaika_auth_session', 'true');
      localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(data.user));
      localStorage.setItem('fitzaika_cached_fb_user', JSON.stringify(data.fbUser));
    } catch (e) {}

    // Mark arrival prompt as handled so automatic timers don't open the map
    const activeUid = data.fbUser?.uid || data.user?.phone || 'user';
    sessionStorage.setItem(`taash_arrival_prompt_${activeUid}`, 'true');

    // SENSE SAVED ADDRESSES:
    const savedList = (data.user?.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0);
    const primaryAddr = (data.user?.address && data.user.address.trim().length > 0) ? data.user.address.trim() : (savedList[0] || '');
    const uniqueAddresses = Array.from(new Set([...savedList, ...(primaryAddr ? [primaryAddr] : [])]));
    const addressCount = uniqueAddresses.length;

    // Immediately suppress any background map or address selection windows
    setShowCityLocationModal(false);
    setShowSelectAddressModal(false);

    // Launch the aesthetic OnboardingFlowModal with big logo and step-by-step animations
    setOnboardingFlowState({
      isOpen: true,
      userDisplayName: data.user.name || null,
      userPhone: data.user.phone || null,
      mode: data.isNewUser ? 'signup' : 'login',
      savedAddressCount: addressCount,
      savedAddressPrimary: primaryAddr,
      isNewUser: data.isNewUser,
    });
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('fitzaika_auth_session');
      localStorage.removeItem('fitzaika_cached_fb_user');
      localStorage.removeItem('fitzaika_cached_user_profile');
      localStorage.removeItem('fitzaika_onboarding_done');
      localStorage.removeItem('fitzaika_admin_verified');
      localStorage.removeItem('fitzaika_active_dp_session');
      localStorage.setItem('fitzaika_gateway', 'customer');
      setCurrentGateway('customer');
      setFbUser(null);
      setUser({
        name: 'Guest Athlete',
        email: '',
        phone: '',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        goal: 'general',
        preferredGymId: '',
        savedAddresses: [],
        savedPayments: [],
      });
      await signOut(auth).catch(() => {});
      showToast("🔓 Logged out successfully.");
    } catch (err) {
      console.error(err);
      localStorage.removeItem('fitzaika_auth_session');
      localStorage.removeItem('fitzaika_cached_fb_user');
      localStorage.removeItem('fitzaika_cached_user_profile');
      setFbUser(null);
      setUser({
        name: 'Guest Athlete',
        email: '',
        phone: '',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        goal: 'general',
        preferredGymId: '',
        savedAddresses: [],
        savedPayments: [],
      });
      showToast("🔓 Logged out.");
    }
  };

  // Add Item to Cart
  const handleAddToCart = (meal: Meal) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.meal.id === meal.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { meal, quantity: 1 }];
    });
    showToast(`💪 ${meal.name.split(' ')[0]} added to cart!`);
  };

  // Modify Cart quantities
  const handleUpdateQuantity = (mealId: string, delta: number) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.meal.id === mealId);
      if (!existingItem && delta > 0) {
        const mealObj = meals.find((m) => m.id === mealId);
        if (mealObj) {
          return [...prev, { meal: mealObj, quantity: 1 }];
        }
      }
      return prev
        .map((item) => {
          if (item.meal.id === mealId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Remove Item from Cart
  const handleRemoveItem = (mealId: string) => {
    setCart((prev) => prev.filter((item) => item.meal.id !== mealId));
  };

  // Handle Like/Favorite Toggle for "MY DECK"
  const handleToggleLike = (mealId: string) => {
    setLikedMeals((prev) => {
      const isAlreadyInDeck = prev.includes(mealId);
      const updated = isAlreadyInDeck ? prev.filter((id) => id !== mealId) : [...prev, mealId];

      try {
        localStorage.setItem('fitzaika_deck_meals', JSON.stringify(updated));
      } catch (e) {}

      // If user is authenticated in Firestore, persist deck in their profile document
      if (auth.currentUser) {
        setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { deckMealIds: updated, favoriteMealIds: updated },
          { merge: true }
        ).catch((err) => console.warn('Could not sync deck to user document:', err));
      }

      if (!isAlreadyInDeck) {
        showToast('🃏 Dealt into MY DECK!');
      } else {
        showToast('🃏 Removed from MY DECK');
      }

      return updated;
    });
  };

  // Reorder past items
  const handleReorder = (items: OrderItem[]) => {
    if (!auth.currentUser) {
      alert("🔒 Authentication Required: Please sign in or register under the Vault tab to reorder past meal combos!");
      setActiveTab('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCart((prev) => {
      let updated = [...prev];
      items.forEach((reItem) => {
        const existingIdx = updated.findIndex((i) => i.meal.id === reItem.meal.id);
        if (existingIdx > -1) {
          updated[existingIdx].quantity += reItem.quantity;
        } else {
          updated.push({ ...reItem });
        }
      });
      return updated;
    });
    setCartOpen(true);
    showToast('🔄 Meal combo added to active checkout!');
  };

  // Select goal and forward to Menu
  const handleSelectGoal = (goal: 'fat_loss' | 'muscle_gain' | 'maintenance') => {
    setPreSelectedGoal(goal);
    setActiveTab('menu');
  };

  // Open detailed quick view directly (pass helper to other tabs)
  const [activeQuickViewMeal, setActiveQuickViewMeal] = useState<Meal | null>(null);

  // Update meal rating and reviewsCount locally and in open quick view
  const handleMealRatingUpdated = (mealId: string, newRating: number, newCount: number) => {
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, rating: newRating, reviewsCount: newCount } : m))
    );
    setActiveQuickViewMeal((prev) =>
      prev && prev.id === mealId ? { ...prev, rating: newRating, reviewsCount: newCount } : prev
    );
  };

  // Handle Delivered Order Rating & Reviews submission
  const handleRatingSubmitted = async (
    orderId: string,
    rating: number,
    tags: string[],
    feedback: string,
    dishReviews?: MealReview[]
  ) => {
    const rateData = {
      rating,
      tags,
      feedback,
      ratedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, deliveryRating: rateData } : o))
    );

    // Sync to Firestore order document
    try {
      await updateDoc(doc(db, 'orders', orderId), { deliveryRating: rateData }).catch(() => {});
    } catch (e) {
      console.warn("Could not sync deliveryRating to firestore:", e);
    }

    // Automatically generate/sync a SupportTicket with complete order & rider logistics dossier
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      const reviewTicketId = 'REV-' + Math.floor(100000 + Math.random() * 900000);
      const isNegative = rating <= 2;
      const riderName = targetOrder.deliveryPartnerName || (targetOrder as any).assignedRiderName;
      const riderPhone = targetOrder.deliveryPartnerPhone || (targetOrder as any).assignedRiderPhone;
      const riderVehicle = (targetOrder as any).deliveryPartnerVehicle || (targetOrder as any).assignedRiderVehicle || (targetOrder.deliveryVehicleNumber ? 'Motorbike' : undefined);
      const vehicleNum = targetOrder.deliveryVehicleNumber || (targetOrder as any).assignedRiderVehicleNumber;

      const reviewTicket = {
        id: reviewTicketId,
        userId: fbUser?.uid || targetOrder.userId || 'guest_' + Date.now(),
        userEmail: (user.email || targetOrder.customerPhone || 'guest@taashbhatti.com').toLowerCase().trim(),
        userName: user.name || targetOrder.customerName || 'Customer',
        userPhone: user.phone || targetOrder.customerPhone || undefined,

        // Delivered Rider & Logistics details
        deliveryPartnerId: targetOrder.deliveryPartnerId || (targetOrder as any).assignedRiderId || undefined,
        deliveryPartnerName: riderName || undefined,
        deliveryPartnerPhone: riderPhone || undefined,
        deliveryPartnerVehicle: riderVehicle || undefined,
        deliveryVehicleNumber: vehicleNum || undefined,
        deliveredAt: (targetOrder as any).deliveredAt || (targetOrder.status === 'delivered' ? targetOrder.date : undefined),
        riderAssigned: !!(targetOrder.deliveryPartnerId || riderName),
        assignedKitchenId: targetOrder.acceptedByKitchenId || targetOrder.kitchenId,
        assignedKitchenName: targetOrder.acceptedKitchenName || targetOrder.kitchenName || 'Central Kitchen Hub',
        assignedCity: (targetOrder as any).city || undefined,
        deliveryCity: (targetOrder as any).deliveryCity || (targetOrder as any).city || undefined,

        // Attached Order details
        orderId: targetOrder.id,
        orderDate: targetOrder.date,
        orderTotal: targetOrder.total,
        orderStatus: targetOrder.status,
        orderItemsSummary: targetOrder.items.map((i) => `${i.quantity}x ${i.meal.name}`).join(', '),
        orderDeliveryAddress: targetOrder.address,
        orderPaymentMethod: targetOrder.paymentMethod,
        orderFulfillmentMode: targetOrder.fulfillmentMode || 'delivery',
        orderDeliveryRating: rating,
        orderFeedbackTags: tags,

        type: isNegative ? 'complaint' : 'feedback',
        category: isNegative ? 'delivery_delay' : 'food_quality',
        subject: `${rating}★ Order Review - #${targetOrder.id}${riderName ? ` (Rider: ${riderName})` : ''}`,
        message: feedback.trim() || `Customer left a ${rating}/5 star rating for Order #${targetOrder.id}.${tags.length > 0 ? ` Tags: ${tags.join(', ')}.` : ''}`,
        rating: rating,
        priority: isNegative ? 'high' : 'low',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'support_tickets', reviewTicketId), sanitizeForFirestore(reviewTicket)).catch(() => {});
      } catch (err) {
        console.warn("Could not save review ticket to support_tickets:", err);
      }
    }

    showToast('⭐ Thank you for rating! Your review has been submitted.');
  };

  // DELIVERABLE READ-ONLY ORDER TRACKER (ACCESSIBLE EXCLUSIVELY VIA LINK, STRICTLY ISOLATED & READ-ONLY)
  if (deliverableOrderId) {
    return <DeliverableOrderTracker orderId={deliverableOrderId} />;
  }

  if (adminCreatingAccount) {
    return (
      <div className="fixed inset-0 bg-[#0B0F13] flex flex-col items-center justify-center text-white z-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-[#12181E] border border-brand-green/20 rounded-[32px] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative glowing background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-green/10 rounded-full blur-2xl pointer-events-none" />

          {/* Animated Spinner */}
          <div className="relative flex justify-center py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center text-brand-green text-xl font-bold"
            >
              ⚡
            </motion.div>
          </div>

          <div className="space-y-2">
            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-black uppercase tracking-wider text-brand-green"
            >
              Creating Admin Registry
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs mx-auto"
            >
              Generating secure keys, credentials and database entries in the TAASH BHATTI cloud ledger...
            </motion.p>
          </div>

          {/* Staggered text items or dynamic logs */}
          <div className="bg-[#0B0F13] border border-brand-green/10 rounded-2xl p-4.5 text-left font-mono text-[10px] text-gray-400 space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2"
            >
              <span className="text-brand-green">✓</span>
              <span>FIREBASE_AUTH: CREATING USER</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="flex items-center gap-2"
            >
              <span className="text-brand-green">✓</span>
              <span>FIRESTORE: INITIALIZING SCHEMA</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="flex items-center gap-2"
            >
              <span className="text-brand-orange animate-pulse">●</span>
              <span>RE-ESTABLISHING SECURE GATEWAY...</span>
            </motion.div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[#0B0F13] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.0, ease: "easeInOut" }}
              className="h-full bg-brand-green"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (adminEmailAttempt && !adminPasscodeVerified) {
    return (
      <AdminLoginPortal
        email={adminEmailAttempt}
        onVerify={() => {
          setAdminPasscodeVerified(true);
          setCurrentGateway('admin');
          localStorage.setItem('fitzaika_admin_verified', 'true');
          localStorage.setItem('fitzaika_gateway', 'admin');
        }}
        onCancel={async () => {
          setAdminEmailAttempt(null);
          setAdminPasscodeVerified(false);
          setCurrentGateway('customer');
          localStorage.removeItem('fitzaika_admin_verified');
          localStorage.setItem('fitzaika_gateway', 'customer');
          if (auth.currentUser) {
            await signOut(auth);
          }
        }}
      />
    );
  }

  if (currentGateway === 'support') {
    return (
      <CustomerSupportPortal
        onExitGateway={() => {
          setCurrentGateway('customer');
          localStorage.setItem('fitzaika_gateway', 'customer');
        }}
        allKitchens={kitchens}
        allOrders={orders}
      />
    );
  }

  if (currentGateway === 'partner') {
    return (
      <DeliveryPartnerApp
        onExitGateway={() => {
          setCurrentGateway('customer');
          localStorage.setItem('fitzaika_gateway', 'customer');
        }}
        allKitchens={kitchens}
        allOrders={orders}
        onUpdateOrderStatus={(orderId, newStatus) => {
          setOrders(prev => prev.map(o => o.id === orderId ? {
            ...o,
            status: newStatus,
            kdsStage: newStatus === 'delivered' ? 'delivered' : 'dispatched'
          } : o));
        }}
      />
    );
  }

  if (currentGateway === 'kitchen') {
    return (
      <KitchenManagerApp
        onExitGateway={() => {
          setCurrentGateway('customer');
          localStorage.setItem('fitzaika_gateway', 'customer');
        }}
        allKitchens={kitchens}
        allOrders={orders}
      />
    );
  }

  if (currentGateway === 'admin') {
    if (!adminPasscodeVerified) {
      return (
        <AdminLoginPortal
          email=""
          onVerify={() => {
            setAdminPasscodeVerified(true);
            setCurrentGateway('admin');
            localStorage.setItem('fitzaika_admin_verified', 'true');
            localStorage.setItem('fitzaika_gateway', 'admin');
          }}
          onCancel={async () => {
            setAdminEmailAttempt(null);
            setAdminPasscodeVerified(false);
            setCurrentGateway('customer');
            localStorage.removeItem('fitzaika_admin_verified');
            localStorage.setItem('fitzaika_gateway', 'customer');
            if (auth.currentUser) {
              await signOut(auth);
            }
          }}
        />
      );
    }
    return (
      <AdminPortal
        onExit={async () => {
          setAdminEmailAttempt(null);
          setAdminPasscodeVerified(false);
          setCurrentGateway('customer');
          localStorage.removeItem('fitzaika_admin_verified');
          localStorage.setItem('fitzaika_gateway', 'customer');
          if (auth.currentUser) {
            await signOut(auth);
          }
        }}
        onSwitchGateway={(gw) => {
          setCurrentGateway(gw);
          localStorage.setItem('fitzaika_gateway', gw);
        }}
        user={user}
        fbUser={fbUser}
        allKitchens={kitchens}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-cream/40 flex flex-col w-full pb-24 sm:pb-28">
      {/* GLOBAL DELIGHTFUL TAP & CLICK ANIMATION */}
      <TapFeedbackEffect />

      {/* BRAND TOP HEADER */}
      <Header
        selectedBhatti={selectedBhatti}
        onOpenBhattiSelector={() => setActiveTab('bhattis')}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        onOpenDeals={() => {
          setActiveTab('deals');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDeck={() => {
          setActiveTab('deck');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        deckCount={likedMeals.length}
        onOpenMailbox={() => setMailboxOpen(true)}
        unreadMailCount={unreadMailCount}
        onOpenNotifications={() => setShowNotificationPrompt(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenLocationSelector={() => {
          const allSaved = Array.from(
            new Set([
              ...(user.savedAddresses || []).filter((a): a is string => typeof a === 'string' && a.trim().length > 0),
              ...(user.address && user.address.trim().length > 0 ? [user.address.trim()] : [])
            ])
          );
          if (allSaved.length > 0) {
            setShowSelectAddressModal(true);
          } else {
            setShowCityLocationModal(true);
          }
        }}
        currentAddress={user.address || user.savedAddresses?.[0] || user.city || 'Muzaffarpur Hub'}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 🔔 RECEIVER TOP-LEFT BUBBLE DIALOGUE: When a friend wants to order for you */}
      {incomingBuddyRequest && (
        <div className="fixed top-18 left-3 sm:left-6 z-50 max-w-[340px] sm:max-w-sm w-[calc(100vw-24px)] bg-stone-900/95 backdrop-blur-md border-2 border-amber-400 rounded-3xl p-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center text-xl shrink-0 shadow-md">
              🃏
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  BUDDY DECK ALERT
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                {incomingBuddyRequest.senderName} wants to order for you!
              </h4>
              <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                They want to deal a feast from your saved deck to your address. Accept to generate your 2-hour approval code.
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
                    try {
                      await updateDoc(doc(db, 'buddy_deck_requests', incomingBuddyRequest.id), {
                        status: 'accepted',
                        approvalCode: code,
                        expiresAt
                      });
                    } catch (e) {
                      console.warn("Could not accept buddy request:", e);
                    }
                    setIncomingBuddyRequest(null);
                    setActiveTab('deck');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setToastMessage(`🎉 Request accepted! Your 6-digit code is: ${code}`);
                    setTimeout(() => setToastMessage(null), 6000);
                  }}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all text-center"
                >
                  Accept & Open Deck
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'buddy_deck_requests', incomingBuddyRequest.id), {
                        status: 'declined'
                      });
                    } catch (e) {}
                    setIncomingBuddyRequest(null);
                  }}
                  className="py-2 px-3 bg-white/10 hover:bg-white/20 text-stone-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎁 SURPRISE BUDDY ORDER NOTIFICATION: Left-side review-order style bubble */}
      {incomingBuddyOrderAlert && (
        <div className="fixed bottom-24 sm:bottom-10 left-3 sm:left-6 z-50 max-w-[360px] w-[calc(100vw-24px)] bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 border-2 border-amber-400 text-white rounded-3xl p-4 shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center text-2xl shrink-0 shadow-lg animate-bounce">
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  SURPRISE ORDER PLACED!
                </span>
                <button
                  type="button"
                  onClick={() => setIncomingBuddyOrderAlert(null)}
                  className="text-stone-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                {incomingBuddyOrderAlert.senderName} {incomingBuddyOrderAlert.senderPhone ? `(${incomingBuddyOrderAlert.senderPhone})` : ''} has placed an order for you!
              </h4>
              <p className="text-[11px] text-stone-300 mt-1 truncate">
                📍 Delivering to: <strong className="text-white">{incomingBuddyOrderAlert.address}</strong>
              </p>

              <button
                type="button"
                onClick={() => {
                  setIncomingBuddyOrderAlert(null);
                  setActiveTab('account');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Click here to track live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST BAR */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-brand-charcoal text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-brand-orange/30 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* RENDER ACTIVE TAB COHORT */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeTab
            onSelectGoal={handleSelectGoal}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddToCart={handleAddToCart}
            onQuickView={(meal) => setActiveQuickViewMeal(meal)}
            user={user}
            fbUser={fbUser}
            onRelaunchOnboarding={() => handleShowOnboarding(true)}
            meals={meals}
            cartMealIds={cart.map((i) => i.meal.id)}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}

        {activeTab === 'menu' && (
          <MenuTab
            onAddToCart={handleAddToCart}
            likedMeals={likedMeals}
            onToggleLike={handleToggleLike}
            selectedBhatti={selectedBhatti}
            allBhattis={kitchens}
            onOpenBhattisTab={() => {
              setActiveTab('bhattis');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            preSelectedGoal={preSelectedGoal}
            onClearPreSelectedGoal={() => setPreSelectedGoal(null)}
            onOpenDeals={() => {
              setActiveTab('deals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenGroupOrder={() => setShowGroupOrdering(true)}
            meals={meals}
            cartMealIds={cart.map((i) => i.meal.id)}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}

        {activeTab === 'deals' && (
          <DealsTab
            meals={meals}
            onAddToCart={(item) => {
              setCart((prev) => {
                const existingIndex = prev.findIndex(i => (i.meal.id === item.meal.id || (Boolean(i.dealId) && i.dealId === item.dealId)) && JSON.stringify(i.customization || {}) === JSON.stringify(item.customization || {}));
                if (existingIndex > -1) {
                  const updated = [...prev];
                  updated[existingIndex].quantity += item.quantity || 1;
                  return updated;
                }
                return [...prev, item];
              });
              setCartOpen(true);
            }}
            onOpenAdminPortal={() => {
              setCurrentGateway('admin');
              localStorage.setItem('fitzaika_gateway', 'admin');
            }}
            isAdmin={Boolean(fbUser && (fbUser.email?.includes('admin') || fbUser.email?.includes('taashbhatti')))}
          />
        )}

        {activeTab === 'deck' && (
          <MyDeckTab
            user={user}
            fbUser={fbUser}
            meals={meals}
            likedMeals={likedMeals}
            onToggleLike={handleToggleLike}
            onAddToCart={handleAddToCart}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCart={() => setCartOpen(true)}
          />
        )}

        {activeTab === 'buddydeck' && (
          <BuddyDeckView
            user={user}
            fbUser={fbUser}
            meals={meals}
            allKitchens={kitchens}
            onNavigateHome={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenOrders={() => {
              setActiveTab('account');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            initialDeckId={initialBuddyDeckId}
          />
        )}

        {activeTab === 'catering' && (
          <CateringPlannerTab
            onAddToCart={handleAddToCart}
            onOpenCart={() => setCartOpen(true)}
          />
        )}

        {activeTab === 'coach' && (
          <AICoachTab
            onAddToCart={handleAddToCart}
            onQuickView={(meal) => setActiveQuickViewMeal(meal)}
            meals={meals}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}

        {(activeTab === 'bhattis' || (activeTab as string) === 'gyms') && (
          <BhattisTab 
            selectedBhatti={selectedBhatti}
            onSelectBhatti={handleSelectBhatti}
            allKitchens={kitchens}
            onNavigateToMenu={() => {
              setActiveTab('menu');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'account' && (
          <AccountTab
            user={user}
            onUpdateUser={handleUpdateUser}
            orders={orders}
            kitchens={kitchens}
            onReorder={handleReorder}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            fbUser={fbUser}
            deckCount={likedMeals.length}
            onSignInWithEmail={handleSignInWithEmail}
            onSignUpWithEmail={handleSignUpWithEmail}
            onSignInWithGoogle={handleSignInWithGoogle}
            onPhoneAuthSuccess={handlePhoneAuthSuccess}
            onSignOut={handleSignOut}
            authChecking={authChecking}
            onRelaunchOnboarding={() => handleShowOnboarding(true)}
            onOpenMailbox={() => setMailboxOpen(true)}
            onOpenGroupOrder={handleOpenGroupOrderWithMeals}
            onOpenLegal={handleOpenLegal}
            onOpenPushTester={() => setShowPushTester(true)}
          />
        )}

        {/* CULINARY BRAND FOOTER & LEGAL NAVIGATION */}
        <footer className="mt-16 pt-8 pb-24 border-t border-brand-charcoal/10 text-center space-y-4 px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-brand-charcoal/70">
            <button
              type="button"
              onClick={() => handleOpenLegal('terms')}
              className="hover:text-brand-green underline underline-offset-4 decoration-brand-green/30 hover:decoration-brand-green transition-all cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span className="text-brand-charcoal/20 select-none">•</span>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-brand-green underline underline-offset-4 decoration-brand-green/30 hover:decoration-brand-green transition-all cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-brand-charcoal/20 select-none">•</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('account');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-brand-green underline underline-offset-4 decoration-brand-green/30 hover:decoration-brand-green transition-all cursor-pointer"
            >
              Customer Support & Grievances
            </button>
          </div>

          <p className="text-[11px] text-brand-charcoal/50 max-w-xl mx-auto leading-relaxed">
            © {new Date().getFullYear()} TAASH BHATTI Food Brand. Authentic Woodfire & Slow-Cooked Charcoal Specialties. Dedicated to stringent culinary hygiene, tamper-proof packaging, and patron data security.
          </p>
        </footer>
      </main>

      {/* SLIDE-OVER CHECKOUT DRAWER */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        selectedBhatti={selectedBhatti}
        user={user}
        onPlaceOrder={handlePlaceOrder}
        onClearCart={() => setCart([])}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onUpdateUser={handleUpdateUser}
        allKitchens={kitchens}
        allMeals={meals}
        likedMeals={likedMeals}
        onAddToCart={handleAddToCart}
      />

      {/* PERSISTENT MOBILE BOTTOM TAB RAIL */}
      <BottomNav activeTab={activeTab === 'buddydeck' ? 'deck' : activeTab} onChangeTab={(tab) => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />

      {/* QUICK VIEW GLOBAL BRIDGE PORTAL */}
      {activeQuickViewMeal && (
        <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl border-t border-brand-green/10 flex flex-col max-h-[90vh]">
            <div className="relative h-56 shrink-0">
              <img
                src={activeQuickViewMeal.image}
                alt={activeQuickViewMeal.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setActiveQuickViewMeal(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-brand-charcoal/80 text-white hover:bg-brand-charcoal transition-all"
              >
                ✕
              </button>

              {activeQuickViewMeal.rating && activeQuickViewMeal.rating > 0 ? (
                <div className="absolute bottom-4 left-4 bg-brand-charcoal/90 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                  ★ {activeQuickViewMeal.rating.toFixed(1)} Rating
                </div>
              ) : null}
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <div className="flex gap-2 mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeQuickViewMeal.isVeg ? 'bg-emerald-500' : 'bg-red-500'} inline-block my-auto`} />
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wider">
                    {activeQuickViewMeal.isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-brand-charcoal leading-tight">
                  {activeQuickViewMeal.name}
                </h3>
                <p className="text-xs text-brand-charcoal/70 mt-2 leading-relaxed">
                  {activeQuickViewMeal.description}
                </p>
              </div>

              {/* Meal Specs block */}
              <div className="bg-brand-cream border border-brand-orange/20 rounded-3xl p-4">
                <h4 className="text-[10px] font-black uppercase text-brand-orange tracking-wider mb-2.5">
                  ⭐ DISH SPECIFICATIONS
                </h4>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">PREP TIME</span>
                    <span className="text-sm font-black text-brand-charcoal">{activeQuickViewMeal.prepTimeMinutes || 20} min</span>
                  </div>
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">SPICINESS</span>
                    <span className="text-sm font-black text-brand-orange capitalize">{activeQuickViewMeal.spicyLevel}</span>
                  </div>
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">RATING</span>
                    <span className="text-sm font-black text-brand-green">
                      {activeQuickViewMeal.rating && activeQuickViewMeal.rating > 0
                        ? `★ ${activeQuickViewMeal.rating.toFixed(1)}`
                        : 'New Dish'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Checklists */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Category</span>
                  <span className="font-extrabold text-brand-green uppercase">{activeQuickViewMeal.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Serving Time</span>
                  <span className="font-extrabold text-brand-orange uppercase">{(activeQuickViewMeal.timings || []).join(' / ')}</span>
                </div>
              </div>

              {/* Dynamic Customer Reviews & Ratings */}
              <MealReviewsSection
                meal={activeQuickViewMeal}
                currentUser={user}
                onUpdateMealRating={handleMealRatingUpdated}
              />
            </div>

            <div className="p-4 bg-brand-cream border-t border-brand-green/10 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-brand-charcoal/40 block leading-none font-bold">TOTAL PRICE</span>
                <span className="text-xl font-black text-brand-charcoal">₹{activeQuickViewMeal.price}</span>
              </div>

              <CartQuantityButton
                quantity={cart.find((i) => i.meal.id === activeQuickViewMeal.id)?.quantity || 0}
                onAdd={() => handleAddToCart(activeQuickViewMeal)}
                onIncrement={() => handleUpdateQuantity(activeQuickViewMeal.id, 1)}
                onDecrement={() => handleUpdateQuantity(activeQuickViewMeal.id, -1)}
                disabled={activeQuickViewMeal.isAvailable === false}
                disabledLabel="Sold Out"
                addLabel="Add To Order"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAASH BHATTI 2-SECOND OPENING ANIMATION SPLASH */}
      {showOpeningSplash && (
        <TaashOpeningSplash onComplete={() => setShowOpeningSplash(false)} />
      )}

      {/* AUTHENTICATION & SESSION VERIFICATION OVERLAY (Only for authenticated Firebase users on page refresh / reopen) */}
      {showAuthVerifyingOverlay && fbUser && (
        <AuthVerifyingOverlay
          userDisplayName={user.name || fbUser?.displayName}
          userEmail={user.email || fbUser?.email}
          userPhone={user.phone}
          isLoggedIn={true}
          savedAddressCount={((user.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0)).length}
          savedAddressPrimary={user.address}
          onFinish={() => setShowAuthVerifyingOverlay(false)}
        />
      )}

      {/* IDENTITY VERIFICATION ANIMATION OVERLAY */}
      <IdentityVerificationModal
        isOpen={identityModal.isOpen}
        step={identityModal.step}
        title={identityModal.title}
        subtitle={identityModal.subtitle}
      />

      {/* SUPPORT MAILBOX DRAWER / MODAL */}
      <SupportMailboxModal
        isOpen={mailboxOpen}
        onClose={() => setMailboxOpen(false)}
        userEmail={user.email || fbUser?.email || "guest@taashbhatti.com"}
        onOpenNewTicket={() => {
          setMailboxOpen(false);
          setActiveTab('account');
        }}
      />

      {/* FIRST-TIME & MANUAL CITY GEOFENCE LOCATION SETUP MODAL */}
      <CityGeofenceSelectorModal
        isOpen={showCityLocationModal}
        onClose={() => setShowCityLocationModal(false)}
        currentCity={user.city || 'Muzaffarpur'}
        allKitchens={kitchens}
        onSaveLocation={handleSaveLocation}
      />

      {/* DELIVERY DESTINATION CHOOSER MODAL */}
      <SelectDeliveryAddressModal
        isOpen={showSelectAddressModal}
        onClose={() => setShowSelectAddressModal(false)}
        savedAddresses={Array.from(
          new Set([
            ...(user.savedAddresses || []).filter((a): a is string => typeof a === 'string' && a.trim().length > 0),
            ...(user.address && user.address.trim().length > 0 ? [user.address.trim()] : [])
          ])
        )}
        currentAddress={user.address || user.savedAddresses?.[0]}
        onSelectAddress={handleSelectDeliveryAddress}
        onAddNewAddress={() => {
          setShowSelectAddressModal(false);
          setShowCityLocationModal(true);
        }}
      />

      {/* TAASH BHATTI ONBOARDING FLOW MODAL (Aesthetic wait window with big logo, step-by-step animations & location hydration guard) */}
      {onboardingFlowState && (
        <OnboardingFlowModal
          isOpen={onboardingFlowState.isOpen}
          userDisplayName={onboardingFlowState.userDisplayName}
          userPhone={onboardingFlowState.userPhone}
          mode={onboardingFlowState.mode}
          savedAddressCount={onboardingFlowState.savedAddressCount}
          savedAddressPrimary={onboardingFlowState.savedAddressPrimary}
          onComplete={() => {
            const state = onboardingFlowState;
            setOnboardingFlowState(null);

            // Re-evaluate user profile at the exact moment onboarding finishes
            const freshSavedList = (user?.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0);
            const freshPrimaryAddr = (user?.address && user.address.trim().length > 0) ? user.address.trim() : (freshSavedList[0] || state.savedAddressPrimary || '');
            const freshUnique = Array.from(new Set([...freshSavedList, ...(freshPrimaryAddr ? [freshPrimaryAddr] : [])]));
            const count = freshUnique.length > 0 ? freshUnique.length : state.savedAddressCount;

            if (state.isNewUser) {
              // RULE 1: STRICTLY NO welcome back animation to signup/first time register users!
              showToast(`🎉 Welcome to TAASH BHATTI, ${user.name || 'Athlete'}!`);
              if (count === 0) {
                // If brand new user with 0 addresses, prompt map location picker
                setTimeout(() => {
                  setShowCityLocationModal(true);
                }, 400);
              }
            } else {
              // RULE 2: Returning user logging in!
              if (count > 0) {
                // OVERPOWER THE MAP WINDOW:
                setShowCityLocationModal(false);
                setShowSelectAddressModal(false);
                setWelcomeBackUser({
                  name: user.name || 'Athlete',
                  avatar: user.avatar,
                  address: freshPrimaryAddr,
                  addressCount: count,
                });
              } else {
                showToast(`📱 Welcome back, ${user.name}!`);
                setTimeout(() => {
                  setShowCityLocationModal(true);
                }, 400);
              }
            }
          }}
        />
      )}

      {/* RETURNING USER WELCOME BACK ANIMATION POPUP (OVERPOWERS MAP WINDOW) */}
      {welcomeBackUser && (
        <WelcomeBackModal
          isOpen={!!welcomeBackUser}
          onClose={() => setWelcomeBackUser(null)}
          userName={welcomeBackUser.name}
          avatar={welcomeBackUser.avatar}
          address={welcomeBackUser.address}
          addressCount={welcomeBackUser.addressCount}
          onChangeAddress={() => {
            setWelcomeBackUser(null);
            setShowSelectAddressModal(true);
          }}
        />
      )}

      {/* STEP 2: DEVICE NOTIFICATION PROMPT (GRAPHIC MODAL WITH PRECISION HOTSPOT) */}
      <NotificationPromptModal
        user={user}
        fbUser={fbUser}
        isOpenOverride={showNotificationPrompt}
        onCloseOverride={() => setShowNotificationPrompt(false)}
      />

      {/* FLOATING IN-APP NOTIFICATION BUBBLE: UPPER LEFT SIDE (HOME TAB) FOR DELIVERED ORDERS */}
      <FloatingDeliveredRateBubble
        order={activeTab === 'home' ? (orders.find((o) => o.status === 'delivered' && !o.deliveryRating) || null) : null}
        onOpenRatingModal={(ord) => setRatingModalOrder(ord)}
      />

      {/* DELIVERED ORDER RATING & REVIEW MODAL */}
      {ratingModalOrder && (
        <DeliveredOrderRatingModal
          order={ratingModalOrder}
          isOpen={!!ratingModalOrder}
          onClose={() => setRatingModalOrder(null)}
          currentUser={user}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      {/* SMART REAL-TIME NOTIFICATION ENGINE (Bhatti Wallet, order status, refund alerts) */}
      <SmartNotificationEngine
        user={user}
        onOpenOrderTracking={(orderId) => {
          setActiveTab('account');
        }}
        onOpenWallet={() => {
          setActiveTab('account');
        }}
      />

      {/* DEVELOPER MENU MODAL (Feature switches, customer page toggles, emergency order pausing) */}
      <DeveloperMenuModal
        isOpen={showDevMenu}
        onClose={() => setShowDevMenu(false)}
        flags={featureFlags}
        onUpdateFlags={(newFlags) => setFeatureFlags(newFlags)}
        meals={meals}
        onOpenPushTester={() => setShowPushTester(true)}
      />

      {/* 🚀 SMART LOCK-SCREEN PUSH NOTIFICATION TESTER MODAL (10 Automated Foodie Campaigns) */}
      <SmartPushTesterModal
        isOpen={showPushTester}
        onClose={() => setShowPushTester(false)}
        currentCartFirstDish={cart[0]?.meal?.name || 'Chicken Dum Biryani'}
        cityName={selectedBhatti?.city || 'Muzaffarpur'}
        walletBalance={
          ((user.goldenEmberBalance || 0) + (user.standardEmberBalance || 0)) ||
          user.walletBalance ||
          150
        }
      />

      {/* 📱 NATIVE ANDROID DOUBLE-TAP BACK EXIT PROMPT */}
      {backExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 rounded-full bg-[#10141d]/95 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 pointer-events-none">
          <span>Press back again to exit Taash Bhatti</span>
        </div>
      )}

      {/* 🍢 FLOATING BUBBLE: ACTIVE GROUP ORDER ROOM & ORDER TRACKING */}
      <GroupOrderFloatingBubble
        activeRoom={activeGroupRoom}
        placedGroupOrder={placedGroupOrder}
        isRoomModalOpen={showGroupOrdering}
        onOpenRoom={() => setShowGroupOrdering(true)}
        onTrackOrder={(_orderId) => {
          setActiveTab('account');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 🌟 GROUP ORDERING (TAASH DAWAT) ROOM VIEW */}
      {showGroupOrdering && (
        <GroupOrderRoomView
          user={user}
          fbUser={fbUser}
          guestId={getGuestUserId()}
          meals={meals}
          kitchens={kitchens}
          selectedBhatti={selectedBhatti}
          initialRoomId={urlGroupRoomId}
          initialPin={urlGroupPin}
          initialPreloadedMeals={groupOrderPreloadMeals || undefined}
          onActiveRoomChange={(room) => setActiveGroupRoom(room)}
          onClose={() => {
            setShowGroupOrdering(false);
            setGroupOrderPreloadMeals(null);
          }}
          onRequestSignIn={() => {
            setShowGroupOrdering(false);
            setActiveTab('account');
            showToast('🔐 Please sign in to create or join a Taash Feast Room');
          }}
          onAddOrderToApp={(newOrder) => {
            const updated = [newOrder, ...orders];
            updateOrdersWithCache(updated);
            setPlacedGroupOrder(newOrder);
            showToast(`🔥 Group Feast Order #${newOrder.id} placed & sent to woodfire kitchen!`);
          }}
          onOpenMenu={() => {
            setShowGroupOrdering(false);
            setActiveTab('menu');
          }}
        />
      )}

      {/* LEGAL & POLICIES MODAL (TERMS & CONDITIONS / PRIVACY POLICY) */}
      <LegalDocumentsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />

    </div>
  );
}
