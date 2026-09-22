/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Flame, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  Bell, 
  Receipt, 
  Sparkles, 
  AlertCircle, 
  Coffee, 
  Wine, 
  Search,
  CheckCircle2,
  ChevronRight,
  LogOut,
  ExternalLink,
  ShieldCheck,
  User,
  Phone,
  FileText,
  X,
  Share2,
  Users,
  QrCode,
  IndianRupee,
  CheckSquare,
  Square
} from 'lucide-react';
import { Meal, Order, OrderItem, Kitchen, SmartCoupon, CouponEvaluationContext, SmartCouponRedemptionRecord, ServiceBellItemConfig, TableServiceRequest, DEFAULT_SERVICE_BELLS } from '../../types';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { evaluateSmartCoupon, normalizeSmartCoupon, generateDefaultTerms } from '../../lib/couponEngine';
import { generateQRCodeDataUrl } from '../../lib/qrCodeGenerator';

interface DineInPortalProps {
  dineInSession: {
    tableNumber: string;
    bhattiId?: string;
    bhattiName?: string;
    isFromQR: boolean;
  };
  meals: Meal[];
  allKitchens: Kitchen[];
  currentUser: any;
  fbUser: any;
  cart: OrderItem[];
  onAddToCart: (meal: Meal) => void;
  onUpdateQuantity: (mealId: string, delta: number) => void;
  onClearCart: () => void;
  onPlaceOrder: (order: Order) => Promise<void>;
  onLeaveTable: () => void;
  onMinimizeToHome: () => void;
  allOrders: Order[];
  onOpenInvoice?: (order: Order) => void;
}

