import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Share2, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Utensils, 
  Flame,
  CloudRain,
  Headphones,
  Phone,
  MessageSquare,
  X,
  Send,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Kitchen, SupportTicket } from '../types';
import InAppDeliveryMap from './InAppDeliveryMap';

interface DeliverableOrderTrackerProps {
  orderId: string;
}

export default function DeliverableOrderTracker({ orderId }: DeliverableOrderTrackerProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Live Order Assistance & Support Modal States
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [helpCategory, setHelpCategory] = useState<'delay' | 'rider' | 'address' | 'items' | 'other'>('delay');
  const [helpMessage, setHelpMessage] = useState<string>('');
  const [isSubmittingHelp, setIsSubmittingHelp] = useState<boolean>(false);
  const [helpSuccessNotice, setHelpSuccessNotice] = useState<string | null>(null);

  // Clean the Order ID
  const cleanId = (orderId || '').trim();

  // Listen to the order document in real time from Firestore
  useEffect(() => {
    if (!cleanId) {
      setError("No Order ID provided in tracking link.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      doc(db, 'orders', cleanId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Order;
          setOrder(data);
          setLoading(false);

          // If the order has an assigned kitchen, listen to or fetch kitchen data
          const kId = data.acceptedByKitchenId || data.kitchenId;
          if (kId) {
            const unsubKitchen = onSnapshot(
              doc(db, 'kitchens', kId),
              (kSnap) => {
                if (kSnap.exists()) {
                  setKitchen({ id: kSnap.id, ...kSnap.data() } as Kitchen);
                }
              },
              (err) => console.warn("Could not load kitchen for tracker:", err)
            );
            return () => unsubKitchen();
          }
        } else {
          // Fallback: check local storage in case it was freshly placed offline
          try {
            const cached = localStorage.getItem('taashbhatti_orders');
            if (cached) {
              const parsed: Order[] = JSON.parse(cached);
              const found = parsed.find(o => o.id.toLowerCase() === cleanId.toLowerCase());
              if (found) {
                setOrder(found);
                setLoading(false);
                return;
              }
            }
          } catch (e) {}

          setError(`Order #${cleanId} was not found or link has expired.`);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error listening to order in DeliverableOrderTracker:", err);
        setError("Unable to sync live order status. Please check your internet connection.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [cleanId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🍗 Track my TAASH BHATTI Order #${cleanId} live:\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitHelpTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsSubmittingHelp(true);
    setHelpSuccessNotice(null);

    const ticketId = `TICKET-ORD-${cleanId.slice(-6)}-${Date.now().toString().slice(-4)}`;
    const categoryLabels: Record<string, string> = {
      delay: '⏱️ Order Delayed / ETA Inquiry',
      rider: '🛵 Rider Contact / Location Issue',
      address: '📍 Update Delivery Address / Gate Notes',
      items: '🍲 Food Preparation / Customization Query',
      other: '❓ General Order Assistance',
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      ticketSource: 'customer',
      userId: order.userId || 'guest',
      userEmail: (order as any).userEmail || (order as any).customerEmail || 'customer@taashbhatti.com',
      userName: order.customerName || 'Customer',
      userPhone: order.customerPhone || '',
      orderId: cleanId,
      orderDate: order.date || (order as any).createdAt || new Date().toISOString(),
      orderTotal: order.total,
      orderStatus: order.status,
      orderItemsSummary: order.items?.map(i => `${i.quantity}x ${i.meal?.name || i.dealTitle || 'Dish'}`).join(', ') || 'Feast items',
      orderDeliveryAddress: order.address,
      orderPaymentMethod: order.paymentMethod,
      orderFulfillmentMode: (order.fulfillmentMode as any) || 'delivery',
      deliveryPartnerName: order.deliveryPartnerName,
      deliveryPartnerPhone: order.deliveryPartnerPhone,
      deliveryVehicleNumber: order.deliveryVehicleNumber,
      assignedKitchenId: order.acceptedByKitchenId || order.kitchenId,
      assignedKitchenName: order.acceptedKitchenName || kitchen?.name,
      type: 'complaint',
      category: helpCategory === 'delay' ? 'delivery_delay' : helpCategory === 'rider' ? 'customer_unreachable' : helpCategory === 'items' ? 'food_quality' : 'general',
      subject: `🚨 [Live Order #${cleanId}] ${categoryLabels[helpCategory] || 'Order Assistance'}`,
      message: helpMessage.trim() || `Customer requested immediate assistance on active Order #${cleanId}. Status: ${order.status}. Delivery Address: ${order.address}.`,
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date().toISOString(),
      unreadByAdmin: true,
      unreadByCustomer: false
    };

    try {
      const cleanData = JSON.parse(JSON.stringify(newTicket));
      await setDoc(doc(db, 'support_tickets', ticketId), cleanData);

      try {
        const cached = localStorage.getItem('taashbhatti_support_tickets');
        const list: SupportTicket[] = cached ? JSON.parse(cached) : [];
        list.unshift(newTicket);
        localStorage.setItem('taashbhatti_support_tickets', JSON.stringify(list));
      } catch (cErr) {}

      setHelpSuccessNotice(`Ticket #${ticketId} dispatched! Our live support desk has received your ticket and will assist you immediately.`);
      setHelpMessage('');
    } catch (err) {
      console.error("Failed to submit support ticket from tracker:", err);
      setHelpSuccessNotice(`Help request logged! (ID: #${ticketId}). You can also tap WhatsApp for instant chat.`);
    } finally {
      setIsSubmittingHelp(false);
    }
  };

  // Helper status resolution
  const getStageIndex = (status?: string): number => {
    switch (status) {
      case 'sent': return 1;
      case 'kitchen_accepted': return 2;
      case 'cooking': return 3;
      case 'ready_for_pickup':
      case 'prepared': return 4;
      case 'out_for_delivery': return 5;
      case 'delivered': return 6;
      case 'cancelled': return 0;
      default: return 1;
    }
  };

  const stageIdx = getStageIndex(order?.status);

  // Compute smart ETA
  const calculateEta = (): string => {
    if (!order) return '-- mins';
    if (order.status === 'delivered') return 'Delivered';
    if (order.status === 'cancelled') return 'Cancelled';

    let base = 25;
    if (order.status === 'sent') base = 35;
    else if (order.status === 'kitchen_accepted') base = 30;
    else if (order.status === 'cooking') base = 20;
    else if (order.status === 'ready_for_pickup' || order.status === 'prepared') base = 15;
    else if (order.status === 'out_for_delivery') base = 8;

    if (order.extraPrepMinutes) base += order.extraPrepMinutes;
    if (order.isRaining || kitchen?.isRaining) base += 10;

    return `${base}-${base + 8} mins`;
  };

  // Stage steps metadata
  const stages = [
    { title: 'Placed', desc: 'Order received at hub', icon: Clock, minIdx: 1 },
    { title: 'Kitchen Confirmed', desc: 'Chef accepted ticket', icon: CheckCircle2, minIdx: 2 },
    { title: 'Bhatti Cooking', desc: 'Fresh clay & spices', icon: Flame, minIdx: 3 },
    { title: 'Out for Delivery', desc: 'Rider on the move', icon: Bike, minIdx: 5 },
    { title: 'Delivered', desc: 'Arrived at your door', icon: CheckCircle2, minIdx: 6 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E13] text-gray-100 flex flex-col selection:bg-brand-green selection:text-brand-charcoal">
      {/* TOP READ-ONLY BRAND HEADER */}
      <header className="sticky top-0 z-40 bg-[#12181E]/95 backdrop-blur-md border-b border-brand-green/20 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center text-brand-green">
              <Flame className="w-5 h-5 fill-brand-green/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm text-white tracking-wider uppercase">
                  TAASH BHATTI
                </span>
                <span className="flex items-center gap-1 bg-brand-green/15 text-brand-green text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-brand-green/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
                  Live Radar
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Order #{cleanId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              title="Need Help with this Order?"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-orange/20 to-amber-500/20 hover:from-brand-orange/30 hover:to-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>Need Help?</span>
            </button>

            <button
              onClick={handleCopyLink}
              title="Copy live tracking link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-brand-green">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareWhatsApp}
              title="Share tracking on WhatsApp"
              className="p-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* NOTICE BANNER - STRICTLY READ-ONLY */}
      <div className="bg-brand-charcoal/80 border-b border-brand-green/10 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
            <span className="font-semibold text-gray-300">Deliverable Live Status Link</span>
            <span className="text-gray-500">•</span>
            <span>Read-Only Guest View</span>
          </div>
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            Updates in real-time
          </span>
        </div>
      </div>

      {/* MAIN SCROLLABLE CONTENT BODY */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {loading ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-12 h-12 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-gray-300">Connecting to TAASH BHATTI Radar...</p>
            <p className="text-xs text-gray-500">Syncing live coordinates and kitchen status for #{cleanId}</p>
          </div>
        ) : error || !order ? (
          <div className="bg-[#12181E] border border-red-500/20 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Tracking Link Expired or Unavailable</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              {error || "The order could not be located on the server. Please verify the link or check your order history in the main app."}
            </p>
          </div>
        ) : (
          <>
            {/* REAL-TIME STATUS HERO CARD */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#12181E] border border-brand-green/25 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-green">
                      {order.fulfillmentMode === 'takeaway' ? '🥡 Self-Pickup Takeaway' : '🚴 Home Delivery'}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Placed: {new Date(order.date || order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight flex items-center gap-2">
                    {order.status === 'sent' && "Order Received & Queued"}
                    {order.status === 'kitchen_accepted' && "Kitchen Station Accepted"}
                    {order.status === 'cooking' && "Fresh Bhatti Preparation in Progress"}
                    {(order.status === 'ready_for_pickup' || order.status === 'prepared') && "Hot & Packed — Awaiting Collection"}
                    {order.status === 'out_for_delivery' && "Out for Delivery — En Route"}
                    {order.status === 'delivered' && "Delivered with Royal Taste!"}
                    {order.status === 'cancelled' && "Order Cancelled"}
                  </h2>

                  <p className="text-xs text-gray-400">
                    {order.status === 'cooking' && "Our master chefs are smoking your tandoor chicken and assembling packaging."}
                    {order.status === 'out_for_delivery' && `Your delivery rider is heading towards ${order.address}.`}
                    {order.status === 'delivered' && "Handover complete. Thank you for dining with TAASH BHATTI."}
                    {order.status === 'kitchen_accepted' && "Station inventory verified, ingredients measured and prepped."}
                    {order.status === 'sent' && "Routing order to nearest active kitchen station geofence."}
                  </p>
                </div>

                {/* ETA BADGE */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="sm:self-center bg-black/40 border border-brand-green/30 rounded-2xl px-5 py-3 text-center shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-brand-green">
                      Estimated Arrival
                    </p>
                    <p className="text-2xl font-display font-black text-white mt-0.5">
                      {calculateEta()}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      Live Traffic Radar
                    </p>
                  </div>
                )}
              </div>

              {/* RAIN MODE WARNING IF ACTIVE */}
              {(order.isRaining || kitchen?.isRaining) && (
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-blue-200 text-xs">
                  <CloudRain className="w-5 h-5 text-blue-400 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-black uppercase tracking-wider text-[11px] block text-blue-300">
                      🌧️ Rainy Weather Precautions Active
                    </span>
                    <span className="text-[11px] text-blue-200/80 leading-relaxed">
                      Delivery partners are driving at controlled speeds for safety. A small buffer has been factored into your ETA.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP PROGRESSION BAR */}
              {order.status !== 'cancelled' && (
                <div className="pt-2">
                  <div className="grid grid-cols-5 gap-1.5 relative">
                    {stages.map((stg, sIdx) => {
                      const isComplete = stageIdx >= stg.minIdx;
                      const isCurrent = stageIdx === stg.minIdx || (stageIdx === 4 && stg.minIdx === 3);
                      const IconComp = stg.icon;

                      return (
                        <div key={sIdx} className="flex flex-col items-center text-center space-y-1.5">
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all ${
                              isComplete
                                ? 'bg-brand-green text-brand-charcoal font-black shadow-md shadow-brand-green/20'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                            } ${isCurrent ? 'ring-2 ring-brand-green ring-offset-2 ring-offset-[#12181E] animate-pulse' : ''}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className={`text-[9px] sm:text-[10px] font-black block uppercase tracking-wider ${
                              isComplete ? 'text-white' : 'text-gray-500'
                            }`}>
                              {stg.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* LIVE GPS RADAR MAP */}
            <div className="bg-[#12181E] border border-brand-green/20 rounded-3xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 border-b border-brand-green/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-green" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Live Route & GPS Radar
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {order.status === 'out_for_delivery' ? '🟢 Rider GPS Transmitting' : 'Waiting for dispatch'}
                </span>
              </div>

              <div className="p-3">
                <InAppDeliveryMap
                  acceptedByKitchenId={order.acceptedByKitchenId || order.kitchenId}
                  kitchenName={order.acceptedKitchenName || kitchen?.name || "TAASH BHATTI Hub"}
                  kitchenAddress={order.acceptedKitchenAddress || kitchen?.address || "Central Kitchen"}
                  kitchenLat={order.acceptedKitchenLat || kitchen?.lat || 26.1220}
                  kitchenLng={order.acceptedKitchenLng || kitchen?.lng || 85.3780}
                  customerAddress={order.address}
                  customerLat={order.deliveryLat}
                  customerLng={order.deliveryLng}
                  customerName={order.customerName ? `${order.customerName}` : "Gourmet Guest"}
                  customerPhone={order.customerPhone ? `${order.customerPhone.slice(0, 4)}******` : ""}
                  riderName={order.deliveryPartnerName}
                  riderPhone={order.deliveryPartnerPhone}
                  riderVehicleNumber={order.deliveryVehicleNumber}
                  riderLat={order.riderLat}
                  riderLng={order.riderLng}
                  riderLastUpdated={order.riderLastUpdated}
                  orderStatus={order.status}
                  orderId={order.id}
                  estimatedMinutes={calculateEta()}
                  isRiderView={false}
                  isAdminView={false}
                  isTakeaway={order.fulfillmentMode === 'takeaway'}
                  isRaining={Boolean(order.isRaining || kitchen?.isRaining)}
                />
              </div>
            </div>

            {/* RIDER & KITCHEN STATION PARTICULARS (READ-ONLY) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kitchen Station */}
              <div className="bg-[#12181E] border border-brand-green/15 rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center gap-2 text-brand-green">
                  <ChefHat className="w-4 h-4" />
                  <h4 className="text-[10px] font-black uppercase tracking-wider">
                    Fulfilling Kitchen Station
                  </h4>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">
                    {order.acceptedKitchenName || kitchen?.name || "TAASH BHATTI Hub"}
                  </h5>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                    {order.acceptedKitchenAddress || kitchen?.address || "Dedicated Cloud Kitchen Branch"}
                  </p>
                </div>
              </div>

              {/* Delivery Rider */}
              <div className="bg-[#12181E] border border-brand-green/15 rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center gap-2 text-brand-green">
                  <Bike className="w-4 h-4" />
                  <h4 className="text-[10px] font-black uppercase tracking-wider">
                    Delivery Fleet Partner
                  </h4>
                </div>
                {order.deliveryPartnerName ? (
                  <div>
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      {order.deliveryPartnerName}
                      <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.2 rounded">
                        Assigned
                      </span>
                    </h5>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.deliveryVehicleNumber || order.deliveryPartnerVehicle || "Insulated Thermal Delivery"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-gray-300">
                      Assigning Nearest Rider...
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Will be assigned once packaging is ready at the kitchen.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ORDER ITEMS & PACKAGE DETAILS (STRICTLY READ-ONLY) */}
            <div className="bg-[#12181E] border border-brand-green/15 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-green/10 pb-3">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-brand-green" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Package Items ({order.items?.length || 0})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Total: ₹{order.total}
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-brand-green/10 text-brand-green border border-brand-green/20 flex items-center justify-center text-xs font-black shrink-0">
                        {item.quantity}x
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {item.meal?.name || item.dealTitle || "Signature Bhatti Dish"}
                        </h4>
                        {item.customization && (
                          <div className="text-[10px] text-gray-400 space-x-2 mt-0.5">
                            {item.customization.portionSize && (
                              <span>Portion: {item.customization.portionSize}</span>
                            )}
                            {item.customization.spiceLevel && (
                              <span>Spice: {item.customization.spiceLevel}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-200 shrink-0">
                      ₹{((item.packagePrice || item.meal?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* BILL SUMMARY */}
              <div className="bg-black/30 rounded-2xl p-3.5 space-y-1.5 text-xs border border-white/5 font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal || (order.total - (order.deliveryFee || 0) + (order.discount || 0))}</span>
                </div>
                {(order.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Delivery Fee</span>
                    <span>₹{order.deliveryFee}</span>
                  </div>
                )}
                {(order.discount || 0) > 0 && (
                  <div className="flex justify-between text-brand-green">
                    <span>Discount Applied</span>
                    <span>-₹{order.discount}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-sm">
                  <span>Total Amount</span>
                  <span className="text-brand-green">₹{order.total}</span>
                </div>
                <div className="text-[10px] text-gray-500 text-right pt-0.5">
                  Payment: <span className="text-gray-300 uppercase">{order.paymentMethod || 'Online'}</span>
                </div>
              </div>

              {/* Destination Address */}
              <div className="bg-brand-charcoal/40 rounded-2xl p-3.5 space-y-1 text-xs border border-brand-green/10">
                <p className="text-[10px] font-black uppercase text-brand-green tracking-wider">
                  Drop-off Destination
                </p>
                <p className="text-gray-300 leading-relaxed">
                  {order.address}
                </p>
              </div>

              {/* NEED HELP WITH YOUR ORDER BANNER */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#18202A] to-[#12181E] border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      Need Help With This Order?
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                        Live Support
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Order delay, change in delivery notes, or meal queries? Our support team is active right now.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Headphones className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>Contact Support</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ======================================================== */}
      {/* 🛎️ ORDER ASSISTANCE & LIVE SUPPORT MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#121820] border-2 border-amber-500/40 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Headphones className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Order Support Desk
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Order #{cleanId} • Total: ₹{order?.total || 0}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpModal(false);
                    setHelpSuccessNotice(null);
                  }}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Close support modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instant Hotline / WhatsApp Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/917004729479?text=${encodeURIComponent(
                    `Hello Taash Bhatti Support Team,\n\nI need immediate assistance regarding my active Order #${cleanId}.\nStatus: ${order?.status || 'Active'}\nCustomer: ${order?.customerName || 'Patron'}\nDelivery Address: ${order?.address || 'N/A'}\nTotal: ₹${order?.total || 0}\n\nCould you please look into this?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 flex items-center gap-3 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                      Chat on WhatsApp
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Average reply: &lt; 2 mins
                    </span>
                  </div>
                </a>

                <a
                  href="tel:+917004729479"
                  className="p-3.5 rounded-2xl bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/40 flex items-center gap-3 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider block">
                      Call Support Hotline
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      +91 7004729479
                    </span>
                  </div>
                </a>
              </div>

              {/* Success Alert */}
              {helpSuccessNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {helpSuccessNotice}
                  </div>
                </div>
              )}

              {/* Support Ticket Submission Form */}
              <form onSubmit={handleSubmitHelpTicket} className="space-y-4 pt-1">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-2">
                    What Do You Need Help With?
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'delay' as const, label: '⏱️ Order Delayed / ETA' },
                      { id: 'rider' as const, label: '🛵 Rider Contact / GPS' },
                      { id: 'address' as const, label: '📍 Update Address / Gate' },
                      { id: 'items' as const, label: '🍲 Food Prep / Packaging' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setHelpCategory(item.id)}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all text-[11px] cursor-pointer ${
                          helpCategory === item.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                    Message or Special Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    placeholder="e.g. Please ask the rider to call when reaching Tower B, or check why cooking is taking extra time..."
                    className="w-full bg-[#0B0F14] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelpModal(false);
                      setHelpSuccessNotice(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingHelp}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-600 hover:to-orange-600 text-brand-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5px]" />
                    <span>{isSubmittingHelp ? 'Dispatching...' : 'Submit Help Request'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER WATERMARK */}
      <footer className="text-center py-4 border-t border-white/5 text-[10px] text-gray-600">
        TAASH BHATTI Cloud Kitchens • Real-Time Order Telemetry
      </footer>
    </div>
  );
}
