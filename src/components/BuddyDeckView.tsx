/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Sparkles, 
  ShoppingBag, 
  Flame, 
  RotateCw, 
  Search, 
  ArrowRight, 
  Check, 
  Lock, 
  ChefHat, 
  Layers, 
  Clock, 
  Plus, 
  Minus, 
  MapPin, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Share2, 
  ArrowLeft,
  Gift,
  ShieldCheck,
  Send,
  ExternalLink,
  Flame as FireIcon,
  Compass
} from 'lucide-react';
import { Meal, User, Kitchen, Order, BuddyDeckRequest } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

interface BuddyDeckViewProps {
  user: User;
  fbUser: any;
  meals: Meal[];
  allKitchens: Kitchen[];
  onNavigateHome: () => void;
  onOpenOrders?: () => void;
  initialDeckId?: string | null;
}

interface BuddyCartItem {
  meal: Meal;
  quantity: number;
}

export default function BuddyDeckView({
  user,
  fbUser,
  meals,
  allKitchens,
  onNavigateHome,
  onOpenOrders,
  initialDeckId
}: BuddyDeckViewProps) {
  const currentUserId = fbUser?.uid || user.id || 'guest_sender';

  // Deck Lookup & Connection State
  const [deckInput, setDeckInput] = useState(initialDeckId || '');
  const [connectedReceiver, setConnectedReceiver] = useState<User | null>(null);
  const [receiverUid, setReceiverUid] = useState<string>(initialDeckId || '');
  const [loadingReceiver, setLoadingReceiver] = useState(false);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [availableBuddies, setAvailableBuddies] = useState<{ uid: string; name: string; email: string; addressCount: number }[]>([]);

  // Receiver's Deck Meals & Card states
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'veg' | 'non_veg' | 'high_protein'>('all');

  // Buddy Cart State
  const [buddyCart, setBuddyCart] = useState<BuddyCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Receiver Address & Bhatti Selection State
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedBhattiId, setSelectedBhattiId] = useState<string>(''); // empty = broadcast

  // Approval Code State
  const [activeRequest, setActiveRequest] = useState<BuddyDeckRequest | null>(null);
  const [approvalCodeInput, setApprovalCodeInput] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Payment method (Prepaid only, no COD)
  const [selectedPrepaidMethod, setSelectedPrepaidMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch sample buddies/recent athletes from Firestore so users can easily test
  useEffect(() => {
    let isMounted = true;
    async function loadSampleUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: { uid: string; name: string; email: string; addressCount: number }[] = [];
        snap.forEach((d) => {
          if (d.id !== currentUserId) {
            const data = d.data() as User;
            list.push({
              uid: d.id,
              name: data.name || 'Athlete Friend',
              email: data.email || '',
              addressCount: (data.savedAddresses || []).length
            });
          }
        });
        if (isMounted) {
          setAvailableBuddies(list.slice(0, 5));
        }
      } catch (err) {
        console.warn("Could not list sample buddies:", err);
      }
    }
    loadSampleUsers();
    return () => { isMounted = false; };
  }, [currentUserId]);

  // Connect to receiver when initialDeckId is provided
  useEffect(() => {
    if (initialDeckId && initialDeckId.trim()) {
      handleConnectToDeck(initialDeckId.trim());
    }
  }, [initialDeckId]);

  // Connect to receiver's deck
  const handleConnectToDeck = async (deckId: string) => {
    const cleanId = deckId.trim();
    if (!cleanId) return;

    setLoadingReceiver(true);
    setReceiverError(null);

    try {
      // 1. First try by exact document ID
      let userDoc = await getDoc(doc(db, 'users', cleanId));
      let resolvedUid = cleanId;

      // 2. If not found, search by phone or email
      if (!userDoc.exists()) {
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanId.toLowerCase()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          userDoc = snapEmail.docs[0];
          resolvedUid = userDoc.id;
        } else {
          const qPhone = query(collection(db, 'users'), where('phone', '==', cleanId));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            userDoc = snapPhone.docs[0];
            resolvedUid = userDoc.id;
          }
        }
      }

      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        const profileWithId = { ...data, id: resolvedUid };
        setConnectedReceiver(profileWithId);
        setReceiverUid(resolvedUid);

        // Pre-select receiver's first saved address if available
        if (data.savedAddresses && data.savedAddresses.length > 0) {
          setSelectedAddress(data.savedAddresses[0]);
        } else if (data.address) {
          setSelectedAddress(data.address);
        } else {
          setSelectedAddress('Main City Colony, Muzaffarpur');
        }

        // Update URL query state for clean sharing
        try {
          const newUrl = `${window.location.pathname}?deckId=${resolvedUid}`;
          window.history.replaceState(null, '', newUrl);
        } catch (e) {}

      } else {
        setReceiverError(`Could not find a deck for ID "${cleanId}". Check the Deck ID or select a friend below.`);
        setConnectedReceiver(null);
      }
    } catch (err: any) {
      console.error("Error connecting to buddy deck:", err);
      setReceiverError("Failed to fetch buddy deck. Please check your internet connection.");
    } finally {
      setLoadingReceiver(false);
    }
  };

  // Real-time listener for buddy deck request status
  useEffect(() => {
    if (!receiverUid || !currentUserId) return;

    const reqDocId = `${currentUserId}_${receiverUid}`;
    const unsub = onSnapshot(doc(db, 'buddy_deck_requests', reqDocId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BuddyDeckRequest;
        setActiveRequest(data);
        if (data.status === 'accepted' && data.approvalCode) {
          // If code is accepted and matches input, auto-verify
          if (approvalCodeInput.trim() === data.approvalCode.trim()) {
            setIsCodeVerified(true);
          }
        }
      }
    }, (err) => {
      console.warn("Error listening to buddy deck request:", err);
    });

    return () => unsub();
  }, [currentUserId, receiverUid, approvalCodeInput]);

  // Filter receiver's deck meals
  const receiverDeckMeals = useMemo(() => {
    if (!connectedReceiver) return [];
    const deckIds = connectedReceiver.deckMealIds || connectedReceiver.favoriteMealIds || [];
    const matches = meals.filter(m => deckIds.includes(m.id));
    // If receiver's deck is empty, provide top chef recommendations so sender can still order
    if (matches.length === 0) {
      return meals.slice(0, 4);
    }
    return matches;
  }, [connectedReceiver, meals]);

  const filteredMeals = useMemo(() => {
    return receiverDeckMeals.filter(meal => {
      const matchText = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchText) return false;

      if (selectedFilter === 'veg') return meal.isVeg;
      if (selectedFilter === 'non_veg') return !meal.isVeg;
      if (selectedFilter === 'high_protein') return (meal.protein || 0) >= 30;
      return true;
    });
  }, [receiverDeckMeals, searchQuery, selectedFilter]);

  // Buddy Cart Totals
  const cartSubtotal = useMemo(() => {
    return buddyCart.reduce((sum, it) => sum + (it.meal.price * it.quantity), 0);
  }, [buddyCart]);

  const cartTotalItems = useMemo(() => {
    return buddyCart.reduce((sum, it) => sum + it.quantity, 0);
  }, [buddyCart]);

  // Deal card into buddy cart
  const handleDealToBuddyCart = (meal: Meal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBuddyCart(prev => {
      const existing = prev.find(i => i.meal.id === meal.id);
      if (existing) {
        return prev.map(i => i.meal.id === meal.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { meal, quantity: 1 }];
    });
    setToastMsg(`🃏 Dealt "${meal.name}" into Buddy Cart!`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleUpdateQuantity = (mealId: string, delta: number) => {
    setBuddyCart(prev => {
      return prev
        .map(i => {
          if (i.meal.id === mealId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as BuddyCartItem[];
    });
  };

  // Card Flip for Chef Specs
  const handleToggleFlip = (mealId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFlippedCards(prev => ({ ...prev, [mealId]: !prev[mealId] }));
  };

  // Distance helper
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate receiver's nearby Bhattis based on selected address
  const nearbyBhattis = useMemo(() => {
    if (!allKitchens || allKitchens.length === 0) return [];
    const active = allKitchens.filter(k => k.isActive !== false && k.isTakingOrders !== false);
    
    // Default reference coordinates for Muzaffarpur center if address coords not stored
    const refLat = connectedReceiver?.deliveryLat || connectedReceiver?.addressLat || 26.1209;
    const refLng = connectedReceiver?.deliveryLng || connectedReceiver?.addressLng || 85.3647;

    return active.map(k => {
      const dist = (k.lat && k.lng) ? getDistanceKm(refLat, refLng, k.lat, k.lng) : 2.5;
      return {
        ...k,
        distanceKm: dist
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allKitchens, connectedReceiver]);

  // Request Approval from Receiver
  const handleSendApprovalRequest = async () => {
    if (!connectedReceiver || !receiverUid) return;
    setRequestSending(true);
    setCodeError(null);

    const reqDocId = `${currentUserId}_${receiverUid}`;
    const newReq: BuddyDeckRequest = {
      id: reqDocId,
      senderId: currentUserId,
      senderName: user.name || fbUser?.displayName || 'Your Friend',
      senderPhone: user.phone || '9876543210',
      receiverId: receiverUid,
      receiverName: connectedReceiver.name || 'Friend',
      status: 'pending',
      createdAt: new Date().toISOString(),
      selectedAddress: selectedAddress,
      selectedBhattiId: selectedBhattiId,
      itemsCount: cartTotalItems,
    };

    try {
      await setDoc(doc(db, 'buddy_deck_requests', reqDocId), newReq);
      setActiveRequest(newReq);
      setToastMsg(`📨 Approval request sent to ${connectedReceiver.name}! A bubble alert has appeared on their screen.`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      console.error("Error sending buddy deck request:", err);
      setCodeError("Failed to dispatch approval request. Please retry.");
    } finally {
      setRequestSending(false);
    }
  };

  // Verify Receiver's 6-Digit Code
  const handleVerifyCode = () => {
    setCodeError(null);
    const entered = approvalCodeInput.trim();

    if (entered.length !== 6) {
      setCodeError("Please enter the complete 6-digit approval code.");
      return;
    }

    if (!activeRequest || activeRequest.status !== 'accepted' || !activeRequest.approvalCode) {
      setCodeError(`Waiting for ${connectedReceiver?.name || 'receiver'} to accept the request on their screen first.`);
      return;
    }

    // Check expiration (2 hours from acceptance)
    if (activeRequest.expiresAt) {
      const expiry = new Date(activeRequest.expiresAt).getTime();
      if (Date.now() > expiry) {
        setCodeError("This approval code has expired (valid for 2 hours only). Please request a fresh code.");
        return;
      }
    }

    if (entered === activeRequest.approvalCode.trim()) {
      setIsCodeVerified(true);
      setCodeError(null);
      setToastMsg("✅ Receiver code verified! You can now place this surprise prepaid feast.");
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      setCodeError("Invalid 6-digit code. Please check the code shown in the receiver's deck.");
    }
  };

  // Place Buddy Order (Prepaid Only)
  const handlePlaceBuddyOrder = async () => {
    if (!connectedReceiver || !receiverUid) return;
    if (buddyCart.length === 0) {
      setToastMsg("Your buddy cart is empty. Deal some cards first!");
      return;
    }
    if (!selectedAddress) {
      setToastMsg("Please select one of the receiver's verified addresses.");
      return;
    }
    if (!isCodeVerified) {
      setToastMsg("Receiver approval code must be verified before payment.");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderId = 'ORD-BUDDY-' + Math.floor(100000 + Math.random() * 900000);
      const eligibleIds = selectedBhattiId 
        ? [selectedBhattiId] 
        : nearbyBhattis.map(b => b.id);

      const chosenBhatti = selectedBhattiId ? nearbyBhattis.find(b => b.id === selectedBhattiId) : null;

      const orderData: Order = {
        id: orderId,
        items: buddyCart.map(it => ({ meal: it.meal, quantity: it.quantity })),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'sent',
        total: cartSubtotal,
        discount: 0,
        subtotal: cartSubtotal,
        deliveryFee: 0,
        address: selectedAddress,
        paymentMethod: `Prepaid (${selectedPrepaidMethod})`,
        paymentStatus: 'paid',
        userId: currentUserId, // Sender's account owns the order
        customerName: user.name || 'Friend',
        customerPhone: user.phone || '',
        preferredKitchenId: selectedBhattiId || undefined,
        eligibleKitchenIds: eligibleIds,
        kitchenName: chosenBhatti?.name || 'All Nearby Bhattis Broadcast',
        
        // Cross-Account Buddy Order Attributes
        isBuddyOrder: true,
        senderId: currentUserId,
        senderName: user.name || fbUser?.displayName || 'Friend',
        senderPhone: user.phone || '9876543210',
        receiverId: receiverUid,
        receiverName: connectedReceiver.name || 'Friend',
        receiverPhone: connectedReceiver.phone || '',
        buddyApprovalCode: approvalCodeInput.trim(),

        trackingSteps: [
          {
            title: '🎁 Buddy Feast Dispatched',
            description: `Surprise order placed by ${user.name || 'Friend'} with prepaid ${selectedPrepaidMethod}.`,
            done: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            title: 'Bhatti Kitchen Selection',
            description: chosenBhatti ? `Exclusive to ${chosenBhatti.name}` : 'Transmitted to all receiver nearby clay ovens',
            done: false
          }
        ],
        createdAt: new Date().toISOString(),
      };

      // 1. Write order to Firestore
      await setDoc(doc(db, 'orders', orderId), orderData);

      // 2. Mark buddy request as used
      const reqDocId = `${currentUserId}_${receiverUid}`;
      await updateDoc(doc(db, 'buddy_deck_requests', reqDocId), {
        status: 'used',
        orderId: orderId,
        usedAt: new Date().toISOString()
      }).catch(() => {});

      // 3. Write receiver in-app notification in Firestore
      const notifId = 'NOTIF-' + Math.floor(100000 + Math.random() * 900000);
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: receiverUid,
        title: `🎁 Surprise Feast from ${user.name || 'a friend'}!`,
        message: `${user.name || 'A friend'} (${user.phone || 'Phone'}) has placed an order for you at ${selectedAddress}! Click here to track live.`,
        orderId: orderId,
        senderName: user.name || 'Friend',
        senderPhone: user.phone || '',
        address: selectedAddress,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'buddy_order_gift'
      }).catch(() => {});

      // 4. Trigger Web Notification if allowed
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🎁 Surprise Feast Placed for ${connectedReceiver.name}!`, {
            body: `Your prepaid buddy order #${orderId} was received and sent to the Bhattis.`,
            icon: '/favicon.ico'
          });
        } catch (e) {}
      }

      setPlacedOrder(orderData);
      setBuddyCart([]);
      setIsCartOpen(false);

    } catch (err: any) {
      console.error("Error placing buddy order:", err);
      setToastMsg("Failed to complete order. Please check connection and try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white pb-32">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="sticky top-0 z-30 bg-stone-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Return to Menu</span>
          </button>

          <div className="flex items-center gap-2 text-center">
            <span className="text-xl">🃏</span>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>BUDDY DECK</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950">
                  GIFT & ORDER
                </span>
              </h1>
            </div>
          </div>

          {/* Floating Buddy Cart Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Buddy Cart</span>
            {cartTotalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-stone-950 text-amber-400 text-[10px] font-black flex items-center justify-center">
                {cartTotalItems}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* TOAST ALERT */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-stone-950 px-4 py-2.5 rounded-2xl font-black text-xs shadow-xl border border-stone-950/20 animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span>✨</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SUCCESS MODAL AFTER PLACING BUDDY ORDER */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-400/80 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center mx-auto text-3xl shadow-lg animate-bounce">
              🎁
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">ORDER DISPATCHED</span>
              <h2 className="text-xl font-black text-white">Surprise Feast is on its Way!</h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                You sent a royal feast to <strong className="text-white">{placedOrder.receiverName}</strong>!
                They have been alerted via in-app dialogue and push notification.
              </p>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-stone-400">
                <span>Order ID:</span>
                <span className="text-amber-300 font-bold">{placedOrder.id}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Recipient:</span>
                <span className="text-white font-bold">{placedOrder.receiverName}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Delivery Address:</span>
                <span className="text-white truncate max-w-[200px]">{placedOrder.address}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Total Paid:</span>
                <span className="text-emerald-400 font-bold">₹{placedOrder.total} (Prepaid)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlacedOrder(null);
                  if (onOpenOrders) onOpenOrders();
                  else onNavigateHome();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Track in My Orders History
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlacedOrder(null);
                }}
                className="w-full py-2 bg-white/10 hover:bg-white/15 text-stone-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Order More for Friends
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN BUDDY DECK CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* CONNECTION CARD IF NO RECEIVER IS CONNECTED YET */}
        {!connectedReceiver ? (
          <div className="bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-950 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5" /> Order For Friends & Family
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Enter Your Buddy's Deck ID
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Connect to their personal vault to see what they love to eat! Deal cards directly to the Buddy Cart, choose from their saved addresses, and verify with their 2-hour approval code.
              </p>
            </div>

            {/* Input Form */}
            <div className="max-w-xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Compass className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter friend's Deck ID, UID, or Email..."
                    value={deckInput}
                    onChange={(e) => setDeckInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnectToDeck(deckInput)}
                    className="w-full bg-stone-950 border border-amber-500/30 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono font-bold text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={loadingReceiver || !deckInput.trim()}
                  onClick={() => handleConnectToDeck(deckInput)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
                >
                  {loadingReceiver ? <span>Connecting...</span> : <><span>Open Deck</span> <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              {receiverError && (
                <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{receiverError}</span>
                </div>
              )}
            </div>

            {/* Quick Demo Friend Switcher */}
            {availableBuddies.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                  Quick Select An Athlete Deck (1-Click Test Connect):
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableBuddies.map((b) => (
                    <button
                      key={b.uid}
                      type="button"
                      onClick={() => {
                        setDeckInput(b.uid);
                        handleConnectToDeck(b.uid);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/40 text-xs font-bold text-stone-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span>👤 {b.name}</span>
                      <span className="text-[9px] font-mono text-amber-400 font-normal">
                        ({b.addressCount} {b.addressCount === 1 ? 'address' : 'addresses'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sharing Info Banner */}
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-amber-300 block">Want friends to order for YOU?</span>
                <span className="text-stone-400 text-[11px]">Your personal Deck ID is: <code className="text-white font-mono font-bold">{currentUserId}</code></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/buddydeck?deckId=${currentUserId}`;
                  navigator.clipboard.writeText(shareUrl);
                  setToastMsg("Copied your shareable Buddy Deck URL to clipboard!");
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy My Deck Link</span>
              </button>
            </div>

          </div>
        ) : (
          /* CONNECTED RECEIVER BANNER */
          <div className="bg-gradient-to-r from-stone-900 via-amber-950/30 to-stone-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shrink-0 shadow-lg">
                  <div className="w-full h-full rounded-2xl bg-stone-950 overflow-hidden flex items-center justify-center">
                    {connectedReceiver.avatar ? (
                      <img src={connectedReceiver.avatar} alt={connectedReceiver.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🃏</span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 tracking-wider">
                      RECEIVER'S DECK
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      ID: {receiverUid.slice(0, 10)}...
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {connectedReceiver.name}'s Vault
                  </h2>
                  <p className="text-xs text-stone-300">
                    Deal items to the Buddy Cart. Delivery is locked to {connectedReceiver.name}'s saved addresses!
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Review Buddy Cart ({cartTotalItems})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConnectedReceiver(null);
                    setReceiverUid('');
                    setDeckInput('');
                    setBuddyCart([]);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-bold transition-all cursor-pointer"
                  title="Switch to another friend's deck"
                >
                  Switch Buddy
                </button>
              </div>

            </div>

            {/* Receiver verified address badge */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-stone-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium">
                  Verified Destination: <strong className="text-white">{selectedAddress || 'Primary City Drop'}</strong>
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-400">
                ⚡ Prepaid Only • Strict Receiver Geofence
              </span>
            </div>

          </div>
        )}

        {/* 3. RECEIVER'S DECK CARDS GRID */}
        {connectedReceiver && (
          <div className="space-y-4">
            
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900/80 p-3.5 rounded-2xl border border-white/10">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${connectedReceiver.name}'s favorite meals...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'veg', 'non_veg', 'high_protein'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all cursor-pointer ${
                      selectedFilter === f
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Meals Grid */}
            {filteredMeals.length === 0 ? (
              <div className="text-center py-12 bg-stone-900/40 rounded-3xl border border-white/10 p-6 space-y-2">
                <p className="text-stone-400 text-sm">No meals found matching "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedFilter('all'); }}
                  className="text-amber-400 text-xs font-bold underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredMeals.map((meal, idx) => {
                  const isFlipped = !!flippedCards[meal.id];
                  const inCartItem = buddyCart.find(i => i.meal.id === meal.id);
                  const isVeg = meal.isVeg;

                  return (
                    <div
                      key={meal.id}
                      className="group relative h-[420px] rounded-3xl perspective-1000 select-none"
                    >
                      <div
                        className={`relative w-full h-full duration-500 rounded-3xl shadow-xl transition-all transform-style-3d ${
                          isFlipped ? 'rotate-y-180' : ''
                        }`}
                      >
                        
                        {/* FRONT OF THE CARD */}
                        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-stone-900 border-2 border-white/10 hover:border-amber-400/50 flex flex-col justify-between overflow-hidden p-4">
                          
                          {/* Image & Badges */}
                          <div className="relative h-44 rounded-2xl overflow-hidden mb-3 bg-stone-950">
                            <img
                              src={meal.image}
                              alt={meal.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />

                            {/* Veg / Non-Veg badge */}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-stone-950/80 backdrop-blur-md border border-white/15 text-[10px] font-bold flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-emerald-400' : 'bg-red-500'}`} />
                              <span className="text-white">{isVeg ? 'VEG' : 'NON-VEG'}</span>
                            </div>

                            {/* Card Rank */}
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-amber-400 text-stone-950 text-[10px] font-black tracking-wider">
                              CARD #{idx + 1}
                            </div>

                            <div className="absolute bottom-2 left-2.5 right-2.5 flex justify-between items-end">
                              <span className="text-lg font-black text-amber-400 font-mono">
                                ₹{meal.price}
                              </span>
                              <span className="text-[10px] font-bold text-stone-300 bg-stone-950/80 px-2 py-0.5 rounded-md">
                                {meal.calories || 450} kcal
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="space-y-1.5 flex-1 min-h-0">
                            <h3 className="font-extrabold text-sm text-white line-clamp-1 leading-snug">
                              {meal.name}
                            </h3>
                            <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                              {meal.description}
                            </p>

                            {/* Macro Badges */}
                            <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono">
                              <div className="bg-white/5 rounded-lg p-1">
                                <span className="text-[8px] text-stone-400 block">PRO</span>
                                <span className="text-[10px] font-bold text-emerald-400">{meal.protein || 24}g</span>
                              </div>
                              <div className="bg-white/5 rounded-lg p-1">
                                <span className="text-[8px] text-stone-400 block">CARB</span>
                                <span className="text-[10px] font-bold text-amber-400">{meal.carbs || 30}g</span>
                              </div>
                              <div className="bg-white/5 rounded-lg p-1">
                                <span className="text-[8px] text-stone-400 block">FAT</span>
                                <span className="text-[10px] font-bold text-stone-300">{meal.fats || 12}g</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFlip(meal.id, e)}
                              className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-stone-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Inspect Chef Prep & Grams"
                            >
                              <RotateCw className="w-3 h-3 text-amber-400" />
                              <span>Specs</span>
                            </button>

                            {inCartItem ? (
                              <div className="flex items-center gap-1.5 bg-amber-400 text-stone-950 font-black rounded-xl px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(meal.id, -1)}
                                  className="w-6 h-6 rounded-lg bg-stone-950/20 hover:bg-stone-950/40 flex items-center justify-center font-black cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-xs w-4 text-center">{inCartItem.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(meal.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-stone-950/20 hover:bg-stone-950/40 flex items-center justify-center font-black cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleDealToBuddyCart(meal, e)}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Deal to Cart</span>
                              </button>
                            )}
                          </div>

                        </div>

                        {/* BACK OF THE CARD (FLIPPED CHEF SPECS) */}
                        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-stone-950 border-2 border-amber-500/40 rotate-y-180 p-4 flex flex-col justify-between overflow-hidden">
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                                🔥 CHEF CLAY BHATTI PREP
                              </span>
                              <span className="text-[10px] font-mono text-stone-400">
                                #{meal.id}
                              </span>
                            </div>

                            <h4 className="font-black text-sm text-white">{meal.name}</h4>

                            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[10px] text-stone-300 leading-relaxed italic">
                              "Flame-roasted in authentic clay tandoor coals. 100% natural, zero processed oils, rich aromatic marinades."
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wide">
                                Culinary Gram Specs
                              </span>
                              <div className="space-y-1 text-[10px]">
                                <div className="flex justify-between bg-white/5 px-2 py-1 rounded-lg text-stone-300">
                                  <span>Protein Core</span>
                                  <span className="font-bold text-amber-300">{Math.round((meal.protein || 25) * 4)}g Portion</span>
                                </div>
                                <div className="flex justify-between bg-white/5 px-2 py-1 rounded-lg text-stone-300">
                                  <span>Bhatti Spices</span>
                                  <span className="font-bold text-amber-300">Chef Hand-Blend</span>
                                </div>
                                <div className="flex justify-between bg-white/5 px-2 py-1 rounded-lg text-stone-300">
                                  <span>Prep Time</span>
                                  <span className="font-bold text-emerald-400">{meal.prepTimeMinutes || 20} mins</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFlip(meal.id, e)}
                              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              Flip Back
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDealToBuddyCart(meal, e)}
                              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Deal • ₹{meal.price}</span>
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

      </div>

      {/* 4. EXPANDABLE BUDDY CART DRAWER & CHECKOUT PANEL */}
      {isCartOpen && connectedReceiver && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-stone-900 border-l border-amber-500/30 h-full flex flex-col justify-between shadow-2xl overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-stone-950/80 sticky top-0 z-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-base text-white">Buddy Cart Checkout</h3>
                  <span className="text-[10px] text-stone-400">Ordering for {connectedReceiver.name}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 sm:p-5 space-y-6 flex-1">
              
              {/* Dealt Items List */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  1. Dealt Royal Dishes ({cartTotalItems})
                </span>

                {buddyCart.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/5 text-center text-stone-400 text-xs">
                    No meals dealt into the buddy cart yet. Tap "Deal to Cart" on any dish!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buddyCart.map(it => (
                      <div key={it.meal.id} className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-white/10 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={it.meal.image} alt={it.meal.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate max-w-[150px]">{it.meal.name}</span>
                            <span className="text-[10px] text-amber-400 font-mono">₹{it.meal.price} each</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(it.meal.id, -1)}
                              className="text-stone-300 font-bold px-1 hover:text-white cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-white font-mono font-bold">{it.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(it.meal.id, 1)}
                              className="text-stone-300 font-bold px-1 hover:text-white cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-mono font-extrabold text-white text-xs w-12 text-right">
                            ₹{it.meal.price * it.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Receiver's Saved Addresses ONLY */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    2. Receiver's Saved Delivery Address
                  </span>
                  <span className="text-[9px] text-stone-400 uppercase font-mono">Receiver Drops Only</span>
                </div>

                <div className="space-y-2">
                  {(connectedReceiver.savedAddresses && connectedReceiver.savedAddresses.length > 0) ? (
                    connectedReceiver.savedAddresses.map((addr, idx) => {
                      const isSelected = selectedAddress === addr;
                      return (
                        <label
                          key={idx}
                          onClick={() => setSelectedAddress(addr)}
                          className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-stone-950 border-white/10 text-stone-300 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="receiverAddress"
                            checked={isSelected}
                            onChange={() => setSelectedAddress(addr)}
                            className="mt-0.5 text-amber-400 focus:ring-amber-400"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold block">{addr}</span>
                            <span className="text-[10px] text-stone-400">Verified saved location #{idx + 1}</span>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-stone-950 border border-white/10 text-xs text-stone-300 space-y-1">
                      <span className="font-bold text-white block">Default City Drop</span>
                      <span className="text-[11px] text-stone-400">{selectedAddress || 'Muzaffarpur Central Sector'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receiver's Nearby Bhatti Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    3. Clay Bhatti Oven Routing (Receiver Proximity)
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Default: Automatic Broadcast to Nearby Bhattis */}
                  <label
                    onClick={() => setSelectedBhattiId('')}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedBhattiId === ''
                        ? 'bg-amber-400/15 border-amber-400 text-white'
                        : 'bg-stone-950 border-white/10 text-stone-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bhattiRouting"
                      checked={selectedBhattiId === ''}
                      onChange={() => setSelectedBhattiId('')}
                      className="mt-0.5 text-amber-400 focus:ring-amber-400"
                    />
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        <FireIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Automatic Royal Broadcast (Fastest Nearby Bhatti)</span>
                      </span>
                      <span className="text-[10px] text-stone-400 leading-snug block mt-0.5">
                        Broadcasts to all ovens serving receiver's location. The first chef terminal to accept claims the order.
                      </span>
                    </div>
                  </label>

                  {/* List specific nearby Bhattis */}
                  {nearbyBhattis.map(bhatti => {
                    const isSelected = selectedBhattiId === bhatti.id;
                    return (
                      <label
                        key={bhatti.id}
                        onClick={() => setSelectedBhattiId(bhatti.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-400/15 border-amber-400 text-white'
                            : 'bg-stone-950 border-white/10 text-stone-300 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bhattiRouting"
                          checked={isSelected}
                          onChange={() => setSelectedBhattiId(bhatti.id)}
                          className="mt-0.5 text-amber-400 focus:ring-amber-400"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold truncate">{bhatti.name}</span>
                            <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0 ml-2">
                              {bhatti.distanceKm?.toFixed(1)} km from receiver
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 block truncate">{bhatti.address || bhatti.city}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Receiver 6-Digit Approval Code Gate */}
              <div className="space-y-3 bg-stone-950 p-4 rounded-3xl border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    4. Receiver Approval Code (2-Hour Validity)
                  </span>
                  {isCodeVerified && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950">
                      VERIFIED ✓
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Before paying, enter the 6-digit approval code from {connectedReceiver.name}'s deck screen.
                </p>

                {/* Request code button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={requestSending}
                    onClick={handleSendApprovalRequest}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3 h-3 text-amber-400" />
                    <span>{requestSending ? 'Sending Alert...' : `Alert ${connectedReceiver.name} for Code`}</span>
                  </button>

                  {activeRequest && (
                    <span className="text-[10px] text-stone-400 font-mono">
                      Status: <strong className={activeRequest.status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'}>{activeRequest.status}</strong>
                    </span>
                  )}
                </div>

                {/* Code Input */}
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={approvalCodeInput}
                      onChange={(e) => {
                        setApprovalCodeInput(e.target.value.replace(/\D/g, ''));
                        setIsCodeVerified(false);
                      }}
                      className="flex-1 bg-stone-900 border border-white/20 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest font-black text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>

                  {codeError && (
                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{codeError}</span>
                    </p>
                  )}

                  {isCodeVerified && (
                    <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Approval code verified successfully!</span>
                    </p>
                  )}
                </div>

              </div>

              {/* 5. Prepaid Payment Selection (Strictly NO COD) */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  5. Payment (Strictly Prepaid Online Only)
                </span>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-300 text-[11px] leading-relaxed">
                  ⚠️ <strong>Prepaid Only:</strong> Cash on Delivery (COD) is disabled for Buddy Deck surprise gifts. Your payment is securely processed.
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Card', 'NetBanking'] as const).map((method) => {
                    const isSelected = selectedPrepaidMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedPrepaidMethod(method)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 border-amber-400'
                            : 'bg-stone-950 text-stone-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {method === 'UPI' ? '⚡ UPI / GPay' : method === 'Card' ? '💳 Card' : '🏦 NetBanking'}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Checkout Sticky Bottom */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-stone-950 space-y-3 sticky bottom-0 z-20">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">Total Gift Feast Value:</span>
                <span className="text-lg font-black font-mono text-amber-400">₹{cartSubtotal}</span>
              </div>

              <button
                type="button"
                disabled={isPlacingOrder || buddyCart.length === 0 || !selectedAddress || !isCodeVerified}
                onClick={handlePlaceBuddyOrder}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-40 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {isPlacingOrder ? (
                  <span>Processing Royal Feast Payment...</span>
                ) : (
                  <>
                    <span>Pay ₹{cartSubtotal} & Send Feast to {connectedReceiver.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {!isCodeVerified && buddyCart.length > 0 && (
                <p className="text-[10px] text-center text-amber-400/80 font-semibold">
                  * Enter receiver's 6-digit approval code to unlock checkout
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