export default function DineInPortal({
  dineInSession,
  meals,
  allKitchens,
  currentUser,
  fbUser,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onClearCart,
  onPlaceOrder,
  onLeaveTable,
  onMinimizeToHome,
  allOrders,
  onOpenInvoice
}: DineInPortalProps) {
  const [activeView, setActiveView] = useState<'menu' | 'cart' | 'status'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [nonVegOnly, setNonVegOnly] = useState<boolean>(false);

  // Diner Contact Details
  const [guestName, setGuestName] = useState<string>(currentUser?.name || 'Table Guest');
  const [guestPhone, setGuestPhone] = useState<string>(currentUser?.phone || '');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'counter' | 'upi' | 'cash'>('counter');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedCouponData, setAppliedCouponData] = useState<SmartCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [viewingTcCoupon, setViewingTcCoupon] = useState<SmartCoupon | null>(null);

  // Attendant notification toast
  const [attendantNotified, setAttendantNotified] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Table Service Bells State
  const [isCallingBell, setIsCallingBell] = useState<string | null>(null);
  const [bellFeedbackMsg, setBellFeedbackMsg] = useState<string | null>(null);
  const [activeServiceRequests, setActiveServiceRequests] = useState<TableServiceRequest[]>([]);
  const [confirmPaidBellItem, setConfirmPaidBellItem] = useState<ServiceBellItemConfig | null>(null);

  // Table Bill Splitter State
  const [showBillSplitModal, setShowBillSplitModal] = useState<boolean>(false);
  const [splitDinerCount, setSplitDinerCount] = useState<number>(2);
  const [selectedDinerSlot, setSelectedDinerSlot] = useState<number>(1);
  const [settledDinerSlots, setSettledDinerSlots] = useState<number[]>([]);
  const [dinerQrDataUrl, setDinerQrDataUrl] = useState<string>('');

  // Branch details
  const currentBhatti = useMemo(() => {
    if (dineInSession.bhattiId) {
      return allKitchens.find(k => k.id === dineInSession.bhattiId) || null;
    }
    return allKitchens[0] || null;
  }, [allKitchens, dineInSession.bhattiId]);

  const bhattiDisplayName = dineInSession.bhattiName || currentBhatti?.name || 'Taash Bhatti Main Hub';

  // Active configured service bells for current kitchen
  const activeServiceBells = useMemo(() => {
    if (currentBhatti?.serviceBellsConfig && currentBhatti.serviceBellsConfig.length > 0) {
      return currentBhatti.serviceBellsConfig.filter(b => b.isEnabled !== false);
    }
    return DEFAULT_SERVICE_BELLS;
  }, [currentBhatti?.serviceBellsConfig]);

  // Real-time listener for this table's service requests
  useEffect(() => {
    if (!currentBhatti?.id || !dineInSession.tableNumber) return;
    try {
      const q = query(
        collection(db, 'kitchens', currentBhatti.id, 'serviceRequests'),
        where('tableNumber', '==', dineInSession.tableNumber)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as TableServiceRequest))
          .filter(r => r.status === 'pending' || r.status === 'acknowledged');
        setActiveServiceRequests(reqs);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not listen to table service requests:", e);
    }
  }, [currentBhatti?.id, dineInSession.tableNumber]);

  // Trigger service bell action
  const handleTriggerServiceBell = async (bellItem: ServiceBellItemConfig) => {
    if (!currentBhatti?.id) return;
    if (bellItem.price > 0) {
      setConfirmPaidBellItem(bellItem);
      return;
    }
    await executeServiceRequest(bellItem);
  };

  const executeServiceRequest = async (bellItem: ServiceBellItemConfig) => {
    if (!currentBhatti?.id) return;
    setIsCallingBell(bellItem.id);
    try {
      const newRequest: Omit<TableServiceRequest, 'id'> = {
        kitchenId: currentBhatti.id,
        tableNumber: dineInSession.tableNumber,
        tableId: (dineInSession as any).tableId,
        type: bellItem.id,
        title: bellItem.title,
        price: bellItem.price || 0,
        guestName: (guestName || currentUser?.name || 'Table Guest').trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'kitchens', currentBhatti.id, 'serviceRequests'), newRequest);
      setBellFeedbackMsg(`🛎️ Request for "${bellItem.title}" sent to Kitchen Captain! Server alerted.`);
      setConfirmPaidBellItem(null);
      setTimeout(() => setBellFeedbackMsg(null), 5000);
    } catch (err) {
      console.error("Error creating service request:", err);
      setBellFeedbackMsg(`Failed to dispatch call. Please notify server directly.`);
      setTimeout(() => setBellFeedbackMsg(null), 4000);
    } finally {
      setIsCallingBell(null);
    }
  };

  // Find recent active orders placed for this specific table
  const currentTableOrders = useMemo(() => {
    return allOrders.filter(o => 
      o.fulfillmentMode === 'dine_in' && 
      o.tableNumber?.toLowerCase() === dineInSession.tableNumber.toLowerCase() &&
      o.status !== 'cancelled'
    ).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [allOrders, dineInSession.tableNumber]);

  const latestTableOrder = currentTableOrders[0] || null;

  // Food categories
  const categories = [
    { id: 'all', label: 'All Dishes', icon: '✨' },
    { id: 'tandoori', label: 'Smoked Tandoori', icon: '🔥' },
    { id: 'biryani', label: 'Handi Biryani', icon: '🏺' },
    { id: 'breads', label: 'Clay Rotis & Naans', icon: '🫓' },
    { id: 'sides', label: 'Dips & Salads', icon: '🥗' },
    { id: 'beverages', label: 'Beverages', icon: '🥤' },
    { id: 'desserts', label: 'Desserts', icon: '🍨' },
  ];

  // Filter meals
  const filteredMeals = useMemo(() => {
    return meals.filter(m => {
      if (m.isHidden) return false;
      if (vegOnly && !m.isVeg) return false;
      if (nonVegOnly && m.isVeg) return false;

      // Category matching
      if (selectedCategory !== 'all') {
        const name = m.name.toLowerCase();
        if (selectedCategory === 'tandoori' && !name.includes('tandoor') && !name.includes('tikka') && !name.includes('taash') && !name.includes('kebab')) return false;
        if (selectedCategory === 'biryani' && !name.includes('biryani') && !name.includes('handi') && !name.includes('rice')) return false;
        if (selectedCategory === 'breads' && !name.includes('naan') && !name.includes('roti') && !name.includes('paratha')) return false;
        if (selectedCategory === 'sides' && !name.includes('raita') && !name.includes('salad') && !name.includes('chutney') && !name.includes('dip')) return false;
        if (selectedCategory === 'beverages' && !name.includes('shake') && !name.includes('water') && !name.includes('drink') && !name.includes('lassi')) return false;
        if (selectedCategory === 'desserts' && !name.includes('phirni') && !name.includes('halwa') && !name.includes('sweet') && !name.includes('kheer')) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
      }

      return true;
    });
  }, [meals, selectedCategory, vegOnly, nonVegOnly, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const finalTotal = Math.max(0, cartSubtotal - appliedDiscount);

  // Cumulative bill amount for this table (active dine-in orders or current table cart)
  const cumulativeTableBill = useMemo(() => {
    const ordersSum = currentTableOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    return ordersSum > 0 ? ordersSum : finalTotal;
  }, [currentTableOrders, finalTotal]);

  // Bill split calculation (equal split with remainder distribution)
  const splitBreakdown = useMemo(() => {
    const total = Math.max(0, cumulativeTableBill);
    const n = Math.max(1, splitDinerCount);
    const baseShare = Math.floor(total / n);
    const remainder = total - (baseShare * n);

    const shares: { dinerIndex: number; amount: number }[] = [];
    for (let i = 1; i <= n; i++) {
      shares.push({
        dinerIndex: i,
        amount: baseShare + (i <= remainder ? 1 : 0),
      });
    }
    return { total, dinerCount: n, baseShare, shares };
  }, [cumulativeTableBill, splitDinerCount]);

  // Generate dynamic UPI QR for selected diner slot
  useEffect(() => {
    if (!showBillSplitModal) return;
    const share = splitBreakdown.shares.find(s => s.dinerIndex === selectedDinerSlot);
    const amt = share ? share.amount : splitBreakdown.baseShare;
    if (amt <= 0) {
      setDinerQrDataUrl('');
      return;
    }
    const upiId = (currentBhatti as any)?.upiId || '9835188201@okbizaxis';
    const payeeName = encodeURIComponent('Taash Bhatti');
    const memo = encodeURIComponent(`${dineInSession.tableNumber} Split Diner ${selectedDinerSlot}`);
    const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amt.toFixed(2)}&cu=INR&tn=${memo}`;

    generateQRCodeDataUrl(upiUrl, { width: 320, margin: 2 })
      .then(setDinerQrDataUrl)
      .catch(() => {});
  }, [showBillSplitModal, selectedDinerSlot, splitBreakdown, currentBhatti, dineInSession.tableNumber]);

  // Toggle settled status for a diner slot
  const handleToggleDinerSettled = (dinerIndex: number) => {
    setSettledDinerSlots(prev => 
      prev.includes(dinerIndex) ? prev.filter(i => i !== dinerIndex) : [...prev, dinerIndex]
    );
  };

  // WhatsApp share for bill split
  const handleShareSplitWhatsApp = () => {
    const shareAmt = splitBreakdown.shares[0]?.amount || 0;
    const text = encodeURIComponent(
      `🍽️ *Taash Bhatti - ${dineInSession.tableNumber} Bill Split*\n\n` +
      `Total Table Bill: *₹${splitBreakdown.total}*\n` +
      `Guests: *${splitDinerCount}*\n` +
      `Each Person's Share: *₹${shareAmt}*\n\n` +
      `Pay directly via UPI or ask table captain for assistance. Cheers! 🔥`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Apply Smart Coupon for Table Dine-In
  const handleApplyCoupon = async () => {
    setCouponError(null);
    setCouponSuccess(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    if (cartSubtotal <= 0) {
      setCouponError('Please add dishes to your feast before applying coupons.');
      return;
    }

    try {
      const couponRef = doc(db, 'coupons', code);
      const couponSnap = await getDoc(couponRef);
      if (!couponSnap.exists()) {
        setCouponError('Invalid coupon code. This coupon does not exist or has ended.');
        return;
      }

      const smart = normalizeSmartCoupon({ id: code, ...couponSnap.data() });

      const evalContext: CouponEvaluationContext = {
        subtotal: cartSubtotal,
        cartItems: cart.map((it) => ({
          mealId: it.meal.id,
          mealName: it.meal.name,
          category: (it.meal as any).category || (it.meal.goals ? it.meal.goals[0] : undefined),
          price: it.meal.price,
          quantity: it.quantity,
          isVeg: it.meal.isVeg,
          isDeal: Boolean(it.isDeal || it.dealId || it.meal.id.startsWith('deal-')),
        })),
        fulfillmentMode: 'dine_in',
        kitchenId: dineInSession.bhattiId || currentBhatti?.id || undefined,
        user: {
          id: currentUser?.id || fbUser?.uid || undefined,
          email: currentUser?.email || fbUser?.email || undefined,
          phone: guestPhone.replace(/\D/g, '') || currentUser?.phone || undefined,
        },
      };

      const result = evaluateSmartCoupon(smart, evalContext);
      if (!result.isValid) {
        setCouponError(result.helpfulHint || result.rejectionReason || 'This voucher is not applicable to this dine-in order.');
        return;
      }

      setAppliedDiscount(result.discountAmount);
      setAppliedCouponData(smart);
      if (smart.discountType === 'percentage') {
        const cap = smart.criteria?.maxDiscountCap ? ` up to ₹${smart.criteria.maxDiscountCap}` : '';
        setCouponSuccess(`🎉 Code '${smart.code}' applied! Saved ₹${result.discountAmount} (-${smart.discountValue}%${cap}).`);
      } else if (smart.discountType === 'fixed') {
        setCouponSuccess(`🎉 Flat discount applied! Saved ₹${result.discountAmount}.`);
      } else if (smart.discountType === 'free_perk') {
        setCouponSuccess(`🎁 Table perk unlocked: ${smart.perkName || 'Complimentary Treat'}!`);
      } else {
        setCouponSuccess(`🎉 Coupon applied! Saved ₹${result.discountAmount}.`);
      }
    } catch (err) {
      console.error('Error validating table coupon:', err);
      setCouponError('Could not verify coupon. Please check connection and retry.');
    }
  };

  // Call Server action
  const handleCallAttendant = (reason: string = 'Service') => {
    setAttendantNotified(true);
    setTimeout(() => setAttendantNotified(false), 4000);
  };

  // Place Table Order
  const handleConfirmTableOrder = async () => {
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Please provide a valid 10-digit mobile number so the kitchen can coordinate your table service.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const newOrder: Order = {
        id: 'TB-' + Math.floor(100000 + Math.random() * 900000),
        items: [...cart],
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'sent',
        fulfillmentMode: 'dine_in',
        tableNumber: dineInSession.tableNumber,
        isDineInGuest: !fbUser,
        guestName: guestName.trim() || 'Table Guest',
        guestPhone: cleanPhone,
        dineInBhattiId: dineInSession.bhattiId || currentBhatti?.id || 'main_bhatti',
        dineInBhattiName: bhattiDisplayName,
        assignedKitchenId: dineInSession.bhattiId || currentBhatti?.id,
        chefNote: specialInstructions.trim() || undefined,
        total: finalTotal,
        discount: appliedDiscount,
        subtotal: cartSubtotal,
        deliveryFee: 0,
        address: `Dine-In Seating: ${dineInSession.tableNumber} • ${bhattiDisplayName}`,
        paymentMethod: paymentMethod === 'counter' ? 'Pay at Counter' : paymentMethod === 'upi' ? 'UPI at Table' : 'Cash on Bill',
        trackingSteps: [
          { title: 'Order Received', description: 'Bhatti counter registered table order', done: true, time: 'Just now' },
          { title: 'Woodfire Cooking', description: 'Chef firing fresh clay-oven specialties', done: false },
          { title: 'Plated & Sizzling', description: 'Garnished & dressed in authentic copper brass', done: false },
          { title: 'Served to Table', description: `Delivered hot to ${dineInSession.tableNumber}`, done: false },
        ],
        kdsStage: 'received',
      };

      await onPlaceOrder(newOrder);

      // Increment coupon stats if applied
      if (appliedCouponData && (appliedCouponData.id || appliedCouponData.code)) {
        const cId = appliedCouponData.id || appliedCouponData.code;
        try {
          const couponRef = doc(db, 'coupons', cId);
          const snap = await getDoc(couponRef);
          if (snap.exists()) {
            const currentData = snap.data();
            const currentCount = currentData.usageCount || 0;
            const currentGlobalCount = currentData.globalUsageCount || currentCount || 0;
            const currentSavings = currentData.totalSavings || 0;
            const currentBreakdown = currentData.channelBreakdown || { delivery: 0, takeaway: 0, dine_in: 0 };
            currentBreakdown.dine_in = (currentBreakdown.dine_in || 0) + 1;

            const redemptionRecord: SmartCouponRedemptionRecord = {
              orderId: newOrder.id,
              userId: guestName ? `table_guest_${guestName}` : 'dine_in_guest',
              userName: guestName ? `${guestName} (Table ${dineInSession.tableNumber})` : `Table ${dineInSession.tableNumber}`,
              userPhone: cleanPhone || '',
              fulfillmentMode: 'dine_in',
              subtotal: cartSubtotal,
              discountAmount: appliedDiscount,
              timestamp: new Date().toISOString()
            };

            const recentRedemptions = Array.isArray(currentData.recentRedemptions)
              ? [redemptionRecord, ...currentData.recentRedemptions].slice(0, 50)
              : [redemptionRecord];

            await updateDoc(couponRef, {
              usageCount: currentCount + 1,
              globalUsageCount: currentGlobalCount + 1,
              totalSavings: currentSavings + appliedDiscount,
              channelBreakdown: currentBreakdown,
              recentRedemptions: recentRedemptions,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Error updating table coupon usage/savings:", err);
        }
      }

      onClearCart();
      setActiveView('status');
    } catch (err) {
      console.error('Failed to place table order:', err);
      alert('Could not place table order. Please call attendant.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A0D] text-white flex flex-col selection:bg-amber-500 selection:text-black">
      {/* 1. TOP SEATING BANNER & CONTROLS */}
      <header className="sticky top-0 z-50 bg-[#0B0F14]/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Seated Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 p-1 shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <img src="/app-icon.png" alt="Taash Bhatti" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider truncate">
                  🍽️ {dineInSession.tableNumber}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              </div>
              <p className="text-[10px] text-stone-400 font-medium truncate">
                {bhattiDisplayName}
              </p>
            </div>
          </div>

          {/* Quick Table Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCallAttendant('Water / Napkins')}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="Call Attendant / Request Water"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Call Server</span>
            </button>

            <button
              type="button"
              onClick={onMinimizeToHome}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1 cursor-pointer transition-all"
              title="Browse regular app view"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delivery View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Leave ${dineInSession.tableNumber}? Your table session will close.`)) {
                  onLeaveTable();
                }
              }}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-950/50 border border-stone-800 text-stone-400 hover:text-red-400 cursor-pointer transition-all"
              title="Leave Table"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-TAP TABLE SERVICE BELLS (SMART CAPTAIN CALL) */}
        <div className="max-w-4xl mx-auto mt-2.5">
          <div className="bg-[#10151E] border border-amber-500/30 rounded-2xl p-3 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🛎️</span>
                <span>1-Tap Table Service Bells</span>
              </span>
              <span className="text-[9px] text-gray-400 font-mono">
                Rings Kitchen Captain Instantly
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeServiceBells.map((bell) => {
                const isPending = activeServiceRequests.some(r => r.type === bell.id && r.status === 'pending');
                const isAck = activeServiceRequests.some(r => r.type === bell.id && r.status === 'acknowledged');
                const isCalling = isCallingBell === bell.id;

                return (
                  <button
                    key={bell.id}
                    type="button"
                    disabled={isCalling || isPending}
                    onClick={() => handleTriggerServiceBell(bell)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isAck
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-white'
                        : isPending
                        ? 'bg-amber-950/60 border-amber-500/50 text-white animate-pulse'
                        : 'bg-[#151C26] hover:bg-[#1B2430] border-white/10 hover:border-amber-400/40 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{bell.icon}</span>
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full uppercase ${
                        bell.price > 0 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {bell.price > 0 ? `₹${bell.price}` : 'Free'}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-xs font-black block leading-tight text-white group-hover:text-amber-300">
                        {bell.title}
                      </span>
                      <span className="text-[9px] text-gray-400 block truncate mt-0.5">
                        {isAck ? '🟢 Captain On The Way!' : isPending ? '⏳ Waiting for Captain' : bell.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Service Feedback Banner */}
        {bellFeedbackMsg && (
          <div className="max-w-4xl mx-auto mt-2 p-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-stone-950 text-xs font-black rounded-xl text-center shadow-lg animate-in fade-in flex items-center justify-center gap-1.5">
            <span>{bellFeedbackMsg}</span>
          </div>
        )}

        {/* Active Ongoing Table Requests Bar */}
        {activeServiceRequests.length > 0 && !bellFeedbackMsg && (
          <div className="max-w-4xl mx-auto mt-2 flex flex-wrap gap-2">
            {activeServiceRequests.map((req) => (
              <div
                key={req.id}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
                  req.status === 'acknowledged'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                }`}
              >
                <span>{req.status === 'acknowledged' ? '🏃 Captain is on the way:' : '⏳ Dispatched:'}</span>
                <span className="font-extrabold text-white">{req.title}</span>
                {req.price > 0 && <span className="font-mono text-[10px] text-amber-400">(₹{req.price})</span>}
              </div>
            ))}
          </div>
        )}

        {/* Attendant Notified Toast */}
        {attendantNotified && (
          <div className="max-w-4xl mx-auto mt-2 p-2 bg-gradient-to-r from-amber-600 to-orange-600 text-stone-950 text-xs font-black rounded-lg text-center shadow-lg animate-bounce flex items-center justify-center gap-1.5">
            <span>🛎️ Attendant alerted for {dineInSession.tableNumber}! A server is coming to assist you.</span>
          </div>
        )}

        {/* 2. DINE-IN SUB-NAVIGATION (MENU / CART / STATUS) */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1 bg-[#121820] p-1 rounded-xl border border-stone-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveView('menu')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeView === 'menu' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Feast Menu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('cart')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all relative ${
              activeView === 'cart' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Table Order</span>
            {cartItemCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeView === 'cart' ? 'bg-black text-amber-400' : 'bg-amber-500 text-black'
              }`}>
                {cartItemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('status')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeView === 'status' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Kitchen</span>
            {latestTableOrder && latestTableOrder.status !== 'delivered' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-28">
        {/* ===================== VIEW 1: DINE-IN MENU ===================== */}
        {activeView === 'menu' && (
          <div className="space-y-4">
            {/* Search & Dietary Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tandoori, handi biryani, rotis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#10141B] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setVegOnly(!vegOnly); if (!vegOnly) setNonVegOnly(false); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    vegOnly ? 'bg-emerald-900/60 border-emerald-400 text-emerald-300' : 'bg-[#10141B] border-stone-800 text-stone-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Veg Only
                </button>
                <button
                  type="button"
                  onClick={() => { setNonVegOnly(!nonVegOnly); if (!nonVegOnly) setVegOnly(false); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    nonVegOnly ? 'bg-rose-950/60 border-rose-400 text-rose-300' : 'bg-[#10141B] border-stone-800 text-stone-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Category Chips Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 border-amber-400 shadow-md font-black'
                      : 'bg-[#121820] text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {filteredMeals.map((meal) => {
                const inCart = cart.find(i => i.meal.id === meal.id);
                const qty = inCart ? inCart.quantity : 0;

                return (
                  <div
                    key={meal.id}
                    className="bg-[#10151D] border border-stone-800/90 hover:border-amber-500/30 rounded-2xl p-3.5 flex gap-3.5 transition-all shadow-sm group"
                  >
                    {/* Dish Image */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-stone-900">
                      <img
                        src={meal.image}
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        meal.isVeg ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/90 text-rose-400 border border-rose-500/40'
                      }`}>
                        {meal.isVeg ? 'VEG' : 'NON-VEG'}
                      </span>
                    </div>

                    {/* Dish Info & Add Button */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-extrabold text-stone-100 leading-tight group-hover:text-amber-300 transition-colors">
                            {meal.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-snug">
                          {meal.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-base font-black text-amber-400">
                          ₹{meal.price}
                        </span>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => onAddToCart(meal)}
                            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-[#18202B] border border-amber-500/40 rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(meal.id, -1)}
                              className="w-5 h-5 rounded-md bg-stone-800 text-amber-300 flex items-center justify-center font-black cursor-pointer hover:bg-stone-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-white px-1">{qty}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(meal.id, 1)}
                              className="w-5 h-5 rounded-md bg-amber-500 text-stone-950 flex items-center justify-center font-black cursor-pointer hover:bg-amber-400"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== VIEW 2: TABLE CART & CHECKOUT ===================== */}
        {activeView === 'cart' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Table Order Review ({cartItemCount} items)
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs text-stone-400 hover:text-red-400 underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="bg-[#10151D] border border-stone-800 rounded-3xl p-8 text-center space-y-4 my-8">
                <div className="w-14 h-14 bg-stone-800 rounded-full flex items-center justify-center mx-auto text-2xl">
                  🍽️
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-200 uppercase">Your Table Cart is Empty</h3>
                  <p className="text-xs text-stone-400 mt-1">Browse our authentic clay-oven specialties to start your woodfire feast.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('menu')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Open Feast Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items List */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl divide-y divide-stone-800/60 overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.meal.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-100 truncate">{item.meal.name}</h4>
                        <span className="text-[11px] text-amber-400 font-extrabold">₹{item.meal.price * item.quantity}</span>
                      </div>

                      <div className="flex items-center gap-2 bg-[#18202B] border border-stone-700 rounded-xl px-2 py-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.meal.id, -1)}
                          className="w-5 h-5 rounded bg-stone-800 text-stone-300 flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-white px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.meal.id, 1)}
                          className="w-5 h-5 rounded bg-amber-500 text-stone-950 flex items-center justify-center font-black cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-stone-300 block">Chef & Kitchen Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild spice, extra onions, hot water on side"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full p-2.5 bg-[#0B0F14] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Diner Form (Guest details - Zero OTP requirement) */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <User className="w-3.5 h-3.5" />
                    <span>Diner Contact Details (For Table Service)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-stone-400 block mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Guest Name"
                        className="w-full p-2.5 bg-[#0B0F14] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-stone-400 block mb-1">10-Digit Mobile Number *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full p-2.5 bg-[#0B0F14] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    No sign-in or OTP required for table guests. Your phone is only used to coordinate your feast.
                  </p>
                </div>

                {/* Coupon Box */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-300 block">Dine-In Voucher / Smart Coupon</label>
                    {appliedCouponData && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCouponData(null);
                          setAppliedDiscount(0);
                          setCouponSuccess(null);
                          setCouponError(null);
                        }}
                        className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Promo Code (e.g. TABLE10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 p-2 bg-[#0B0F14] border border-stone-800 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl cursor-pointer border border-amber-500/40 transition-all active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-red-400 font-medium">{couponError}</p>}
                  {couponSuccess && <p className="text-[11px] text-emerald-400 font-bold">{couponSuccess}</p>}
                  {appliedCouponData && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
                          {appliedCouponData.code}
                        </span>
                        {appliedCouponData.badge && (
                          <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-black px-1.5 py-0.5 rounded">
                            {appliedCouponData.badge}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingTcCoupon(appliedCouponData)}
                          className="text-[10px] text-amber-400/80 hover:text-amber-300 underline font-semibold ml-1 cursor-pointer"
                        >
                          View T&C
                        </button>
                      </div>
                      <span className="text-xs font-black text-emerald-400">
                        -₹{appliedDiscount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Option */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-stone-300 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'counter', label: 'Pay at Counter' },
                      { id: 'upi', label: 'UPI at Table' },
                      { id: 'cash', label: 'Cash on Bill' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id as any)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                          paymentMethod === opt.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-[#0B0F14] border-stone-800 text-stone-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bill Breakdown */}
                <div className="bg-[#10151D] border border-stone-800 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-400">
                    <span>Food Subtotal</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Table Service & Delivery</span>
                    <span>₹0 (Dine-In Free)</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-amber-400 font-bold">
                      <span>Voucher Discount</span>
                      <span>-₹{appliedDiscount}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-800 pt-2 flex justify-between font-black text-sm text-white">
                    <span>Total Payable</span>
                    <span className="text-amber-400 text-base">₹{finalTotal}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  type="button"
                  disabled={isPlacingOrder || cart.length === 0}
                  onClick={handleConfirmTableOrder}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isPlacingOrder ? 'Sending to Clay-Oven Kitchen...' : `🔥 Send Order to Bhatti Kitchen • ₹${finalTotal}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 3: LIVE TABLE ORDER STATUS ===================== */}
        {activeView === 'status' && (
          <div className="space-y-4">
            <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Live Kitchen Status for {dineInSession.tableNumber}
            </h2>

            {currentTableOrders.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-950/60 via-[#141C24] to-[#101620] border-2 border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    Cumulative Table Bill
                  </span>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    ₹{cumulativeTableBill}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {currentTableOrders.length} {currentTableOrders.length === 1 ? 'order' : 'orders'} placed at {dineInSession.tableNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDinerSlot(1);
                      setShowBillSplitModal(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                  >
                    <Users className="w-4 h-4" />
                    <span>Split The Bill (UPI QR)</span>
                  </button>
                </div>
              </div>
            )}

            {currentTableOrders.length === 0 ? (
              <div className="bg-[#10151D] border border-stone-800 rounded-3xl p-8 text-center space-y-4 my-8">
                <div className="w-14 h-14 bg-stone-800 rounded-full flex items-center justify-center mx-auto text-2xl">
                  🔥
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-200 uppercase">No Active Order For This Table Yet</h3>
                  <p className="text-xs text-stone-400 mt-1">Ready to dine? Select items from our menu to fire up the bhatti!</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('menu')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Browse Menu & Order
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentTableOrders.map((ord) => {
                  const stageMap: Record<string, number> = {
                    received: 1,
                    cooking: 2,
                    plated: 3,
                    dispatched: 3,
                    delivered: 4,
                  };
                  const currentStageNum = stageMap[ord.kdsStage || 'received'] || 1;

                  return (
                    <div key={ord.id} className="bg-[#10151D] border border-stone-800 rounded-2xl p-4 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                        <div>
                          <span className="text-xs font-bold text-stone-400">Order #{ord.id}</span>
                          <h4 className="text-sm font-black text-white">{ord.tableNumber || dineInSession.tableNumber}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-400">₹{ord.total}</span>
                          <span className="text-[10px] text-stone-400 block capitalize">{ord.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {/* 4-Step Visual Progress Bar */}
                      <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                        {[
                          { num: 1, label: 'Received', icon: '📝' },
                          { num: 2, label: 'Cooking', icon: '🔥' },
                          { num: 3, label: 'Plated', icon: '🍽️' },
                          { num: 4, label: 'Served', icon: '✨' },
                        ].map((s) => {
                          const isDone = currentStageNum >= s.num;
                          const isCurrent = currentStageNum === s.num;

                          return (
                            <div key={s.num} className="space-y-1.5">
                              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                                isDone 
                                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md' 
                                  : 'bg-stone-900 text-stone-500 border-stone-800'
                              } ${isCurrent ? 'animate-pulse ring-2 ring-amber-400/50' : ''}`}>
                                {s.icon}
                              </div>
                              <span className={`text-[10px] font-extrabold uppercase block tracking-wider ${
                                isDone ? 'text-amber-400' : 'text-stone-600'
                              }`}>
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Dishes in this ticket */}
                      <div className="bg-[#0B0F14] rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-1">
                          Items in this Kitchen Ticket:
                        </div>
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-stone-300">
                            <span>{it.quantity}x {it.meal.name}</span>
                            <span className="font-bold text-stone-400">₹{it.meal.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* In-Session Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveView('menu')}
                          className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Order More Dishes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDinerSlot(1);
                            setShowBillSplitModal(true);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 shadow-md cursor-pointer transition-all active:scale-95"
                          title="Split bill equally among table guests"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Split</span>
                        </button>

                        {onOpenInvoice && (
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(ord)}
                            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Bill</span>
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
      </main>

      {/* 4. STICKY BOTTOM TABLE ORDER BAR (Visible when in menu view and cart has items) */}
      {activeView === 'menu' && cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md border-t border-amber-500/20">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-gradient-to-r from-stone-900 to-[#121820] border border-amber-500/40 rounded-2xl p-3 shadow-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  {cartItemCount} {cartItemCount === 1 ? 'Dish' : 'Dishes'}
                </span>
                <span className="text-xs text-stone-400 font-bold">• {dineInSession.tableNumber}</span>
              </div>
              <p className="text-base font-black text-white leading-none mt-0.5">
                ₹{cartSubtotal}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('cart')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <span>Review Table Order</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. T&C MODAL FOR DINE-IN COUPONS */}
      {viewingTcCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121820] text-stone-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-amber-500/30 flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-stone-900 to-black p-4 border-b border-stone-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    {viewingTcCoupon.code}
                  </span>
                  {viewingTcCoupon.badge && (
                    <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-black px-1.5 py-0.5 rounded">
                      {viewingTcCoupon.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white mt-1">
                  {viewingTcCoupon.title || `${viewingTcCoupon.code} Offer`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingTcCoupon(null)}
                className="w-7 h-7 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-amber-400/80 text-[10px] flex items-center gap-1">
                <FileText className="w-3 h-3" /> Terms & Conditions
              </h4>
              <ul className="space-y-1.5 text-stone-300">
                {(viewingTcCoupon.termsAndConditions && viewingTcCoupon.termsAndConditions.length > 0
                  ? viewingTcCoupon.termsAndConditions
                  : generateDefaultTerms(viewingTcCoupon, viewingTcCoupon.criteria)
                ).map((t, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-stone-900/60 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTcCoupon(null)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: INSTANT TABLE BILL SPLITTER ===================== */}
      {showBillSplitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#101620] border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8 text-white animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Split Table Bill • {dineInSession.tableNumber}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    Instant Equal Split & Individual UPI QR Codes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBillSplitModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div className="p-4 rounded-2xl bg-[#0B0F15] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Table Bill</span>
                <span className="text-2xl font-black text-amber-400 font-mono">₹{splitBreakdown.total}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Each Person Pays</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{splitBreakdown.shares.find(s => s.dinerIndex === selectedDinerSlot)?.amount || splitBreakdown.baseShare}
                </span>
              </div>
            </div>

            {/* Diners Count Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">Number of Guests Splitting:</span>
                <div className="flex items-center gap-2 bg-stone-900 border border-white/10 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setSplitDinerCount(Math.max(2, splitDinerCount - 1))}
                    disabled={splitDinerCount <= 2}
                    className="w-6 h-6 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-white px-2 font-mono">{splitDinerCount}</span>
                  <button
                    type="button"
                    onClick={() => setSplitDinerCount(Math.min(20, splitDinerCount + 1))}
                    disabled={splitDinerCount >= 20}
                    className="w-6 h-6 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {[2, 3, 4, 5, 6, 8].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSplitDinerCount(count)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      splitDinerCount === count
                        ? 'bg-emerald-500 text-brand-charcoal font-black shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-gray-400'
                    }`}
                  >
                    {count} Diners
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Diner Slots */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Select Your Slot to View UPI QR:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {splitBreakdown.shares.map((share) => {
                  const isSelected = selectedDinerSlot === share.dinerIndex;
                  const isSettled = settledDinerSlots.includes(share.dinerIndex);

                  return (
                    <div
                      key={share.dinerIndex}
                      onClick={() => setSelectedDinerSlot(share.dinerIndex)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                          : 'bg-[#151C26] hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 block">
                          Guest {share.dinerIndex}
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          ₹{share.amount}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDinerSettled(share.dinerIndex);
                        }}
                        className="text-xs p-1 cursor-pointer"
                        title={isSettled ? "Mark as Unpaid" : "Mark as Paid"}
                      >
                        {isSettled ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic UPI QR Section */}
            <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/40 text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Guest {selectedDinerSlot}'s Share QR
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  Amount: ₹{splitBreakdown.shares.find(s => s.dinerIndex === selectedDinerSlot)?.amount || splitBreakdown.baseShare}
                </span>
              </div>

              {dinerQrDataUrl ? (
                <div className="flex flex-col items-center">
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl inline-block">
                    <img src={dinerQrDataUrl} alt="UPI Payment QR" className="w-40 h-40 object-contain" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 font-mono">
                    Scan with GPay, PhonePe, Paytm, CRED or BHIM
                  </p>
                </div>
              ) : (
                <div className="p-6 text-xs text-gray-400">Generating UPI QR...</div>
              )}

              {/* Action Buttons: Pay via UPI on mobile + Mark Settled */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={`upi://pay?pa=${encodeURIComponent((currentBhatti as any)?.upiId || '9835188201@okbizaxis')}&pn=${encodeURIComponent('Taash Bhatti')}&am=${(splitBreakdown.shares.find(s => s.dinerIndex === selectedDinerSlot)?.amount || splitBreakdown.baseShare).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${dineInSession.tableNumber} Split Guest ${selectedDinerSlot}`)}`}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Pay ₹{splitBreakdown.shares.find(s => s.dinerIndex === selectedDinerSlot)?.amount || splitBreakdown.baseShare} via UPI App</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleToggleDinerSettled(selectedDinerSlot)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    settledDinerSlots.includes(selectedDinerSlot)
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/10 hover:bg-white/15 text-gray-300 border-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{settledDinerSlots.includes(selectedDinerSlot) ? 'Marked Paid ✓' : 'Mark as Paid'}</span>
                </button>
              </div>
            </div>

            {/* Settlement Progress & Share Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-[11px] text-gray-400 font-mono">
                {settledDinerSlots.length} of {splitDinerCount} guests marked paid
              </span>

              <button
                type="button"
                onClick={handleShareSplitWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Breakdown on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CONFIRM PAID SERVICE BELL ===================== */}
      {confirmPaidBellItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <span className="text-4xl block">{confirmPaidBellItem.icon}</span>
              <h3 className="text-base font-black uppercase text-white">
                Request {confirmPaidBellItem.title}?
              </h3>
              <p className="text-xs text-gray-300">
                This table add-on is priced at <strong className="text-amber-400 font-mono text-sm">₹{confirmPaidBellItem.price}</strong> and will be added to your table bill.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPaidBellItem(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeServiceRequest(confirmPaidBellItem)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg"
              >
                Confirm • ₹{confirmPaidBellItem.price}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
