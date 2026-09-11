/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Minus,
  Trash2,
  Share2,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  Banknote,
  Search,
  Sparkles,
  MapPin,
  Utensils,
  UserX,
  Radio,
  ExternalLink,
  Edit3,
  Home,
  Briefcase,
  Building2,
  KeyRound,
  Key,
  LogIn,
  Save,
  LogOut,
} from 'lucide-react';
import {
  Meal,
  Kitchen,
  Order,
  User,
  GroupOrderRoom,
  GroupCartItem,
  GroupChatMessage,
  GroupOrderMember,
} from '../types';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  deleteDoc,
  collection,
} from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider, sanitizeForFirestore } from '../lib/firebase';

interface GroupOrderRoomViewProps {
  user: User;
  fbUser?: any;
  guestId: string;
  meals: Meal[];
  kitchens: Kitchen[];
  selectedBhatti?: Kitchen | null;
  onClose: () => void;
  onAddOrderToApp: (order: Order) => void;
  onOpenMenu?: () => void;
  onRequestSignIn?: () => void;
  initialRoomId?: string | null;
  initialPin?: string | null;
  initialPreloadedMeals?: { meal: Meal; quantity: number }[];
  onActiveRoomChange?: (room: GroupOrderRoom | null) => void;
}

export default function GroupOrderRoomView({
  user,
  fbUser,
  guestId,
  meals,
  kitchens,
  selectedBhatti,
  onClose,
  onAddOrderToApp,
  onRequestSignIn,
  initialRoomId,
  initialPin,
  initialPreloadedMeals,
  onActiveRoomChange,
}: GroupOrderRoomViewProps) {
  const isAuthenticated = Boolean(fbUser || auth.currentUser);
  const currentUserId = fbUser?.uid || user.email || guestId;
  const currentUserName = user.name && user.name.trim() ? user.name : (fbUser?.displayName || 'Foodie Guest');

  // Authentication Required Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'create' | 'join'>('create');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Feast Room Delivery Address Edit Modal State (Creator only)
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editLandmark, setEditLandmark] = useState('');
  const [editAddressLabel, setEditAddressLabel] = useState('Home');
  const [savingAddress, setSavingAddress] = useState(false);

  // OTP Copy State
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Navigation sub-views: 'landing' | 'create' | 'join' | 'room'
  const [viewMode, setViewMode] = useState<'landing' | 'create' | 'join' | 'room'>(() => {
    if (initialRoomId) return 'join';
    if (initialPreloadedMeals && initialPreloadedMeals.length > 0) return 'create';
    const activeCachedRoomId = localStorage.getItem('tb_active_group_room_id');
    return activeCachedRoomId ? 'room' : 'landing';
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    return initialRoomId || localStorage.getItem('tb_active_group_room_id') || null;
  });

  const [roomData, setRoomData] = useState<GroupOrderRoom | null>(null);
  const [loadingRoom, setLoadingRoom] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Active Tab inside Room: 'cart' | 'chat' | 'members'
  const [roomTab, setRoomTab] = useState<'cart' | 'chat' | 'members'>('cart');

  // Create Room Form State
  const [createName, setCreateName] = useState('Friday Dum Biryani Feast 🍢');
  const [createPin, setCreatePin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [createTreatMode, setCreateTreatMode] = useState<'group_treat' | 'your_treat'>('group_treat');
  const [deliveryStreet, setDeliveryStreet] = useState(() => user.address || (user.savedAddresses && user.savedAddresses[0]) || 'Club Road, Mithanpura');
  const [deliveryCity, setDeliveryCity] = useState(() => user.city || 'Muzaffarpur');
  const [deliveryPincode, setDeliveryPincode] = useState('842002');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');

  // Join Room Form State
  const [joinCode, setJoinCode] = useState(initialRoomId || '');
  const [joinPin, setJoinPin] = useState(initialPin || '');
  const [joinName, setJoinName] = useState(currentUserName);

  // In-Room Menu Quick-Add Drawer
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuVegOnly, setMenuVegOnly] = useState(false);

  // Chat Input
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Host Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Active Feast Room Conflict Modal (user cannot create another room while one is active)
  const [showActiveRoomConflictModal, setShowActiveRoomConflictModal] = useState(false);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayMode, setSelectedPayMode] = useState<'online' | 'cod'>('online');
  const [payingInProgress, setPayingInProgress] = useState(false);

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Timer Tick
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // 1. Subscribe to Firestore Room Document in real-time
  useEffect(() => {
    if (!activeRoomId) {
      setRoomData(null);
      return;
    }

    setLoadingRoom(true);
    const roomRef = doc(db, 'group_orders', activeRoomId);

    const unsubscribe = onSnapshot(
      roomRef,
      (docSnap) => {
        setLoadingRoom(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as GroupOrderRoom;
          setRoomData(data);
          localStorage.setItem('tb_active_group_room_id', activeRoomId);
          onActiveRoomChange?.(data);
          setViewMode('room');

          // Ensure current user is registered in members map
          if (!data.members[currentUserId] && data.status !== 'disbanded' && data.status !== 'ordered') {
            const updatedMembers = {
              ...data.members,
              [currentUserId]: {
                id: currentUserId,
                name: currentUserName,
                avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                isHost: data.hostUserId === currentUserId,
                hasPaid: false,
                joinedAt: new Date().toISOString(),
                subtotal: 0,
                itemsCount: 0,
              },
            };
            updateDoc(roomRef, { members: sanitizeForFirestore(updatedMembers) }).catch(console.error);
          }
        } else {
          setRoomError('Room not found or expired.');
          setRoomData(null);
          localStorage.removeItem('tb_active_group_room_id');
        }
      },
      (err) => {
        console.error('Group Room onSnapshot error:', err);
        setLoadingRoom(false);
        setRoomError('Failed to sync room data.');
      }
    );

    return () => unsubscribe();
  }, [activeRoomId, currentUserId, currentUserName, user.avatar]);

  // 2. 10-Minute Countdown Clock Calculation
  useEffect(() => {
    if (!roomData || !roomData.paymentExpiryTime || roomData.status === 'ordered' || roomData.status === 'disbanded') {
      setSecondsRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const expiry = new Date(roomData.paymentExpiryTime!).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((expiry - now) / 1000));
      setSecondsRemaining(diffSec);

      // Auto-trigger finalize if timer hits 0 and room is still in payment_started
      if (diffSec === 0 && roomData.status === 'payment_started') {
        clearInterval(interval);
        handleAutoFinalizeAfterTimeout(roomData);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomData]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (roomTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomData?.chatMessages, roomTab]);

  // Derived Values
  const isHost = roomData?.hostUserId === currentUserId;
  const currentMember = roomData?.members[currentUserId];

  // Active room existence check: user is in an active, non-ordered, non-disbanded room
  const hasActiveRoom = useMemo(() => {
    if (!roomData) return false;
    if (roomData.status === 'ordered' || roomData.status === 'disbanded') return false;
    return Boolean(roomData.members && roomData.members[currentUserId]);
  }, [roomData, currentUserId]);

  // Calculate items and subtotals per member
  const memberItemsMap = useMemo(() => {
    if (!roomData) return {};
    const map: { [userId: string]: GroupCartItem[] } = {};
    (roomData.items || []).forEach((item) => {
      if (!map[item.addedByUserId]) {
        map[item.addedByUserId] = [];
      }
      map[item.addedByUserId].push(item);
    });
    return map;
  }, [roomData]);

  // Food Subtotal
  const totalFoodAmount = useMemo(() => {
    if (!roomData || !roomData.items) return 0;
    return roomData.items.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
  }, [roomData]);

  // Delivery Fee Calculation: Free on >= 200, else 40 (borne by host)
  const deliveryFee = totalFoodAmount >= 200 || totalFoodAmount === 0 ? 0 : 40;

  // Current user's individual share
  const myItems = useMemo(() => {
    return (roomData?.items || []).filter((item) => item.addedByUserId === currentUserId);
  }, [roomData, currentUserId]);

  const myShareAmount = useMemo(() => {
    if (!roomData) return 0;
    if (roomData.treatMode === 'your_treat') {
      // In Your Treat, host pays the entire bill (food + delivery if any)
      return isHost ? totalFoodAmount + deliveryFee : 0;
    }
    // In Group Treat, each member pays for their items. If under 200, host pays the delivery fee
    const itemsTotal = myItems.reduce((sum, i) => sum + i.meal.price * i.quantity, 0);
    const hostExtraFee = isHost ? deliveryFee : 0;
    return itemsTotal + hostExtraFee;
  }, [roomData, isHost, totalFoodAmount, deliveryFee, myItems]);

  // Format Timer M:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Payment Lock: The feast room cannot be deleted or disbanded once even 1 payment is made
  const hasAnyPayment = useMemo(() => {
    if (!roomData) return false;
    const membersList = Object.values(roomData.members || {}) as GroupOrderMember[];
    const anyPaid = membersList.some((m) => m.hasPaid);
    return (
      anyPaid ||
      Boolean(roomData.firstPaymentTime) ||
      Boolean(roomData.paymentModeLock) ||
      roomData.status === 'ordered'
    );
  }, [roomData]);

  // Open Creator Address Edit Modal
  const handleOpenEditAddress = () => {
    if (!roomData) return;
    setEditStreet(roomData.deliveryAddress?.street || '');
    setEditCity(roomData.deliveryAddress?.city || 'Muzaffarpur');
    setEditPincode(roomData.deliveryAddress?.pincode || '842002');
    setEditLandmark(roomData.deliveryAddress?.landmark || '');
    setEditAddressLabel(roomData.savedAddressLabel || 'Home');
    setShowAddressModal(true);
  };

  // Save Creator Delivery Address Update
  const handleSaveDeliveryAddress = async () => {
    if (!isHost || !roomData || !activeRoomId) return;
    if (roomData.status === 'ordered') {
      alert('🔒 Order has already been placed! Delivery address cannot be modified after kitchen dispatch.');
      return;
    }
    if (!editStreet.trim() || !editCity.trim()) {
      alert('Please enter street address and city.');
      return;
    }

    try {
      setSavingAddress(true);
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const updatedAddress = {
        street: editStreet.trim(),
        city: editCity.trim(),
        pincode: editPincode.trim() || '842002',
        landmark: editLandmark.trim(),
      };

      const addrMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `📍 Host updated feast delivery address to: ${updatedAddress.street}, ${updatedAddress.city} - ${updatedAddress.pincode} (${editAddressLabel})`,
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        deliveryAddress: updatedAddress,
        savedAddressLabel: editAddressLabel,
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(addrMsg)],
      });

      setShowAddressModal(false);
    } catch (e) {
      console.error('Error saving feast room address:', e);
      alert('Failed to update address. Please try again.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Order OTP Copy
  const handleCopyOtp = () => {
    const otp = roomData?.orderOtp || '7492';
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Google Sign-In helper for feast room authentication barrier
  const handleGoogleSignInForRoom = async () => {
    try {
      setAuthSubmitting(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
      if (authModalAction === 'create') {
        setViewMode('create');
      } else {
        setViewMode('join');
      }
    } catch (err: any) {
      console.error('Google Sign-in failed for group room:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled before completion.');
      } else {
        setAuthError('Authentication failed. You can also sign in via your account tab.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  // --- ACTIONS ---

  // Create Room
  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      setAuthModalAction('create');
      setShowAuthModal(true);
      return;
    }

    // Strict requirement: don't let anyone create another feast room as long as one feast room is active on their account
    if (hasActiveRoom) {
      setShowActiveRoomConflictModal(true);
      return;
    }

    if (!createName.trim()) {
      alert('Please enter a name for the feast room!');
      return;
    }
    if (!createPin.trim() || createPin.length !== 4) {
      alert('Please set a 4-digit PIN for your feast room.');
      return;
    }
    if (!deliveryStreet.trim() || !deliveryCity.trim()) {
      alert('Please enter a delivery address for the group feast.');
      return;
    }

    try {
      setLoadingRoom(true);
      const code = 'TB-' + Math.floor(1000 + Math.random() * 9000);
      const roomId = `room_${code.toLowerCase()}_${Date.now().toString(36)}`;

      // Determine nearest kitchen based on city
      const matchedKitchen = kitchens.find(
        (k) => (k.city || '').toLowerCase() === deliveryCity.toLowerCase()
      ) || selectedBhatti || kitchens[0];

      // Pre-load items if coming from reorder
      const initialItems: GroupCartItem[] = (initialPreloadedMeals || []).map((item, idx) => ({
        id: `item_preload_${Date.now()}_${idx}`,
        mealId: item.meal.id,
        meal: item.meal,
        quantity: item.quantity,
        addedByUserId: currentUserId,
        addedByName: currentUserName,
        addedAt: new Date().toISOString(),
      }));
      const initialSubtotal = (initialPreloadedMeals || []).reduce(
        (acc, curr) => acc + (curr.meal?.price || 0) * curr.quantity,
        0
      );
      const initialCount = (initialPreloadedMeals || []).reduce(
        (acc, curr) => acc + curr.quantity,
        0
      );

      const newRoom: GroupOrderRoom = {
        id: roomId,
        code,
        pin: createPin,
        name: createName.trim(),
        hostUserId: currentUserId,
        hostName: currentUserName,
        hostAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        treatMode: createTreatMode,
        status: 'active',
        kitchenId: matchedKitchen?.id || 'k1',
        kitchenName: matchedKitchen?.name || 'Muzaffarpur Bhatti #1',
        deliveryAddress: {
          street: deliveryStreet.trim(),
          city: deliveryCity.trim(),
          pincode: deliveryPincode.trim(),
          landmark: deliveryLandmark.trim(),
        },
        savedAddressLabel: editAddressLabel || 'Home',
        members: {
          [currentUserId]: {
            id: currentUserId,
            name: currentUserName,
            avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            isHost: true,
            hasPaid: false,
            joinedAt: new Date().toISOString(),
            subtotal: initialSubtotal,
            itemsCount: initialCount,
          },
        },
        items: initialItems,
        chatMessages: [
          {
            id: `msg_${Date.now()}`,
            senderId: 'system',
            senderName: 'Taash System',
            text: initialCount > 0
              ? `🎉 Room created by ${currentUserName} with ${initialCount} reordered items pre-loaded! Share the PIN ${createPin} with your group to add more food.`
              : `🎉 Room created by ${currentUserName}! Share the PIN ${createPin} with your group to start adding food.`,
            type: 'system',
            timestamp: new Date().toISOString(),
          },
        ],
        deliveryFee: 0,
        isNonCancellable: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'group_orders', roomId), sanitizeForFirestore(newRoom));
      setActiveRoomId(roomId);
      localStorage.setItem('tb_active_group_room_id', roomId);
      setViewMode('room');
    } catch (err: any) {
      console.error('Error creating group room:', err);
      alert('Failed to create room: ' + (err.message || 'Please try again.'));
    } finally {
      setLoadingRoom(false);
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    if (!isAuthenticated) {
      setAuthModalAction('join');
      setShowAuthModal(true);
      return;
    }

    const rawInput = joinCode.trim().toUpperCase();
    if (!rawInput) {
      alert('Please enter the Room Code or Link!');
      return;
    }
    if (!joinPin || joinPin.length !== 4) {
      alert('Please enter the 4-digit PIN set by the host.');
      return;
    }

    try {
      setLoadingRoom(true);
      setRoomError(null);

      // Normalize code (TB-XXXX or full room ID)
      let targetDocId = rawInput.startsWith('ROOM_') ? rawInput.toLowerCase() : '';
      
      // If code is like "TB-1234", let's query or construct ID
      if (!targetDocId) {
        // Query by code or search direct match
        const colRef = collection(db, 'group_orders');
        const { getDocs, query, where } = await import('firebase/firestore');
        const q = query(colRef, where('code', '==', rawInput));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          targetDocId = querySnap.docs[0].id;
        } else {
          // Direct check
          targetDocId = rawInput.toLowerCase();
        }
      }

      const roomRef = doc(db, 'group_orders', targetDocId);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        setRoomError('No feast room found with this code. Please verify with your host.');
        setLoadingRoom(false);
        return;
      }

      const room = snap.data() as GroupOrderRoom;

      if (room.status === 'disbanded') {
        setRoomError('This group ordering room has been disbanded by the host.');
        setLoadingRoom(false);
        return;
      }

      if (room.pin !== joinPin) {
        setRoomError('Incorrect 4-digit PIN. Please check the code shared with you.');
        setLoadingRoom(false);
        return;
      }

      // Add user to members
      const updatedMembers = {
        ...room.members,
        [currentUserId]: {
          id: currentUserId,
          name: joinName.trim() || currentUserName,
          avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          isHost: room.hostUserId === currentUserId,
          hasPaid: false,
          joinedAt: new Date().toISOString(),
          subtotal: 0,
          itemsCount: 0,
        },
      };

      const joinMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `👋 ${joinName.trim() || currentUserName} joined the feast!`,
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        members: sanitizeForFirestore(updatedMembers),
        chatMessages: [...(room.chatMessages || []), sanitizeForFirestore(joinMsg)],
      });

      setActiveRoomId(targetDocId);
      localStorage.setItem('tb_active_group_room_id', targetDocId);
      setViewMode('room');
    } catch (err: any) {
      console.error('Error joining group room:', err);
      setRoomError('Could not join room: ' + (err.message || 'Network error'));
    } finally {
      setLoadingRoom(false);
    }
  };

  // Add Item to Group Cart
  const handleAddItemToGroupCart = async (meal: Meal) => {
    if (!roomData || !activeRoomId) return;

    // Check permissions
    if (roomData.treatMode === 'your_treat' && !isHost) {
      alert('In "Your Treat" mode, only the host can curate and add dishes to the cart.');
      return;
    }

    if (roomData.cartLocked) {
      alert('The cart has been locked by the host.');
      return;
    }

    if (roomData.status === 'ordered') {
      alert('This order is already placed and dispatched to the Bhatti.');
      return;
    }

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const existingItemIndex = roomData.items.findIndex(
        (i) => i.mealId === meal.id && i.addedByUserId === currentUserId
      );

      let updatedItems = [...roomData.items];
      if (existingItemIndex > -1) {
        updatedItems[existingItemIndex].quantity += 1;
      } else {
        const newItem: GroupCartItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          mealId: meal.id,
          meal,
          quantity: 1,
          addedByUserId: currentUserId,
          addedByName: currentUserName,
          addedAt: new Date().toISOString(),
        };
        updatedItems.push(newItem);
      }

      // Add system chat message
      const systemMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `🍲 ${currentUserName} added ${meal.name} to the feast!`,
        type: 'food_added',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        items: sanitizeForFirestore(updatedItems),
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(systemMsg)],
      });
    } catch (err) {
      console.error('Error adding item to group cart:', err);
    }
  };

  // Update item quantity (+ / - / delete)
  const handleUpdateItemQuantity = async (itemId: string, delta: number) => {
    if (!roomData || !activeRoomId) return;

    const item = roomData.items.find((i) => i.id === itemId);
    if (!item) return;

    // Permission check: regular members can only edit their OWN items; host can edit all
    if (!isHost && item.addedByUserId !== currentUserId) {
      alert("You can only edit items you added. Host has master editor permissions.");
      return;
    }

    if (roomData.treatMode === 'your_treat' && !isHost) {
      alert('Only the host can modify cart items in "Your Treat" mode.');
      return;
    }

    if (roomData.cartLocked) {
      alert('The cart has been locked by the host.');
      return;
    }

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      let updatedItems = [...roomData.items];
      const targetIndex = updatedItems.findIndex((i) => i.id === itemId);

      if (targetIndex === -1) return;

      const newQty = updatedItems[targetIndex].quantity + delta;
      if (newQty <= 0) {
        updatedItems.splice(targetIndex, 1);
      } else {
        updatedItems[targetIndex].quantity = newQty;
      }

      await updateDoc(roomRef, {
        items: sanitizeForFirestore(updatedItems),
      });
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  // Send Chat Message
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !roomData || !activeRoomId) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const newMsg: GroupChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: user.avatar,
        isHost,
        text,
        type: 'chat',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(newMsg)],
      });
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Quick Emoji Reaction: Send an instant animated reaction
  const handleSendQuickEmojiReaction = async (emoji: string) => {
    if (!roomData || !activeRoomId) return;

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const newMsg: GroupChatMessage = {
        id: `msg_reaction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: user.avatar,
        isHost,
        text: emoji,
        type: 'chat',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(newMsg)],
      });
    } catch (err) {
      console.error('Error sending quick reaction:', err);
    }
  };

  // Message Reactions: React directly to a specific message bubble
  const handleToggleMessageReaction = async (messageId: string, emoji: string) => {
    if (!roomData || !activeRoomId) return;

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const updatedMessages = (roomData.chatMessages || []).map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = { ...(msg.reactions || {}) };
        const userList = [...(currentReactions[emoji] || [])];
        const userIdx = userList.indexOf(currentUserId);

        if (userIdx !== -1) {
          userList.splice(userIdx, 1);
          if (userList.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = userList;
          }
        } else {
          userList.push(currentUserId);
          currentReactions[emoji] = userList;
        }

        return {
          ...msg,
          reactions: currentReactions,
        };
      });

      await updateDoc(roomRef, {
        chatMessages: sanitizeForFirestore(updatedMessages),
      });
    } catch (err) {
      console.error('Error toggling message reaction:', err);
    }
  };

  // Host: Disband Room
  const handleDisbandRoom = async () => {
    if (!isHost || !roomData || !activeRoomId) return;

    // Security check: feast room cannot be deleted once even 1 payment is made
    if (hasAnyPayment) {
      alert('🔒 Feast Room Deletion Locked: 1 or more participants have already made their payment! Collected funds are securely allocated. Disband is disabled to protect participants.');
      return;
    }

    if (!confirm('Are you sure you want to disband this feast room? The feast room will be deleted from the backend database and all participants will be notified.')) return;

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      // Remove from the backend itself
      await deleteDoc(roomRef);
      localStorage.removeItem('tb_active_group_room_id');
      setActiveRoomId(null);
      setRoomData(null);
      onActiveRoomChange?.(null);
      setViewMode('landing');
      setShowSettingsModal(false);
      setShowActiveRoomConflictModal(false);
    } catch (err) {
      console.error('Error deleting room from backend:', err);
      alert('Failed to disband room. Please check your connection.');
    }
  };

  // Leave or Disband Feast Room (allows leaving so user can create/join another room)
  const handleLeaveRoom = async () => {
    if (!roomData || !activeRoomId) return;

    if (isHost) {
      if (hasAnyPayment) {
        alert('🔒 As the host, you cannot disband this room because payments have already commenced.');
        return;
      }
      await handleDisbandRoom();
      return;
    }

    if (!confirm(`Are you sure you want to leave Feast Room "${roomData.name}"? Your selected dishes will be removed from the shared cart.`)) {
      return;
    }

    try {
      setLoadingRoom(true);
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const updatedMembers = { ...roomData.members };
      delete updatedMembers[currentUserId];
      const updatedItems = (roomData.items || []).filter((i) => i.addedByUserId !== currentUserId);

      const leaveMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `👋 ${currentUserName} left the feast room.`,
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        members: sanitizeForFirestore(updatedMembers),
        items: sanitizeForFirestore(updatedItems),
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(leaveMsg)],
      });

      localStorage.removeItem('tb_active_group_room_id');
      setActiveRoomId(null);
      setRoomData(null);
      onActiveRoomChange?.(null);
      setViewMode('landing');
      setShowSettingsModal(false);
      setShowActiveRoomConflictModal(false);
    } catch (err: any) {
      console.error('Error leaving feast room:', err);
      alert('Failed to leave room: ' + (err.message || 'Please check your connection.'));
    } finally {
      setLoadingRoom(false);
    }
  };

  // Host: Remove Member
  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!isHost || !roomData || !activeRoomId) return;
    if (targetUserId === currentUserId) {
      alert('You are the host! You cannot remove yourself. You can disband the room instead.');
      return;
    }
    if (!confirm(`Remove ${targetName} and their selected items from the feast?`)) return;

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const updatedMembers = { ...roomData.members };
      delete updatedMembers[targetUserId];

      // Remove their items from cart
      const updatedItems = roomData.items.filter((i) => i.addedByUserId !== targetUserId);

      const removalMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `⚠️ ${targetName} was removed from the feast by the host.`,
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        members: sanitizeForFirestore(updatedMembers),
        items: sanitizeForFirestore(updatedItems),
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(removalMsg)],
      });
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  // Host: Toggle Cart Lock
  const handleToggleCartLock = async () => {
    if (!isHost || !roomData || !activeRoomId) return;

    try {
      const roomRef = doc(db, 'group_orders', activeRoomId);
      const newLocked = !roomData.cartLocked;
      const lockMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: newLocked ? '🔒 The host locked the cart for checkout.' : '🔓 The host unlocked the cart.',
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      await updateDoc(roomRef, {
        cartLocked: newLocked,
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(lockMsg)],
      });
    } catch (err) {
      console.error('Error locking cart:', err);
    }
  };

  // --- PAYMENT & 10-MINUTE TIMER ENGINE ---

  const handleOpenPaymentModal = () => {
    if (!roomData) return;
    if (myShareAmount <= 0 && myItems.length === 0) {
      alert('You have not added any dishes to the cart yet.');
      return;
    }
    // If payment mode is already locked by the first payer, enforce it!
    if (roomData.paymentModeLock) {
      setSelectedPayMode(roomData.paymentModeLock);
    }
    setPaymentModalOpen(true);
  };

  const handleCompletePayment = async () => {
    if (!roomData || !activeRoomId) return;

    setPayingInProgress(true);
    try {
      const isFirstPayment = !roomData.firstPaymentTime;
      const now = new Date();
      const expiryTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

      // Mode: If first payer, sets the room lock! If not first, must match lock.
      const lockedMode = roomData.paymentModeLock || selectedPayMode;

      const updatedMembers = {
        ...roomData.members,
        [currentUserId]: {
          ...roomData.members[currentUserId],
          hasPaid: true,
          paymentMode: lockedMode,
          paidAt: now.toISOString(),
          subtotal: myShareAmount,
          itemsCount: myItems.length,
        },
      };

      const paymentMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `💳 ${currentUserName} completed payment of ₹${myShareAmount} via ${lockedMode === 'cod' ? 'Cash on Delivery (COD)' : 'Prepaid / Online'}!`,
        type: 'payment_made',
        timestamp: now.toISOString(),
      };

      const systemUpdates: Partial<GroupOrderRoom> = {
        members: sanitizeForFirestore(updatedMembers),
        chatMessages: [...(roomData.chatMessages || []), sanitizeForFirestore(paymentMsg)],
      };

      if (isFirstPayment) {
        systemUpdates.firstPaymentTime = now.toISOString();
        systemUpdates.paymentExpiryTime = expiryTime;
        systemUpdates.paymentModeLock = lockedMode;
        systemUpdates.firstPayerId = currentUserId;
        systemUpdates.firstPayerName = currentUserName;
        systemUpdates.status = 'payment_started';

        const timerMsg: GroupChatMessage = {
          id: `msg_${Date.now() + 1}`,
          senderId: 'system',
          senderName: 'Taash System',
          text: `⏱️ 10-Minute payment countdown started! Payment mode is locked to ${lockedMode === 'cod' ? 'COD' : 'Online'}. All members must complete their share within 10 minutes.`,
          type: 'system',
          timestamp: now.toISOString(),
        };
        systemUpdates.chatMessages!.push(sanitizeForFirestore(timerMsg));
      }

      // Check if ALL members with items have now paid
      const allActiveMembersPaid = (Object.values(updatedMembers) as GroupOrderMember[]).every((member) => {
        const hasItems = (roomData.items || []).some((item) => item.addedByUserId === member.id);
        if (!hasItems) return true; // Spectators don't block
        return member.hasPaid;
      });

      if (allActiveMembersPaid) {
        // Dispatch to kitchen!
        await finalizeAndDispatchOrder(roomData, updatedItemsFromPaid(roomData, updatedMembers), lockedMode);
      } else {
        const roomRef = doc(db, 'group_orders', activeRoomId);
        await updateDoc(roomRef, sanitizeForFirestore(systemUpdates));
      }

      setPaymentModalOpen(false);
    } catch (err: any) {
      console.error('Payment completion error:', err);
      alert('Payment failed: ' + (err.message || 'Please try again.'));
    } finally {
      setPayingInProgress(false);
    }
  };

  // Helper to extract items belonging ONLY to members who actually paid
  const updatedItemsFromPaid = (room: GroupOrderRoom, membersMap: { [userId: string]: GroupOrderMember }) => {
    return (room.items || []).filter((item) => {
      const member = membersMap[item.addedByUserId];
      return member && member.hasPaid;
    });
  };

  // Finalize and Dispatch to Kitchen & App Orders
  const finalizeAndDispatchOrder = async (
    room: GroupOrderRoom,
    paidItems: GroupCartItem[],
    finalPaymentMode: 'online' | 'cod'
  ) => {
    if (paidItems.length === 0) {
      alert('No paid items in this group feast. Order could not be placed.');
      return;
    }

    const orderId = 'ORD-GRP-' + Math.floor(100000 + Math.random() * 900000);
    const orderOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const totalFood = paidItems.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
    const finalDelFee = totalFood >= 200 ? 0 : 40;
    const grandTotal = totalFood + finalDelFee;

    // Convert GroupCartItems to standard OrderItem format
    const orderItems = paidItems.map((item) => ({
      meal: item.meal,
      quantity: item.quantity,
      customization: {
        cookingInstruction: `[Group Order: Added by ${item.addedByName}]`,
      },
    }));

    // Create standard app Order (Revenue is counted strictly once per unique order ID)
    const newAppOrder: Order = {
      id: orderId,
      userId: room.hostUserId || currentUserId,
      participantUserIds: Object.keys(room.members), // all participant user IDs for order history
      items: orderItems,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'sent',
      fulfillmentMode: 'delivery',
      scheduledSlot: 'ASAP (25-35 mins)',
      total: grandTotal,
      discount: 0,
      subtotal: totalFood,
      deliveryFee: finalDelFee,
      deliveryOtp: orderOtp,
      orderOtp: orderOtp,
      address: `${room.deliveryAddress.street}, ${room.deliveryAddress.city} - ${room.deliveryAddress.pincode}`,
      paymentMethod: finalPaymentMode === 'cod' ? 'Cash on Delivery (Group COD)' : 'Prepaid (Group Split Online)',
      paymentStatus: finalPaymentMode === 'cod' ? 'pending' : 'paid',
      isGroupOrder: true,
      groupRoomId: room.id,
      groupRoomCode: room.code,
      groupTreatMode: room.treatMode,
      isNonCancellable: true,
      kitchenId: room.kitchenId || 'k1',
      kitchenName: room.kitchenName || 'Muzaffarpur Bhatti #1',
      groupMembersSummary: (Object.values(room.members) as GroupOrderMember[]).map((m) => ({
        memberName: m.name,
        itemsCount: (room.items || []).filter((i) => i.addedByUserId === m.id).length,
        paidAmount: m.subtotal || 0,
        hasPaid: m.hasPaid,
      })),
      trackingSteps: [
        { title: 'Group Order Placed', description: `Room ${room.code} verified and dispatched`, time: 'Just now', done: true },
        { title: 'Kitchen Accepted', description: `Assigned to ${room.kitchenName || 'Woodfire Bhatti'}`, time: 'Next step', done: false },
        { title: 'Tandoor Woodfire Cooking', description: 'Live fresh preparation', time: 'Pending', done: false },
        { title: 'Delivery Partner Assigned', description: 'Heading for direct door delivery', time: 'Pending', done: false },
        { title: 'Delivered Hot', description: 'Enjoy the group feast!', time: 'Pending', done: false },
      ],
    };

    // Save to Firestore orders collection (Single source of truth for revenue calculation)
    await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(newAppOrder));

    // Save active placed group order ID to local storage for persistent floating tracking bubble
    localStorage.setItem('tb_placed_group_order_id', orderId);

    // Update Room status to 'ordered'
    const finalMsg: GroupChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'system',
      senderName: 'Taash System',
      text: `🔥 ORDER PLACED! Order ID: #${orderId}. Door Delivery OTP: ${orderOtp}. Sent to ${room.kitchenName || 'Central Bhatti'}. Non-cancellable once placed. Share OTP with rider at door.`,
      type: 'system',
      timestamp: new Date().toISOString(),
    };

    const roomRef = doc(db, 'group_orders', room.id);
    await updateDoc(roomRef, {
      status: 'ordered',
      finalOrderId: orderId,
      orderOtp: orderOtp,
      chatMessages: [...(room.chatMessages || []), sanitizeForFirestore(finalMsg)],
    });

    // Notify app state
    onAddOrderToApp(newAppOrder);
  };

  // Auto-delete feast room from backend when the order is marked delivered
  useEffect(() => {
    if (!roomData?.finalOrderId || !activeRoomId) return;

    const orderRef = doc(db, 'orders', roomData.finalOrderId);
    const unsub = onSnapshot(orderRef, async (snap) => {
      if (snap.exists()) {
        const ord = snap.data() as Order;
        if (ord.status === 'delivered') {
          console.log('[Auto-Cleanup] Feast room auto-deleting itself upon order delivery:', activeRoomId);
          try {
            await deleteDoc(doc(db, 'group_orders', activeRoomId));
          } catch (e) {
            console.warn('[Auto-Cleanup] Error deleting delivered room:', e);
          }
          localStorage.removeItem('tb_active_group_room_id');
          localStorage.removeItem('tb_placed_group_order_id');
          setActiveRoomId(null);
          setRoomData(null);
          onActiveRoomChange?.(null);
          onClose();
        }
      }
    });

    return () => unsub();
  }, [roomData?.finalOrderId, activeRoomId]);

  // Timeout Handler: 10 minutes up! Prune unpaid items and dispatch paid
  const handleAutoFinalizeAfterTimeout = async (room: GroupOrderRoom) => {
    try {
      const roomRef = doc(db, 'group_orders', room.id);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const freshRoom = snap.data() as GroupOrderRoom;

      if (freshRoom.status === 'ordered' || freshRoom.status === 'disbanded') return;

      const paidItems = updatedItemsFromPaid(freshRoom, freshRoom.members);

      const timeoutMsg: GroupChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'Taash System',
        text: `⏰ 10-Minute window closed! Items for unpaid members were dropped. Order is proceeding with all paid dishes!`,
        type: 'system',
        timestamp: new Date().toISOString(),
      };

      if (paidItems.length > 0) {
        await finalizeAndDispatchOrder(freshRoom, paidItems, freshRoom.paymentModeLock || 'online');
      } else {
        await updateDoc(roomRef, {
          status: 'disbanded',
          chatMessages: [...(freshRoom.chatMessages || []), sanitizeForFirestore(timeoutMsg)],
        });
      }
    } catch (err) {
      console.error('Error auto-finalizing room after timeout:', err);
    }
  };

  // Copy Link / PIN
  const handleCopyLink = () => {
    if (!roomData) return;
    const shareUrl = `${window.location.origin}?groupRoomId=${roomData.code}&groupPin=${roomData.pin}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    if (!roomData) return;
    navigator.clipboard.writeText(roomData.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!roomData) return;
    const shareUrl = `${window.location.origin}?groupRoomId=${roomData.code}&groupPin=${roomData.pin}`;
    const text = encodeURIComponent(
      `🔥 Join our Taash Bhatti Group Feast: *${roomData.name}*!\n\n` +
      `🔑 Room Code: *${roomData.code}*\n` +
      `🔒 4-Digit PIN: *${roomData.pin}*\n` +
      `🍲 Mode: ${roomData.treatMode === 'group_treat' ? 'Group Treat (Split)' : 'Host Treat 👑'}\n\n` +
      `Tap link to join and add your dishes:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Leave active room locally
  const handleLeaveRoomLocally = () => {
    localStorage.removeItem('tb_active_group_room_id');
    setActiveRoomId(null);
    setRoomData(null);
    setViewMode('landing');
  };

  // Filtered Meals for in-room quick-add drawer
  const filteredDrawerMeals = useMemo(() => {
    return meals.filter((meal) => {
      const matchSearch =
        !menuSearch.trim() ||
        meal.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        meal.description.toLowerCase().includes(menuSearch.toLowerCase());
      const matchVeg = !menuVegOnly || meal.isVeg;
      return matchSearch && matchVeg;
    });
  }, [meals, menuSearch, menuVegOnly]);

  // ---------------- RENDER ----------------

  return (
    <div className="fixed inset-0 z-50 bg-brand-charcoal/80 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-2xl h-[92vh] sm:h-[88vh] bg-stone-900 border border-stone-800 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
        
        {/* --- GLOBAL MODAL TOP BAR --- */}
        <div className="px-4 py-3.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 flex items-center justify-center text-stone-950 font-black shadow-md shadow-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1">
                  <span>Taash Dawat</span>
                  <span className="text-brand-orange font-bold">Group Ordering</span>
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-brand-orange/20 text-brand-orange text-[9px] font-black uppercase tracking-wider border border-brand-orange/30">
                  Live Sync
                </span>
              </div>
              <p className="text-[10px] text-stone-400 truncate">
                {roomData ? roomData.name : 'Create or join a shared food room with PIN'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'room' && isHost && (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer text-xs font-bold"
                title="Room Settings"
              >
                ⚙️ Host Settings
              </button>
            )}

            {viewMode === 'room' && !isHost && (
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-300 hover:text-red-400 border border-stone-700 hover:border-red-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Leave Feast Room"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- VIEW: LANDING (Choose Create or Join) --- */}
        {viewMode === 'landing' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="text-center space-y-2 py-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-black uppercase tracking-wider">
                <Flame className="w-4 h-4 text-brand-orange animate-bounce" />
                <span>Woodfire Group Feast Experience</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Order Together. Share Food. <span className="text-brand-orange">Split or Treat!</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
                Start a shared cart room protected by a 4-digit PIN. Friends add their picks, chat in real-time, and split payments seamlessly with a 10-minute countdown!
              </p>
            </div>

            {/* Active Room Banner on Account */}
            {hasActiveRoom && roomData && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shrink-0 text-xl">
                    👑
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                        Active Feast Room on Your Account
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-200 bg-black/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                        {roomData.code}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate mt-0.5">{roomData.name}</h4>
                    <p className="text-[11px] text-stone-300">
                      {Object.keys(roomData.members || {}).length} members • Active rooms must be left or disbanded before creating another.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('room')}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>Enter Room</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="px-3.5 py-2 bg-stone-800/90 hover:bg-red-950/60 text-stone-300 hover:text-red-400 border border-stone-700 hover:border-red-500/50 font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    {isHost ? 'Disband' : 'Leave'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Create a Group Feast */}
              <div
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalAction('create');
                    setShowAuthModal(true);
                  } else if (hasActiveRoom) {
                    setShowActiveRoomConflictModal(true);
                  } else {
                    setViewMode('create');
                  }
                }}
                className={`group p-5 rounded-2xl bg-gradient-to-br from-stone-800/80 to-stone-900 border-2 shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                  hasActiveRoom
                    ? 'border-amber-500/40 hover:border-amber-400'
                    : 'border-brand-orange/40 hover:border-brand-orange hover:shadow-brand-orange/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange text-2xl group-hover:scale-110 transition-transform">
                      👑
                    </div>
                    {hasActiveRoom && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/40">
                        1 Active Room Limit
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white group-hover:text-brand-orange transition-colors">
                      Host A New Feast Room
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {hasActiveRoom
                        ? `You currently have Feast Room ${roomData?.code} active. You must leave or disband your current room before creating another.`
                        : 'Set a 4-digit PIN, choose between Group Treat (split) or Your Treat (you pay), select address, and invite friends.'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-stone-700/60 flex items-center justify-between text-xs font-black text-brand-orange uppercase tracking-wider">
                  <span>{hasActiveRoom ? 'Manage / Leave Current Room' : 'Create Room'}</span>
                  <span>→</span>
                </div>
              </div>

              {/* Option 2: Join Existing Feast */}
              <div
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalAction('join');
                    setShowAuthModal(true);
                  } else {
                    setViewMode('join');
                  }
                }}
                className="group p-5 rounded-2xl bg-gradient-to-br from-stone-800/80 to-stone-900 border-2 border-stone-700 hover:border-stone-500 shadow-lg cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-700/50 border border-stone-600 flex items-center justify-center text-stone-300 text-2xl group-hover:scale-110 transition-transform">
                    🔑
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                      Join With Code & PIN
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      Have a Room Code or link from a friend? Enter their 4-digit PIN to join the cart and pick your favorite woodfire dishes.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-stone-700/60 flex items-center justify-between text-xs font-black text-stone-300 group-hover:text-amber-400 uppercase tracking-wider">
                  <span>Enter Code</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {/* How it Works Cards */}
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Group Ordering Rules & Flow</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-stone-300">
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80 space-y-1">
                  <span className="font-black text-brand-orange">1. PIN Protected</span>
                  <p className="text-stone-400 text-[10px]">Only people with your 4-digit PIN can enter your feast room and view or add food.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80 space-y-1">
                  <span className="font-black text-amber-400">2. 10-Min Payment Timer</span>
                  <p className="text-stone-400 text-[10px]">When the 1st person pays, a 10-minute timer ticks. If someone fails to pay, their items are excluded!</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80 space-y-1">
                  <span className="font-black text-emerald-400">3. Non-Cancellable</span>
                  <p className="text-stone-400 text-[10px]">Once group payment finishes, food bakes live in the woodfire Bhatti. No cancellations once placed.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: CREATE ROOM --- */}
        {viewMode === 'create' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                className="text-xs font-bold text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                ← Back
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-brand-orange">
                Step 1 of 1: Room Setup
              </span>
            </div>

            <div className="space-y-4">
              {/* Room Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-300 mb-1.5">
                  Feast Room Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Biryani Bash with College Friends"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-brand-orange font-bold"
                />
              </div>

              {/* 4-Digit PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Set 4-Digit Security PIN</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePin(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[11px] text-brand-orange hover:underline font-bold cursor-pointer"
                  >
                    🎲 Randomize PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full tracking-widest text-center text-xl font-black px-3.5 py-2.5 rounded-xl bg-stone-800 border border-amber-400/50 text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                  placeholder="1234"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Anyone who joins will be asked to enter this 4-digit PIN.
                </p>
              </div>

              {/* Treat Mode Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-300 mb-2">
                  Payment & Ordering Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCreateTreatMode('group_treat')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      createTreatMode === 'group_treat'
                        ? 'bg-brand-orange/10 border-brand-orange text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs uppercase tracking-wider text-brand-orange flex items-center gap-1">
                        <span>🤝 Group Treat</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange font-bold">
                        Split & Add
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      Everyone can add their own dishes to the cart and pays for their own share. 10-min countdown on 1st payment!
                    </p>
                  </div>

                  <div
                    onClick={() => setCreateTreatMode('your_treat')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      createTreatMode === 'your_treat'
                        ? 'bg-amber-500/10 border-amber-400 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>👑 Your Treat</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                        Host Treats
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      You treat everyone! Only you (the host) can add/remove dishes, and you pay for the entire bill.
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Feast Delivery Address</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Free Delivery on &gt; ₹200
                  </span>
                </div>

                <div className="space-y-2">
                  {user.savedAddresses && user.savedAddresses.length > 0 && (
                    <div className="space-y-1 pb-1">
                      <span className="text-[10px] font-bold text-stone-400">Select from your saved addresses:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.savedAddresses.map((addr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDeliveryStreet(addr);
                              setEditAddressLabel(`Saved Address #${idx + 1}`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              deliveryStreet === addr
                                ? 'bg-brand-orange text-stone-950 border-brand-orange shadow-sm'
                                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
                            }`}
                          >
                            <Home className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{addr}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="Street / Apartment / Office Address"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      placeholder="City (e.g. Muzaffarpur)"
                      className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                    />
                    <input
                      type="text"
                      value={deliveryPincode}
                      onChange={(e) => setDeliveryPincode(e.target.value)}
                      placeholder="Pincode (e.g. 842002)"
                      className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-amber-300/90 leading-tight">
                  ℹ️ If the collective group food cart is under ₹200, a ₹40 delivery fee will be borne by you (the host). Above ₹200 is 100% Free!
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={loadingRoom}
                onClick={handleCreateRoom}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingRoom ? (
                  <span>Setting Up Feast Room...</span>
                ) : (
                  <>
                    <Flame className="w-4 h-4 fill-stone-950" />
                    <span>Create Feast Room & Get Share Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW: JOIN ROOM --- */}
        {viewMode === 'join' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                className="text-xs font-bold text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                ← Back
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Join Group Room
              </span>
            </div>

            <div className="max-w-md mx-auto space-y-4 pt-2">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">Enter Feast Credentials</h3>
                <p className="text-xs text-stone-400">
                  Ask your host for the Room Code and 4-digit PIN
                </p>
              </div>

              {roomError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{roomError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-300 mb-1.5">
                  Room Code or Link
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. TB-8492"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-brand-orange font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>4-Digit Security PIN</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="4-digit PIN"
                  className="w-full tracking-widest text-center text-xl font-black px-3.5 py-2.5 rounded-xl bg-stone-800 border border-amber-400/50 text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-brand-orange font-bold"
                />
              </div>

              <button
                type="button"
                disabled={loadingRoom}
                onClick={handleJoinRoom}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingRoom ? (
                  <span>Verifying PIN...</span>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Join Feast Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW: ACTIVE ROOM EXPERIENCE --- */}
        {viewMode === 'room' && roomData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* ROOM SUB-HEADER: Code, PIN, Share & Live Timer Banner */}
            <div className="p-3 sm:px-4 bg-stone-950 border-b border-stone-800 space-y-2.5 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-brand-orange font-mono font-black text-xs tracking-wider border border-stone-700 flex items-center gap-1.5">
                    <span>Code: {roomData.code}</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 font-mono font-black text-xs tracking-wider border border-amber-400/40 hover:bg-amber-400/30 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Click to copy 4-digit PIN"
                  >
                    <Lock className="w-3 h-3" />
                    <span>PIN: {roomData.pin}</span>
                    {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                  </button>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    roomData.treatMode === 'your_treat'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {roomData.treatMode === 'your_treat' ? 'Host Treats 👑' : 'Group Treat 🤝'}
                  </span>
                </div>

                {/* Share Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Feast Delivery Address Bar with Edit Access for Creator */}
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                        Delivery Address:
                      </span>
                      {roomData.savedAddressLabel && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-stone-800 text-amber-300 border border-stone-700">
                          {roomData.savedAddressLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-200 truncate text-[11px] font-medium">
                      {roomData.deliveryAddress?.street}, {roomData.deliveryAddress?.city} - {roomData.deliveryAddress?.pincode}
                      {roomData.deliveryAddress?.landmark ? ` (Near ${roomData.deliveryAddress?.landmark})` : ''}
                    </p>
                  </div>
                </div>

                {isHost && roomData.status !== 'ordered' && (
                  <button
                    type="button"
                    onClick={handleOpenEditAddress}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-brand-orange text-xs font-black flex items-center gap-1.5 border border-stone-700 hover:border-brand-orange/50 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Change Address</span>
                  </button>
                )}

                {roomData.status === 'ordered' && (
                  <span className="shrink-0 px-2 py-1 rounded-lg bg-stone-800/80 text-stone-400 text-[10px] font-bold flex items-center gap-1 border border-stone-700">
                    <Lock className="w-3 h-3" />
                    <span>Address Locked</span>
                  </span>
                )}
              </div>

              {/* 10-Minute Countdown Banner if first payment occurred! */}
              {roomData.status === 'payment_started' && secondsRemaining !== null && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">Payment Window Active:</span>
                        <span className="font-mono font-black text-amber-300 text-sm">
                          {formatTimer(secondsRemaining)}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-300">
                        Payment mode locked to: <strong className="text-white uppercase">{roomData.paymentModeLock === 'cod' ? 'Cash on Delivery (COD)' : 'Prepaid / Online'}</strong>. Unpaid items drop on timeout.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* If Order Placed Banner */}
              {roomData.status === 'ordered' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white">Feast Order Placed Successfully! 🔥</span>
                      <p className="text-[10px] text-emerald-300 truncate">
                        Order #{roomData.finalOrderId} is cooking at {roomData.kitchenName}. Non-cancellable.
                      </p>
                    </div>
                  </div>

                  {roomData.orderOtp && (
                    <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-amber-500/50 shrink-0">
                      <span className="text-[10px] font-black uppercase text-amber-400">Door OTP:</span>
                      <span className="font-mono text-sm font-black text-amber-200 tracking-widest">{roomData.orderOtp}</span>
                      <button
                        type="button"
                        onClick={handleCopyOtp}
                        className="p-1 text-stone-300 hover:text-white"
                        title="Copy OTP"
                      >
                        {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nav Tabs inside Room */}
              <div className="flex items-center justify-between border-t border-stone-800/80 pt-2 text-xs font-black">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRoomTab('cart')}
                    className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomTab === 'cart'
                        ? 'bg-brand-orange text-stone-950 shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Shared Cart</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                      {roomData.items?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomTab('chat')}
                    className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomTab === 'chat'
                        ? 'bg-brand-orange text-stone-950 shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Feast Chat</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                      {roomData.chatMessages?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomTab('members')}
                    className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomTab === 'members'
                        ? 'bg-brand-orange text-stone-950 shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Members</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                      {Object.keys(roomData.members || {}).length}
                    </span>
                  </button>
                </div>

                {/* Add food button directly */}
                {roomData.status !== 'ordered' && (!roomData.cartLocked || isHost) && (
                  <button
                    type="button"
                    onClick={() => setMenuDrawerOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-brand-orange text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm hover:scale-[1.02] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Food</span>
                  </button>
                )}
              </div>
            </div>

            {/* TAB CONTENT 1: SHARED CART */}
            {roomTab === 'cart' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                {roomData.items?.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-3xl mx-auto">
                      🍲
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white">The Group Cart is Empty</h4>
                      <p className="text-xs text-stone-400 max-w-xs mx-auto">
                        {roomData.treatMode === 'your_treat' && !isHost
                          ? 'Waiting for the host to curate dishes for the feast...'
                          : 'Tap "Add Food" to browse woodfire biryanis, kebabs, and tandoori specials.'}
                      </p>
                    </div>
                    {(!roomData.cartLocked || isHost) && (
                      <button
                        type="button"
                        onClick={() => setMenuDrawerOpen(true)}
                        className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-md cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Browse Menu</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render Grouped by Member */}
                    {Object.keys(memberItemsMap).map((userId) => {
                      const items = memberItemsMap[userId];
                      const memberName = items[0]?.addedByName || 'Member';
                      const isMe = userId === currentUserId;
                      const memberSubtotal = items.reduce((s, i) => s + i.meal.price * i.quantity, 0);
                      const memberStatus = roomData.members[userId];

                      return (
                        <div
                          key={userId}
                          className="p-3 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-stone-800 text-[10px] font-black text-brand-orange flex items-center justify-center border border-stone-700">
                                {memberName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs font-black text-white">
                                {memberName} {isMe ? '(You)' : ''}
                              </span>
                              {userId === roomData.hostUserId && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                                  Host 👑
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-stone-300">
                                ₹{memberSubtotal}
                              </span>
                              {memberStatus?.hasPaid ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Paid</span>
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-bold">
                                  Unpaid ⏳
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-2">
                            {items.map((item) => {
                              const canEdit =
                                (roomData.treatMode === 'your_treat' && isHost) ||
                                (roomData.treatMode === 'group_treat' && (isMe || isHost));

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-stone-900/90 border border-stone-800/80"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={item.meal.image}
                                      alt={item.meal.name}
                                      className="w-10 h-10 rounded-lg object-cover border border-stone-700 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${item.meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <h5 className="text-xs font-bold text-white truncate">
                                          {item.meal.name}
                                        </h5>
                                      </div>
                                      <span className="text-[11px] text-stone-400">
                                        ₹{item.meal.price} × {item.quantity} = <strong className="text-white">₹{item.meal.price * item.quantity}</strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Quantity Controls */}
                                  {canEdit && roomData.status !== 'ordered' && !roomData.cartLocked ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemQuantity(item.id, -1)}
                                        className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-5 text-center text-xs font-black text-white">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemQuantity(item.id, 1)}
                                        className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-black text-stone-300 px-2 py-1 bg-stone-800/80 rounded-lg">
                                      Qty: {item.quantity}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: LIVE FEAST CHAT */}
            {roomTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Header OTP Banner: Shown in chat header all the time once order is placed */}
                {(roomData.status === 'ordered' || roomData.orderOtp) && (
                  <div className="bg-stone-950 border-b border-amber-500/30 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-md shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                            Door Delivery OTP
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 truncate">
                          Share this 4-digit code with the delivery rider at door arrival
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1 rounded-xl bg-stone-900 border border-amber-400/60 shadow-inner flex items-center gap-2">
                        <span className="font-mono text-base sm:text-lg font-black text-amber-200 tracking-widest">
                          {roomData.orderOtp || '7492'}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyOtp}
                          className="p-1 text-stone-300 hover:text-white cursor-pointer active:scale-90 transition-transform"
                          title="Copy Delivery OTP"
                        >
                          {copiedOtp ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                  {(roomData.chatMessages || []).map((msg) => {
                    const isSystem = msg.type === 'system' || msg.type === 'food_added' || msg.type === 'payment_made';
                    const isMe = msg.senderId === currentUserId;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-1.5">
                          <span className="inline-block px-3 py-1 rounded-full bg-stone-950/80 border border-stone-800 text-[10px] text-stone-400 font-medium">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-stone-400 font-bold px-1">
                          <span>{msg.senderName}</span>
                          {msg.isHost && <span className="text-amber-400">👑</span>}
                          <span className="text-[9px] text-stone-500 font-normal">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`px-3 py-2 rounded-2xl text-xs font-medium ${
                            isMe
                              ? 'bg-gradient-to-r from-brand-orange to-amber-500 text-stone-950 rounded-tr-none font-bold'
                              : 'bg-stone-800 text-white rounded-tl-none border border-stone-700/80'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {/* Message Reactions & Quick Reaction Trigger */}
                        <div className={`flex items-center gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {msg.reactions &&
                            Object.entries(msg.reactions).map(([emoji, uids]) => {
                              const userIds = (uids as string[]) || [];
                              if (!userIds || userIds.length === 0) return null;
                              const reactedByMe = userIds.includes(currentUserId);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleMessageReaction(msg.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all cursor-pointer ${
                                    reactedByMe
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                      : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700'
                                  }`}
                                  title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold">{userIds.length}</span>
                                </button>
                              );
                            })}

                          {/* Quick react button on message */}
                          <button
                            type="button"
                            onClick={() => handleToggleMessageReaction(msg.id, '🔥')}
                            title="React with fire"
                            className="px-1.5 py-0.5 rounded-full bg-stone-800/60 hover:bg-stone-700 text-[10px] text-stone-400 hover:text-amber-400 border border-stone-700/50 transition-colors cursor-pointer"
                          >
                            +🔥
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleMessageReaction(msg.id, '🤤')}
                            title="React with delicious"
                            className="px-1.5 py-0.5 rounded-full bg-stone-800/60 hover:bg-stone-700 text-[10px] text-stone-400 hover:text-amber-400 border border-stone-700/50 transition-colors cursor-pointer"
                          >
                            +🤤
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Emoji Reaction Bar (Instant reaction sends) */}
                <div className="px-3 py-1.5 bg-stone-950/95 border-t border-stone-800 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 shrink-0 mr-1 flex items-center gap-1">
                    <span>⚡ React:</span>
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {['🔥', '🤤', '🍢', '🍗', '🍕', '👑', '🚀', '👏', '❤️', '😂'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSendQuickEmojiReaction(emoji)}
                        className="w-7 h-7 rounded-lg bg-stone-800/90 hover:bg-stone-700 hover:scale-125 active:scale-95 text-sm flex items-center justify-center cursor-pointer transition-all shadow-sm shrink-0"
                        title={`Send ${emoji} to chat`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Chat Situational Chips */}
                <div className="p-2 bg-stone-950/90 border-t border-stone-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {[
                    'Hurry up guys! ⏳',
                    'Added my favorites! 🍢',
                    'Paid my share! 💸',
                    'This treat is on me! 👑',
                    'Ready to order! 🔥',
                    'Woodfire aroma is calling 🤤',
                    'Biryani ready? 🍚',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setChatInput(chip);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-300 hover:text-white font-bold whitespace-nowrap cursor-pointer transition-colors border border-stone-700/60 shrink-0"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div className="p-2.5 bg-stone-950 border-t border-stone-800 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder={`Message feast members...`}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSendChatMessage}
                    className="p-2 rounded-xl bg-brand-orange hover:bg-amber-500 text-stone-950 font-black cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: MEMBERS */}
            {roomTab === 'members' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-400">
                    Connected Feast Members
                  </span>
                  <span className="text-xs text-stone-400">
                    {Object.keys(roomData.members || {}).length} Total
                  </span>
                </div>

                <div className="space-y-2">
                  {(Object.values(roomData.members || {}) as GroupOrderMember[]).map((m) => {
                    const memberItems = (roomData.items || []).filter((i) => i.addedByUserId === m.id);
                    const memberTotal = memberItems.reduce((s, i) => s + i.meal.price * i.quantity, 0);

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-stone-800 text-xs font-black text-brand-orange flex items-center justify-center border border-stone-700 shrink-0">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-black text-white truncate">
                                {m.name}
                              </h5>
                              {m.isHost && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black">
                                  Host 👑
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-400">
                              {memberItems.length} dishes in cart • Total: ₹{memberTotal}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {m.hasPaid ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Paid</span>
                            </span>
                          ) : memberItems.length === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-[10px] font-bold">
                              Spectator
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                              Unpaid ⏳
                            </span>
                          )}

                          {isHost && m.id !== currentUserId && roomData.status !== 'ordered' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id, m.name)}
                              className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- BOTTOM CHECKOUT & PAYMENT ACTION BAR --- */}
            <div className="p-3 sm:px-4 bg-stone-950 border-t border-stone-800 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-400">Food Subtotal: </span>
                  <strong className="text-white">₹{totalFoodAmount}</strong>
                  <span className="text-stone-400 ml-2">Delivery: </span>
                  <strong className={deliveryFee === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {deliveryFee === 0 ? 'FREE' : '₹40 (Host)'}
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-stone-400 text-[11px]">
                    {roomData.treatMode === 'your_treat' ? (isHost ? 'Total Bill:' : 'Host Pays:') : 'Your Share:'}
                  </span>
                  <div className="text-sm font-black text-brand-orange">
                    ₹{myShareAmount}
                  </div>
                </div>
              </div>

              {/* Status Action Button */}
              {roomData.status === 'ordered' ? (
                <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-black text-xs text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Order Dispatched to Bhatti (#{roomData.finalOrderId})</span>
                </div>
              ) : currentMember?.hasPaid ? (
                <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-black text-xs text-center flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>You Have Paid! Waiting for remaining members or timer.</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={myShareAmount <= 0}
                  onClick={handleOpenPaymentModal}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange disabled:opacity-50 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4 fill-stone-950" />
                  <span>
                    {roomData.treatMode === 'your_treat'
                      ? (isHost ? `Pay Full Bill (₹${myShareAmount})` : 'Host is Paying')
                      : `Pay My Share (₹${myShareAmount})`}
                  </span>
                </button>
              )}

              <p className="text-[10px] text-center text-stone-400">
                ⚠️ Non-cancellable once placed — Dispatched directly to the live Bhatti.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --- QUICK ADD MENU DRAWER / MODAL --- */}
      <AnimatePresence>
        {menuDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4"
          >
            <div className="w-full sm:max-w-xl h-[80vh] bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
              <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-brand-orange" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Add Dishes to Feast Cart
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Veg Filter */}
              <div className="p-3 bg-stone-950/80 border-b border-stone-800 flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search biryani, kebabs, paneer..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMenuVegOnly(!menuVegOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                    menuVegOnly
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  🌱 Veg Only
                </button>
              </div>

              {/* Dishes List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                {filteredDrawerMeals.map((meal) => {
                  const qtyInGroupCart = (roomData?.items || [])
                    .filter((i) => i.mealId === meal.id && i.addedByUserId === currentUserId)
                    .reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <div
                      key={meal.id}
                      className="p-2.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={meal.image}
                          alt={meal.name}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <h5 className="text-xs font-black text-white truncate">{meal.name}</h5>
                          </div>
                          <span className="text-xs font-black text-brand-orange">₹{meal.price}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddItemToGroupCart(meal)}
                        className="px-3 py-1.5 rounded-xl bg-brand-orange hover:bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-transform active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {qtyInGroupCart > 0 ? `(${qtyInGroupCart})` : '+'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {roomData?.items?.length || 0} items in group cart
                </span>
                <button
                  type="button"
                  onClick={() => setMenuDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Done Adding
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PAYMENT MODAL --- */}
      <AnimatePresence>
        {paymentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4 text-stone-100 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-orange" />
                  <h4 className="text-sm font-black text-white">Complete Group Payment</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="p-1 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-2 space-y-1">
                <span className="text-xs text-stone-400 uppercase tracking-wider font-bold">
                  Amount Due
                </span>
                <div className="text-2xl font-black text-brand-orange">
                  ₹{myShareAmount}
                </div>
                <p className="text-[10px] text-stone-400">
                  Delivering to: {roomData?.deliveryAddress.street}, {roomData?.deliveryAddress.city}
                </p>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-300">
                  Select Payment Mode
                </span>

                {roomData?.paymentModeLock && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    🔒 Mode locked to <span className="uppercase">{roomData.paymentModeLock === 'cod' ? 'Cash on Delivery (COD)' : 'Prepaid Online'}</span> by 1st payment!
                  </div>
                )}

                <div className="space-y-2">
                  {/* Prepaid Online */}
                  <label
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedPayMode === 'online'
                        ? 'bg-brand-orange/10 border-brand-orange text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400'
                    } ${roomData?.paymentModeLock && roomData.paymentModeLock !== 'online' ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-brand-orange" />
                      <div>
                        <div className="text-xs font-black text-white">Prepaid Online (UPI / Cards)</div>
                        <div className="text-[10px] text-stone-400">Instant UPI, GPay, PhonePe, Cards</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="group_pay_mode"
                      checked={selectedPayMode === 'online'}
                      onChange={() => setSelectedPayMode('online')}
                      className="accent-brand-orange"
                    />
                  </label>

                  {/* Cash on Delivery */}
                  <label
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedPayMode === 'cod'
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400'
                    } ${roomData?.paymentModeLock && roomData.paymentModeLock !== 'cod' ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-black text-white">Cash on Delivery (COD)</div>
                        <div className="text-[10px] text-stone-400">Pay cash upon rider arrival</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="group_pay_mode"
                      checked={selectedPayMode === 'cod'}
                      onChange={() => setSelectedPayMode('cod')}
                      className="accent-amber-400"
                    />
                  </label>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[10px] text-stone-400 space-y-1">
                <p>• Once first payment is completed, a 10-minute timer will activate.</p>
                <p>• Group orders are strictly non-cancellable once placed.</p>
              </div>

              <button
                type="button"
                disabled={payingInProgress}
                onClick={handleCompletePayment}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {payingInProgress ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Pay ₹{myShareAmount}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HOST SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4 text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>👑 Host Control Settings</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Lock / Unlock Cart */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleCartLock();
                    setShowSettingsModal(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      {roomData?.cartLocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{roomData?.cartLocked ? 'Unlock Group Cart' : 'Lock Group Cart'}</span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {roomData?.cartLocked ? 'Allow members to add/edit items again' : 'Prevent members from modifying items before checkout'}
                    </p>
                  </div>
                  <span className="text-xs font-black text-stone-300">→</span>
                </button>

                {/* Edit Delivery Address (Host only, before order placed) */}
                {roomData?.status !== 'ordered' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      handleOpenEditAddress();
                    }}
                    className="w-full p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-brand-orange" />
                        <span>Edit Delivery Address</span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Update feast location or switch between your saved addresses
                      </p>
                    </div>
                    <span className="text-xs font-black text-stone-300">→</span>
                  </button>
                )}

                {/* Disband Room (Locked if payment made) */}
                {hasAnyPayment ? (
                  <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-amber-500/40 text-left space-y-1.5 shadow-inner">
                    <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Room Deletion Locked (Payment Started)</span>
                    </div>
                    <p className="text-[10px] text-stone-300 leading-relaxed">
                      The feast room cannot be deleted or disbanded once even 1 payment is made. Member funds are safely secured for kitchen fulfillment.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisbandRoom}
                    className="w-full p-3 rounded-2xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-black text-red-400 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Disband Feast Room</span>
                      </div>
                      <p className="text-[10px] text-red-300/80 mt-0.5">
                        Permanently deletes room from backend database.
                      </p>
                    </div>
                    <span className="text-xs font-black text-red-400">→</span>
                  </button>
                )}

                {/* Leave Room Locally */}
                <button
                  type="button"
                  onClick={() => {
                    handleLeaveRoomLocally();
                    setShowSettingsModal(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs font-bold text-center cursor-pointer transition-colors"
                >
                  Exit to Landing Screen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CREATOR FEAST ADDRESS EDIT MODAL --- */}
      <AnimatePresence>
        {showAddressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4 text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Feast Delivery Address</h4>
                    <p className="text-[10px] text-stone-400">Host can select saved addresses or edit details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Saved Addresses Quick Selection */}
              {user.savedAddresses && user.savedAddresses.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Select from saved addresses:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {user.savedAddresses.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditStreet(addr);
                          setEditAddressLabel(`Saved Address #${idx + 1}`);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          editStreet === addr
                            ? 'bg-brand-orange/15 border-brand-orange text-white'
                            : 'bg-stone-800/60 border-stone-700 text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Home className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                          <span className="truncate">{addr}</span>
                        </div>
                        {editStreet === addr && (
                          <Check className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Street / Flat / House Address
                  </label>
                  <input
                    type="text"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    placeholder="e.g. Flat 402, Royal Residency, Club Road"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="City (e.g. Muzaffarpur)"
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value)}
                      placeholder="842002"
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={editLandmark}
                    onChange={(e) => setEditLandmark(e.target.value)}
                    placeholder="Near LIC Building, Zero Mile"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-brand-orange font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Address Label Tag
                  </label>
                  <div className="flex items-center gap-2">
                    {['Home', 'Work', 'Party Place', 'Hostel'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setEditAddressLabel(lbl)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          editAddressLabel === lbl
                            ? 'bg-amber-400 text-stone-950 border-amber-400 font-black'
                            : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[10px] text-stone-400">
                ℹ️ All feast participants will immediately see the updated delivery destination in real-time.
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingAddress}
                  onClick={handleSaveDeliveryAddress}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-stone-950 text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {savingAddress ? <span>Saving...</span> : <span>Update Feast Address</span>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- AUTHENTICATION REQUIRED BARRIER MODAL --- */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4 text-stone-100 text-center">
              <div className="w-14 h-14 rounded-3xl bg-brand-orange/20 border-2 border-brand-orange/40 flex items-center justify-center text-brand-orange text-2xl mx-auto shadow-inner">
                <Lock className="w-7 h-7 text-brand-orange" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-white">
                  Authentication Required
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Only authenticated users can create or join live Taash Bhatti feast rooms to protect group order verification, transparent bill splitting, and delivery integrity.
                </p>
              </div>

              {authError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-[11px] text-left">
                  {authError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={authSubmitting}
                  onClick={handleGoogleSignInForRoom}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98"
                >
                  {authSubmitting ? (
                    <span>Signing in with Google...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-stone-900" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    onRequestSignIn?.();
                  }}
                  className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 cursor-pointer transition-colors"
                >
                  <span>Use Phone / Email Sign-In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-2 text-stone-500 hover:text-stone-400 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- ACTIVE FEAST ROOM CONFLICT MODAL --- */}
      <AnimatePresence>
        {showActiveRoomConflictModal && roomData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-stone-900 border-2 border-brand-orange/60 rounded-3xl p-6 shadow-2xl space-y-4 text-stone-100 text-left">
              <div className="flex items-start gap-3 border-b border-stone-800 pb-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-2xl shrink-0">
                  ⚠️
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-black text-white">
                    Active Feast Room Already in Progress
                  </h4>
                  <p className="text-xs text-amber-400 font-bold font-mono mt-0.5">
                    {roomData.name} ({roomData.code})
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                You already have an active Feast Room (<strong className="text-white font-black">{roomData.name}</strong> • <span className="font-mono text-amber-400 font-bold">{roomData.code}</span>) on your account.
                Per policy, you cannot create another feast room until you leave your current room or it is disbanded.
              </p>

              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-1 text-[11px] text-stone-400">
                <div className="flex items-center justify-between text-stone-300 font-bold">
                  <span>Your Role in Room:</span>
                  <span className="text-brand-orange">{isHost ? '👑 Host' : 'Participant'}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300 font-bold">
                  <span>Total Members:</span>
                  <span>{Object.keys(roomData.members || {}).length}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300 font-bold">
                  <span>Cart Dishes:</span>
                  <span>{roomData.items?.length || 0} items</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowActiveRoomConflictModal(false);
                    setViewMode('room');
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98"
                >
                  <span>Enter Current Feast Room</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleLeaveRoom();
                  }}
                  className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-red-950/70 text-stone-200 hover:text-red-300 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 hover:border-red-500/40 cursor-pointer transition-colors"
                >
                  <span>{isHost ? 'Disband Current Room & Start Fresh' : 'Leave Current Room & Start Fresh'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowActiveRoomConflictModal(false)}
                  className="w-full py-2 text-stone-500 hover:text-stone-400 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
