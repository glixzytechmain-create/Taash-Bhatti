/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ChefHat, 
  Bike, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  FileText, 
  Printer, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Copy, 
  Layers, 
  UtensilsCrossed,
  Info,
  Calendar,
  Undo2,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KitchenInventoryItem, 
  Order, 
  Meal, 
  DeliveryPartner, 
  KitchenWastageRecord, 
  WastageReasonCategory,
  WastageOrderMetadata
} from '../types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface KitchenWastageManagerProps {
  kitchenId: string;
  kitchenName: string;
  inventoryItems: KitchenInventoryItem[];
  orders: Order[];
  meals: Meal[];
  deliveryPartners?: DeliveryPartner[];
  loggedByUserName?: string;
  onStockUpdated?: () => void;
  isCompact?: boolean;
}

export default function KitchenWastageManager({
  kitchenId,
  kitchenName,
  inventoryItems,
  orders,
  meals,
  deliveryPartners = [],
  loggedByUserName = 'Kitchen Manager',
  onStockUpdated,
  isCompact = false
}: KitchenWastageManagerProps) {
  // Real-time wastage records for this kitchen
  const [wastageRecords, setWastageRecords] = useState<KitchenWastageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingredient' | 'whole_dish' | 'order'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('today'); // 'today' | 'all_time' | custom date YYYY-MM-DD

  // Active Modals
  const [showLogWasteModal, setShowLogWasteModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'ingredient' | 'whole_dish' | 'order'>('ingredient');
  const [selectedInspectRecord, setSelectedInspectRecord] = useState<KitchenWastageRecord | null>(null);

  // Form States: Raw Material Waste
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [wastedQty, setWastedQty] = useState<number>(1);
  const [customUnitCost, setCustomUnitCost] = useState<number>(0);
  const [ingredientReason, setIngredientReason] = useState<WastageReasonCategory>('expired_spoiled');
  const [ingredientDisposition, setIngredientDisposition] = useState<KitchenWastageRecord['dispositionAction']>('discarded');
  const [ingredientNotes, setIngredientNotes] = useState<string>('');

  // Form States: Whole Dish Waste
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [dishPortions, setDishPortions] = useState<number>(1);
  const [dishPrepStation, setDishPrepStation] = useState<'lane_a' | 'lane_b' | 'grill' | 'dessert'>('lane_a');
  const [dishReason, setDishReason] = useState<WastageReasonCategory>('burnt_overcooked');
  const [dishNotes, setDishNotes] = useState<string>('');

  // Form States: Entire Order Waste
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [orderWasteReason, setOrderWasteReason] = useState<WastageReasonCategory>('transit_spill_damage');
  const [orderWasteActionNote, setOrderWasteActionNote] = useState<string>('');
  const [orderWasteDateFilter, setOrderWasteDateFilter] = useState<string>('today');

  // Status feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch wastage records in real-time
  useEffect(() => {
    if (!kitchenId) return;

    setLoading(true);
    const q = query(
      collection(db, 'kitchen_wastage'),
      where('kitchenId', '==', kitchenId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: KitchenWastageRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() } as KitchenWastageRecord);
        });

        // Sort descending by loggedAt
        records.sort((a, b) => new Date(b.loggedAt || 0).getTime() - new Date(a.loggedAt || 0).getTime());
        setWastageRecords(records);
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore kitchen_wastage subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kitchenId]);

  // Notice auto-clear
  useEffect(() => {
    if (actionNotice) {
      const t = setTimeout(() => setActionNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionNotice]);

  // Selected Ingredient details for reactive calculation
  const selectedIngredient = useMemo(() => {
    return inventoryItems.find(i => i.id === selectedIngredientId) || null;
  }, [inventoryItems, selectedIngredientId]);

  useEffect(() => {
    if (selectedIngredient) {
      setCustomUnitCost(selectedIngredient.costPerUnit || 120);
    }
  }, [selectedIngredient]);

  // Selected Meal details
  const selectedMeal = useMemo(() => {
    return meals.find(m => m.id === selectedMealId) || null;
  }, [meals, selectedMealId]);

  // Scoped orders for order waste selection
  const candidateOrders = useMemo(() => {
    return orders.filter(o => {
      // Must match kitchen or unassigned
      if (o.acceptedByKitchenId && o.acceptedByKitchenId !== kitchenId && o.kitchenId !== kitchenId) {
        return false;
      }
      const datePart = (o.date || o.createdAt || '').split('T')[0];
      if (orderWasteDateFilter === 'today' && datePart && datePart !== todayStr) {
        return false;
      }
      if (!orderSearchTerm.trim()) return true;

      const q = orderSearchTerm.toLowerCase();
      const idMatch = (o.id || '').toLowerCase().includes(q);
      const userMatch = (o.userId || '').toLowerCase().includes(q);
      const addrMatch = (o.address || '').toLowerCase().includes(q);
      const riderMatch = (o.deliveryPartnerName || '').toLowerCase().includes(q);
      return idMatch || userMatch || addrMatch || riderMatch;
    });
  }, [orders, kitchenId, orderWasteDateFilter, todayStr, orderSearchTerm]);

  // Active selected order for waste logging
  const activeOrderToWaste = useMemo(() => {
    return candidateOrders.find(o => o.id === selectedOrderId) || null;
  }, [candidateOrders, selectedOrderId]);

  // Find delivery partner for active order
  const activeOrderRider = useMemo(() => {
    if (!activeOrderToWaste) return null;
    const partnerId = activeOrderToWaste.assignedDeliveryPartnerId;
    if (partnerId) {
      const found = deliveryPartners.find(p => p.id === partnerId);
      if (found) return found;
    }
    return {
      name: activeOrderToWaste.assignedDeliveryPartnerName || 'Assigned Cloud Rider',
      phone: activeOrderToWaste.assignedDeliveryPartnerPhone || '+91 98765 43210',
      vehicle: activeOrderToWaste.assignedDeliveryPartnerVehicle || 'Hero Electric Bike',
      vehicleNumber: (activeOrderToWaste as any).deliveryVehicleNumber || 'DL-8S-4412'
    };
  }, [activeOrderToWaste, deliveryPartners]);

  // Filtered wastage records for the ledger
  const filteredRecords = useMemo(() => {
    return wastageRecords.filter(r => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (reasonFilter !== 'all' && r.reasonCategory !== reasonFilter) return false;
      if (dateFilter === 'today') {
        const recordDate = r.reportDate || (r.loggedAt ? r.loggedAt.split('T')[0] : '');
        if (recordDate !== todayStr) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.targetName || '').toLowerCase().includes(q);
        const notesMatch = (r.reasonNotes || '').toLowerCase().includes(q);
        const orderIdMatch = r.orderMetadata?.orderId?.toLowerCase().includes(q) || false;
        const loggedByMatch = (r.loggedBy || '').toLowerCase().includes(q);
        return nameMatch || notesMatch || orderIdMatch || loggedByMatch;
      }
      return true;
    });
  }, [wastageRecords, typeFilter, reasonFilter, dateFilter, todayStr, searchQuery]);

  // Analyst Calculations
  const analystMetrics = useMemo(() => {
    const todayRecords = wastageRecords.filter(r => {
      const d = r.reportDate || (r.loggedAt ? r.loggedAt.split('T')[0] : '');
      return d === todayStr;
    });

    const totalLossToday = todayRecords.reduce((sum, r) => sum + (r.financialLoss || 0), 0);
    const rawStockLoss = todayRecords.filter(r => r.type === 'ingredient').reduce((sum, r) => sum + (r.financialLoss || 0), 0);
    const wholeDishLoss = todayRecords.filter(r => r.type === 'whole_dish').reduce((sum, r) => sum + (r.financialLoss || 0), 0);
    const orderLoss = todayRecords.filter(r => r.type === 'order').reduce((sum, r) => sum + (r.financialLoss || 0), 0);

    // Approximate shift sales for ratio
    const todayOrders = orders.filter(o => {
      const d = (o.date || o.createdAt || '').split('T')[0];
      return d === todayStr && o.status !== 'cancelled';
    });
    const grossRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const wastePctOfRevenue = grossRevenue > 0 ? (totalLossToday / grossRevenue) * 100 : 0;

    // Reason frequency
    const causeBreakdown: Record<string, number> = {};
    todayRecords.forEach(r => {
      causeBreakdown[r.reasonCategory] = (causeBreakdown[r.reasonCategory] || 0) + (r.financialLoss || 0);
    });

    // Top Loss Hotspot
    let highestLossReason = 'None';
    let highestLossAmount = 0;
    Object.entries(causeBreakdown).forEach(([reason, loss]) => {
      if (loss > highestLossAmount) {
        highestLossAmount = loss;
        highestLossReason = reason;
      }
    });

    return {
      totalLossToday,
      rawStockLoss,
      wholeDishLoss,
      orderLoss,
      grossRevenue,
      wastePctOfRevenue,
      causeBreakdown,
      highestLossReason,
      highestLossAmount,
      totalCountToday: todayRecords.length
    };
  }, [wastageRecords, orders, todayStr]);

  // 1. Submit Raw Ingredient Waste
  const handleSaveIngredientWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) {
      alert("Please select a valid raw ingredient.");
      return;
    }

    if (wastedQty <= 0) {
      alert("Please specify a wasted quantity greater than zero.");
      return;
    }

    const calculatedLoss = Math.round(wastedQty * customUnitCost);
    const recordPayload: Omit<KitchenWastageRecord, 'id'> = {
      kitchenId,
      kitchenName,
      type: 'ingredient',
      targetId: selectedIngredient.id,
      targetName: selectedIngredient.name,
      category: selectedIngredient.category,
      quantity: wastedQty,
      unit: selectedIngredient.unit,
      unitCost: customUnitCost,
      financialLoss: calculatedLoss,
      reasonCategory: ingredientReason,
      reasonNotes: ingredientNotes.trim() || 'Raw material discarded due to freshness or prep defect.',
      dispositionAction: ingredientDisposition,
      loggedBy: loggedByUserName,
      loggedAt: new Date().toISOString(),
      reportDate: todayStr,
      status: 'logged'
    };

    try {
      // 1. Save waste document to Firestore
      await addDoc(collection(db, 'kitchen_wastage'), recordPayload);

      // 2. CRITICAL REQUIREMENT: Update stock levels accordingly in kitchen_inventory
      const updatedStock = Math.max(0, Number((selectedIngredient.quantity - wastedQty).toFixed(2)));
      const newStatus = updatedStock === 0 ? 'out_of_stock' : updatedStock <= selectedIngredient.minThreshold ? 'low_stock' : 'in_stock';

      await updateDoc(doc(db, 'kitchen_inventory', selectedIngredient.id), {
        quantity: updatedStock,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: `${loggedByUserName} (Waste deduction: -${wastedQty} ${selectedIngredient.unit})`
      });

      if (onStockUpdated) onStockUpdated();

      setActionNotice(`Logged waste: ${wastedQty} ${selectedIngredient.unit} of ${selectedIngredient.name}. Stock updated to ${updatedStock} ${selectedIngredient.unit}!`);
      setShowLogWasteModal(false);
      resetIngredientForm();
    } catch (err) {
      console.error("Error logging ingredient waste:", err);
      alert("Failed to log ingredient waste. Please try again.");
    }
  };

  // 2. Submit Whole Dish Waste
  const handleSaveWholeDishWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeal) {
      alert("Please select a dish from the menu.");
      return;
    }

    const estimatedDishCost = Math.round((selectedMeal.price || 250) * 0.55); // ~55% ingredient/prep cost baseline
    const calculatedLoss = estimatedDishCost * dishPortions;

    const recordPayload: Omit<KitchenWastageRecord, 'id'> = {
      kitchenId,
      kitchenName,
      type: 'whole_dish',
      targetId: selectedMeal.id,
      targetName: selectedMeal.name,
      category: selectedMeal.isVeg ? 'Vegetarian Main' : 'Non-Veg Main',
      quantity: dishPortions,
      unit: dishPortions > 1 ? 'dishes' : 'dish',
      unitCost: estimatedDishCost,
      financialLoss: calculatedLoss,
      reasonCategory: dishReason,
      reasonNotes: dishNotes.trim() || `Station ${dishPrepStation.replace('_', ' ').toUpperCase()} discarded portion.`,
      dispositionAction: 'discarded',
      loggedBy: loggedByUserName,
      loggedAt: new Date().toISOString(),
      reportDate: todayStr,
      status: 'logged'
    };

    try {
      await addDoc(collection(db, 'kitchen_wastage'), recordPayload);
      setActionNotice(`Logged ${dishPortions}x ${selectedMeal.name} as whole dish waste (₹${calculatedLoss} loss recorded).`);
      setShowLogWasteModal(false);
      resetDishForm();
    } catch (err) {
      console.error("Error logging dish waste:", err);
      alert("Failed to log whole dish waste.");
    }
  };

  // 3. Submit Entire Order Waste with Quick Action
  const handleSaveOrderWaste = async (quickActionType?: string) => {
    if (!activeOrderToWaste) {
      alert("Please select an order to log as wasted.");
      return;
    }

    const itemsSummary = (activeOrderToWaste.items || [])
      .map(i => `${i.quantity}x ${i.name || i.mealId}`)
      .join(', ');

    const orderMeta: WastageOrderMetadata = {
      orderId: activeOrderToWaste.id,
      orderDate: activeOrderToWaste.date || (activeOrderToWaste as any).createdAt,
      customerName: (activeOrderToWaste as any).userName || 'Valued Bhatti Guest',
      customerPhone: (activeOrderToWaste as any).userPhone || '+91 98112 00412',
      customerEmail: (activeOrderToWaste as any).userEmail || '',
      address: activeOrderToWaste.address || 'Direct Cloud Kitchen Pickup',
      deliveryPartnerId: activeOrderToWaste.assignedDeliveryPartnerId,
      deliveryPartnerName: activeOrderRider?.name,
      deliveryPartnerPhone: activeOrderRider?.phone,
      deliveryPartnerVehicle: activeOrderRider?.vehicle,
      deliveryVehicleNumber: (activeOrderRider as any)?.vehicleNumber,
      orderTotal: activeOrderToWaste.total,
      itemsSummary,
      orderStatus: activeOrderToWaste.status,
      fulfillmentMode: activeOrderToWaste.fulfillmentMode || 'delivery',
      quickActionTaken: quickActionType || 'Standard Full Order Discard'
    };

    let effectiveReason = orderWasteReason;
    if (quickActionType === 'rider_spill') effectiveReason = 'transit_spill_damage';
    if (quickActionType === 'kitchen_mistake') effectiveReason = 'wrong_preparation';
    if (quickActionType === 'customer_cancellation') effectiveReason = 'customer_cancellation';

    const recordPayload: Omit<KitchenWastageRecord, 'id'> = {
      kitchenId,
      kitchenName,
      type: 'order',
      targetId: activeOrderToWaste.id,
      targetName: `Order #${activeOrderToWaste.id.slice(-6).toUpperCase()}`,
      category: 'Entire Plated Order',
      quantity: 1,
      unit: 'order',
      unitCost: activeOrderToWaste.total,
      financialLoss: activeOrderToWaste.total,
      reasonCategory: effectiveReason,
      reasonNotes: orderWasteActionNote.trim() || `Full order discarded. Quick action: ${quickActionType || 'Order Discard'}.`,
      dispositionAction: 'discarded',
      orderMetadata: orderMeta,
      loggedBy: loggedByUserName,
      loggedAt: new Date().toISOString(),
      reportDate: todayStr,
      status: 'logged'
    };

    try {
      // 1. Create waste record
      await addDoc(collection(db, 'kitchen_wastage'), recordPayload);

      // 2. If quick action involves re-firing or cancelling, update the order status
      if (quickActionType === 'refire_order') {
        await updateDoc(doc(db, 'orders', activeOrderToWaste.id), {
          status: 'cooking',
          cookingStartedAt: new Date().toISOString(),
          extraPrepMinutes: 10,
          kitchenNotes: `RE-FIRE TICKET: Previous prep discarded due to waste (${effectiveReason}). Expedite immediately.`
        });
      } else if (quickActionType === 'customer_cancellation') {
        await updateDoc(doc(db, 'orders', activeOrderToWaste.id), {
          status: 'cancelled',
          cancellationReason: 'Order discarded due to transit/prep waste'
        });
      }

      setActionNotice(`Order #${activeOrderToWaste.id.slice(-6).toUpperCase()} logged as waste with action: ${quickActionType || 'Discarded'}`);
      setShowLogWasteModal(false);
      resetOrderForm();
    } catch (err) {
      console.error("Error logging order waste:", err);
      alert("Failed to log order waste.");
    }
  };

  // Delete / Undo a waste entry
  const handleDeleteWasteRecord = async (record: KitchenWastageRecord) => {
    const isIngredient = record.type === 'ingredient';
    const confirmMsg = isIngredient
      ? `Delete waste record for ${record.targetName}?\n\nWould you like to restore the +${record.quantity} ${record.unit} back to inventory stock?`
      : `Are you sure you want to remove this waste audit record for ${record.targetName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Delete record
      await deleteDoc(doc(db, 'kitchen_wastage', record.id));

      // 2. If ingredient, optionally restore stock
      if (isIngredient) {
        const item = inventoryItems.find(i => i.id === record.targetId);
        if (item) {
          const restoredQty = Number((item.quantity + record.quantity).toFixed(2));
          const newStatus = restoredQty > item.minThreshold ? 'in_stock' : restoredQty > 0 ? 'low_stock' : 'out_of_stock';
          await updateDoc(doc(db, 'kitchen_inventory', item.id), {
            quantity: restoredQty,
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: `${loggedByUserName} (Waste entry deleted & restored: +${record.quantity} ${record.unit})`
          });
          if (onStockUpdated) onStockUpdated();
        }
      }

      setActionNotice(`Deleted waste record for ${record.targetName}.`);
      if (selectedInspectRecord?.id === record.id) {
        setSelectedInspectRecord(null);
      }
    } catch (err) {
      console.error("Error deleting waste record:", err);
      alert("Failed to delete waste record.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetIngredientForm = () => {
    setSelectedIngredientId('');
    setWastedQty(1);
    setIngredientReason('expired_spoiled');
    setIngredientDisposition('discarded');
    setIngredientNotes('');
  };

  const resetDishForm = () => {
    setSelectedMealId('');
    setDishPortions(1);
    setDishReason('burnt_overcooked');
    setDishNotes('');
  };

  const resetOrderForm = () => {
    setSelectedOrderId('');
    setOrderSearchTerm('');
    setOrderWasteReason('transit_spill_damage');
    setOrderWasteActionNote('');
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'expired_spoiled': return 'Expired / Spoiled';
      case 'prep_trim_error': return 'Prep / Trim Defect';
      case 'burnt_overcooked': return 'Burnt / Overcooked';
      case 'wrong_preparation': return 'Wrong Recipe / Mod Missed';
      case 'transit_spill_damage': return 'Rider Transit Spill / Damage';
      case 'customer_cancellation': return 'Cancelled Post-Prep';
      case 'customer_rejected_return': return 'Customer Refused / Cold';
      case 'storage_temp_breach': return 'Cold Storage Temp Breach';
      case 'packaging_defect': return 'Packaging Puncture';
      case 'contamination': return 'Sanitation Reject';
      default: return reason.replace(/_/g, ' ');
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'expired_spoiled': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'burnt_overcooked':
      case 'wrong_preparation': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'transit_spill_damage': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'customer_cancellation':
      case 'customer_rejected_return': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'storage_temp_breach': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. EXECUTIVE / ANALYST FOOD LOSS KPI BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Total Shift Food Loss */}
        <div className="bg-[#0D1218] border border-rose-500/30 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Total Shift Food Loss
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30">
              {analystMetrics.totalCountToday} logs
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-400">
              ₹{analystMetrics.totalLossToday.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Direct financial write-off today
          </span>
        </div>

        {/* QSR Benchmark Wastage Rate */}
        <div className="bg-[#0D1218] border border-white/10 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-brand-green" /> Wastage Rate %
            </span>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
              analystMetrics.wastePctOfRevenue <= 2.5
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : analystMetrics.wastePctOfRevenue <= 4.0
                  ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                  : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
            }`}>
              {analystMetrics.wastePctOfRevenue <= 2.5 ? 'QSR Target Met (<2.5%)' : analystMetrics.wastePctOfRevenue <= 4.0 ? 'Monitor Variance' : 'High Loss Alarm'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${
              analystMetrics.wastePctOfRevenue <= 2.5 ? 'text-emerald-400' : analystMetrics.wastePctOfRevenue <= 4.0 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {analystMetrics.wastePctOfRevenue.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400 font-mono">of gross revenue</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Target benchmark: &lt;2.5% of shift sales
          </span>
        </div>

        {/* Raw Ingredients Spoilage Loss */}
        <div className="bg-[#0D1218] border border-white/10 p-4 rounded-2xl shadow-lg">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Raw Stock Spoilage
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-white">
              ₹{analystMetrics.rawStockLoss.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Stock deducted from live inventory
          </span>
        </div>

        {/* Whole Dish & Order Transit Waste */}
        <div className="bg-[#0D1218] border border-white/10 p-4 rounded-2xl shadow-lg">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5" /> Plated &amp; Order Waste
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-white">
              ₹{(analystMetrics.wholeDishLoss + analystMetrics.orderLoss).toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            ₹{analystMetrics.wholeDishLoss} kitchen + ₹{analystMetrics.orderLoss} order spills
          </span>
        </div>

      </div>

      {/* 2. ANALYST ROOT CAUSE PARETO BREAKDOWN */}
      <div className="bg-[#0A0E13] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Analyst Loss Hotspot &amp; Root Cause Analysis</span>
            </h4>
            <span className="text-[9px] font-mono bg-white/10 text-gray-300 px-2 py-0.5 rounded">
              Shift Focus: {analystMetrics.highestLossReason !== 'None' ? getReasonLabel(analystMetrics.highestLossReason) : 'Zero Losses Logged'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 max-w-2xl">
            Big players like Domino's and Rebel Foods isolate prep trim, cold-chain temperature breaches, and transit spills to optimize kitchen margin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Main Action Buttons */}
          <button
            type="button"
            onClick={() => {
              setModalMode('ingredient');
              resetIngredientForm();
              setShowLogWasteModal(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Raw Stock Waste</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('order');
              resetOrderForm();
              setShowLogWasteModal(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Log Whole Dish / Order Waste</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-black flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 3. FILTERS & SEARCH CONTROL BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0A0E13] p-3 rounded-2xl border border-white/5">
        
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Wastage' },
            { id: 'ingredient', label: 'Raw Ingredients' },
            { id: 'whole_dish', label: 'Whole Dishes' },
            { id: 'order', label: 'Entire Orders' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                typeFilter === tab.id
                  ? 'bg-brand-orange text-brand-charcoal border-brand-orange shadow-md'
                  : 'bg-[#121820] text-gray-400 hover:text-white border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-[#121820] border border-white/10 text-xs text-gray-200 font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-brand-green"
          >
            <option value="today">Today's Shift</option>
            <option value="all_time">All Time Audit</option>
          </select>

          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search item, order #, staff..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#121820] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green font-bold"
            />
          </div>
        </div>

      </div>

      {/* 4. WASTAGE LOG TABLE / AUDIT LEDGER */}
      <div className="bg-[#121820] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-orange" />
              <span>Verified Wastage &amp; Food Loss Ledger</span>
            </h4>
            <span className="text-[10px] font-mono text-gray-400">
              ({filteredRecords.length} records)
            </span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-brand-orange" />
            <span>Print Audit Log</span>
          </button>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-[#0D1218]">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h5 className="text-sm font-black uppercase text-white">No Wastage Entries Recorded</h5>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {dateFilter === 'today' ? "No food waste logged for today's shift yet. Keep prep yields tight and temperatures calibrated!" : "No wastage records match the selected filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-wider text-gray-400 bg-[#0A0E13]">
                  <th className="py-3 px-4">Item / Target</th>
                  <th className="py-3 px-4">Category / Type</th>
                  <th className="py-3 px-4">Wasted Qty</th>
                  <th className="py-3 px-4">Financial Loss</th>
                  <th className="py-3 px-4">Primary Reason</th>
                  <th className="py-3 px-4">Logged By / Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                    
                    {/* Item Target */}
                    <td className="py-3 px-4 font-sans font-black text-white">
                      <div className="flex items-center gap-2">
                        {r.type === 'ingredient' ? (
                          <Package className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : r.type === 'whole_dish' ? (
                          <ChefHat className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Bike className="w-4 h-4 text-purple-400 shrink-0" />
                        )}
                        <div>
                          <span>{r.targetName}</span>
                          {r.orderMetadata?.customerName && (
                            <span className="text-[10px] text-gray-400 font-mono block">
                              Cust: {r.orderMetadata.customerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        r.type === 'ingredient'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : r.type === 'whole_dish'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {r.type === 'ingredient' ? 'Raw Stock' : r.type === 'whole_dish' ? 'Whole Dish' : 'Order Waste'}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 font-black text-gray-200">
                      {r.quantity} {r.unit}
                    </td>

                    {/* Financial Loss */}
                    <td className="py-3 px-4 font-black text-rose-400 text-sm">
                      -₹{r.financialLoss.toLocaleString()}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getReasonBadgeColor(r.reasonCategory)}`}>
                        {getReasonLabel(r.reasonCategory)}
                      </span>
                      {r.reasonNotes && (
                        <span className="text-[10px] text-gray-400 italic block mt-0.5 max-w-xs truncate">
                          "{r.reasonNotes}"
                        </span>
                      )}
                    </td>

                    {/* Logged by & Time */}
                    <td className="py-3 px-4 text-[10px] text-gray-400">
                      <span className="text-gray-200 block font-bold">{r.loggedBy}</span>
                      <span>{new Date(r.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.orderMetadata && (
                          <button
                            type="button"
                            onClick={() => setSelectedInspectRecord(r)}
                            className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs transition-all cursor-pointer"
                            title="Inspect complete order & rider details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteWasteRecord(r)}
                          className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg text-xs transition-all cursor-pointer"
                          title="Undo / Delete Waste Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: LOG WASTE MODAL (3 MODES)                       */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showLogWasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogWasteModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#0F141C] border border-white/15 rounded-3xl w-full max-w-2xl p-6 shadow-2xl z-10 space-y-5 text-left my-auto max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">
                    {kitchenName} • Wastage Logging Deck
                  </span>
                  <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-400" />
                    <span>Record Spoiled / Discarded Food</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogWasteModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-[#0A0E13] p-1 rounded-2xl border border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalMode('ingredient')}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    modalMode === 'ingredient'
                      ? 'bg-amber-500 text-brand-charcoal shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Raw Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalMode('whole_dish')}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    modalMode === 'whole_dish'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Whole Dish</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalMode('order')}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    modalMode === 'order'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Entire Order</span>
                </button>
              </div>

              {/* Modal Body / Tab Content */}
              <div className="overflow-y-auto pr-1 flex-1 space-y-4">
                
                {/* ---------------------------------------------------- */}
                {/* TAB 1: RAW STOCK / INGREDIENT WASTAGE                */}
                {/* ---------------------------------------------------- */}
                {modalMode === 'ingredient' && (
                  <form onSubmit={handleSaveIngredientWaste} className="space-y-4">
                    
                    {/* Select Ingredient */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        1. Select Inventory Ingredient
                      </label>
                      <select
                        value={selectedIngredientId}
                        onChange={(e) => setSelectedIngredientId(e.target.value)}
                        required
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="">-- Choose from Kitchen Stock --</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.quantity} {item.unit} in stock - ₹{item.costPerUnit || 100}/{item.unit})
                          </option>
                        ))}
                      </select>
                      {selectedIngredient && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center justify-between">
                          <span>Current Available Stock: <strong>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></span>
                          <span>Unit Cost: ₹{selectedIngredient.costPerUnit || 100}/{selectedIngredient.unit}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity & Unit Cost */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                          2. Quantity Wasted ({selectedIngredient?.unit || 'units'})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={selectedIngredient ? selectedIngredient.quantity : 9999}
                          value={wastedQty}
                          onChange={(e) => setWastedQty(parseFloat(e.target.value) || 0)}
                          required
                          className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-sm text-white font-mono font-black focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                          3. Unit Cost Loss (₹/{selectedIngredient?.unit || 'unit'})
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={customUnitCost}
                          onChange={(e) => setCustomUnitCost(parseFloat(e.target.value) || 0)}
                          required
                          className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-sm text-white font-mono font-black focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Reason Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        4. Wastage Cause / Reason
                      </label>
                      <select
                        value={ingredientReason}
                        onChange={(e) => setIngredientReason(e.target.value as any)}
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="expired_spoiled">Expired / Mold / Sour / Rotting</option>
                        <option value="prep_trim_error">Kitchen Prep / Excess Trimming / Cutting Defect</option>
                        <option value="storage_temp_breach">Cold Storage / Chiller Temp Breach</option>
                        <option value="packaging_defect">Damaged Packaging / Torn Sack</option>
                        <option value="contamination">Sanitation Discard / Foreign Object</option>
                      </select>
                    </div>

                    {/* Disposition Action */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        5. Final Disposition Action
                      </label>
                      <select
                        value={ingredientDisposition}
                        onChange={(e) => setIngredientDisposition(e.target.value as any)}
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="discarded">Discarded in Organic Kitchen Waste</option>
                        <option value="returned_to_vendor">Returned to Raw Material Vendor (Credit Claim)</option>
                        <option value="staff_meal">Repurposed into Staff Family Meal</option>
                        <option value="composted">Sent to Organic Composting</option>
                        <option value="bio_waste">Bio-Hazard / Contaminated Waste</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        6. Auditor / Chef Incident Remarks
                      </label>
                      <input
                        type="text"
                        value={ingredientNotes}
                        onChange={(e) => setIngredientNotes(e.target.value)}
                        placeholder="e.g. Deep freezer 2 fan tripped overnight; 2.5 kg paneer turned sour."
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    {/* Loss Calculation Preview */}
                    <div className="p-3 bg-[#0A0E13] border border-rose-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-rose-400 block tracking-wider">
                          Net Food Cost Loss to Kitchen
                        </span>
                        <span className="text-lg font-mono font-black text-rose-400">
                          ₹{Math.round(wastedQty * customUnitCost).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-gray-400 font-mono">
                        <span>Stock reduction:</span>
                        <strong className="text-white block font-sans">
                          {selectedIngredient ? `${selectedIngredient.quantity} ➜ ${(selectedIngredient.quantity - wastedQty).toFixed(1)} ${selectedIngredient.unit}` : '-'}
                        </strong>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Seal &amp; Deduct from Stock</span>
                    </button>
                  </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 2: WHOLE DISH WASTAGE                            */}
                {/* ---------------------------------------------------- */}
                {modalMode === 'whole_dish' && (
                  <form onSubmit={handleSaveWholeDishWaste} className="space-y-4">
                    
                    {/* Select Meal */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        1. Select Dish from Active Menu
                      </label>
                      <select
                        value={selectedMealId}
                        onChange={(e) => setSelectedMealId(e.target.value)}
                        required
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                      >
                        <option value="">-- Choose Menu Dish --</option>
                        {meals.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (₹{m.price} menu price)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Portions & Station */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                          2. Portions Wasted
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={dishPortions}
                          onChange={(e) => setDishPortions(parseInt(e.target.value) || 1)}
                          required
                          className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-sm text-white font-mono font-black focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                          3. Prep Station / Station Lane
                        </label>
                        <select
                          value={dishPrepStation}
                          onChange={(e) => setDishPrepStation(e.target.value as any)}
                          className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                        >
                          <option value="lane_a">Lane A (Veg Sauté &amp; Biryani)</option>
                          <option value="lane_b">Lane B (Tandoor &amp; Meat Grill)</option>
                          <option value="grill">Charcoal Bhatti Pit</option>
                          <option value="dessert">Beverages &amp; Shakes Station</option>
                        </select>
                      </div>
                    </div>

                    {/* Dish Waste Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        4. Primary Failure Reason
                      </label>
                      <select
                        value={dishReason}
                        onChange={(e) => setDishReason(e.target.value as any)}
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                      >
                        <option value="burnt_overcooked">Burnt on Bhatti Grill / Overcooked</option>
                        <option value="wrong_preparation">Wrong Recipe / Missed Customer Customization</option>
                        <option value="prep_trim_error">Dropped on Kitchen Floor During Plating</option>
                        <option value="storage_temp_breach">Quality / Texture Check Rejected by Head Chef</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                        5. Kitchen Incident Notes
                      </label>
                      <input
                        type="text"
                        value={dishNotes}
                        onChange={(e) => setDishNotes(e.target.value)}
                        placeholder="e.g. Too much salt in marinade; remade fresh portion."
                        className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>

                    {/* Financial Loss Preview */}
                    <div className="p-3 bg-[#0A0E13] border border-rose-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-rose-400 block tracking-wider">
                          Finished Goods Loss (Cost Basis)
                        </span>
                        <span className="text-lg font-mono font-black text-rose-400">
                          ₹{selectedMeal ? Math.round(selectedMeal.price * 0.55 * dishPortions).toLocaleString() : 0}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {dishPortions}x portions @ ₹{selectedMeal ? Math.round(selectedMeal.price * 0.55) : 0}/portion
                      </span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Log Whole Dish Waste</span>
                    </button>
                  </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 3: ENTIRE ORDER WASTAGE (KEY USER REQUIREMENT)   */}
                {/* ---------------------------------------------------- */}
                {modalMode === 'order' && (
                  <div className="space-y-4">
                    
                    {/* Order Search & Picker Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                          1. Select / Search Order to Waste
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOrderWasteDateFilter('today')}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                              orderWasteDateFilter === 'today' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            Today's Orders
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderWasteDateFilter('all')}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                              orderWasteDateFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            All Dates
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={orderSearchTerm}
                          onChange={(e) => setOrderSearchTerm(e.target.value)}
                          placeholder="Search by Order ID, customer, address, rider..."
                          className="w-full pl-8 pr-3 py-2 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-bold"
                        />
                      </div>

                      {/* Orders Quick Selection List */}
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-white/5 rounded-xl p-1.5 bg-[#0A0E13]">
                        {candidateOrders.length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-500">
                            No matching orders found.
                          </div>
                        ) : (
                          candidateOrders.slice(0, 15).map((ord) => {
                            const isSelected = selectedOrderId === ord.id;
                            const dateStr = ord.date || (ord as any).createdAt || '';
                            return (
                              <div
                                key={ord.id}
                                onClick={() => setSelectedOrderId(ord.id)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                                  isSelected
                                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                    : 'bg-[#121820] border-white/5 text-gray-300 hover:bg-white/5'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-white">
                                      #{ord.id.slice(-6).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                    </span>
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                                      {ord.status}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-gray-400 block truncate max-w-sm">
                                    {(ord as any).userName || 'Customer'} • {ord.address || 'Pickup'}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="font-mono font-black text-white block">
                                    ₹{ord.total}
                                  </span>
                                  <span className="text-[9px] text-gray-400 uppercase">
                                    {ord.items?.length || 0} items
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* ACTIVE ORDER INSPECTION CARD (DELIVERED BY, WHO ORDERED, ITEMS) */}
                    {activeOrderToWaste ? (
                      <div className="bg-[#0A0E13] border border-purple-500/40 rounded-2xl p-4 space-y-3.5">
                        
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-mono text-purple-300">
                              Order #{activeOrderToWaste.id.slice(-6).toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeOrderToWaste.id, 'order_inspect')}
                              className="text-gray-400 hover:text-white"
                              title="Copy Order ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedId === 'order_inspect' && (
                              <span className="text-[9px] text-emerald-400 font-black">Copied!</span>
                            )}
                          </div>
                          <span className="text-base font-black font-mono text-rose-400">
                            ₹{activeOrderToWaste.total}
                          </span>
                        </div>

                        {/* Customer & Rider Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          
                          {/* Who Ordered */}
                          <div className="bg-[#121820] p-3 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-brand-green" /> Who Ordered (Customer)
                            </span>
                            <span className="font-black text-white block">
                              {(activeOrderToWaste as any).userName || 'Valued Customer'}
                            </span>
                            <div className="text-[11px] text-gray-400 space-y-0.5">
                              <span className="block flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-500" />
                                {(activeOrderToWaste as any).userPhone || '+91 98711 00213'}
                              </span>
                              <span className="block flex items-center gap-1 truncate" title={activeOrderToWaste.address}>
                                <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                                {activeOrderToWaste.address || 'Direct Kitchen Counter'}
                              </span>
                            </div>
                          </div>

                          {/* Delivered By / Fleet Rider */}
                          <div className="bg-[#121820] p-3 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1">
                              <Bike className="w-3 h-3 text-brand-orange" /> Delivered By (Rider)
                            </span>
                            <span className="font-black text-white block">
                              {activeOrderRider?.name || 'Assigned Fleet Rider'}
                            </span>
                            <div className="text-[11px] text-gray-400 space-y-0.5">
                              <span className="block flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-500" />
                                {activeOrderRider?.phone || '+91 98440 19283'}
                              </span>
                              <span className="block flex items-center gap-1">
                                <Truck className="w-3 h-3 text-gray-500" />
                                {activeOrderRider?.vehicle || 'Two-Wheeler'} • {(activeOrderRider as any)?.vehicleNumber || 'DL-4S-8921'}
                              </span>
                            </div>
                          </div>

                        </div>

                        {/* Items in Order */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
                            Order Contents ({activeOrderToWaste.items?.length || 0} items):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {activeOrderToWaste.items?.map((item, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white/5 rounded-lg text-[11px] text-gray-200 border border-white/5 font-mono">
                                {item.quantity}x {item.name || item.mealId}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Order Wastage Reason */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-black uppercase tracking-wider text-gray-300">
                            Wastage Incident Classification
                          </label>
                          <select
                            value={orderWasteReason}
                            onChange={(e) => setOrderWasteReason(e.target.value as any)}
                            className="w-full p-2.5 bg-[#121820] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                          >
                            <option value="transit_spill_damage">Rider Transit Spill / Container Seal Breach</option>
                            <option value="wrong_preparation">Kitchen Cooking Error / Wrong Items Plated</option>
                            <option value="customer_cancellation">Customer Cancelled After Order Plated</option>
                            <option value="customer_rejected_return">Customer Unreachable / Delivery Refused</option>
                          </select>
                        </div>

                        {/* QUICK ACTION BUTTONS (HOW BIG PLAYERS OPERATE) */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                            Enterprise Quick Actions:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            
                            {/* Action 1: Rider Spill */}
                            <button
                              type="button"
                              onClick={() => handleSaveOrderWaste('rider_spill')}
                              className="p-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Bike className="w-4 h-4" />
                              <span>Transit Spill Loss</span>
                            </button>

                            {/* Action 2: Kitchen Prep Error */}
                            <button
                              type="button"
                              onClick={() => handleSaveOrderWaste('kitchen_mistake')}
                              className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>Kitchen Prep Mistake</span>
                            </button>

                            {/* Action 3: Re-fire & Prioritize */}
                            <button
                              type="button"
                              onClick={() => handleSaveOrderWaste('refire_order')}
                              className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Log Waste &amp; Re-fire</span>
                            </button>

                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveOrderWaste('customer_cancellation')}
                              className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              Cancel &amp; Record Customer Return
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveOrderWaste('full_discard')}
                              className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              General Order Discard
                            </button>
                          </div>

                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-500 bg-[#0A0E13] rounded-2xl border border-dashed border-white/10">
                        Select an order from the list above to view full customer and rider dossier.
                      </div>
                    )}

                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: INSPECT ORDER WASTE DOSSIER                     */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedInspectRecord && selectedInspectRecord.orderMetadata && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInspectRecord(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#0F141C] border border-purple-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-4 text-left my-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">
                    Full Order Waste Audit Dossier
                  </span>
                  <h3 className="text-base font-black uppercase text-white font-mono">
                    Order #{selectedInspectRecord.orderMetadata.orderId.slice(-6).toUpperCase()}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInspectRecord(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Meta Info */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-[#0A0E13] p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[9px] uppercase text-gray-400 font-black block">Financial Loss</span>
                    <span className="text-base font-black font-mono text-rose-400">
                      ₹{selectedInspectRecord.financialLoss.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-400 font-black block">Action Taken</span>
                    <span className="text-xs font-black text-purple-300">
                      {selectedInspectRecord.orderMetadata.quickActionTaken || 'Discarded'}
                    </span>
                  </div>
                </div>

                {/* Who Ordered */}
                <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-brand-green" /> Who Ordered (Customer)
                  </span>
                  <span className="font-bold text-white block">
                    {selectedInspectRecord.orderMetadata.customerName}
                  </span>
                  <div className="text-[11px] text-gray-400 space-y-0.5">
                    <span>Phone: {selectedInspectRecord.orderMetadata.customerPhone}</span>
                    <span className="block truncate">Address: {selectedInspectRecord.orderMetadata.address}</span>
                  </div>
                </div>

                {/* Delivered By */}
                <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1">
                    <Bike className="w-3 h-3 text-brand-orange" /> Delivered By (Rider)
                  </span>
                  <span className="font-bold text-white block">
                    {selectedInspectRecord.orderMetadata.deliveryPartnerName || 'Fleet Partner'}
                  </span>
                  <div className="text-[11px] text-gray-400 space-y-0.5">
                    <span>Phone: {selectedInspectRecord.orderMetadata.deliveryPartnerPhone}</span>
                    <span>Vehicle: {selectedInspectRecord.orderMetadata.deliveryPartnerVehicle} ({selectedInspectRecord.orderMetadata.deliveryVehicleNumber})</span>
                  </div>
                </div>

                {/* Items in Order */}
                <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 block">Dishes in Order:</span>
                  <p className="text-[11px] text-gray-200 font-mono">
                    {selectedInspectRecord.orderMetadata.itemsSummary}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedInspectRecord(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
