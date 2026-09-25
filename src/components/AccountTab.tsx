/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShoppingBag,
  History,
  HelpCircle,
  Settings,
  Mail,
  MapPin,
  CreditCard,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  CheckCircle,
  Truck,
  Flame,
  Send,
  Sparkles,
  Lock,
  LogOut,
  Star,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Package,
  Bell,
  FileText,
  Phone,
  KeyRound,
  CloudRain,
  Share2,
  Copy,
  Wallet,
  Banknote,
  CheckCircle2,
  Gift,
  Users,
  Eye,
  EyeOff,
  Trash2,
  Gamepad2,
  Ticket,
  Compass,
} from 'lucide-react';
import { User, Order, FAQ, SubscriptionPlan, Meal, SupportTicket, ChatMessage, OrderDeliveryRating, Kitchen, MealReview } from '../types';
import { FAQS_DATA, SUBSCRIPTIONS_DATA } from '../data';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import LegalAgeConsentModal, { hasAcceptedLegalAgeConsent } from './LegalAgeConsentModal';
import InAppDeliveryMap from './InAppDeliveryMap';
import RainEffect from './RainEffect';
import { ImageUploader } from './ImageUploader';
import { clearAdminSession } from '../lib/security';
import OrderInvoiceModal from './OrderInvoiceModal';
import DeliveredOrderRatingModal from './DeliveredOrderRatingModal';
import PhoneAuthComponent from './PhoneAuthComponent';
import PhoneAuthModal from './PhoneAuthModal';
import BhattiWalletSection from './BhattiWalletSection';
import { motion, AnimatePresence } from 'motion/react';
import { canCustomerCancelOrder, cancelOrderWithInstantWalletRefund } from '../lib/walletService';
import { subscribeToUserWonRewards } from '../lib/gameonService';
import { WonRewardRecord } from '../types/gameon';

