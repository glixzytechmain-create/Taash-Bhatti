import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headphones,
  MessageSquare,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Send,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck,
  Building2,
  MapPin,
  Eye,
  Star,
  Sparkles,
  ShoppingBag,
  Share2,
  Copy,
  ChevronRight,
  ArrowLeft,
  Check,
  Zap,
  Tag
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth, syncPartnerToFirebaseAuth } from '../lib/firebase';
import { SupportTicket, SupportAgent, Kitchen, Order } from '../types';

function handleFirestoreError(error: unknown, path: string) {
  console.error(`Firestore error at ${path}:`, error);
}

interface CustomerSupportPortalProps {
  onExitGateway: () => void;
  allKitchens: Kitchen[];
  allOrders: Order[];
}

const INITIAL_SUPPORT_AGENTS: SupportAgent[] = [
  {
    id: 'AGENT-OVERALL-01',
    name: 'Priya Sharma',
    email: 'priya.support@taashbhatti.com',
    phone: '+91 98765 43210',
    role: 'overall',
    password: 'agent',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'AGENT-DELIVERY-GLOBAL',
    name: 'Rohan Verma (Delivery Lead)',
    email: 'rohan.rider@taashbhatti.com',
    phone: '+91 98765 11223',
    role: 'delivery_support_global',
    password: 'agent',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'AGENT-CITY-MUZ',
    name: 'Amit Kumar (Muzaffarpur)',
    email: 'amit.muz@taashbhatti.com',
    phone: '+91 98765 55443',
    role: 'delivery_support_city',
    assignedCity: 'Muzaffarpur',
    password: 'agent',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export function CustomerSupportPortal({
  onExitGateway,
  allKitchens,
  allOrders
}: CustomerSupportPortalProps) {
  // Support Agents collection state synced with Firestore & local cache
  const [agents, setAgents] = useState<SupportAgent[]>(() => {
    const cached = localStorage.getItem('fitzaika_support_agents');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_SUPPORT_AGENTS;
  });

  // Active Support Agent Session
  const [activeAgent, setActiveAgent] = useState<SupportAgent | null>(() => {
    const cachedSession = localStorage.getItem('fitzaika_active_support_agent_session');
    if (cachedSession) {
      try {
        return JSON.parse(cachedSession);
      } catch (e) {}
    }
    return null;
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tickets state synced from Firestore
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Filters & Selected Ticket
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterSource, setFilterSource] = useState<'all' | 'customer' | 'delivery_partner'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'closed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Reply Form State inside selected ticket modal/view
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'pending' | 'under_review' | 'resolved' | 'closed'>('resolved');
  const [replyPriority, setReplyPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Sync support_agents from Firestore with seed fallback
  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, 'support_agents'), (snapshot) => {
      const loaded: SupportAgent[] = [];
      snapshot.forEach(docSnap => {
        loaded.push(docSnap.data() as SupportAgent);
      });
      setAgents(loaded);
      localStorage.setItem('fitzaika_support_agents', JSON.stringify(loaded));
    }, (err) => {
      console.warn("Firestore support_agents snapshot listener offline mode.", err);
    });

    return () => unsubAgents();
  }, []);

  // 2. Sync support_tickets from Firestore
  useEffect(() => {
    setIsLoadingTickets(true);
    const unsubTickets = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      const loaded: SupportTicket[] = [];
      snapshot.forEach(docSnap => {
        loaded.push(docSnap.data() as SupportTicket);
      });
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(loaded);
      setIsLoadingTickets(false);
    }, (err) => {
      console.warn("Firestore support_tickets listener error:", err);
      setIsLoadingTickets(false);
    });

    return () => unsubTickets();
  }, []);

  // Sync activeAgent state updates if agent modified
  useEffect(() => {
    if (activeAgent) {
      localStorage.setItem('fitzaika_active_support_agent_session', JSON.stringify(activeAgent));
    } else {
      localStorage.removeItem('fitzaika_active_support_agent_session');
    }
  }, [activeAgent]);

  // Handle Support Agent Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const emailClean = loginEmail.trim().toLowerCase();
    const passClean = loginPassword.trim();

    // Match against support agents registry
    const matched = agents.find(ag => ag.email.toLowerCase() === emailClean && ag.password === passClean);

    if (matched) {
      if (matched.status === 'inactive' || matched.banned) {
        setLoginError("This support account is deactivated or restricted. Please contact Administrator.");
        setIsLoggingIn(false);
        return;
      }
      setActiveAgent(matched);
      setIsLoggingIn(false);
      showToast(`Welcome back, ${matched.name}! Desk access granted.`);
    } else {
      setLoginError("Invalid support credentials. Please check email & passcode.");
      setIsLoggingIn(false);
    }
  };

  // Quick Demo Login Handler
  const handleQuickDemoLogin = (agent: SupportAgent) => {
    setActiveAgent(agent);
    showToast(`Logged in as ${agent.name} (${agent.role.toUpperCase()} SCOPE)`);
  };

  // Handle Logout
  const handleLogout = () => {
    setActiveAgent(null);
    setSelectedTicket(null);
  };

  // Filter tickets based on activeAgent role scope!
  const scopedTickets = useMemo(() => {
    if (!activeAgent) return [];

    return tickets.filter((ticket) => {
      // 1. Role Scope Filter
      if (activeAgent.role === 'delivery_support_global') {
        // Dedicated Global Delivery Support Agent: handles delivery partner complaints
        if (ticket.ticketSource !== 'delivery_partner') return false;
      } else if (activeAgent.role === 'delivery_support_city' && activeAgent.assignedCity) {
        // Dedicated City-specific Delivery Support Agent
        if (ticket.ticketSource !== 'delivery_partner') return false;
        const cityTerm = activeAgent.assignedCity.toLowerCase();
        const ticketCity = (ticket.deliveryCity || ticket.assignedCity || '').toLowerCase();
        if (!ticketCity.includes(cityTerm)) return false;
      } else if (activeAgent.role === 'kitchen' && activeAgent.assignedKitchenId) {
        // Match ticket if order belongs to assigned kitchen or ticket assignedKitchenId matches
        const ticketKitchenId = ticket.assignedKitchenId;
        const relatedOrder = allOrders.find(o => o.id === ticket.orderId);
        const orderMatches = relatedOrder && (relatedOrder.kitchenId === activeAgent.assignedKitchenId || relatedOrder.acceptedByKitchenId === activeAgent.assignedKitchenId);
        const directKitchenMatches = ticketKitchenId === activeAgent.assignedKitchenId;
        if (!orderMatches && !directKitchenMatches) return false;
      } else if (activeAgent.role === 'city' && activeAgent.assignedCity) {
        // Match ticket if user's address/city or related order city or ticket city matches assignedCity
        const cityTerm = activeAgent.assignedCity.toLowerCase();
        const ticketCity = (ticket.deliveryCity || ticket.assignedCity || '').toLowerCase();
        const relatedOrder = allOrders.find(o => o.id === ticket.orderId);
        const orderCity = (relatedOrder ? ((relatedOrder as any).city || relatedOrder.address || '') : '').toLowerCase();
        if (!ticketCity.includes(cityTerm) && !orderCity.includes(cityTerm)) return false;
      }

      // 2. Source Filter (Customer vs Delivery Partner vs All)
      if (filterSource !== 'all') {
        if (filterSource === 'delivery_partner' && ticket.ticketSource !== 'delivery_partner') return false;
        if (filterSource === 'customer' && ticket.ticketSource === 'delivery_partner') return false;
      }

      // 3. Status Filter
      if (filterStatus !== 'all' && ticket.status !== filterStatus) {
        return false;
      }

      // 4. Priority Filter
      if (filterPriority !== 'all' && ticket.priority !== filterPriority) {
        return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ticket.userName?.toLowerCase().includes(q) || ticket.deliveryPartnerName?.toLowerCase().includes(q);
        const matchesEmail = ticket.userEmail?.toLowerCase().includes(q);
        const matchesPhone = ticket.userPhone?.toLowerCase().includes(q) || ticket.deliveryPartnerPhone?.toLowerCase().includes(q);
        const matchesSubject = ticket.subject?.toLowerCase().includes(q);
        const matchesMsg = ticket.message?.toLowerCase().includes(q);
        const matchesOrderId = ticket.orderId?.toLowerCase().includes(q);
        const matchesTicketId = ticket.id?.toLowerCase().includes(q);
        const matchesRiderVehicle = ticket.deliveryVehicleNumber?.toLowerCase().includes(q) || ticket.deliveryPartnerVehicle?.toLowerCase().includes(q);
        const matchesItems = ticket.orderItemsSummary?.toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesSubject && !matchesMsg && !matchesOrderId && !matchesTicketId && !matchesRiderVehicle && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, activeAgent, filterSource, filterStatus, filterPriority, searchQuery, allOrders]);

  // Ticket stats calculations
  const totalAssignedCount = scopedTickets.length;
  const pendingCount = scopedTickets.filter(t => t.status === 'pending').length;
  const reviewCount = scopedTickets.filter(t => t.status === 'under_review').length;
  const resolvedCount = scopedTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const urgentCount = scopedTickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;

  // Open ticket detail inspector
  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setReplyStatus(ticket.status || 'resolved');
    setReplyPriority(ticket.priority || 'medium');
    setInternalNoteText('');
  };

  // Submit Support Reply to Customer & update Ticket Status
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !activeAgent) return;
    if (!replyText.trim()) {
      alert("Please enter a reply message for the customer.");
      return;
    }

    setIsSubmittingReply(true);

    const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
    const nowIso = new Date().toISOString();

    const updatedData: Partial<SupportTicket> = {
      adminReply: replyText.trim(),
      adminRepliedAt: nowIso,
      adminName: `${activeAgent.name} (${activeAgent.role.toUpperCase()})`,
      status: replyStatus,
      priority: replyPriority,
      updatedAt: nowIso,
      unreadByCustomer: true,
      unreadByAdmin: false
    };

    try {
      await updateDoc(ticketRef, updatedData);

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...updatedData } : t));
      setSelectedTicket(prev => prev ? { ...prev, ...updatedData } : null);

      showToast("✅ Support reply saved & delivered to customer mailbox!");
      setIsSubmittingReply(false);
    } catch (err) {
      console.error("Error updating support ticket:", err);
      showToast("⚠️ Local update applied (Firestore sync queued).");
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...updatedData } : t));
      setIsSubmittingReply(false);
      handleFirestoreError(err, `support_tickets/${selectedTicket.id}`);
    }
  };

  // RENDER 1: LOGIN SCREEN IF NOT AUTHENTICATED
  if (!activeAgent) {
    return (
      <div className="min-h-screen bg-[#0A0E12] text-white flex flex-col justify-between p-4 sm:p-8 font-sans relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar */}
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 z-10 border-b border-brand-green/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange text-brand-charcoal rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
              <Headphones className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                TAASH BHATTI <span className="text-brand-orange">SUPPORT DESK</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono">Customer Care & Resolution Control Console</p>
            </div>
          </div>

          <button
            onClick={onExitGateway}
            className="bg-brand-charcoal/80 hover:bg-brand-charcoal text-gray-300 border border-brand-green/20 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-brand-orange" />
            Return to App
          </button>
        </div>

        {/* Login Center Card */}
        <div className="max-w-md w-full mx-auto my-auto py-8 z-10 space-y-6 text-left">
          <div className="bg-[#10151B] border border-brand-green/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-[9px] font-mono font-black bg-brand-green/15 text-brand-green border border-brand-green/30 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                SECURE AUTHENTICATION GATEWAY
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                Agent Login Portal
              </h2>
              <p className="text-xs text-gray-400">
                Sign in with your assigned Support Agent credentials to manage customer queries and resolution tickets.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-950/80 border border-red-900/50 p-3.5 rounded-2xl text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Agent Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. support.overall@fitzaika.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Agent Security Passcode
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter security passcode"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-brand-orange hover:bg-brand-orange/95 text-brand-charcoal font-black text-xs py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying Tokens...
                  </>
                ) : (
                  <>
                    <Headphones className="w-4 h-4 stroke-[2.5px]" />
                    Access Support Console
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Agent Selector for Easy Testing */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase block tracking-wider text-center">
                ⚡ Quick Demo Agent Access (Select Role):
              </span>
              <div className="grid grid-cols-1 gap-2">
                {agents.map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => handleQuickDemoLogin(ag)}
                    className="w-full bg-brand-charcoal/60 hover:bg-brand-charcoal border border-brand-green/15 p-2.5 rounded-xl flex items-center justify-between text-left transition-all hover:border-brand-orange/40 cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-brand-orange transition-colors">
                          {ag.name}
                        </span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          ag.role === 'overall' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          ag.role === 'kitchen' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}>
                          {ag.role === 'overall' ? '🌐 Overall' : ag.role === 'kitchen' ? '🏬 Kitchen' : '🏙️ City'}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                        {ag.role === 'kitchen' ? (ag.assignedKitchenName || 'Assigned Kitchen') : ag.role === 'city' ? `City: ${ag.assignedCity}` : 'Global Access'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-5xl mx-auto w-full py-4 text-center text-[10px] text-gray-600 font-mono border-t border-white/5 z-10">
          TAASH BHATTI Customer Support Portal & Real-time Desk Engine • Powered by Cloud Firestore
        </div>
      </div>
    );
  }

  // RENDER 2: MAIN SUPPORT DESK CONSOLE FOR AUTHENTICATED AGENT
  return (
    <div className="min-h-screen bg-[#0A0E12] text-white flex flex-col font-sans relative overflow-x-hidden text-left">
      {/* Toast Bar */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-brand-charcoal text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-brand-orange/40 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* TOP AGENT NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#0F1419]/90 backdrop-blur-md border-b border-brand-green/15 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-orange text-brand-charcoal rounded-xl flex items-center justify-center font-black text-lg shadow-md shrink-0">
            <Headphones className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                TAASH BHATTI Customer Support Desk
              </h1>
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                activeAgent.role === 'overall' ? 'bg-purple-950 text-purple-300 border border-purple-800/80' :
                activeAgent.role === 'kitchen' ? 'bg-amber-950 text-amber-300 border border-amber-800/80' :
                'bg-sky-950 text-sky-300 border border-sky-800/80'
              }`}>
                {activeAgent.role === 'overall' ? '🌐 Overall Access' :
                 activeAgent.role === 'kitchen' ? `🏬 Kitchen (${activeAgent.assignedKitchenName || 'Assigned'})` :
                 `🏙️ City (${activeAgent.assignedCity || 'Assigned'})`}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Agent: <strong className="text-white">{activeAgent.name}</strong> • Email: <span className="text-brand-orange">{activeAgent.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            onClick={handleLogout}
            className="bg-brand-charcoal/80 hover:bg-brand-charcoal text-gray-300 border border-brand-green/20 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Agent Sign Out
          </button>
          
          <button
            onClick={onExitGateway}
            className="bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3px]" />
            Exit Portal
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* SCOPE STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-[#10151B] border border-brand-green/15 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Total In Scope</span>
              <MessageSquare className="w-4 h-4 text-brand-green" />
            </div>
            <div className="text-xl font-mono font-black text-white mt-1">
              {totalAssignedCount} Tickets
            </div>
          </div>

          <div className="bg-[#10151B] border border-amber-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="text-xl font-mono font-black text-amber-300 mt-1">
              {pendingCount + reviewCount}
            </div>
          </div>

          <div className="bg-[#10151B] border border-red-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-red-400">Urgent Tickets</span>
              <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
            </div>
            <div className="text-xl font-mono font-black text-red-400 mt-1">
              {urgentCount}
            </div>
          </div>

          <div className="bg-[#10151B] border border-emerald-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Resolved / Closed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-mono font-black text-emerald-400 mt-1">
              {resolvedCount}
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-[#10151B] border border-brand-green/15 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, order ID, ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* Filter by Ticket Source */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="bg-[#0A0E12] border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-brand-green/50 cursor-pointer"
            >
              <option value="all">Origin: All</option>
              <option value="customer">👤 Customer Tickets</option>
              <option value="delivery_partner">🛵 Delivery Partner Complaints</option>
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-[#0A0E12] border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-brand-green/50 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Filter by Priority */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-[#0A0E12] border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-brand-green/50 cursor-pointer"
            >
              <option value="all">Priority: All</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>

        {/* URGENT CUSTOMER CALL REQUESTS (LIVE DISPATCH DESK) */}
        {scopedTickets.filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed').length > 0 && (
          <div className="bg-red-950/40 border-2 border-red-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-red-400 animate-pulse" />
                  Urgent Customer Call Requests ({scopedTickets.filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed').length})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-500/40 font-mono">
                Urgent Priority
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scopedTickets
                .filter(t => t.isCallRequest && t.callStatus !== 'completed' && t.status !== 'resolved' && t.status !== 'closed')
                .map((call) => (
                  <div
                    key={call.id}
                    className="bg-[#10151B] border border-red-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-red-500/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-brand-orange" />
                            <span>{call.userName || 'Customer'}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ID: {call.userId ? call.userId.slice(-8) : 'guest'}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="p-2.5 bg-red-950/30 border border-red-500/20 rounded-lg">
                        <span className="text-[9px] uppercase font-bold text-red-400 block tracking-wider mb-0.5">
                          Reason Regarding Call:
                        </span>
                        <p className="text-xs text-red-100 font-medium leading-snug">
                          {call.callRequestReason || call.subject}
                        </p>
                      </div>

                      <div className="text-[10px] text-gray-400 space-y-0.5 font-mono">
                        {call.userEmail && <div>Email: {call.userEmail}</div>}
                        {call.orderId && <div>Order: #{call.orderId}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                      {call.userPhone ? (
                        <a
                          href={`tel:${call.userPhone}`}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call {call.userPhone}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic py-1">No phone on file</span>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'support_tickets', call.id), {
                              callStatus: 'completed',
                              status: 'resolved',
                              resolvedAt: new Date().toISOString(),
                              resolvedByAgentName: activeAgent?.name || 'Support Agent'
                            });
                          } catch (err) {
                            console.error('Error resolving call request:', err);
                          }
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Mark Call Completed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resolved</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TICKET WORKSPACE: LIST & DETAIL PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: TICKET LIST */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-brand-orange" />
                Assigned Support Tickets ({scopedTickets.length})
              </h3>
              {isLoadingTickets && (
                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-green" /> Syncing...
                </span>
              )}
            </div>

            {scopedTickets.length === 0 ? (
              <div className="bg-[#10151B] border border-dashed border-brand-green/10 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mx-auto text-brand-green">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-gray-200">No Tickets Found</h4>
                  <p className="text-[10px] text-gray-500">
                    No support tickets match your current filters or scope ({activeAgent.role.toUpperCase()}).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin">
                {scopedTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const relatedOrder = allOrders.find(o => o.id === t.orderId);

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-left relative ${
                        isSelected
                          ? 'bg-brand-charcoal border-brand-orange shadow-lg'
                          : 'bg-[#10151B] border-brand-green/15 hover:border-brand-green/35 hover:bg-[#12181F]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.ticketSource === 'delivery_partner' && (
                              <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🛵 Delivery Partner
                              </span>
                            )}
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                              t.priority === 'urgent' ? 'bg-red-950 text-red-300 border border-red-800' :
                              t.priority === 'high' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              t.priority === 'medium' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                              'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {t.priority}
                            </span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                              t.status === 'pending' ? 'bg-amber-950/80 text-amber-400 border border-amber-900/50' :
                              t.status === 'under_review' ? 'bg-sky-950/80 text-sky-400 border border-sky-900/50' :
                              t.status === 'resolved' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50' :
                              'bg-gray-800 text-gray-400'
                            }`}>
                              {t.status.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-gray-400">
                              #{t.id}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-white line-clamp-1 mt-1">
                            {t.subject}
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 line-clamp-2">
                        {t.message}
                      </p>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-400 gap-1 flex-wrap">
                        <span className="text-brand-orange font-bold truncate max-w-[140px]">
                          👤 {t.userName}
                        </span>
                        <div className="flex items-center gap-1">
                          {t.deliveryPartnerName && (
                            <span className="text-amber-300 bg-amber-950/70 border border-amber-800/80 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              🛵 {t.deliveryPartnerName}
                            </span>
                          )}
                          {t.orderId && (
                            <span className="text-gray-300 bg-black/50 px-2 py-0.5 rounded border border-white/10 text-[9px]">
                              #{t.orderId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: SELECTED TICKET DETAILED INSPECTOR & INTERACTIVE RESOLUTION PANEL */}
          <div className="lg:col-span-7">
            {!selectedTicket ? (
              <div className="bg-[#10151B] border border-brand-green/15 rounded-3xl p-12 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center mx-auto text-brand-orange">
                  <Eye className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Select a Support Ticket</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Click on any support ticket from the list on the left to inspect customer details, order history, delivered rider details, and send official resolution replies.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#10151B] border border-brand-green/20 rounded-3xl p-6 shadow-2xl space-y-6 text-left">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-green/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-black text-brand-orange uppercase">
                        TICKET #{selectedTicket.id}
                      </span>
                      <span className="text-[9px] text-gray-500">•</span>
                      <span className="text-[9px] font-mono text-gray-400">
                        Submitted {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                      {selectedTicket.rating && (
                        <span className="text-[9px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-full">
                          ⭐ {selectedTicket.rating}/5 RATING
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-black text-white mt-0.5">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Profile Contact & Quick Action Bar */}
                <div className="bg-brand-charcoal/60 border border-brand-green/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                      {selectedTicket.ticketSource === 'delivery_partner' ? '🛵 Delivery Partner Profile' : 'Customer Profile'}
                    </span>
                    <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                      <User className="w-3.5 h-3.5 text-brand-orange" />
                      {selectedTicket.userName}
                      {selectedTicket.deliveryCity && (
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                          📍 {selectedTicket.deliveryCity}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-gray-400">
                      Email: <span className="text-brand-green">{selectedTicket.userEmail}</span>
                      {selectedTicket.userPhone && (
                        <> • Phone: <span className="text-white">{selectedTicket.userPhone}</span></>
                      )}
                    </p>
                  </div>

                  {/* Direct Contact Customer Buttons */}
                  {selectedTicket.userPhone && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${selectedTicket.userPhone}`}
                        className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase transition-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Customer
                      </a>
                      <a
                        href={`https://wa.me/${selectedTicket.userPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedTicket.userName}, this is ${activeAgent.name} from TAASH BHATTI Care Support regarding Ticket #${selectedTicket.id}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/40 text-brand-green font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-brand-green" /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {/* Ticket Message Body */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                    {selectedTicket.ticketSource === 'delivery_partner' ? 'Rider Issue / Statement' : 'Customer Issue Message'}
                  </span>
                  <div className="bg-[#0A0E12] border border-brand-green/15 p-4 rounded-2xl text-xs text-gray-200 leading-relaxed font-sans">
                    {selectedTicket.message}
                  </div>
                  {selectedTicket.imageUrl && (
                    <div className="mt-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Attached Photo:</span>
                      <img
                        src={selectedTicket.imageUrl}
                        alt="Support Ticket Attachment"
                        className="w-full max-h-60 object-cover rounded-xl border border-brand-green/20"
                      />
                    </div>
                  )}
                </div>

                {/* DELIVERED RIDER & LOGISTICS DOSSIER (Highlighted for Support Team) */}
                {(() => {
                  const linkedOrder = selectedTicket.orderId ? allOrders.find(o => o.id === selectedTicket.orderId) : undefined;
                  const riderName = selectedTicket.deliveryPartnerName || linkedOrder?.deliveryPartnerName || (linkedOrder as any)?.assignedRiderName;
                  const riderPhone = selectedTicket.deliveryPartnerPhone || linkedOrder?.deliveryPartnerPhone || (linkedOrder as any)?.assignedRiderPhone;
                  const riderVehicle = selectedTicket.deliveryPartnerVehicle || (linkedOrder as any)?.deliveryPartnerVehicle || (linkedOrder as any)?.assignedRiderVehicle || (selectedTicket.deliveryVehicleNumber ? 'Motorbike' : undefined);
                  const vehicleNum = selectedTicket.deliveryVehicleNumber || (linkedOrder as any)?.deliveryVehicleNumber || (linkedOrder as any)?.assignedRiderVehicleNumber;
                  const deliveredAt = selectedTicket.deliveredAt || (linkedOrder as any)?.deliveredAt;
                  const kitchenName = selectedTicket.assignedKitchenName || linkedOrder?.acceptedKitchenName || linkedOrder?.kitchenName || 'Central Kitchen Hub';

                  if (!riderName && !vehicleNum && !riderPhone && !selectedTicket.orderId) return null;

                  return (
                    <div className="bg-amber-950/30 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                            🛵
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                            Delivered Rider Logistics Dossier
                          </span>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-amber-400 text-black px-2 py-0.5 rounded-full">
                          Verified Delivery Partner
                        </span>
                      </div>

                      {riderName ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase font-mono block">Rider Name & Vehicle</span>
                            <div className="text-white font-black text-sm flex items-center gap-2">
                              {riderName}
                              {vehicleNum && (
                                <span className="text-[10px] font-mono font-bold bg-black text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                                  {vehicleNum}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-300 font-mono">
                              Vehicle: <strong className="text-amber-200">{riderVehicle || 'Motorbike'}</strong>
                              {selectedTicket.deliveryPartnerId && (
                                <span className="text-gray-500"> • ID: {selectedTicket.deliveryPartnerId}</span>
                              )}
                            </p>
                          </div>

                          <div className="space-y-1 sm:text-right">
                            <span className="text-[10px] text-gray-400 uppercase font-mono block">Dispatch & Transit Hub</span>
                            <p className="text-xs text-white font-bold">{kitchenName}</p>
                            {deliveredAt && (
                              <p className="text-[10px] font-mono text-emerald-400">Delivered At: {deliveredAt}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-300">
                          Dispatched from <strong className="text-white">{kitchenName}</strong>. Rider details logged to order system.
                        </div>
                      )}

                      {/* Direct Rider Communication Action Buttons for Support Agent */}
                      {riderPhone && (
                        <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-amber-300">
                            📞 Rider Contact: <strong className="text-white">{riderPhone}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${riderPhone}`}
                              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 transition-all"
                            >
                              <Phone className="w-3 h-3" /> Call Rider
                            </a>
                            <a
                              href={`https://wa.me/${riderPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${riderName || 'Rider'}, this is ${activeAgent.name} from TAASH BHATTI Support Team inquiring regarding Order #${selectedTicket.orderId || ''}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-brand-green/30 hover:bg-brand-green/40 border border-brand-green text-brand-green font-black text-[10px] px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 transition-all"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp Rider
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Associated Order Card */}
                {(selectedTicket.orderId || selectedTicket.orderItemsSummary) && (() => {
                  const linkedOrder = selectedTicket.orderId ? allOrders.find(o => o.id === selectedTicket.orderId) : undefined;
                  const total = selectedTicket.orderTotal || linkedOrder?.total || linkedOrder?.subtotal;
                  const date = selectedTicket.orderDate || linkedOrder?.date;
                  const status = selectedTicket.orderStatus || linkedOrder?.status || 'dispatched';
                  const address = selectedTicket.orderDeliveryAddress || linkedOrder?.address;
                  const itemsText = selectedTicket.orderItemsSummary || (linkedOrder?.items.map(i => `${i.quantity}x ${i.meal.name}`).join(', '));
                  const payment = selectedTicket.orderPaymentMethod || linkedOrder?.paymentMethod;

                  return (
                    <div className="bg-brand-charcoal/40 border border-brand-green/20 p-4 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b border-brand-green/10 pb-2">
                        <span className="font-black text-brand-green uppercase text-[10px] flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" /> Attached Order Details {selectedTicket.orderId ? `(#${selectedTicket.orderId})` : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {date && <span className="text-[10px] font-mono text-gray-400">{date}</span>}
                          <span className="font-mono text-[10px] text-emerald-400 font-black uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900">
                            {status}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-gray-300">
                        {total && <div>Total Value: <strong className="text-white">₹{total}</strong></div>}
                        {payment && <div>Payment: <strong className="text-brand-orange uppercase">{payment}</strong></div>}
                        {address && <div className="sm:col-span-2">Delivery Address: <span className="text-gray-300">{address}</span></div>}
                        {itemsText && <div className="sm:col-span-2">Meals Package: <span className="text-white font-bold">{itemsText}</span></div>}
                      </div>

                      {/* Feedback rating tags if customer left any */}
                      {selectedTicket.orderFeedbackTags && selectedTicket.orderFeedbackTags.length > 0 && (
                        <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] text-gray-400 uppercase font-mono">Feedback Tags:</span>
                          {selectedTicket.orderFeedbackTags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-full font-semibold">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Interactive Resolution & Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-4 pt-3 border-t border-brand-green/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-brand-orange" />
                      Official Customer Resolution Reply
                    </span>
                    <span className="text-[9px] font-mono text-gray-400">
                      Agent: {activeAgent.name}
                    </span>
                  </div>

                  <div>
                    <textarea
                      required
                      rows={4}
                      placeholder="Type your official support response to the customer..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-2xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/60"
                    />
                  </div>

                  {/* Status & Priority Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">
                        Update Ticket Status
                      </label>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as any)}
                        className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                      >
                        <option value="pending">⏳ Pending Customer Reply</option>
                        <option value="under_review">🔍 Under Active Review</option>
                        <option value="resolved">✅ Resolved & Closed</option>
                        <option value="closed">🔒 Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">
                        Update Ticket Priority
                      </label>
                      <select
                        value={replyPriority}
                        onChange={(e) => setReplyPriority(e.target.value as any)}
                        className="w-full bg-[#0A0E12] border border-brand-green/20 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-green/50 cursor-pointer"
                      >
                        <option value="low">🟢 Low Priority</option>
                        <option value="medium">🟡 Medium Priority</option>
                        <option value="high">🟠 High Priority</option>
                        <option value="urgent">🔴 Urgent Resolution</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="w-full bg-brand-orange hover:bg-brand-orange/95 text-brand-charcoal font-black text-xs py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    {isSubmittingReply ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving Resolution...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5px]" />
                        Submit & Send Official Reply
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerSupportPortal;
