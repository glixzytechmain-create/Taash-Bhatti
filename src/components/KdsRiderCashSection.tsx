import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Phone,
  Truck,
  ArrowRight,
  Search,
  Calendar,
  History,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  ShieldCheck,
  DollarSign,
  Package,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Kitchen, DeliveryPartner, Order, CashDepositRequest } from '../types';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface KdsRiderCashSectionProps {
  activeKdsKitchen: Kitchen | null;
  allKitchens: Kitchen[];
  deliveryPartners: DeliveryPartner[];
  setDeliveryPartners: React.Dispatch<React.SetStateAction<DeliveryPartner[]>>;
  orders: Order[];
  cashDeposits: CashDepositRequest[];
  onApproveDeposit: (dep: CashDepositRequest) => Promise<void>;
  onRejectDeposit: (dep: CashDepositRequest, reason: string) => Promise<void>;
  isProcessingAction: boolean;
  onRefresh?: () => void;
}

export const KdsRiderCashSection: React.FC<KdsRiderCashSectionProps> = ({
  activeKdsKitchen,
  allKitchens,
  deliveryPartners,
  setDeliveryPartners,
  orders,
  cashDeposits,
  onApproveDeposit,
  onRejectDeposit,
  isProcessingAction,
}) => {
  // Navigation & Filter states
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'ledger' | 'deliveries' | 'history'>('pending');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllKitchensRiders, setShowAllKitchensRiders] = useState<boolean>(false);

  // Rejection modal
  const [rejectionTargetDeposit, setRejectionTargetDeposit] = useState<CashDepositRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Manual direct handover modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualRiderId, setManualRiderId] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  // Current real today display
  const todayDisplay = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Check if a date string is today
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
    const todayFormatted1 = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayFormatted2 = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return dateStr.includes(todayFormatted1) || dateStr.includes(todayFormatted2);
  };

  // Clean date-time formatter
  const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return dateStr;
  };

  // Assigned riders for active kitchen
  const assignedRiders = useMemo(() => {
    if (showAllKitchensRiders || !activeKdsKitchen?.id) return deliveryPartners;
    return deliveryPartners.filter(
      (p) =>
        p.kitchenId === activeKdsKitchen.id ||
        (!p.kitchenId && activeKdsKitchen.id === allKitchens[0]?.id)
    );
  }, [deliveryPartners, activeKdsKitchen, allKitchens, showAllKitchensRiders]);

  const assignedRiderIds = useMemo(() => new Set(assignedRiders.map((r) => r.id)), [assignedRiders]);

  // Deposits for this kitchen
  const kitchenDeposits = useMemo(() => {
    if (showAllKitchensRiders || !activeKdsKitchen?.id) return cashDeposits;
    return cashDeposits.filter((d) => d.kitchenId === activeKdsKitchen.id);
  }, [cashDeposits, activeKdsKitchen, showAllKitchensRiders]);

  // Pending deposits waiting for kitchen cashier approval
  const pendingDeposits = useMemo(() => {
    return kitchenDeposits.filter((d) => d.status === 'pending');
  }, [kitchenDeposits]);

  // Date-filtered deposits (today vs view all)
  const dateFilteredDeposits = useMemo(() => {
    if (dateFilter === 'today') {
      return kitchenDeposits.filter((d) => isDateToday(d.requestedAt || d.approvedAt));
    }
    return kitchenDeposits;
  }, [kitchenDeposits, dateFilter]);

  // Completed deliveries for this kitchen & its fleet
  const completedDeliveries = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const isKitchenOrder =
        !activeKdsKitchen ||
        o.kitchenId === activeKdsKitchen.id ||
        o.acceptedByKitchenId === activeKdsKitchen.id;
      const isAssignedRider = Boolean(o.deliveryPartnerId && assignedRiderIds.has(o.deliveryPartnerId));
      return isKitchenOrder || isAssignedRider;
    });
  }, [orders, activeKdsKitchen, assignedRiderIds]);

  // Date-filtered completed deliveries (today vs view all)
  const dateFilteredDeliveries = useMemo(() => {
    if (dateFilter === 'today') {
      return completedDeliveries.filter((o) => isDateToday(o.date));
    }
    return completedDeliveries;
  }, [completedDeliveries, dateFilter]);

  // KPIs
  const pendingTotalAmount = useMemo(() => {
    return pendingDeposits.reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [pendingDeposits]);

  const totalCashInFleet = useMemo(() => {
    return assignedRiders.reduce((acc, r) => acc + (r.cashInHand || 0), 0);
  }, [assignedRiders]);

  const completedDeliveriesRevenue = useMemo(() => {
    return dateFilteredDeliveries.reduce((acc, o) => acc + (o.total || 0), 0);
  }, [dateFilteredDeliveries]);

  const approvedDepositsCollected = useMemo(() => {
    return dateFilteredDeposits
      .filter((d) => d.status === 'approved')
      .reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [dateFilteredDeposits]);

  // Filtered lists based on search query
  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingDeposits;
    return pendingDeposits.filter(
      (d) =>
        d.partnerName.toLowerCase().includes(q) ||
        (d.partnerPhone && d.partnerPhone.includes(q)) ||
        (d.partnerVehicle && d.partnerVehicle.toLowerCase().includes(q))
    );
  }, [pendingDeposits, searchQuery]);

  const filteredRiders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignedRiders;
    return assignedRiders.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(q))
    );
  }, [assignedRiders, searchQuery]);

  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dateFilteredDeliveries;
    return dateFilteredDeliveries.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.address && o.address.toLowerCase().includes(q)) ||
        (o.deliveryPartnerName && o.deliveryPartnerName.toLowerCase().includes(q))
    );
  }, [dateFilteredDeliveries, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dateFilteredDeposits;
    return dateFilteredDeposits.filter(
      (d) =>
        d.partnerName.toLowerCase().includes(q) ||
        (d.partnerPhone && d.partnerPhone.includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q)) ||
        (d.rejectedReason && d.rejectedReason.toLowerCase().includes(q))
    );
  }, [dateFilteredDeposits, searchQuery]);

  // Handler for direct manual handover
  const handleSubmitManualHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!manualRiderId || isNaN(amt) || amt <= 0) {
      alert('Please select a rider and enter a valid cash amount.');
      return;
    }
    const partner = deliveryPartners.find((p) => p.id === manualRiderId);
    if (!partner) return;

    setIsSubmittingManual(true);
    try {
      const cashierName = `${activeKdsKitchen?.name || 'Kitchen Hub'} Cashier Desk`;
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
        approvedBy: cashierName,
        approvedByName: cashierName,
        notes: manualNotes.trim() || 'Direct in-person cash handover at kitchen counter',
      });

      const remainingCash = Math.max(0, (partner.cashInHand || 0) - amt);
      try {
        await updateDoc(doc(db, 'delivery_partners', partner.id), {
          cashInHand: remainingCash,
        });
      } catch (e) {
        console.warn('Could not update delivery_partners collection directly:', e);
      }
      setDeliveryPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, cashInHand: remainingCash } : p))
      );

      setShowManualModal(false);
      setManualRiderId('');
      setManualAmount('');
      setManualNotes('');
    } catch (err) {
      console.error('Failed to record direct cash handover:', err);
      alert('Failed to record cash handover. Please check connection.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-brand-charcoal/40 p-5 rounded-2xl border border-brand-green/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Rider Cash Handover & Completed Deliveries Desk
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Terminal:{' '}
            <span className="text-white font-bold">
              {activeKdsKitchen ? activeKdsKitchen.name : 'All Cloud Kitchens'}
            </span>{' '}
            • Collect physical cash notes from assigned riders, verify amounts, and audit completed drops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* True Today Date Indicator */}
          <div className="flex items-center gap-2 bg-[#0E141A] px-3.5 py-2 rounded-xl border border-white/10 text-xs font-mono font-bold text-gray-200">
            <Calendar className="w-4 h-4 text-brand-orange" />
            <span>Today: {todayDisplay}</span>
          </div>

          {/* Direct Handover Entry Button */}
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            Direct Counter Collection
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Cash Approvals */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            pendingDeposits.length > 0
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-900/10'
              : 'bg-brand-charcoal/30 border-brand-green/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
              Pending Approvals
            </span>
            <Banknote
              className={`w-5 h-5 ${pendingDeposits.length > 0 ? 'text-rose-400 animate-bounce' : 'text-gray-500'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono font-black ${
                pendingDeposits.length > 0 ? 'text-rose-300' : 'text-white'
              }`}
            >
              ₹{pendingTotalAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-gray-400 font-bold">
              ({pendingDeposits.length} request{pendingDeposits.length === 1 ? '' : 's'})
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {pendingDeposits.length > 0
              ? '⚠️ Riders waiting at counter for cash verification'
              : 'No pending deposit queues'}
          </span>
        </div>

        {/* Assigned Fleet on Duty */}
        <div className="p-4 rounded-2xl border bg-brand-charcoal/30 border-brand-green/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
              Assigned Fleet
            </span>
            <Truck className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-white">{assignedRiders.length}</span>
            <span className="text-xs text-indigo-400 font-bold">Riders on duty</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {assignedRiders.filter((r) => r.status === 'active' || r.status === 'on_delivery').length} currently active in zone
          </span>
        </div>

        {/* Total Cash Held in Fleet Hands */}
        <div className="p-4 rounded-2xl border bg-brand-charcoal/30 border-brand-green/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
              Fleet Cash In Hand
            </span>
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-amber-300">
              ₹{totalCashInFleet.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Un-deposited physical cash held by riders
          </span>
        </div>

        {/* Completed Deliveries (filtered by date) */}
        <div className="p-4 rounded-2xl border bg-brand-charcoal/30 border-brand-green/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
              {dateFilter === 'today' ? "Today's Deliveries" : 'All Deliveries'}
            </span>
            <CheckCircle2 className="w-5 h-5 text-brand-green" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-brand-green">
              {dateFilteredDeliveries.length}
            </span>
            <span className="text-xs text-gray-400 font-bold">
              (₹{completedDeliveriesRevenue.toLocaleString('en-IN')})
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {dateFilter === 'today' ? `Fitted drops on ${todayDisplay}` : 'All historic delivered orders'}
          </span>
        </div>
      </div>

      {/* CONTROLS & SUB-TABS BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-brand-charcoal/50 p-3 rounded-2xl border border-brand-green/10">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Pending Approvals</span>
            {pendingDeposits.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-600 font-black text-[10px]">
                {pendingDeposits.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-brand-orange text-brand-charcoal shadow-md font-black'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Assigned Riders Ledger ({assignedRiders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('deliveries')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'deliveries'
                ? 'bg-emerald-500 text-brand-charcoal shadow-md font-black'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Completed Deliveries ({dateFilteredDeliveries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Deposit Audit History ({dateFilteredDeposits.length})</span>
          </button>
        </div>

        {/* Date Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Today vs View All Toggle */}
          <div className="bg-[#0B0F13] p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-brand-orange text-brand-charcoal font-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📅 Today ({todayDisplay})
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-brand-orange text-brand-charcoal font-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🗂️ View All & History
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rider, phone, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0B0F13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PENDING CASH APPROVALS                           */}
      {/* ======================================================== */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-rose-400" />
              Cash Handover Requests Awaiting Kitchen Approval ({filteredPending.length})
            </h4>
            <span className="text-[10px] font-mono text-gray-400">
              Riders physically deposit physical cash banknotes at this kitchen desk
            </span>
          </div>

          {filteredPending.length === 0 ? (
            <div className="p-12 text-center bg-brand-charcoal/20 border border-dashed border-brand-green/10 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                All Cash Handover Requests Cleared
              </h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                There are no riders currently waiting for cash verification. When an assigned rider initiates a
                cash deposit from their app, their request will appear here instantly for approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPending.map((dep) => {
                const partner = deliveryPartners.find((p) => p.id === dep.partnerId);
                const currentCash = partner?.cashInHand || 0;
                const remainingAfterApproval = Math.max(0, currentCash - dep.amount);

                return (
                  <motion.div
                    key={dep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-[#141A22] border-2 border-rose-500/40 hover:border-rose-500 shadow-xl space-y-4 relative overflow-hidden"
                  >
                    {/* Top status bar */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                          ● Pending Cashier Collection
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">{dep.partnerName}</h4>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {dep.partnerPhone || 'No Phone'} • {dep.partnerVehicle || 'Fleet Partner'}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-gray-500 block">Requested</span>
                        <span className="text-[11px] font-mono text-gray-300">
                          {formatDateTime(dep.requestedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Amount Banner */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-brand-charcoal border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                          Cash To Collect
                        </span>
                        <span className="text-2xl font-mono font-black text-emerald-400">
                          ₹{dep.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right text-[10px] font-mono">
                        <span className="text-gray-400 block">Rider Cash In Hand:</span>
                        <span className="text-white font-bold">₹{currentCash}</span>
                        <span className="text-gray-400 block mt-0.5">
                          Remains after: <span className="text-amber-300 font-bold">₹{remainingAfterApproval}</span>
                        </span>
                      </div>
                    </div>

                    {dep.notes && (
                      <div className="text-[11px] text-gray-400 bg-black/30 p-2.5 rounded-xl border border-white/5 italic">
                        "{dep.notes}"
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => onApproveDeposit(dep)}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5px]" />
                        Approve & Collect (₹{dep.amount})
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => {
                          setRejectionTargetDeposit(dep);
                          setRejectionReason('');
                        }}
                        className="px-3 py-2.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                        title="Reject handover if currency is short or incorrect"
                      >
                        <X className="w-4 h-4 stroke-[2.5px]" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ASSIGNED RIDERS CASH LEDGER                      */}
      {/* ======================================================== */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-orange" />
              Riders Assigned to {activeKdsKitchen?.name || 'All Kitchens'} ({filteredRiders.length})
            </h4>

            <button
              type="button"
              onClick={() => setShowAllKitchensRiders(!showAllKitchensRiders)}
              className="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-wider underline cursor-pointer"
            >
              {showAllKitchensRiders ? '← Show Only This Kitchen Fleet' : '🌐 View All Kitchens Fleet'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-brand-green/10 bg-[#121820]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F13] text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Rider Details</th>
                  <th className="py-3 px-4">Assigned Branch</th>
                  <th className="py-3 px-4">Duty Status</th>
                  <th className="py-3 px-4 text-right">Cash Currently In Hand</th>
                  <th className="py-3 px-4 text-right">Today's Cash Collected</th>
                  <th className="py-3 px-4 text-center">Completed Drops</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredRiders.map((rider) => {
                  const hasHighCash = (rider.cashInHand || 0) > 2000;
                  return (
                    <tr key={rider.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{rider.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {rider.phone} • {rider.vehicleNumber || rider.vehicleType}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-300">
                        {rider.kitchenName || (activeKdsKitchen?.name ?? 'Main Kitchen')}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            rider.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : rider.status === 'on_delivery'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                        >
                          ● {rider.status?.replace('_', ' ') || 'active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-mono font-black ${
                            hasHighCash ? 'text-rose-400' : 'text-white'
                          }`}
                        >
                          ₹{(rider.cashInHand || 0).toLocaleString('en-IN')}
                        </span>
                        {hasHighCash && (
                          <span className="text-[8px] font-black text-rose-400 uppercase block tracking-wider">
                            Deposit Due ⚠️
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-300">
                        ₹{(rider.cashCollectedToday || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-brand-orange">
                        {rider.deliveriesCompleted || 0}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setManualRiderId(rider.id);
                            setManualAmount((rider.cashInHand || 0).toString());
                            setShowManualModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-emerald-500 hover:text-brand-charcoal text-gray-300 font-black text-[10px] uppercase rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                          Collect Cash 💵
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COMPLETED DELIVERIES                             */}
      {/* ======================================================== */}
      {activeSubTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Completed Customer Deliveries ({filteredDeliveries.length})
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {dateFilter === 'today'
                  ? `Showing orders delivered on Today: ${todayDisplay}`
                  : 'Showing all completed delivery drop-offs across recorded history'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Value</span>
              <span className="text-base font-mono font-black text-brand-green">
                ₹{completedDeliveriesRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {filteredDeliveries.length === 0 ? (
            <div className="p-12 text-center bg-brand-charcoal/20 border border-dashed border-brand-green/10 rounded-3xl space-y-3">
              <Package className="w-10 h-10 text-gray-500 mx-auto" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                No Completed Deliveries Found
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {dateFilter === 'today'
                  ? `No orders have reached 'Delivered' status for today (${todayDisplay}) yet.`
                  : 'No completed orders matching your current search query.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-green/10 bg-[#121820]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F13] text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Delivered Date & Time</th>
                    <th className="py-3 px-4">Fulfilling Rider</th>
                    <th className="py-3 px-4">Customer & Location</th>
                    <th className="py-3 px-4">Order Summary</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredDeliveries.map((ord) => {
                    const rider = deliveryPartners.find((p) => p.id === ord.deliveryPartnerId);
                    const isCod = ord.paymentMethod?.toLowerCase().includes('cash') || ord.paymentMethod?.toLowerCase().includes('cod');

                    return (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-brand-orange">
                          #{ord.id}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-gray-300 whitespace-nowrap">
                          {formatDateTime(ord.date)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {ord.deliveryPartnerName || rider?.name || 'Assigned Rider'}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {ord.deliveryPartnerPhone || rider?.phone || 'Fleet'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{ord.customerName || 'Customer'}</div>
                          <div className="text-[10px] text-gray-400 max-w-[200px] truncate">
                            {ord.address || ord.customerPhone}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-300 max-w-[220px] truncate">
                          {ord.items?.map((it) => `${it.quantity}x ${it.meal?.name || 'Dish'}`).join(', ') || '1 item'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              isCod
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {isCod ? 'Cash on Delivery' : 'Prepaid / UPI'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-white text-sm">
                          ₹{ord.total}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green text-[9px] font-black uppercase tracking-wider border border-brand-green/30">
                            ✓ Delivered
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
      )}

      {/* ======================================================== */}
      {/* TAB 4: DEPOSIT AUDIT HISTORY                            */}
      {/* ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Physical Cash Handover Audit Trail ({filteredHistory.length})
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {dateFilter === 'today'
                  ? `Showing cash handovers logged today: ${todayDisplay}`
                  : 'Showing complete historical audit trail with timestamps and cashier details'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Approved</span>
              <span className="text-base font-mono font-black text-emerald-400">
                ₹{approvedDepositsCollected.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center bg-brand-charcoal/20 border border-dashed border-brand-green/10 rounded-3xl space-y-3">
              <History className="w-10 h-10 text-gray-500 mx-auto" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                No Deposit Records Found
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No cash handover transactions recorded for this period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-green/10 bg-[#121820]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F13] text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Rider Details</th>
                    <th className="py-3 px-4">Kitchen Hub</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Verified By</th>
                    <th className="py-3 px-4">Audit Notes / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredHistory.map((dep) => {
                    const isApproved = dep.status === 'approved';
                    const isPending = dep.status === 'pending';

                    return (
                      <tr key={dep.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-300 whitespace-nowrap">
                          {formatDateTime(dep.approvedAt || dep.requestedAt)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{dep.partnerName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {dep.partnerPhone} • {dep.partnerVehicle}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-300 font-medium">
                          {dep.kitchenName}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-white">
                          ₹{dep.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isPending
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-300 text-[11px]">
                          {dep.approvedByName || dep.approvedBy || (isPending ? 'Awaiting Cashier' : 'Kitchen Desk')}
                        </td>

                        <td className="py-3 px-4 text-gray-400 text-[11px] max-w-[200px] truncate">
                          {dep.rejectedReason || dep.notes || 'Counter cash collection verified'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REJECTION REASON DIALOG                          */}
      {/* ======================================================== */}
      {rejectionTargetDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141A22] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-black uppercase text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Reject Cash Handover
              </h4>
              <button
                type="button"
                onClick={() => setRejectionTargetDeposit(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              You are rejecting the ₹{rejectionTargetDeposit.amount} cash deposit from{' '}
              <strong className="text-white">{rejectionTargetDeposit.partnerName}</strong>. Please provide a
              reason so the rider knows why (e.g. cash shortage, damaged currency notes, or recount needed).
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Cash shortfall of ₹100, or notes need recounting..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectionTargetDeposit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRejectDeposit(rejectionTargetDeposit, rejectionReason)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DIRECT MANUAL CASH HANDOVER ENTRY               */}
      {/* ======================================================== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141A22] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Record Direct Cash Collection
              </h4>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Direct physical cash handover received at{' '}
              <strong className="text-white">{activeKdsKitchen?.name || 'Kitchen Desk'}</strong> counter.
            </p>

            <form onSubmit={handleSubmitManualHandover} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Select Assigned Rider
                </label>
                <select
                  value={manualRiderId}
                  onChange={(e) => {
                    setManualRiderId(e.target.value);
                    const found = deliveryPartners.find((p) => p.id === e.target.value);
                    if (found && found.cashInHand) {
                      setManualAmount(found.cashInHand.toString());
                    }
                  }}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose Rider --</option>
                  {assignedRiders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.phone}) — Cash in Hand: ₹{r.cashInHand || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Cash Amount Collected (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  min={1}
                  step="any"
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified by head cashier, notes checked"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal rounded-xl text-xs font-black uppercase transition-all"
                >
                  {isSubmittingManual ? 'Recording...' : 'Record Cash Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