const DELIVERY_STAGES = [
  { key: 'sent', label: 'Order Sent', icon: '📨' },
  { key: 'kitchen_accepted', label: 'Kitchen Accepted', icon: '🏪' },
  { key: 'cooking', label: 'Preparation', icon: '🍳' },
  { key: 'prepared', label: 'Prepared', icon: '🍱' },
  { key: 'partner_accepted', label: 'Partner Accepted', icon: '🤝' },
  { key: 'at_kitchen', label: 'Arrived Kitchen', icon: '🏢' },
  { key: 'motorbike_live', label: 'Motorbike Live', icon: '🛵' },
  { key: 'meal_collected', label: 'Meal Collected', icon: '🎒' },
  { key: 'left_kitchen', label: 'Left Kitchen', icon: '🚀' },
  { key: 'delivering', label: 'En Route to You', icon: '📍' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

const TAKEAWAY_STAGES = [
  { key: 'sent', label: 'Order Sent', icon: '📨' },
  { key: 'kitchen_accepted', label: 'Kitchen Accepted', icon: '🏪' },
  { key: 'cooking', label: 'Chef Cooking', icon: '🍳' },
  { key: 'ready_for_pickup', label: 'Ready for Counter Pickup', icon: '🛍️' },
  { key: 'delivered', label: 'Order Collected', icon: '✅' },
];

function getTakeawayStageIndex(order: Order): number {
  const statusStr = (order.status as string) || '';
  if (statusStr === 'delivered') return 4;
  if (statusStr === 'ready_for_pickup' || statusStr === 'prepared' || statusStr === 'out_for_delivery') return 3;
  if (statusStr === 'cooking' || statusStr === 'preparing') return 2;
  if (order.acceptedKitchenName || statusStr === 'kitchen_accepted' || (order as any).kitchenAccepted) return 1;
  return 0; // sent
}

function getOrderStageIndex(order: Order): number {
  if (order.fulfillmentMode === 'takeaway') {
    return getTakeawayStageIndex(order);
  }
  const statusStr = (order.status as string) || '';
  const pickupStage = (order.kdsPickupStage as string) || '';
  const kdsStage = (order.kdsStage as string) || '';

  if (statusStr === 'delivered') return 10;
  
  // When rider confirms left kitchen or is out for delivery:
  // "Left Kitchen" (stage 8) MUST BE CHECKMARKED! So advance to stage 9 ("En Route to You")!
  if (
    statusStr === 'out_for_delivery' ||
    statusStr === 'delivering' ||
    pickupStage === 'picked_up' ||
    pickupStage === 'left_kitchen' ||
    order.riderArrivedAtCustomer
  ) {
    return 9;
  }
  
  // Rider has collected meal bag
  if (pickupStage === 'meal_collected' || statusStr === 'meal_collected') {
    return 7;
  }
  
  // The moment the rider arrives at the kitchen, show their location and Motorbike Live!
  // Stage 5 (Arrived Kitchen) is completed, Stage 6 (Motorbike Live) is current!
  if (
    pickupStage === 'arrived_kitchen' ||
    statusStr === 'at_kitchen' ||
    (order as any).riderStatus === 'arrived_kitchen'
  ) {
    return 6;
  }
  
  // Real check for assigned rider (only if kitchen accepted and rider assigned)
  const hasAssignedRider = Boolean(
    (order.deliveryPartnerId && order.deliveryPartnerId.trim() !== '') ||
    (order.deliveryPartnerName && order.deliveryPartnerName !== 'Delivery Partner' && order.deliveryPartnerName !== 'Unassigned Rider' && order.deliveryPartnerName !== 'Delivery Captain') ||
    ((order as any).assignedRiderName && (order as any).assignedRiderName !== 'Delivery Partner' && (order as any).assignedRiderName !== 'Unassigned Rider')
  );
  if (hasAssignedRider && (order.riderEnRoute || statusStr === 'partner_accepted')) return 4;
  if (statusStr === 'prepared' || statusStr === 'ready_for_pickup' || kdsStage === 'plated') return 3;
  if (statusStr === 'cooking' || statusStr === 'preparing' || kdsStage === 'preparing') return 2;
  if (order.acceptedByKitchenId || order.acceptedKitchenName || statusStr === 'kitchen_accepted' || (order as any).kitchenAccepted) return 1;
  return 0; // sent
}

function getSmartDeliveryEta(order: Order): string {
  if (order.status === 'delivered') return 'Delivered';
  const extra = (order.extraPrepMinutes || 0) + ((order as any).globalPrepDelayMinutes || 0);
  const extraTag = extra !== 0 ? ` (${extra > 0 ? '+' : ''}${extra}m adj)` : '';

  if (order.fulfillmentMode === 'takeaway') {
    const tStage = getTakeawayStageIndex(order);
    switch (tStage) {
      case 0: return `${20 + extra}-${25 + extra} Mins${extraTag}`;
      case 1: return `${15 + extra}-${20 + extra} Mins${extraTag}`;
      case 2: return `${10 + extra}-${15 + extra} Mins${extraTag}`;
      case 3: return 'Ready for Pickup 🛍️';
      default: return 'Collected';
    }
  }
  const stage = getOrderStageIndex(order);
  switch (stage) {
    case 0: return `${30 + extra}-${35 + extra} Mins${extraTag}`;
    case 1: return `${28 + extra}-${32 + extra} Mins${extraTag}`;
    case 2: return `${22 + extra}-${26 + extra} Mins${extraTag}`;
    case 3: return `${18 + extra}-${22 + extra} Mins${extraTag}`;
    case 4: return `${15 + extra}-${18 + extra} Mins${extraTag}`;
    case 5: return `${12 + extra}-${15 + extra} Mins${extraTag}`;
    case 6: return `${10 + extra}-${12 + extra} Mins${extraTag}`;
    case 7: return `${8 + extra}-${10 + extra} Mins${extraTag}`;
    case 8: return `${5 + extra}-${8 + extra} Mins${extraTag}`;
    case 9: return order.riderArrivedAtCustomer ? 'Arrived at Doorstep' : `${2 + extra}-${5 + extra} Mins${extraTag}`;
    default: return 'Delivered';
  }
}

function getInteractiveCustomerMessage(order: Order): { title: string; desc: string; bgClass: string; borderClass: string; textClass: string; icon: string } {
  const kitchenName = order.acceptedKitchenName || (order.acceptedByKitchenId ? order.kitchenName : '') || 'Partner Kitchen';
  const hasAssignedRider = Boolean(
    (order.deliveryPartnerId && order.deliveryPartnerId.trim() !== '') ||
    (order.deliveryPartnerName && order.deliveryPartnerName !== 'Delivery Partner' && order.deliveryPartnerName !== 'Unassigned Rider' && order.deliveryPartnerName !== 'Delivery Captain') ||
    ((order as any).assignedRiderName && (order as any).assignedRiderName !== 'Delivery Partner' && (order as any).assignedRiderName !== 'Unassigned Rider')
  );
  const riderName = hasAssignedRider ? (order.deliveryPartnerName || (order as any).assignedRiderName) : '';

  if (order.fulfillmentMode === 'takeaway') {
    const tStage = getTakeawayStageIndex(order);
    switch (tStage) {
      case 0:
        return {
          title: "Takeaway Order Sent",
          desc: "Order transmitted to kitchen. Waiting for kitchen counter acceptance.",
          bgClass: "bg-blue-50/80",
          borderClass: "border-blue-300",
          textClass: "text-blue-900",
          icon: "📨",
        };
      case 1:
        return {
          title: `Kitchen Accepted (${kitchenName})`,
          desc: `${kitchenName} accepted your takeaway order! Chef is starting preparation.`,
          bgClass: "bg-amber-50/80",
          borderClass: "border-amber-300",
          textClass: "text-amber-900",
          icon: "🏪",
        };
      case 2:
        return {
          title: "Chef Cooking Meal",
          desc: `Your fresh meal is being prepared at ${kitchenName}. You can start driving to the kitchen branch.`,
          bgClass: "bg-orange-50/80",
          borderClass: "border-orange-300",
          textClass: "text-orange-900",
          icon: "🍳",
        };
      case 3:
        return {
          title: `Ready for Counter Pickup 🛍️`,
          desc: `Your meal is hot & packed! Show your 4-Digit Pickup OTP at ${kitchenName} counter to receive your food.`,
          bgClass: "bg-emerald-50/90",
          borderClass: "border-emerald-400",
          textClass: "text-emerald-950",
          icon: "🛍️",
        };
      default:
        return {
          title: "Takeaway Order Completed!",
          desc: `You collected your order from ${kitchenName}. Enjoy your fresh Taash Bhatti meal!`,
          bgClass: "bg-emerald-50/80",
          borderClass: "border-emerald-300",
          textClass: "text-emerald-900",
          icon: "✅",
        };
    }
  }

  const stage = getOrderStageIndex(order);

  switch (stage) {
    case 0:
      return {
        title: "Order Sent",
        desc: "Order has been placed and transmitted. Waiting for a gourmet kitchen to accept.",
        bgClass: "bg-blue-50/80",
        borderClass: "border-blue-300",
        textClass: "text-blue-900",
        icon: "📨",
      };
    case 1:
      return {
        title: `Kitchen Accepted (${kitchenName})`,
        desc: `${kitchenName} accepted your order and assigned a head chef to prepare your meal!`,
        bgClass: "bg-amber-50/80",
        borderClass: "border-amber-300",
        textClass: "text-amber-900",
        icon: "🏪",
      };
    case 2:
      return {
        title: "Preparation in Kitchen",
        desc: "Chef is currently preparing your dish over authentic clay chulhas with signature spices.",
        bgClass: "bg-orange-50/80",
        borderClass: "border-orange-300",
        textClass: "text-orange-900",
        icon: "🍳",
      };
    case 3:
      return {
        title: "Prepared & Insulated",
        desc: "Your meal has been freshly cooked and packed into hot thermal sealed containers.",
        bgClass: "bg-teal-50/80",
        borderClass: "border-teal-300",
        textClass: "text-teal-900",
        icon: "🍱",
      };
    case 4:
      return {
        title: `Partner Accepted (${riderName})`,
        desc: `Rider ${riderName} accepted your order and is heading to ${kitchenName}.`,
        bgClass: "bg-emerald-50/80",
        borderClass: "border-emerald-300",
        textClass: "text-emerald-900",
        icon: "🤝",
      };
    case 5:
      return {
        title: `Rider Arrived at Kitchen`,
        desc: `Delivery Partner ${riderName} arrived at ${kitchenName} counter.`,
        bgClass: "bg-blue-50/80",
        borderClass: "border-blue-300",
        textClass: "text-blue-900",
        icon: "🏢",
      };
    case 6:
      return {
        title: `Motorbike Live GPS Active`,
        desc: `Delivery Partner ${riderName} is at ${kitchenName} hub. Live motorbike location is online on your tracking map!`,
        bgClass: "bg-indigo-50/80",
        borderClass: "border-indigo-300",
        textClass: "text-indigo-900",
        icon: "🛵",
      };
    case 7:
      return {
        title: `Meal Collected`,
        desc: `Rider ${riderName} verified your order items, checked hot seals, and collected your meal bag.`,
        bgClass: "bg-purple-50/80",
        borderClass: "border-purple-300",
        textClass: "text-purple-900",
        icon: "🎒",
      };
    case 8:
      return {
        title: `Left Kitchen`,
        desc: `Rider ${riderName} confirmed departure from ${kitchenName} hub and is en route.`,
        bgClass: "bg-indigo-50/80",
        borderClass: "border-indigo-300",
        textClass: "text-indigo-900",
        icon: "🚀",
      };
    case 9:
      return {
        title: order.riderArrivedAtCustomer ? `Rider Arrived at Doorstep!` : `En Route to Your Address`,
        desc: order.riderArrivedAtCustomer
          ? `Rider ${riderName} has arrived outside! Please share your 4-Digit Delivery OTP to receive your order.`
          : `Rider ${riderName} left ${kitchenName} and is driving to your location. Keep your 4-Digit Delivery OTP ready.`,
        bgClass: "bg-emerald-50/90",
        borderClass: "border-emerald-400",
        textClass: "text-emerald-950",
        icon: order.riderArrivedAtCustomer ? "📍" : "🛵",
      };
    default:
      return {
        title: "Order Delivered!",
        desc: "Your meal has been delivered. Enjoy your fresh Taash Bhatti feast!",
        bgClass: "bg-emerald-50/80",
        borderClass: "border-emerald-300",
        textClass: "text-emerald-900",
        icon: "✅",
      };
  }
}

interface AccountTabProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  orders: Order[];
  kitchens?: Kitchen[];
  onReorder: (items: any[]) => void;
  onSelectTab: (tab: any) => void;
  fbUser?: any;
  deckCount?: number;
  onSignInWithEmail?: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSignUpWithEmail?: (email: string, pass: string, name: string, goal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'general') => Promise<{ success: boolean; error?: string }>;
  onSignInWithGoogle?: () => Promise<{ success: boolean; error?: string }>;
  onSignInWithApple?: () => Promise<{ success: boolean; error?: string }>;
  onPhoneAuthSuccess?: (data: { user: User; fbUser: any; isNewUser: boolean }) => void;
  onSignOut?: () => void;
  authChecking?: boolean;
  onRelaunchOnboarding?: () => void;
  onOpenMailbox?: () => void;
  onOpenGroupOrder?: (preloadedItems?: any[]) => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
  onOpenPushTester?: () => void;
  onApplyReward?: (couponCode: string) => void;
  onStartTour?: () => void;
}


export default function AccountTab({
  user,
  onUpdateUser,
  orders,
  kitchens = [],
  onReorder,
  onSelectTab,
  fbUser,
  deckCount = 0,
  onSignInWithEmail,
  onSignUpWithEmail,
  onSignInWithGoogle,
  onSignInWithApple,
  onPhoneAuthSuccess,
  onSignOut,
  authChecking = false,
  onRelaunchOnboarding,
  onOpenMailbox,
  onOpenGroupOrder,
  onOpenLegal,
  onOpenPushTester,
  onApplyReward,
  onStartTour,
}: AccountTabProps) {
  // Navigation inside Account screen
  const [activeSubSection, setActiveSubSection] = useState<'profile' | 'orders' | 'support' | 'wallet' | 'rewards'>('profile');
  const [wonRewards, setWonRewards] = useState<WonRewardRecord[]>([]);
  const [copiedRewardCode, setCopiedRewardCode] = useState<string | null>(null);

  // Subscribe to user won rewards in real-time
  useEffect(() => {
    const uid = user.id || fbUser?.uid;
    if (!uid) {
      setWonRewards([]);
      return;
    }
    const unsub = subscribeToUserWonRewards(uid, (list) => {
      setWonRewards(list);
    });
    return () => unsub();
  }, [user.id, fbUser?.uid]);

  const handleCopyRewardCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedRewardCode(code);
      setTimeout(() => setCopiedRewardCode(null), 2000);
    } catch (e) {}
  };

  // Reorder Group Feast modal state
  const [reorderGroupModalOrder, setReorderGroupModalOrder] = useState<Order | null>(null);

  const handleReorderClick = (order: Order) => {
    if (order.isGroupOrder) {
      setReorderGroupModalOrder(order);
    } else {
      onReorder(order.items);
    }
  };

  // Urgent Call Request state
  const [callReason, setCallReason] = useState('');
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);

  // FAQ collapse/expand tracker
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Profile Edit fields
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editGoal, setEditGoal] = useState(user.goal);

  const handleOpenEdit = () => {
    setEditName(user.name);
    setEditGoal(user.goal);
    setIsEditingProfile(true);
  };

  // Address modal/inputs
  const [newAddress, setNewAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);

  // ATP (All-Time Password) States
  const [showAtp, setShowAtp] = useState(false);
  const [atpCopied, setAtpCopied] = useState(false);
  const [isEditingAtp, setIsEditingAtp] = useState(false);
  const [newAtpInput, setNewAtpInput] = useState('');
  const [atpError, setAtpError] = useState<string | null>(null);
  const [isSavingAtp, setIsSavingAtp] = useState(false);
  const [generatedFallbackAtp, setGeneratedFallbackAtp] = useState<string>('');

  // Auto-generate ATP if phone is verified but no ATP is recorded
  useEffect(() => {
    if (user.phone && !user.atp && !generatedFallbackAtp) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedFallbackAtp(code);
      const targetId = fbUser?.uid || (user as any).id;
      if (targetId) {
        setDoc(doc(db, 'users', targetId), {
          atp: code,
          atpUpdatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
        onUpdateUser({
          ...user,
          atp: code,
          atpUpdatedAt: new Date().toISOString(),
        });
      }
    }
  }, [user.phone, user.atp, fbUser?.uid, generatedFallbackAtp]);

  const handleCopyAtp = () => {
    const codeToCopy = user.atp || generatedFallbackAtp;
    if (codeToCopy) {
      try {
        navigator.clipboard.writeText(codeToCopy);
      } catch (e) {}
      setAtpCopied(true);
      setTimeout(() => setAtpCopied(false), 2000);
    }
  };

  const handleSaveCustomAtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAtpError(null);
    const cleanPin = newAtpInput.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setAtpError("ATP must be exactly 6 numeric digits (0-9).");
      return;
    }

    setIsSavingAtp(true);
    try {
      const targetId = fbUser?.uid || (user as any).id;
      if (targetId) {
        await updateDoc(doc(db, 'users', targetId), {
          atp: cleanPin,
          atpUpdatedAt: new Date().toISOString(),
        });
      }
      onUpdateUser({
        ...user,
        atp: cleanPin,
        atpUpdatedAt: new Date().toISOString(),
      });
      setIsEditingAtp(false);
      setAtpCopied(false);
    } catch (err: any) {
      setAtpError(err?.message || "Failed to update ATP. Please try again.");
    } finally {
      setIsSavingAtp(false);
    }
  };

  // Email Linking States (Optional for phone signups, strictly unique)
  const [linkEmailInput, setLinkEmailInput] = useState('');
  const [linkEmailError, setLinkEmailError] = useState<string | null>(null);
  const [linkEmailSuccess, setLinkEmailSuccess] = useState<string | null>(null);
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkEmailError(null);
    setLinkEmailSuccess(null);
    const cleanEmail = linkEmailInput.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLinkEmailError("Please enter a valid email address.");
      return;
    }

    setIsLinkingEmail(true);
    try {
      // Enforce strict uniqueness across Firestore users collection
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      const currentUid = fbUser?.uid || (user as any).id;
      const isTaken = snap.docs.some(d => d.id !== currentUid);

      if (isTaken) {
        setLinkEmailError("This email address is already linked to another Taash Bhatti account. Please enter a different email.");
        setIsLinkingEmail(false);
        return;
      }

      if (currentUid) {
        await setDoc(doc(db, 'users', currentUid), {
          email: cleanEmail,
          emailLinkedAt: new Date().toISOString(),
        }, { merge: true });
      }

      onUpdateUser({
        ...user,
        email: cleanEmail,
      });

      setLinkEmailSuccess("Email linked successfully! You can now log in using either this email or your mobile phone.");
      setLinkEmailInput('');
    } catch (err: any) {
      console.error("Link email error:", err);
      setLinkEmailError(err?.message || "Failed to link email. Please check your network.");
    } finally {
      setIsLinkingEmail(false);
    }
  };

  // Detailed Support & Complaint form fields
  const [supportName, setSupportName] = useState(user.name || 'Guest');
  const [supportEmail, setSupportEmail] = useState(user.email || '');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportType, setSupportType] = useState<SupportTicket['type']>('complaint');
  const [supportCategory, setSupportCategory] = useState<SupportTicket['category']>('food_quality');
  const [supportPriority, setSupportPriority] = useState<SupportTicket['priority']>('medium');
  const [complaintIntensity, setComplaintIntensity] = useState<number>(2); // 1: Minor, 2: Moderate, 3: Severe, 4: Critical
  const [supportOrderId, setSupportOrderId] = useState<string>('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportImageUrl, setSupportImageUrl] = useState('');
  const [supportRating, setSupportRating] = useState<number>(5);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string>('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Local Order State for Live Chat & Rating updates
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [orderToCancelModal, setOrderToCancelModal] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('Changed my mind / Placed by mistake');
  const [isCancellingOrder, setIsCancellingOrder] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [ratingOrderFromHistory, setRatingOrderFromHistory] = useState<Order | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const handleCancelOrder = (orderId: string) => {
    const target = localOrders.find((o) => o.id === orderId) || orders.find((o) => o.id === orderId);
    if (!target) return;

    if (target.isGroupOrder || target.groupRoomId || target.isNonCancellable) {
      setStatusToast("🚫 Group orders are non-cancellable once confirmed.");
      setTimeout(() => setStatusToast(null), 4000);
      return;
    }

    if (!canCustomerCancelOrder(target)) {
      setStatusToast("❌ Order cannot be cancelled because the kitchen has already commenced cooking.");
      setTimeout(() => setStatusToast(null), 4000);
      return;
    }

    setOrderToCancelModal(target);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancelModal) return;
    if (orderToCancelModal.isGroupOrder || orderToCancelModal.groupRoomId || orderToCancelModal.isNonCancellable) {
      setStatusToast("🚫 Group orders are collaborative and non-cancellable.");
      setTimeout(() => setStatusToast(null), 4000);
      setOrderToCancelModal(null);
      return;
    }
    const orderId = orderToCancelModal.id;
    setIsCancellingOrder(true);

    try {
      const customerUserId = user.id || auth.currentUser?.uid || 'guest';
      const result = await cancelOrderWithInstantWalletRefund(
        orderToCancelModal,
        customerUserId,
        cancellationReason || 'Customer requested cancellation before cooking'
      );

      if (!result.success) {
        setStatusToast(`❌ ${result.error || 'Failed to cancel order'}`);
        setTimeout(() => setStatusToast(null), 4000);
        setIsCancellingOrder(false);
        return;
      }

      // Update user wallet balance and ledger locally ONLY if refund was actually granted
      if (result.isRefundGiven && result.refundedAmount > 0) {
        if (onUpdateUser) {
          const currentGolden = user.goldenEmberBalance || 0;
          const currentStandard = user.standardEmberBalance || 0;
          const newGolden = result.newGoldenBalance || (currentGolden + result.refundedAmount);
          const newTotal = newGolden + currentStandard;

          const newTx: any = {
            id: 'tx-gold-ref-' + Date.now(),
            type: 'credit',
            amount: result.refundedAmount,
            emberType: 'golden',
            description: `Golden Ember Refund for cancelled Order #${orderId.slice(-6)}`,
            orderId: orderId,
            createdAt: new Date().toISOString()
          };
          const updatedUser: User = {
            ...user,
            goldenEmberBalance: newGolden,
            walletBalance: newTotal,
            walletTransactions: [newTx, ...(user.walletTransactions || [])]
          };
          onUpdateUser(updatedUser);
        }

        setStatusToast(`💰 Order #${orderId.slice(-6)} cancelled! ₹${result.refundedAmount} refunded to your Bhatti Wallet as Golden Ember Coins.`);
      } else {
        // No refund given (e.g. COD, unaccepted/unpaid)
        setStatusToast(`🚫 Order #${orderId.slice(-6)} cancelled. ${result.refundDenialReason || 'No Ember tokens issued upon cancellation for this order.'}`);
      }

      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'cancelled',
                kdsStage: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'customer',
                cancellationReason: cancellationReason || 'Customer requested cancellation',
                refundStatus: result.isRefundGiven ? 'refunded_to_wallet' : 'no_refund',
                refundAmount: result.isRefundGiven ? result.refundedAmount : 0
              }
            : o
        )
      );

      setTimeout(() => setStatusToast(null), 5000);
      setOrderToCancelModal(null);
    } catch (e) {
      console.error("Failed to execute wallet refund cancellation:", e);
      setStatusToast(`❌ Error cancelling order. Please try again.`);
      setTimeout(() => setStatusToast(null), 4000);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleSendMessageToRider = async (orderId: string, text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      orderId,
      sender: 'customer',
      text,
      timestamp: now,
    };

    const targetOrder = localOrders.find((o) => o.id === orderId);
    const updatedChat = [...(targetOrder?.chatMessages || []), newMsg];

    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, chatMessages: updatedChat } : o))
    );

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { chatMessages: updatedChat });
    } catch (e) {
      console.warn("Failed to sync customer chat message to Firestore:", e);
    }
  };

  const handleRateOrderDelivery = async (orderId: string, rating: number, tags: string[], feedback: string) => {
    const rateData: OrderDeliveryRating = {
      rating,
      tags,
      feedback,
      ratedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const targetOrder = localOrders.find((o) => o.id === orderId) || orders.find((o) => o.id === orderId);

    setLocalOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return { ...o, deliveryRating: rateData };
        }
        return o;
      })
    );

    // Sync rating to Firestore order document
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { deliveryRating: rateData }).catch(() => {});
    } catch (e) {
      console.warn("Could not sync deliveryRating to firestore orders:", e);
    }

    // Automatically generate/sync a SupportTicket with complete order & delivered rider details so support team receives the review immediately!
    if (targetOrder) {
      const reviewTicketId = 'REV-' + Math.floor(100000 + Math.random() * 900000);
      const isNegative = rating <= 2;
      const riderName = targetOrder.deliveryPartnerName || (targetOrder as any).assignedRiderName;
      const riderPhone = targetOrder.deliveryPartnerPhone || (targetOrder as any).assignedRiderPhone;
      const riderVehicle = (targetOrder as any).deliveryPartnerVehicle || (targetOrder as any).assignedRiderVehicle || (targetOrder.deliveryVehicleNumber ? 'Motorbike' : undefined);
      const vehicleNum = targetOrder.deliveryVehicleNumber || (targetOrder as any).assignedRiderVehicleNumber;

      const reviewTicket: SupportTicket = {
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
        orderItemsSummary: targetOrder.items.map(i => `${i.quantity}x ${i.meal.name}`).join(', '),
        orderDeliveryAddress: targetOrder.address,
        orderPaymentMethod: targetOrder.paymentMethod,
        orderFulfillmentMode: targetOrder.fulfillmentMode || 'delivery',
        orderDeliveryRating: rating,
        orderFeedbackTags: tags,

        type: isNegative ? 'complaint' : 'feedback',
        category: isNegative ? 'delivery_delay' : 'food_quality',
        subject: `${rating}★ Delivery Review - Order #${targetOrder.id}${riderName ? ` (Rider: ${riderName})` : ''}`,
        message: feedback.trim() || `Customer left a ${rating}/5 star rating for Order #${targetOrder.id}.${tags.length > 0 ? ` Tags: ${tags.join(', ')}.` : ''}`,
        rating: rating,
        priority: isNegative ? 'high' : 'low',
        status: 'pending',
        createdAt: new Date().toISOString(),
        unreadByCustomer: false,
        unreadByAdmin: true,
      };

      try {
        const cleanReviewTicket = JSON.parse(JSON.stringify(reviewTicket));
        const docRef = doc(db, 'support_tickets', reviewTicketId);
        await setDoc(docRef, cleanReviewTicket).catch(() => {});

        const cached = localStorage.getItem('fitzaika_support_tickets');
        const list: SupportTicket[] = cached ? JSON.parse(cached) : [];
        list.unshift(reviewTicket);
        localStorage.setItem('fitzaika_support_tickets', JSON.stringify(list));
      } catch (err) {
        console.warn("Could not save review support ticket:", err);
      }
    }
  };

  const handleRequestUrgentCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callReason.trim()) return;
    setIsSubmittingCall(true);
    try {
      const ticketId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const callTicket: SupportTicket = {
        id: ticketId,
        type: 'complaint',
        category: 'general',
        priority: 'urgent',
        status: 'pending',
        isCallRequest: true,
        callStatus: 'pending_call',
        callRequestReason: callReason.trim(),
        subject: `🚨 URGENT CALL REQUEST: ${callReason.trim()}`,
        message: `Customer requested urgent phone callback regarding: "${callReason.trim()}". Registered phone: ${user.phone || 'N/A'}. User: ${user.name || 'Customer'}.`,
        userName: user.name || 'Customer',
        userPhone: user.phone || '',
        userEmail: user.email || '',
        userId: user.id || 'guest',
        createdAt: new Date().toISOString(),
        unreadByAdmin: true,
        unreadByCustomer: false,
      };

      await setDoc(doc(db, 'support_tickets', ticketId), callTicket);
      setCallSuccess(true);
    } catch (err) {
      console.error('Failed to dispatch call request:', err);
      alert('Unable to place callback request right now.');
    } finally {
      setIsSubmittingCall(false);
    }
  };

  // Local auth states
  const [authMode, setAuthMode] = useState<'phone' | 'email' | 'register'>('phone');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authGoal, setAuthGoal] = useState<'fat_loss' | 'muscle_gain' | 'maintenance'>('muscle_gain');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showGuestProfile, setShowGuestProfile] = useState(false);
  const [showPhoneLinkModal, setShowPhoneLinkModal] = useState(false);

  // Legal & Age Verification Consent Gate State (stored once per device in localStorage)
  const [hasLegalAgeConsent, setHasLegalAgeConsent] = useState(() => hasAcceptedLegalAgeConsent());

  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Permanent Delete Account State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (isRegistering) {
      if (!authEmail || !authPassword || !authName) {
        setAuthError("All fields are required for registration.");
        setAuthLoading(false);
        return;
      }
      const res = await onSignUpWithEmail?.(authEmail, authPassword, authName, authGoal);
      if (res && !res.success) {
        setAuthError(res.error || "Failed to create account.");
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError("Email and Password are required.");
        setAuthLoading(false);
        return;
      }
      const res = await onSignInWithEmail?.(authEmail, authPassword);
      if (res && !res.success) {
        setAuthError(res.error || "Failed to sign in.");
      }
    }
    setAuthLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const res = await onSignInWithGoogle?.();
    if (res && !res.success) {
      setAuthError(res.error || "Google sign-in canceled.");
    }
    setAuthLoading(false);
  };

  const handleAppleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const res = await onSignInWithApple?.();
    if (res && !res.success) {
      setAuthError(res.error || "Apple sign-in canceled.");
    }
    setAuthLoading(false);
  };

  // Handle changing user password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('New passwords do not match. Please verify.');
      return;
    }

    setChangePasswordLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No active user session found. Please sign in again.');
      }

      // If user has email and provided current password, re-authenticate first to prevent session expiration
      if (currentUser.email && currentPasswordInput) {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordInput);
          await reauthenticateWithCredential(currentUser, credential);
        } catch (reauthErr: any) {
          if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
            setChangePasswordError('Current password is incorrect. Please re-enter your current password.');
            setChangePasswordLoading(false);
            return;
          }
          console.warn('Reauth warning:', reauthErr);
        }
      }

      try {
        await updatePassword(currentUser, newPasswordInput);
        setChangePasswordSuccess('Password updated successfully! Your account credentials have been updated.');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setStatusToast('🔑 Account password updated successfully!');
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setChangePasswordSuccess(null);
        }, 2200);
      } catch (pwErr: any) {
        if (pwErr.code === 'auth/requires-recent-login') {
          if (!currentPasswordInput) {
            setChangePasswordError('For security, please enter your Current Password above to authorize this change.');
          } else {
            setChangePasswordError('Security check failed. Please re-enter your current password or sign in again.');
          }
          return;
        }
        throw pwErr;
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleSendResetPasswordEmail = async () => {
    const targetEmail = fbUser?.email || user.email;
    if (!targetEmail || targetEmail.includes('@taashbhatti.phone')) {
      setChangePasswordError('No standard email linked to this account.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetEmailSent(true);
      setStatusToast(`📧 Password reset email sent to ${targetEmail}`);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to send password reset email.');
    }
  };

  // Handle permanent account deletion from database and Firebase Auth
  const handlePermanentDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteAccountError('Please type "DELETE" in uppercase to confirm permanent deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const currentUser = auth.currentUser;
      const targetUid = currentUser?.uid || fbUser?.uid || user.id;

      // 1. If password provided and email user, re-authenticate first to satisfy Firebase security
      if (currentUser && currentUser.email && deletePasswordInput) {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email, deletePasswordInput);
          await reauthenticateWithCredential(currentUser, credential);
        } catch (reauthErr: any) {
          if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
            setDeleteAccountError('Security verification failed. Password is incorrect.');
            setIsDeletingAccount(false);
            return;
          }
          console.warn('Re-auth before deletion warning:', reauthErr);
        }
      }

      // 2. Permanently delete user document from Firestore (users/{uid})
      if (targetUid) {
        try {
          await deleteDoc(doc(db, 'users', targetUid));
        } catch (fsErr: any) {
          console.warn('Firestore user deletion warning:', fsErr);
        }
      }

      // 3. Permanently delete user from Firebase Authentication
      if (currentUser) {
        try {
          await deleteUser(currentUser);
        } catch (authErr: any) {
          if (authErr.code === 'auth/requires-recent-login') {
            if (!deletePasswordInput) {
              setDeleteAccountError('Security verification required: Please enter your password above to authorize permanent account deletion.');
              setIsDeletingAccount(false);
              return;
            }
            throw authErr;
          }
          console.warn('Firebase deleteUser warning:', authErr);
        }
      }

      // 4. Wipe all local device storage
      try {
        localStorage.removeItem('fitzaika_auth_session');
        localStorage.removeItem('fitzaika_cached_fb_user');
        localStorage.removeItem('fitzaika_cached_user_profile');
        localStorage.removeItem('fitzaika_onboarding_done');
        localStorage.removeItem('fitzaika_admin_verified');
        clearAdminSession();
        localStorage.removeItem('fitzaika_active_dp_session');
        localStorage.removeItem('tb_active_group_room_id');
        localStorage.removeItem('tb_group_room_pin');
        if (targetUid) {
          localStorage.removeItem(`taash_notifications_${targetUid}`);
        }
        localStorage.removeItem('taash_legal_age_consent_v1');
      } catch (storageErr) {
        console.warn('Storage cleanup warning:', storageErr);
      }

      // 5. Reset local state & sign out
      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
      setDeletePasswordInput('');
      onUpdateUser({
        name: 'Guest Athlete',
        email: '',
        phone: '',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        goal: 'general',
        preferredGymId: '',
        savedAddresses: [],
        savedPayments: [],
      });
      onSignOut?.();
      setShowGuestProfile(false);

      alert('Your Taash Bhatti account and all database records have been permanently deleted.');
    } catch (err: any) {
      setDeleteAccountError(err.message || 'Failed to permanently delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const activeOrders = localOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const pastOrders = localOrders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name: editName,
      goal: editGoal,
    });
    setIsEditingProfile(false);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    onUpdateUser({
      ...user,
      savedAddresses: [...user.savedAddresses, newAddress.trim()],
    });
    setNewAddress('');
    setShowAddressInput(false);
  };

  const handleRemoveAddress = (index: number) => {
    const updated = [...user.savedAddresses];
    updated.splice(index, 1);
    onUpdateUser({
      ...user,
      savedAddresses: updated,
    });
  };

  const handleAppendChipReason = (chipText: string) => {
    if (!supportMessage) {
      setSupportMessage(chipText);
    } else if (!supportMessage.includes(chipText)) {
      setSupportMessage(prev => `${prev}\n• ${chipText}`);
    }
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSubmittingSupport(true);
    const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    const ticketEmail = supportEmail.toLowerCase().trim() || user.email.toLowerCase().trim() || 'guest@fitzaika.com';

    // Derive priority from complaint intensity if type is complaint
    let finalPriority = supportPriority;
    if (supportType === 'complaint') {
      if (complaintIntensity === 1) finalPriority = 'low';
      else if (complaintIntensity === 2) finalPriority = 'medium';
      else if (complaintIntensity === 3) finalPriority = 'high';
      else if (complaintIntensity === 4) finalPriority = 'urgent';
    }

    // Lookup optional attached order & delivered rider details
    const cleanOrderId = supportOrderId.trim();
    const attachedOrder = cleanOrderId ? (orders.find(o => o.id === cleanOrderId) || localOrders.find(o => o.id === cleanOrderId)) : undefined;

    const riderName = attachedOrder?.deliveryPartnerName || (attachedOrder as any)?.assignedRiderName;
    const riderPhone = attachedOrder?.deliveryPartnerPhone || (attachedOrder as any)?.assignedRiderPhone;
    const riderVehicle = (attachedOrder as any)?.deliveryPartnerVehicle || (attachedOrder as any)?.assignedRiderVehicle || (attachedOrder?.deliveryVehicleNumber ? 'Motorbike' : undefined);
    const vehicleNum = attachedOrder?.deliveryVehicleNumber || (attachedOrder as any)?.assignedRiderVehicleNumber;

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: fbUser?.uid || attachedOrder?.userId || 'guest_' + Date.now(),
      userEmail: ticketEmail,
      userName: supportName.trim() || user.name || (attachedOrder?.customerName) || 'Customer',
      userPhone: supportPhone.trim() || user.phone || (attachedOrder?.customerPhone) || undefined,
      type: supportType,
      category: supportCategory,

      // Attached Order details
      orderId: cleanOrderId || undefined,
      orderDate: attachedOrder?.date,
      orderTotal: attachedOrder?.total,
      orderStatus: attachedOrder?.status,
      orderItemsSummary: attachedOrder?.items ? attachedOrder.items.map(i => `${i.quantity}x ${i.meal?.name || (i as any).name || 'Meal'}`).join(', ') : undefined,
      orderDeliveryAddress: attachedOrder?.address,
      orderPaymentMethod: attachedOrder?.paymentMethod,
      orderFulfillmentMode: attachedOrder?.fulfillmentMode || (attachedOrder ? 'delivery' : undefined),
      orderDeliveryRating: attachedOrder?.deliveryRating?.rating,
      orderFeedbackTags: attachedOrder?.deliveryRating?.tags,

      // Delivered Rider & Logistics details
      deliveryPartnerId: attachedOrder?.deliveryPartnerId || (attachedOrder as any)?.assignedRiderId || undefined,
      deliveryPartnerName: riderName || undefined,
      deliveryPartnerPhone: riderPhone || undefined,
      deliveryPartnerVehicle: riderVehicle || undefined,
      deliveryVehicleNumber: vehicleNum || undefined,
      deliveredAt: (attachedOrder as any)?.deliveredAt || (attachedOrder?.status === 'delivered' ? attachedOrder.date : undefined),
      riderAssigned: !!(attachedOrder?.deliveryPartnerId || riderName),
      assignedKitchenId: attachedOrder?.acceptedByKitchenId || attachedOrder?.kitchenId,
      assignedKitchenName: attachedOrder?.acceptedKitchenName || attachedOrder?.kitchenName || 'Kitchen Hub',
      assignedCity: (attachedOrder as any)?.city || undefined,
      deliveryCity: (attachedOrder as any)?.deliveryCity || (attachedOrder as any)?.city || undefined,

      subject: supportSubject.trim() || `${supportType.toUpperCase()} - ${supportCategory.replace(/_/g, ' ')}${cleanOrderId ? ` (Order #${cleanOrderId})` : ''}`,
      message: supportMessage.trim(),
      imageUrl: supportImageUrl.trim() || undefined,
      rating: supportType === 'feedback' ? supportRating : undefined,
      priority: finalPriority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      unreadByCustomer: false,
      unreadByAdmin: true,
    };

    try {
      // 1. Save to Firestore (strip undefined fields for Firestore compatibility)
      const cleanTicketData = JSON.parse(JSON.stringify(newTicket));
      const docRef = doc(db, 'support_tickets', ticketId);
      await setDoc(docRef, cleanTicketData).catch((err) => console.warn("Firestore support write warning:", err));

      // 2. Local storage caching for offline capability
      try {
        const cached = localStorage.getItem('fitzaika_support_tickets');
        const list: SupportTicket[] = cached ? JSON.parse(cached) : [];
        list.unshift(newTicket);
        localStorage.setItem('fitzaika_support_tickets', JSON.stringify(list));
      } catch (e) {
        console.warn("Local storage cache warning:", e);
      }

      setCreatedTicketId(ticketId);
      setSupportSuccess(true);
      setSupportMessage('');
      setSupportImageUrl('');
      setSupportSubject('');
      setSupportOrderId('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingSupport(false);
    }
  };


  const handleToggleFAQ = (id: string) => {
    if (expandedFAQ === id) setExpandedFAQ(null);
    else setExpandedFAQ(id);
  };

  if (authChecking) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-brand-charcoal/40 uppercase tracking-widest">Verifying User Credentials...</p>
      </div>
    );
  }

  if (!fbUser && !showGuestProfile) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* LEGAL & AGE VERIFICATION CONSENT GATE (appears once per device until data is cleared) */}
        <LegalAgeConsentModal
          isOpen={!hasLegalAgeConsent}
          onAccept={() => setHasLegalAgeConsent(true)}
          onCancel={() => setShowGuestProfile(true)}
          onOpenLegal={onOpenLegal}
        />

        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-brand-charcoal tracking-tight">TAASH BHATTI Cloud Vault</h2>
          <p className="text-xs text-brand-charcoal/60 leading-relaxed max-w-sm mx-auto">
            Synchronize your custom meal orders, active delivery drop-offs, personalized recommendations, and dining schedules in the secure real-time cloud registry.
          </p>
        </div>

        <div className="bg-white border border-brand-green/10 rounded-[32px] p-6 shadow-xl space-y-5">
          {/* TABS */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-brand-green/5 rounded-2xl border border-brand-green/5">
            <button
              onClick={() => { setAuthMode('phone'); setAuthError(null); }}
              className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer ${authMode === 'phone' ? 'bg-brand-green text-white shadow-md' : 'text-brand-charcoal/60 hover:text-brand-charcoal'}`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>PHONE OTP</span>
            </button>
            <button
              onClick={() => { setAuthMode('email'); setIsRegistering(false); setAuthError(null); }}
              className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer ${authMode === 'email' ? 'bg-brand-green text-white shadow-md' : 'text-brand-charcoal/60 hover:text-brand-charcoal'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>EMAIL</span>
            </button>
            <button
              onClick={() => { setAuthMode('register'); setIsRegistering(true); setAuthError(null); }}
              className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer ${authMode === 'register' ? 'bg-brand-green text-white shadow-md' : 'text-brand-charcoal/60 hover:text-brand-charcoal'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>REGISTER</span>
            </button>
          </div>

          {authMode === 'phone' ? (
            <PhoneAuthComponent
              onSuccess={(userData) => {
                onUpdateUser(userData.user);
                onPhoneAuthSuccess?.(userData);
              }}
              defaultName={authName}
            />
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siddharth Sharma"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@taashbhatti.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal transition-colors p-1 cursor-pointer focus:outline-none"
                    aria-label={showAuthPassword ? "Hide password" : "Show password"}
                    title={showAuthPassword ? "Hide password" : "Show password"}
                  >
                    {showAuthPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {authError && (
                <p className="text-[11px] text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200/40 text-center animate-shake">
                  ⚠️ {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : authMode === 'register' ? (
                  "REGISTER ANABOLIC PROFILE"
                ) : (
                  "SECURE LOGIN"
                )}
              </button>
            </form>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-green/10"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-brand-charcoal/30"><span className="bg-white px-3">Or Connect Via</span></div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full bg-white hover:bg-brand-cream/20 text-brand-charcoal border border-brand-green/10 font-black text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.29.98 15.49 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
              </svg>
              <span>Sign In with Google Account</span>
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={authLoading}
              className="w-full bg-[#000000] hover:bg-[#151515] text-white font-black text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.99-9.13-10.74-19.78-14.25-31.95-3.51-12.17-5.27-23.75-5.27-34.73 0-14.24 3.51-26.04 10.53-35.41 7.02-9.37 15.75-14.15 26.19-14.35 5.66 0 11.53 1.5 17.62 4.51 6.09 3.01 10.02 4.58 11.79 4.7 1.99-.24 6.13-1.85 12.43-4.83 6.3-2.98 11.95-4.35 16.96-4.11 14.79.73 26.24 6.26 34.36 16.59-13.06 7.9-19.46 18.73-19.22 32.49.24 10.51 4.16 19.34 11.76 26.49 7.6 7.15 16.66 11.24 27.18 12.27-2.67 8.04-6.19 16.27-10.55 24.69zM119.22 33.15c0-7.39 2.65-14.27 7.95-20.64 5.3-6.37 11.83-10.36 19.59-11.97.48 1.45.73 2.82.73 4.11 0 7.39-2.73 14.41-8.19 21.06-5.46 6.65-12.03 10.63-19.71 11.94-.24-1.45-.37-2.95-.37-4.5z"/>
              </svg>
              <span>Sign In with Apple</span>
            </button>

            {authMode !== 'phone' && (
              <button
                type="button"
                onClick={() => { setAuthMode('phone'); setAuthError(null); }}
                className="w-full bg-brand-cream/30 hover:bg-brand-cream/60 text-brand-charcoal border border-brand-green/10 font-bold text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-brand-green" />
                <span>Instant Mobile Number Login (OTP)</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowGuestProfile(true)}
          className="w-full text-center text-xs font-bold text-brand-charcoal/40 hover:text-brand-charcoal/80 transition-all uppercase tracking-widest py-2"
        >
          Skip & Browse Offline Profile ➜
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-6xl mx-auto px-4 pt-4">
      {/* PROFILE HEADER CARD */}
      <div className="bg-white border border-brand-green/10 rounded-3xl p-5 mb-5 shadow-xs flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-green text-brand-cream font-black flex items-center justify-center text-lg shadow-sm border border-brand-green/20">
            {fbUser && user.name ? user.name.split(' ').map((n) => n[0]).join('') : 'G'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-brand-charcoal">
                {fbUser ? (user.name || 'Customer') : 'Guest Customer'}
              </h3>
              {fbUser ? (
                <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> CLOUD SYNCED
                </span>
              ) : (
                <span className="text-[8px] font-black bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-brand-orange/20">
                  ⚠️ GUEST MODE
                </span>
              )}
            </div>
            <p className="text-xs text-brand-charcoal/50">
              {fbUser ? (user.phone ? `📱 ${user.phone}` : (user.email && !user.email.includes('@taashbhatti.phone') ? user.email : 'Cloud Member')) : 'Local offline session'}
            </p>
            {fbUser && (
              <span className="text-[9px] font-extrabold bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                🎯 {user.goal.replace('_', ' ')} Focus
              </span>
            )}
          </div>
        </div>
        {fbUser ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleOpenEdit();
                setActiveSubSection('profile');
              }}
              title="Profile Settings"
              className="p-2.5 rounded-xl bg-brand-cream/50 text-brand-green border border-brand-green/10 hover:bg-brand-cream transition-all cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setShowGuestProfile(false);
                onSignOut?.();
              }}
              title="Log Out"
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>LOGOUT</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!hasAcceptedLegalAgeConsent()) {
                setHasLegalAgeConsent(false);
              }
              setShowGuestProfile(false);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-green text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-brand-green/90 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>SIGN IN</span>
          </button>
        )}
      </div>

      {/* 🃏 MY DECK SHORTCUT CARD */}
      <div 
        onClick={() => {
          onSelectTab('deck');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-brand-charcoal via-zinc-900 to-brand-green/80 text-white border border-amber-400/30 shadow-md flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center text-xl font-black shrink-0 group-hover:scale-110 transition-transform">
            🃏
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                My Deck
              </h4>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-orange text-brand-charcoal">
                {deckCount} {deckCount === 1 ? 'Card' : 'Cards'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              3D flipping cards, secret chef specs & 1-tap reordering
            </p>
          </div>
        </div>

        <div className="text-xs font-black text-amber-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          <span>View Hand</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* INTERNAL SUBSECTION BUTTONS */}
      <div className="grid grid-cols-5 gap-1 mb-5 bg-brand-green/5 p-1 rounded-2xl border border-brand-green/5">
        {[
          { id: 'profile', label: 'Preferences', icon: UserIcon },
          { id: 'orders', label: 'Orders', icon: ShoppingBag, count: activeOrders.length },
          {
            id: 'wallet',
            label: 'Wallet',
            icon: Flame,
            count: (((user.goldenEmberBalance || 0) + (user.standardEmberBalance || 0)) > 0
              ? `${(user.goldenEmberBalance || 0) + (user.standardEmberBalance || 0)} 🪙`
              : (user.walletBalance && user.walletBalance > 0 ? `${user.walletBalance} 🪙` : undefined))
          },
          {
            id: 'rewards',
            label: 'Rewards',
            icon: Gift,
            count: wonRewards.filter(r => !r.isRedeemed).length || undefined,
          },
          { id: 'support', label: 'Support', icon: HelpCircle },
        ].map((sub) => {
          const SubIcon = sub.icon;
          const isSelected = activeSubSection === sub.id;

          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveSubSection(sub.id as any);
                setIsEditingProfile(false);
              }}
              className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase text-center tracking-wider flex flex-col items-center gap-1 transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'text-brand-charcoal/60 hover:text-brand-green'
              }`}
            >
              <SubIcon className="w-4 h-4" />
              <span>{sub.label}</span>
              {sub.count && (typeof sub.count === 'number' ? sub.count > 0 : true) ? (
                <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-brand-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {sub.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 1. PREFERENCES / EDIT PROFILE */}
      {activeSubSection === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="bg-white border border-brand-green/10 rounded-3xl p-5 space-y-4 shadow-3xs">
              <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider border-b border-brand-green/5 pb-2">
                Edit Metabolic & Profile Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-brand-cream/25 border border-brand-green/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block mb-1">
                    Food Preference
                  </label>
                  <select
                    value={editGoal}
                    onChange={(e: any) => setEditGoal(e.target.value)}
                    className="w-full bg-brand-cream/25 border border-brand-green/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="general">🍲 All Bhatti Specialties</option>
                    <option value="veg">🌿 Pure Vegetarian</option>
                    <option value="non_veg">🍖 Tandoori & Non-Veg</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="w-1/2 bg-brand-cream border border-brand-green/15 text-brand-green py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-brand-green hover:bg-brand-green/90 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* If Guest Mode: show premium locker security banner */}
              {!fbUser && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-3xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> GUEST OFFLINE SESSION ACTIVE
                    </h5>
                    <p className="text-[11px] text-brand-charcoal/60 leading-relaxed max-w-xl">
                      Your meal preferences, custom order history, and saved addresses are running in temporary local memory. Synchronize with our secure Google-backed cloud vault to preserve your account registry forever.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!hasAcceptedLegalAgeConsent()) {
                        setHasLegalAgeConsent(false);
                      }
                      setShowGuestProfile(false);
                    }}
                    className="shrink-0 bg-brand-orange hover:bg-brand-orange/95 text-white font-black text-[10px] uppercase px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    🔒 SECURE VAULT
                  </button>
                </div>
              )}

              {/* Metabolic Profile calibration badge card (Only for authenticated users) */}
              {fbUser && (
                <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-brand-green/5 pb-2">
                    <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-orange animate-spin" style={{ animationDuration: '4s' }} /> Metabolic Profile Calibration
                    </span>
                    {user.onboardingCompleted ? (
                      <span className="text-[9px] font-black bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ✅ METABOLIC SYNCED
                      </span>
                    ) : (
                      <span className="text-[9px] font-black bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ⚠️ NOT CALIBRATED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-brand-cream/10 p-3 rounded-2xl border border-brand-green/5">
                      <span className="text-[9px] font-black text-brand-charcoal/40 block uppercase">Account Status</span>
                      <span className="text-xs font-extrabold text-brand-green mt-1 block uppercase">
                        Active Member
                      </span>
                    </div>
                    <div className="bg-brand-cream/10 p-3 rounded-2xl border border-brand-green/5">
                      <span className="text-[9px] font-black text-brand-charcoal/40 block uppercase">
                        {user.phone ? 'Phone Verified' : 'Email Verified'}
                      </span>
                      <span className="text-xs font-extrabold text-brand-charcoal mt-1 block">
                        {user.phone ? user.phone : (user.email && !user.email.includes('@taashbhatti.phone') ? user.email : 'Cloud Member')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Mobile Number Card */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs">
                <div className="flex items-center justify-between mb-3 border-b border-brand-green/5 pb-2">
                  <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-brand-orange" /> Mobile Phone & OTP Security
                  </span>
                  {user.phone ? (
                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> OTP VERIFIED
                    </span>
                  ) : (
                    <span className="text-[9px] font-black bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ACTION RECOMMENDED
                    </span>
                  )}
                </div>

                {user.phone ? (
                  <div className="flex items-center justify-between bg-brand-cream/20 p-3 rounded-2xl border border-brand-green/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center font-black text-sm">
                        📱
                      </div>
                      <div>
                        <span className="text-xs font-black text-brand-charcoal block">{user.phone}</span>
                        <span className="text-[10px] text-brand-charcoal/50">Verified for dispatch notifications & OTP sign-in</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhoneLinkModal(true)}
                      className="text-[10px] font-bold text-brand-orange hover:underline uppercase px-2 py-1 cursor-pointer"
                    >
                      Update Number
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-cream/20 p-3.5 rounded-2xl border border-brand-green/5">
                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-brand-charcoal block">No Phone Number Linked</span>
                      <span className="text-[10px] text-brand-charcoal/60 leading-relaxed block">
                        Add your mobile phone with 1-tap OTP verification to receive real-time rider tracking and instant SMS login.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhoneLinkModal(true)}
                      className="shrink-0 bg-brand-green hover:bg-brand-green/90 text-white font-black text-[10px] uppercase px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Phone className="w-3 h-3" />
                      <span>LINK PHONE WITH OTP</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ⚡ ALL-TIME PASSWORD (ATP) SECURITY CARD */}
              {user.phone && (
                <div className="bg-gradient-to-br from-amber-500/10 via-brand-cream/30 to-brand-orange/5 border border-amber-500/25 rounded-3xl p-5 shadow-3xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b border-amber-500/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-black text-xs">
                        ⚡
                      </div>
                      <div>
                        <span className="text-xs font-black text-brand-charcoal uppercase tracking-wider block">
                          All-Time Password (ATP)
                        </span>
                        <span className="text-[10px] text-brand-charcoal/60">Zero-wait OTP bypass for {user.phone}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black bg-amber-500/20 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/30">
                      COST SAVER &bull; ZERO SMS WAIT
                    </span>
                  </div>

                  <p className="text-[11px] text-brand-charcoal/70 leading-relaxed mb-3.5">
                    Your permanent 6-digit passcode for this phone number. Whenever you sign in, simply enter your ATP to bypass SMS delivery delays and log in instantly without waiting for cellular OTP.
                  </p>

                  <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-black text-brand-charcoal/40 uppercase block mb-1">Your 6-Digit ATP Code</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-lg font-black tracking-widest text-brand-charcoal select-all">
                          {showAtp ? (user.atp || generatedFallbackAtp || '------') : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAtp(!showAtp)}
                          className="text-brand-charcoal/50 hover:text-brand-charcoal p-1 rounded-lg hover:bg-brand-cream/40 transition-colors"
                          title={showAtp ? "Hide ATP" : "Reveal ATP"}
                        >
                          {showAtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      <button
                        type="button"
                        onClick={handleCopyAtp}
                        className="flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[11px] uppercase px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {atpCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{atpCopied ? 'COPIED!' : 'COPY ATP'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAtp(true);
                          setNewAtpInput(user.atp || generatedFallbackAtp || '');
                          setAtpError(null);
                        }}
                        className="flex-1 sm:flex-none bg-brand-charcoal hover:bg-black text-white font-extrabold text-[11px] uppercase px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>CHANGE ATP</span>
                      </button>
                    </div>
                  </div>

                  {/* Change ATP Inline Editor */}
                  {isEditingAtp && (
                    <form onSubmit={handleSaveCustomAtp} className="mt-3 bg-white p-3.5 rounded-2xl border border-amber-500/30 space-y-2.5">
                      <span className="text-[11px] font-black text-brand-charcoal uppercase block">
                        Set Custom 6-Digit All-Time Password
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          placeholder="e.g. 749210"
                          value={newAtpInput}
                          onChange={(e) => setNewAtpInput(e.target.value.replace(/\D/g, ''))}
                          className="flex-1 bg-brand-cream/20 border border-brand-green/20 rounded-xl px-3 py-2 text-sm font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isSavingAtp || newAtpInput.length !== 6}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[11px] uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          {isSavingAtp ? 'SAVING...' : 'SAVE PIN'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingAtp(false)}
                          className="text-brand-charcoal/60 hover:text-brand-charcoal text-[11px] font-bold px-3 py-2 cursor-pointer"
                        >
                          CANCEL
                        </button>
                      </div>
                      {atpError && <p className="text-[10px] font-bold text-red-600">{atpError}</p>}
                    </form>
                  )}
                </div>
              )}

              {/* 📧 EMAIL LINKING & ACCOUNT UNIFICATION */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs">
                <div className="flex items-center justify-between mb-3 border-b border-brand-green/5 pb-2">
                  <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-brand-orange" /> Linked Email & Cross-Login
                  </span>
                  {user.email && !user.email.includes('@taashbhatti.phone') ? (
                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> VERIFIED EMAIL
                    </span>
                  ) : (
                    <span className="text-[9px] font-black bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full uppercase tracking-wider">
                      OPTIONAL STEP
                    </span>
                  )}
                </div>

                {user.email && !user.email.includes('@taashbhatti.phone') ? (
                  <div className="flex items-center justify-between bg-brand-cream/20 p-3.5 rounded-2xl border border-brand-green/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center font-black text-sm">
                        ✉️
                      </div>
                      <div>
                        <span className="text-xs font-black text-brand-charcoal block">{user.email}</span>
                        <span className="text-[10px] text-brand-charcoal/50">Linked to this account. You can log in using either this email or your mobile number.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-brand-charcoal block">Link Your Email Address</span>
                      <p className="text-[10px] text-brand-charcoal/60 leading-relaxed">
                        Pure phone accounts do not require an email, but linking one enables seamless cross-login so you can sign in using either email or phone for this exact same account.
                      </p>
                    </div>

                    <form onSubmit={handleLinkEmail} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="e.g. yourname@gmail.com"
                          value={linkEmailInput}
                          onChange={(e) => {
                            setLinkEmailInput(e.target.value);
                            setLinkEmailError(null);
                          }}
                          className="flex-1 bg-brand-cream/15 border border-brand-green/15 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isLinkingEmail || !linkEmailInput.trim()}
                          className="bg-brand-green hover:bg-brand-green/90 disabled:opacity-50 text-white font-black text-[10px] uppercase px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                        >
                          {isLinkingEmail ? 'VERIFYING...' : 'LINK EMAIL'}
                        </button>
                      </div>

                      {linkEmailError && (
                        <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {linkEmailError}
                        </p>
                      )}
                      {linkEmailSuccess && (
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> {linkEmailSuccess}
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>

              {/* Address Book */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs">
                <div className="flex items-center justify-between mb-3 border-b border-brand-green/5 pb-2">
                  <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-orange" /> Saved Addresses
                  </span>
                  <button
                    onClick={() => setShowAddressInput(!showAddressInput)}
                    className="text-[10px] font-bold text-brand-orange uppercase hover:underline"
                  >
                    Add New
                  </button>
                </div>

                {showAddressInput && (
                  <form onSubmit={handleAddAddress} className="mb-4 bg-brand-cream/40 p-3 rounded-2xl border border-brand-green/10 space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. flat 201, Mithanpura Chowk or Powerhouse Gym reception..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full bg-white border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      required
                    />
                    <div className="flex justify-end gap-2 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setShowAddressInput(false)}
                        className="text-brand-charcoal/60 hover:underline px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-brand-green text-white px-3 py-1 rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}

                {user.savedAddresses.length === 0 ? (
                  <p className="text-xs text-brand-charcoal/50 py-2">No addresses added. Add one for standard delivery drops.</p>
                ) : (
                  <div className="space-y-2">
                    {user.savedAddresses.map((addr, index) => (
                      <div key={index} className="flex justify-between items-center bg-brand-cream/20 p-2.5 rounded-xl border border-brand-green/5 text-xs font-medium">
                        <span className="truncate max-w-[280px]">{addr}</span>
                        <button
                          onClick={() => handleRemoveAddress(index)}
                          className="text-rose-600 font-bold hover:underline text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs">
                <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-brand-green/5 pb-2">
                  <CreditCard className="w-4 h-4 text-brand-orange" /> Saved Payments
                </h4>

                <div className="space-y-2">
                  {user.savedPayments.map((pay) => (
                    <div key={pay.id} className="flex items-center gap-3 bg-brand-cream/15 p-2.5 rounded-xl border border-brand-green/5 text-xs">
                      <span className="text-xl">💳</span>
                      <div>
                        <span className="font-bold text-brand-charcoal block">{pay.type}</span>
                        <span className="text-[10px] text-brand-charcoal/50">{pay.details}</span>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-brand-orange/5 border border-dashed border-brand-orange/30 rounded-2xl text-[10px] text-brand-orange text-center font-bold">
                    🛡️ PCI-DSS Level 1 Secure Bank Gateways Linked
                  </div>
                </div>
              </div>

              {/* Push & In-App Notification Settings Card */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs space-y-4">
                <div className="flex items-center justify-between border-b border-brand-green/5 pb-2">
                  <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-brand-orange" /> Push & In-App Notification Engine
                  </h4>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    user.pushNotificationsEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}>
                    {user.pushNotificationsEnabled ? '🔔 ACTIVE' : '🔕 DISABLED'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-brand-cream/20 p-3.5 rounded-2xl border border-brand-green/10">
                  <div>
                    <span className="text-xs font-extrabold text-brand-charcoal block">Allow Hot Order & Promo Notifications</span>
                    <span className="text-[10px] text-brand-charcoal/60 block mt-0.5">
                      Receive real-time KDS kitchen cooking status, rider arrival alerts, and exclusive coupon drops.
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      checked={!!user.pushNotificationsEnabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        const choice = val ? 'enabled' : 'never';
                        localStorage.setItem('taash_notif_choice', choice);
                        if (val && typeof window !== 'undefined' && 'Notification' in window) {
                          Notification.requestPermission();
                        }
                        onUpdateUser({
                          ...user,
                          pushNotificationsEnabled: val,
                          notificationPromptChoice: choice,
                        });
                        if (fbUser?.uid) {
                          try {
                            await updateDoc(doc(db, 'users', fbUser.uid), {
                              pushNotificationsEnabled: val,
                              notificationPromptChoice: choice,
                              updatedAt: new Date().toISOString()
                            });
                          } catch (err) {
                            console.warn("Error saving notification toggle:", err);
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-orange/5 p-3 rounded-2xl border border-brand-orange/20 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-brand-orange uppercase block">Prompt Status</span>
                    <span className="text-[11px] text-brand-charcoal/70 font-semibold">
                      {user.notificationPromptChoice === 'enabled' ? 'User explicitly granted permission' :
                       user.notificationPromptChoice === 'later' ? 'Ask again in 72 hours (Remind later)' :
                       user.notificationPromptChoice === 'never' ? 'User chose Never Ask Again' :
                       'Default (Prompting enabled)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      localStorage.removeItem('taash_notif_choice');
                      localStorage.removeItem('taash_notif_last_prompt_time');
                      onUpdateUser({
                        ...user,
                        notificationPromptChoice: undefined,
                        lastNotificationPromptAt: undefined,
                      });
                      if (fbUser?.uid) {
                        try {
                          await updateDoc(doc(db, 'users', fbUser.uid), {
                            notificationPromptChoice: null,
                            lastNotificationPromptAt: null,
                          });
                        } catch (err) {
                          console.warn(err);
                        }
                      }
                      alert("✅ Notification prompt preference reset! You will see the prompt on next refresh.");
                    }}
                    className="px-3 py-1.5 bg-white border border-brand-orange/30 text-brand-orange font-bold text-[10px] uppercase rounded-xl hover:bg-brand-orange hover:text-white transition-all cursor-pointer whitespace-nowrap"
                  >
                    Reset Prompt Settings
                  </button>
                </div>
              </div>

              {/* App Onboarding & Visual Presentation */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-orange" /> Taash Bhatti Visual Onboarding
                  </h4>
                  <p className="text-[10px] text-brand-charcoal/55">
                    Experience the complete interactive gourmet onboarding animation with radar rings and kitchen calibration sequence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRelaunchOnboarding?.()}
                  className="w-full sm:w-auto bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/30 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> REPLAY ONBOARDING ANIMATION
                </button>
              </div>

              {/* Secure Cloud Controls */}
              {fbUser && (
                <div className="space-y-3">
                  <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                        🔒 SECURE VAULT PREFERENCES
                      </h4>
                      <p className="text-[10px] text-brand-charcoal/50">
                        Synchronized on: <b className="text-brand-charcoal">{user.phone || (fbUser.email && !fbUser.email.includes('@taashbhatti.phone') ? fbUser.email : 'Cloud Member')}</b>. All meal records safe.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePasswordModal(true);
                          setChangePasswordError(null);
                          setChangePasswordSuccess(null);
                        }}
                        className="w-full sm:w-auto bg-brand-cream/70 hover:bg-brand-cream border border-brand-green/20 text-brand-charcoal hover:text-brand-green px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-brand-green" /> CHANGE PASSWORD
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestProfile(false);
                          onSignOut?.();
                        }}
                        className="w-full sm:w-auto bg-brand-cream/60 border border-red-200 text-red-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <LogOut className="w-4 h-4" /> SECURE LOGOUT
                      </button>
                    </div>
                  </div>

                  {/* DANGER ZONE: PERMANENT ACCOUNT DELETION */}
                  <div className="bg-rose-50/50 border border-rose-200/80 rounded-3xl p-5 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" /> DANGER ZONE • ACCOUNT DELETION
                      </h4>
                      <p className="text-[10px] text-red-900/70 max-w-lg leading-relaxed">
                        Permanently erase your patron profile, dining vault, and credentials from our cloud database (<code className="font-mono text-[9px] bg-red-100 px-1 py-0.5 rounded">users/{fbUser?.uid || user.id || 'uid'}</code>). This operation is irreversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteAccountModal(true);
                        setDeleteAccountError(null);
                        setDeleteConfirmText('');
                        setDeletePasswordInput('');
                      }}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> DELETE ACCOUNT PERMANENTLY
                    </button>
                  </div>
                </div>
              )}

              {/* Culinary Governance & Legal Policies Card */}
              <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-brand-green/5 pb-2">
                  <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-orange" /> Legal Policies & Patron Protection
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-charcoal/5 text-brand-charcoal/70 font-bold uppercase">
                    Food Brand Governance
                  </span>
                </div>

                <p className="text-[11px] text-brand-charcoal/70 leading-relaxed">
                  TAASH BHATTI operates under stringent food safety hygiene standards, authentic clay handi packaging, and transparent customer data privacy governance.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenLegal?.('terms')}
                    className="p-3 rounded-2xl bg-brand-cream/40 hover:bg-brand-cream/80 border border-brand-green/15 text-brand-charcoal transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-800" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-brand-charcoal group-hover:text-brand-green transition-colors">
                          Terms & Conditions
                        </div>
                        <div className="text-[10px] text-brand-charcoal/55 font-medium">
                          Culinary services & order fulfillment
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-charcoal/40 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenLegal?.('privacy')}
                    className="p-3 rounded-2xl bg-brand-cream/40 hover:bg-brand-cream/80 border border-brand-green/15 text-brand-charcoal transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-800" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-brand-charcoal group-hover:text-brand-green transition-colors">
                          Privacy Policy
                        </div>
                        <div className="text-[10px] text-brand-charcoal/55 font-medium">
                          Data safety, address storage & rights
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-charcoal/40 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {onOpenPushTester && (
                    <button
                      type="button"
                      onClick={onOpenPushTester}
                      className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-brand-charcoal transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-brand-charcoal group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                            <span>Smart Push Notifications</span>
                            <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-bold">10 Campaigns</span>
                          </div>
                          <div className="text-[10px] text-brand-charcoal/60 font-medium">
                            Test lock-screen delivery & witty copy templates
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-charcoal/40 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. LIVE TRACKING & ORDERS */}
      {activeSubSection === 'orders' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Active Orders Trackers */}
          {activeOrders.length === 0 ? (
            <div className="p-8 text-center bg-white border border-brand-green/10 rounded-3xl shadow-3xs">
              <History className="w-10 h-10 text-brand-charcoal/20 mx-auto mb-2" />
              <h4 className="font-extrabold text-xs text-brand-charcoal">No current active orders</h4>
              <p className="text-[10px] text-brand-charcoal/50 mt-0.5">Explore our menu and discover authentic tandoori delights!</p>
              <button
                onClick={() => onSelectTab('menu')}
                className="mt-3.5 px-4 py-2 bg-brand-green text-white font-bold text-xs rounded-xl"
              >
                Go to Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order, idx) => {
                const currentStageIdx = getOrderStageIndex(order);
                const smartEta = getSmartDeliveryEta(order);
                const interactiveMsg = getInteractiveCustomerMessage(order);
                const riderName = order.deliveryPartnerName || (order as any).assignedRiderName;
                const riderPhone = order.deliveryPartnerPhone || (order as any).assignedRiderPhone;

                // Only orders formally accepted by a specific kitchen can be affected by rain mode to prevent confusion
                const isKitchenAccepted = Boolean(order.acceptedByKitchenId && order.acceptedByKitchenId.trim() !== '') && order.status !== 'sent' && order.status !== 'cancelled';

                const acceptedKitchen = isKitchenAccepted && order.acceptedByKitchenId
                  ? (kitchens || []).find(k => k.id === order.acceptedByKitchenId)
                  : null;
                const isRainingForOrder = Boolean(isKitchenAccepted && acceptedKitchen?.isRaining);
                const resolvedKitchenName = order.acceptedKitchenName || acceptedKitchen?.name || (order.acceptedByKitchenId ? order.kitchenName : '');
                const resolvedKitchenAddress = order.acceptedKitchenAddress || acceptedKitchen?.address || (acceptedKitchen?.city || '');
                const resolvedKitchenLat = order.acceptedKitchenLat || acceptedKitchen?.lat;
                const resolvedKitchenLng = order.acceptedKitchenLng || acceptedKitchen?.lng;

                let orderTime = order.createdAt ? new Date(order.createdAt).getTime() : currentTime;
                if (isNaN(orderTime)) orderTime = currentTime;
                const elapsedSeconds = Math.max(0, Math.floor((currentTime - orderTime) / 1000));
                const secondsRemainingForCancel = Math.max(0, 120 - elapsedSeconds);
                const canCancel = !isKitchenAccepted && elapsedSeconds >= 120 && order.status !== 'cancelled';

                return (
                  <div key={`active-ord-${order.id}-${idx}`} className={`bg-white border-2 ${isRainingForOrder ? 'border-sky-400 shadow-sky-950/10' : 'border-brand-green'} rounded-3xl p-4 sm:p-5 shadow-lg space-y-4 relative overflow-hidden`}>
                    {/* Atmospheric Rain Effect on Order Tracking Tab */}
                    {isRainingForOrder && (
                      <RainEffect density="light" speed={0.9} showSplashes={false} showMist={false} className="opacity-25" />
                    )}

                    {/* Header bar: Order ID & Smart ETA */}
                    <div className="flex items-center justify-between border-b border-brand-green/15 pb-3 relative z-10">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-brand-green uppercase tracking-widest block leading-none mb-0.5">TRACKING ORDER ID</span>
                          {isRainingForOrder && (
                            <span className="text-[8px] font-black bg-sky-500/20 text-sky-700 border border-sky-400/40 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <CloudRain className="w-2.5 h-2.5 text-sky-600 animate-bounce" />
                              Rain Mode
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black text-brand-charcoal">{order.id}</span>
                        {order.isBuddyOrder && (
                          <div className="mt-1">
                            {order.senderId === (fbUser?.uid || user.id) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9px]">
                                <Gift className="w-2.5 h-2.5 text-amber-700" /> Sent to {order.receiverName || 'Friend'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[9px]">
                                <Gift className="w-2.5 h-2.5 text-emerald-700" /> Received from {order.senderName || 'Friend'} {order.senderPhone ? `(${order.senderPhone})` : ''}
                              </span>
                            )}
                          </div>
                        )}
                        {order.isGroupOrder && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-800 border border-orange-400 font-black text-[10px]">
                              <Users className="w-3 h-3 text-orange-600" /> Group Ordered • Room {order.groupRoomCode || 'Taash Dawat'}
                            </span>
                            <span className="text-[9px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                              {order.groupTreatMode === 'your_treat' ? 'Host Treat 👑' : 'Split Bill 🤝'}
                            </span>
                            {order.isNonCancellable && (
                              <span className="text-[8px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                Non-Cancellable
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest block leading-none mb-0.5">SMART DELIVERY ETA</span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          <span>{smartEta}</span>
                        </span>
                      </div>
                    </div>

                    {/* CURRENTLY RAINING WEATHER ADVISORY BANNER */}
                    {isRainingForOrder && (
                      <div className="bg-gradient-to-r from-sky-950/95 via-blue-950/90 to-slate-900/95 border-2 border-sky-400/80 rounded-2xl p-4 text-sky-100 shadow-xl relative overflow-hidden flex items-start gap-3.5 animate-in fade-in duration-300 z-10">
                        <RainEffect density="medium" speed={1.1} showSplashes={false} showMist={false} className="opacity-30" />
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/25 border border-sky-400/50 flex items-center justify-center text-xl shrink-0 shadow-inner z-10">
                          <CloudRain className="w-5 h-5 text-sky-300 animate-bounce" />
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-sky-500/30 text-sky-200 border border-sky-400/40 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                              Currently Raining Mode Active
                            </span>
                            {resolvedKitchenName && (
                              <span className="text-[10px] text-sky-300 font-mono font-bold truncate">
                                ● {resolvedKitchenName}
                              </span>
                            )}
                          </div>
                          <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                            It's raining so we may take some time to deliver
                          </h5>
                          <p className="text-[11px] text-sky-200/90 font-medium mt-0.5 leading-relaxed">
                            Active rain has been reported near our kitchen. Our delivery partners are prioritizing safety and riding cautiously on wet roads. Thank you for your patience! ☔🛵
                          </p>
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE MULTI-STAGE STEPPER BAR (Real-Time updates matching requested sequence) */}
                    <div className="bg-brand-cream/30 border border-brand-green/10 rounded-2xl p-3">
                      <span className="text-[9px] font-black text-brand-green uppercase tracking-wider block mb-2.5">
                        {order.fulfillmentMode === 'takeaway' ? 'REAL-TIME TAKEAWAY PROGRESSION' : 'REAL-TIME ORDER STAGE PROGRESSION'}
                      </span>
                      <div className={`grid gap-1.5 text-center ${order.fulfillmentMode === 'takeaway' ? 'grid-cols-5' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-11'}`}>
                        {(order.fulfillmentMode === 'takeaway' ? TAKEAWAY_STAGES : DELIVERY_STAGES).map((stg, sIdx) => {
                          const isCompleted = sIdx < currentStageIdx;
                          const isCurrent = sIdx === currentStageIdx;

                          return (
                            <div key={stg.key} className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all shadow-xs ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-brand-orange text-white ring-4 ring-brand-orange/20 animate-pulse scale-105'
                                    : 'bg-white border border-gray-200 text-gray-400'
                                }`}
                              >
                                {isCompleted ? '✓' : stg.icon}
                              </div>
                              <span
                                className={`text-[8px] font-bold mt-1 leading-tight line-clamp-2 ${
                                  isCurrent ? 'text-brand-orange font-black' : isCompleted ? 'text-emerald-800' : 'text-gray-400'
                                }`}
                              >
                                {stg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* INTERACTIVE REAL-TIME STATUS MESSAGE CARD */}
                    <div className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 shadow-sm ${interactiveMsg.bgClass} ${interactiveMsg.borderClass} ${interactiveMsg.textClass}`}>
                      <span className="text-2xl shrink-0 mt-0.5">{interactiveMsg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-xs uppercase tracking-wide leading-tight mb-0.5">
                          {interactiveMsg.title}
                        </h5>
                        <p className="text-[11px] font-semibold leading-relaxed opacity-90">
                          {interactiveMsg.desc}
                        </p>
                      </div>
                    </div>

                    {/* ORDER CANCELLATION CONTROL BANNER */}
                    <div className="p-3.5 rounded-2xl border transition-all shadow-sm bg-white border-gray-200">
                      {order.isGroupOrder || order.groupRoomId || order.isNonCancellable ? (
                        <div className="flex items-center justify-between gap-3 text-xs bg-amber-50/90 border border-amber-300 p-3.5 rounded-2xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm shrink-0">👥</span>
                            <div className="min-w-0">
                              <span className="font-extrabold text-amber-950 block text-xs">Collaborative Group Feast Order</span>
                              <span className="text-[10px] text-amber-800 font-medium block truncate">
                                Group orders are strictly non-cancellable once placed to preserve shared cart and payment integrity.
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-200/90 text-amber-950 border border-amber-300 font-black text-[10px] rounded-xl shrink-0 uppercase tracking-wider">
                            Non-Cancellable
                          </span>
                        </div>
                      ) : order.status === 'cooking' || order.kdsStage === 'cooking' || order.cookingStartedAt ? (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm shrink-0">🍳</span>
                            <div className="min-w-0">
                              <span className="font-extrabold text-brand-charcoal block text-xs">Cooking In Progress</span>
                              <span className="text-[10px] text-gray-500 font-medium block truncate">
                                Chef has begun cooking your meal. Cancellation locked.
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-100/80 text-amber-900 border border-amber-300 font-black text-[10px] rounded-xl shrink-0 uppercase tracking-wider">
                            Non-Cancellable
                          </span>
                        </div>
                      ) : canCustomerCancelOrder(order) ? (
                        (() => {
                          const isCod =
                            (order.paymentMethod || '').toLowerCase() === 'cod' ||
                            (order.paymentMethod || '').toLowerCase() === 'cash' ||
                            (order.paymentMethod || '').toLowerCase() === 'cash_on_delivery' ||
                            Boolean((order as any).isCOD);

                          if (isCod) {
                            return (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50 border-2 border-stone-300 p-3.5 rounded-2xl">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                                    <Banknote className="w-3.5 h-3.5 text-stone-600" />
                                    <span>Cash on Delivery (COD) • Cancellation Available</span>
                                  </div>
                                  <p className="text-[10px] text-stone-600 font-semibold">
                                    Kitchen has not started cooking yet. Since this order is Cash on Delivery, no payment was collected upfront and ₹0 refund applies upon cancellation.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                                >
                                  <span>🚫 Cancel Order (No Refund - COD)</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/90 border-2 border-emerald-300 p-3.5 rounded-2xl">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Prepaid Order • Verified Instant Wallet Refund Available</span>
                                </div>
                                <p className="text-[10px] text-emerald-900/80 font-semibold">
                                  Kitchen has not started cooking yet. Since you paid ₹{order.total} upfront, canceling now will credit 100% back to your Bhatti Wallet as Golden Ember Coins immediately.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order.id)}
                                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                              >
                                <span>🚫 Cancel Order (Refund ₹{order.total})</span>
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-black text-sm shrink-0">🔒</span>
                            <div className="min-w-0">
                              <span className="font-extrabold text-brand-charcoal block text-xs">Order In Transit / Dispatched</span>
                              <span className="text-[10px] text-gray-500 font-medium block truncate">
                                Meal is packed and out with delivery partner.
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-300 font-black text-[10px] rounded-xl shrink-0 uppercase tracking-wider">
                            Non-Cancellable
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rider Details Banner - Only shown for Delivery orders */}
                    {riderName && order.fulfillmentMode !== 'takeaway' && (
                      <div className="bg-emerald-600 text-white rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-black text-xl shrink-0 animate-bounce">
                            🛵
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-emerald-200 tracking-wider block">
                              Assigned Delivery Partner
                            </span>
                            <span className="text-xs font-black block">
                              {riderName} (Motorbike Express)
                            </span>
                          </div>
                        </div>
                        {riderPhone && (
                          <a
                            href={`tel:${riderPhone}`}
                            className="bg-white text-emerald-800 text-[10px] font-black px-3.5 py-2 rounded-xl uppercase hover:bg-emerald-50 transition-all shrink-0 shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            📞 Call Partner
                          </a>
                        )}
                      </div>
                    )}

                    {/* Takeaway Pickup OTP Card OR Delivery OTP Card */}
                    {order.fulfillmentMode === 'takeaway' || order.takeawayPickupOtp ? (
                      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-3.5 text-center shadow-xs space-y-1">
                        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest block">
                          🛍️ TAKEAWAY COUNTER PICKUP OTP
                        </span>
                        <div className="flex items-center justify-center gap-2 my-1">
                          {(order.takeawayPickupOtp || '4921').split('').map((digit, dIdx) => (
                            <span key={dIdx} className="w-9 h-10 bg-white border-2 border-emerald-400/60 rounded-xl flex items-center justify-center text-lg font-black text-brand-charcoal shadow-sm">
                              {digit}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-emerald-900 font-extrabold leading-snug">
                          {resolvedKitchenName
                            ? `📍 Show this OTP at ${resolvedKitchenName} counter (${resolvedKitchenAddress || ''}) to collect your fresh order!`
                            : '📍 Show this OTP at the accepting kitchen counter to collect your fresh order once accepted.'}
                        </p>
                      </div>
                    ) : order.deliveryOtp ? (
                      <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 text-center shadow-xs">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                          🔑 YOUR SECURE DELIVERY OTP
                        </span>
                        <div className="flex items-center justify-center gap-2 my-1">
                          {order.deliveryOtp.split('').map((digit, dIdx) => (
                            <span key={dIdx} className="w-9 h-10 bg-white border-2 border-amber-400/60 rounded-xl flex items-center justify-center text-lg font-black text-brand-charcoal shadow-sm">
                              {digit}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-amber-900/80 font-bold mt-1.5 leading-snug">
                          ⚠️ Share this 4-digit code with your rider ONLY when they hand over your package!
                        </p>
                      </div>
                    ) : (currentStageIdx >= 6) ? (
                      <div className="bg-brand-cream/40 border border-brand-green/10 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-brand-charcoal/60">
                          🔑 Delivery OTP will be generated as soon as rider completes item collection.
                        </span>
                      </div>
                    ) : null}

                    {/* DELIVERABLE SHAREABLE LIVE TRACKING LINK BAR */}
                    <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-brand-green/15 text-brand-green flex items-center justify-center shrink-0">
                          <Share2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-brand-charcoal uppercase tracking-wider block">
                            Shareable Live Tracking Link
                          </span>
                          <span className="text-[10px] text-brand-charcoal/60">
                            Deliverable read-only link for family or friends to track this order live.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/?trackOrder=${order.id}`;
                            navigator.clipboard.writeText(link);
                            alert("✅ Live Tracking link copied! Anyone with this link can view real-time delivery status.");
                          }}
                          className="px-3 py-1.5 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-brand-green" />
                          Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/?trackOrder=${order.id}`;
                            const text = `🍗 Track my TAASH BHATTI Order #${order.id} live:\n${link}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* IN-APP REAL-TIME LIVE ROUTE RADAR MAP */}
                    <InAppDeliveryMap
                      acceptedByKitchenId={order.acceptedByKitchenId}
                      kitchenName={resolvedKitchenName}
                      kitchenAddress={resolvedKitchenAddress}
                      kitchenLat={resolvedKitchenLat}
                      kitchenLng={resolvedKitchenLng}
                      customerAddress={
                        (order.fulfillmentMode === 'takeaway' && (order.address.includes('TAASH BHATTI') || order.address.includes('Self-Pickup')))
                          ? (user?.savedAddresses?.[0] || 'User Selected Location')
                          : order.address
                      }
                      customerLat={order.deliveryLat || (order.fulfillmentMode !== 'takeaway' ? user.deliveryLat || user.addressLat : undefined)}
                      customerLng={order.deliveryLng || (order.fulfillmentMode !== 'takeaway' ? user.deliveryLng || user.addressLng : undefined)}
                      customerName={order.customerName || user?.name || "Gourmet Guest"}
                      customerPhone={order.customerPhone || user?.phone || ""}
                      riderName={riderName}
                      riderPhone={riderPhone}
                      riderLat={order.riderLat}
                      riderLng={order.riderLng}
                      riderLastUpdated={order.riderLastUpdated}
                      orderStatus={order.status}
                      orderId={order.id}
                      estimatedMinutes={smartEta}
                      chatMessages={order.chatMessages || []}
                      onSendMessage={(text) => handleSendMessageToRider(order.id, text)}
                      deliveryRating={order.deliveryRating}
                      onRateDelivery={(rating, tags, feedback) => handleRateOrderDelivery(order.id, rating, tags, feedback)}
                      isTakeaway={order.fulfillmentMode === 'takeaway'}
                      isRaining={isRainingForOrder}
                    />

                    {/* Summary list of order items with Customization details */}
                    <div className="bg-brand-cream/20 p-3 border border-brand-green/10 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold text-brand-charcoal/50 uppercase tracking-wider block">
                          Items In Package
                        </span>
                        {order.scheduledSlot && (
                          <span className="text-[9px] font-black text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                            ⏰ {order.scheduledSlot}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-xs font-semibold">
                        {order.items.map((it, itemIdx) => {
                          const custom = it.customization;
                          return (
                            <div key={itemIdx} className="space-y-0.5 border-b border-brand-green/5 pb-1 last:border-none">
                              <div className="flex justify-between items-center">
                                <span className="text-brand-charcoal line-clamp-1">{it.meal.name} (x{it.quantity})</span>
                                <span className="text-brand-charcoal/70 shrink-0 font-extrabold">₹{(it.meal.price * it.quantity)}</span>
                              </div>
                              {custom && (
                                <div className="text-[9px] text-brand-green font-bold flex flex-wrap gap-1">
                                  {custom.portionSize && <span className="uppercase">[{custom.portionSize}]</span>}
                                  {custom.spiceLevel && <span>[{custom.spiceLevel}]</span>}
                                  {custom.addOns && custom.addOns.map((a: any, ai: number) => (
                                    <span key={ai} className="text-brand-orange">+ {a.name}</span>
                                  ))}
                                  {custom.cookingInstruction && <span className="italic text-gray-500">"{custom.cookingInstruction}"</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Real-Time Order Tracking History Steps */}
                    {order.trackingSteps && order.trackingSteps.length > 0 && (
                      <div className="bg-white border border-brand-green/15 rounded-2xl p-3 space-y-2">
                        <span className="text-[9px] font-black text-brand-green uppercase tracking-wider block">
                          Real-time Order Telemetry Log
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {order.trackingSteps.map((step, stepIdx) => (
                            <div key={stepIdx} className="flex items-start gap-2 text-[10px]">
                              <span className="text-emerald-600 font-extrabold">✓</span>
                              <div>
                                <span className="font-bold text-brand-charcoal">{step.title}</span>
                                <p className="text-brand-charcoal/60 text-[9px]">{step.description} {step.time && `• ${step.time}`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Order Actions (Invoice & Rating) */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-brand-green/10 mt-2">
                      <button
                        type="button"
                        onClick={() => setInvoiceModalOrder(order)}
                        className="flex-1 min-w-[120px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 font-bold text-[10px] py-2 px-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>Tax Invoice</span>
                      </button>

                      {order.status === 'delivered' && (
                        <button
                          type="button"
                          onClick={() => setRatingOrderFromHistory(order)}
                          className="flex-1 min-w-[140px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] py-2 px-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Star className="w-3.5 h-3.5 fill-slate-950" />
                          <span>{order.deliveryRating ? `Edit Review (★${order.deliveryRating.rating})` : 'Rate Delivered Order'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Orders History */}
          <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs mt-5">
            <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-brand-green/5 pb-2">
              <History className="w-4 h-4 text-brand-orange" /> Historic Orders
            </h4>

            {pastOrders.length === 0 ? (
              <p className="text-xs text-brand-charcoal/50 text-center py-4 font-medium">Your ordered history is empty.</p>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order, idx) => (
                  <div key={`past-ord-${order.id}-${idx}`} className="bg-brand-cream/15 p-3.5 border border-brand-green/5 rounded-2xl text-xs flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-brand-charcoal block">{order.date}</span>
                        <span className="text-[9px] text-brand-charcoal/50 block">ID: {order.id}</span>
                        {order.isBuddyOrder && (
                          <div className="mt-0.5">
                            {order.senderId === (fbUser?.uid || user.id) ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[8px]">
                                <Gift className="w-2 h-2 text-amber-700" /> Sent to {order.receiverName || 'Friend'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[8px]">
                                <Gift className="w-2 h-2 text-emerald-700" /> Received from {order.senderName || 'Friend'}
                              </span>
                            )}
                          </div>
                        )}
                        {order.isGroupOrder && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300 font-extrabold text-[9px]">
                              <Users className="w-2.5 h-2.5 text-orange-700" /> Group Ordered {order.groupRoomCode ? `• Room ${order.groupRoomCode}` : ''}
                            </span>
                            <span className="text-[8px] font-bold text-stone-600 bg-white/80 px-1.5 py-0.2 rounded border border-stone-200">
                              {order.groupTreatMode === 'your_treat' ? 'Host Treat 👑' : 'Split Bill 🤝'}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {order.groupMembersSummary && order.groupMembersSummary.length > 0 && (
                      <div className="bg-white/80 p-2 rounded-xl border border-orange-200/80 text-[9px] text-stone-700">
                        <span className="font-extrabold text-orange-900 block mb-1">Feast Members Breakdown:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {order.groupMembersSummary.map((m, mIdx) => (
                            <span key={mIdx} className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 font-medium">
                              <strong>{m.memberName}:</strong> {m.itemsCount} dishes (₹{m.paidAmount}) {m.hasPaid ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-dashed border-brand-green/10 pt-2 flex justify-between items-center">
                      <div className="max-w-[200px] truncate font-medium text-brand-charcoal/80">
                        {order.items.map((it) => `${it.meal.name} (x${it.quantity})`).join(', ')}
                      </div>
                      <span className="font-extrabold text-brand-charcoal">₹{order.total}</span>
                    </div>

                    {/* Rider info badge if delivered */}
                    {(order.deliveryPartnerName || (order as any).assignedRiderName) && (
                      <div className="text-[10px] text-brand-charcoal/70 bg-white/80 p-2 rounded-xl border border-brand-green/10 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          🛵 <strong className="text-brand-charcoal">{order.deliveryPartnerName || (order as any).assignedRiderName}</strong>
                          {((order as any).deliveryVehicleNumber || (order as any).assignedRiderVehicleNumber) && (
                            <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {(order as any).deliveryVehicleNumber || (order as any).assignedRiderVehicleNumber}
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] text-emerald-700 font-bold">Delivered</span>
                      </div>
                    )}

                    {/* Interactive Actions Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <button
                        onClick={() => handleReorderClick(order)}
                        className="bg-brand-green/10 hover:bg-brand-green/15 text-brand-green font-bold text-[10px] py-2 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <RotateCcw className="w-3 h-3" /> Reorder
                      </button>

                      <button
                        onClick={() => setInvoiceModalOrder(order)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 font-bold text-[10px] py-2 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <FileText className="w-3 h-3 text-amber-700" /> Invoice
                      </button>

                      {order.status === 'delivered' && (
                        <button
                          onClick={() => setRatingOrderFromHistory(order)}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] py-2 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-all"
                        >
                          <Star className="w-3 h-3 fill-slate-950" />
                          {order.deliveryRating ? 'Review (★' + order.deliveryRating.rating + ')' : 'Rate Meal'}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSupportOrderId(order.id);
                          setSupportType('complaint');
                          setActiveSubSection('support');
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] py-2 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <AlertTriangle className="w-3 h-3 text-red-600" /> Support
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BASIC APP WALKTHROUGH & TUTORIAL REPLAY BUTTON */}
          {onStartTour && (
            <div className="pt-2">
              <button
                type="button"
                id="profile-replay-tour-btn"
                onClick={onStartTour}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-orange/10 to-amber-500/10 hover:from-amber-500/20 hover:to-brand-orange/20 border-2 border-dashed border-amber-400/60 text-brand-charcoal font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-xs group active:scale-98"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Compass className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />
                  </div>
                  <div>
                    <div className="font-black text-xs text-brand-charcoal flex items-center gap-1.5">
                      <span>Interactive App Tour & Tutorial</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] uppercase tracking-wider">Guide</span>
                    </div>
                    <div className="text-[10px] text-brand-charcoal/60 font-semibold mt-0.5">
                      Replay the step-by-step walkthrough of Menu, Deals, Cart, Coupons & Ordering anytime
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-orange group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          )}

        </div>
      )}

      {/* BHATTI WALLET & EMBER COINS (Dual-Vault Engine & Interactive Simulator) */}
      {activeSubSection === 'wallet' && (
        <BhattiWalletSection
          user={user}
          onUpdateUser={onUpdateUser}
          onNavigateToMenu={() => onSelectTab('menu')}
        />
      )}

      {/* 4. BHATTI GAMEON REWARDS & WON COUPONS VAULT */}
      {activeSubSection === 'rewards' && (
        <div className="space-y-4 animate-fade-in text-left">
          {/* BANNER HEADER */}
          <div className="bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#0c0a09] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    EXCLUSIVE VAULT
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  Arcade Rewards & Won Coupons
                </h3>
                <p className="text-xs text-stone-300 max-w-md leading-relaxed">
                  Coupons won via Bhatti GameOn physical table QR arenas. Locked strictly to your account to prevent sharing or unauthorized redemption.
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-amber-500/20 pt-3 sm:pt-0 sm:pl-5">
                <span className="text-[10px] text-stone-400 uppercase font-black tracking-wider">
                  Available Rewards
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {wonRewards.filter(r => !r.isRedeemed).length}
                </span>
              </div>
            </div>
          </div>

          {/* REWARDS LIST */}
          {wonRewards.length === 0 ? (
            <div className="bg-white border border-brand-green/10 rounded-3xl p-8 text-center space-y-4 shadow-3xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base font-extrabold text-brand-charcoal">
                  No Game Rewards Won Yet
                </h4>
                <p className="text-xs text-brand-charcoal/60 leading-relaxed">
                  Next time you dine at Taash Bhatti, scan the physical GameOn QR code on your table coaster or standee to play roulette, scratch cards, coin flips, or trivia!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('menu')}
                className="px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Browse Feast Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {wonRewards.map((reward) => {
                const isExpired = reward.expiryDate && new Date(reward.expiryDate) < new Date();
                const isUsable = !reward.isRedeemed && !isExpired;

                return (
                  <div
                    key={reward.id}
                    className={`rounded-3xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                      isUsable
                        ? 'bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-500/30 shadow-3xs hover:border-amber-500/50'
                        : 'bg-stone-50 border-stone-200 opacity-70'
                    }`}
                  >
                    {/* TOP INFO ROW */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">
                          🎮 {reward.gameTitle || 'Bhatti GameOn'}
                        </span>
                        {reward.isRedeemed ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            Redeemed
                          </span>
                        ) : isExpired ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready to Use
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-brand-charcoal leading-snug">
                        {reward.perkName || `Special Discount (${reward.couponCode})`}
                      </h4>
                      <p className="text-[11px] text-brand-charcoal/60 mt-0.5">
                        Won on {new Date(reward.wonAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • Valid until {reward.expiryDate}
                      </p>
                    </div>

                    {/* VINTAGE COUPON TICKET CUTOUT */}
                    <div className="bg-stone-900 rounded-2xl p-3 text-white flex items-center justify-between gap-2 border border-stone-800">
                      <div className="min-w-0">
                        <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold block">
                          Locked Coupon Code
                        </span>
                        <span className="text-sm font-mono font-black text-amber-300 tracking-wider truncate block">
                          {reward.couponCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyRewardCode(reward.couponCode)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedRewardCode === reward.couponCode ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* BOTTOM ACTIONS */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-brand-charcoal/50 flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Account Protected</span>
                      </span>

                      {isUsable && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onApplyReward) {
                              onApplyReward(reward.couponCode);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>Apply to Order</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. HELP / SUPPORT */}
      {activeSubSection === 'support' && (
        <div className="space-y-5 animate-fade-in">

          {/* URGENT ONE-CLICK CALL REQUEST */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                      Instant Call Assistance
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500 text-white tracking-widest">
                      URGENT
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-charcoal/70 mt-0.5">
                    Need immediate help with your live order or meal? Request a callback in one click.
                  </p>
                </div>
              </div>
            </div>

            {callSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-500/30 rounded-2xl text-emerald-800 space-y-1 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Callback Request Dispatched!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Our customer care executive is reviewing your request regarding "{callReason || 'your inquiry'}" and will call you on <strong>{user.phone || 'your phone'}</strong> within 3-5 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => setCallSuccess(false)}
                  className="mt-2 text-[10px] font-bold text-emerald-700 underline cursor-pointer"
                >
                  Request another callback
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestUrgentCall} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-brand-charcoal block">
                    Reason regarding call: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delivery rider is stuck, Food temperature issue, Change of address..."
                    value={callReason}
                    onChange={(e) => setCallReason(e.target.value)}
                    className="w-full bg-white border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
                  />

                  {/* Quick Preset Reason Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      '⏱️ Delivery Delayed',
                      '📍 Rider Gate/Address Issue',
                      '🍲 Food Temperature/Quality',
                      '🪙 Bhatti Wallet Question',
                      '📦 Missing Dish Item',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setCallReason(chip)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white border border-amber-500/20 text-brand-charcoal hover:border-amber-500 hover:bg-amber-100/50 transition-all cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-brand-charcoal/60 font-mono">
                    Calling to: <strong>{user.phone || '+91 User Phone'}</strong>
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmittingCall || !callReason.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCall ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5" />
                        <span>Request Urgent Call</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* FAQs Container */}
          <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs">
            <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider mb-4 border-b border-brand-green/5 pb-2">
              Frequently Asked Questions
            </h4>

            <div className="space-y-2.5">
              {FAQS_DATA.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;

                return (
                  <div key={faq.id} className="border-b border-brand-green/5 pb-2.5">
                    <button
                      onClick={() => handleToggleFAQ(faq.id)}
                      className="w-full flex justify-between items-center text-left py-1 group focus:outline-none"
                    >
                      <span className="text-xs font-extrabold text-brand-charcoal group-hover:text-brand-green transition-colors">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-brand-green shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-brand-charcoal/40 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <p className="text-[11px] text-brand-charcoal/65 mt-1.5 leading-relaxed bg-brand-cream/20 p-2.5 rounded-xl border border-brand-green/5">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Support Ticket & Complaint Form */}
          <div className="bg-white border border-brand-green/10 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-green/10 pb-3">
              <div>
                <h4 className="text-xs font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-brand-orange" /> Submit Complaint, Feedback or Inquiry
                </h4>
                <p className="text-[11px] text-brand-charcoal/60 mt-0.5">
                  Direct communication channel with TAASH BHATTI Executive Chefs & Customer Support
                </p>
              </div>

              {onOpenMailbox && (
                <button
                  type="button"
                  onClick={onOpenMailbox}
                  className="px-3.5 py-2 bg-brand-orange/15 hover:bg-brand-orange/25 border border-brand-orange/30 text-brand-orange font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Support Mailbox Thread</span>
                </button>
              )}
            </div>

            {supportSuccess ? (
              <div className="p-5 bg-brand-green/10 border-2 border-brand-green/30 rounded-2xl text-center text-brand-green space-y-3 animate-fade-in">
                <div className="w-12 h-12 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto text-brand-green">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-brand-green uppercase">Ticket Submitted Successfully!</h4>
                  <p className="text-xs text-brand-charcoal/70 font-mono mt-1">
                    Reference ID: <strong className="text-brand-orange font-black">{createdTicketId}</strong>
                  </p>
                  <p className="text-[11px] text-brand-charcoal/60 mt-1">
                    Your complaint/feedback has been routed to our Kitchen Quality Assurance Desk. Replies will appear in your Support Mailbox in real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {onOpenMailbox && (
                    <button
                      onClick={onOpenMailbox}
                      className="px-4 py-2 bg-brand-green text-white font-extrabold text-xs uppercase rounded-xl shadow-xs cursor-pointer"
                    >
                      View in Support Mailbox
                    </button>
                  )}
                  <button
                    onClick={() => setSupportSuccess(false)}
                    className="px-4 py-2 bg-brand-cream border border-brand-green/20 text-brand-charcoal font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Submit Another Query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitSupport} className="space-y-4">
                
                {/* 1. Ticket Type Tabs */}
                <div>
                  <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1.5 uppercase tracking-wider">
                    TICKET CLASSIFICATION TYPE *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'complaint', label: '🚨 Complaint', desc: 'Report Issue' },
                      { id: 'feedback', label: '⭐ Feedback', desc: 'Rate Meal' },
                      { id: 'suggestion', label: '💡 Suggestion', desc: 'Idea/Feature' },
                      { id: 'inquiry', label: '❓ Inquiry', desc: 'General Question' },
                    ].map((typeItem) => (
                      <button
                        key={typeItem.id}
                        type="button"
                        onClick={() => setSupportType(typeItem.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          supportType === typeItem.id
                            ? 'bg-brand-green/10 border-brand-green text-brand-green font-extrabold shadow-xs'
                            : 'bg-brand-cream/20 border-brand-green/10 text-brand-charcoal/70 hover:bg-brand-cream/40'
                        }`}
                      >
                        <span className="text-xs block">{typeItem.label}</span>
                        <span className="text-[9px] text-brand-charcoal/50 font-mono block">{typeItem.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. User Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">YOUR NAME *</label>
                    <input
                      type="text"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">EMAIL ADDRESS (OPTIONAL)</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="e.g. alex@gmail.com (Optional)"
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">PHONE NUMBER (OPTIONAL)</label>
                    <input
                      type="tel"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+91 98351..."
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                {/* 3. Category & Order ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">ISSUE CATEGORY *</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value as any)}
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                    >
                      <option value="food_quality">🍱 Food Quality & Taste</option>
                      <option value="delivery_delay">🛵 Locker / Delivery Delay</option>
                      <option value="wrong_item">📦 Missing or Wrong Item</option>
                      <option value="billing">💳 Billing or Refund Request</option>
                      <option value="app_bug">📱 App / Website Glitch</option>
                      <option value="general">❓ General Question</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">
                      ATTACH ORDER ID (OPTIONAL)
                    </label>
                    <select
                      value={supportOrderId}
                      onChange={(e) => setSupportOrderId(e.target.value)}
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none font-mono"
                    >
                      <option value="">-- Select Recent Order or Enter Below --</option>
                      {orders.map((ord) => {
                        const rName = ord.deliveryPartnerName || (ord as any).assignedRiderName;
                        return (
                          <option key={ord.id} value={ord.id}>
                            Order #{ord.id} ({ord.date}) - ₹{ord.total}{rName ? ` • Rider: ${rName}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* LIVE ATTACHED ORDER & DELIVERED RIDER DOSSIER PREVIEW */}
                {supportOrderId.trim() && (() => {
                  const cleanId = supportOrderId.trim();
                  const attached = orders.find(o => o.id === cleanId) || localOrders.find(o => o.id === cleanId);
                  if (!attached) return null;

                  const rName = attached.deliveryPartnerName || (attached as any).assignedRiderName;
                  const rPhone = attached.deliveryPartnerPhone || (attached as any).assignedRiderPhone;
                  const rVehicle = (attached as any).deliveryPartnerVehicle || (attached as any).assignedRiderVehicle || (attached.deliveryVehicleNumber ? 'Motorbike' : 'Delivery Bike');
                  const rPlate = attached.deliveryVehicleNumber || (attached as any).assignedRiderVehicleNumber;
                  const kitchenLabel = attached.acceptedKitchenName || attached.kitchenName || 'Central Kitchen Hub';

                  return (
                    <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-2.5 animate-fade-in text-left">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="text-[10px] font-black uppercase text-emerald-950 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                          Attached Order #{attached.id} ({attached.date})
                        </span>
                        <span className="text-[9px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                          {attached.status} • ₹{attached.total}
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-900 font-medium leading-tight">
                        <span className="font-bold text-emerald-950">Package: </span>
                        {attached.items.map(i => `${i.quantity}x ${i.meal.name}`).join(', ')}
                      </div>

                      {/* Delivered Rider Information Card */}
                      {rName ? (
                        <div className="bg-white/95 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-base shrink-0">
                              🛵
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-emerald-950">
                                  Delivered by Rider: {rName}
                                </span>
                                {rPlate && (
                                  <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                                    {rPlate}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-emerald-800 mt-0.5">
                                {rVehicle} • {rPhone ? `Contact: ${rPhone}` : 'Verified Rider On File'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-md block">
                              ✓ Rider Info Linked
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-100/60 border border-emerald-200 rounded-xl p-2 text-[10px] text-emerald-800 flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">🏬 Dispatched from: {kitchenLabel}</span>
                          <span className="text-emerald-600 font-mono">• Order logistics will be shared with the Support Team</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. COMPLAINT INTENSITY BAR (NO STARS FOR COMPLAINTS) */}
                {supportType === 'complaint' && (
                  <div className="bg-red-50/40 border border-red-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        COMPLAINT ISSUE INTENSITY BAR *
                      </label>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        complaintIntensity === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        complaintIntensity === 2 ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                        complaintIntensity === 3 ? 'bg-red-100 text-red-900 border border-red-300' :
                        'bg-red-600 text-white animate-pulse'
                      }`}>
                        {complaintIntensity === 1 ? '🟡 Level 1: Minor Delay' :
                         complaintIntensity === 2 ? '🟠 Level 2: Moderate Issue' :
                         complaintIntensity === 3 ? '🔴 Level 3: Severe Quality Defect' :
                         '🚨 Level 4: Emergency / Food Safety'}
                      </span>
                    </div>

                    {/* Segmented Intensity Control */}
                    <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-white border border-red-200 rounded-xl">
                      {[
                        { level: 1, label: 'Minor', color: 'bg-amber-400', priority: 'low' },
                        { level: 2, label: 'Moderate', color: 'bg-orange-500', priority: 'medium' },
                        { level: 3, label: 'Severe', color: 'bg-red-500', priority: 'high' },
                        { level: 4, label: 'Critical', color: 'bg-red-700', priority: 'urgent' },
                      ].map((item) => (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => {
                            setComplaintIntensity(item.level);
                            setSupportPriority(item.priority as any);
                          }}
                          className={`py-2.5 rounded-lg text-center transition-all cursor-pointer ${
                            complaintIntensity >= item.level
                              ? `${item.color} text-white font-black shadow-xs`
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 font-semibold'
                          }`}
                        >
                          <span className="text-[10px] uppercase block">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Quick Reason Chips for Complaints */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold text-red-800 uppercase block">Tap Quick Complaint Reason:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '🛵 Locker Drop Delay',
                          '🥶 Food Served Cold',
                          '📦 Wrong Item or Missing Side',
                          '💳 Payment / Double Charge',
                          '🥦 Taste or Flavor Defect',
                          '📦 Packaging Leaked',
                        ].map((reason, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAppendChipReason(reason)}
                            className="text-[10px] bg-white hover:bg-red-100 text-red-900 border border-red-300 px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer shadow-3xs"
                          >
                            + {reason}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. FEEDBACK STAR RATING & SMART REASONING CHIPS */}
                {supportType === 'feedback' && (
                  <div className="bg-brand-cream/30 border border-brand-green/15 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-brand-green uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        MEAL & SERVICE STAR RATING *
                      </label>
                      <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-brand-green/10">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSupportRating(star)}
                            className="p-1 hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= supportRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-extrabold text-brand-charcoal ml-1 font-mono">{supportRating}/5</span>
                      </div>
                    </div>

                    {/* Smart Reasoning Chips based on Stars */}
                    {supportRating >= 4 ? (
                      <div className="space-y-1.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 uppercase">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Positive Review Highlights (Tap to add):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '🔥 Perfect Protein Macros',
                            '😋 Delicious Flavor & Spicing',
                            '🥦 Ultra-Fresh Ingredients',
                            '⚡ On-Time Locker Delivery',
                            '📦 Hot & Eco Packaging',
                            '💪 High Energy Fuel',
                          ].map((reason, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAppendChipReason(reason)}
                              className="text-[10px] bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer shadow-3xs"
                            >
                              + {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-900 uppercase">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Constructive Improvement Points (Tap to add):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '🥶 Food Was Served Cold',
                            '🧂 Seasoning / Spicing Needs Tweak',
                            '⏰ Delivery Locker Was Delayed',
                            '📦 Container Leak or Spill',
                            '📉 Portion Size Smaller Than Expected',
                            '🥦 Missing Side / Extra Protein',
                          ].map((reason, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAppendChipReason(reason)}
                              className="text-[10px] bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer shadow-3xs"
                            >
                              + {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Subject Line */}
                <div>
                  <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">SUBJECT / BRIEF SUMMARY</label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g. Cold meal delivered to Gold's Gym locker / Wrong protein option"
                    className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                  />
                </div>

                {/* 7. Message Content */}
                <div>
                  <label className="text-[9px] font-bold text-brand-charcoal/50 block mb-1 uppercase">DETAILED MESSAGE *</label>
                  <textarea
                    placeholder="Provide exact details or tap any quick-select tags above to build your message..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-green"
                    required
                  />
                </div>

                {/* 8. Photo Attachment / Evidence Upload */}
                <div>
                  <ImageUploader
                    value={supportImageUrl}
                    onChange={setSupportImageUrl}
                    label="Attach Photo Evidence / Screenshot (Optional)"
                    placeholder="Upload damaged meal photo, receipt, or app screenshot"
                    compact
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSupport}
                  className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingSupport ? 'Submitting Support Ticket...' : 'TRANSMIT TICKET TO KITCHEN DESK'}</span>
                </button>

              </form>
            )}
          </div>
        </div>
      )}

      {/* IN-APP ORDER CANCELLATION CONFIRMATION MODAL */}
      {orderToCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-red-200 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black text-lg shrink-0">
                  🚫
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-brand-charcoal">Cancel Order #{orderToCancelModal.id}?</h3>
                  <span className="text-[10px] text-gray-500 font-medium">Kitchen has not started cooking yet.</span>
                </div>
              </div>
              <button
                onClick={() => setOrderToCancelModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const isModalCod =
                (orderToCancelModal.paymentMethod || '').toLowerCase() === 'cod' ||
                (orderToCancelModal.paymentMethod || '').toLowerCase() === 'cash' ||
                (orderToCancelModal.paymentMethod || '').toLowerCase() === 'cash_on_delivery' ||
                Boolean((orderToCancelModal as any).isCOD);

              if (isModalCod) {
                return (
                  <div className="bg-stone-100 border border-stone-300 rounded-2xl p-4 space-y-1.5 text-stone-900">
                    <div className="flex items-center gap-1.5 text-xs font-black text-stone-800 uppercase tracking-wider">
                      <Banknote className="w-4 h-4 text-stone-600" />
                      <span>Payment Method: Cash on Delivery (COD)</span>
                    </div>
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                      ⚠️ <strong className="font-black text-stone-900">No Wallet Refund Applicable</strong>. Because this order is Cash on Delivery, zero payment was collected from your account. Cancelling will void the order with <span className="font-black text-red-600">₹0 refund</span>.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Prepaid Order • Verified Instant Wallet Refund</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    100% of your prepaid payment (<strong className="font-black text-emerald-900">₹{orderToCancelModal.total || orderToCancelModal.totalAmount || 0}</strong>) will be credited immediately to your <span className="font-black">Bhatti Wallet as Golden Ember Coins</span> with zero wait.
                  </p>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-charcoal uppercase tracking-wider block">
                Reason for Cancellation (Optional)
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-brand-charcoal focus:outline-none focus:border-red-500"
              >
                <option value="Changed my mind / Placed by mistake">Changed my mind / Placed by mistake</option>
                <option value="Ordered wrong items or address">Ordered wrong items or address</option>
                <option value="Taking too long for kitchen to accept">Taking too long for kitchen to accept</option>
                <option value="Found alternative food option">Found alternative food option</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancelModal(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={confirmCancelOrder}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {isCancellingOrder
                    ? 'Cancelling...'
                    : ((orderToCancelModal.paymentMethod || '').toLowerCase() === 'cod' ||
                       (orderToCancelModal.paymentMethod || '').toLowerCase() === 'cash' ||
                       (orderToCancelModal.paymentMethod || '').toLowerCase() === 'cash_on_delivery' ||
                       Boolean((orderToCancelModal as any).isCOD))
                    ? 'Confirm Cancel (₹0 Refund)'
                    : `Confirm Cancel & Refund ₹${orderToCancelModal.total || 0}`}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* FLOATING STATUS TOAST */}
      {statusToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-brand-charcoal text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center justify-between gap-2"
          >
            <span>{statusToast}</span>
            <button
              onClick={() => setStatusToast(null)}
              className="text-white/60 hover:text-white text-xs font-black ml-2"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}

      {/* TAX INVOICE & RECEIPT MODAL */}
      {invoiceModalOrder && (
        <OrderInvoiceModal
          order={invoiceModalOrder}
          isOpen={!!invoiceModalOrder}
          onClose={() => setInvoiceModalOrder(null)}
          onOpenRating={(ord) => {
            setRatingOrderFromHistory(ord);
          }}
          onReportIssue={(ord) => {
            setSupportOrderId(ord.id);
            setSupportType('complaint');
            setActiveSubSection('support');
          }}
        />
      )}

      {/* RATING & REVIEW MODAL */}
      {ratingOrderFromHistory && (
        <DeliveredOrderRatingModal
          order={ratingOrderFromHistory}
          isOpen={!!ratingOrderFromHistory}
          currentUser={user}
          onClose={() => setRatingOrderFromHistory(null)}
          onRatingSubmitted={(orderId, rating, tags, feedback) => {
            handleRateOrderDelivery(orderId, rating, tags, feedback);
            setStatusToast(`Thank you! ★ ${rating} star review submitted.`);
          }}
        />
      )}

      {/* PHONE AUTH / LINK MODAL */}
      <PhoneAuthModal
        isOpen={showPhoneLinkModal}
        onClose={() => setShowPhoneLinkModal(false)}
        title={user.phone ? "Update Mobile Phone Number" : "Link Mobile Phone Number"}
        subtitle="Verify your number via 6-digit one-time passcode for secure orders"
        onOpenLegal={onOpenLegal}
        onSuccess={(data) => {
          onUpdateUser(data.user);
          onPhoneAuthSuccess?.(data);
          setShowPhoneLinkModal(false);
          setStatusToast(`📱 Mobile number ${data.user.phone} linked & verified!`);
        }}
      />

      {/* 🔑 CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-brand-green/15 shadow-2xl overflow-hidden relative animate-scale-up">
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-brand-green/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-charcoal tracking-tight">
                    Change Password
                  </h3>
                  <p className="text-[11px] text-brand-charcoal/60">
                    Update your Taash Bhatti vault security credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="w-8 h-8 rounded-full bg-brand-cream/50 text-brand-charcoal/60 hover:text-brand-charcoal hover:bg-brand-cream flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {/* Current Password Field (for email users) */}
              {fbUser?.email && !fbUser.email.includes('@taashbhatti.phone') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={handleSendResetPasswordEmail}
                      disabled={resetEmailSent}
                      className="text-[10px] text-brand-green font-bold hover:underline cursor-pointer"
                    >
                      {resetEmailSent ? "Reset Email Sent ✓" : "Forgot Current Password?"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal transition-colors p-1 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal transition-colors p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-type new password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal transition-colors p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {changePasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {/* Success Display */}
              {changePasswordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {changePasswordLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ PERMANENT ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-red-500/30 shadow-2xl overflow-hidden relative animate-scale-up">
            {/* Red accent bar */}
            <div className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

            {/* Top Bar */}
            <div className="px-6 pt-5 pb-3 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-red-700 tracking-tight">
                    Permanently Delete Account
                  </h3>
                  <p className="text-[11px] text-brand-charcoal/60">
                    Irreversible database & auth erasure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content & Form */}
            <form onSubmit={handlePermanentDeleteAccount} className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200/80 rounded-2xl space-y-2 text-xs text-red-900">
                <div className="flex items-center gap-1.5 font-black text-red-700 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Permanent Action Warning</span>
                </div>
                <p className="leading-relaxed text-[11px] text-red-800/90">
                  This action will <strong>permanently erase</strong> your profile and documents from the Cloud Database (<code className="font-mono text-[10px] bg-red-100 px-1 py-0.5 rounded">users/{fbUser?.uid || user.id}</code>), delete your credentials from Firebase Authentication, and clear all local device storage.
                </p>
                <p className="font-bold text-[11px] text-red-700">
                  All active reward balances, saved addresses, and dining history will be permanently lost and cannot be recovered.
                </p>
              </div>

              {/* Password Re-auth Field (if email user) */}
              {fbUser?.email && !fbUser.email.includes('@taashbhatti.phone') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
                    Account Password (For Security Verification)
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={deletePasswordInput}
                      onChange={(e) => setDeletePasswordInput(e.target.value)}
                      className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal transition-colors p-1 cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation Text Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block tracking-wide">
                  Type <span className="font-mono text-red-600 font-extrabold select-all">DELETE</span> to Confirm
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 focus:border-red-500 rounded-xl px-3.5 py-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-400/20 uppercase"
                />
              </div>

              {/* Error banner */}
              {deleteAccountError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{deleteAccountError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingAccount ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REORDER GROUP FEAST MODAL */}
      {reorderGroupModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 text-stone-100 border-2 border-brand-orange/60 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Reorder Group Feast</h3>
                  <p className="text-[10px] text-stone-400">
                    Room {reorderGroupModalOrder.groupRoomCode || 'Taash Feast'} • {reorderGroupModalOrder.items.length} items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReorderGroupModalOrder(null)}
                className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              This was a shared feast with friends. How would you like to reorder these delicious items?
            </p>

            {/* Items preview */}
            <div className="max-h-36 overflow-y-auto bg-stone-950/70 p-3 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
              {reorderGroupModalOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-stone-300">
                  <span className="truncate pr-2 font-medium">{it.meal.name} (x{it.quantity})</span>
                  <span className="font-mono text-amber-300 shrink-0 font-bold">₹{it.meal.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Create a room and tell everyone to add these */}
              <button
                type="button"
                onClick={() => {
                  const items = reorderGroupModalOrder.items;
                  setReorderGroupModalOrder(null);
                  if (onOpenGroupOrder) {
                    onOpenGroupOrder(items);
                  } else {
                    onSelectTab('menu');
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-stone-950 font-black text-xs flex items-center justify-between cursor-pointer transition-all shadow-md group"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Users className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-black text-xs">Create Room & Invite Friends</div>
                    <div className="text-[10px] text-stone-900/80 font-semibold">
                      Start a fresh feast room with these items pre-loaded
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Add directly to your own cart */}
              <button
                type="button"
                onClick={() => {
                  const items = reorderGroupModalOrder.items;
                  setReorderGroupModalOrder(null);
                  onReorder(items);
                }}
                className="w-full p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center justify-between cursor-pointer transition-all border border-stone-700"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <ShoppingBag className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-black text-xs">Add to Your Own Cart</div>
                    <div className="text-[10px] text-stone-400">
                      Order these items directly for yourself
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
